# File Tools Microservice

## Cache API endpoints documentation

Text cache is stored using Redis, all in RAM, so we need to verify the appropiate settings.

---

### Set Text in Cache

Stores a text value in the cache with a given key and an optional expiration time.

**Endpoint:** `/cache-text-set`

**Method:** `POST`

**Content-Type:** `application/json`

**Parameters:**

- `key` (string): The unique key for the cache entry.
- `value` (string): The text value to store.
- `expire` (optional - integer): The expiration time in seconds.

**Response:**

```json
{
    "success": true
}
```

**Example (Node.js):**

```javascript
const response = await fetch('http://localhost:5001/cache-text-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        key: 'my-key',
        value: 'my-value',
        expire: 60
    })
});
const result = await response.json();
console.log('Set cache success:', result.success);
```

---

### Get Text from Cache

Retrieves a text value from the cache using its key.

**Endpoint:** `/cache-text-get`

**Method:** `POST`

**Content-Type:** `application/json`

**Parameters:**

- `key` (string): The key of the cache entry to retrieve.

**Response:**

```json
{
    "key": "my-key",
    "value": "my-value"
}
```

**Example (Node.js):**

```javascript
const response = await fetch('http://localhost:5001/cache-text-get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'my-key' })
});
const result = await response.json();
console.log('Retrieved value:', result.value);
```

---

### Clear Text from Cache

Removes a text value from the cache using its key.

**Endpoint:** `/cache-text-clear`

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
const response = await fetch('http://localhost:5001/cache-text-clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'my-key' })
});
const result = await response.json();
console.log('Cache clear success:', result.success, 'Deleted:', result.deleted);
```

---

### Clear All Text from Cache

Removes all text values from the cache. **Use with caution!** This will delete all keys in the Redis database used by this service.

**Endpoint:** `/cache-text-clear-all`

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
const response = await fetch('http://localhost:5001/cache-text-clear-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
});
const result = await response.json();
console.log('Cache clear all success:', result.success);
```
