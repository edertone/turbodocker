const http = require('node:http');
const {
    rejectNonPost,
    findChromeExecutable,
    countPdfPages,
    convertHtmlToPdf,
    getPostVariables,
    isValidPdf,
    getPdfPageAsJpg
} = require('./server-helper.js');

// Global constants
const PORT = 5001;
const ENDPOINT_PDF_IS_VALID = '/pdf-is-valid';
const ENDPOINT_PDF_COUNT_PAGES = '/pdf-count-pages';
const ENDPOINT_PDF_GET_PAGE_AS_JPG = '/pdf-get-page-as-jpg';
const ENDPOINT_HTML_TO_PDF_BINARY = '/html-to-pdf-binary';
const ENDPOINT_HTML_TO_PDF_BASE64 = '/html-to-pdf-base64';

// Create a basic HTTP server to handle requests
const server = http.createServer(async (req, res) => {
    switch (req.url) {
        case ENDPOINT_PDF_IS_VALID:
            if (rejectNonPost(req, res)) return;
            try {
                const { pdf: pdfData } = await getPostVariables(req, ['pdf']);
                const pdfBuffer = Buffer.from(pdfData, 'binary');
                const isValid = await isValidPdf(pdfBuffer);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ valid: isValid }));
            } catch (error) {
                const isMissingVar = error.message && error.message.startsWith("Missing POST variable'");
                res.writeHead(isMissingVar ? 400 : 500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: error.message || 'Failed to validate PDF.' }));
            }
            break;
        case ENDPOINT_PDF_COUNT_PAGES:
            if (rejectNonPost(req, res)) return;

            try {
                const { pdf: pdfData } = await getPostVariables(req, ['pdf']);
                const pdfBuffer = Buffer.from(pdfData, 'binary');
                const pageCount = await countPdfPages(pdfBuffer);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ pages: pageCount }));
            } catch (error) {
                const isMissingVar = error.message && error.message.startsWith("Missing POST variable'");
                res.writeHead(isMissingVar ? 400 : 500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: error.message || 'Failed to count PDF pages.' }));
            }
            break;

        case ENDPOINT_PDF_GET_PAGE_AS_JPG:
            if (rejectNonPost(req, res)) return;

            try {
                const postData = await getPostVariables(req, ['pdf', 'page'], ['width', 'height', 'jpegQuality']);
                const pdfBuffer = Buffer.from(postData.pdf, 'binary');
                const pageIndex = parseInt(postData.page, 10);
                const options = {};
                if (postData.width !== undefined) options.width = parseInt(postData.width, 10);
                if (postData.height !== undefined) options.height = parseInt(postData.height, 10);
                if (postData.jpegQuality !== undefined) options.jpegQuality = parseInt(postData.jpegQuality, 10);

                const imageBuffer = await getPdfPageAsJpg(pdfBuffer, pageIndex, options);

                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                return res.end(imageBuffer);
            } catch (error) {
                const isMissingVar = error.message && error.message.startsWith("Missing POST variable'");
                res.writeHead(isMissingVar ? 400 : 500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: error.message || 'Failed to convert PDF page to JPEG.' }));
            }
            break;

        case ENDPOINT_HTML_TO_PDF_BINARY:
        case ENDPOINT_HTML_TO_PDF_BASE64:
            if (rejectNonPost(req, res)) return;

            try {
                const { html } = await getPostVariables(req, ['html']);
                const pdfBuffer = await convertHtmlToPdf(html);

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
