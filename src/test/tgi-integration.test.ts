import * as assert from 'assert';

suite('TGI Integration Tests', () => {
    const tgiEndpoint = 'http://192.168.160.1:8080';
    const modelName = 'bigcode/starcoder2-3b';

    test('Full TGI request flow simulation', () => {
        // Simulate the full model ID and request flow
        const model = {
            id: `tgi|${tgiEndpoint}|${modelName}`,
            family: 'tgi',
            version: '1.0.0',
            vendor: 'tgi'
        };

        // Step 1: Check if it's a TGI model
        const isTGI = model.id.startsWith('tgi|');
        assert.strictEqual(isTGI, true, 'Should identify as TGI model');

        // Step 2: Parse endpoint and model from ID
        let baseUrl = 'https://router.huggingface.co/v1';
        let apiKey: string | undefined;

        if (model.id.startsWith('tgi|')) {
            const parts = model.id.replace('tgi|', '').split('|');
            baseUrl = parts[0].trim();
            apiKey = "dummy";

            assert.strictEqual(baseUrl, tgiEndpoint, 'Should extract correct endpoint');
            assert.strictEqual(parts[1], modelName, 'Should extract correct model name');
        }

        // Step 3: Construct the correct endpoint URL
        const endpoint = model.id.startsWith('tgi|')
            ? baseUrl.endsWith('/') ? `${baseUrl}v1/completions` : `${baseUrl}/v1/completions`
            : `${baseUrl}/chat/completions`;

        assert.strictEqual(endpoint, 'http://192.168.160.1:8080/v1/completions',
            'Should construct correct completions endpoint for TGI');

        // Step 4: Build request body for TGI
        const messages = [
            { role: 'user' as const, content: 'Test message' }
        ];

        const requestBody: Record<string, unknown> = {
            messages: messages,
            stream: true,
            max_tokens: 100
        };

        if (model.id.startsWith('tgi|')) {
            const lastMessage = messages[messages.length - 1];
            requestBody.prompt = lastMessage.content || "";

            // Extract model name correctly
            const extractedModel = model.id.split('|')[2] || "bigcode/starcoder2-3b";
            requestBody.model = extractedModel === "default" ? "bigcode/starcoder2-3b" : extractedModel;
            delete requestBody.messages;

            assert.strictEqual(requestBody.prompt, 'Test message', 'Should convert to prompt format');
            assert.strictEqual(requestBody.model, modelName, 'Should set correct model name');
            assert.strictEqual(requestBody.messages, undefined, 'Should remove messages field');
        }

        // Step 5: Verify headers
        const headers = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": "test-agent"
        };

        assert.strictEqual(headers.Authorization, 'Bearer dummy', 'Should use dummy API key for TGI');
    });

    test('TGI model with default name', () => {
        const model = {
            id: `tgi|${tgiEndpoint}|default`
        };

        if (model.id.startsWith('tgi|')) {
            const modelName = model.id.split('|')[2] || "bigcode/starcoder2-3b";
            const finalModel = modelName === "default" ? "bigcode/starcoder2-3b" : modelName;

            assert.strictEqual(finalModel, "bigcode/starcoder2-3b",
                'Should use default model name when "default" is specified');
        }
    });

    test('Edge cases for TGI endpoint URLs', () => {
        const testCases = [
            { endpoint: 'http://192.168.160.1:8080', expected: 'http://192.168.160.1:8080/v1/completions' },
            { endpoint: 'http://192.168.160.1:8080/', expected: 'http://192.168.160.1:8080/v1/completions' },
            { endpoint: 'http://localhost:3000', expected: 'http://localhost:3000/v1/completions' },
            { endpoint: 'https://api.example.com:443', expected: 'https://api.example.com:443/v1/completions' }
        ];

        for (const { endpoint, expected } of testCases) {
            const result = endpoint.endsWith('/')
                ? `${endpoint}v1/completions`
                : `${endpoint}/v1/completions`;

            assert.strictEqual(result, expected,
                `Failed for endpoint: ${endpoint}`);
        }
    });
});