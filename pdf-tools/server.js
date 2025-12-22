const http = require('node:http');
const { execFile, execSync } = require('node:child_process');
const { promises: fs } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');


// Global constants
const PORT = 5001;
const CHROME_EXECUTABLE = findChromeExecutable();
const ENDPOINT_HTML_TO_PDF_BINARY = '/html-to-pdf-binary';
const ENDPOINT_HTML_TO_PDF_BASE64 = '/html-to-pdf-base64';


// Function to find the chromium executable that is available on the system
function findChromeExecutable() {
    const candidates = [
        'chromium',
        'chromium-browser', 
        'google-chrome-stable',
        'google-chrome',
    ];
    
    for (const candidate of candidates) {
        try {
            execSync(`command -v ${candidate}`);
            return candidate;
        } catch {
            continue;
        }
    }
    
    throw new Error('Could not find a chromium executable. Please install chromium or google-chrome.');
}

// Function to convert HTML content to PDF using headless Chromium
async function convertHtmlToPdf(html) {
    const uniqueId = crypto.randomUUID();
    const tempDir = '/tmp';
    const inputHtmlPath = path.join(tempDir, `${uniqueId}.html`);
    const outputPdfPath = path.join(tempDir, `${uniqueId}.pdf`);

    await fs.writeFile(inputHtmlPath, html, 'utf-8');
    
    const args = [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--no-pdf-header-footer',
        `--print-to-pdf=${outputPdfPath}`,
        inputHtmlPath
    ];
    
    try {
        
        await new Promise((resolve, reject) => {
            execFile(CHROME_EXECUTABLE, args, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`PDF generation failed: ${stderr}`));
                }
                resolve(stdout);
            });
        });
        const pdfBuffer = await fs.readFile(outputPdfPath);
        return pdfBuffer;
        
    } finally {
        
        // Clean up temp files regardless of success/failure
        await Promise.allSettled([
            fs.unlink(inputHtmlPath),
            fs.unlink(outputPdfPath)
        ]);
    }
}

// Create a basic HTTP server to handle HTML to PDF conversion requests
const server = http.createServer(async (req, res) => {
    // Throw error for non expected routes
    if (![ENDPOINT_HTML_TO_PDF_BASE64, ENDPOINT_HTML_TO_PDF_BINARY].includes(req.url)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid endpoint: ' + req.url }));
    }
    // Throw error for non-POST requests
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Method Not Allowed. Use valid html string via POST html variable' }));
    }

    // Collect the request body
    const bodyChunks = [];
    for await (const chunk of req) {
        bodyChunks.push(chunk);
    }
    const body = Buffer.concat(bodyChunks).toString();

    let parsedBody;
    try {
        parsedBody = JSON.parse(body);
    } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
    }

    // Obtain the HTML content from the request body html key
    const { html } = parsedBody;
    if (!html) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "Missing 'html' key in JSON payload." }));
    }

    try {
        
        const pdfBuffer = await convertHtmlToPdf(html);

        if (req.url === ENDPOINT_HTML_TO_PDF_BASE64) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(pdfBuffer.toString('base64'));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/pdf' });
            res.end(pdfBuffer);
        }
        
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message || 'Failed to convert HTML to PDF.' }));
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
