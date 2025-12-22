# PDF tools microservice

This is a Dockerized microservice utility with general purpose PDF manipulation tools.

It exposes several HTTP (no https) API endpoints at the 5001 port

## Build and run locally (for testing and development):

```
docker build -t pdf-tools . && docker run -p 5001:5001 pdf-tools
```

## PDF Validation

Validate if a file is a valid PDF document.

**Endpoint**: `/pdf-is-valid`

Send a POST request with multipart/form-data containing the PDF file:

- `pdf`: The PDF file data

Returns JSON response:

```json
{
  "valid": true
}
```

**Example using Node.js**:

```javascript
const formData = new FormData();
formData.append("pdf", pdfBuffer);

const response = await fetch("http://localhost:5001/pdf-is-valid", {
  method: "POST",
  body: formData,
});

const result = await response.json();
console.log("Is valid PDF:", result.valid);
```

## PDF pages count

Get the number of pages in a PDF document.

**Endpoint**: `/pdf-count-pages`

Send a POST request with multipart/form-data containing the PDF file:

- `pdf`: The PDF file data

Returns JSON response:

```json
{
  "pages": 5
}
```

**Example using cURL**:

```bash
curl -X POST -F "pdf=@document.pdf" http://localhost:5001/pdf-count-pages
```

## PDF to images

Convert a specific PDF page to a JPEG image with customizable quality and resolution.

**Endpoint**: `/pdf-get-page-as-jpg`

Send a POST request with multipart/form-data:

**Required parameters**:

- `pdf`: The PDF file data
- `page`: Page number (0-based, so 0 = first page)
- `jpgQuality`: JPEG quality 1-100
- `dpi`: Resolution 72-2400

Returns the JPEG image as binary data with `Content-Type: image/jpeg`.

**Example using Node.js**:

```javascript
const formData = new FormData();
formData.append("pdf", pdfBuffer);
formData.append("page", "0"); // First page
formData.append("jpgQuality", "95");
formData.append("dpi", "300");

const response = await fetch("http://localhost:5001/pdf-get-page-as-jpg", {
  method: "POST",
  body: formData,
});

const imageBuffer = await response.arrayBuffer();
// Save or process the JPEG image
```

## HTML to PDF

We can generate pixel perfect PDF files from an HTML source.

The webservice has several endpoints that expect html data and return the equivalent pdf rendered using the chromium engine. All the process and temporary data is handled internally by the docker image, so the only requirement is to have enough HDD space for the docker container to run.
All temporary files are automatically cleaned, so no increase in storage should happen during extended usage of this microservice.

**Endpoints**:

    •  /html-to-pdf-binary: Returns the PDF as binary file (Recommended for performance)
    •  /html-to-pdf-base64: Returns the PDF as a base64 string

To generate a pdf, send a POST request with a JSON payload containing the HTML string:

```
{
  "html": "<your html code>"
}
```

The service will directly return the PDF data encoded to the selected format.

**Example: Convert HTML to PDF (base64) using PHP**

```
// Call to the HTML to PDF conversion microservice
$html = '<html><body><h1>Hello, PDF!</h1><p>This is a test.</p></body></html>';

$ch = curl_init('http://html-pdf-converter:5001/html-to-pdf-base64');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['html' => $html]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$pdfBase64 = curl_exec($ch);

if ($pdfBase64 === false) {
    $errorMsg = curl_error($ch);
    // Process the error as necessary
}

curl_close($ch);

// $pdfBase64 now contains the base64-encoded PDF string
return $pdfBase64;
```
