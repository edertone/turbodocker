const { execSync, execFile } = require('node:child_process');
const { promises: fs } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

// Global variables to cache executable paths
let _ghostscriptExecutable = null;
let _chromeExecutable = null;

// Function to find the chromium executable that is available on the system
function findChromeExecutable() {
    // Return cached result if available
    if (_chromeExecutable !== null) {
        return _chromeExecutable;
    }

    const candidates = [
        'chromium',
        'chromium-browser',
        'google-chrome-stable',
        'google-chrome',
    ];

    for (const candidate of candidates) {
        try {
            execSync(`command -v ${candidate}`);
            _chromeExecutable = candidate;
            return candidate;
        } catch {
            continue;
        }
    }

    throw new Error('Could not find a chromium executable. Please install chromium or google-chrome.');
}

// Function to find the ghostscript executable that is available on the system
function findGhostscriptExecutable() {
    // Return cached result if available
    if (_ghostscriptExecutable !== null) {
        return _ghostscriptExecutable;
    }

    const candidates = [
        'gs',
        'ghostscript',
    ];

    for (const candidate of candidates) {
        try {
            execSync(`command -v ${candidate}`, { stdio: 'ignore' });
            _ghostscriptExecutable = candidate;
            return candidate;
        } catch {
            continue;
        }
    }

    throw new Error('Could not find a ghostscript executable. Please install ghostscript.');
}

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

