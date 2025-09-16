# Model Selection Guide for Local Inference

This guide helps you choose the optimal models for your hardware when running local inference with vLLM or TGI.

## Quick Decision Tree

```
Do you have an NVIDIA GPU?
├─ NO → Use Ollama with CPU models (Phi-3, CodeLlama-7B)
└─ YES → Check your VRAM:
         ├─ 6GB → 3B models (Phi-3.5-mini)
         ├─ 8GB → 7B models (DeepSeek-Coder ⭐)
         ├─ 12GB → 13B models (CodeLlama-13B)
         ├─ 16GB → 7B FP16 or 34B quantized
         └─ 24GB+ → 34B-70B models

Deployment Scale?
├─ Personal (1 user) → Ollama
├─ Team (5-10 users) → Single vLLM server
└─ Enterprise (50+ users) → vLLM cluster
```

## Quick Hardware to Model Mapping

| VRAM | Recommended Model Size | Quantization | Expected Speed |
|------|------------------------|--------------|----------------|
| 6GB | 3B parameters | AWQ (4-bit) | 8-12 tok/s |
| 8GB | 6-7B parameters | AWQ (4-bit) | 5-8 tok/s |
| 12GB | 13B parameters | AWQ (4-bit) | 4-6 tok/s |
| 16GB | 7B parameters | FP16 (full) | 10-15 tok/s |
| 24GB | 34B parameters | AWQ (4-bit) | 3-5 tok/s |

## RTX 4060 (8GB VRAM) Specific Recommendations

Based on extensive testing documented in [analysis/2025-09-15/04-optimal-coding-models-rtx4060.md](../analysis/2025-09-15/04-optimal-coding-models-rtx4060.md):

### Best Models for vLLM on RTX 4060

#### 1. **DeepSeek-Coder-6.7B-Instruct-AWQ** ⭐ TESTED & WORKING
```bash
docker run -d --gpus all -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model TheBloke/deepseek-coder-6.7B-instruct-AWQ \
  --quantization awq \
  --gpu-memory-utilization 0.8
```
- **Speed**: 5-6 tokens/second on vLLM
- **Context**: 2048 tokens (can be extended to 4096)
- **Quality**: Excellent for code generation
- **Stability**: Very stable with AWQ quantization

#### 2. **Qwen2.5-Coder-7B-Instruct-AWQ** (Recommended Alternative)
```bash
docker run -d --gpus all -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model Qwen/Qwen2.5-Coder-7B-Instruct-AWQ \
  --quantization awq \
  --max-model-len 4096
```
- **Speed**: 4-5 tokens/second
- **Context**: Up to 32K tokens (limited by VRAM)
- **Quality**: State-of-the-art, matches GitHub Copilot
- **Note**: Latest model with best coding capabilities

#### 3. **CodeQwen1.5-7B-Chat-AWQ** (Balanced Choice)
```bash
docker run -d --gpus all -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model Qwen/CodeQwen1.5-7B-Chat-AWQ \
  --quantization awq
```
- **Speed**: 5-6 tokens/second
- **Context**: 64K tokens capability (VRAM limited)
- **Quality**: Excellent balance of speed and quality

### Models to Avoid on 8GB VRAM

❌ **13B+ models** - Will OOM even with quantization
❌ **Full precision (FP16)** 7B models - Uses too much VRAM
❌ **Models without AWQ versions** - GPTQ is less stable with vLLM

## Performance Comparison: Ollama vs vLLM

| Aspect | Ollama | vLLM |
|--------|--------|------|
| **Speed** | Faster (40-50 tok/s) | Slower (5-8 tok/s) |
| **Stability** | Good | Excellent |
| **Memory Management** | Basic | PagedAttention (superior) |
| **Quantization** | GGUF (4-bit) | AWQ (4-bit) |
| **API Compatibility** | Limited | Full OpenAI API |
| **Production Ready** | Desktop use | Enterprise deployment |

