const { describe, it } = require('node:test');
const assert = require('node:assert');
const { promises: fs } = require('node:fs');
const fsSync = require('node:fs');
const path = require('node:path');

const API_URL = 'http://localhost:5001';
const OUT_DIR = path.join(__dirname, '..', 'tests-out', 'image-to-jpg');

function ensureOutDir() {
    if (!fsSync.existsSync(OUT_DIR)) {
        fsSync.mkdirSync(OUT_DIR, { recursive: true });
    }
}

/**
 * Helper to make API requests for image conversion.
 * @param {Buffer} imageBuffer - The image buffer to send.
 * @param {string} originalFilename - The original filename of the image.
 * @param {number} [jpegQuality] - Optional JPEG quality setting.
 * @returns {Promise<Response>} - The fetch API Response object.
 */
async function convertImage(imageBuffer, originalFilename, jpegQuality) {
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), originalFilename);
    if (jpegQuality !== undefined) {
        formData.append('jpegQuality', String(jpegQuality));
    }

    return fetch(`${API_URL}/image-to-jpg`, {
        method: 'POST',
        body: formData
    });
}

describe('POST /image-to-jpg', () => {
    const imageDir = path.join(__dirname, 'resources', 'image-to-jpg');
    before(ensureOutDir);

    it('should convert a PNG image to JPG', async () => {
        const imagePath = path.join(imageDir, 'sample-transparent.png');
        const imageBuffer = await fs.readFile(imagePath);

        const response = await convertImage(imageBuffer, 'sample-transparent.png');
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.headers.get('content-type'), 'image/jpeg');

        const responseBuffer = Buffer.from(await response.arrayBuffer());
        assert(responseBuffer.length > 0, 'Response buffer should not be empty');

        // Save the converted image
        const outputPath = path.join(OUT_DIR, 'sample-transparent-png.jpg');
        await fs.writeFile(outputPath, responseBuffer);
    });

    it('should convert a BMP image to JPG', async () => {
        const imagePath = path.join(imageDir, 'sample.bmp');
        const imageBuffer = await fs.readFile(imagePath);

        const response = await convertImage(imageBuffer, 'sample.bmp');
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.headers.get('content-type'), 'image/jpeg');

        const responseBuffer = Buffer.from(await response.arrayBuffer());
        assert(responseBuffer.length > 0, 'Response buffer should not be empty');

        // Save the converted image
        const outputPath = path.join(OUT_DIR, 'sample-bmp.jpg');
        await fs.writeFile(outputPath, responseBuffer);
    });

    it('should respect the jpegQuality parameter', async () => {
        const imagePath = path.join(imageDir, 'sample-transparent.png');
        const imageBuffer = await fs.readFile(imagePath);

        // Convert with low quality
        const lowQualityResponse = await convertImage(imageBuffer, 'sample-transparent.png', 10);
        const lowQualityBuffer = Buffer.from(await lowQualityResponse.arrayBuffer());

        // Convert with high quality
        const highQualityResponse = await convertImage(imageBuffer, 'sample-transparent.png', 100);
        const highQualityBuffer = Buffer.from(await highQualityResponse.arrayBuffer());

        assert(
            lowQualityBuffer.length < highQualityBuffer.length,
            'Low quality image should be smaller than high quality image'
        );

        // Save both quality versions
        const lowQualityPath = path.join(OUT_DIR, 'sample-quality-10.jpg');
        const highQualityPath = path.join(OUT_DIR, 'sample-quality-100.jpg');
        await fs.writeFile(lowQualityPath, lowQualityBuffer);
        await fs.writeFile(highQualityPath, highQualityBuffer);
    });

    it('should return a 500 error for an invalid image', async () => {
        const invalidImageBuffer = Buffer.from('this is not an image');
        const response = await convertImage(invalidImageBuffer, 'invalid.txt');
        assert.strictEqual(response.status, 500);

        const json = await response.json();
        assert(
            json.error.includes('Could not convert image to JPG'),
            'Error message should indicate conversion failure'
        );
    });
});
