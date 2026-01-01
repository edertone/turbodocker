const assert = require('assert');

async function makeRequest(path, data) {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`http://localhost:5001${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    const body = await response.json();
    return {




        statusCode: response.status,
        body
    };
}

describe('Text Cache API', function () {
    this.timeout(5000);

    const testKey = 'test-key';
    const testValue = 'Hello, Redis!';

    it('should set and get a text value from cache', async function () {
        // Set value
        const setResult = await makeRequest('/cache-text-set', { key: testKey, value: testValue });
        assert.strictEqual(setResult.statusCode, 200, 'Expected HTTP 200 for set');
        assert.deepStrictEqual(setResult.body, { success: true }, 'Expected success message for set');

        // Get value
        const getResult = await makeRequest('/cache-text-get', { key: testKey });
        assert.strictEqual(getResult.statusCode, 200, 'Expected HTTP 200 for get');
        assert.deepStrictEqual(getResult.body, { key: testKey, value: testValue }, 'Expected to get the set value back');
    });

    it('should clear an existing key from cache', async function () {
        // Set value first
        await makeRequest('/cache-text-set', { key: testKey, value: testValue });
        // Confirm key exists
        let getResult = await makeRequest('/cache-text-get', { key: testKey });
        assert.strictEqual(getResult.body.value, testValue, 'Expected value to be set before clear');
        // Clear the key
        const clearResult = await makeRequest('/cache-text-clear', { key: testKey });
        assert.strictEqual(clearResult.statusCode, 200, 'Expected HTTP 200 for clear');
        assert.deepStrictEqual(clearResult.body, { success: true, deleted: true }, 'Expected deleted: true for existing key');
        // Confirm key is gone
        getResult = await makeRequest('/cache-text-get', { key: testKey });
        assert.strictEqual(getResult.body.value, null, 'Expected value to be null after clear');
    });

    it('should return deleted: false for non-existent key', async function () {
        const clearResult = await makeRequest('/cache-text-clear', { key: 'non-existent-key-2' });
        assert.strictEqual(clearResult.statusCode, 200, 'Expected HTTP 200 for clear non-existent');
        assert.deepStrictEqual(clearResult.body, { success: true, deleted: false }, 'Expected deleted: false for non-existent key');
    });

    it('should return error if key is missing', async function () {
        const clearResult = await makeRequest('/cache-text-clear', {});
        assert.strictEqual(clearResult.statusCode, 400, 'Expected HTTP 400 for missing key');
        assert(clearResult.body.error && clearResult.body.error.includes('Missing'), 'Expected error message for missing key');
    });

    it('should return null for a non-existent key', async function () {
        const getResult = await makeRequest('/cache-text-get', { key: 'non-existent-key' });
        assert.strictEqual(getResult.statusCode, 200, 'Expected HTTP 200');
        assert.deepStrictEqual(getResult.body, { key: 'non-existent-key', value: null }, 'Expected null value for non-existent key');
    });

    it('should expire a key after the specified duration', async function () {
        const expiringKey = 'expiring-key';
        const expiringValue = 'This will disappear';
        const expireSeconds = 1;

        // Set value with expiration
        await makeRequest('/cache-text-set', { key: expiringKey, value: expiringValue, expire: expireSeconds });

        // Wait for the key to expire
        await new Promise(resolve => setTimeout(resolve, expireSeconds * 1000 + 100));

        // Try to get the expired value
        const getResult = await makeRequest('/cache-text-get', { key: expiringKey });
        assert.strictEqual(getResult.statusCode, 200, 'Expected HTTP 200');
        assert.deepStrictEqual(getResult.body, { key: expiringKey, value: null }, 'Expected value to be null after expiration');
    });

    it('should clear all keys from cache', async function () {
        // Set multiple keys
        await makeRequest('/cache-text-set', { key: 'key1', value: 'value1' });
        await makeRequest('/cache-text-set', { key: 'key2', value: 'value2' });
        await makeRequest('/cache-text-set', { key: 'key3', value: 'value3' });

        // Confirm keys exist
        let get1 = await makeRequest('/cache-text-get', { key: 'key1' });
        let get2 = await makeRequest('/cache-text-get', { key: 'key2' });
        let get3 = await makeRequest('/cache-text-get', { key: 'key3' });
        assert.strictEqual(get1.body.value, 'value1', 'Expected key1 to exist');
        assert.strictEqual(get2.body.value, 'value2', 'Expected key2 to exist');
        assert.strictEqual(get3.body.value, 'value3', 'Expected key3 to exist');

        // Clear all keys
        const clearAllResult = await makeRequest('/cache-text-clear-all', {});
        assert.strictEqual(clearAllResult.statusCode, 200, 'Expected HTTP 200 for clear all');
        assert.deepStrictEqual(clearAllResult.body, { success: true }, 'Expected success message for clear all');

        // Confirm all keys are gone
        get1 = await makeRequest('/cache-text-get', { key: 'key1' });
        get2 = await makeRequest('/cache-text-get', { key: 'key2' });
        get3 = await makeRequest('/cache-text-get', { key: 'key3' });
        assert.strictEqual(get1.body.value, null, 'Expected key1 to be cleared');
        assert.strictEqual(get2.body.value, null, 'Expected key2 to be cleared');
        assert.strictEqual(get3.body.value, null, 'Expected key3 to be cleared');
    });
});
