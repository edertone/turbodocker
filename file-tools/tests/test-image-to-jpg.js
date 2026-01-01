const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');

const API_URL = 'http://localhost:5001';
const OUT_DIR = path.join(__dirname, '..', 'tests-out', 'image-to-jpg');

function ensureOutDir() {
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }
}

/**
 * Helper to make API requests for image conversion.
 * @param {Buffer} imageBuffer - The image buffer to send.
 * @param {string} originalFilename - The original filename of the image.
 * @param {number} [jpegQuality] - Optional JPEG quality setting.
 * @param {string} [transparentColor] - Optional transparent background color.
 * @returns {Promise<Object>} - The response object with statusCode, buffer, and headers.
 */
function convertImage(imageBuffer, originalFilename, jpegQuality, transparentColor) {
    return new Promise((resolve, reject) => {
        const boundary = `----WebKitFormBoundary${randomBytes(16).toString('hex')}`;
        
        let body = Buffer.concat([
            Buffer.from(`--${boundary}\r\n`),
            Buffer.from(`Content-Disposition: form-data; name="image"; filename="${originalFilename}"\r\n`),
            Buffer.from('Content-Type: application/octet-stream\r\n\r\n'),
            imageBuffer,
            Buffer.from('\r\n')
        ]);
        
        if (jpegQuality !== undefined) {
            body = Buffer.concat([
                body,
                Buffer.from(`--${boundary}\r\n`),
                Buffer.from('Content-Disposition: form-data; name="jpegQuality"\r\n\r\n'),
                Buffer.from(String(jpegQuality)),
                Buffer.from('\r\n')
            ]);
        }
        
        if (transparentColor !== undefined) {
            body = Buffer.concat([
                body,
                Buffer.from(`--${boundary}\r\n`),
                Buffer.from('Content-Disposition: form-data; name="transparentColor"\r\n\r\n'),
                Buffer.from(transparentColor),
                Buffer.from('\r\n')
            ]);
        }
        
        body = Buffer.concat([
            body,
            Buffer.from(`--${boundary}--\r\n`)
        ]);

        const req = http.request(
            `${API_URL}/image-to-jpg`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': body.length
                }
            },
            res => {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve({
                        statusCode: res.statusCode,
                        buffer,
                        headers: res.headers
                    });
                });
            }
        );

        req.on('error', err => reject(err));
        req.write(body);
        req.end();
    });
}

describe('Image to JPG API', function () {
    this.timeout(10000); // Allow up to 10s per test
    const imageDir = path.join(__dirname, 'resources', 'image-to-jpg');
    
    before(function() {
        ensureOutDir();
    });

    it('should convert a PNG image to JPG', async function () {
        const imagePath = path.join(imageDir, 'png-sample.png');
        const imageBuffer = fs.readFileSync(imagePath);

        const response = await convertImage(imageBuffer, 'png-sample.png');
        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(response.headers['content-type'], 'image/jpeg');

        assert(response.buffer.length > 0, 'Response buffer should not be empty');

        // Save the converted image
        const outputPath = path.join(OUT_DIR, 'png-sample.jpg');
        fs.writeFileSync(outputPath, response.buffer);
    });

    it('should convert a PNG image with transparent background to JPG with white background', async function () {
        const imagePath = path.join(imageDir, 'png-sample-transparent.png');
        const imageBuffer = fs.readFileSync(imagePath);

        const response = await convertImage(imageBuffer, 'png-sample-transparent.png');
        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(response.headers['content-type'], 'image/jpeg');

        assert(response.buffer.length > 0, 'Response buffer should not be empty');

        // Save the converted image
        const outputPath = path.join(OUT_DIR, 'png-sample-transparent-bg-white.jpg');
        fs.writeFileSync(outputPath, response.buffer);
    });

    it('should convert a PNG image with transparent background to JPG with black background', async function () {
        const imagePath = path.join(imageDir, 'png-sample-transparent.png');
        const imageBuffer = fs.readFileSync(imagePath);

        const response = await convertImage(imageBuffer, 'png-sample-transparent.png', undefined, '#000000');
        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(response.headers['content-type'], 'image/jpeg');

        assert(response.buffer.length > 0, 'Response buffer should not be empty');

        // Save the converted image
        const outputPath = path.join(OUT_DIR, 'png-sample-transparent-bg-black.jpg');
        fs.writeFileSync(outputPath, response.buffer);
    });

    it('should convert a BMP image to JPG', async function () {
        const imagePath = path.join(imageDir, 'bmp-sample.bmp');
        const imageBuffer = fs.readFileSync(imagePath);

        const response = await convertImage(imageBuffer, 'bmp-sample.bmp');
        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(response.headers['content-type'], 'image/jpeg');

        assert(response.buffer.length > 0, 'Response buffer should not be empty');

        // Save the converted image
        const outputPath = path.join(OUT_DIR, 'bmp-sample.jpg');
        fs.writeFileSync(outputPath, response.buffer);
    });

    it('should respect the jpegQuality parameter', async function () {
        const imagePath = path.join(imageDir, 'png-sample-transparent.png');
        const imageBuffer = fs.readFileSync(imagePath);

        // Convert with low quality
        const lowQualityResponse = await convertImage(imageBuffer, 'png-sample-transparent.png', 10);
        const lowQualityBuffer = lowQualityResponse.buffer;

        // Convert with high quality
        const highQualityResponse = await convertImage(imageBuffer, 'png-sample-transparent.png', 100);
        const highQualityBuffer = highQualityResponse.buffer;

        assert(
            lowQualityBuffer.length < highQualityBuffer.length,
            'Low quality image should be smaller than high quality image'
        );

        // Save both quality versions
        const lowQualityPath = path.join(OUT_DIR, 'png-sample-transparent-qual10.jpg');
        const highQualityPath = path.join(OUT_DIR, 'png-sample-transparent-qual100.jpg');
        fs.writeFileSync(lowQualityPath, lowQualityBuffer);
        fs.writeFileSync(highQualityPath, highQualityBuffer);
    });

    it('should return a 500 error for an invalid image', async function () {
        const invalidImageBuffer = Buffer.from('this is not an image');
        const response = await convertImage(invalidImageBuffer, 'invalid.txt');
        assert.strictEqual(response.statusCode, 500);

        const json = JSON.parse(response.buffer.toString());
        assert(
            json.error.includes('Could not convert image to JPG'),
            'Error message should indicate conversion failure'
        );
    });
});
