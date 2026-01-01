const assert = require('assert');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'tests-out', 'test-cache');

function ensureOutDir() {
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }
}

async function makeRequest(path, data, isMultipart = false) {
    const fetch = (await import('node-fetch')).default;

    let body;
    const headers = {};

    if (isMultipart) {
        const form = new FormData();
        for (const key in data) {
            if (key === 'value' && typeof data[key] === 'object' && data[key].buffer) {
                form.append(key, data[key].buffer, data[key].options);
            } else {
                form.append(key, data[key]);
            }
        }
        body = form;
        Object.assign(headers, form.getHeaders());
    } else {
        body = JSON.stringify(data);
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`http://localhost:5001${path}`, {
        method: 'POST',
        headers,
        body
    });

    const contentType = response.headers.get('content-type');
    let responseBody;

    if (contentType && contentType.includes('application/json')) {
        responseBody = await response.json();
    } else {
        responseBody = Buffer.from(await response.arrayBuffer());
    }

    return {
        statusCode: response.status,
        body: responseBody,
        contentType
    };
}

describe('Cache API', function () {
    this.timeout(5000);

    const testKey = 'test-key';
    const testValue = 'Hello, World!';
    
    before(function () {
        ensureOutDir();
    });

    it('should set and get a value from cache', async function () {
        // Set value
        const setResult = await makeRequest('/cache-set', { key: testKey, value: testValue }, true);
        assert.strictEqual(setResult.statusCode, 200, 'Expected HTTP 200 for set');
        assert.deepStrictEqual(setResult.body, { success: true }, 'Expected success message for set');

        // Get value
        const getResult = await makeRequest('/cache-get', { key: testKey });
        assert.strictEqual(getResult.statusCode, 200, 'Expected HTTP 200 for get');
        assert.strictEqual(getResult.body.toString(), testValue, 'Expected to get the set value back');
    });

    it('should clear an existing key from cache', async function () {
        // Set value first
        await makeRequest('/cache-set', { key: testKey, value: testValue }, true);

        // Confirm key exists
        let getResult = await makeRequest('/cache-get', { key: testKey });
        assert.strictEqual(getResult.body.toString(), testValue, 'Expected value to be set before clear');

        // Clear the key
        const clearResult = await makeRequest('/cache-clear', { key: testKey });
        assert.strictEqual(clearResult.statusCode, 200, 'Expected HTTP 200 for clear');
        assert.deepStrictEqual(
            clearResult.body,
            { success: true, deleted: true },
            'Expected deleted: true for existing key'
        );

        // Confirm key is gone
        getResult = await makeRequest('/cache-get', { key: testKey });
        assert.deepStrictEqual(getResult.body, { key: testKey, value: null }, 'Expected value to be null after clear');
    });

    it('should return deleted: false for non-existent key', async function () {
        const clearResult = await makeRequest('/cache-clear', { key: 'non-existent-key-2' });
        assert.strictEqual(clearResult.statusCode, 200, 'Expected HTTP 200 for clear non-existent');
        assert.deepStrictEqual(
            clearResult.body,
            { success: true, deleted: false },
            'Expected deleted: false for non-existent key'
        );
    });

    it('should return error if key is missing for clear', async function () {
        const clearResult = await makeRequest('/cache-clear', {});
        assert.strictEqual(clearResult.statusCode, 400, 'Expected HTTP 400 for missing key');
        assert(
            clearResult.body.error && clearResult.body.error.includes('Missing'),
            'Expected error message for missing key'
        );
    });

    it('should return null for a non-existent key', async function () {
        const getResult = await makeRequest('/cache-get', { key: 'non-existent-key' });
        assert.strictEqual(getResult.statusCode, 200, 'Expected HTTP 200');
        assert.deepStrictEqual(
            getResult.body,
            { key: 'non-existent-key', value: null },
            'Expected null value for non-existent key'
        );
    });

    it('should expire a key after the specified duration', async function () {
        this.timeout(5000);
        const expiringKey = 'expiring-key';
        const expiringValue = 'This will disappear';
        const expireSeconds = 2;

        // Set value with expiration
        await makeRequest('/cache-set', { key: expiringKey, value: expiringValue, expire: expireSeconds }, true);

        // Wait for the key to expire
        await new Promise(resolve => setTimeout(resolve, expireSeconds * 1000 + 500));

        // Try to get the expired value
        const getResult = await makeRequest('/cache-get', { key: expiringKey });
        assert.strictEqual(getResult.statusCode, 200, 'Expected HTTP 200');
        assert.deepStrictEqual(
            getResult.body,
            { key: expiringKey, value: null },
            'Expected value to be null after expiration'
        );
    });

    it('should clear all keys from cache', async function () {
        // Set multiple keys
        await makeRequest('/cache-set', { key: 'key1', value: 'value1' }, true);
        await makeRequest('/cache-set', { key: 'key2', value: 'value2' }, true);
        await makeRequest('/cache-set', { key: 'key3', value: 'value3' }, true);

        // Clear all keys
        const clearAllResult = await makeRequest('/cache-clear-all', {});
        assert.strictEqual(clearAllResult.statusCode, 200, 'Expected HTTP 200 for clear all');
        assert.deepStrictEqual(clearAllResult.body, { success: true }, 'Expected success message for clear all');

        // Confirm all keys are gone
        let get1 = await makeRequest('/cache-get', { key: 'key1' });
        let get2 = await makeRequest('/cache-get', { key: 'key2' });
        let get3 = await makeRequest('/cache-get', { key: 'key3' });
        assert.deepStrictEqual(get1.body, { key: 'key1', value: null }, 'Expected key1 to be cleared');
        assert.deepStrictEqual(get2.body, { key: 'key2', value: null }, 'Expected key2 to be cleared');
        assert.deepStrictEqual(get3.body, { key: 'key3', value: null }, 'Expected key3 to be cleared');
    });

    it('should save and retrieve a PDF file from cache', async function () {
        const cacheKey = 'key1';
        const pdfPath = 'tests/resources/pdf-samples/sample30.pdf';

        // Create a stream for the PDF file
        const originalPdfBuffer = fs.readFileSync(pdfPath);

        const setResult = await makeRequest(
            '/cache-set',
            {
                key: cacheKey,
                value: {
                    buffer: originalPdfBuffer,
                    options: { filename: 'sample30.pdf', contentType: 'application/pdf' }
                }
            },
            true
        );

        assert.strictEqual(setResult.statusCode, 200, 'Expected HTTP 200 for set');

        // Retrieve the PDF file from cache
        const getResult = await makeRequest('/cache-get', { key: cacheKey });
        assert.strictEqual(getResult.statusCode, 200, 'Expected HTTP 200 for get');

        fs.writeFileSync(path.join(OUT_DIR, 'sample30.pdf'), getResult.body);

        // Compare the retrieved buffer with the original file
        assert.ok(getResult.body instanceof Buffer, 'Expected the retrieved value to be a Buffer');
        assert.strictEqual(
            Buffer.compare(originalPdfBuffer, getResult.body),
            0,
            'The retrieved PDF file does not match the original'
        );

        // Clear the key
        const clearResult = await makeRequest('/cache-clear', { key: cacheKey });
        assert.strictEqual(clearResult.statusCode, 200, 'Expected HTTP 200 for clear');
        assert.deepStrictEqual(
            clearResult.body,
            { success: true, deleted: true },
            'Expected deleted: true for existing key'
        );

        // Confirm key is gone
        const getResult2 = await makeRequest('/cache-get', { key: cacheKey });
        assert.deepStrictEqual(getResult2.body, { key: cacheKey, value: null }, 'Expected value to be null after clear');
    });
});
