# File Tools Microservice

## PDF API endpoints documentation

### Image to JPEG

Convert an image to a JPEG with a specified quality and optionally a background color to set for transparent input

**Endpoint:** `/image-to-jpg`

**Method:** `POST`

**Content-Type:** `multipart/form-data`

**Parameters:**

- `image` (file): The image file to convert.
- `jpegQuality` (optional - integer): The quality of the output JPEG (1-100, default: 75).
- `transparentColor` (optional - string): The hex color to use for transparent areas (e.g., '#FFFFFF', default is white).

**Response:**

- JPEG image as binary data (`Content-Type: image/jpeg`)

**Example (Node.js):**

```javascript
const formData = new FormData();
formData.append('image', imageBuffer);
formData.append('jpegQuality', '90');
formData.append('transparentColor', '#000000');

const response = await fetch('http://localhost:5001/image-to-jpg', {
    method: 'POST',
    body: formData
});
const imageBlob = await response.blob();
// ... handle image blob
```

---

### PDF Validation

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
formData.append('pdf', pdfBuffer);

const response = await fetch('http://localhost:5001/pdf-is-valid', {
    method: 'POST',
    body: formData
});
const result = await response.json();
console.log('Is valid PDF:', result.valid);
```

---

### PDF Page Count

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

### PDF Page to JPEG

Convert a specific PDF page to a JPEG image with custom quality and resolution.

**Endpoint:** `/pdf-get-page-as-jpg`

**Method:** `POST`

**Content-Type:** `multipart/form-data` or `application/json`

**Parameters:**

- `pdf` (required - file or base64 string): The PDF file data
- `page` (required - integer): Page number (0 = first page)
- `width` (optional - integer): Desired width in pixels (1-10000)
- `height` (optional - integer): Desired height in pixels (1-10000)
- `jpegQuality` (optional - integer): JPEG quality (1-100, default: 75)

At least one of `width` or `height` must be provided. If only one is given, the other is calculated to preserve aspect ratio.

**Response:**

- JPEG image as binary data (`Content-Type: image/jpeg`)

**Example (Node.js):**

```javascript
const formData = new FormData();
formData.append('pdf', pdfBuffer);
formData.append('page', '0');
formData.append('width', '800');
formData.append('jpegQuality', '95');

const response = await fetch('http://localhost:5001/pdf-get-page-as-jpg', {
    method: 'POST',
    body: formData
});
const imageBuffer = await response.arrayBuffer();
// Save or process the JPEG image
```

---

### HTML to PDF

Convert HTML content to a pixel-perfect PDF using the Chromium engine.

**Endpoints:**

- `/html-to-pdf-binary`: Returns the PDF as a binary file (recommended)
- `/html-to-pdf-base64`: Returns the PDF as a base64 string

**Method:** `POST`

**Content-Type:** `multipart/form-data` or `application/json`

**Parameters:**

- `html` (required - string or file): The HTML content to convert.

**Response (`/html-to-pdf-binary`):**

- PDF document as binary data (`Content-Type: application/pdf`)

**Response (`/html-to-pdf-base64`):**

```json
"JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2c..."
```

**Example (Node.js for binary):**

```javascript
const response = await fetch('http://localhost:5001/html-to-pdf-binary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: '<h1>Hello World</h1>' })
});
const pdfBuffer = await response.arrayBuffer();
// ... save or process pdfBuffer
```
