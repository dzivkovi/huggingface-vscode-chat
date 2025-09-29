# Local AI Setup

## Quick Start with vLLM

### 1. Start Server
```bash
docker run -d --name vllm-server \
  --gpus all \
  --shm-size=4g \
  -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model TheBloke/deepseek-coder-6.7B-instruct-AWQ \
  --quantization awq \
  --gpu-memory-utilization 0.85
```

### 2. Configure VS Code
```json
{
  "huggingface.localEndpoint": "http://localhost:8000"
}
```

### 3. Select Model
Restart VS Code → Open Copilot Chat → Select your local model

## Model Selection

| GPU VRAM | Model | Command Addition |
|----------|-------|-----------------|
| 6-8GB | DeepSeek 6.7B | (use command above) |
| 10-12GB | CodeLlama 13B | `--model TheBloke/CodeLlama-13B-Instruct-AWQ` |
| 16GB+ | DeepSeek 33B | `--model TheBloke/deepseek-coder-33b-instruct-AWQ` |

## CPU-Only Setup (Ollama)

```bash
# Install and run
ollama serve
ollama pull deepseek-coder:6.7b

# Configure VS Code
{
  "huggingface.localEndpoint": "http://localhost:11434/v1"
}
```

## Troubleshooting

### Extension doesn't see server
```bash
# Test endpoint
curl http://localhost:8000/v1/models
```

### Token limit errors
Add to settings:
```json
{
  "github.copilot.chat.editor.temporalContext.enabled": false,
  "github.copilot.chat.edits.temporalContext.enabled": false
}
```

### Server crashes
- Check Docker flags: `--shm-size=4g` is required
- Reduce GPU memory: `--gpu-memory-utilization 0.7`
- Check GPU: `nvidia-smi`