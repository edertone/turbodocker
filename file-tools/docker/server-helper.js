const { execFile } = require('node:child_process');
const { promises: fs, mkdirSync, existsSync } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const Database = require('better-sqlite3');

// Global executable paths
const _pdfinfoExecutable = 'pdfinfo';
const _ghostscriptExecutable = 'gs';
const _chromeExecutable = 'chromium';

/**
 * Helper to parse body variables regardless of Content-Type.
 * Supports: application/json, multipart/form-data, application/x-www-form-urlencoded
 * @param {import('hono').Context} c
 */
async function parseBodyVariables(c) {
    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('application/json')) {
        return await c.req.json().catch(() => ({})); // Return empty obj on invalid JSON
    }
    return await c.req.parseBody();
}

/**
 * Helper to extract a file buffer from the parsed body.
 * Handles both Hono File objects (multipart) and Base64/String data (JSON/Text).
 */
async function getFileAsBuffer(body, key) {
    const val = body[key];
    if (!val) throw new Error(`Missing POST variable '${key}'`);

    // If it's a file upload (Object with arrayBuffer method)
    if (typeof val === 'object' && val.arrayBuffer) {
        return Buffer.from(await val.arrayBuffer());
    }
    // If it's a regular string field (from JSON or Text field)
    return Buffer.from(String(val));
}

/**
 * Checks if a Buffer contains a valid PDF file by header and by running pdfinfo.
 * @param {Buffer} pdfBuffer - The PDF file buffer.
 * @returns {Promise<boolean>} True if the buffer is a valid PDF, false otherwise.
 */
async function isValidPdf(pdfBuffer) {
    if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.slice(0, 5).toString() !== '%PDF-') {
        return false;
    }
    try {
        await new Promise((resolve, reject) => {
            const child = execFile(_pdfinfoExecutable, ['-'], (error, stdout, stderr) => {
                if (error) return reject(error);
                resolve(stdout);
            });
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
                if (error) return reject(new Error(`Could not determine page count: ${stderr}`));
                resolve(stdout);
            });
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
 * @param {number} [options.jpegQuality=75] - JPEG quality (1-100).
 *
 * @returns {Promise<Buffer>} The JPEG image buffer.
 * @throws {Error} If conversion fails or parameters are invalid.
 */
async function getPdfPageAsJpg(pdfBuffer, pageIndex = 0, options = {}) {
    const { width, height, jpegQuality = 75 } = options;

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

    if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.slice(0, 5).toString() !== '%PDF-') {
        throw new Error('Invalid PDF buffer provided');
    }

    // If only one dimension is specified, calculate the other proportionally using the original PDF page size
    let finalWidth = width;
    let finalHeight = height;

    if (!width || !height) {
        const pdfinfoOutput = await new Promise((resolve, reject) => {
            const child = execFile(_pdfinfoExecutable, ['-'], (error, stdout, stderr) => {
                if (error) return reject(new Error(`pdfinfo failed: ${stderr || error.message}`));
                resolve(stdout);
            });
            child.stdin.write(pdfBuffer);
            child.stdin.end();
        });
        const sizeMatch = pdfinfoOutput.match(/Page size:\s*(\d+(?:\.\d+)?) x (\d+(?:\.\d+)?) pts/);
        if (!sizeMatch) throw new Error('Could not determine PDF page size');

        const origWidth = parseFloat(sizeMatch[1]);
        const origHeight = parseFloat(sizeMatch[2]);
        if (!width) {
            finalHeight = height;
            finalWidth = Math.round((origWidth / origHeight) * finalHeight);
        } else {
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
        '-sOutputFile=-',
        `-dFirstPage=${pageNum}`,
        `-dLastPage=${pageNum}`,
        `-dJPEGQ=${jpegQuality}`,
        '-q',
        `-dDEVICEWIDTHPOINTS=${finalWidth}`,
        `-dDEVICEHEIGHTPOINTS=${finalHeight}`,
        '-dPDFFitPage=true',
        '-'
    ];

    try {
        const imageBuffer = await new Promise((resolve, reject) => {
            const child = execFile(
                _ghostscriptExecutable,
                args,
                { encoding: null, maxBuffer: 10 * 1024 * 1024 },
                (err, stdout) => {
                    if (err) return reject(new Error(`Ghostscript failed: ${err.message}`));
                    if (stdout.length < 500) return reject(new Error(`Ghostscript failed: ${stdout.toString()}`));
                    resolve(stdout);
                }
            );
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
                if (error) return reject(new Error(`PDF generation failed: ${stderr}`));
                resolve(stdout);
            });
        });
        return await fs.readFile(outputPdfPath);
    } finally {
        await Promise.allSettled([fs.unlink(inputHtmlPath), fs.unlink(outputPdfPath)]);
    }
}

/**
 * Converts an image buffer to a JPEG buffer using ImageMagick.
 * @param {Buffer} imageBuffer - The image file buffer.
 * @param {Object} options - Options for image generation.
 * @param {number} [options.jpegQuality=75] - JPEG quality (1-100).
 * @param {string} [options.transparentColor='#FFFFFF'] - Background color for transparent images.
 * @returns {Promise<Buffer>} The JPEG image buffer.
 */
