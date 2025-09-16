# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Test-Driven Development (TDD) Requirements

**⚠️ MANDATORY: ALL changes MUST follow strict TDD practices:**
1. **Write tests FIRST** before implementing any feature or fix
2. **Run `npm run test` BEFORE** declaring any task complete
3. **Never skip tests** - if tests don't exist, create them
4. **Test coverage required** for:
   - Endpoint URL construction (especially local vs HF models)
   - Model ID parsing and prefix detection
   - Token calculation logic
   - Error handling paths
   - Configuration changes

**TDD Workflow (MUST FOLLOW):**
1. Write failing test for the bug/feature
2. Run tests to confirm failure: `npm run test`
3. Implement minimal code to pass test
4. Run tests to confirm success: `npm run test`
5. Refactor if needed
6. Run ALL tests before packaging: `npm run test`
7. Only then: `npm run compile` and package

## Development Commands

**Build and Development:**
- `npm run test` - **RUN THIS FIRST AND OFTEN** - Run all unit tests
- `npm install` - Install dependencies (automatically runs VS Code API download)
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Compile with watch mode for development
- `npm run lint` - Run ESLint for code quality checks
- `npm run format` - Format code with Prettier

**Extension Development:**
- Press F5 in VS Code to launch Extension Development Host for testing
- Use `npx @vscode/vsce package` to create VSIX package for distribution
- Use `scripts/rebuild-extension.sh` for quick rebuild and install cycle
- Use `scripts/test-vllm.sh` for testing vLLM API endpoints

## Architecture Overview

This is a VS Code extension that integrates Hugging Face Inference Providers with GitHub Copilot Chat. The extension acts as a language model chat provider for VS Code's built-in chat interface.

**Core Components:**

- **`src/extension.ts`** - Main extension entry point that registers the chat provider and management command
- **`src/provider.ts`** - `HuggingFaceChatModelProvider` class implementing VS Code's `LanguageModelChatProvider` interface
- **`src/types.ts`** - TypeScript interfaces for OpenAI-compatible API types and HF model metadata
- **`src/utils.ts`** - Utility functions for message conversion, tool calling, and request validation

**Key Architectural Patterns:**

1. **Chat Provider Integration**: Implements VS Code's Language Model Chat Provider API to integrate with GitHub Copilot Chat UI
2. **OpenAI API Compatibility**: Converts VS Code chat messages to OpenAI-compatible format for HF Router API calls
3. **Streaming Response Processing**: Handles Server-Sent Events (SSE) from HF Router with real-time text and tool call parsing
4. **Tool Call Support**: Full support for function calling with both structured (SSE tool_calls) and text-embedded tool calls
5. **Multi-Provider Model Management**: Dynamically fetches available models from multiple inference providers via HF Router

**API Integration:**
- Base URL: `https://router.huggingface.co/v1` (default cloud)
- Local inference via `huggingface.customTGIEndpoint` setting
- Endpoints: `/models` (list models), `/chat/completions` (chat API)
- Authentication: Bearer token for cloud, optional for local
- User-Agent: Includes extension version and VS Code version for usage tracking

**Local Inference Support (vLLM/TGI):**
- Configuration: `"huggingface.customTGIEndpoint": "http://localhost:8000"`
- vLLM endpoint: `/v1/chat/completions` (OpenAI-compatible)
- TGI endpoint: `/v1/chat/completions` (requires v2.0+)
- Models appear with `tgi|` prefix in model picker
- Dynamic token calculation based on model context limits

**Tool Calling Architecture:**
The extension supports two tool calling formats:
1. Standard OpenAI-style `tool_calls` in SSE deltas
2. Text-embedded tool calls using control tokens (`<|tool_call_begin|>`, `<|tool_call_argument_begin|>`, `<|tool_call_end|>`)

**State Management:**
- API key stored securely in VS Code SecretStorage
- Model list cached during provider initialization
- Tool call buffers managed per request to handle streaming responses
- Deduplication logic prevents duplicate tool call emissions

**Logging System (`src/logger.ts`):**
- Default log level: INFO (DEBUG messages filtered for performance)
- Output channel: "Hugging Face Chat Provider" in VS Code Output panel
- Performance consideration: DEBUG logging can slow down token streaming
- Change log level in logger.ts line 13: `LogLevel.INFO` vs `LogLevel.DEBUG`

## Testing and Package Management

- Uses `pnpm` as package manager (version 8.15.4+)
- TypeScript compilation target: ES2024, Node16 modules
- Test framework: Mocha with VS Code test runner
- No external runtime dependencies - only devDependencies for tooling

## vLLM Development and Testing

**Quick vLLM Setup for Testing:**
```bash
# Start vLLM with recommended model for RTX 4060 (8GB VRAM)
docker run -d --name vllm-server --gpus all -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model TheBloke/deepseek-coder-6.7B-instruct-AWQ \
  --quantization awq \
  --gpu-memory-utilization 0.8

# Test the endpoint
scripts/test-vllm.sh
```

**Key vLLM Considerations:**
1. **Token Limits**: vLLM strictly enforces context limits (e.g., 2048 tokens)
2. **Dynamic Calculation**: Extension calculates `max_tokens` based on input size
3. **Model Configuration**: Lines 121-122, 139-140 in `provider.ts` set token limits
4. **Endpoint Format**: vLLM uses `/v1/chat/completions` (not `/v1/completions`)
5. **Performance**: Expect 5-8 tokens/sec on RTX 4060 (slower than Ollama but more stable)

**Common Issues and Fixes:**
- **Token limit errors**: Reduce model's `maxInputTokens` in provider.ts
- **Empty responses**: Check Docker logs for crashes (TGI has stability issues)
- **Slow performance**: Normal for vLLM; prioritizes stability over speed
- **Extension not updating**: VS Code caches compiled code; restart completely

**Testing Changes:**
```bash
# Quick rebuild and reinstall
scripts/rebuild-extension.sh

# Verify in VS Code
1. Open Output panel (Ctrl+Shift+U)
2. Select "Hugging Face Chat Provider"
3. Check logs show correct endpoint
```

## Release Process

- Releases use GitHub Actions workflow triggered on `release/**` branches
- Version in package.json must match branch tag
- Automated VSIX packaging and VS Code Marketplace publishing