# vLLM Setup Guide for RTX 4060 (8GB VRAM)

Date: 2025-09-16

## Why vLLM over TGI?

Based on 24-hour debugging experience:
- **TGI Issues**: Integer overflow crashes with bitsandbytes-nf4 quantization
- **vLLM Advantages**: PagedAttention (95% less memory waste), stable AWQ quantization, full OpenAI API compatibility

## Quick Start (Docker)

### 1. Pull vLLM Docker Image

```bash
docker pull vllm/vllm-openai:latest
```

### 2. Run vLLM with Optimized Settings for RTX 4060

```bash
# Using DeepSeek-Coder-6.7B with AWQ quantization (recommended)
docker run --gpus all \
  --shm-size=4g \
  --ipc=host \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model TheBloke/deepseek-coder-6.7B-instruct-AWQ \
  --quantization awq \
  --gpu-memory-utilization 0.85 \
  --max-model-len 2048 \
  --max-num-seqs 16
```

### Alternative Models for 8GB VRAM

```bash
# Option 1: Qwen2.5-Coder-7B with AWQ
docker run --gpus all \
  --shm-size=4g \
  --ipc=host \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model Qwen/Qwen2.5-Coder-7B-Instruct-AWQ \
  --quantization awq \
  --gpu-memory-utilization 0.85 \
  --max-model-len 2048

# Option 2: StarCoder2-3B (smaller, faster)
docker run --gpus all \
  --shm-size=4g \
  --ipc=host \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model bigcode/starcoder2-3b \
  --gpu-memory-utilization 0.9 \
  --max-model-len 4096
```

## Key Parameters for RTX 4060

- `--gpu-memory-utilization 0.85`: Leave 15% VRAM for overhead
- `--max-model-len 2048`: Limit context length to fit in memory
- `--quantization awq`: Use AWQ for stable quantization
- `--shm-size=4g`: Adequate shared memory for tensor operations
- `--ipc=host`: Required for proper shared memory access

## Native Python Installation (Alternative)

If Docker doesn't work, use native installation:

```bash
# Create virtual environment
python -m venv vllm-env
source vllm-env/bin/activate

# Install vLLM
pip install vllm

# Run server
python -m vllm.entrypoints.openai.api_server \
  --model TheBloke/deepseek-coder-6.7B-instruct-AWQ \
  --quantization awq \
  --gpu-memory-utilization 0.85 \
  --max-model-len 2048 \
  --port 8000
```

## VS Code Configuration with HF Extension

Your Hugging Face extension supports vLLM via the TGI endpoint configuration:

### Using the HF Extension (Recommended)

1. Configure in `.vscode/settings.json`:
```json
{
  "huggingface.customTGIEndpoint": "http://localhost:8000"
}
```

2. Reload VS Code window (Ctrl/Cmd + Shift + P → "Developer: Reload Window")
3. Open GitHub Copilot Chat
4. Select "Hugging Face" as provider
5. Choose "TGI" model from dropdown (this connects to your vLLM server)

Note: The extension calls it "TGI" but works with any OpenAI-compatible endpoint including vLLM.

## Testing the Setup

1. Check health endpoint:
```bash
curl http://localhost:8000/health
```

2. List available models:
```bash
curl http://localhost:8000/v1/models
```

3. Test chat completion:
```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "TheBloke/deepseek-coder-6.7B-instruct-AWQ",
    "messages": [{"role": "user", "content": "Write hello world in Python"}]
  }'
```

## Memory Management Tips

### If you encounter OOM errors:

1. **Reduce max-model-len**:
   ```bash
   --max-model-len 1024  # Start small
   ```

2. **Enable CPU offloading** (slower but more memory):
   ```bash
   --cpu-offload-gb 2  # Offload 2GB to CPU
   ```

3. **Lower GPU utilization**:
   ```bash
   --gpu-memory-utilization 0.75
   ```

## Performance Expectations

| Model | VRAM Usage | Tokens/sec | Notes |
|-------|------------|------------|-------|
| DeepSeek-Coder-6.7B-AWQ | ~6.5GB | 35-45 | Best balance |
| Qwen2.5-Coder-7B-AWQ | ~7GB | 30-40 | Slightly larger |
| StarCoder2-3B | ~4GB | 50-60 | Fastest, smallest |

## Troubleshooting

### Container won't start
- Check GPU driver: `nvidia-smi`
- Verify Docker GPU support: `docker run --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi`

### Model download hangs
- First download takes 10-20 minutes
- Mount cache directory to persist: `-v ~/.cache/huggingface:/root/.cache/huggingface`

### Out of memory errors
- Use smaller model or more aggressive quantization
- Reduce `--max-model-len`
- Lower `--gpu-memory-utilization`

### Chat completions not working
- vLLM has full `/v1/chat/completions` support (unlike TGI)
- Check model name matches exactly in requests

## Comparison with TGI

| Feature | TGI | vLLM |
|---------|-----|------|
| Memory Management | Basic | PagedAttention (95% efficient) |
| Chat Endpoint | ❌ Broken | ✅ Works |
| Quantization Stability | ❌ Integer overflow | ✅ Stable AWQ |
| Setup Complexity | 560+ lines error handling | Simple Docker command |
| Server Stability | Crashes after 24s | Production-ready |

## Next Steps

1. Start with StarCoder2-3B for quick testing
2. Move to DeepSeek-Coder-6.7B-AWQ for better quality
3. Monitor VRAM usage with `nvidia-smi -l 1`
4. Adjust parameters based on your usage patterns

## Alternative: Ollama (Simplest Option)

If vLLM still seems complex, Ollama is the simplest:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull qwen2.5-coder:7b

# Run server
ollama serve

# Configure VS Code to use http://localhost:11434/v1
```

Ollama pros:
- Automatic quantization
- 52-53 tokens/sec on RTX 4060
- Zero configuration
- Native Windows support