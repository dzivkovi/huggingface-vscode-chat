# Ungated Coding Models for TGI on RTX 4060 (8GB VRAM)

Date: 2025-09-15 at 20:45:00 PST

## Issue: CodeGemma is Gated
CodeGemma models require authentication and approval from Google. The error message:
```
GatedRepoError: Access to model google/codegemma-2b is restricted.
You must have access to it and be authenticated to access it.
```

## Alternative Open Coding Models (No Authentication Required)

### 🌟 **StarCoder2-3B** (RECOMMENDED)
- **Size**: 3B parameters, ~6GB FP16
- **VRAM**: Fits perfectly on 8GB with room for KV cache
- **Specialization**: Trained on 17 programming languages
- **Authentication**: NO - Completely open
- **License**: Permissive, commercial use allowed

#### TGI Installation:
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id bigcode/starcoder2-3b \
  --max-batch-prefill-tokens 2048 \
  --max-total-tokens 4096
```

### 🚀 **DeepSeek-Coder-1.3B**
- **Size**: 1.3B parameters, ~2.6GB FP16
- **VRAM**: Runs with plenty of headroom
- **Performance**: Competitive with larger models
- **Authentication**: NO - Open access

#### TGI Installation:
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id deepseek-ai/deepseek-coder-1.3b-instruct \
  --max-batch-prefill-tokens 4096 \
  --max-total-tokens 8192
```

### 💡 **TinyLlama-1.1B**
- **Size**: 1.1B parameters, ~2.2GB FP16
- **VRAM**: Minimal requirements
- **Note**: General purpose, not code-specific
- **Authentication**: NO - Fully open

#### TGI Installation:
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id TinyLlama/TinyLlama-1.1B-Chat-v1.0 \
  --max-batch-prefill-tokens 4096 \
  --max-total-tokens 8192
```

### 🔧 **Replit-Code-v1.5-3B**
- **Size**: 3B parameters
- **Specialization**: Code completion and generation
- **Authentication**: NO - Open model
- **Note**: Optimized for code tasks

#### TGI Installation:
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id replit/replit-code-v1_5-3b \
  --max-batch-prefill-tokens 2048 \
  --max-total-tokens 4096
```

## Quantized Options for Better Performance

### StarCoder2-3B with Quantization (Recommended)
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id bigcode/starcoder2-3b \
  --quantize bitsandbytes-nf4 \
  --max-batch-prefill-tokens 4096 \
  --max-total-tokens 8192
```
**Benefits**: Reduces to ~1.5GB VRAM, allows larger context

## Comparison Table

| Model | Size | FP16 VRAM | INT4 VRAM | Coding Focus | Auth Required |
|-------|------|-----------|-----------|--------------|---------------|
| StarCoder2-3B | 3B | 6GB | 1.5GB | ✅ Excellent | ❌ No |
| DeepSeek-Coder-1.3B | 1.3B | 2.6GB | 0.7GB | ✅ Excellent | ❌ No |
| CodeGemma-2B | 2B | 4.7GB | 1.2GB | ✅ Excellent | ✅ Yes (Gated) |
| Gemma-3-1B | 1B | 2GB | 0.5GB | ⚠️ General | ✅ Yes (Gated) |
| TinyLlama-1.1B | 1.1B | 2.2GB | 0.6GB | ⚠️ General | ❌ No |
| Replit-Code-v1.5 | 3B | 6GB | 1.5GB | ✅ Good | ❌ No |

## Final Recommendation

### For Your RTX 4060 (8GB VRAM):

1. **Start with StarCoder2-3B**
   - Best balance of size and coding capability
   - No authentication required
   - Well-tested with TGI
   - Active community support

2. **If StarCoder2 is too large**: Use DeepSeek-Coder-1.3B
   - Much smaller footprint
   - Still excellent for coding
   - Leaves room for large contexts

3. **For maximum context**: Use quantized StarCoder2-3B
   - INT4 quantization reduces to ~1.5GB
   - Allows 16K+ context windows
   - Minor quality trade-off

## Quick Test After Installation

```bash
# Test the model
curl http://localhost:8080/generate \
  -X POST \
  -d '{"inputs":"def fibonacci(n):","parameters":{"max_new_tokens":100}}' \
  -H 'Content-Type: application/json'
```

## Why These Models Over Gated Ones?

1. **No authentication hassle**: Start immediately
2. **Community tested**: Wide usage, known issues documented
3. **Commercial friendly**: Most have permissive licenses
4. **TGI optimized**: Known to work well with Text Generation Inference

## Next Steps

1. Try StarCoder2-3B first (most capable)
2. If memory issues, add `--quantize bitsandbytes-nf4`
3. Monitor GPU memory with `nvidia-smi`
4. Adjust `--max-batch-prefill-tokens` if needed