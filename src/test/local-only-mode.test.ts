/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as assert from "assert";
import * as vscode from "vscode";
import { HuggingFaceChatModelProvider } from "../provider";
import * as packageJson from "../../package.json";

/**
 * Tests for local-only mode operation without HuggingFace API key requirement.
 * Issue #3: Support local inference without HuggingFace API key requirement
 */
suite("Local-Only Mode Without HF Key", () => {
	// Get default endpoint from package.json
	const defaultLocalEndpoint = packageJson.contributes.configuration.properties["huggingface.localEndpoint"].default;
	const localEndpointHost = new URL(defaultLocalEndpoint).host;

	/**
	 * Mock SecretStorage that simulates no API key stored
	 */
	const mockSecretStorageNoKey: vscode.SecretStorage = {
		get: async (key: string) => {
			// Simulate no HF API key stored
			if (key === "huggingface.apiKey") {
				return undefined;
			}
			return undefined;
		},
		store: async () => {},
		delete: async () => {},
		onDidChange: (_listener: unknown) => ({ dispose() {} }),
	} as unknown as vscode.SecretStorage;

	/**
	 * Mock SecretStorage with API key
	 */
	const mockSecretStorageWithKey: vscode.SecretStorage = {
		get: async (key: string) => {
			if (key === "huggingface.apiKey") {
				return "test-api-key";
			}
			return undefined;
		},
		store: async () => {},
		delete: async () => {},
		onDidChange: (_listener: unknown) => ({ dispose() {} }),
	} as unknown as vscode.SecretStorage;

	// Save original workspace configuration
	let originalGetConfiguration: typeof vscode.workspace.getConfiguration;
	let originalFetch: typeof global.fetch;

	setup(() => {
		// Save original functions
		originalGetConfiguration = vscode.workspace.getConfiguration;
		originalFetch = global.fetch;
	});

	teardown(() => {
		// Restore original functions
		vscode.workspace.getConfiguration = originalGetConfiguration;
		global.fetch = originalFetch;
	});

	test("Local-only mode: Should return local models WITHOUT prompting for HF API key", async () => {
		// Mock configuration to simulate local endpoint configured
		(vscode.workspace as any).getConfiguration = (section: string) => {
			if (section === "huggingface") {
				return {
					get: (key: string) => {
						if (key === "localEndpoint") {
							return defaultLocalEndpoint;
						}
						return undefined;
					}
				};
			}
			return originalGetConfiguration(section);
		};

		// Mock fetch to simulate local server response
		(global as any).fetch = async (url: string) => {
			if (url.includes(localEndpointHost)) {
				if (url.endsWith("/v1/models")) {
					return {
						ok: true,
						json: async () => ({
							data: [
								{
									id: "deepseek-coder-6.7b-instruct",
									max_model_len: 4096,
									owned_by: "local",
									created: Date.now()
								}
							]
						})
					} as Response;
				}
			}
			// Should NOT call HF Router when in local mode
			if (url.includes("router.huggingface.co")) {
				throw new Error("Should not call HF Router in local-only mode!");
			}
			return { ok: false } as Response;
		};

		const provider = new HuggingFaceChatModelProvider(mockSecretStorageNoKey, "test-ua");

		// Call with silent:true to ensure no prompts
		const infos = await provider.prepareLanguageModelChatInformation(
			{ silent: true },
			new vscode.CancellationTokenSource().token
		);

		// Assertions
		assert.ok(Array.isArray(infos), "Should return array of models");
		assert.ok(infos.length > 0, "Should have at least one local model");
		assert.ok(infos[0].id.startsWith("local|"), "Model ID should indicate local");
		assert.ok(infos[0].name.includes(localEndpointHost.split(':')[0]), "Model name should reference local server");
	});

	test("Local-only mode: Should work even with silent:false (no prompts)", async () => {
		// Mock configuration for local endpoint
		(vscode.workspace as any).getConfiguration = (section: string) => {
			if (section === "huggingface") {
				return {
					get: (key: string) => {
						if (key === "localEndpoint") {
							return defaultLocalEndpoint;
						}
						return undefined;
					}
				};
			}
			return originalGetConfiguration(section);
		};

		// Mock fetch for local server
		(global as any).fetch = async (url: string) => {
			if (url.includes(localEndpointHost)) {
				if (url.endsWith("/v1/models")) {
					return {
						ok: true,
						json: async () => ({
							data: [
								{
									id: "deepseek-coder-6.7b-instruct",
									max_model_len: 4096,
									owned_by: "local",
									created: Date.now()
								}
							]
						})
					} as Response;
				}
			}
			return { ok: false } as Response;
		};

		// Track if showInputBox is called (it shouldn't be)
		let promptShown = false;
		const originalShowInputBox = vscode.window.showInputBox;
		(vscode.window as any).showInputBox = async () => {
			promptShown = true;
			return undefined;
		};

		try {
			const provider = new HuggingFaceChatModelProvider(mockSecretStorageNoKey, "test-ua");

			// Call with silent:false - should still not prompt in local mode
			const infos = await provider.prepareLanguageModelChatInformation(
				{ silent: false },
				new vscode.CancellationTokenSource().token
			);

			assert.ok(Array.isArray(infos), "Should return array");
			assert.ok(infos.length > 0, "Should have local models");
			// When silent:false, it WILL prompt for HF key (to get cloud models too)
			// But local models are still returned even without the key
			assert.equal(promptShown, true, "Should show API key prompt when silent:false");
		} finally {
			vscode.window.showInputBox = originalShowInputBox;
		}
	});

	test("Cloud mode: Should return empty array when no API key and no local endpoint", async () => {
		// Mock configuration with NO local endpoint
		(vscode.workspace as any).getConfiguration = (section: string) => {
			if (section === "huggingface") {
				return {
					get: (key: string) => {
						if (key === "localEndpoint") {
							return undefined; // No local endpoint
						}
						return undefined;
					}
				};
			}
			return originalGetConfiguration(section);
		};

		const provider = new HuggingFaceChatModelProvider(mockSecretStorageNoKey, "test-ua");

		// Call with silent:true (no prompts)
		const infos = await provider.prepareLanguageModelChatInformation(
			{ silent: true },
			new vscode.CancellationTokenSource().token
		);

		// Should return empty array when no API key and no local endpoint
		assert.ok(Array.isArray(infos), "Should return array");
		assert.equal(infos.length, 0, "Should be empty when no API key and no local endpoint");
	});

	test("Cloud mode: Should fetch HF models when API key exists and no local endpoint", async () => {
		// Mock configuration with NO local endpoint
		(vscode.workspace as any).getConfiguration = (section: string) => {
			if (section === "huggingface") {
				return {
					get: (key: string) => {
						if (key === "localEndpoint") {
							return undefined; // No local endpoint
						}
						return undefined;
					}
				};
			}
			return originalGetConfiguration(section);
		};

		// Mock fetch for HF Router
		(global as any).fetch = async (url: string) => {
			if (url.includes("router.huggingface.co/v1/models")) {
				return {
					ok: true,
					json: async () => ({
						data: [
							{
								id: "meta-llama/Llama-2-7b-hf",
								providers: [
									{
										provider: "huggingface",
										supports_tools: true,
										context_length: 4096
									}
								]
							}
						]
					})
				} as Response;
			}
			return { ok: false } as Response;
		};

		const provider = new HuggingFaceChatModelProvider(mockSecretStorageWithKey, "test-ua");

		const infos = await provider.prepareLanguageModelChatInformation(
			{ silent: true },
			new vscode.CancellationTokenSource().token
		);

		assert.ok(Array.isArray(infos), "Should return array");
		assert.ok(infos.length > 0, "Should have HF models");
		assert.ok(!infos[0].id.startsWith("local|"), "Should not be local models");
	});

	test("Local model requests should work without HF API key", async () => {
		// Mock configuration for local endpoint
		(vscode.workspace as any).getConfiguration = (section: string) => {
			if (section === "huggingface") {
				return {
					get: (key: string) => {
						if (key === "localEndpoint") {
							return defaultLocalEndpoint;
						}
						return undefined;
					}
				};
			}
			return originalGetConfiguration(section);
		};

		// Track fetch calls
		let localEndpointCalled = false;
		let hfRouterCalled = false;

		// Mock fetch
		(global as any).fetch = async (url: string, options?: any) => {
			console.log("Test fetch called with URL:", url);
			if (url.includes(localEndpointHost)) {
				localEndpointCalled = true;
				// Add health check mock
				if (url.includes("/health")) {
					return { ok: true } as Response;
				}
				if (url.endsWith("/v1/chat/completions")) {
					// Simulate streaming response
					const encoder = new TextEncoder();
					const stream = new ReadableStream({
						start(controller) {
							controller.enqueue(encoder.encode("data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\n"));
							controller.enqueue(encoder.encode("data: [DONE]\n\n"));
							controller.close();
						}
					});
					return {
						ok: true,
						body: stream
					} as Response;
				}
			}
			if (url.includes("router.huggingface.co")) {
				hfRouterCalled = true;
				throw new Error("Should not call HF Router for local models!");
			}
			return { ok: false } as Response;
		};

		const provider = new HuggingFaceChatModelProvider(mockSecretStorageNoKey, "test-ua");

		// Create a local model info
		const localModel: vscode.LanguageModelChatInformation = {
			id: `local|${defaultLocalEndpoint}|test-model`,
			name: `Test Model @ ${localEndpointHost}`,
			family: "huggingface",
			version: "1.0.0",
			maxInputTokens: 2048,
			maxOutputTokens: 512,
			capabilities: {}
		};

		const messages: vscode.LanguageModelChatMessage[] = [
			{
				role: vscode.LanguageModelChatMessageRole.User,
				content: [new vscode.LanguageModelTextPart("Hello")],
				name: undefined
			}
		];

		let responseReceived = false;
		const progress = {
			report: (part: any) => {
				responseReceived = true;
			}
		};

		// Should not throw even without API key
		await provider.provideLanguageModelChatResponse(
			localModel,
			messages,
			{} as vscode.LanguageModelChatRequestHandleOptions,
			progress,
			new vscode.CancellationTokenSource().token
		);

		assert.ok(localEndpointCalled, "Should call local endpoint");
		assert.ok(!hfRouterCalled, "Should NOT call HF Router");
		assert.ok(responseReceived, "Should receive response from local model");
	});

	test("Mode switching: Local to Cloud when endpoint removed", async () => {
		let hasLocalEndpoint = true;

		// Mock configuration that can switch
		(vscode.workspace as any).getConfiguration = (section: string) => {
			if (section === "huggingface") {
				return {
					get: (key: string) => {
						if (key === "localEndpoint") {
							return hasLocalEndpoint ? defaultLocalEndpoint : undefined;
						}
						return undefined;
					}
				};
			}
			return originalGetConfiguration(section);
		};

		// Mock fetch
		(global as any).fetch = async (url: string) => {
			if (url.includes(localEndpointHost) && hasLocalEndpoint) {
				if (url.endsWith("/v1/models")) {
					return {
						ok: true,
						json: async () => ({
							data: [{ id: "local-model", max_model_len: 4096 }]
						})
					} as Response;
				}
			}
			if (url.includes("router.huggingface.co") && !hasLocalEndpoint) {
				return {
					ok: true,
					json: async () => ({
						data: [{
							id: "cloud-model",
							providers: [{ provider: "hf", supports_tools: true }]
						}]
					})
				} as Response;
			}
			return { ok: false } as Response;
		};

		// Test local mode first
		let provider = new HuggingFaceChatModelProvider(mockSecretStorageNoKey, "test-ua");
		let infos = await provider.prepareLanguageModelChatInformation(
			{ silent: true },
			new vscode.CancellationTokenSource().token
		);

		assert.ok(infos.length > 0, "Should have local models");
		assert.ok(infos[0].id.startsWith("local|"), "Should be local model");

		// Switch to cloud mode (remove endpoint, add key)
		hasLocalEndpoint = false;
		provider = new HuggingFaceChatModelProvider(mockSecretStorageWithKey, "test-ua");
		infos = await provider.prepareLanguageModelChatInformation(
			{ silent: true },
			new vscode.CancellationTokenSource().token
		);

		assert.ok(infos.length > 0, "Should have cloud models");
		assert.ok(!infos[0].id.startsWith("local|"), "Should be cloud model");
	});

	test("Hybrid mode: Both local and HF models should be available when both are configured", async () => {
		// Mock configuration with local endpoint
		(vscode.workspace as any).getConfiguration = (section: string) => {
			if (section === "huggingface") {
				return {
					get: (key: string) => {
						if (key === "localEndpoint") {
							return defaultLocalEndpoint;
						}
						return undefined;
					}
				};
			}
			return { get: () => undefined };
		};

		// Mock fetch to return both local and HF models
		global.fetch = async (url: string | URL | Request) => {
			const urlStr = url.toString();
			if (urlStr.includes("${new URL(defaultLocalEndpoint).host}/v1/models")) {
				return {
					ok: true,
					json: async () => ({
						data: [
							{ id: "local-model-1", max_model_len: 2048 },
						],
					}),
				} as any;
			}
			if (urlStr.includes("router.huggingface.co")) {
				return {
					ok: true,
					json: async () => ({
						data: [  // Changed from 'models' to 'data' to match actual API structure
							{
								id: "meta-llama/Meta-Llama-3.1-405B-Instruct",
								providers: [{ provider: "provider1", supports_tools: true, context_length: 16000 }],
							},
						],
					}),
				} as any;
			}
			return { ok: false } as any;
		};

		const provider = new HuggingFaceChatModelProvider(mockSecretStorageWithKey, "test-agent");
		const models = await provider.prepareLanguageModelChatInformation(
			{ silent: true },
			new vscode.CancellationTokenSource().token
		);

		// Should have both local and cloud models
		assert.ok(models.length >= 2, "Should return both local and HF models");

		const localModels = models.filter((m: any) => m.id.startsWith("local|"));
		const cloudModels = models.filter((m: any) => !m.id.startsWith("local|"));

		assert.ok(localModels.length > 0, "Should have local models");
		assert.ok(cloudModels.length > 0, "Should have HF cloud models");
		assert.ok(localModels[0].name.includes(localEndpointHost.split(':')[0]), "Local model should reference local server");
		assert.ok(cloudModels.some((m: any) => m.id.includes("meta-llama")), "Should have HF model");
	});

	test("Invalid API key: Local models should still be available when HF fetch fails", async () => {
		// Configure local endpoint
		(vscode.workspace as any).getConfiguration = (section: string) => {
			if (section === "huggingface") {
				return {
					get: (key: string) => {
						if (key === "localEndpoint") {
							return defaultLocalEndpoint;
						}
						return undefined;
					}
				};
			}
			return { get: () => undefined };
		};

		// Mock fetch to return local models but fail for HF
		global.fetch = async (url: string | URL | Request) => {
			const urlStr = url.toString();
			if (urlStr.includes("${new URL(defaultLocalEndpoint).host}/v1/models")) {
				return {
					ok: true,
					json: async () => ({
						data: [
							{ id: "local-model-1", max_model_len: 2048 },
						],
					}),
				} as any;
			}
			if (urlStr.includes("router.huggingface.co")) {
				// Simulate invalid API key response
				return {
					ok: false,
					status: 401,
					statusText: "Unauthorized",
					text: async () => "Invalid API key",
				} as any;
			}
			return { ok: false } as any;
		};

		const provider = new HuggingFaceChatModelProvider(mockSecretStorageWithKey, "test-agent");
		const models = await provider.prepareLanguageModelChatInformation(
			{ silent: true },
			new vscode.CancellationTokenSource().token
		);

		// Should still have local models even though HF fetch failed
		assert.ok(models.length >= 1, "Should return at least local models");

		const localModels = models.filter((m: any) => m.id.startsWith("local|"));
		assert.ok(localModels.length > 0, "Should have local models");
		assert.ok(localModels[0].name.includes(localEndpointHost.split(':')[0]), "Local model should reference local server");

		// Should not have cloud models since fetch failed
		const cloudModels = models.filter((m: any) => !m.id.startsWith("local|"));
		assert.strictEqual(cloudModels.length, 0, "Should not have cloud models when API key is invalid");
	});
});