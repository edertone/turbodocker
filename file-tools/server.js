const http = require('node:http');
const helper = require('./server-helper.js');

const PORT = 5001;

const server = http.createServer(async (req, res) => {
    
    // Helper to send JSON response
    const sendJson = (code, data) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    // Helper to handle errors
    const handleError = (err) => {
        console.error(err); // Log for debugging
        const isClientErr = err.message && err.message.startsWith("Missing POST variable");
        sendJson(isClientErr ? 400 : 500, { error: err.message || 'Processing failed' });
    };

    try {
        switch (req.url) {
            case '/pdf-is-valid': {
                if (helper.rejectNonPost(req, res)) return;
                const { pdf } = await helper.getPostVariables(req, ['pdf']);
                const isValid = await helper.isValidPdf(pdf);
                sendJson(200, { valid: isValid });
                break;
            }

            case '/pdf-count-pages': {
                if (helper.rejectNonPost(req, res)) return;
                const { pdf } = await helper.getPostVariables(req, ['pdf']);
                const count = await helper.countPdfPages(pdf);
                sendJson(200, { pages: count });
                break;
            }

            case '/pdf-get-page-as-jpg': {
                if (helper.rejectNonPost(req, res)) return;
                const vars = await helper.getPostVariables(req, ['pdf', 'page'], ['width', 'height', 'jpegQuality']);
                const pageIndex = parseInt(vars.page, 10);
                const options = {
                    width: vars.width ? parseInt(vars.width, 10) : undefined,
                    height: vars.height ? parseInt(vars.height, 10) : undefined,
                    jpegQuality: vars.jpegQuality ? parseInt(vars.jpegQuality, 10) : undefined
                };

                const imgBuffer = await helper.getPdfPageAsJpg(vars.pdf, pageIndex, options);
                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                res.end(imgBuffer);
                break;
            }

            case '/html-to-pdf-binary':
            case '/html-to-pdf-base64': {
                if (helper.rejectNonPost(req, res)) return;
                const { html } = await helper.getPostVariables(req, ['html']);
                const pdfBuffer = await helper.convertHtmlToPdf(html);

                if (req.url === '/html-to-pdf-base64') {
                    sendJson(200, pdfBuffer.toString('base64'));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/pdf' });
                    res.end(pdfBuffer);
                }
                break;
            }

            default:
                sendJson(404, { error: 'Invalid endpoint: ' + req.url });
        }
    } catch (error) {
        handleError(error);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});