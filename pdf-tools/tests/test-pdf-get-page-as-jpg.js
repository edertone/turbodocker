const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PDF_FILE_PATH = path.join(__dirname, 'resources', 'sample30.pdf');
const ENDPOINT = 'http://localhost:5001/pdf-get-page-as-jpg';

function sendPdfToJpgEndpoint({ page = 0, width, height, jpegQuality = 90 }) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(PDF_FILE_PATH)) {
            return reject(new Error('sample30.pdf not found in resources directory'));
        }
        const pdfBuffer = fs.readFileSync(PDF_FILE_PATH);
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const formFields = [
            `--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="sample.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
            pdfBuffer,
            `\r\n--${boundary}\r\nContent-Disposition: form-data; name="page"\r\n\r\n${page}`
        ];
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

describe('PDF Get Page as JPG API', function () {
    this.timeout(15000);
    it('should return a JPEG image for the first page with width', async function () {
        const result = await sendPdfToJpgEndpoint({ page: 0, width: 300, jpegQuality: 90 });
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.headers['content-type'].includes('image/jpeg'), 'Expected image/jpeg content type');
        assert.ok(result.buffer.length > 1000, 'JPEG buffer should not be empty');
    });
    it('should return a high quality JPEG with width', async function () {
        const result = await sendPdfToJpgEndpoint({ page: 0, width: 800, jpegQuality: 100 });
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.headers['content-type'].includes('image/jpeg'), 'Expected image/jpeg content type');
        assert.ok(
            result.buffer.length > 100000,
            `JPEG buffer should be larger than 100KB, got ${result.buffer.length} bytes`
        );
    });
    it('should return a low quality JPEG with width', async function () {
        const result = await sendPdfToJpgEndpoint({ page: 0, width: 300, jpegQuality: 30 });
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.headers['content-type'].includes('image/jpeg'), 'Expected image/jpeg content type');
        assert.ok(
            result.buffer.length < 100000,
            `JPEG buffer should be smaller than 100KB, got ${result.buffer.length} bytes`
        );
    });
});
