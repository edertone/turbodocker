# File Tools Microservice

## Cache API endpoints documentation

The cache is stored on the file system inside the Docker container, so it will persist as long as the container's volume is not destroyed. Volume can be mounted on host to persist the cached data.

---

### Set Value in Cache

Stores a value in the cache with a given key and an optional expiration time. This can be text or any binary data.

**Endpoint:** `/cache-set`

**Method:** `POST`

**Content-Type:** `multipart/form-data`

**Parameters:**

- `key` (string): The unique key for the cache entry.
- `value` (file/buffer): The value to store. This can be text or binary data.
- `expire` (optional - integer): The expiration time in seconds.

**Response:**

```json
{
    "success": true
}
```

**Example (Node.js):**

```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('key', 'my-key');
form.append('value', 'my-value'); // or fs.createReadStream('/path/to/file')
form.append('expire', '60');

const response = await fetch('http://localhost:5001/cache-set', {
    method: 'POST',
    body: form
});
const result = await response.json();
console.log('Set cache success:', result.success);
```

---

### Get Value from Cache

Retrieves a value from the cache using its key.

**Endpoint:** `/cache-get`

**Method:** `POST`

**Content-Type:** `application/json`

**Parameters:**

- `key` (string): The key of the cache entry to retrieve.

**Response:**

The raw value from the cache. The `Content-Type` will be `application/octet-stream`. If the key is not found, it returns a JSON object with a null value.

**Example (Node.js):**

```javascript
const response = await fetch('http://localhost:5001/cache-get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'my-key' })
});

if (response.headers.get('content-type').includes('application/json')) {
    const result = await response.json();
    console.log('Retrieved value:', result.value); // Likely null
} else {
    const result = await response.text(); // or .buffer() for binary data
    console.log('Retrieved value:', result);
}
```

---

### Clear Value from Cache

Removes a value from the cache using its key.

**Endpoint:** `/cache-clear`

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

If the `key` parameter is missing, returns HTTP 400 with an error message.

**Example (Node.js):**

```javascript
const response = await fetch('http://localhost:5001/cache-clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'my-key' })
});
const result = await response.json();
console.log('Cache clear success:', result.success, 'Deleted:', result.deleted);
```

---

### Clear All Values from Cache

Removes all values from the cache. **Use with caution!** This will delete all files in the cache directory.

**Endpoint:** `/cache-clear-all`

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
const response = await fetch('http://localhost:5001/cache-clear-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
});
const result = await response.json();
console.log('Cache clear all success:', result.success);
```
