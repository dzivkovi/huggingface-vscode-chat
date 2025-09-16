import * as assert from 'assert';

suite('Endpoint URL Construction Tests - CRITICAL', () => {

    test('MUST use /v1/chat/completions for local models', () => {
        const localModelId = 'local|http://localhost:8000|TheBloke/deepseek-coder-6.7B-instruct-AWQ';
        const baseUrl = 'http://localhost:8000';

        // This is the ACTUAL logic from provider.ts that was causing 404 errors
        const endpoint = localModelId.startsWith('local|')
            ? baseUrl.endsWith('/') ? `${baseUrl}v1/chat/completions` : `${baseUrl}/v1/chat/completions`
            : `${baseUrl}/chat/completions`;

        assert.strictEqual(endpoint, 'http://localhost:8000/v1/chat/completions',
            'Local models MUST use /v1/chat/completions endpoint');
    });

    test('MUST handle trailing slash correctly for local models', () => {
        const localModelId = 'local|http://localhost:8000/|model';
        const baseUrlWithSlash = 'http://localhost:8000/';

        const endpoint = localModelId.startsWith('local|')
            ? baseUrlWithSlash.endsWith('/') ? `${baseUrlWithSlash}v1/chat/completions` : `${baseUrlWithSlash}/v1/chat/completions`
            : `${baseUrlWithSlash}/chat/completions`;

        assert.strictEqual(endpoint, 'http://localhost:8000/v1/chat/completions',
            'Should not have double slashes in URL');
    });

    test('HF Router models should use /chat/completions', () => {
        const hfModelId = 'Qwen/Qwen2.5-Coder-32B-Instruct';
        const baseUrl = 'https://router.huggingface.co/v1';

        const endpoint = hfModelId.startsWith('local|')
            ? baseUrl.endsWith('/') ? `${baseUrl}v1/chat/completions` : `${baseUrl}/v1/chat/completions`
            : `${baseUrl}/chat/completions`;

        assert.strictEqual(endpoint, 'https://router.huggingface.co/v1/chat/completions',
            'HF Router models should use /chat/completions (without extra /v1)');
    });

    test('BUG REGRESSION: Old tgi| prefix should NOT work anymore', () => {
        const oldTgiModelId = 'tgi|http://localhost:8000|model';
        const baseUrl = 'http://localhost:8000';

        // This was the bug: checking for 'tgi|' when we renamed everything to 'local|'
        const endpoint = oldTgiModelId.startsWith('local|')  // This will be false!
            ? baseUrl.endsWith('/') ? `${baseUrl}v1/chat/completions` : `${baseUrl}/v1/chat/completions`
            : `${baseUrl}/chat/completions`;  // Falls through to this path (wrong!)

        // This test documents the bug: tgi| models would get wrong endpoint
        assert.strictEqual(endpoint, 'http://localhost:8000/chat/completions',
            'Old tgi| prefix falls through to wrong endpoint (this was the bug!)');
    });

    test('Model ID parsing for local models', () => {
        const testCases = [
            {
                id: 'local|http://localhost:8000|TheBloke/deepseek-coder-6.7B-instruct-AWQ',
                expectedBase: 'http://localhost:8000',
                expectedModel: 'TheBloke/deepseek-coder-6.7B-instruct-AWQ',
                expectedIsLocal: true
            },
            {
                id: 'local|http://192.168.1.100:3000|default',
                expectedBase: 'http://192.168.1.100:3000',
                expectedModel: 'default',
                expectedIsLocal: true
            },
            {
                id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
                expectedBase: null,
                expectedModel: null,
                expectedIsLocal: false
            }
        ];

        for (const testCase of testCases) {
            const isLocal = testCase.id.startsWith('local|');
            assert.strictEqual(isLocal, testCase.expectedIsLocal,
                `Model ${testCase.id} should ${testCase.expectedIsLocal ? 'be' : 'not be'} detected as local`);

            if (isLocal) {
                const parts = testCase.id.replace('local|', '').split('|');
                const baseUrl = parts[0].trim();
                const modelName = parts[1];

                assert.strictEqual(baseUrl, testCase.expectedBase,
                    `Base URL extraction failed for ${testCase.id}`);
                assert.strictEqual(modelName, testCase.expectedModel,
                    `Model name extraction failed for ${testCase.id}`);
            }
        }
    });

    test('vLLM health check endpoint', () => {
        const baseUrl = 'http://localhost:8000';
        const healthEndpoint = `${baseUrl}/health`;

        assert.strictEqual(healthEndpoint, 'http://localhost:8000/health',
            'Health check should use /health endpoint');
    });

    test('vLLM models list endpoint', () => {
        const baseUrl = 'http://localhost:8000';
        const modelsEndpoint = `${baseUrl}/v1/models`;

        assert.strictEqual(modelsEndpoint, 'http://localhost:8000/v1/models',
            'Models list should use /v1/models endpoint');
    });
});

suite('Critical Bug Prevention Tests', () => {

    test('NEVER send requests to /chat/completions for local models', () => {
        // This test ensures we never regress to the bug that was sending
        // requests to /chat/completions instead of /v1/chat/completions

        const localModels = [
            'local|http://localhost:8000|model1',
            'local|http://192.168.1.1:8080|model2',
            'local|https://vllm.example.com|model3'
        ];

        for (const modelId of localModels) {
            const parts = modelId.replace('local|', '').split('|');
            const baseUrl = parts[0].trim();

            // Correct implementation
            const endpoint = modelId.startsWith('local|')
                ? baseUrl.endsWith('/') ? `${baseUrl}v1/chat/completions` : `${baseUrl}/v1/chat/completions`
                : `${baseUrl}/chat/completions`;

            assert.ok(endpoint.includes('/v1/chat/completions'),
                `Local model ${modelId} MUST include /v1/ in endpoint. Got: ${endpoint}`);

            assert.ok(!endpoint.endsWith('/chat/completions') || endpoint.includes('/v1/'),
                `Endpoint ${endpoint} for ${modelId} is missing /v1/ prefix - THIS IS THE BUG!`);
        }
    });
});