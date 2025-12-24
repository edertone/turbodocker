const { execSync, execFile } = require('node:child_process');
const { promises: fs } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

// Global executable paths
const _pdfinfoExecutable = 'pdfinfo';
const _ghostscriptExecutable = 'gs';
const _chromeExecutable = 'chromium';

/**
 * Rejects HTTP requests that are not POST, sending a 405 response.
 * @param {import('http').IncomingMessage} req - The HTTP request object.
 * @param {import('http').ServerResponse} res - The HTTP response object.
 * @param {string} [message='Method Not Allowed. Use POST.'] - Optional error message.
 * @returns {boolean} True if the request was rejected, false otherwise.
 */
function rejectNonPost(req, res, message = 'Method Not Allowed. Use POST.') {
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
        return true;
    }
    return false;
}

/**
 * Extracts specific variables from a POST request body.
 * Supports JSON, urlencoded, and multipart/form-data content types.
 * @param {import('http').IncomingMessage} req - The HTTP request object.
 * @param {string[]} [mandatoryVariableNames=[]] - List of required variable names.
 * @param {string[]} [optionalVariableNames=[]] - List of optional variable names.
 * @returns {Promise<Object>} An object with the requested variable names and their values (Buffer for file fields).
 * @throws {Error} If a mandatory variable is missing or the payload is invalid.
 */
