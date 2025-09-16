# Native VS Code GitHub Copilot Custom Models Configuration Guide

**Date**: 2025-09-15 at 23:30:12 UTC

## Context

User discovered that GitHub Copilot now has native support for custom AI model providers, including OpenAI-compatible endpoints like TGI servers. This discovery potentially makes our custom Hugging Face extension redundant for basic TGI integration. User requested guidance on adding their already-running TGI server directly to VS Code without any plugins.

## Key Discovery

GitHub Copilot Chat in VS Code now natively supports:
- Custom model providers (Ollama, OpenAI-compatible endpoints)
- Direct "Manage Models" UI in Copilot Chat
- API key and endpoint configuration
- Self-hosted models with function calling support

## Complete Guide: Adding TGI Server to VS Code GitHub Copilot

### Prerequisites (Already Met)
1. **TGI Server Running**: Docker TGI server on `localhost:8080` ✅
2. **VS Code with GitHub Copilot**: Already installed ✅
3. **API Endpoint**: TGI provides OpenAI-compatible `/v1/chat/completions` ✅

### Method 1: Direct Addition (Recommended)

#### Steps:
1. **Open GitHub Copilot Chat**
   - Click Copilot icon in VS Code's Activity Bar
   - Or use `Ctrl+Alt+I` (Windows) / `Cmd+Option+I` (Mac)

2. **Access Model Management**
   - Click dropdown showing "CURRENT-MODEL" at top of chat panel
   - Select **"Manage Models"**

3. **Add Custom Provider**
   - Select **"Custom"** or **"OpenAI-compatible"** from provider list
   - Alternative: Try "Ollama" option (TGI is OpenAI-compatible)

4. **Configure TGI Server**
   - **Endpoint URL**: `http://localhost:8080/v1`
   - **API Key**: Leave empty or enter dummy value
   - **Model Name**: `tgi` or actual model name (e.g., `starcoder2-3b`)
   - **Enable Function Calling**: ✅ Check this box

5. **Save and Test**
   - Click "OK" or "Add Model"
   - TGI server should appear in model picker
   - Test with coding question

### Method 2: Using LiteLLM Proxy (Alternative)

If direct method doesn't work:

1. **Install LiteLLM**
   ```bash
   pip3 install "litellm[proxy]"
   ```

2. **Create Configuration** (`litellm_config.yaml`)
   ```yaml
   model_list:
     - model_name: tgi-starcoder
       litellm_params:
         model: openai/gpt-3.5-turbo
         api_base: "http://localhost:8080/v1"
         api_key: "dummy-key"
   ```

3. **Start Proxy**
   ```bash
   litellm --config litellm_config.yaml --port 11434
   ```

4. **Add as Ollama Provider**
   - Select "Ollama" in "Manage Models"
   - Endpoint: `http://localhost:11434`
   - Model: `tgi-starcoder`

### TGI Endpoint Verification

Test endpoints:
```bash
# Health check
curl http://localhost:8080/health

# Models list
curl http://localhost:8080/v1/models

# Chat completion test
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "tgi", "messages": [{"role": "user", "content": "Hello"}]}'
```

## Impact on Custom Extension Development

### What This Means:
1. **TGI/Ollama/Custom**: Can use VS Code's built-in model management
2. **HF Router Integration**: Extension still valuable for model discovery
3. **Enterprise Features**: Extension provides VS Code settings-based configuration

### Architecture Decision:
- **Native Support Exists**: GitHub Copilot handles OpenAI-compatible endpoints
- **Extension Value**: Primarily for HF Router model discovery and metadata
- **Recommendation**: Use native Copilot for TGI, keep extension for HF Router features

### Benefits of Native Approach:
- ✅ No custom extension needed
- ✅ Native integration with Copilot Chat UI
- ✅ Simple configuration (just endpoint and model)
- ✅ Maintained by Microsoft/GitHub

## Sources Referenced

1. **LinkedIn Article**: Aymen Furter's guide on connecting custom models to GitHub Copilot
2. **VS Code Documentation**: Language model customization via Context7 MCP
3. **GitHub Documentation**: Official docs on changing chat models
4. **VS Code API**: Chat model management commands and configuration

## Conclusion

The discovery of native custom model support in GitHub Copilot significantly simplifies the architecture. For TGI server integration, the built-in VS Code model management is sufficient. The custom Hugging Face extension remains valuable primarily for HF Router integration and advanced model discovery features, but is no longer necessary for basic TGI server connectivity.