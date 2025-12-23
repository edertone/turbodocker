// tests/test-html-to-pdf.test.js
const http = require('http');
const assert = require('assert');

function htmlToPdfRequest(html) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ html });
        const options = {
            hostname: 'localhost',
            port: 5001,
            path: '/html-to-pdf-binary',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = http.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({ 
                    statusCode: res.statusCode, 
                    buffer,
                    headers: res.headers
                });
            });
        });
        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

describe('HTML to PDF API', function () {
    this.timeout(10000);

    it('should convert HTML to PDF (binary)', async function () {
        const html = '<h1>Hello PDF!óÖ</h1><p>This is a test.日本語の表記体系</p>';
        const result = await htmlToPdfRequest(html);
        assert.strictEqual(result.statusCode, 200, 'Expected HTTP 200');
        assert.ok(result.buffer.length > 1000, 'PDF buffer should not be empty');
    });

    it('should return a valid PDF file (header check)', async function () {
        const html = '<h1>Header Test</h1>';
        const result = await htmlToPdfRequest(html);
        const pdfHeader = result.buffer.slice(0, 5).toString();
        assert.strictEqual(pdfHeader, '%PDF-', 'PDF should start with %PDF-');
    });

    it('should return application/pdf content-type header', async function () {
        const html = '<h1>Content-Type Test</h1>';
        const result = await htmlToPdfRequest(html);
        assert(
            result.headers['content-type'] && result.headers['content-type'].includes('application/pdf'),
            'Content-Type should be application/pdf'
        );
    });
});