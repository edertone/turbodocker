# File Tools Microservice

## Cache API endpoints documentation

The cache is stored on the file system inside the Docker container, so it will persist as long as the container's volume is not destroyed. The volume can be mounted on the host to persist the cached data.

---

### Set Value in Cache

Stores a value in the cache with a given key and an optional expiration time. The input is converted to a binary buffer before storage, making it suitable for both text strings and binary files (PDFs, Images, etc.).

**Endpoint:** `/cache-set`

**Method:** `POST`

**Content-Type:** `multipart/form-data` (Recommended for files) or `application/json`

**Parameters:**

- `key` (string): The unique key for the cache entry.
- `value` (file/string): The value to store. If a file is uploaded, its binary content is stored. If a string is provided, it is converted to a buffer.
- `expire` (optional - integer): The expiration time in seconds.

**Response:**

```json
{
    "success": true
}
```

**Example (Node.js - Storing a File):**

```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('key', 'my-file-key');
// You can append a file stream or a simple string
form.append('value', fs.createReadStream('./document.pdf'));
form.append('expire', '3600'); // Expire in 1 hour

const response = await fetch('http://localhost:5001/cache-set', {
    method: 'POST',
    body: form
});
const result = await response.json();
console.log('Set cache success:', result.success);
```

---

### Get Value from Cache

Retrieves a value from the cache using its key. The server automatically deserializes the stored data and returns it as a binary stream.

**Endpoint:** `/cache-get`

**Method:** `POST`

**Content-Type:** `application/json`

**Parameters:**

- `key` (string): The key of the cache entry to retrieve.

**Response:**

- **Found (HTTP 200):** Returns the raw binary data. `Content-Type` will be `application/octet-stream`.
- **Not Found (HTTP 404):** Returns a JSON error message. `Content-Type` will be `application/json`.

**Example (Node.js):**

```javascript
const response = await fetch('http://localhost:5001/cache-get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'my-file-key' })
});

if (response.ok) {
    // HTTP 200: We got the binary data back
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Example: Write the buffer back to a file
    require('fs').writeFileSync('./retrieved-document.pdf', buffer);
    console.log('File retrieved from cache');
} else if (response.status === 404) {
    // HTTP 404: Key not found
    console.log('Cache miss: Key not found');
} else {
    // Other errors
    console.error('Error:', response.status);
}
```

---

### Clear Value from Cache

Removes a value from the cache using its key.

**Endpoint:** `/cache-delete-key`

**Method:** `POST`

**Content-Type:** `application/json`

**Parameters:**

- `key` (string): The key of the cache entry to remove.

**Response:**

```json
{
    "success": true,
    "deleted": true
}
```

- `deleted`: `true` if the key existed and was removed, `false` if the key did not exist.

**Example (Node.js):**

```javascript
const response = await fetch('http://localhost:5001/cache-delete-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'my-file-key' })
});
const result = await response.json();
console.log('Success:', result.success, 'Was deleted:', result.deleted);
```

---

### Clear All Values from Cache

Removes **all** values from the cache. Use with caution, as this will delete all files in the cache directory.

**Endpoint:** `/cache-delete-all`

**Method:** `POST`

**Content-Type:** `application/json`

**Parameters:**

None

**Response:**

```json
{
    "success": true
}
```

**Example (Node.js):**

```javascript
const response = await fetch('http://localhost:5001/cache-delete-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
});
const result = await response.json();
console.log('Cache clear all success:', result.success);
```
