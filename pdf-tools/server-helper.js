const { execSync, execFile } = require('node:child_process');
const { promises: fs } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

// Function to extract post data from a request
// Supports JSON and multipart/form-data (for file uploads)
// Returns an object with type and data
async function getPostData(req) {
    const bodyChunks = [];
    for await (const chunk of req) {
        bodyChunks.push(chunk);
    }
    const body = Buffer.concat(bodyChunks);

    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
        try {
            return {
                type: 'json',
                data: JSON.parse(body.toString())
            };
        } catch (error) {
            throw new Error('Invalid JSON payload.');
        }
    }

    if (contentType.includes('multipart/form-data')) {
        const boundary = `--${contentType.split('boundary=')[1]}`;
        if (!boundary) {
            throw new Error('Invalid multipart/form-data: boundary not found.');
        }

        const boundaryBuffer = Buffer.from(boundary);
        const headerSeparator = Buffer.from('\r\n\r\n');

        let partStartIndex = body.indexOf(boundaryBuffer);
        if (partStartIndex === -1) {
            throw new Error("Invalid multipart/form-data: boundary not found in body.");
        }
        partStartIndex += boundaryBuffer.length;

        const headerEndIndex = body.indexOf(headerSeparator, partStartIndex);
        if (headerEndIndex === -1) {
            throw new Error("Invalid multipart/form-data: part headers not found.");
        }
        const fileDataStartIndex = headerEndIndex + headerSeparator.length;

        const fileDataEndIndex = body.indexOf(boundaryBuffer, fileDataStartIndex);
        if (fileDataEndIndex === -1) {
            throw new Error("Invalid multipart/form-data: closing boundary not found.");
        }

        const fileBuffer = body.subarray(fileDataStartIndex, fileDataEndIndex - 2); // -2 for \r\n
        if (!fileBuffer.length) {
            throw new Error("Missing file in form data.");
        }

        return {
            type: 'file',
            data: fileBuffer
        };
    }

    return {
        type: 'raw',
        data: body
    };
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
    findChromeExecutable,
    countPdfPagesWithPdfinfo,
    convertHtmlToPdf,
    getPostData,
};