async function getPostVariables(req, mandatoryVariableNames = [], optionalVariableNames = []) {
    // Combine mandatory and optional fields to get all fields to extract
    const allVariableNames = [...mandatoryVariableNames, ...optionalVariableNames];

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
            for (const name of allVariableNames) {
                if (data[name] !== undefined) {
                    result[name] = data[name];
                }
            }
        } catch (error) {
            throw new Error('Invalid JSON payload.');
        }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(body.toString());
        for (const name of allVariableNames) {
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

            if (contentDispositionMatch && allVariableNames.includes(contentDispositionMatch[1])) {
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

    // Only check for mandatory fields
    for (const field of mandatoryVariableNames) {
        if (!result[field]) {
            throw new Error(`Missing POST variable '${field}'`);
        }
    }

    return result;
}

/**
 * Checks if a Buffer contains a valid PDF file by header and by running pdfinfo.
 * @param {Buffer} pdfBuffer - The PDF file buffer.
 * @returns {Promise<boolean>} True if the buffer is a valid PDF, false otherwise.
 */
async function isValidPdf(pdfBuffer) {
    // Check for PDF header
    if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.slice(0, 5).toString() !== '%PDF-') {
        return false;
    }

    // Use pdfinfo with stdin to validate the PDF
    try {
        await new Promise((resolve, reject) => {
            const child = execFile(_pdfinfoExecutable, ['-'], (error, stdout, stderr) => {
                if (error) {
                    return reject(error);
                }
                resolve(stdout);
            });

            // Write PDF buffer to stdin and close it
            child.stdin.write(pdfBuffer);
            child.stdin.end();
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Counts the number of pages in a PDF buffer using pdfinfo.
 * @param {Buffer} pdfBuffer - The PDF file buffer.
 * @returns {Promise<number>} The number of pages in the PDF.
 * @throws {Error} If the page count cannot be determined.
 */
async function countPdfPages(pdfBuffer) {
    try {
        const output = await new Promise((resolve, reject) => {
            const child = execFile(_pdfinfoExecutable, ['-'], (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`Could not determine page count: ${stderr}`));
                }
                resolve(stdout);
            });

            // Write PDF buffer to stdin and close it
            child.stdin.write(pdfBuffer);
            child.stdin.end();
        });

        const match = output.match(/^Pages:\s+(\d+)/m);
        if (!match) throw new Error('Could not determine page count');
        return parseInt(match[1], 10);
    } catch (error) {
        throw new Error(`Could not determine page count: ${error.message}`);
    }
}

/**
 * Converts a specific page of a PDF buffer to a JPEG image with custom dimensions.
 * Calculates missing width/height proportionally if only one is provided.
 * @param {Buffer} pdfBuffer - The PDF file buffer.
 * @param {number} pageIndex - Zero-based index of the page to convert.
 * @param {Object} options - Options for image generation.
 * @param {number} [options.width] - Desired width in pixels.
 * @param {number} [options.height] - Desired height in pixels.
 * @param {number} [options.jpegQuality=90] - JPEG quality (1-100).
 *
 * @returns {Promise<Buffer>} The JPEG image buffer.
 * @throws {Error} If conversion fails or parameters are invalid.
 */
async function getPdfPageAsJpg(pdfBuffer, pageIndex = 0, options = {}) {
    const { width, height, jpegQuality = 90 } = options;

    // Validate parameters
    if (width !== undefined && (!Number.isInteger(width) || width < 1 || width > 10000)) {
        throw new Error('Width must be an integer between 1 and 10000 pixels');
    }
    if (height !== undefined && (!Number.isInteger(height) || height < 1 || height > 10000)) {
        throw new Error('Height must be an integer between 1 and 10000 pixels');
    }
    if (!Number.isInteger(jpegQuality) || jpegQuality < 1 || jpegQuality > 100) {
        throw new Error('JPEG quality must be an integer between 1 and 100');
    }
    if (!Number.isInteger(pageIndex) || pageIndex < 0) {
        throw new Error('pageIndex must be a non-negative integer');
    }
    if (!width && !height) {
        throw new Error('Either width or height (or both) must be specified');
    }

    // Check for PDF header
    if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.slice(0, 5).toString() !== '%PDF-') {
        throw new Error('Invalid PDF buffer provided');
    }

    // If only one dimension is specified, calculate the other proportionally using the original PDF page size
    let finalWidth = width;
    let finalHeight = height;
    if (!width || !height) {
        // Use pdfinfo to get the original page size (in points)
        const pdfinfoOutput = await new Promise((resolve, reject) => {
            const child = execFile(_pdfinfoExecutable, ['-'], (error, stdout, stderr) => {
                if (error) return reject(new Error(`pdfinfo failed: ${stderr || error.message}`));
                resolve(stdout);
            });
            child.stdin.write(pdfBuffer);
            child.stdin.end();
        });
        // Parse page size (look for "Page size: WxH pts")
        const sizeMatch = pdfinfoOutput.match(/Page size:\s*(\d+(?:\.\d+)?) x (\d+(?:\.\d+)?) pts/);
        if (!sizeMatch) {
            throw new Error('Could not determine PDF page size');
        }
        const origWidth = parseFloat(sizeMatch[1]);
        const origHeight = parseFloat(sizeMatch[2]);
        if (!width) {
            // Calculate width proportionally
            finalHeight = height;
            finalWidth = Math.round((origWidth / origHeight) * finalHeight);
        } else if (!height) {
            // Calculate height proportionally
            finalWidth = width;
            finalHeight = Math.round((origHeight / origWidth) * finalWidth);
        }
    }

    // Build ghostscript arguments for image generation
    const pageNum = pageIndex + 1; // Ghostscript uses 1-based page numbers
    const args = [
        '-dNOPAUSE',
        '-sDEVICE=jpeg',
        '-dUseCIEColor',
        '-dDOINTERPOLATE',
        '-dTextAlphaBits=4',
        '-dGraphicsAlphaBits=4',
        '-sOutputFile=-', // Output to stdout
        `-dFirstPage=${pageNum}`,
        `-dLastPage=${pageNum}`,
        `-dJPEGQ=${jpegQuality}`,
        '-q' // Quiet mode
    ];
    // Always specify both width and height, calculated if needed
    args.push(`-dDEVICEWIDTHPOINTS=${finalWidth}`);
    args.push(`-dDEVICEHEIGHTPOINTS=${finalHeight}`);
    args.push('-dPDFFitPage=true');
    args.push('-'); // Read from stdin

    try {
        const imageBuffer = await new Promise((resolve, reject) => {
            const child = execFile(
                _ghostscriptExecutable,
                args,
                {
                    encoding: null, // Get binary output
                    maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large images
                },
                (error, stdout, stderr) => {
                    if (error) {
                        return reject(new Error(`Ghostscript failed: ${stderr || error.message}`));
                    }
                    // Check if output is too small (likely an error)
                    if (stdout.length < 500) {
                        const errorMsg = stdout.toString();
                        return reject(new Error(`Ghostscript failed: ${errorMsg}`));
                    }
                    resolve(stdout);
                }
            );
            // Write PDF buffer to stdin and close it
            child.stdin.write(pdfBuffer);
            child.stdin.end();
        });
        return imageBuffer;
    } catch (error) {
        throw new Error(`Could not generate PDF image: ${error.message}`);
    }
}

/**
 * Converts HTML content to a PDF buffer using headless Chromium.
 * Uses temporary files for input and output to avoid command line length limits.
 * @param {string} html - The HTML content to convert.
 * @returns {Promise<Buffer>} The generated PDF as a Buffer.
 * @throws {Error} If PDF generation fails.
 */
async function convertHtmlToPdf(html) {
    const uniqueId = crypto.randomUUID();
    const tempDir = os.tmpdir();
    const inputHtmlPath = path.join(tempDir, `${uniqueId}.html`);
    const outputPdfPath = path.join(tempDir, `${uniqueId}.pdf`);

    try {
        // Write HTML to temp file
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

        await new Promise((resolve, reject) => {
            execFile(_chromeExecutable, args, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`PDF generation failed: ${stderr}`));
                }
                resolve(stdout);
            });
        });

        // Read and return PDF buffer
        const pdfBuffer = await fs.readFile(outputPdfPath);
        return pdfBuffer;
    } finally {
        // Clean up temp files regardless of success/failure
        await Promise.allSettled([fs.unlink(inputHtmlPath), fs.unlink(outputPdfPath)]);
    }
}

module.exports = {
    rejectNonPost,
    countPdfPages,
    convertHtmlToPdf,
    getPostVariables,
    isValidPdf,
    getPdfPageAsJpg
};
