import * as vscode from "vscode";
import {
	CancellationToken,
	LanguageModelChatInformation,
	LanguageModelChatProvider,
	Progress,
	type LanguageModelChatMessage,
	type LanguageModelChatTool,
	type LanguageModelChatRequestHandleOptions,
	type LanguageModelResponsePart,
	type LanguageModelTextPart,
	type LanguageModelToolCallPart
} from "vscode";

import { convertTools, convertMessages, tryParseJSONObject, validateRequest } from "./utils";
import { logger } from "./logger";

const BASE_URL = "https://router.huggingface.co/v1";
const DEFAULT_MAX_OUTPUT_TOKENS = 16000;
const DEFAULT_CONTEXT_LENGTH = 128000;

// Default token allocation ratios
const DEFAULT_TOKEN_ALLOCATION = {
	INPUT_RATIO: 0.65,   // 65% of context for input
	OUTPUT_RATIO: 0.15,  // 15% of context for output (remaining 20% for chat template overhead)
	MINIMUM_OUTPUT: 100  // Always reserve at least 100 tokens for output
};

// Timeout configuration defaults
const DEFAULT_TIMEOUTS = {
	LOCAL_HEALTH_CHECK: 5000,  // 5 seconds
	LOCAL_MODEL_FETCH: 5000    // 5 seconds
};

/**
 * VS Code Chat provider backed by Hugging Face Inference Providers.
 */
export class HuggingFaceChatModelProvider implements LanguageModelChatProvider {
	private _chatEndpoints: { model: string; modelMaxPromptTokens: number }[] = [];
	/** Buffer for assembling streamed tool calls by index. */
	private _toolCallBuffers: Map<number, { id?: string; name?: string; args: string }> = new Map<
		number,
		{ id?: string; name?: string; args: string }
	>();
	/** Track "tool calls" that come from text injection (fake tool calls, e.g. from Qwen) */
	private _textBasedToolCalls: {
		tools?: Map<string, vscode.LanguageModelChatTool>;
		toolCallsStartIndex?: number;
		toolCallsPendingCompletion?: Map<
			string,
			{ name: string; id: string; input: unknown; isThinking?: boolean }
		>;
	} | undefined;
	/** Deduplicate tool calls from text-injection models. */
	private _textToolCallKeys: Map<
		string,
		{
			name: string;
			id: string;
			input: unknown;
			isThinking?: boolean;
			emitted?: boolean;
		}
	> = new Map<
		string,
		{
			name: string;
			id: string;
			input: unknown;
			isThinking?: boolean;
			emitted?: boolean;
		}
	>();
	private _emittedTextToolCallKeys = new Set<string>();
	private _emittedTextToolCallIds = new Set<string>();

	// Optional vLLM/local inference endpoint from VS Code settings
	private _localEndpoint: string | undefined;
	// Cache for model context limits
	private _modelContextLimits: Map<string, number> = new Map();

	/**
	 * Create a provider using the given secret storage for the API key.
	 * @param secrets VS Code secret storage.
	 */
	constructor(private readonly secrets: vscode.SecretStorage, private readonly userAgent: string) {
		// Load local inference endpoint from VS Code settings
		const config = vscode.workspace.getConfiguration('huggingface');
		const endpoint = config.get<string>('localEndpoint');
		// Trim whitespace to avoid URL parsing issues
		this._localEndpoint = endpoint?.trim();
		if (this._localEndpoint) {
			// Validate endpoint URL
			if (this.validateEndpoint(this._localEndpoint)) {
				logger.info(`Local inference endpoint configured: ${this._localEndpoint}`);
			} else {
				logger.warn(`Invalid local endpoint URL: ${this._localEndpoint}`);
				this._localEndpoint = undefined;
			}
		}
	}

