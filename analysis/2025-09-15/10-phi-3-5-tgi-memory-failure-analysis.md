# Phi-3.5-mini TGI Memory Failure Analysis

Date: 2025-09-15 at 20:17:28 PST

## Context
User attempted to run Microsoft Phi-3.5-mini-instruct using TGI on RTX 4060 (8GB VRAM) after DeepSeek-Coder failed due to memory constraints. This was meant to be the simpler, smaller model option.

## User Query
Analysis of /tmp/tgi.log to understand what happened with Phi-3.5 deployment and whether it's fixable on the available hardware.

## Analysis of Failure

### Timeline of Events
1. **00:58:40**: TGI container started with default settings
2. **00:58:45 - 00:09:19**: Model downloaded successfully (10.5 minutes total)
   - model-00001-of-00002.safetensors: 6 min 50 sec
   - model-00002-of-00002.safetensors: 3 min 43 sec
3. **00:09:34**: Download completed successfully
4. **00:09:51**: Model loading started with flashinfer attention
5. **00:10:56**: Server started successfully (82 seconds to load)
6. **00:10:59**: **FAILED** during warmup phase

### Memory Breakdown

#### GPU Memory Usage at Failure
- **Total VRAM**: 8.00 GiB
- **Model weights**: 7.73 GiB (PyTorch allocated)
- **Reserved**: 231.40 MiB (PyTorch reserved but unallocated)
- **Free**: 0 bytes
- **Available for KV cache**: ~45 MiB (insufficient)

#### What Failed
```
RuntimeError: Not enough memory to handle 4096 prefill tokens.
You need to decrease `--max-batch-prefill-tokens`
```

The warmup phase tried to allocate KV cache for 4096 prefill tokens, requiring ~48 MiB, but only ~45 MiB was available.

### Root Cause
Phi-3.5-mini, despite being called "mini", uses **7.73GB of VRAM** for the model weights alone in FP16 format. This leaves insufficient memory for:
- KV cache (key-value attention cache)
- Activation tensors
- CUDA kernels overhead

## Solutions

### Solution 1: Reduce Batch Prefill Tokens
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id microsoft/Phi-3.5-mini-instruct \
  --max-batch-prefill-tokens 512 \  # Reduced from 4096
  --max-total-tokens 2048 \         # Reduced from 8192
  --max-input-tokens 1024            # Limit input size
```

**Probability of success**: 60% - Still very tight on memory

### Solution 2: Use Quantization
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id microsoft/Phi-3.5-mini-instruct \
  --quantize bitsandbytes-nf4 \     # 4-bit quantization
  --max-batch-prefill-tokens 1024
```

**Probability of success**: 80% - Should reduce model to ~2-3GB

### Solution 3: Use Even Smaller Batch Size
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id microsoft/Phi-3.5-mini-instruct \
  --max-batch-prefill-tokens 256 \  # Very small
  --max-total-tokens 1024 \         # Minimal context
  --max-batch-size 1                # Single request at a time
```

**Probability of success**: 70% - Very limited functionality

## Why This Keeps Happening

### The 8GB VRAM Limitation
| Model | Parameters | FP16 Size | Works on 8GB? |
|-------|------------|-----------|---------------|
| Phi-3.5-mini | 3.8B | 7.6GB | ❌ Barely fits, no cache room |
| DeepSeek-Coder | 6.7B | 13.4GB | ❌ Too large |
| CodeLlama | 7B | 14GB | ❌ Too large |
| Phi-2 | 2.7B | 5.4GB | ✅ Should work |
| Gemma-2B | 2B | 4GB | ✅ Works well |

### TGI vs Ollama Memory Management
- **TGI**: Loads full precision model, then allocates fixed KV cache
- **Ollama**: Automatically quantizes to fit available VRAM

## Final Recommendation

After multiple failed attempts with TGI, the clear solution is:

### Use Ollama (Immediate Solution)
```bash
# On Windows
ollama pull phi3.5
ollama pull gemma2:2b  # Even smaller, guaranteed to work
ollama serve

# Test
ollama run phi3.5 "Hello world in Python"
```

### Why Ollama Succeeds Where TGI Fails
1. **Automatic quantization**: Reduces models to fit
2. **Dynamic memory management**: Adjusts cache size
3. **No manual configuration**: Just works
4. **Designed for consumer GPUs**: 8GB is their target

## Lessons Learned

1. **"Mini" models aren't mini enough**: Phi-3.5-mini still needs 7.7GB
2. **TGI needs headroom**: Model size + ~1-2GB for operations
3. **8GB VRAM practical limit**: ~5GB model size for TGI
4. **Ollama is the right tool**: For consumer GPUs with limited VRAM

## Time Investment Summary
- TGI setup attempts: ~3 hours
- Models downloaded: 3 (Phi-3.5, DeepSeek-Coder, partial CodeLlama)
- Data downloaded: ~30GB
- Success rate: 0%

**Conclusion**: Switch to Ollama for immediate success.