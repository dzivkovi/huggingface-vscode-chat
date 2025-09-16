# TGI Setup Guide for Hugging Face VS Code Extension

> **⚠️ DEPRECATED**: TGI support is being phased out due to stability issues and memory crashes. **We recommend using [vLLM](./06-setup-vllm.md) instead** for better performance and reliability.

This guide explains how to use the Hugging Face VS Code extension with a local Text Generation Inference (TGI) server for air-gapped and on-premise deployments.

## Prerequisites

- NVIDIA GPU with CUDA support (8GB+ VRAM recommended)
- Docker installed with GPU support
- VS Code with the Hugging Face extension installed

## Step 1: Start TGI Server

### Working Configuration for StarCoder2-3B

```bash
docker run --rm --gpus all -p 8080:80 \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id bigcode/starcoder2-3b \
  --quantize bitsandbytes-nf4 \
  --max-total-tokens 8192 \
  --max-input-tokens 4096
```

**Important Parameters:**
- `--max-input-tokens 4096` - **Required** to avoid AssertionError on startup
- `--quantize bitsandbytes-nf4` - Reduces memory usage for 8GB GPUs
- `-v $PWD/data:/data` - Mounts local cache to avoid re-downloading models

### Alternative Models (Untested)

For larger models (requires more VRAM):
```bash
# Qwen2.5-Coder-7B (may require 16GB+ VRAM)
docker run --rm --gpus all -p 8080:80 \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id Qwen/Qwen2.5-Coder-7B-Instruct \
  --quantize bitsandbytes-nf4 \
  --max-batch-prefill-tokens 2048 \
  --max-total-tokens 4096 \
  --max-input-tokens 2048
```

## Step 2: Configure VS Code Extension

### Method 1: Using VS Code Settings (Recommended)

1. Open VS Code settings (Cmd/Ctrl + ,)
2. Search for "huggingface"
3. Configure the following:

```json
{
  "huggingface.inferenceBackend": "tgi",
  "huggingface.baseUrl": "http://localhost:8080",
  "huggingface.requiresApiKey": false,
  "huggingface.defaultMaxTokens": 16000,
  "huggingface.defaultContextLength": 128000
}
```

### Method 2: Settings.json

Add to your workspace or user `settings.json`:

```json
{
  "huggingface.inferenceBackend": "tgi",
  "huggingface.baseUrl": "http://localhost:8080",
  "huggingface.requiresApiKey": false
}
```

### Method 3: Custom Endpoint

For remote TGI servers or different ports:

```json
{
  "huggingface.inferenceBackend": "custom",
  "huggingface.baseUrl": "http://your-server:8080",
  "huggingface.requiresApiKey": false
}
```

## Step 3: Test the Connection

1. Open GitHub Copilot Chat in VS Code
2. Select "Hugging Face" as the model provider
3. Type a test prompt like "Write a hello world function"
4. The response should come from your local TGI server

## Troubleshooting

### Common Issues

#### Out of Memory Error
- **Symptom**: "torch.OutOfMemoryError: CUDA out of memory"
- **Solution**: Use smaller models or increase quantization
- **Working Model**: StarCoder2-3B with bitsandbytes-nf4

#### AssertionError on Startup
- **Symptom**: `assert max_input_tokens is not None`
- **Solution**: Add `--max-input-tokens 4096` parameter

#### Model Download Takes Forever
- **Solution**: Mount a local directory with `-v $PWD/data:/data` to cache models
- **Note**: First download takes 10-20 minutes for large models

#### Cannot Connect to Server
- **Check**: Is TGI running? `docker ps | grep text-generation`
- **Check**: Is port 8080 accessible? `curl http://localhost:8080/health`
- **Check**: Firewall settings if using remote server

### Performance Metrics (RTX 4060 8GB)

| Model | VRAM Usage | Tokens/sec | Status |
|-------|------------|------------|--------|
| StarCoder2-3B | 6.6GB | ~37 | ✅ Working |
| DeepSeek-Coder-6.7B | 13.4GB | N/A | ❌ OOM |
| Phi-3.5-mini | 7.7GB | N/A | ❌ OOM (KV cache) |
| Qwen2.5-Coder-7B | ~14GB | N/A | ❌ Not tested |

## Advanced Configuration

### For Air-Gapped Environments

1. Pre-download models on a connected system:
```bash
# Download model files
docker run --rm -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id bigcode/starcoder2-3b \
  --download-only
```

2. Transfer the `data/` folder to your air-gapped system

3. Run TGI with the cached model:
```bash
docker run --rm --gpus all -p 8080:80 \
  -v /path/to/data:/data \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id bigcode/starcoder2-3b \
  --quantize bitsandbytes-nf4 \
  --max-total-tokens 8192 \
  --max-input-tokens 4096
```

### Multiple Models

To switch between models without re-downloading:
1. Keep different models in the same `data/` directory
2. Stop current container: `docker stop <container-id>`
3. Start new container with different `--model-id`

## Alternative: Ollama

If TGI doesn't work for your use case (CPU-only systems, easier setup), consider Ollama:

```json
{
  "huggingface.inferenceBackend": "ollama",
  "huggingface.baseUrl": "http://localhost:11434/v1",
  "huggingface.requiresApiKey": false
}
```

See **[05-installation.md](./05-installation.md)** Option 3 for Ollama configuration details.

## Notes

- TGI requires NVIDIA GPU with CUDA support
- Models are cached in `data/hub/` directory (12GB+ for each model)
- Add `data/` to `.gitignore` to avoid committing model files
- Startup time: ~90 seconds after model is cached
- First-time model download: 10-20 minutes depending on size

## Support

For issues or questions:
- Check TGI logs: `docker logs <container-id>`
- View extension logs: VS Code Output panel → "Hugging Face"
- File issues: https://github.com/huggingface/huggingface-vscode-chat/issues