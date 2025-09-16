# VS Code Extension: Marketplace vs Local Installation Troubleshooting

**Date**: 2025-09-15 at 22:19:32 UTC

## Context

User had installed the Hugging Face VS Code extension but couldn't see the new multi-backend configuration settings (dropdown with Router/TGI/Ollama/Custom options). Screenshots showed the official marketplace version was installed instead of the custom-built local version with enhanced features.

## User Issue

"I did install the Vscode extension in my Vscode instance in WSL2, but now when I'm looking at the screen, I don't see any settings, and how do I know it's my version not the main Hugging Face version that I removed earlier."

**Screenshots showed:**
1. VS Code displaying "No Settings Found" when searching for huggingface settings
2. Extension page showing official "Hugging Face Provider for GitHub Copilot Chat" v0.0.5 from marketplace
3. Missing the new configuration dropdown that should include backend selection

## Root Cause Analysis

**Problem**: VS Code WSL2 automatically installed the official marketplace extension (`huggingface.huggingface-vscode-chat`) instead of the user's custom-built local `.vsix` file.

**Evidence:**
- Extension identifier: `huggingface.huggingface-vscode-chat` (marketplace)
- Version: 0.0.5 published 2025-09-11
- Missing settings: No "Inference Backend" dropdown configuration
- "No Settings Found" message when searching for huggingface settings

## Configuration Differences

### Marketplace Version (Official)
- Single backend: Hugging Face Router only
- Cloud-only inference
- Limited configuration options
- No multi-backend support

### Custom Local Version (Enhanced)
- **Multi-backend support**: Router, TGI, Ollama, Custom
- **Configurable base URL**: Support for localhost and enterprise endpoints
- **API key management**: Conditional authentication based on backend
- **Enhanced settings**: Context length, max tokens, backend selection dropdown

## Resolution Steps

### 1. Remove Marketplace Version
```bash
# Find installed extension
code --list-extensions | grep -i hug
# Result: huggingface.huggingface-vscode-chat

# Uninstall marketplace version
code --uninstall-extension huggingface.huggingface-vscode-chat
# Result: Extension successfully uninstalled from WSL: Ubuntu
```

### 2. Install Custom Local Version
```bash
# Install from local VSIX file
code --install-extension ./huggingface-vscode-chat-0.0.5.vsix
# Result: Extension successfully installed
```

### 3. Verification Steps
1. **Reload VS Code**: Ctrl+Shift+P → "Developer: Reload Window"
2. **Check settings**: Ctrl+, → Search "huggingface"
3. **Verify dropdown**: Should show "Inference Backend" with 4 options
4. **Test configuration**: Set backend to "tgi" for local TGI server

## Expected Post-Fix Configuration

After successful installation, user should see these VS Code settings:

```json
{
  "huggingface.inferenceBackend": "tgi",           // Dropdown: router|tgi|ollama|custom
  "huggingface.baseUrl": "http://localhost:8080",  // Auto-set for TGI
  "huggingface.requiresApiKey": false,             // Auto-disabled for local
  "huggingface.defaultMaxTokens": 16000,
  "huggingface.defaultContextLength": 128000
}
```

## VS Code WSL2 Extension Behavior

**Key Learning**: VS Code in WSL2 can install marketplace extensions automatically when extension names match, even when trying to install local VSIX files. Always verify the actual installed extension identifier and uninstall marketplace versions before installing custom builds.

**Prevention**: Future installations should:
1. Check existing extensions first: `code --list-extensions`
2. Uninstall any conflicting marketplace versions
3. Install local VSIX explicitly
4. Reload window to activate changes
5. Verify settings are available

## Testing Next Steps

With the correct extension installed, user should:
1. Verify TGI server is running on localhost:8080
2. Configure VS Code settings for TGI backend
3. Test GitHub Copilot Chat with local inference
4. Confirm streaming responses from local TGI server

This troubleshooting session highlighted the importance of extension identity verification in VS Code, especially when developing custom versions of existing marketplace extensions.