## Minimal Integration Changes

One of the key findings from enterprise deployments: **Only one configuration change needed!**

### For This Extension
```json
// VS Code settings.json
{
  "huggingface.customTGIEndpoint": "http://localhost:8000"  // vLLM
  // or
  "huggingface.customTGIEndpoint": "http://localhost:11434" // Ollama
}
```

### Why So Simple?
- All recommended engines support OpenAI API format
- Extension already handles OpenAI-compatible endpoints
- No code changes needed, just configuration
- Seamless switch between cloud and local inference

## Testing Your Setup

### 1. Check Available VRAM
```bash
nvidia-smi --query-gpu=memory.free --format=csv
```

### 2. Start with Conservative Settings
```bash
# Start with lower memory utilization
--gpu-memory-utilization 0.7
--max-model-len 2048
```

### 3. Monitor Performance
```bash
# Watch GPU usage while running
watch -n 1 nvidia-smi

# Test with the provided script
scripts/test-vllm.sh
```

### 4. Gradually Increase Limits
- Increase `--gpu-memory-utilization` to 0.8, then 0.9
- Increase `--max-model-len` if VRAM allows
- Monitor for OOM errors

## Laptop vs Server Deployment

### Development (Laptop - RTX 4060)
- **Purpose**: Testing, development, demos
- **Model Size**: 6-7B parameters
- **Quantization**: AWQ (4-bit) essential
- **Context**: 2K-4K tokens realistic
- **Speed**: 5-8 tokens/second acceptable

### Production (Server - H200/A100)
- **Purpose**: Enterprise deployment
- **Model Size**: 34B-70B parameters
- **Quantization**: Optional (FP16 if VRAM allows)
- **Context**: 32K-128K tokens
- **Speed**: 20-50 tokens/second expected

## Model Quality vs Speed Tradeoffs

### Prioritize Quality
Choose: **Qwen2.5-Coder-7B-Instruct-AWQ**
- Best code understanding
- Latest training data (2024-2025)
- Slower but more accurate

### Prioritize Speed
Choose: **DeepSeek-Coder-6.7B-Instruct-AWQ**
- Fastest inference on 8GB VRAM
- Good quality for most tasks
- Better for real-time completion

### Balanced Approach
Choose: **CodeQwen1.5-7B-Chat-AWQ**
- Good speed and quality
- Reliable and well-tested
- Supports longer contexts

## Common Issues and Solutions

### Problem: "CUDA out of memory"
**Solution**:
- Reduce `--gpu-memory-utilization` to 0.7
- Lower `--max-model-len` to 2048
- Use smaller model (3B instead of 7B)

### Problem: "Model not loading"
**Solution**:
- Check model name on HuggingFace
- Ensure AWQ version exists
- Verify Docker has GPU access: `docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi`

### Problem: "Slow token generation"
**Solution**:
- Normal for vLLM (5-8 tok/s is expected on RTX 4060)
- Check GPU utilization with `nvidia-smi`
- Ensure no other processes using GPU

## Recommendations by Use Case

### For VS Code Copilot Alternative
**Model**: DeepSeek-Coder-6.7B-Instruct-AWQ
**Reason**: Fast enough for interactive use

### For Code Review/Analysis
**Model**: Qwen2.5-Coder-7B-Instruct-AWQ
**Reason**: Better understanding of complex code

### For Quick Prototyping
**Model**: Phi-3.5-mini-instruct (3.8B)
**Reason**: Smaller, faster, still capable

## Enterprise Deployment Architecture

Based on Siemens deployment analysis from [analysis/2025-09-15/03-internal-inference-engine-setup-guide.md](../analysis/2025-09-15/03-internal-inference-engine-setup-guide.md):

### Infrastructure Requirements by Model Size

