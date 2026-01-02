# File Tools Microservice

## Cache API endpoints documentation

The cache is implemented using a high-performance hybrid system: **SQLite** is used for metadata and TTL (Time-To-Live) management, while the actual data is stored as **flat files** on the disk. This architecture ensures low RAM usage (via streaming) and prevents locking issues during high concurrency. Also the file performance is very fast cause linux uses ram to cache most read files.

**Persistence:** The data is stored inside `/app/file-tools-cache`. To persist the cache between container restarts, ensure this directory is mounted as a volume.

## Index

- [/cache-set (Save a value to the cache)](#cache-set)
- [/cache-get (Obtain a value from the cache)](#cache-get)
- [/cache-delete-key (Delete a value from the cache)](#cache-delete-key)
- [/cache-prune (Manually clean expired values from the cache)](#cache-prune)
- [/cache-delete-all (Erase all data from the cache)](#cache-delete-all)

---

### /cache-set

Stores a value in the cache with a given key and an optional expiration time. The input is streamed directly to disk, making it highly efficient for large files (PDFs, Images) as well as text strings.

**Method:** `POST`

**Content-Type:** `multipart/form-data` (Recommended for files) or `application/json`

**Parameters:**

- `key` (string): The unique key for the cache entry.
- `value` (file/string): The value to store.
- `expire` (optional - integer): The expiration time in seconds. If omitted, the item does not expire automatically.

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

### /cache-get

Retrieves a value from the cache using its key. The server streams the file directly from the disk to the response, ensuring minimal memory usage on the server side.

**Method:** `POST`

**Content-Type:** `application/json`

**Parameters:**

- `key` (string): The key of the cache entry to retrieve.

**Response:**

- **Found (HTTP 200):** Returns the raw binary data as a stream. `Content-Type` will be `application/octet-stream`.
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
    // HTTP 404: Key not found or expired
    console.log('Cache miss: Key not found');
} else {
    // Other errors
    console.error('Error:', response.status);
}
```

---

### /cache-delete-key

Removes a specific value from the cache using its key. This deletes both the metadata record and the physical file from the disk.

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

### /cache-prune

Manually triggers the background cleanup process. This identifies items where the TTL has expired, removes them from the database, and deletes the associated files from the disk.

_Note: This process also runs automatically in the background every 2 hours._

**Method:** `POST`

**Content-Type:** `application/json` (Body is optional/ignored)

**Response:**

```json
{
    "success": true,
    "deleted": 5
}
```

- `deleted`: An integer representing the count of items that were removed.

**Example (Node.js):**

```javascript
const response = await fetch('http://localhost:5001/cache-prune', {
    method: 'POST'
});
const result = await response.json();
console.log('Prune complete. Items removed:', result.deleted);
```

---

### /cache-delete-all

Removes **all** values from the cache. Use with caution, as this will immediately wipe the database and delete all files in the cache directory.

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