// Check if a Buffer is a valid PDF file
async function isValidPdf(pdfBuffer) {
    // Check for PDF header
    if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.slice(0, 5).toString() !== '%PDF-') {
        return false;
    }
    
    // Use pdfinfo with stdin to validate the PDF
    try {
        await new Promise((resolve, reject) => {
            const child = execFile('pdfinfo', ['-'], (error, stdout, stderr) => {
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

// Count PDF pages using pdfinfo
async function countPdfPagesWithPdfinfo(pdfBuffer) {
    try {
        const output = await new Promise((resolve, reject) => {
            const child = execFile('pdfinfo', ['-'], (error, stdout, stderr) => {
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

// Convert a specific PDF page to JPEG using Ghostscript
// Similar to PHP method: getPageAsJpg($pdfFilePath, $page, $jpgQuality = 90, $dpi = '150')
async function getPdfPageAsJpg(pdfBuffer, page, jpgQuality = 90, dpi = 150) {
    // Validate parameters
    if (!Number.isInteger(page) || page < 0) {
        throw new Error('Specified page must be a positive integer');
    }
    
    if (!Number.isInteger(jpgQuality) || jpgQuality < 1 || jpgQuality > 100) {
        throw new Error('JPEG quality must be an integer between 1 and 100');
    }
    
    if (!Number.isInteger(dpi) || dpi < 72 || dpi > 2400) {
        throw new Error('DPI must be an integer between 72 and 2400');
    }

    // Check for PDF header
    if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.slice(0, 5).toString() !== '%PDF-') {
        throw new Error('Invalid PDF buffer provided');
    }

    const gsExecutable = findGhostscriptExecutable();
    
    // Build ghostscript arguments (equivalent to the PHP command)
    const args = [
        '-dNOPAUSE',
        '-sDEVICE=jpeg',
        '-dUseCIEColor',
        '-dDOINTERPOLATE',
        '-dTextAlphaBits=4',
        '-dGraphicsAlphaBits=4',
        '-sOutputFile=-',  // Output to stdout
        `-dFirstPage=${page + 1}`,  // Convert 0-based to 1-based page numbering
        `-dLastPage=${page + 1}`,
        `-r${dpi}`,
        `-dJPEGQ=${jpgQuality}`,
        '-q',  // Quiet mode
        '-'    // Read from stdin
    ];

    try {
        const imageBuffer = await new Promise((resolve, reject) => {
            const child = execFile(gsExecutable, args, { 
                encoding: null,  // Get binary output
                maxBuffer: 10 * 1024 * 1024  // 10MB buffer for large images
            }, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`Ghostscript failed: ${stderr || error.message}`));
                }
                
                // Check if output is too small (likely an error)
                if (stdout.length < 500) {
                    const errorMsg = stdout.toString();
                    if (errorMsg.includes('No pages will be processed')) {
                        return reject(new Error(`Page ${page} does not exist in the PDF`));
                    }
                    return reject(new Error(`Ghostscript failed: ${errorMsg}`));
                }
                
                resolve(stdout);
            });
            
            // Write PDF buffer to stdin and close it
            child.stdin.write(pdfBuffer);
            child.stdin.end();
        });
        
        return imageBuffer;
    } catch (error) {
        throw new Error(`Could not convert PDF page to JPEG: ${error.message}`);
    }
}

// Convert the first page (cover) of a PDF to JPEG thumbnail with custom dimensions
// Similar to getPdfPageAsJpg but specifically for thumbnails with width/height control
async function getPdfCoverThumbnailJpg(pdfBuffer, options = {}) {
    const { width, height, jpegQuality = 90 } = options;
    
    // Validate parameters
    if (width !== undefined && (!Number.isInteger(width) || width < 10 || width > 4000)) {
        throw new Error('Width must be an integer between 10 and 4000 pixels');
    }
    
    if (height !== undefined && (!Number.isInteger(height) || height < 10 || height > 4000)) {
        throw new Error('Height must be an integer between 10 and 4000 pixels');
    }
    
    if (!Number.isInteger(jpegQuality) || jpegQuality < 1 || jpegQuality > 100) {
        throw new Error('JPEG quality must be an integer between 1 and 100');
    }
    
    if (!width && !height) {
        throw new Error('Either width or height (or both) must be specified');
    }

    // Check for PDF header
    if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.slice(0, 5).toString() !== '%PDF-') {
        throw new Error('Invalid PDF buffer provided');
    }

    const gsExecutable = findGhostscriptExecutable();
    
    // Build ghostscript arguments for thumbnail generation
    const args = [
        '-dNOPAUSE',
        '-sDEVICE=jpeg',
        '-dUseCIEColor',
        '-dDOINTERPOLATE',
        '-dTextAlphaBits=4',
        '-dGraphicsAlphaBits=4',
        '-sOutputFile=-',  // Output to stdout
        '-dFirstPage=1',   // Always get the first page (cover)
        '-dLastPage=1',
        `-dJPEGQ=${jpegQuality}`,
        '-q'  // Quiet mode
    ];
    
    // Add width/height parameters if specified
    // Ghostscript will maintain aspect ratio if only one dimension is provided
    if (width && height) {
        args.push(`-dDEVICEWIDTHPOINTS=${width}`, `-dDEVICEHEIGHTPOINTS=${height}`);
        args.push('-dPDFFitPage=true');  // Scale to fit exactly
    } else if (width) {
        args.push(`-dDEVICEWIDTHPOINTS=${width}`);
        args.push('-dFIXEDMEDIA=true');  // Use fixed width, auto height
    } else if (height) {
        args.push(`-dDEVICEHEIGHTPOINTS=${height}`);
        args.push('-dFIXEDMEDIA=true');  // Use fixed height, auto width
    }
    
    args.push('-');  // Read from stdin

    try {
        const imageBuffer = await new Promise((resolve, reject) => {
            const child = execFile(gsExecutable, args, { 
                encoding: null,  // Get binary output
                maxBuffer: 10 * 1024 * 1024  // 10MB buffer for large images
            }, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`Ghostscript failed: ${stderr || error.message}`));
                }
                
                // Check if output is too small (likely an error)
                if (stdout.length < 500) {
                    const errorMsg = stdout.toString();
                    return reject(new Error(`Ghostscript failed: ${errorMsg}`));
                }
                
                resolve(stdout);
            });
            
            // Write PDF buffer to stdin and close it
            child.stdin.write(pdfBuffer);
            child.stdin.end();
        });
        
        return imageBuffer;
    } catch (error) {
        throw new Error(`Could not generate PDF thumbnail: ${error.message}`);
    }
}

// Function to convert HTML content to PDF using headless Chromium
// It uses temporary files for input and output to avoid command line length limits
// Pdf conversion is done by launching chromium with appropriate flags
// Returns a Buffer containing the generated PDF
async function convertHtmlToPdf(html) {
    const chromeExecutable = findChromeExecutable();
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
            execFile(chromeExecutable, args, (error, stdout, stderr) => {
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
        await Promise.allSettled([
            fs.unlink(inputHtmlPath),
            fs.unlink(outputPdfPath)
        ]);
    }
}

module.exports = {
    rejectNonPost,
    countPdfPagesWithPdfinfo,
    convertHtmlToPdf,
    getPostVariables,
    isValidPdf,
    getPdfPageAsJpg,
    getPdfCoverThumbnailJpg
};
