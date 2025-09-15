# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Build and Development:**
- `npm install` - Install dependencies (automatically runs VS Code API download)
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Compile with watch mode for development
- `npm run lint` - Run ESLint for code quality checks
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests (compiles first, then runs with vscode-test)

**Extension Development:**
- Press F5 in VS Code to launch Extension Development Host for testing
- Use `npx @vscode/vsce package` to create VSIX package for distribution

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
- Base URL: `https://router.huggingface.co/v1`
- Endpoints: `/models` (list models), `/chat/completions` (chat API)
- Authentication: Bearer token stored in VS Code SecretStorage
- User-Agent: Includes extension version and VS Code version for usage tracking

**Tool Calling Architecture:**
The extension supports two tool calling formats:
1. Standard OpenAI-style `tool_calls` in SSE deltas
2. Text-embedded tool calls using control tokens (`<|tool_call_begin|>`, `<|tool_call_argument_begin|>`, `<|tool_call_end|>`)

**State Management:**
- API key stored securely in VS Code SecretStorage
- Model list cached during provider initialization
- Tool call buffers managed per request to handle streaming responses
- Deduplication logic prevents duplicate tool call emissions

## Testing and Package Management

- Uses `pnpm` as package manager (version 8.15.4+)
- TypeScript compilation target: ES2024, Node16 modules
- Test framework: Mocha with VS Code test runner
- No external runtime dependencies - only devDependencies for tooling

## Release Process

- Releases use GitHub Actions workflow triggered on `release/**` branches
- Version in package.json must match branch tag
- Automated VSIX packaging and VS Code Marketplace publishing