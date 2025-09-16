import * as assert from 'assert';

suite('Local Integration Tests', () => {
    const localEndpoint = 'http://192.168.160.1:8080';
    const modelName = 'TheBloke/deepseek-coder-6.7B-instruct-AWQ';

    test('Full local request flow simulation', () => {
        // Simulate the full model ID and request flow
        const model = {
            id: `local|${localEndpoint}|${modelName}`,
            family: 'local',
            version: '1.0.0',
            vendor: 'vllm'
        };

        // Step 1: Check if it's a local model
        const isLocal = model.id.startsWith('local|');
        assert.strictEqual(isLocal, true, 'Should identify as local model');

        // Step 2: Parse endpoint and model from ID
        let baseUrl = 'https://router.huggingface.co/v1';
        let apiKey: string | undefined;

        if (model.id.startsWith('local|')) {
            const parts = model.id.replace('local|', '').split('|');
            baseUrl = parts[0].trim();
            apiKey = "dummy";

            assert.strictEqual(baseUrl, localEndpoint, 'Should extract correct endpoint');
            assert.strictEqual(parts[1], modelName, 'Should extract correct model name');
        }

        // Step 3: Construct the correct endpoint URL for vLLM
        const endpoint = model.id.startsWith('local|')
            ? baseUrl.endsWith('/') ? `${baseUrl}v1/chat/completions` : `${baseUrl}/v1/chat/completions`
            : `${baseUrl}/chat/completions`;

        assert.strictEqual(endpoint, 'http://192.168.160.1:8080/v1/chat/completions',
            'Should construct correct chat/completions endpoint for vLLM');

        // Step 4: Build request body for vLLM
        const messages = [
            { role: 'user' as const, content: 'Test message' }
        ];

        const requestBody: Record<string, unknown> = {
            messages: messages,
            stream: true,
            max_tokens: 100
        };

        if (model.id.startsWith('local|')) {
            // Extract model name correctly for vLLM
            const extractedModel = model.id.split('|')[2] || modelName;
            requestBody.model = extractedModel === "default" ? modelName : extractedModel;

            assert.strictEqual(requestBody.messages, messages, 'Should keep messages for vLLM');
            assert.strictEqual(requestBody.model, modelName, 'Should set correct model name');
        }

        // Step 5: Verify headers
        const headers = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": "test-agent"
        };

        assert.strictEqual(headers.Authorization, 'Bearer dummy', 'Should use dummy API key for local inference');
    });

    test('Local model with default name', () => {
        const model = {
            id: `local|${localEndpoint}|default`
        };

        if (model.id.startsWith('local|')) {
            const modelName = model.id.split('|')[2] || "TheBloke/deepseek-coder-6.7B-instruct-AWQ";
            const finalModel = modelName === "default" ? "TheBloke/deepseek-coder-6.7B-instruct-AWQ" : modelName;

            assert.strictEqual(finalModel, "TheBloke/deepseek-coder-6.7B-instruct-AWQ",
                'Should use default model name when "default" is specified');
        }
    });

    test('Edge cases for local endpoint URLs', () => {
        const testCases = [
            { endpoint: 'http://192.168.160.1:8080', expected: 'http://192.168.160.1:8080/v1/chat/completions' },
            { endpoint: 'http://192.168.160.1:8080/', expected: 'http://192.168.160.1:8080/v1/chat/completions' },
            { endpoint: 'http://localhost:3000', expected: 'http://localhost:3000/v1/chat/completions' },
            { endpoint: 'https://api.example.com:443', expected: 'https://api.example.com:443/v1/chat/completions' }
        ];

        for (const { endpoint, expected } of testCases) {
            const result = endpoint.endsWith('/')
                ? `${endpoint}v1/chat/completions`
                : `${endpoint}/v1/chat/completions`;

            assert.strictEqual(result, expected,
                `Failed for endpoint: ${endpoint}`);
        }
    });
});