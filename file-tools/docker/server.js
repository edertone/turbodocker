const { serve } = require('@hono/node-server');
const { Hono } = require('hono');
const helper = require('./server-helper.js');
const Redis = require('ioredis');

const app = new Hono();
const PORT = 5001;
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Error handling middleware
app.onError((err, c) => {
    console.error(err);
    const status = err.message.startsWith('Missing') || err.message.startsWith('Invalid') ? 400 : 500;
    return c.json({ error: err.message || 'Processing failed' }, status);
});

// Image to JPG
app.post('/image-to-jpg', async c => {
    const body = await helper.parseBodyVariables(c);
    const imageBuffer = await helper.getFileAsBuffer(body, 'image');

    const options = {
        jpegQuality: body['jpegQuality'] ? parseInt(body['jpegQuality'], 10) : 75,
        transparentColor: body['transparentColor'] || '#FFFFFF'
    };

    const jpgBuffer = await helper.convertImageToJpg(imageBuffer, options);

    return c.body(jpgBuffer, 200, {
        'Content-Type': 'image/jpeg'
    });
});

// PDF Validation
app.post('/pdf-is-valid', async c => {
    const body = await helper.parseBodyVariables(c);
    const pdfBuffer = await helper.getFileAsBuffer(body, 'pdf');

    const isValid = await helper.isValidPdf(pdfBuffer);
    return c.json({ valid: isValid });
});

// Count Pages
app.post('/pdf-count-pages', async c => {
    const body = await helper.parseBodyVariables(c);
    const pdfBuffer = await helper.getFileAsBuffer(body, 'pdf');

    const count = await helper.countPdfPages(pdfBuffer);
    return c.json({ pages: count });
});

// PDF Page to JPG
app.post('/pdf-get-page-as-jpg', async c => {
    const body = await helper.parseBodyVariables(c);
    const pdfBuffer = await helper.getFileAsBuffer(body, 'pdf');

    // Parse inputs
    const page = parseInt(body['page'], 10);
    if (isNaN(page)) throw new Error("Missing POST variable 'page'");

    const options = {
        width: body['width'] ? parseInt(body['width'], 10) : undefined,
        height: body['height'] ? parseInt(body['height'], 10) : undefined,
        jpegQuality: body['jpegQuality'] ? parseInt(body['jpegQuality'], 10) : 75
    };

    const imgBuffer = await helper.getPdfPageAsJpg(pdfBuffer, page, options);

    return c.body(imgBuffer, 200, {
        'Content-Type': 'image/jpeg'
    });
});

// HTML to PDF
const handleHtmlToPdf = async (c, returnBase64) => {
    const body = await helper.parseBodyVariables(c);
    const html = body['html'];

    if (!html) throw new Error("Missing POST variable 'html'");

    // Handle case where HTML might be uploaded as a file object vs simple string
    const htmlString = typeof html === 'object' && html.text ? await html.text() : String(html);

    const pdfBuffer = await helper.convertHtmlToPdf(htmlString);

    if (returnBase64) {
        return c.json(pdfBuffer.toString('base64'));
    } else {
        return c.body(pdfBuffer, 200, {
            'Content-Type': 'application/pdf'
        });
    }
};

app.post('/html-to-pdf-binary', c => handleHtmlToPdf(c, false));
app.post('/html-to-pdf-base64', c => handleHtmlToPdf(c, true));

// Cache text set
app.post('/cache-text-set', async c => {
    const body = await helper.parseBodyVariables(c);
    const { key, value, expire } = body;

    if (!key || !value) {
        throw new Error("Missing 'key' or 'value' in POST body");
    }

    if (expire) {
        await redis.set(key, value, 'EX', parseInt(expire, 10));
    } else {
        await redis.set(key, value);
    }

    return c.json({ success: true });
});

// Cache text get
app.post('/cache-text-get', async c => {
    const body = await helper.parseBodyVariables(c);
    const { key } = body;

    if (!key) {
        throw new Error("Missing 'key' in POST body");
    }

    const value = await redis.get(key);
    return c.json({ key, value });
});

// Start Server
console.log(`Server running on http://0.0.0.0:${PORT}`);
serve({
    fetch: app.fetch,
    port: PORT
});
