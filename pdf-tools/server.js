const http = require('node:http');
const { findChromeExecutable, countPdfPagesWithPdfinfo, convertHtmlToPdf } = require('./server-helper.js');


// Global constants
const PORT = 5001;
const CHROME_EXECUTABLE = findChromeExecutable();
const ENDPOINT_PDF_COUNT_PAGES = '/pdf-count-pages';
const ENDPOINT_HTML_TO_PDF_BINARY = '/html-to-pdf-binary';
const ENDPOINT_HTML_TO_PDF_BASE64 = '/html-to-pdf-base64';

// Create a basic HTTP server to handle requests
const server = http.createServer(async (req, res) => {

    // Handle PDF page count endpoint
    if (req.url === ENDPOINT_PDF_COUNT_PAGES) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST with PDF data.' }));
        }

        try {
            const contentType = req.headers['content-type'];
            if (!contentType || !contentType.startsWith('multipart/form-data')) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Content-Type must be multipart/form-data.' }));
            }

            const boundary = `--${contentType.split('boundary=')[1]}`;
            if (!boundary) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Invalid multipart/form-data: boundary not found.' }));
            }

            const bodyChunks = [];
            for await (const chunk of req) {
                bodyChunks.push(chunk);
            }
            const body = Buffer.concat(bodyChunks);

            const boundaryBuffer = Buffer.from(boundary);
            const headerSeparator = Buffer.from('\r\n\r\n');

            let partStartIndex = body.indexOf(boundaryBuffer);
            if (partStartIndex === -1) {
                throw new Error("Invalid multipart/form-data: boundary not found in body.");
            }
            partStartIndex += boundaryBuffer.length;

            // Find the start of the file data (after the part headers)
            const headerEndIndex = body.indexOf(headerSeparator, partStartIndex);
            if (headerEndIndex === -1) {
                throw new Error("Invalid multipart/form-data: part headers not found.");
            }
            const fileDataStartIndex = headerEndIndex + headerSeparator.length;

            // Find the end of the file data (before the next boundary)
            const fileDataEndIndex = body.indexOf(boundaryBuffer, fileDataStartIndex);
            if (fileDataEndIndex === -1) {
                throw new Error("Invalid multipart/form-data: closing boundary not found.");
            }

            // The actual file data is between the end of headers and the start of the next boundary
            // We need to trim the CRLF before the boundary
            const pdfBuffer = body.subarray(fileDataStartIndex, fileDataEndIndex - 2); // -2 for \r\n

            if (!pdfBuffer.length) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "Missing 'pdf' file in form data." }));
            }

            const pageCount = await countPdfPagesWithPdfinfo(pdfBuffer);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ pages: pageCount }));

        } catch (error) {
            console.error('Error processing pdf count request:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: error.message || 'Failed to count PDF pages.' }));
        }
    }

    // Throw error for non expected routes
    if (![ENDPOINT_HTML_TO_PDF_BASE64, ENDPOINT_HTML_TO_PDF_BINARY].includes(req.url)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid endpoint: ' + req.url }));
    }
    // Throw error for non-POST requests
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Method Not Allowed. Use valid html string via POST html variable' }));
    }

    // Collect the request body
    const bodyChunks = [];
    for await (const chunk of req) {
        bodyChunks.push(chunk);
    }
    const body = Buffer.concat(bodyChunks).toString();

    let parsedBody;
    try {
        parsedBody = JSON.parse(body);
    } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
    }

    // Obtain the HTML content from the request body html key
    const { html } = parsedBody;
    if (!html) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "Missing 'html' key in JSON payload." }));
    }

    try {
        
        const pdfBuffer = await convertHtmlToPdf(html, CHROME_EXECUTABLE);

        if (req.url === ENDPOINT_HTML_TO_PDF_BASE64) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(pdfBuffer.toString('base64'));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/pdf' });
            res.end(pdfBuffer);
        }
        
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message || 'Failed to convert HTML to PDF.' }));
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
