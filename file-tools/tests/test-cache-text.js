const http = require('http');
const assert = require('assert');

function makeRequest(path, data) {
    return new Promise((resolve, reject) => {
        const jsonData = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 5001,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonData)
            }
        };

        const req = http.request(options, res => {
            let body = '';
            res.on('data', chunk => (body += chunk));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: JSON.parse(body)
                });
            });
        });

        req.on('error', e => reject(e));
        req.write(jsonData);
        req.end();
    });
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
});
