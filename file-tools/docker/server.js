const { serve } = require('@hono/node-server');
const { Hono } = require('hono');
const { createReadStream } = require('node:fs');
const { stream } = require('hono/streaming');
const helper = require('./server-helper.js');

const app = new Hono();
const PORT = 5001;

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

// Store a value to the cache
app.post('/cache-set', async c => {
    const body = await helper.parseBodyVariables(c);
    const { key, expire } = body;

    if (!key) {
        throw new Error("Missing 'key' in POST body");
    }

    const value = await helper.getFileAsBuffer(body, 'value');

    // Parse TTL if present (seconds), otherwise undefined (which becomes permanent)
    await helper.getCacheManager().set(key, value, expire ? parseInt(expire, 10) : undefined);

    return c.json({ success: true });
});

// Obtain a previously stored value from the cache
app.post('/cache-get', async c => {
    const body = await helper.parseBodyVariables(c);
    const { key } = body;

    if (!key) {
        throw new Error("Missing 'key' in POST body");
    }

    const filePath = helper.getCacheManager().getFilePath(key);

    if (!filePath) {
        return c.json({ error: 'Key not found or expired' }, 404);
    }

    // Return stream - Extremely memory efficient
    return stream(
        c,
        async stream => {
            try {
                const fileStream = createReadStream(filePath);
                for await (const chunk of fileStream) {
                    await stream.write(chunk);
                }
            } catch (err) {
                console.error(`Error streaming file ${filePath}:`, err);
            }
        },
        {
            headers: { 'Content-Type': 'application/octet-stream' }
        }
    );
});

// Delete a key and its value from the cache
app.post('/cache-delete-key', async c => {
    const body = await helper.parseBodyVariables(c);
    const { key } = body;

    if (!key) {
        throw new Error("Missing 'key' in POST body");
    }

    // Capture the boolean result from the helper
    const wasDeleted = await helper.getCacheManager().del(key);

    return c.json({
        success: true,
        deleted: wasDeleted
    });
});

// Delete all keys from the cache - Use with caution!
app.post('/cache-delete-all', async c => {
    await helper.getCacheManager().clear();
    return c.json({ success: true });
});

// Delete all expired keys from the cache
app.post('/cache-prune', async c => {
    try {
        const deletedCount = await helper.getCacheManager().prune();
        return c.json({
            success: true,
            deleted: deletedCount
        });
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Pruning failed' }, 500);
    }
});

// AUTOMATIC CACHE CLEANUP
// Run a prune job every 2 hours to remove expired items from the DB file
setInterval(
    async () => {
        try {
            const deleted = await helper.getCacheManager().prune();
        } catch (e) {
            console.error('[Cache Prune] Failed:', e);
        }
    },
    1000 * 60 * 60 * 2
);

// Start Server
console.log(`Server running on http://0.0.0.0:${PORT}`);
serve({
    fetch: app.fetch,
    port: PORT
});
