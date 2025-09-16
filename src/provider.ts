import * as vscode from "vscode";
import {
	CancellationToken,
	LanguageModelChatInformation,
	LanguageModelChatMessage,
	LanguageModelChatProvider,
	LanguageModelChatRequestHandleOptions,
	LanguageModelResponsePart,
	Progress,
} from "vscode";

import type { HFModelItem, HFModelsResponse } from "./types";

import { convertTools, convertMessages, tryParseJSONObject, validateRequest } from "./utils";
import { logger } from "./logger";

const BASE_URL = "https://router.huggingface.co/v1";
const DEFAULT_MAX_OUTPUT_TOKENS = 16000;
const DEFAULT_CONTEXT_LENGTH = 128000;

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

	/** Indices for which a tool call has been fully emitted. */
	private _completedToolCallIndices = new Set<number>();

	/** Track if we emitted any assistant text before seeing tool calls (SSE-like begin-tool-calls hint). */
	private _hasEmittedAssistantText = false;

	/** Track if we emitted the begin-tool-calls whitespace flush. */
	private _emittedBeginToolCallsHint = false;

	// Lightweight tokenizer state for tool calls embedded in text
	private _textToolParserBuffer = "";
	private _textToolActive:
		| undefined
		| {
			name?: string;
			index?: number;
			argBuffer: string;
			emitted?: boolean;
		};
	private _emittedTextToolCallKeys = new Set<string>();
	private _emittedTextToolCallIds = new Set<string>();

	// Optional TGI endpoint from VS Code settings
	private _tgiEndpoint: string | undefined;

	/**
	 * Create a provider using the given secret storage for the API key.
	 * @param secrets VS Code secret storage.
	 */
	constructor(private readonly secrets: vscode.SecretStorage, private readonly userAgent: string) {
		// Load TGI endpoint from VS Code settings
		const config = vscode.workspace.getConfiguration('huggingface');
		const endpoint = config.get<string>('customTGIEndpoint');
		// Trim whitespace to avoid URL parsing issues
		this._tgiEndpoint = endpoint?.trim();
		if (this._tgiEndpoint) {
			logger.info(`TGI endpoint configured: ${this._tgiEndpoint}`);
		}
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
		const infos: LanguageModelChatInformation[] = [];

		// Add TGI models if configured
		if (this._tgiEndpoint) {
			// Fetch available models from TGI endpoint
			try {
				const tgiModels = await this.fetchTGIModels(this._tgiEndpoint);
				for (const model of tgiModels) {
					const hostname = new URL(this._tgiEndpoint).hostname;
					infos.push({
						id: `tgi|${this._tgiEndpoint}|${model}`,
						name: `${model} @ ${hostname}`,
						tooltip: `TGI model ${model} at ${this._tgiEndpoint}`,
						family: "huggingface",
						version: "1.0.0",
						maxInputTokens: 4096,
						maxOutputTokens: 2048,
						capabilities: {
							toolCalling: false,
							imageInput: false,
						},
					} satisfies LanguageModelChatInformation);
				}
			} catch (e) {
				// If we can't fetch models, add a generic TGI entry
				logger.error(" Failed to fetch TGI models", e);
				const hostname = this._tgiEndpoint.replace(/^https?:\/\//, '').split('/')[0];
				infos.push({
					id: `tgi|${this._tgiEndpoint}|default`,
					name: `TGI @ ${hostname}`,
					tooltip: `TGI server at ${this._tgiEndpoint}`,
					family: "huggingface",
					version: "1.0.0",
					maxInputTokens: 4096,
					maxOutputTokens: 2048,
					capabilities: {
						toolCalling: false,
						imageInput: false,
					},
				} satisfies LanguageModelChatInformation);
			}
		}

		// Fetch HF Router models if API key is available
		const apiKey = await this.ensureApiKey(options.silent);
		if (!apiKey) {
			return infos; // Return TGI model only if no API key
		}

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

		this._chatEndpoints = infos.map((info) => ({
			model: info.id,
			modelMaxPromptTokens: info.maxInputTokens + info.maxOutputTokens,
		}));

		// Add HF Router models to the list
		infos.push(...hfInfos);

		return infos;
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
	private async checkTGIHealth(endpoint: string): Promise<{ healthy: boolean; reason?: string }> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check

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
			return {
				healthy: false,
				reason: error instanceof Error ? error.message : "Unknown error"
			};
		}
	}

	/**
	 * Fetch available models from TGI server.
	 * @param endpoint The TGI server endpoint.
	 */
	private async fetchTGIModels(endpoint: string): Promise<string[]> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

			const response = await fetch(`${endpoint}/v1/models`, {
				method: "GET",
				headers: { "User-Agent": this.userAgent },
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				logger.warn(`Failed to fetch TGI models: ${response.status}`);
				return [];
			}

			const data = await response.json() as { data?: Array<{ id?: string }> };
			// TGI returns {"object": "list", "data": [{"id": "model-name", ...}]}
			if (data?.data && Array.isArray(data.data)) {
				return data.data.map((m) => m.id || "unknown");
			}
			return [];
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				logger.warn("Timeout fetching TGI models");
			} else {
				logger.warn("Error fetching TGI models", error);
			}
			return [];
		}
	}

	/**
	 * Fetch the list of models and supplementary metadata from Hugging Face.
	 * @param apiKey The HF API key used to authenticate.
	 */
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

	/**
	 * Returns the response for a chat request, passing the results to the progress callback.
	 * The {@linkcode LanguageModelChatProvider} must emit the response parts to the progress callback as they are received from the language model.
	 * @param model The language model to use
	 * @param messages The messages to include in the request
	 * @param options Options for the request
	 * @param progress The progress to emit the streamed response chunks to
	 * @param token A cancellation token for the request
	 * @returns A promise that resolves when the response is complete. Results are actually passed to the progress callback.
	 */
	async provideLanguageModelChatResponse(
		model: LanguageModelChatInformation,
		messages: readonly LanguageModelChatMessage[],
		options: LanguageModelChatRequestHandleOptions,
		progress: Progress<LanguageModelResponsePart>,
		token: CancellationToken
	): Promise<void> {

		this._toolCallBuffers.clear();
		this._completedToolCallIndices.clear();
		this._hasEmittedAssistantText = false;
		this._emittedBeginToolCallsHint = false;
        this._textToolParserBuffer = "";
        this._textToolActive = undefined;
        this._emittedTextToolCallKeys.clear();
        this._emittedTextToolCallIds.clear();


		let requestBody: Record<string, unknown> | undefined;
		const trackingProgress: Progress<LanguageModelResponsePart> = {
			report: (part) => {
				try {
					progress.report(part);
				} catch (e) {
					logger.error(" Progress.report failed", {
						modelId: model.id,
						error: e instanceof Error ? { name: e.name, message: e.message } : String(e),
					});
				}
			},
		};
		try {
			// Check if this is a TGI model request
			let apiKey: string | undefined;
			let baseUrl = BASE_URL;
			let isTGI = false;

			if (model.id.startsWith('tgi|')) {
				// TGI model - extract endpoint and model name from ID
				// Format: tgi|endpoint|modelname
				const parts = model.id.replace('tgi|', '').split('|');
				baseUrl = parts[0].trim();

				// Validate TGI endpoint URL
				try {
					const url = new URL(baseUrl);
					if (!url.protocol.startsWith('http')) {
						throw new Error(`Invalid protocol: ${url.protocol}`);
					}
				} catch (urlError) {
					logger.error("Invalid TGI endpoint URL", { endpoint: baseUrl, error: urlError });
					throw new Error(`Invalid TGI endpoint URL: ${baseUrl}`);
				}

				apiKey = "dummy"; // TGI doesn't require API key
				isTGI = true;
				logger.info(`Processing TGI request to ${baseUrl}`, { modelId: model.id });
			} else {
				// HF Router model - need API key
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
            const tokenLimit = Math.max(1, model.maxInputTokens);
            if (inputTokenCount + toolTokenCount > tokenLimit) {
                logger.error(" Message exceeds token limit", { total: inputTokenCount + toolTokenCount, tokenLimit });
                throw new Error("Message exceeds token limit.");
            }

            requestBody = {
                model: model.id,
                messages: openaiMessages,
                stream: true,
                max_tokens: Math.min(options.modelOptions?.max_tokens || 4096, model.maxOutputTokens),
                temperature: options.modelOptions?.temperature ?? 0.7,
            };

			// Allow-list model options
			if (options.modelOptions) {
				const mo = options.modelOptions as Record<string, unknown>;
				if (typeof mo.stop === "string" || Array.isArray(mo.stop)) {
					(requestBody as Record<string, unknown>).stop = mo.stop;
				}
				if (typeof mo.frequency_penalty === "number") {
					(requestBody as Record<string, unknown>).frequency_penalty = mo.frequency_penalty;
				}
				if (typeof mo.presence_penalty === "number") {
					(requestBody as Record<string, unknown>).presence_penalty = mo.presence_penalty;
				}
			}

			if (toolConfig.tools) {
				(requestBody as Record<string, unknown>).tools = toolConfig.tools;
			}
			if (toolConfig.tool_choice) {
				(requestBody as Record<string, unknown>).tool_choice = toolConfig.tool_choice;
			}
			// For TGI, use completions endpoint (chat endpoint has template issues)
			// Ensure proper URL construction
			const endpoint = model.id.startsWith('tgi|')
				? baseUrl.endsWith('/') ? `${baseUrl}v1/completions` : `${baseUrl}/v1/completions`
				: `${baseUrl}/chat/completions`;

			// Adjust request for TGI completions endpoint
			if (model.id.startsWith('tgi|')) {
				// Convert to completions format for TGI
				const lastMessage = openaiMessages[openaiMessages.length - 1];
				const tgiRequestBody = requestBody as Record<string, unknown>;
				tgiRequestBody.prompt = lastMessage.content || "";
				// Extract model name from ID (format: tgi|endpoint|modelname)
				const modelName = model.id.split('|')[2] || "bigcode/starcoder2-3b";
				tgiRequestBody.model = modelName === "default" ? "bigcode/starcoder2-3b" : modelName;
				delete tgiRequestBody.messages;
				logger.debug(`TGI request prepared`, {
					endpoint,
					model: (requestBody as Record<string, unknown>).model,
					promptLength: ((requestBody as Record<string, unknown>).prompt as string).length,
					maxTokens: requestBody.max_tokens
				});
			} else {
				logger.debug(`HF Router request prepared`, {
					endpoint,
					model: requestBody.model,
					messageCount: openaiMessages.length,
					maxTokens: requestBody.max_tokens
				});
			}

			// For TGI, optionally check server health first
			if (isTGI) {
				const healthCheckResult = await this.checkTGIHealth(baseUrl);
				if (!healthCheckResult.healthy) {
					logger.error("TGI server health check failed", {
						endpoint: baseUrl,
						reason: healthCheckResult.reason
					});
					throw new Error(`TGI server is not healthy: ${healthCheckResult.reason}`);
				}
			}

			let response: Response;
			let retryCount = 0;
			const maxRetries = isTGI ? 2 : 0; // Retry TGI requests up to 2 times

			while (true) {
				try {
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

					response = await fetch(endpoint, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${apiKey}`,
							"Content-Type": "application/json",
							"User-Agent": this.userAgent,
						},
						body: JSON.stringify(requestBody),
						signal: controller.signal,
					});

					clearTimeout(timeoutId);
					break; // Success, exit retry loop

				} catch (fetchError) {
					if (retryCount < maxRetries) {
						retryCount++;
						const delay = retryCount * 1000; // Exponential backoff
						logger.warn(`Request failed, retrying in ${delay}ms...`, {
							retry: retryCount,
							maxRetries,
							error: fetchError instanceof Error ? fetchError.message : String(fetchError)
						});
						await new Promise(resolve => setTimeout(resolve, delay));
						continue;
					}

					// Max retries exceeded or non-retryable error
					logger.error("Failed to send request after retries", {
						endpoint,
						retries: retryCount,
						error: fetchError instanceof Error ? {
							message: fetchError.message,
							name: fetchError.name,
							stack: fetchError.stack
						} : String(fetchError)
					});

					if (isTGI) {
						throw new Error(
							`Failed to connect to TGI server at ${baseUrl}. ` +
							`Please check:\n` +
							`1. The TGI server is running (docker ps)\n` +
							`2. The endpoint URL is correct: ${baseUrl}\n` +
							`3. No firewall is blocking the connection\n` +
							`Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
						);
					} else {
						throw fetchError;
					}
				}
			}

			logger.debug(`Request sent to ${endpoint}`);

			if (!response.ok) {
				const errorText = await response.text();
				logger.error("API error response", {
					status: response.status,
					statusText: response.statusText,
					errorText,
					endpoint,
					modelId: model.id
				});

				// Provide more specific error messages for common TGI issues
				if (isTGI) {
					if (response.status === 404) {
						throw new Error(
							`TGI endpoint not found (404). Please check:\n` +
							`1. The endpoint URL is correct: ${baseUrl}\n` +
							`2. TGI is configured to serve at /v1/completions`
						);
					} else if (response.status === 503) {
						throw new Error(
							`TGI server unavailable (503). The server may be:\n` +
							`1. Still loading the model\n` +
							`2. Out of memory\n` +
							`3. Crashed - check Docker logs with: docker logs <container>`
						);
					} else if (response.status === 500) {
						throw new Error(
							`TGI server error (500). Common causes:\n` +
							`1. Model quantization issues\n` +
							`2. Input exceeds context length\n` +
							`3. Memory allocation failure\n` +
							`Check Docker logs: docker logs <container>\n` +
							`Error details: ${errorText ? errorText.substring(0, 200) : 'none'}`
						);
					} else if (response.status === 422) {
						throw new Error(
							`TGI request validation failed (422). The request format may be incompatible.\n` +
							`Error: ${errorText ? errorText.substring(0, 200) : 'none'}`
						);
					} else {
						throw new Error(
							`TGI server error: ${response.status} ${response.statusText}\n` +
							`Error: ${errorText ? errorText.substring(0, 200) : 'none'}`
						);
					}
				} else {
					throw new Error(
						`Hugging Face API error: ${response.status} ${response.statusText}${errorText ? `\n${errorText}` : ""}`
					);
				}
			}

			if (!response.body) {
				logger.error("No response body from API", { endpoint, modelId: model.id });
				if (isTGI) {
					throw new Error(
						`No response body from TGI server. This may indicate:\n` +
						`1. The server crashed during processing\n` +
						`2. Network connection was interrupted\n` +
						`Check server status with: curl ${baseUrl}/health`
					);
				} else {
					throw new Error("No response body from Hugging Face API");
				}
			}

			logger.debug("Processing streaming response...");
			await this.processStreamingResponse(response.body, trackingProgress, token, isTGI ? baseUrl : undefined);
			logger.debug("Streaming response completed successfully");
		} catch (err) {
			logger.error("Chat request failed", {
				modelId: model.id,
				messageCount: messages.length,
				error: err instanceof Error ? { name: err.name, message: err.message } : String(err),
			});
			throw err;
		}
	}

	/**
	 * Returns the number of tokens for a given text using the model specific tokenizer logic
	 * @param _model The language model to use (unused, estimation is character-based)
	 * @param text The text to count tokens for
	 * @param token A cancellation token for the request
	 * @returns A promise that resolves to the number of tokens
	 */
	async provideTokenCount(
		_model: LanguageModelChatInformation,
		text: string | LanguageModelChatMessage,
		_token: CancellationToken
	): Promise<number> {
		if (typeof text === "string") {
			return Math.ceil(text.length / 4);
		} else {
			let totalTokens = 0;
			for (const part of text.content) {
				if (part instanceof vscode.LanguageModelTextPart) {
					totalTokens += Math.ceil(part.value.length / 4);
				}
			}
			return totalTokens;
		}
	}

	/**
	 * Ensure an API key exists in SecretStorage, optionally prompting the user when not silent.
	 * @param silent If true, do not prompt the user.
	 */
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
	    private async processStreamingResponse(
	        responseBody: ReadableStream<Uint8Array>,
	        progress: vscode.Progress<vscode.LanguageModelResponsePart>,
	        token: vscode.CancellationToken,
		tgiEndpoint?: string,
	    ): Promise<void> {
        const reader = responseBody.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

			let responseStarted = false;
			let lastDataTime = Date.now();
			const timeout = 60000; // 60 second timeout for no data

			try {
				while (!token.isCancellationRequested) {
					// Check for timeout
					if (responseStarted && Date.now() - lastDataTime > timeout) {
						logger.error("Stream timeout - no data received for 60 seconds");
						throw new Error("Response timeout: No data received from server");
					}

					let done, value;
					try {
						const result = await reader.read();
						done = result.done;
						value = result.value;
					} catch (readError) {
						logger.error("Stream read error - connection may have dropped", {
							error: readError instanceof Error ? readError.message : String(readError)
						});
						throw new Error("Connection lost while reading response stream");
					}

                if (done) {
					logger.debug("Stream ended normally");
					break;
				}

				if (!responseStarted) {
					responseStarted = true;
					logger.debug("Stream started - receiving data");
				}
				lastDataTime = Date.now();

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (!line.startsWith("data: ")) {
							continue;
						}
						const data = line.slice(6);
                    if (data === "[DONE]") {
                        // Do not throw on [DONE]; any incomplete/empty buffers are ignored.
                        await this.flushToolCallBuffers(progress, /*throwOnInvalid*/ false);
                        // Flush any in-progress text-embedded tool call (silent if incomplete)
                        await this.flushActiveTextToolCall(progress);
                        logger.debug(`Received [DONE] signal. Has emitted text: ${this._hasEmittedAssistantText}`);
                        if (!this._hasEmittedAssistantText) {
                            logger.warn("Stream completed but no text was emitted - possible server error");
                        }
                        continue;
                    }

						try {
							const parsed = JSON.parse(data);
							// Log first few deltas for debugging
							if (!this._hasEmittedAssistantText || Math.random() < 0.05) { // Log first delta and 5% of others
								logger.debug(`SSE delta received`, {
									data: JSON.stringify(parsed).substring(0, 300)
								});
							}
                        await this.processDelta(parsed, progress);
                    } catch (e) {
                        // Log malformed SSE lines for debugging
                        logger.warn("Failed to parse SSE line", {
                            data: data.substring(0, 200),
                            error: e instanceof Error ? e.message : String(e)
                        });
                    }
                }
            }
		} catch (streamError) {
			logger.error("Error during stream processing", {
				error: streamError instanceof Error ? {
					message: streamError.message,
					stack: streamError.stack
				} : String(streamError)
			});
			// Emit error message to user if no content was sent
			if (!this._hasEmittedAssistantText) {
				try {
					progress.report(new vscode.LanguageModelTextPart("I encountered an error while processing the response. Please check the logs for details."));
					logger.warn("Emitted error message to user due to stream error with no prior content");
				} catch (reportError) {
					logger.error("Failed to report error message to user", reportError);
				}
			}
			throw streamError;
        } finally {
			// Check if stream ended without any content
			if (!this._hasEmittedAssistantText && !token.isCancellationRequested) {
				logger.error("Stream completed but no content was emitted to user");
				try {
					if (tgiEndpoint) {
						progress.report(new vscode.LanguageModelTextPart(
							"The TGI server returned an empty response. Common causes:\n" +
							"1. Model crashed during generation (check Docker logs)\n" +
							"2. Input prompt exceeded context length\n" +
							"3. Out of GPU memory\n\n" +
							"Run 'docker logs <container>' to see the error details."
						));
					} else {
						progress.report(new vscode.LanguageModelTextPart("The server returned an empty response."));
					}
					logger.warn("Emitted empty response warning to user");
				} catch (reportError) {
					logger.error("Failed to report empty response warning", reportError);
				}
			}
            reader.releaseLock();
            // Clean up any leftover tool call state
            this._toolCallBuffers.clear();
            this._completedToolCallIndices.clear();
            this._hasEmittedAssistantText = false;
            this._emittedBeginToolCallsHint = false;
            this._textToolParserBuffer = "";
            this._textToolActive = undefined;
            this._emittedTextToolCallKeys.clear();
        }
    }

	/**
	 * Handle a single streamed delta chunk, emitting text and tool call parts.
	 * @param delta Parsed SSE chunk from the Router.
	 * @param progress Progress reporter for parts.
	 */
    private async processDelta(
        delta: Record<string, unknown>,
        progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    ): Promise<boolean> {
        let emitted = false;
        const choice = (delta.choices as Record<string, unknown>[] | undefined)?.[0];
        if (!choice) { return false; }

		const deltaObj = choice.delta as Record<string, unknown> | undefined;

		// report thinking progress if backend provides it and host supports it
		try {
			const maybeThinking = (choice as Record<string, unknown> | undefined)?.thinking ?? (deltaObj as Record<string, unknown> | undefined)?.thinking;
			if (maybeThinking !== undefined) {
				const vsAny = (vscode as unknown as Record<string, unknown>);
				const ThinkingCtor = vsAny["LanguageModelThinkingPart"] as
					| (new (text: string, id?: string, metadata?: unknown) => unknown)
					| undefined;
                    if (ThinkingCtor) {
                        let text = "";
                        let id: string | undefined;
                        let metadata: unknown;
                        if (maybeThinking && typeof maybeThinking === "object") {
                            const mt = maybeThinking as Record<string, unknown>;
                            text = typeof mt["text"] === "string" ? (mt["text"] as string) : "";
                            id = typeof mt["id"] === "string" ? (mt["id"] as string) : undefined;
                            metadata = mt["metadata"];
                        } else if (typeof maybeThinking === "string") {
                            text = maybeThinking;
                        }
                        if (text) {
                            progress.report(new (ThinkingCtor as new (text: string, id?: string, metadata?: unknown) => unknown)(text, id, metadata) as unknown as vscode.LanguageModelResponsePart);
                            emitted = true;
                        }
                    }
                }
            } catch {
                // ignore errors here temporarily
            }

            // Handle both HF Router format (delta.content) and TGI format (text)
            const textContent = deltaObj?.content || choice.text;
            if (textContent) {
                const content = String(textContent);
                logger.debug(`Processing text content: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
                const res = this.processTextContent(content, progress);
                if (res.emittedText) {
                    this._hasEmittedAssistantText = true;
                    logger.debug(`Emitted text content, total emitted so far: ${this._hasEmittedAssistantText}`);
                }
                if (res.emittedAny) {
                    emitted = true;
                }
            } else {
                // Log when we receive a delta with no text content
                logger.debug(`Received delta with no text content`, {
                    hasChoice: !!choice,
                    hasDelta: !!deltaObj,
                    choiceKeys: choice ? Object.keys(choice) : [],
                    deltaKeys: deltaObj ? Object.keys(deltaObj) : []
                });
            }

			if (deltaObj?.tool_calls) {
                const toolCalls = deltaObj.tool_calls as Array<Record<string, unknown>>;

				// SSEProcessor-like: if first tool call appears after text, emit a whitespace
				// to ensure any UI buffers/linkifiers are flushed without adding visible noise.
				if (!this._emittedBeginToolCallsHint && this._hasEmittedAssistantText && toolCalls.length > 0) {
					progress.report(new vscode.LanguageModelTextPart(" "));
					this._emittedBeginToolCallsHint = true;
				}

				for (const tc of toolCalls) {
					const idx = (tc.index as number) ?? 0;
					// Ignore any further deltas for an index we've already completed
					if (this._completedToolCallIndices.has(idx)) {
						continue;
					}
					const buf = this._toolCallBuffers.get(idx) ?? { args: "" };
					if (tc.id && typeof tc.id === "string") {
						buf.id = tc.id as string;
					}
					const func = tc.function as Record<string, unknown> | undefined;
					if (func?.name && typeof func.name === "string") {
						buf.name = func.name as string;
					}
					if (typeof func?.arguments === "string") {
						buf.args += func.arguments as string;
					}
					this._toolCallBuffers.set(idx, buf);

					// Emit immediately once arguments become valid JSON to avoid perceived hanging
                    await this.tryEmitBufferedToolCall(idx, progress);
                }
            }

        const finish = (choice.finish_reason as string | undefined) ?? undefined;
        if (finish === "tool_calls" || finish === "stop") {
            // On both 'tool_calls' and 'stop', emit any buffered calls and throw on invalid JSON
            await this.flushToolCallBuffers(progress, /*throwOnInvalid*/ true);
        }
        return emitted;
    }

    /**
     * Process streamed text content for inline tool-call control tokens and emit text/tool calls.
     * Returns which parts were emitted for logging/flow control.
     */
    private processTextContent(
        input: string,
        progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    ): { emittedText: boolean; emittedAny: boolean } {
        const BEGIN = "<|tool_call_begin|>";
        const ARG_BEGIN = "<|tool_call_argument_begin|>";
        const END = "<|tool_call_end|>";

        let data = this._textToolParserBuffer + input;
        let emittedText = false;
        let emittedAny = false;
        let visibleOut = "";

        while (data.length > 0) {
            if (!this._textToolActive) {
                const b = data.indexOf(BEGIN);
                if (b === -1) {
                    // No tool-call start: emit visible portion, but keep any partial BEGIN prefix as buffer
                    const longestPartialPrefix = ((): number => {
                        for (let k = Math.min(BEGIN.length - 1, data.length - 1); k > 0; k--) {
                            if (data.endsWith(BEGIN.slice(0, k))) { return k; }
                        }
                        return 0;
                    })();
                    if (longestPartialPrefix > 0) {
                        const visible = data.slice(0, data.length - longestPartialPrefix);
                        if (visible) { visibleOut += this.stripControlTokens(visible); }
                        this._textToolParserBuffer = data.slice(data.length - longestPartialPrefix);
                        data = "";
                        break;
                    } else {
                        // All visible, clean other control tokens
                        visibleOut += this.stripControlTokens(data);
                        data = "";
                        break;
                    }
                }
                // Emit text before the token
                const pre = data.slice(0, b);
                if (pre) {
                    visibleOut += this.stripControlTokens(pre);
                }
                // Advance past BEGIN
                data = data.slice(b + BEGIN.length);

                // Find the delimiter that ends the name/index segment
                const a = data.indexOf(ARG_BEGIN);
                const e = data.indexOf(END);
                let delimIdx = -1;
                let delimKind: "arg" | "end" | undefined = undefined;
                if (a !== -1 && (e === -1 || a < e)) { delimIdx = a; delimKind = "arg"; }
                else if (e !== -1) { delimIdx = e; delimKind = "end"; }
                else {
                    // Incomplete header; keep for next chunk (re-add BEGIN so we don't lose it)
                    this._textToolParserBuffer = BEGIN + data;
                    data = "";
                    break;
                }

                const header = data.slice(0, delimIdx).trim();
                const m = header.match(/^([A-Za-z0-9_\-.]+)(?::(\d+))?/);
                const name = m?.[1] ?? undefined;
                const index = m?.[2] ? Number(m?.[2]) : undefined;
                this._textToolActive = { name, index, argBuffer: "", emitted: false };
                // Advance past delimiter token
                if (delimKind === "arg") {
                    data = data.slice(delimIdx + ARG_BEGIN.length);
                } else /* end */ {
                    // No args, finalize immediately
                    data = data.slice(delimIdx + END.length);
                    const did = this.emitTextToolCallIfValid(progress, this._textToolActive, "{}");
                    if (did) {
                        this._textToolActive.emitted = true;
                        emittedAny = true;
                    }
                    this._textToolActive = undefined;
                }
                continue;
            }

            // We are inside arguments, collect until END and emit as soon as JSON becomes valid
            const e2 = data.indexOf(END);
            if (e2 === -1) {
                // No end marker yet, accumulate and check for early valid JSON
                this._textToolActive.argBuffer += data;
                // Early emit when JSON becomes valid and we haven't emitted yet
                if (!this._textToolActive.emitted) {
                    const did = this.emitTextToolCallIfValid(progress, this._textToolActive, this._textToolActive.argBuffer);
                    if (did) {
                        this._textToolActive.emitted = true;
                        emittedAny = true;
                    }
                }
                data = "";
                break;
            } else {
                this._textToolActive.argBuffer += data.slice(0, e2);
                // Consume END
                data = data.slice(e2 + END.length);
                // Final attempt to emit if not already
                if (!this._textToolActive.emitted) {
                    const did = this.emitTextToolCallIfValid(progress, this._textToolActive, this._textToolActive.argBuffer);
                    if (did) {
                        emittedAny = true;
                    }
                }
                this._textToolActive = undefined;
                continue;
            }
        }

        // Emit any visible text
        const textToEmit = visibleOut;
        if (textToEmit && textToEmit.length > 0) {
            progress.report(new vscode.LanguageModelTextPart(textToEmit));
            emittedText = true;
            emittedAny = true;
        }

        // Store leftover for next chunk
        this._textToolParserBuffer = data;

        return { emittedText, emittedAny };
    }

    private emitTextToolCallIfValid(
        progress: vscode.Progress<vscode.LanguageModelResponsePart>,
        call: { name?: string; index?: number; argBuffer: string; emitted?: boolean },
        argText: string,
    ): boolean {
        const name = call.name ?? "unknown_tool";
        const parsed = tryParseJSONObject(argText);
        if (!parsed.ok) {
            return false;
        }
        const canonical = JSON.stringify(parsed.value);
        const key = `${name}:${canonical}`;
        // identity-based dedupe when index is present
        if (typeof call.index === "number") {
            const idKey = `${name}:${call.index}`;
            if (this._emittedTextToolCallIds.has(idKey)) {
                return false;
            }
            // Mark identity as emitted
            this._emittedTextToolCallIds.add(idKey);
        } else if (this._emittedTextToolCallKeys.has(key)) {
            return false;
        }
        this._emittedTextToolCallKeys.add(key);
        const id = `tct_${Math.random().toString(36).slice(2, 10)}`;
        progress.report(new vscode.LanguageModelToolCallPart(id, name, parsed.value));
        return true;
    }

    private async flushActiveTextToolCall(
        progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    ): Promise<void> {
        if (!this._textToolActive) {
            return;
        }
        const argText = this._textToolActive.argBuffer;
        const parsed = tryParseJSONObject(argText);
        if (!parsed.ok) {
            return;
        }
        // Emit (dedupe ensures we don't double-emit)
        this.emitTextToolCallIfValid(progress, this._textToolActive, argText);
        this._textToolActive = undefined;
    }

	/**
	 * Try to emit a buffered tool call when a valid name and JSON arguments are available.
	 * @param index The tool call index from the stream.
	 * @param progress Progress reporter for parts.
	 */
    private async tryEmitBufferedToolCall(
        index: number,
        progress: vscode.Progress<vscode.LanguageModelResponsePart>
    ): Promise<void> {
        const buf = this._toolCallBuffers.get(index);
        if (!buf) {
            return;
        }
        if (!buf.name) {
            return;
        }
        const canParse = tryParseJSONObject(buf.args);
        if (!canParse.ok) {
            return;
        }
        const id = buf.id ?? `call_${Math.random().toString(36).slice(2, 10)}`;
        const parameters = canParse.value;
        try {
            const canonical = JSON.stringify(parameters);
            this._emittedTextToolCallKeys.add(`${buf.name}:${canonical}`);
        } catch { /* ignore */ }
        progress.report(new vscode.LanguageModelToolCallPart(id, buf.name, parameters));
        this._toolCallBuffers.delete(index);
        this._completedToolCallIndices.add(index);
    }

	/**
	 * Flush all buffered tool calls, optionally throwing if arguments are not valid JSON.
	 * @param progress Progress reporter for parts.
	 * @param throwOnInvalid If true, throw when a tool call has invalid JSON args.
	 */
    private async flushToolCallBuffers(
        progress: vscode.Progress<vscode.LanguageModelResponsePart>,
        throwOnInvalid: boolean,
    ): Promise<void> {
        if (this._toolCallBuffers.size === 0) {
            return;
        }
        for (const [idx, buf] of Array.from(this._toolCallBuffers.entries())) {
            const parsed = tryParseJSONObject(buf.args);
            if (!parsed.ok) {
                if (throwOnInvalid) {
                    logger.error(" Invalid JSON for tool call", { idx, snippet: (buf.args || "").slice(0, 200) });
                    throw new Error("Invalid JSON for tool call");
                }
                // When not throwing (e.g. on [DONE]), drop silently to reduce noise
                continue;
            }
            const id = buf.id ?? `call_${Math.random().toString(36).slice(2, 10)}`;
            const name = buf.name ?? "unknown_tool";
            try {
                const canonical = JSON.stringify(parsed.value);
                this._emittedTextToolCallKeys.add(`${name}:${canonical}`);
            } catch { /* ignore */ }
            progress.report(new vscode.LanguageModelToolCallPart(id, name, parsed.value));
            this._toolCallBuffers.delete(idx);
            this._completedToolCallIndices.add(idx);
        }
    }

	/** Strip provider control tokens like <|tool_calls_section_begin|> and <|tool_call_begin|> from streamed text. */
	private stripControlTokens(text: string): string {
		try {
			// Remove section markers and explicit tool call begin/argument/end markers that some backends stream as text
			return text
				.replace(/<\|[a-zA-Z0-9_-]+_section_(?:begin|end)\|>/g, "")
				.replace(/<\|tool_call_(?:argument_)?(?:begin|end)\|>/g, "");
		} catch {
			return text;
		}
	}

}
