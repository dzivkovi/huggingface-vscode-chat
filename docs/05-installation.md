# Installation Guide for Hugging Face VS Code Extension

## For Friends and Distribution

### Prerequisites
- VS Code installed
- GitHub Copilot extension installed and activated

### Installation Steps

#### Method 1: VSIX File Installation (Recommended)
1. Download the `huggingface-vscode-chat-0.0.5.vsix` file
2. Open VS Code
3. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
4. Type "Extensions: Install from VSIX"
5. Select the downloaded `.vsix` file
6. Click "Install"
7. Reload VS Code when prompted

#### Method 2: Command Line
```bash
code --install-extension huggingface-vscode-chat-0.0.5.vsix
```

### Configuration Options

#### Option 1: Use Hugging Face Router (Cloud)
Default configuration - requires API key. No settings changes needed, just:
1. Open VS Code's chat interface
2. Click the model picker and click "Manage Models..."
3. Select "Hugging Face" provider
4. Provide your Hugging Face Token

#### Option 2: Use Local vLLM Server (Recommended for Local)
For on-premise/air-gapped setups with GPU:
1. Start your vLLM server (see **[06-setup-vllm.md](./06-setup-vllm.md)**)
2. Open VS Code Settings (Ctrl+,)
3. Search for "huggingface.customTGIEndpoint"
4. Enter your vLLM server URL: `http://localhost:8000`
5. Reload VS Code when prompted

**Note**: Despite the setting name "customTGIEndpoint", this works perfectly with vLLM servers.

#### Option 3: Use Local TGI Server (Legacy/Deprecated)
⚠️ **Not recommended due to stability issues**
1. Start your TGI server (see **[04-setup-tgi.md](./04-setup-tgi.md)**)
2. Open VS Code Settings (Ctrl+,)
3. Search for "huggingface.customTGIEndpoint"
4. Enter your TGI server URL: `http://localhost:8080`
5. Reload VS Code when prompted

#### Option 4: Use Local Ollama (CPU-Only)
For systems without NVIDIA GPUs:
```json
{
  "huggingface.inferenceBackend": "ollama",
  "huggingface.baseUrl": "http://localhost:11434/v1",
  "huggingface.requiresApiKey": false
}
```

**Setup Required**: Install Ollama from [ollama.ai](https://ollama.ai) and pull a coding model.

### How to Use

1. **Open GitHub Copilot Chat**
   - Press `Ctrl+Shift+P` and type "GitHub Copilot Chat: Open Chat"
   - Or use the chat icon in the sidebar

2. **Select Hugging Face Provider**
   - Click the model selector dropdown at the top of the chat panel
   - Choose "Hugging Face" from the available providers

3. **Start Chatting**
   - Type your coding questions or requests
   - The extension will use your configured backend (Router/TGI/Ollama)

### Troubleshooting

#### Extension Not Appearing
- Ensure GitHub Copilot is installed and activated
- Reload VS Code after installation
- Check the Extensions panel to confirm installation

#### No Models Available
- **For Router**: Check your API key in settings
- **For TGI**: Ensure TGI server is running on the configured port
- **For Ollama**: Ensure Ollama is running with models pulled

#### Connection Errors
- Verify the `baseUrl` in settings matches your server
- Check firewall settings for local servers
- Ensure the inference backend is running and accessible

### For Developers

See **[03-setup-development.md](./03-setup-development.md)** for complete development setup, build process, packaging instructions, and testing procedures.

### Support

For issues or questions:
- Check the extension logs in VS Code Output panel
- Verify your configuration matches the examples above
- Ensure your inference backend (Router/TGI/Ollama) is properly configured