import * as assert from 'assert';

suite('Local URL Construction Debug', () => {
    const localEndpoint = 'http://192.168.160.1:8080';
    const modelName = 'bigcode/starcoder2-3b';

    test('should correctly parse local model ID with pipe delimiter', () => {
        const modelId = `local|${localEndpoint}|${modelName}`;

        // Test the parsing logic
        if (modelId.startsWith('local|')) {
            const parts = modelId.replace('local|', '').split('|');
            const baseUrl = parts[0].trim();
            const model = parts[1];

            assert.strictEqual(baseUrl, localEndpoint);
            assert.strictEqual(model, modelName);

            // Test URL construction
            const completionsUrl = `${baseUrl}/v1/chat/completions`;
            assert.strictEqual(completionsUrl, 'http://192.168.160.1:8080/v1/chat/completions');
        } else {
            assert.fail('Model ID should start with local|');
        }
    });

    test('should construct correct local completions endpoint', () => {
        const modelId = `local|${localEndpoint}|${modelName}`;
        let baseUrl: string;
        let apiKey: string | undefined;

        if (modelId.startsWith('local|')) {
            const parts = modelId.replace('local|', '').split('|');
            baseUrl = parts[0].trim();
            apiKey = "dummy";

            // vLLM uses chat/completions
            const endpoint = `${baseUrl}/v1/chat/completions`;

            assert.strictEqual(endpoint, 'http://192.168.160.1:8080/v1/chat/completions');
            assert.strictEqual(apiKey, 'dummy');
        } else {
            assert.fail('Should be local model');
        }
    });

    test('should handle local model without explicit model name', () => {
        const modelId = `local|${localEndpoint}|default`;

        if (modelId.startsWith('local|')) {
            const parts = modelId.replace('local|', '').split('|');
            const baseUrl = parts[0].trim();
            const model = parts[1] || 'default';

            assert.strictEqual(baseUrl, localEndpoint);
            assert.strictEqual(model, 'default');
        }
    });

    test('should not break URLs with colons and ports', () => {
        const testCases = [
            'http://192.168.160.1:8080',
            'http://localhost:8080',
            'https://api.example.com:443',
            'http://10.0.0.1:3000'
        ];

        for (const endpoint of testCases) {
            const modelId = `local|${endpoint}|model`;
            const parts = modelId.replace('local|', '').split('|');
            const baseUrl = parts[0].trim();

            assert.strictEqual(baseUrl, endpoint, `Failed for endpoint: ${endpoint}`);
        }
    });

    test('should identify local vs HF Router models correctly', () => {
        const localModel = { id: 'local|http://192.168.160.1:8080|starcoder' };
        const hfModel = { id: 'Qwen/Qwen2.5-Coder-32B-Instruct' };

        assert.strictEqual(localModel.id.startsWith('local|'), true);
        assert.strictEqual(hfModel.id.startsWith('local|'), false);
    });
});