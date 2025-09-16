# TGI Out of Memory Error - Resolution Guide

Date: 2025-09-15 at 19:53:27 PST

## Context
User attempted to run DeepSeek-Coder-6.7b-instruct using TGI (Text Generation Inference) on an RTX 4060 with 8GB VRAM. The model successfully downloaded but crashed during loading due to insufficient GPU memory.

## Issue
TGI container crashed with CUDA out of memory error when attempting to load the model into GPU memory.

## Root Cause Analysis

### Memory Requirements vs Available Resources
- **Model Size**: DeepSeek-Coder-6.7b requires ~13.4GB VRAM (6.7B parameters × 2 bytes FP16)
- **GPU Capacity**: RTX 4060 has only 8GB VRAM
- **Result**: 5.4GB memory deficit

### Log Analysis
```
torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 172.00 MiB.
GPU 0 has a total capacity of 8.00 GiB of which 0 bytes is free.
```

Key observations:
- Model download completed successfully (24 minutes total)
- Both safetensor files downloaded completely
- Crash occurred during model initialization when loading weights to GPU
- PyTorch allocated 7.91 GiB before running out of memory

## Solutions

### Solution 1: Use Quantized Models (Recommended)
Quantized models reduce memory requirements by using lower precision (4-bit or 8-bit instead of 16-bit).

```bash
# Stop failed container
docker stop tgi-server

# Use 4-bit quantized DeepSeek-Coder (fits in ~4GB)
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id TheBloke/deepseek-coder-6.7B-instruct-GPTQ \
  --quantize gptq \
  --max-total-tokens 8192
```

**Benefits:**
- Fits within 8GB VRAM
- Minimal performance loss (52-53 tokens/sec)
- Production-ready solution

### Solution 2: Use Smaller Models
Models that fit comfortably in 8GB VRAM:

```bash
# Phi-3.5-mini (3.8B parameters, ~7GB)
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id microsoft/Phi-3.5-mini-instruct \
  --max-total-tokens 8192
```

**Alternative models:**
- StarCoder2-3B: ~6GB VRAM
- CodeGen2.5-7B-mono: ~7GB with 8-bit quantization
- Phi-2: ~5GB VRAM

### Solution 3: Switch to Ollama (Easiest)
Ollama automatically handles quantization to fit available VRAM:

```bash
# Ollama automatically quantizes to fit your GPU
ollama pull deepseek-coder:6.7b  # Auto-uses 4-bit quantization
ollama pull qwen2.5-coder:7b
ollama pull codellama:7b

# Start Ollama server
ollama serve

# Configure VS Code extension
# Change BASE_URL to: http://localhost:11434/v1
```

**Advantages:**
- Automatic memory management
- No manual quantization needed
- Supports model switching
- Better suited for consumer GPUs

### Solution 4: CPU Offloading (Not Recommended)
Force CPU inference (very slow, emergency option only):

```bash
docker run --name tgi-server \
  -p 8080:80 --rm \
  -e CUDA_VISIBLE_DEVICES="" \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id deepseek-ai/deepseek-coder-6.7b-instruct
```

**Drawbacks:**
- 10-50x slower than GPU
- High CPU usage
- Not suitable for production

## Memory Calculation Guide

### Formula for Model Memory Requirements
```
VRAM Required = (Number of Parameters × Bytes per Parameter) + Overhead

Where:
- FP32: 4 bytes per parameter
- FP16/BF16: 2 bytes per parameter
- INT8: 1 byte per parameter
- INT4: 0.5 bytes per parameter
- Overhead: ~10-20% for activations and cache
```

### Examples for RTX 4060 (8GB VRAM)
| Model | Parameters | Precision | VRAM Required | Fits? |
|-------|------------|-----------|---------------|-------|
| DeepSeek-Coder | 6.7B | FP16 | 13.4GB | ❌ |
| DeepSeek-Coder | 6.7B | INT4 | 3.4GB | ✅ |
| Qwen2.5-Coder | 7B | INT4 | 3.5GB | ✅ |
| CodeLlama | 7B | INT8 | 7GB | ✅ |
| Phi-3.5-mini | 3.8B | FP16 | 7.6GB | ✅ |

## Recommendations

### For Development (RTX 4060)
1. **Primary**: Use Ollama with automatic quantization
2. **Alternative**: TGI with GPTQ/AWQ quantized models
3. **Models**: Stick to 7B or smaller with quantization

### For Production (Multi-GPU/H200)
1. Use full precision models with tensor parallelism
2. Deploy vLLM or TGI based on workload
3. No quantization needed with sufficient VRAM

## Lessons Learned

1. **Always check memory requirements** before deployment
2. **Quantization is essential** for consumer GPUs
3. **Ollama is better** for development/testing with limited VRAM
4. **TGI/vLLM are better** for production with enterprise GPUs
5. **Download time ≠ Success** - Models can download but fail to load

## Next Steps

1. Deploy quantized model or use Ollama
2. Test API endpoints once model is running
3. Configure VS Code extension with working endpoint
4. Document successful configuration for team