| Model Size | GPU Requirements | System RAM | Storage | Use Case |
|------------|------------------|------------|---------|----------|
| **7B models** | 1x A100 40GB or RTX 4060 8GB | 32GB | 50GB SSD | Development/Testing |
| **13B models** | 1x A100 40GB or RTX 4070 12GB | 64GB | 100GB SSD | Small team deployment |
| **34B models** | 1x A100 80GB or RTX 4090 24GB | 128GB | 150GB SSD | Department deployment |
| **70B models** | 2x A100 80GB | 256GB | 200GB SSD | Enterprise deployment |

### Deployment Strategy Phases

#### Phase 1: Local Testing (1-2 weeks)
- **Tool**: Ollama on developer laptop
- **Model**: 7B quantized (DeepSeek-Coder)
- **Purpose**: Validate use cases, test integration
- **Cost**: $0 (existing hardware)

#### Phase 2: Pilot Deployment (1-3 months)
- **Tool**: vLLM on single GPU server
- **Model**: 13B-34B AWQ models
- **Purpose**: Team productivity testing
- **Cost**: ~$10K (single A100 server)

#### Phase 3: Production Rollout (3-6 months)
- **Tool**: vLLM cluster with load balancing
- **Architecture**:
  ```
  VS Code Extensions → Load Balancer → vLLM Instances (N x A100)
                                     ↓
                              Model Cache (Shared NFS)
  ```
- **Purpose**: Enterprise-wide deployment
- **Cost**: ~$50-100K (multi-GPU cluster)

### Performance Expectations by Deployment Type

| Deployment | Users | Model Size | Latency | Throughput |
|------------|-------|------------|---------|------------|
| **Developer Laptop** | 1 | 7B | 100-200ms | 5-8 tok/s |
| **Single GPU Server** | 5-10 | 13-34B | 50-100ms | 10-20 tok/s |
| **Multi-GPU Cluster** | 50-100 | 70B | 20-50ms | 30-50 tok/s |
| **Enterprise Cloud** | 500+ | Multiple | <20ms | 100+ tok/s |

## Inference Engine Comparison

From enterprise deployment experience:

| Feature | Ollama | vLLM | TGI | Production Recommendation |
|---------|--------|------|-----|---------------------------|
| **Setup Complexity** | ⭐ Simple | ⭐⭐ Moderate | ⭐⭐ Moderate | Start with Ollama, migrate to vLLM |
| **Performance** | ⭐⭐ Good | ⭐⭐⭐ Excellent | ⭐⭐ Good* | vLLM for production |
| **Stability** | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent | ⭐ Poor | vLLM or Ollama only |
| **Multi-GPU** | ❌ No | ✅ Yes | ✅ Yes | vLLM for scaling |
| **Memory Efficiency** | ⭐⭐ Good | ⭐⭐⭐ Best | ⭐⭐ Good | vLLM with PagedAttention |
| **OpenAI Compatibility** | ✅ Native | ✅ Native | ⚠️ Requires conversion | Both Ollama and vLLM work |

*TGI has stability issues (integer overflow, memory crashes)

## Future Considerations

### Upcoming Models (2025)
- **DeepSeek-V3**: Improved efficiency
- **Qwen3-Coder**: Expected Q2 2025
- **Llama-3.2-Coder**: Specialized variant

### Hardware Upgrades
If considering hardware upgrade from RTX 4060:
- **RTX 4070 (12GB)**: Enables 13B models
- **RTX 4080 (16GB)**: Full precision 7B models
- **RTX 4090 (24GB)**: 34B quantized models

## Additional Resources

- Original analysis: [Optimal Coding Models for RTX 4060](../analysis/2025-09-15/04-optimal-coding-models-rtx4060.md)
- vLLM setup: [Setup vLLM Guide](./06-setup-vllm.md)
- Model sources: [HuggingFace Model Hub](https://huggingface.co/models?search=awq)
- Benchmarks: [vLLM Performance Guide](https://docs.vllm.ai/en/latest/serving/performance.html)