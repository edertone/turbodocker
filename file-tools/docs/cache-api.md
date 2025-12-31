# File Tools Microservice

## Cache API endpoints documentation

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
