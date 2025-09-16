# vLLM Successful Deployment and Testing

Date: 2025-09-16 at 16:36:45 EST

## Context
After successfully transitioning from TGI to vLLM due to stability issues, the vLLM server is now running with DeepSeek-Coder-6.7B-AWQ model. User confirmed the server is accessible and requested guidance on using it with curl and VS Code.

## User Query
"nice, i see this at: http://localhost:8000/v1/models [shows JSON response]... teach me how to use it using curl and then VS code configuration"

## Analysis and Findings

### vLLM Server Status
- **Successfully Running**: Container ID 6cb4a2e736ea
- **Model Loaded**: TheBloke/deepseek-coder-6.7B-instruct-AWQ
- **VRAM Usage**: 4.9GB out of 8GB
- **API Endpoint**: http://localhost:8000/v1
- **Max Context**: 2048 tokens
- **Quantization**: AWQ (stable, no integer overflow issues like TGI)

### curl Testing Examples Provided

#### 1. Basic Chat Completion
```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "TheBloke/deepseek-coder-6.7B-instruct-AWQ",
    "messages": [
      {"role": "user", "content": "Write a Python function to calculate fibonacci numbers"}
    ],
    "max_tokens": 200,
    "temperature": 0.7
  }'
```

#### 2. Streaming Response
```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "TheBloke/deepseek-coder-6.7B-instruct-AWQ",
    "messages": [
      {"role": "system", "content": "You are a helpful coding assistant"},
      {"role": "user", "content": "Explain async/await in JavaScript"}
    ],
    "stream": true,
    "max_tokens": 500
  }'
```

#### 3. Test Results
Created and executed test script that confirmed:
- Basic completions working ✅
- Code generation functional ✅
- Multi-turn conversations supported ✅
- Response quality good with AWQ quantization ✅

### VS Code Integration Configuration

#### Method 1: HF Extension (Correct Configuration)
Settings for `.vscode/settings.json`:
```json
{
  "huggingface.customTGIEndpoint": "http://localhost:8000"
}
```

**Activation Steps:**
1. Reload VS Code window (Ctrl+Shift+P → "Developer: Reload Window")
2. Open GitHub Copilot Chat
3. Select "Hugging Face" from model dropdown
4. Select "TGI" model (this connects to your vLLM server)

**Note**: The extension uses "TGI" as the label but works with any OpenAI-compatible endpoint including vLLM

#### Method 2: Native Language Model Provider (Experimental)
Alternative configuration for native VS Code support:
```json
{
  "github.copilot.chat.languageModels": {
    "openai": {
      "baseUrl": "http://localhost:8000/v1",
      "apiKey": "not-needed",
      "models": ["TheBloke/deepseek-coder-6.7B-instruct-AWQ"]
    }
  }
}
```

### Performance Metrics
- **Model Size**: 3.69GB on disk
- **Load Time**: ~5 minutes (including download)
- **Compilation**: 31 seconds (torch.compile optimization)
- **Expected Speed**: 35-45 tokens/second
- **Stability**: No crashes, no integer overflow errors

### Key Advantages Over TGI
1. **Stability**: No integer overflow with AWQ quantization
2. **Memory Efficiency**: PagedAttention reduces waste by 95%
3. **API Compatibility**: Full `/v1/chat/completions` support
4. **Better Performance**: AWQ-marlin optimization available
5. **Production Ready**: No 560+ lines of error handling needed

### Recommendations
1. Use the HF Extension method - it's already configured and working
2. Consider switching to `--quantization awq_marlin` for faster inference
3. Monitor GPU memory with `nvidia-smi -l 1` during heavy usage
4. For production, consider setting up automatic restart policy

### Conclusion
vLLM deployment successful with DeepSeek-Coder-6.7B-AWQ running stably on RTX 4060 (8GB VRAM). The server provides full OpenAI API compatibility and integrates seamlessly with VS Code through the existing HF extension. This setup resolves all critical issues experienced with TGI while providing better performance and stability.