const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PDF_FILE_PATH = path.join(__dirname, 'resources', 'sample30.pdf');
const ENDPOINT = 'http://localhost:5001/pdf-get-page-as-jpg';

function sendPdfToJpgEndpoint({ page = 0, jpgQuality = 90, dpi = 150 }) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(PDF_FILE_PATH)) {
            return reject(new Error('sample30.pdf not found in resources directory'));
        }
        const pdfBuffer = fs.readFileSync(PDF_FILE_PATH);
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const formFields = [
            `--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="sample.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
            pdfBuffer,
            `\r\n--${boundary}\r\nContent-Disposition: form-data; name="page"\r\n\r\n${page}`,
            `\r\n--${boundary}\r\nContent-Disposition: form-data; name="jpgQuality"\r\n\r\n${jpgQuality}`,
            `\r\n--${boundary}\r\nContent-Disposition: form-data; name="dpi"\r\n\r\n${dpi}`,
            `\r\n--${boundary}--\r\n`
        ];
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
    it('should return a JPEG image for the first page', async function () {
        const result = await sendPdfToJpgEndpoint({ page: 0, jpgQuality: 90, dpi: 150 });
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.headers['content-type'].includes('image/jpeg'), 'Expected image/jpeg content type');
        assert.ok(result.buffer.length > 1000, 'JPEG buffer should not be empty');
    });
    it('should return a high quality JPEG', async function () {
        const result = await sendPdfToJpgEndpoint({ page: 0, jpgQuality: 100, dpi: 300 });
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.headers['content-type'].includes('image/jpeg'), 'Expected image/jpeg content type');
        assert.ok(
            result.buffer.length > 1048576,
            `JPEG buffer should be larger than 1MB, got ${result.buffer.length} bytes`
        );
    });
    it('should return a low quality JPEG', async function () {
        const result = await sendPdfToJpgEndpoint({ page: 0, jpgQuality: 50, dpi: 72 });
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.headers['content-type'].includes('image/jpeg'), 'Expected image/jpeg content type');
        assert.ok(
            result.buffer.length < 100000,
            `JPEG buffer should be smaller than 100KB, got ${result.buffer.length} bytes`
        );
    });
});
