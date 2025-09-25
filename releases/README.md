# Pre-Built Extension Releases

Download the latest pre-built extension without compilation:

## 📦 **Quick Download**

### 🎉 New in v0.0.6 (2025-09-25)
- **Air-gapped support**: Works without HuggingFace API key
- **Hybrid mode**: Use both local and cloud models simultaneously
- **Error resilience**: Local models remain available when HF auth fails
- **Team defaults**: Pre-configured for Siemens team server
- **User notifications**: Warnings when endpoints are unreachable

| Version | File | Download | Notes |
|---------|------|----------|-------|
| **Latest** | `huggingface-vscode-chat-latest.vsix` | [Download](./huggingface-vscode-chat-latest.vsix) | 🔥 v0.0.6 - Recommended |
| **v0.0.6** | `huggingface-vscode-chat-0.0.6.vsix` | [Download](./huggingface-vscode-chat-0.0.6.vsix) | Local inference + Error resilience |
| **v0.0.5** | `huggingface-vscode-chat-0.0.5.vsix` | [Download](./huggingface-vscode-chat-0.0.5.vsix) | Previous stable |

## 🚀 **Installation (3 Steps)**

### Method 1: VS Code Command (Recommended)
1. Download the `.vsix` file above
2. Open VS Code and press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type `Extensions: Install from VSIX...` and select the downloaded file

### Method 2: Command Line
```bash
# Download first, then:
code --install-extension huggingface-vscode-chat-latest.vsix
```

### Method 3: Extensions Panel
1. Download the `.vsix` file
2. Open VS Code Extensions panel (`Ctrl+Shift+X`)
3. Click the `...` menu → `Install from VSIX...`
4. Select your downloaded file

## ✅ **Verify Installation**
1. Restart VS Code
2. Open GitHub Copilot Chat
3. Click the model picker dropdown
4. Look for "Hugging Face" provider option

## 🆚 **Installation Options Comparison**

| Method | Time | Technical Level | Best For |
|--------|------|----------------|----------|
| **📦 Pre-built VSIX** | 30 seconds | Any user | ✅ Business users |
| **🛍️ VS Code Marketplace** | 30 seconds | Any user | ✅ Public releases |
| **⚒️ Build from source** | 5-10 minutes | Developer | ⚠️ Development only |

---

💡 **Tip**: Bookmark this page for easy access to future releases!