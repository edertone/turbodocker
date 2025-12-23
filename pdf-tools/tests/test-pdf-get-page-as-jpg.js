const http = require('http');
const fs = require('fs');
const path = require('path');

const PDF_FILE_PATH = path.join(__dirname, 'resources', 'sample30.pdf');
const ENDPOINT = 'http://localhost:5001/pdf-get-page-as-jpg';

async function testPdfGetPageAsJpg() {
    // Check if example PDF exists
    if (!fs.existsSync(PDF_FILE_PATH)) {
        console.error('Error: sample30.pdf not found in resources directory');
        console.log('Please add a PDF file named "sample30.pdf" to the resources directory');
        return;
    }

    const pdfBuffer = fs.readFileSync(PDF_FILE_PATH);
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

    // Test parameters
    const page = 0; // First page (0-based)
    const jpgQuality = 90;
    const dpi = 150;

    // Build multipart form data
    const formFields = [
        `--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="sample.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
        pdfBuffer,
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="page"\r\n\r\n${page}`,
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="jpgQuality"\r\n\r\n${jpgQuality}`,
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="dpi"\r\n\r\n${dpi}`,
        `\r\n--${boundary}--\r\n`
    ];

    const body = Buffer.concat(formFields.map(field => 
        typeof field === 'string' ? Buffer.from(field, 'utf-8') : field
    ));

    console.log(`Testing PDF page to JPEG conversion...`);
    console.log(`- PDF file: ${PDF_FILE_PATH}`);
    console.log(`- Page: ${page} (first page)`);
    console.log(`- JPEG Quality: ${jpgQuality}`);
    console.log(`- DPI: ${dpi}`);

    const req = http.request(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data; boundary=' + boundary,
            'Content-Length': body.length,
        },
    }, (res) => {
        console.log(`Response status: ${res.statusCode}`);
        console.log(`Response headers:`, res.headers);

        if (res.statusCode === 200 && res.headers['content-type'] === 'image/jpeg') {
            // Success - save the JPEG image
            const outputPath = path.join(__dirname, 'out', `output-page-${page}.jpg`);
            const writeStream = fs.createWriteStream(outputPath);
            
            res.pipe(writeStream);
            
            writeStream.on('finish', () => {
                console.log(`✅ Success! JPEG image saved to: ${outputPath}`);
                
                // Get file size for verification
                const stats = fs.statSync(outputPath);
                console.log(`📁 File size: ${(stats.size / 1024).toFixed(2)} KB`);
            });
        } else {
            // Error response
            let errorData = '';
            res.on('data', chunk => errorData += chunk);
            res.on('end', () => {
                console.log('❌ Error response:', errorData);
            });
        }
    });

    req.on('error', (err) => {
        console.error('❌ Request error:', err.message);
    });

    req.write(body);
    req.end();
}

// Test with different parameters
async function runAllTests() {
    console.log('=== Testing PDF Page to JPEG Conversion ===\n');
    
    // Test 1: Default parameters
    await testPdfGetPageAsJpg();
    
    // Wait a bit between tests
    setTimeout(() => {
        // Test 2: High quality
        console.log('\n--- Testing with high quality ---');
        testWithParameters(0, 100, 300);
    }, 2000);

    setTimeout(() => {
        // Test 3: Low quality
        console.log('\n--- Testing with low quality ---');
        testWithParameters(0, 50, 72);
    }, 4000);
}

async function testWithParameters(page, quality, dpi) {
    if (!fs.existsSync(PDF_FILE_PATH)) {
        console.error('Error: example.pdf not found');
        return;
    }

    const pdfBuffer = fs.readFileSync(PDF_FILE_PATH);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    const formFields = [
        `--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="sample.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
        pdfBuffer,
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="page"\r\n\r\n${page}`,
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="jpgQuality"\r\n\r\n${quality}`,
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="dpi"\r\n\r\n${dpi}`,
        `\r\n--${boundary}--\r\n`
    ];

    const body = Buffer.concat(formFields.map(field => 
        typeof field === 'string' ? Buffer.from(field, 'utf-8') : field
    ));

    console.log(`Testing with: page=${page}, quality=${quality}, dpi=${dpi}`);

    const req = http.request(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data; boundary=' + boundary,
            'Content-Length': body.length,
        },
    }, (res) => {
        if (res.statusCode === 200) {
            const outputPath = path.join(__dirname, 'out', `output-page-${page}-q${quality}-dpi${dpi}.jpg`);
            const writeStream = fs.createWriteStream(outputPath);
            res.pipe(writeStream);
            
            writeStream.on('finish', () => {
                const stats = fs.statSync(outputPath);
                console.log(`✅ Saved: ${path.basename(outputPath)} (${(stats.size / 1024).toFixed(2)} KB)`);
            });
        } else {
            let errorData = '';
            res.on('data', chunk => errorData += chunk);
            res.on('end', () => {
                console.log('❌ Error:', errorData);
            });
        }
    });

    req.on('error', (err) => {
        console.error('❌ Request error:', err.message);
    });

    req.write(body);
    req.end();
}

// Run the tests
runAllTests();
