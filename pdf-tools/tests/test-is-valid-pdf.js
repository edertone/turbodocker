const http = require('http');
const fs = require('fs');
const path = require('path');


const ENDPOINT = 'http://localhost:5001/pdf-is-valid';
const TEST_FILES = [
    { name: 'sample1.pdf', description: '1-page PDF' },
    { name: 'sample4.pdf', description: '4-page PDF' },
    { name: 'sample30.pdf', description: '30-page PDF' },
    { name: 'sample-invalid.pdf', description: 'Invalid PDF' }
];

async function testIsValidPdf(fileName, description) {
    const filePath = path.join(__dirname, 'resources', fileName);
    const pdfBuffer = fs.readFileSync(filePath);
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

    const pre = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`,
        'utf-8'
    );
    const post = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const body = Buffer.concat([pre, pdfBuffer, post]);

    return new Promise((resolve) => {
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
                console.log(`Test: ${description} (${fileName}) =>`, data);
                resolve();
            });
        });

        req.on('error', (err) => {
            console.error(`Request error for ${fileName}:`, err);
            resolve();
        });

        req.write(body);
        req.end();
    });
}

(async () => {
    for (const { name, description } of TEST_FILES) {
        await testIsValidPdf(name, description);
    }
})();