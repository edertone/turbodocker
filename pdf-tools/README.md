# PDF Tools Microservice

This Dockerized microservice provides general-purpose PDF manipulation tools via HTTP API endpoints on port 5001.

---

## Build & Run Locally

```sh
docker build -t pdf-tools . && docker run -p 5001:5001 pdf-tools
```

## Run tests

There are some basic tests to check everything works. To run them, start the container on localhost, move inside tests folder and run:

```
node test-count-pages.js
node test-html-to-pdf.js
node test-.....
```

---

## 1. PDF Validation

Verify that a provided file is a valid PDF document

**Endpoint:** `/pdf-is-valid`

**Method:** `POST`

**Content-Type:** `multipart/form-data`

**Parameters:**

- `pdf` (file): The PDF file data

**Response:**

```json
{
  "valid": true
}
```

**Example (Node.js):**

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

---

## 2. PDF Page Count

Count the number of pages on a provided PDF file

**Endpoint:** `/pdf-count-pages`

**Method:** `POST`

**Content-Type:** `multipart/form-data`

**Parameters:**

- `pdf` (file): The PDF file data

**Response:**

```json
{
  "pages": 5
}
```

**Example using cURL**:

```sh
curl -X POST -F "pdf=@document.pdf" http://localhost:5001/pdf-count-pages
```

---

## 3. PDF Page to JPEG

Convert a specific PDF page to a JPEG image with custom quality and resolution.

**Endpoint:** `/pdf-get-page-as-jpg`

**Method:** `POST`

**Content-Type:** `multipart/form-data`

**Parameters (all required):**

- `pdf` (file): The PDF file data
- `page` (integer): Page number (0-based; 0 = first page)
- `jpgQuality` (integer): JPEG quality (1-100)
- `dpi` (integer): Resolution (72-2400)

**Response:**

- JPEG image as binary data (`Content-Type: image/jpeg`)

**Example (Node.js):**

```javascript
const formData = new FormData();
formData.append("pdf", pdfBuffer);
formData.append("page", "0");
formData.append("jpgQuality", "95");
formData.append("dpi", "300");

const response = await fetch("http://localhost:5001/pdf-get-page-as-jpg", {
  method: "POST",
  body: formData,
});
const imageBuffer = await response.arrayBuffer();
// Save or process the JPEG image
```

---

## 4. HTML to PDF

Convert HTML content to a pixel-perfect PDF using the Chromium engine.

**Endpoints:**

- `/html-to-pdf-binary`: Returns the PDF as a binary file (recommended)
- `/html-to-pdf-base64`: Returns the PDF as a base64 string

**Method:** `POST`

**Content-Type:** `application/json`

**Parameters:**

- `html` (string): The HTML content to convert

**Response:**

- `/html-to-pdf-binary`: PDF as binary (`Content-Type: application/pdf`)
- `/html-to-pdf-base64`: PDF as base64 string (`Content-Type: application/json`)

**Example (PHP, base64 endpoint):**

```php
$html = '<html><body><h1>Hello, PDF!</h1><p>This is a test.</p></body></html>';
$ch = curl_init('http://localhost:5001/html-to-pdf-base64');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['html' => $html]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$pdfBase64 = curl_exec($ch);
if ($pdfBase64 === false) {
    $errorMsg = curl_error($ch);
    // Handle error
}
curl_close($ch);
// $pdfBase64 now contains the base64-encoded PDF string
return $pdfBase64;
```

---
