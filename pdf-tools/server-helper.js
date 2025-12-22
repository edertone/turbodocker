const { execSync, execFile } = require('node:child_process');
const { promises: fs } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

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
};
