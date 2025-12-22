const http = require('node:http');
const {
    rejectNonPost,
    findChromeExecutable,
    countPdfPagesWithPdfinfo,
    convertHtmlToPdf,
    getPostVariables
} = require('./server-helper.js');


// Global constants
const PORT = 5001;
const CHROME_EXECUTABLE = findChromeExecutable();
const ENDPOINT_PDF_COUNT_PAGES = '/pdf-count-pages';
const ENDPOINT_HTML_TO_PDF_BINARY = '/html-to-pdf-binary';
const ENDPOINT_HTML_TO_PDF_BASE64 = '/html-to-pdf-base64';

// Create a basic HTTP server to handle requests
const server = http.createServer(async (req, res) => {
    switch (req.url) {
        case ENDPOINT_PDF_COUNT_PAGES:
            if (rejectNonPost(req, res, 'Method Not Allowed. Use POST with PDF data.')) return;
            
            try {
                const { pdf: pdfData } = await getPostVariables(req, ['pdf']);
                const pdfBuffer = Buffer.from(pdfData, 'binary');
                const pageCount = await countPdfPagesWithPdfinfo(pdfBuffer);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ pages: pageCount }));

            } catch (error) {
                const isMissingVar = error.message && error.message.startsWith("Missing POST variable'");
                res.writeHead(isMissingVar ? 400 : 500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: error.message || 'Failed to count PDF pages.' }));
            }

        case ENDPOINT_HTML_TO_PDF_BINARY:
        case ENDPOINT_HTML_TO_PDF_BASE64:
            if (rejectNonPost(req, res, 'Method Not Allowed. Use valid html string via POST html variable')) return;
            
            try {
                const { html } = await getPostVariables(req, ['html']);
                const pdfBuffer = await convertHtmlToPdf(html, CHROME_EXECUTABLE);

                if (req.url === ENDPOINT_HTML_TO_PDF_BASE64) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(pdfBuffer.toString('base64'));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/pdf' });
                    res.end(pdfBuffer);
                }

            } catch (error) {
                const isMissingVar = error.message && error.message.startsWith("Missing POST variable'");
                res.writeHead(isMissingVar ? 400 : 500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: error.message || 'Failed to convert HTML to PDF.' }));
            }
            break;

        default:
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid endpoint: ' + req.url }));
            break;
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
