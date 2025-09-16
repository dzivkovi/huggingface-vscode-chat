import * as assert from 'assert';

suite('TGI URL Construction Debug', () => {
    const tgiEndpoint = 'http://192.168.160.1:8080';
    const modelName = 'bigcode/starcoder2-3b';

    test('should correctly parse TGI model ID with pipe delimiter', () => {
        const modelId = `tgi|${tgiEndpoint}|${modelName}`;

        // Test the parsing logic
        if (modelId.startsWith('tgi|')) {
            const parts = modelId.replace('tgi|', '').split('|');
            const baseUrl = parts[0].trim();
            const model = parts[1];

            assert.strictEqual(baseUrl, tgiEndpoint);
            assert.strictEqual(model, modelName);

            // Test URL construction
            const completionsUrl = `${baseUrl}/v1/completions`;
            assert.strictEqual(completionsUrl, 'http://192.168.160.1:8080/v1/completions');
        } else {
            assert.fail('Model ID should start with tgi|');
        }
    });

    test('should construct correct TGI completions endpoint', () => {
        const modelId = `tgi|${tgiEndpoint}|${modelName}`;
        let baseUrl: string;
        let apiKey: string | undefined;

        if (modelId.startsWith('tgi|')) {
            const parts = modelId.replace('tgi|', '').split('|');
            baseUrl = parts[0].trim();
            apiKey = "dummy";

            // TGI uses completions, not chat/completions
            const endpoint = `${baseUrl}/v1/completions`;

            assert.strictEqual(endpoint, 'http://192.168.160.1:8080/v1/completions');
            assert.strictEqual(apiKey, 'dummy');
        } else {
            assert.fail('Should be TGI model');
        }
    });

    test('should handle TGI model without explicit model name', () => {
        const modelId = `tgi|${tgiEndpoint}|default`;

        if (modelId.startsWith('tgi|')) {
            const parts = modelId.replace('tgi|', '').split('|');
            const baseUrl = parts[0].trim();
            const model = parts[1] || 'default';

            assert.strictEqual(baseUrl, tgiEndpoint);
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
            const modelId = `tgi|${endpoint}|model`;
            const parts = modelId.replace('tgi|', '').split('|');
            const baseUrl = parts[0].trim();

            assert.strictEqual(baseUrl, endpoint, `Failed for endpoint: ${endpoint}`);
        }
    });

    test('should identify TGI vs HF Router models correctly', () => {
        const tgiModel = { id: 'tgi|http://192.168.160.1:8080|starcoder' };
        const hfModel = { id: 'Qwen/Qwen2.5-Coder-32B-Instruct' };

        assert.strictEqual(tgiModel.id.startsWith('tgi|'), true);
        assert.strictEqual(hfModel.id.startsWith('tgi|'), false);
    });
});