async function convertImageToJpg(imageBuffer, options = {}) {
    const { jpegQuality = 75, transparentColor = '#FFFFFF' } = options;

    if (!Number.isInteger(jpegQuality) || jpegQuality < 1 || jpegQuality > 100) {
        throw new Error('JPEG quality must be an integer between 1 and 100');
    }

    const { spawn } = require('node:child_process');
    return await new Promise((resolve, reject) => {
        const args = [
            '-', // read from stdin
            '-background',
            transparentColor,
            '-flatten',
            '-quality',
            String(jpegQuality),
            'jpg:-' // write to stdout
        ];
        const magick = spawn('magick', args);
        let stdoutBuffers = [];
        let stderrBuffers = [];

        magick.stdout.on('data', data => stdoutBuffers.push(data));
        magick.stderr.on('data', data => stderrBuffers.push(data));

        magick.on('error', err => reject(new Error(`Failed to start ImageMagick: ${err.message}`)));
        magick.on('close', code => {
            if (code !== 0) {
                const stderr = Buffer.concat(stderrBuffers).toString();
                return reject(new Error(`Could not convert image to JPG: ${stderr}`));
            }
            resolve(Buffer.concat(stdoutBuffers));
        });
        magick.stdin.write(imageBuffer);
        magick.stdin.end();
    });
}

// CACHE HELPER USING SQLITE3 ---
const CACHE_DIR = '/app/file-tools-cache';
const BLOB_DIR = path.join(CACHE_DIR, 'blobs');

let db;
try {
    db = new Database(path.join(CACHE_DIR, 'file-tools-cache.db'));
    // WAL mode allows better concurrency and prevents locking issues
    db.pragma('journal_mode = WAL');

    // Create table: key, data (BLOB), expires_at (Timestamp in ms)
    db.exec(`
        CREATE TABLE IF NOT EXISTS file_cache (
            key TEXT PRIMARY KEY,
            filename TEXT,
            expires_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_expires_at ON file_cache(expires_at);
    `);
} catch (err) {
    console.error('Failed to initialize SQLite cache:', err);
    throw err;
}

const cacheHelper = {
    // Set a value in the cache (Streams data to disk, stores metadata in DB)
    set: async (key, buffer, ttlSeconds) => {
        const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Number.MAX_SAFE_INTEGER;

        // 1. CHECK FOR EXISTING KEY to avoid orphan files
        const existing = db.prepare('SELECT filename FROM file_cache WHERE key = ?').get(key);
        if (existing) {
            // Delete the old file quietly
            await fs.unlink(path.join(BLOB_DIR, existing.filename)).catch(() => {});
        }

        // 2. Generate new filename
        const filename = crypto.randomUUID();
        const filePath = path.join(BLOB_DIR, filename);

        // 3. Write new file
        await fs.writeFile(filePath, buffer);

        // 4. Update DB
        try {
            const stmt = db.prepare('INSERT OR REPLACE INTO file_cache (key, filename, expires_at) VALUES (?, ?, ?)');
            stmt.run(key, filename, expiresAt);
        } catch (err) {
            await fs.unlink(filePath).catch(() => {});
            throw err;
        }
    },

    // Get a value path. (Returns the filepath, NOT the buffer)
    getFilePath: key => {
        const now = Date.now();
        const stmt = db.prepare('SELECT filename FROM file_cache WHERE key = ? AND expires_at > ?');
        const row = stmt.get(key, now);

        if (!row) return undefined;

        const filePath = path.join(BLOB_DIR, row.filename);
        if (!existsSync(filePath)) return undefined; // Edge case: file deleted manually

        return filePath;
    },

    del: async key => {
        const stmt = db.prepare('SELECT filename FROM file_cache WHERE key = ?');
        const row = stmt.get(key);

        if (row) {
            db.prepare('DELETE FROM file_cache WHERE key = ?').run(key);
            // Async delete file
            await fs.unlink(path.join(BLOB_DIR, row.filename)).catch(() => {});
            return true;
        }
        return false;
    },

    clear: async () => {
        // Drop all data
        db.exec('DELETE FROM file_cache');
        // Delete all files in blob directory
        const files = await fs.readdir(BLOB_DIR);
        await Promise.all(files.map(f => fs.unlink(path.join(BLOB_DIR, f)).catch(() => {})));
    },

    prune: async () => {
        const now = Date.now();
        // Find expired files
        const stmt = db.prepare('SELECT filename FROM file_cache WHERE expires_at <= ?');
        const rows = stmt.all(now);

        if (rows.length === 0) return 0;

        // Delete from DB
        db.prepare('DELETE FROM file_cache WHERE expires_at <= ?').run(now);

        // Delete files from Disk (in background, don't wait)
        rows.forEach(row => {
            fs.unlink(path.join(BLOB_DIR, row.filename)).catch(e =>
                console.error(`Failed to delete ${row.filename}`, e)
            );
        });

        return rows.length;
    }
};

module.exports = {
    parseBodyVariables,
    getFileAsBuffer,
    countPdfPages,
    convertHtmlToPdf,
    isValidPdf,
    getPdfPageAsJpg,
    convertImageToJpg,
    cacheHelper
};
