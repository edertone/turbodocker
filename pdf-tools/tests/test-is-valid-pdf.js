const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ENDPOINT = 'http://localhost:5001/pdf-is-valid';
const TEST_FILES = [
    { name: 'sample1.pdf', description: '1-page PDF', valid: true },
    { name: 'sample4.pdf', description: '4-page PDF', valid: true },
    { name: 'sample30.pdf', description: '30-page PDF', valid: true },
    { name: 'sample-invalid.pdf', description: 'Invalid PDF', valid: false }
];

function isValidPdfRequest(fileName) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, 'resources', fileName);
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`File not found: ${fileName}`));
        }
        const pdfBuffer = fs.readFileSync(filePath);
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        const pre = Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`,
            'utf-8'
        );
        const post = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
        const body = Buffer.concat([pre, pdfBuffer, post]);
        const req = http.request(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data; boundary=' + boundary,
                'Content-Length': body.length,
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (e) {
                    resolve({ error: data });
                }
            });
        });
        req.on('error', (err) => {
            reject(err);
        });
        req.write(body);
        req.end();
    });
}

describe('PDF Is Valid API', function () {
    this.timeout(10000);
    TEST_FILES.forEach(({ name, description, valid }) => {
        it(`should return valid=${valid} for ${description} (${name})`, async function () {
            const result = await isValidPdfRequest(name);
            if (valid) {
                assert.strictEqual(result.valid, true, `Expected valid PDF for ${name}`);
            } else {
                assert.strictEqual(result.valid, false, `Expected invalid PDF for ${name}`);
            }
        });
    });
});