	/**
	 * Validate that the endpoint is a valid URL
	 */
	private validateEndpoint(endpoint: string): boolean {
		try {
			new URL(endpoint);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get token allocation configuration from VS Code settings
	 */
	private getTokenAllocation() {
		const config = vscode.workspace.getConfiguration('huggingface');
		return {
			INPUT_RATIO: config.get<number>('tokenAllocation.inputRatio') ?? DEFAULT_TOKEN_ALLOCATION.INPUT_RATIO,
			OUTPUT_RATIO: config.get<number>('tokenAllocation.outputRatio') ?? DEFAULT_TOKEN_ALLOCATION.OUTPUT_RATIO,
			MINIMUM_OUTPUT: config.get<number>('tokenAllocation.minimumOutput') ?? DEFAULT_TOKEN_ALLOCATION.MINIMUM_OUTPUT
		};
	}

	/**
	 * Get timeout configuration from VS Code settings
	 */
	private getTimeouts() {
		const config = vscode.workspace.getConfiguration('huggingface');
		return {
			LOCAL_HEALTH_CHECK: config.get<number>('timeouts.localHealthCheck') ?? DEFAULT_TIMEOUTS.LOCAL_HEALTH_CHECK,
			LOCAL_MODEL_FETCH: config.get<number>('timeouts.localModelFetch') ?? DEFAULT_TIMEOUTS.LOCAL_MODEL_FETCH
		};
	}

	/** Roughly estimate tokens for VS Code chat messages (text only) */
	private estimateMessagesTokens(msgs: readonly vscode.LanguageModelChatMessage[]): number {
		let total = 0;
		for (const m of msgs) {
			for (const part of m.content) {
				if (part instanceof vscode.LanguageModelTextPart) {
					total += Math.ceil(part.value.length / 4);
				}
			}
		}
		return total;
	}

	/** Rough token estimate for tool definitions by JSON size */
	private estimateToolTokens(tools: { type: string; function: { name: string; description?: string; parameters?: object } }[] | undefined): number {
		if (!tools || tools.length === 0) { return 0; }
		try {
			const json = JSON.stringify(tools);
			return Math.ceil(json.length / 4);
		} catch {
			return 0;
		}
	}

	/**
	 * Get the list of available language models contributed by this provider
	 * @param options Options which specify the calling context of this function
	 * @param token A cancellation token which signals if the user cancelled the request or not
	 * @returns A promise that resolves to the list of available language models
	 */
	async prepareLanguageModelChatInformation(
		options: { silent: boolean },
		_token: CancellationToken
	): Promise<LanguageModelChatInformation[]> {
		try {
			const infos: LanguageModelChatInformation[] = [];

			// LOCAL MODELS: If local endpoint is configured, fetch local models
			if (this._localEndpoint) {
				logger.info(`Fetching models from local endpoint: ${this._localEndpoint}`);

				// Fetch available models from local inference endpoint
				try {
					const localModels = await this.fetchLocalModels(this._localEndpoint);
					if (localModels.length > 0) {
						logger.info(`Found ${localModels.length} local model(s)`);
						for (const model of localModels) {
							const hostname = new URL(this._localEndpoint).hostname;
							const modelId = `local|${this._localEndpoint}|${model}`;

							// Use dynamic context limit if available, otherwise use conservative defaults
							const contextLimit = this._modelContextLimits.get(modelId) || 2048;
							// CRITICAL: vLLM adds ~400-500 tokens for chat template formatting!
							// We must be VERY conservative to avoid "token limit exceeded" errors
							// For 2048 context: 2048 - 500 (template) - 200 (output) = 1348 safe input
							const tokenAllocation = this.getTokenAllocation();
							const maxInputTokens = Math.floor(contextLimit * tokenAllocation.INPUT_RATIO);
							const maxOutputTokens = Math.floor(contextLimit * tokenAllocation.OUTPUT_RATIO);

							infos.push({
								id: modelId,
								name: `${model} @ ${hostname}`,
								tooltip: `Local model ${model} at ${this._localEndpoint} (${contextLimit} token context)`,
								family: "huggingface",
								version: "1.0.0",
								maxInputTokens,
								maxOutputTokens,
								capabilities: {
									toolCalling: false,
									imageInput: false,
								},
							} satisfies LanguageModelChatInformation);
						}
					}
				} catch (e) {
					// Show user notification about local endpoint failure
					const errorMsg = e instanceof Error ? e.message : String(e);
					logger.error(`Failed to fetch local models from ${this._localEndpoint}: ${errorMsg}`, e);

					// Show warning to user
					vscode.window.showWarningMessage(
						`Local inference endpoint (${this._localEndpoint}) is not responding. Please check if your local server is running. Error: ${errorMsg}`,
						'OK', 'Configure Endpoint'
					).then(selection => {
						if (selection === 'Configure Endpoint') {
							vscode.commands.executeCommand('workbench.action.openSettings', 'huggingface.localEndpoint');
						}
					});

					// Still add a generic entry so user can attempt to use it
					const hostname = this._localEndpoint.replace(/^https?:\/\//, '').split('/')[0];
					const modelId = `local|${this._localEndpoint}|default`;

					// Try to detect context limit even when we can't fetch models
					const contextLimit = await this.detectContextLimit(this._localEndpoint) || 2048;
					// CRITICAL: vLLM adds ~400-500 tokens for chat template formatting!
					// We must be VERY conservative to avoid "token limit exceeded" errors
					const tokenAllocation = this.getTokenAllocation();
					const maxInputTokens = Math.floor(contextLimit * tokenAllocation.INPUT_RATIO);
					const maxOutputTokens = Math.floor(contextLimit * tokenAllocation.OUTPUT_RATIO);

					infos.push({
						id: modelId,
						name: `vLLM @ ${hostname} (unreachable)`,
						tooltip: `WARNING: Server at ${this._localEndpoint} is not responding (${contextLimit} token context)`,
						family: "huggingface",
						version: "1.0.0",
						maxInputTokens,
						maxOutputTokens,
						capabilities: {
							toolCalling: false,
							imageInput: false,
						},
					} satisfies LanguageModelChatInformation);
				}

				logger.info(`Added ${infos.length} local model(s) to the list`);
			}

			// HF CLOUD MODELS: Fetch HF models if API key is available

			// Fetch HF Router models if API key is available
			const apiKey = await this.ensureApiKey(options.silent);
			if (!apiKey) {
				logger.info(`No HF API key available - returning ${infos.length} local model(s) only`);
			} else {
				// Try to fetch cloud models, but don't fail if the API key is invalid
				logger.info("Fetching HF cloud models...");

				try {
					const { models } = await this.fetchModels(apiKey);

					const hfInfos: LanguageModelChatInformation[] = models.flatMap((m) => {
						const providers = m?.providers ?? [];
						const modalities = m.architecture?.input_modalities ?? [];
						const vision = Array.isArray(modalities) && modalities.includes("image");

						// Build entries for all providers that support tool calling
						const toolProviders = providers.filter((p) => p.supports_tools === true);
						const entries: LanguageModelChatInformation[] = [];

						for (const p of toolProviders) {
							const contextLen = p?.context_length ?? DEFAULT_CONTEXT_LENGTH;
							const maxOutput = DEFAULT_MAX_OUTPUT_TOKENS;
							const maxInput = Math.max(1, contextLen - maxOutput);
							entries.push({
								id: `${m.id}:${p.provider}`,
								name: `${m.id} via ${p.provider}`,
								tooltip: `Hugging Face via ${p.provider}`,
								family: "huggingface",
								version: "1.0.0",
								maxInputTokens: maxInput,
								maxOutputTokens: maxOutput,
								capabilities: {
									toolCalling: true,
									imageInput: vision,
								},
							} satisfies LanguageModelChatInformation);
						}

						if (entries.length === 0 && providers.length > 0) {
							const base = providers[0];
							const contextLen = base?.context_length ?? DEFAULT_CONTEXT_LENGTH;
							const maxOutput = DEFAULT_MAX_OUTPUT_TOKENS;
							const maxInput = Math.max(1, contextLen - maxOutput);
							entries.push({
								id: m.id,
								name: m.id,
								tooltip: "Hugging Face",
								family: "huggingface",
								version: "1.0.0",
								maxInputTokens: maxInput,
								maxOutputTokens: maxOutput,
								capabilities: {
									toolCalling: false,
									imageInput: vision,
								},
							} satisfies LanguageModelChatInformation);
						}

						return entries;
					});

					// Add HF Router models to the list
					infos.push(...hfInfos);
					logger.info(`Added ${hfInfos.length} cloud model(s) from HF Router`);
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);

					// Check if it's an authentication error
					if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
						logger.error("Invalid or expired HF API key - cloud models unavailable", error);
						// Optionally notify user about invalid API key (but only once)
						if (!options.silent) {
							vscode.window.showWarningMessage(
								'Invalid Hugging Face API key. Local models are still available. You can update your API key in settings.',
								'Update API Key',
								'Ignore'
							).then(selection => {
								if (selection === 'Update API Key') {
									// Clear the invalid key and prompt for a new one
									this.secrets.delete("huggingface.apiKey");
									vscode.commands.executeCommand('workbench.action.openSettings', 'Hugging Face API');
								}
							});
						}
					} else {
						logger.error("Failed to fetch HF cloud models due to network or server error", error);
					}
					// Continue with local models only - don't throw the error
				}
			}

			// Update chat endpoints to include whatever models we have (local, cloud, or both)
			this._chatEndpoints = infos.map((info) => ({
				model: info.id,
				modelMaxPromptTokens: info.maxInputTokens + info.maxOutputTokens,
			}));

			const localCount = this._localEndpoint ? infos.filter(i => i.id.startsWith('local|')).length : 0;
			const cloudCount = infos.length - localCount;
			logger.info(`Returning ${infos.length} total model(s): ${localCount} local, ${cloudCount} cloud`);

			// Debug: Log details of local models
			const localModels = infos.filter(i => i.id.startsWith('local|'));
			if (localModels.length > 0) {
				logger.debug('Local model details:', JSON.stringify(localModels.map(m => ({
					id: m.id,
					name: m.name,
					family: m.family
				})), null, 2));
			}

			return infos;
		} catch (error) {
			// If anything goes wrong, log the error but always return something
			// This ensures the dropdown shows even if there's an error
			logger.error("Error in prepareLanguageModelChatInformation, returning empty model list", error);

			// Try to at least return a fallback local model if configured
			if (this._localEndpoint) {
				const hostname = this._localEndpoint.replace(/^https?:\/\//, '').split('/')[0];
				return [{
					id: `local|${this._localEndpoint}|fallback`,
					name: `Local Model @ ${hostname} (fallback)`,
					tooltip: `Fallback entry - provider encountered an error`,
					family: "huggingface",
					version: "1.0.0",
					maxInputTokens: 1300,
					maxOutputTokens: 300,
					capabilities: {
						toolCalling: false,
						imageInput: false,
					},
				}];
			}

			// Return empty array as last resort
			return [];
		}
	}

	async provideLanguageModelChatInformation(
		options: { silent: boolean },
		_token: CancellationToken
	): Promise<LanguageModelChatInformation[]> {
		return this.prepareLanguageModelChatInformation({ silent: options.silent ?? false }, _token);
	}

	/**
	 * Check TGI server health.
	 * @param endpoint The TGI server endpoint.
	 * @returns Health check result with status and reason.
	 */
	private async checkLocalHealth(endpoint: string): Promise<{ healthy: boolean; reason?: string }> {
		try {
			const controller = new AbortController();
			const timeouts = this.getTimeouts();
			const timeoutId = setTimeout(() => controller.abort(), timeouts.LOCAL_HEALTH_CHECK);

			const healthUrl = endpoint.endsWith('/') ? `${endpoint}health` : `${endpoint}/health`;
			const response = await fetch(healthUrl, {
				method: "GET",
				headers: { "User-Agent": this.userAgent },
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				return { healthy: true };
			} else {
				return { healthy: false, reason: `Health check returned ${response.status}` };
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return { healthy: false, reason: "Health check timed out" };
			}
			return { healthy: false, reason: error instanceof Error ? error.message : "Unknown error" };
		}
	}

	/**
	 * Detect context window size by probing the local inference server.
	 * @param endpoint The local inference server endpoint.
	 * @returns The detected context limit or null if detection fails.
	 */
	private async detectContextLimit(endpoint: string): Promise<number | null> {
		try {
			// Try to fetch model info from the server to get context limit
			const modelsUrl = endpoint.endsWith('/') ? `${endpoint}v1/models` : `${endpoint}/v1/models`;
			const response = await fetch(modelsUrl, {
				method: "GET",
				headers: { "User-Agent": this.userAgent },
			});

			if (response.ok) {
				const data: any = await response.json();
				// vLLM returns model info with max_model_len
				if (data.data && Array.isArray(data.data) && data.data.length > 0) {
					const model = data.data[0];
					if (model.max_model_len) {
						logger.info(`Detected context limit: ${model.max_model_len} tokens`);
						return model.max_model_len;
					}
				}
			}
		} catch (error) {
			logger.debug("Failed to detect context limit", error);
		}

		// Return null to indicate detection failed
		return null;
	}

	/**
	 * Fetch available models from local inference server.
	 * @param endpoint The local inference server endpoint.
	 */
	private async fetchLocalModels(endpoint: string): Promise<string[]> {
		try {
			const controller = new AbortController();
			const timeouts = this.getTimeouts();
			const timeoutId = setTimeout(() => controller.abort(), timeouts.LOCAL_MODEL_FETCH);

			const modelsUrl = endpoint.endsWith('/') ? `${endpoint}v1/models` : `${endpoint}/v1/models`;
			const response = await fetch(modelsUrl, {
				method: "GET",
				headers: { "User-Agent": this.userAgent },
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
			}

			const data: any = await response.json();

			// vLLM/TGI format: { "data": [{"id": "model-name", ...}] }
			if (data.data && Array.isArray(data.data)) {
				const models = data.data.map((m: any) => m.id || m.name).filter(Boolean);

				// Store context limits for each model
				for (const modelData of data.data) {
					if (modelData.id && modelData.max_model_len) {
						const modelId = `local|${endpoint}|${modelData.id}`;
						this._modelContextLimits.set(modelId, modelData.max_model_len);
						logger.info(`Model ${modelData.id} has context limit: ${modelData.max_model_len}`);
					}
				}

				return models;
			}

			// Fallback: simple array format
			if (Array.isArray(data)) {
				return data.map((m: any) => typeof m === 'string' ? m : (m.id || m.name)).filter(Boolean);
			}

			logger.warn("Unexpected models response format", data);
			return [];
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error(`Timeout fetching models from ${endpoint}`);
			}
			throw error;
		}
	}

	private async ensureApiKey(silent: boolean): Promise<string | undefined> {
		let apiKey = await this.secrets.get("huggingface.apiKey");
		if (!apiKey && !silent) {
			const entered = await vscode.window.showInputBox({
				title: "Hugging Face API Key",
				prompt: "Enter your Hugging Face API key",
				ignoreFocusOut: true,
				password: true,
			});
			if (entered && entered.trim()) {
				apiKey = entered.trim();
				await this.secrets.store("huggingface.apiKey", apiKey);
			}
		}
		return apiKey;
	}

	/**
	 * Read and parse the HF Router streaming (SSE-like) response and report parts.
	 * @param responseBody The readable stream body.
	 * @param progress Progress reporter for streamed parts.
	 * @param token Cancellation token.
	 */
	private async readResponseStream(
		responseBody: ReadableStream<Uint8Array>,
		progress: any, // ProgressCallback type issue from API migration
		token: CancellationToken
	): Promise<void> {
		const reader = responseBody.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (!token.isCancellationRequested) {
				const { done, value } = await reader.read();
				if (done) { break; }

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed || !trimmed.startsWith("data: ")) { continue; }

					const jsonStr = trimmed.slice("data: ".length).trim();
					if (jsonStr === "[DONE]") { continue; }

					const parseResult = tryParseJSONObject(jsonStr);
					if (!parseResult.ok) { continue; }

					const parsed = parseResult.value as any;
					const delta = parsed.choices?.[0]?.delta;
					if (delta?.content) {
						// Process text chunks that might contain embedded tool calls
						// Report the text content through the progress API
						progress.report({ text: delta.content });
						// Check for text-embedded tool calls (e.g. from Qwen)
						this.checkForTextToolCalls(delta.content, progress);
					}
					if (delta?.tool_calls) {
						// Process structured tool calls from SSE
						this.processToolCalls(delta.tool_calls, progress);
					}

					const finishReason = parsed.choices?.[0]?.finish_reason;
					if (finishReason === "tool_calls") {
						// Emit any pending text-based tool calls on finish
						this.emitPendingTextToolCalls(progress);
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		// Emit any remaining tool calls at the end
		this.emitPendingToolCalls(progress);
		this.emitPendingTextToolCalls(progress);
	}

	/**
	 * Process structured tool calls from SSE deltas.
	 */
	private processToolCalls(toolCalls: any[], progress: any): void {
		for (const tc of toolCalls) {
			const index = tc.index;
			if (typeof index !== "number") { continue; }

			// Initialize buffer for this tool call if needed
			if (!this._toolCallBuffers.has(index)) {
				this._toolCallBuffers.set(index, { args: "" });
			}

			const buffer = this._toolCallBuffers.get(index)!;

			// Accumulate tool call parts
			if (tc.id) { buffer.id = tc.id; }
			if (tc.function?.name) { buffer.name = tc.function.name; }
			if (tc.function?.arguments) { buffer.args += tc.function.arguments; }

			// Emit when we have complete information
			if (buffer.id && buffer.name && buffer.args) {
				const parseResult = tryParseJSONObject(buffer.args);
				if (parseResult.ok) {
					// Report tool call through progress API
					progress.report({
						toolCall: { id: buffer.id, name: buffer.name, arguments: parseResult.value }
					});
					// Clear the buffer after emission
					this._toolCallBuffers.delete(index);
				}
			}
		}
	}

	/**
	 * Emit any pending tool calls that have complete data.
	 */
	private emitPendingToolCalls(progress: any): void {
		for (const [index, buffer] of this._toolCallBuffers.entries()) {
			if (buffer.id && buffer.name && buffer.args) {
				const parseResult = tryParseJSONObject(buffer.args);
				if (parseResult.ok) {
					// Report tool call through progress API
					progress.report({
						toolCall: { id: buffer.id, name: buffer.name, arguments: parseResult.value }
					});
				}
			}
		}
		this._toolCallBuffers.clear();
	}

	/**
	 * Check for text-embedded tool calls in the content.
	 */
	private checkForTextToolCalls(content: string, progress: any): void {
		// Pattern for Qwen-style text tool calls
		const toolCallPattern = /<\|tool_call_begin\|>(.+?)<\|tool_call_end\|>/gs;
		const matches = [...content.matchAll(toolCallPattern)];

		for (const match of matches) {
			const toolCallContent = match[1];

			// Parse the tool call format
			const nameMatch = toolCallContent.match(/^([^<]+)/);
			const argsMatch = toolCallContent.match(/<\|tool_call_argument_begin\|>(.*?)<\|tool_call_argument_end\|>/s);

			if (nameMatch && argsMatch) {
				const toolName = nameMatch[1].trim();
				const toolArgs = argsMatch[1].trim();
				const parseResult = tryParseJSONObject(toolArgs);

				if (parseResult.ok) {
					// Generate a unique ID for this tool call
					const toolId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

					// Check if we've already emitted this tool call
					const key = `${toolName}:${JSON.stringify(parseResult.value)}`;
					if (!this._emittedTextToolCallKeys.has(key) && !this._emittedTextToolCallIds.has(toolId)) {
						// Report tool call through progress API
						progress.report({
							toolCall: { id: toolId, name: toolName, arguments: parseResult.value }
						});
						this._emittedTextToolCallKeys.add(key);
						this._emittedTextToolCallIds.add(toolId);
					}
				}
			}
		}
	}

	/**
	 * Emit any pending text-based tool calls.
	 */
	private emitPendingTextToolCalls(progress: any): void {
		if (!this._textBasedToolCalls?.toolCallsPendingCompletion) { return; }

		for (const [key, tc] of this._textBasedToolCalls.toolCallsPendingCompletion.entries()) {
			if (!this._emittedTextToolCallKeys.has(key) && !this._emittedTextToolCallIds.has(tc.id) && !tc.isThinking) {
				// Report tool call through progress API
				progress.report({
					toolCall: { id: tc.id, name: tc.name, arguments: tc.input }
				});
				this._emittedTextToolCallKeys.add(key);
				this._emittedTextToolCallIds.add(tc.id);
			}
		}
	}

	/**
	 * Count tokens in messages.
	 */
	async provideTokenCount(
		model: LanguageModelChatInformation,
		text: string | vscode.LanguageModelChatMessage,
		_token: CancellationToken
	): Promise<number> {
		if (typeof text === 'string') {
			return Math.ceil(text.length / 4);
		} else {
			return this.estimateMessagesTokens([text]);
		}
	}

	/**
	 * Provide a language model chat response.
	 */
	async provideLanguageModelChatResponse(
		model: LanguageModelChatInformation,
		messages: readonly vscode.LanguageModelChatMessage[],
		options: LanguageModelChatRequestHandleOptions,
		progress: Progress<LanguageModelResponsePart>,
		token: CancellationToken
	): Promise<void> {
		// Reset buffers for new request
		this._toolCallBuffers.clear();
		this._textBasedToolCalls = undefined;
		this._textToolCallKeys.clear();
		this._emittedTextToolCallKeys.clear();
		this._emittedTextToolCallIds.clear();

		// Check if this is a local model request
		const isLocalModel = model.id.startsWith('local|');

		let apiKey: string | undefined;
		let endpoint: string;
		let requestModel: string;

		if (isLocalModel) {
			// Parse local model ID format: local|endpoint|modelname
			const parts = model.id.split('|');
			endpoint = parts[1];
			requestModel = parts[2] || 'default';

			// Local models don't require API key
			apiKey = undefined;
			logger.info(`Processing local model request for ${requestModel} at ${endpoint}`);
		} else {
			// HF Router request
			endpoint = BASE_URL;
			requestModel = model.id;

			// Get API key for HF Router
			apiKey = await this.ensureApiKey(true);
			if (!apiKey) {
				throw new Error("Hugging Face API key not found");
			}
			logger.debug(`Processing HF Router request`, { modelId: model.id });
		}

		const openaiMessages = convertMessages(messages);
		validateRequest(messages);
		const toolConfig = convertTools(options);

		if (options.tools && options.tools.length > 128) {
			throw new Error("Cannot have more than 128 tools per request.");
		}

		const inputTokenCount = this.estimateMessagesTokens(messages);
		const toolTokenCount = this.estimateToolTokens(toolConfig.tools);
		const totalInputTokens = inputTokenCount + toolTokenCount;

		// For local models, use the context limit we detected/cached
		let maxTokens: number;
		if (isLocalModel) {
			const contextLimit = this._modelContextLimits.get(model.id) || 2048;
			const tokenAllocation = this.getTokenAllocation();

			// Calculate max_tokens based on input size and context window
			// Reserve tokens for: input + tools + chat template overhead + output
			const templateOverhead = 500; // Conservative estimate for chat template
			const availableForOutput = contextLimit - totalInputTokens - templateOverhead;

			// Ensure we have at least MINIMUM_OUTPUT tokens for response
			maxTokens = Math.max(tokenAllocation.MINIMUM_OUTPUT, Math.min(availableForOutput, Math.floor(contextLimit * tokenAllocation.OUTPUT_RATIO)));

			logger.info(`Token analysis:`, {
				inputTokens: inputTokenCount,
				toolTokens: toolTokenCount,
				totalInputTokens,
				actualContextLimit: contextLimit,
				messageCount: messages.length,
				modelId: model.id,
				isLocalModel,
				estimatedVLLMTokens: totalInputTokens + templateOverhead,
				maxTokens,
				firstMessage: openaiMessages[0],
				lastMessage: openaiMessages[openaiMessages.length - 1]
			});
		} else {
			// For HF Router models, use default max
			maxTokens = DEFAULT_MAX_OUTPUT_TOKENS;

			logger.info(`Token analysis:`, {
				inputTokens: inputTokenCount,
				toolTokens: toolTokenCount,
				totalInputTokens,
				actualContextLimit: DEFAULT_CONTEXT_LENGTH,
				messageCount: messages.length,
				modelId: model.id,
				isLocalModel,
				estimatedVLLMTokens: "N/A",
				firstMessage: openaiMessages[0],
				lastMessage: openaiMessages[openaiMessages.length - 1]
			});
		}

		// Construct request URL
		const requestUrl = isLocalModel
			? (endpoint.endsWith('/') ? `${endpoint}v1/chat/completions` : `${endpoint}/v1/chat/completions`)
			: `${endpoint}/chat/completions`;

		logger.debug(`${isLocalModel ? 'Local' : 'HF Router'} request prepared`, {
			endpoint: requestUrl,
			model: requestModel,
			messageCount: openaiMessages.length,
			maxTokens
		});

		// Prepare headers
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"User-Agent": this.userAgent,
		};

		// Only add Authorization header for HF Router requests
		if (apiKey) {
			headers["Authorization"] = `Bearer ${apiKey}`;
		}

		// Make the request (without signal for now, matching original HF implementation)
		logger.info(`Sending request to ${requestUrl}`);

		const response = await fetch(requestUrl, {
			method: "POST",
			headers,
			body: JSON.stringify({
				model: requestModel,
				messages: openaiMessages,
				...toolConfig,
				max_tokens: maxTokens,
				stream: true,
			}),
			// Note: Original HuggingFace doesn't use signal parameter
		});

		logger.info(`Response received: ${response.status} ${response.statusText}`);

		if (!response.ok) {
			let errorText = "";
			try {
				errorText = await response.text();
			} catch (error) {
				logger.error("Failed to read error response text", error);
			}
			const errorMessage = `${isLocalModel ? 'Local inference' : 'HF Router'} error: ${response.status} ${response.statusText}${errorText ? `\n${errorText}` : ""}`;
			logger.error(errorMessage);
			throw new Error(errorMessage);
		}

		if (!response.body) {
			throw new Error("Response body is empty");
		}

		logger.info("Processing streaming response...");

		// Process the streaming response
		await this.readResponseStream(response.body, progress, token);

		logger.info("Streaming response completed");

		// Method returns void as per VS Code API
	}

	private async fetchModels(
		apiKey: string
	): Promise<{ models: HFModelItem[] }> {
		const modelsList = (async () => {
			const resp = await fetch(`${BASE_URL}/models`, {
				method: "GET",
				headers: { Authorization: `Bearer ${apiKey}`, "User-Agent": this.userAgent },
			});
			if (!resp.ok) {
				let text = "";
				try {
					text = await resp.text();
				} catch (error) {
					logger.error(" Failed to read response text", error);
				}
				const err = new Error(
					`Failed to fetch Hugging Face models: ${resp.status} ${resp.statusText}${text ? `\n${text}` : ""}`
				);
				logger.error(" Failed to fetch Hugging Face models", err);
				throw err;
			}
			const parsed = (await resp.json()) as HFModelsResponse;
			return parsed.data ?? [];
		})();

		try {
			const models = await modelsList;
			return { models };
		} catch (err) {
			logger.error(" Failed to fetch Hugging Face models", err);
			throw err;
		}
	}
}

/** The response from the HF Router `/models` endpoint. */
interface HFModelsResponse {
	data?: HFModelItem[];
}

/** Individual model information from HF Router. */
interface HFModelItem {
	id: string;
	providers?: HFProviderInfo[];
	architecture?: { input_modalities?: string[] };
}

/** Provider-specific information for a model. */
interface HFProviderInfo {
	provider: string;
	context_length?: number;
	supports_tools?: boolean;
}