# Pre-Built Extension Releases

Download the latest pre-built extension without compilation:

## 📦 **Quick Download**

### 🎉 vLLM Bridge v1.0.0
- **Unique Identity**: No more update prompts from marketplace
- **Air-gapped support**: Works without HuggingFace API key
- **Hybrid mode**: Use both local and cloud models simultaneously
- **Error resilience**: Local models remain available when HF auth fails

| Version | File | Download | Notes |
|---------|------|----------|-------|
| **Latest** | `vllm-huggingface-bridge-latest.vsix` | [Download](./vllm-huggingface-bridge-latest.vsix) | 🔥 v1.0.0 - Recommended |
| **v1.0.0** | `vllm-huggingface-bridge-1.0.0.vsix` | [Download](./vllm-huggingface-bridge-1.0.0.vsix) | vLLM + HuggingFace Bridge |

## 🚀 **Installation (3 Steps)**

### Method 1: VS Code Command (Recommended)
1. Download the `.vsix` file above
2. Open VS Code and press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type `Extensions: Install from VSIX...` and select the downloaded file

### Method 2: Command Line
```bash
# Uninstall old extension if present
code --uninstall-extension HuggingFace.huggingface-vscode-chat

# Install new vLLM Bridge
code --install-extension vllm-huggingface-bridge-latest.vsix
```

### Method 3: Extensions Panel
1. Download the `.vsix` file
2. Open VS Code Extensions panel (`Ctrl+Shift+X`)
3. Click the `...` menu → `Install from VSIX...`
4. Select your downloaded file

## ✅ **Verify Installation**
1. Restart VS Code
2. Check extensions: `code --list-extensions | grep vllm`
3. Open GitHub Copilot Chat
4. Click the model picker dropdown
5. Look for "vLLM + HuggingFace" provider option

## 🆚 **Installation Options Comparison**

| Method | Time | Technical Level | Best For |
|--------|------|----------------|----------|
| **📦 Pre-built VSIX** | 30 seconds | Any user | ✅ Business users |
| **🛍️ VS Code Marketplace** | 30 seconds | Any user | ✅ Public releases |
| **⚒️ Build from source** | 5-10 minutes | Developer | ⚠️ Development only |

---

💡 **Tip**: Bookmark this page for easy access to future releases!