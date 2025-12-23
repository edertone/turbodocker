// Example: Convert HTML to PDF (binary) using plain Node.js

const http = require('http');
const fs = require('fs');

const data = JSON.stringify({
  html: '<h1>Hello PDF!óÖ</h1><p>This is a test.日本語の表記体系</p>'
});

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
    if (!fs.existsSync('out')) {
      fs.mkdirSync('out');
    }
    fs.writeFileSync('out/output.pdf', buffer);
    console.log('PDF saved as output.pdf, check the file.');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();