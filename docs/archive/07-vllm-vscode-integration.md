# vLLM Integration with VS Code GitHub Copilot Chat

Date: 2025-09-16

## Executive Summary

There are **three clean approaches** to connect vLLM to VS Code, ranked by simplicity:

1. **Native VS Code Language Model API** (Simplest, if supported)
2. **Your HF Extension** (Already works!)
3. **Ollama as Bridge** (Most compatible)

## Option 1: Native VS Code Language Model Provider (2024-2025 Feature)

VS Code now supports custom language model providers with API keys. Here's how to configure vLLM:

### Step 1: Open Language Model Settings
```
1. Open Command Palette (Ctrl/Cmd + Shift + P)
2. Type: "Chat: Manage Language Models"
3. Select "OpenAI" provider
4. Enter custom configuration
```

### Step 2: Configure for vLLM
```json
{
  "github.copilot.chat.languageModels": {
    "openai": {
      "baseUrl": "http://localhost:8000/v1",
      "apiKey": "dummy-key",
      "models": ["TheBloke/deepseek-coder-6.7B-instruct-AWQ"]
    }
  }
}
```

**Note**: Full custom endpoint support (with arbitrary base URLs) is still a feature request as of April 2025 (Issue #7518).

## Option 2: Your HF Extension (Already Working!)

Your existing extension **already solves this problem** for air-gapped environments:

### Configuration in settings.json:
```json
{
  "huggingface.customTGIEndpoint": "http://localhost:8000"
}
```

### Why This Works:
- Your extension implements `vscode.lm.LanguageModelChatProvider`
- Handles OpenAI-compatible endpoints natively via the `customTGIEndpoint` setting
- Automatically constructs the correct API paths (`/v1/completions`)
- Works with vLLM, TGI, or any OpenAI-compatible server

### Usage:
1. Start vLLM server (as configured earlier)
2. Apply settings above
3. Reload VS Code window (Ctrl+Shift+P → "Developer: Reload Window")
4. Select "Hugging Face" in GitHub Copilot Chat model dropdown
5. Select "TGI" model (this connects to your vLLM server)

## Option 3: Ollama as OpenAI Bridge (Most Compatible)

Ollama can act as a bridge with automatic model management:

### Step 1: Configure Ollama
```bash
# Set Ollama to use vLLM backend
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

### Step 2: Create Model Alias
Create `~/.ollama/models/vllm-proxy.modelfile`:
```
FROM http://localhost:8000/v1
PARAMETER temperature 0.7
```

### Step 3: VS Code Settings
```json
{
  "github.copilot.chat.languageModels": {
    "ollama": {
      "endpoint": "http://localhost:11434/v1",
      "models": ["vllm-proxy"]
    }
  }
}
```

## Direct Testing Commands

### Test vLLM is Running:
```bash
curl http://localhost:8000/v1/models
```

### Test Chat Completion:
```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "TheBloke/deepseek-coder-6.7B-instruct-AWQ",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

## Comparison Matrix

| Method | Setup Complexity | Air-Gap Support | Custom Models | Direct vLLM |
|--------|-----------------|-----------------|---------------|-------------|
| Native VS Code | Simple | ❌ | Limited | ✅ |
| HF Extension | Simple | ✅ | ✅ | ✅ |
| Ollama Bridge | Medium | ✅ | ✅ | Proxy |

## Recommended Approach

**Use your HF Extension** - It's already built for this exact use case:

1. **Immediate**: Works now, no waiting for VS Code features
2. **Air-gapped**: Perfect for on-premise deployments
3. **Flexible**: Supports multiple backends (vLLM, TGI, Ollama)
4. **Clean**: No proxy layers or workarounds

### Quick Setup:
```bash
# 1. Ensure vLLM is running
docker ps | grep vllm

# 2. Update VS Code settings
code .vscode/settings.json

# 3. Add configuration
{
  "huggingface.customTGIEndpoint": "http://localhost:8000"
}

# 4. Reload VS Code window
Developer: Reload Window

# 5. In GitHub Copilot Chat, select "Hugging Face" → "TGI" model
```

## Advanced: MCP Tools Integration

For future extensibility, VS Code supports MCP (Model Context Protocol) tools:

```json
{
  "mcpTools": [{
    "name": "vllm-inference",
    "description": "Local vLLM inference",
    "endpoint": "http://localhost:8000/mcp"
  }]
}
```

## Troubleshooting

### Model doesn't appear in dropdown:
1. Check vLLM health: `curl http://localhost:8000/health`
2. Verify extension loaded: Check Output > Hugging Face
3. Reload window: Cmd/Ctrl + R

### Chat completions fail:
1. Verify endpoint: Must be `/v1/chat/completions`
2. Check model name matches exactly
3. Monitor vLLM logs: `docker logs vllm-server`

### Performance issues:
1. Reduce `--max-model-len` in vLLM
2. Lower `--gpu-memory-utilization`
3. Enable `--enable-chunked-prefill`

## Conclusion

Your HF extension is **already the cleanest solution** for connecting vLLM to VS Code GitHub Copilot Chat. It bypasses the current limitations of VS Code's native language model API and provides exactly what's needed for air-gapped, on-premise AI inference.

No need to wait for future VS Code features or use complex workarounds - your extension already solves this problem elegantly!