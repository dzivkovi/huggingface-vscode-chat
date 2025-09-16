# Local Inference Setup Guide

This guide covers setting up local AI models for air-gapped or on-premise deployments.

## Quick Decision Guide

- **Have NVIDIA GPU?** → Use vLLM (this guide)
- **CPU only?** → Skip to [CPU-Only section](#cpu-only-ollama)
- **Need 100% uptime?** → Use models with 8K+ context
- **Testing/Development?** → 2048-token models work with settings below

## Prerequisites

- Docker with GPU support (`nvidia-docker`)
- NVIDIA GPU with 6GB+ VRAM (RTX 3060 or better)
- VS Code with GitHub Copilot Chat extension

## Quick Start

### 1. Start vLLM Server

```bash
docker run -d --name vllm-server \
  --gpus all \
  --shm-size=4g \
  --ipc=host \
  -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model TheBloke/deepseek-coder-6.7B-instruct-AWQ \
  --quantization awq \
  --gpu-memory-utilization 0.85
```

**Critical**: The `--shm-size=4g` and `--ipc=host` flags are REQUIRED to prevent crashes.

### 2. Configure VS Code

Add to your `.vscode/settings.json`:

```json
{
  "huggingface.customTGIEndpoint": "http://localhost:8000",

  // CRITICAL for small models (2048-4096 tokens):
  // These reduce context usage by ~40% (from ~2100 to ~1300 tokens)
  "github.copilot.chat.editor.temporalContext.enabled": false,
  "github.copilot.chat.edits.temporalContext.enabled": false,
  "github.copilot.chat.edits.suggestRelatedFilesFromGitHistory": false
}
```

**Why these settings matter**: VS Code normally includes recent files and git history in context. With 2048-token models, this leaves almost no room for your actual question. These settings disable that automatic context inclusion.

### 3. Restart VS Code and Select Model

1. **Restart VS Code completely** (not just reload window)
2. Open GitHub Copilot Chat
3. Click model selector
4. Choose your local model (will appear as "model-name @ localhost")

## Model Selection by Hardware

| GPU VRAM | Recommended Model | Context | Speed | Docker Command |
|----------|------------------|---------|-------|----------------|
| 6-8GB | DeepSeek-Coder 6.7B AWQ | 2048 tokens | 5-8 tok/s | Use command above |
| 10-12GB | CodeLlama 13B AWQ | 16K tokens | 4-6 tok/s | Replace model with `TheBloke/CodeLlama-13B-Instruct-AWQ` |
| 16GB+ | DeepSeek-Coder 33B AWQ | 16K tokens | 3-5 tok/s | Replace model with `TheBloke/deepseek-coder-33b-instruct-AWQ` |
| 24GB+ | Mixtral 8x7B AWQ | 32K tokens | 2-4 tok/s | Replace model with `TheBloke/Mixtral-8x7B-Instruct-v0.1-AWQ` |

**Note on Context**: Small context models (2048 tokens) require the VS Code settings above to work properly. The extension uses 65% of context for input to account for vLLM's ~500 token template overhead.

## Troubleshooting

### Extension doesn't see the server
- Check server is running: `docker ps`
- Test endpoint: `curl http://localhost:8000/v1/models`
- Ensure no firewall blocking port 8000

### Token limit errors
- Add the VS Code settings shown above
- Close unnecessary files in VS Code
- Consider a model with larger context (8K+)

### Server crashes
- Ensure Docker flags `--shm-size=4g --ipc=host` are used
- Reduce `--gpu-memory-utilization` to 0.7
- Check GPU memory: `nvidia-smi`

## Advanced Configuration

### Custom Models
Replace the model in the docker command with any AWQ-quantized model from Hugging Face.

### Multiple GPUs
Add `--tensor-parallel-size 2` for dual-GPU setups.

### CPU-Only (Ollama)
For systems without GPUs, use Ollama instead of vLLM:
```bash
ollama serve
ollama pull deepseek-coder:6.7b
```

Then configure: `"huggingface.customTGIEndpoint": "http://localhost:11434"`

## Security Notes

- All processing stays on your local machine
- No API keys required for local mode
- No data leaves your network
- Perfect for air-gapped environments