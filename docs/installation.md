# Installation Guide

## Prerequisites
- VS Code installed
- GitHub Copilot extension installed and activated

## Install Extension

### Option 1: From VSIX File
```bash
code --install-extension vllm-huggingface-bridge-*.vsix
```

Or in VS Code:
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Extensions: Install from VSIX"
3. Select the `.vsix` file

### Option 2: From Releases
Download the latest `.vsix` from [Releases](https://github.com/dzivkovi/vllm-huggingface-bridge/releases)

## Choose Your Setup

### Cloud Models (Default)
1. Open GitHub Copilot Chat
2. Click model selector → "Manage Models..."
3. Select "Hugging Face" provider
4. Enter your HuggingFace token

### Local Models
Add to `.vscode/settings.json`:
```json
{
  "huggingface.localEndpoint": "http://localhost:8000"
}
```

Then see [Local Setup Guide](./local-setup.md) to start your vLLM server.

## Verify Installation

1. Restart VS Code
2. Open GitHub Copilot Chat
3. Your models should appear in the model selector

## Uninstall

```bash
code --uninstall-extension vllm-community.vllm-huggingface-bridge
```