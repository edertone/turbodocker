const { execSync, execFile } = require('node:child_process');
const { promises: fs } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

// Function to reject non-POST requests
function rejectNonPost(req, res, message = 'Method Not Allowed. Use POST.') {
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
        return true;
    }
    return false;
}

// Function to get specific variables from a POST request
// Supports JSON, urlencoded, and multipart/form-data
// Returns an object with the requested variable names and their values
async function getPostVariables(req, variableNames = []) {
    const bodyChunks = [];
    for await (const chunk of req) {
        bodyChunks.push(chunk);
    }
    const body = Buffer.concat(bodyChunks);
    const contentType = req.headers['content-type'] || '';
    const result = {};

    if (contentType.includes('application/json')) {
        try {
            const data = JSON.parse(body.toString());
            for (const name of variableNames) {
                if (data[name] !== undefined) {
                    result[name] = data[name];
                }
            }
        } catch (error) {
            throw new Error('Invalid JSON payload.');
        }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(body.toString());
        for (const name of variableNames) {
            if (params.has(name)) {
                result[name] = params.get(name);
            }
        }
    } else if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) {
            throw new Error('Invalid multipart/form-data: boundary not found.');
        }
        const boundary = `--${boundaryMatch[1]}`;
        const parts = body.toString('binary').split(boundary);

        for (const part of parts) {
            if (part.trim() === '' || part.trim() === '--') continue;

            const headerEndIndex = part.indexOf('\r\n\r\n');
            if (headerEndIndex === -1) continue;

            const headers = part.substring(0, headerEndIndex);
            const contentDispositionMatch = headers.match(/Content-Disposition: form-data; name="([^"]+)"/);

            if (contentDispositionMatch && variableNames.includes(contentDispositionMatch[1])) {
                const name = contentDispositionMatch[1];
                // Find start and end of content
                const contentStart = headerEndIndex + 4;
                let contentEnd = part.length;
                // Remove trailing \r\n or -- if present
                if (part.endsWith('\r\n')) contentEnd -= 2;
                if (part.endsWith('--')) contentEnd -= 2;
                // Extract as Buffer
                const valueBuffer = Buffer.from(part.substring(contentStart, contentEnd), 'binary');
                result[name] = valueBuffer;
            }
        }
    }

    for (const field of variableNames) {
        if (!result[field]) {
            throw new Error(`Missing POST variable '${field}'`);
        }
    }

    return result;
}

// Check if a Buffer is a valid PDF file
async function isValidPdf(pdfBuffer) {
    // Check for PDF header
    if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.slice(0, 5).toString() !== '%PDF-') {
        return false;
    }
    // Try to use pdfinfo to parse the file
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `pdfvalid_${crypto.randomUUID()}.pdf`);
    try {
        await fs.writeFile(tmpFile, pdfBuffer);
        try {
            execSync(`pdfinfo "${tmpFile}"`);
            return true;
        } catch {
            return false;
        }
    } finally {
        fs.unlink(tmpFile).catch(() => {});
    }
}

// Count PDF pages using pdfinfo
async function countPdfPagesWithPdfinfo(pdfBuffer) {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `pdfinfo_${crypto.randomUUID()}.pdf`);
    try {
        await fs.writeFile(tmpFile, pdfBuffer);
        const output = execSync(`pdfinfo "${tmpFile}"`).toString();
        const match = output.match(/^Pages:\s+(\d+)/m);
        if (!match) throw new Error('Could not determine page count');
        return parseInt(match[1], 10);
    } finally {
        fs.unlink(tmpFile).catch(() => {});
    }
}

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
async function convertHtmlToPdf(html, chromeExecutable) {
    const uniqueId = crypto.randomUUID();
    const tempDir = os.tmpdir();
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
            execFile(chromeExecutable, args, (error, stdout, stderr) => {
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

module.exports = {
    rejectNonPost,
    findChromeExecutable,
    countPdfPagesWithPdfinfo,
    convertHtmlToPdf,
    getPostVariables,
    isValidPdf,
};
