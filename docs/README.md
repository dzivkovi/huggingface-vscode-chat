# vLLM HuggingFace Bridge Documentation

Quick guides for using the VS Code extension with local AI models.

## Getting Started

1. **[Installation Guide](./installation.md)** - Install the extension
2. **[Local Setup](./local-setup.md)** - Run AI models on your machine
3. **[Configuration](./configuration.md)** - Customize settings

## Quick Start

### For Local vLLM Users
```json
{
  "huggingface.localEndpoint": "http://localhost:8000"
}
```

### For Cloud Users
No configuration needed - just provide your HuggingFace token when prompted.

## Need Help?

- **Extension not connecting?** See [Local Setup](./local-setup.md#troubleshooting)
- **Token limit errors?** See [Configuration](./configuration.md#token-allocation)
- **Report issues:** [GitHub Issues](https://github.com/dzivkovi/vllm-huggingface-bridge/issues)