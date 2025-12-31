const fs = require('fs');
const path = require('path');
const http = require('http');
const { randomBytes } = require('crypto');
const assert = require('assert');

const ENDPOINT = 'http://localhost:5001/pdf-count-pages';

const TEST_CASES = [
    { file: 'sample1.pdf', expected: 1 },
    { file: 'sample4.pdf', expected: 4 },
    { file: 'sample30.pdf', expected: 30 }
];

function countPagesForFile(pdfPath, expectedPages) {
    return new Promise(resolve => {
        if (!fs.existsSync(pdfPath)) {
            return resolve({ success: false, error: 'File not found' });
        }

        const boundary = `----WebKitFormBoundary${randomBytes(16).toString('hex')}`;
        const fileContents = fs.readFileSync(pdfPath);
        const fileName = path.basename(pdfPath);

        const body = Buffer.concat([
            Buffer.from(`--${boundary}\r\n`),
            Buffer.from(`Content-Disposition: form-data; name="pdf"; filename="${fileName}"\r\n`),
            Buffer.from('Content-Type: application/pdf\r\n\r\n'),
            fileContents,
            Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);

        const req = http.request(
            ENDPOINT,
            {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': body.length
                }
            },
            res => {
                let data = '';
                res.on('data', chunk => (data += chunk));
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result.pages !== undefined) {
                            const pass = result.pages === expectedPages;
                            resolve({
                                success: pass,
                                actual: result.pages,
                                expected: expectedPages,
                                error: pass ? null : `Expected ${expectedPages}, got ${result.pages}`
                            });
                        } else {
                            resolve({ success: false, error: result.error || data });
                        }
                    } catch (e) {
                        resolve({ success: false, error: 'Invalid response: ' + data });
                    }
                });
            }
        );

        req.on('error', err => {
            resolve({ success: false, error: 'Request error: ' + err });
        });

        req.write(body);
        req.end();
    });
}

describe('PDF Count Pages API', function () {
    this.timeout(10000); // Allow up to 10s per test
    TEST_CASES.forEach(({ file, expected }) => {
        it(`should return ${expected} pages for ${file}`, async function () {
            const pdfPath = path.join(__dirname, 'resources', 'pdf-samples', file);
            const result = await countPagesForFile(pdfPath, expected);
            assert.strictEqual(result.success, true, result.error || 'Unknown error');
            assert.strictEqual(result.actual, expected, result.error || 'Page count mismatch');
        });
    });
});
