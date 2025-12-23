const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PDF_FILE_PATH = path.join(__dirname, 'resources', 'sample30.pdf');
const ENDPOINT = 'http://localhost:5001/pdf-get-page-as-jpg';
const OUT_DIR = path.join(__dirname, '..', 'tests-out');

function ensureOutDir() {
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }
}

function sendPdfToPageAsJpgEndpoint({ width, height, jpegQuality = 90, page = 0 }) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(PDF_FILE_PATH)) {
            return reject(new Error('sample30.pdf not found in resources directory'));
        }
        const pdfBuffer = fs.readFileSync(PDF_FILE_PATH);
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const formFields = [
            `--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="sample.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
            pdfBuffer
        ];

        // Always send page=0 for cover
        formFields.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="page"\r\n\r\n${page}`);
        if (width !== undefined) {
            formFields.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="width"\r\n\r\n${width}`);
        }
        if (height !== undefined) {
            formFields.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="height"\r\n\r\n${height}`);
        }
        formFields.push(
            `\r\n--${boundary}\r\nContent-Disposition: form-data; name="jpegQuality"\r\n\r\n${jpegQuality}`
        );
        formFields.push(`\r\n--${boundary}--\r\n`);

        const body = Buffer.concat(
            formFields.map(field => (typeof field === 'string' ? Buffer.from(field, 'utf-8') : field))
        );
        const req = http.request(
            ENDPOINT,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data; boundary=' + boundary,
                    'Content-Length': body.length
                }
            },
            res => {
                let chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        buffer
                    });
                });
            }
        );
        req.on('error', err => reject(err));
        req.write(body);
        req.end();
    });
}

describe('PDF Get Page As JPG API (cover page)', function () {
    this.timeout(15000);
    before(ensureOutDir);

    it('should return a JPEG thumbnail with width only', async function () {
        const result = await sendPdfToPageAsJpgEndpoint({ width: 300 });
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.headers['content-type'].includes('image/jpeg'), 'Expected image/jpeg content type');
        assert.ok(result.buffer.length > 1000, 'JPEG buffer should not be empty');
        // Check JPEG header
        assert.strictEqual(result.buffer[0], 0xff, 'JPEG should start with 0xFF');
        assert.strictEqual(result.buffer[1], 0xd8, 'JPEG should start with 0xD8');
        fs.writeFileSync(path.join(OUT_DIR, 'thumbnail-width-300.jpg'), result.buffer);
    });

    it('should return a JPEG thumbnail with height only', async function () {
        const result = await sendPdfToPageAsJpgEndpoint({ height: 400 });
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.headers['content-type'].includes('image/jpeg'), 'Expected image/jpeg content type');
        assert.ok(result.buffer.length > 1000, 'JPEG buffer should not be empty');
        // Check JPEG header
        assert.strictEqual(result.buffer[0], 0xff, 'JPEG should start with 0xFF');
        assert.strictEqual(result.buffer[1], 0xd8, 'JPEG should start with 0xD8');
        fs.writeFileSync(path.join(OUT_DIR, 'thumbnail-height-400.jpg'), result.buffer);
    });

    it('should return a JPEG thumbnail with both width and height', async function () {
        const result = await sendPdfToPageAsJpgEndpoint({ width: 250, height: 350 });
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.headers['content-type'].includes('image/jpeg'), 'Expected image/jpeg content type');
        assert.ok(result.buffer.length > 1000, 'JPEG buffer should not be empty');
        // Check JPEG header
        assert.strictEqual(result.buffer[0], 0xff, 'JPEG should start with 0xFF');
        assert.strictEqual(result.buffer[1], 0xd8, 'JPEG should start with 0xD8');
        fs.writeFileSync(path.join(OUT_DIR, 'thumbnail-250x350.jpg'), result.buffer);
    });

    it('should return a high quality JPEG thumbnail', async function () {
        const result = await sendPdfToPageAsJpgEndpoint({ width: 300, jpegQuality: 95 });
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.headers['content-type'].includes('image/jpeg'), 'Expected image/jpeg content type');
        assert.ok(
            result.buffer.length > 5000,
            `High quality JPEG buffer should be larger, got ${result.buffer.length} bytes`
        );
        // Check JPEG header
        assert.strictEqual(result.buffer[0], 0xff, 'JPEG should start with 0xFF');
        assert.strictEqual(result.buffer[1], 0xd8, 'JPEG should start with 0xD8');
        fs.writeFileSync(path.join(OUT_DIR, 'thumbnail-quality-95.jpg'), result.buffer);
    });

    it('should return a low quality JPEG thumbnail', async function () {
        const result = await sendPdfToPageAsJpgEndpoint({ width: 300, jpegQuality: 30 });
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.headers['content-type'].includes('image/jpeg'), 'Expected image/jpeg content type');
        assert.ok(result.buffer.length > 1000, 'JPEG buffer should not be empty');
        // Check JPEG header
        assert.strictEqual(result.buffer[0], 0xff, 'JPEG should start with 0xFF');
        assert.strictEqual(result.buffer[1], 0xd8, 'JPEG should start with 0xD8');
        fs.writeFileSync(path.join(OUT_DIR, 'thumbnail-quality-30.jpg'), result.buffer);
    });

    it('should return error 500 when no dimensions are provided', async function () {
        const result = await sendPdfToPageAsJpgEndpoint({});
        assert.strictEqual(result.statusCode, 500, 'Expected HTTP 500 for missing dimensions');
        const responseText = result.buffer.toString();
        const response = JSON.parse(responseText);
        assert.ok(response.error.includes('Either width or height'), 'Error should mention missing dimensions');
    });
});
