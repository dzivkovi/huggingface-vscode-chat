# Multi-Model LLM Deployment Guide for Siemens Infrastructure

Date: 2025-09-15 at 19:29:02 PST

## Context
Team member from Siemens requested clarification on running multiple models and multi-GPU configurations, particularly for their production environment with 8x H200 GPUs.

## Query
Understanding the differences between Ollama (multi-model manager) vs TGI/vLLM (single model servers) and how to leverage 8x H200 GPUs for enterprise-scale deployment.

---

## Part 1: Ollama vs TGI - Architecture Differences

### Ollama (Multi-Model Manager)
- **Model Manager**: Can store and switch between multiple models
- **Commands**: `ollama pull model1`, `ollama pull model2`, `ollama run model1`
- **Storage**: Keeps all models locally, switches on demand
- **Memory**: Loads one model at a time into GPU memory
- **API**: Single endpoint, specify model in request
- **Best for**: Development, testing, switching between models

### TGI (Single Model Server)
- **One model per container**: Each container runs ONE specific model
- **Production-focused**: Optimized for serving a single model at scale
- **Multiple models**: Need multiple containers on different ports

### Running Multiple Models with TGI

For multiple models simultaneously:

```bash
# DeepSeek on port 8080
docker run --gpus all --name tgi-deepseek \
  -p 8080:80 --rm -d \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id deepseek-ai/deepseek-coder-6.7b-instruct

# Qwen on port 8081
docker run --gpus all --name tgi-qwen \
  -p 8081:80 --rm -d \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id Qwen/Qwen2.5-Coder-7B-Instruct

# CodeLlama on port 8082
docker run --gpus all --name tgi-codellama \
  -p 8082:80 --rm -d \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id codellama/CodeLlama-7b-Instruct-hf
```

**Note**: This uses 3x the GPU memory!

### Recommendation for Development vs Production

- **Development/Testing**: Use **Ollama** for flexibility
- **Production**: Use **TGI/vLLM** for performance at scale

---

## Part 2: Multi-GPU Configuration for H200 Cluster

### Hardware Specifications
- **8x H200 GPUs**: 141GB HBM3e each = 1.1TB total VRAM
- **Memory Bandwidth**: 4.8 TB/s (43% faster than H100)
- **Capability**: Can run models up to 671B parameters

### Both TGI and vLLM Support Multi-GPU Parallelism

#### TGI Multi-GPU Configuration

```bash
# Use 4 GPUs for a large model with tensor parallelism
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  --shm-size 1g \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id codellama/CodeLlama-70b-Instruct-hf \
  --num-shard 4 \  # Tensor parallel across 4 GPUs
  --max-total-tokens 16384
```

**TGI Features:**
- **Tensor Parallelism**: `--num-shard N` splits model across N GPUs
- **TGI v3.0** (Dec 2024): 13x faster than vLLM on long prompts (200k+ tokens)
- **Strengths**: Long context windows, simpler deployment

#### vLLM Multi-GPU Configuration

```python
# Use all 8 GPUs for massive models
python -m vllm.entrypoints.openai.api_server \
  --model deepseek-ai/DeepSeek-Coder-V2-236B \
  --tensor-parallel-size 8 \  # Use all 8 H200s
  --pipeline-parallel-size 1 \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.95 \
  --port 8080
```

**vLLM Features:**
- **Tensor Parallelism**: `--tensor-parallel-size` (within node)
- **Pipeline Parallelism**: `--pipeline-parallel-size` (across nodes)
- **Strengths**: High throughput, concurrent users, LoRA adapters

### Deployment Strategies for 8x H200 GPUs

#### Option 1: Single Massive Model (671B Parameters)
```bash
# DeepSeek-V3 on all 8 GPUs
vllm serve deepseek-ai/DeepSeek-V3 \
  --tensor-parallel-size 8 \
  --max-model-len 65536 \
  --gpu-memory-utilization 0.95
```

#### Option 2: Two Large Models (70B Each)
```bash
# Instance 1: CodeLlama-70B on GPUs 0-3
vllm serve codellama/CodeLlama-70b-Instruct \
  --tensor-parallel-size 4 \
  --port 8080 \
  --device cuda:0,1,2,3

# Instance 2: Qwen-72B on GPUs 4-7
vllm serve Qwen/Qwen2.5-Coder-72B \
  --tensor-parallel-size 4 \
  --port 8081 \
  --device cuda:4,5,6,7
```

#### Option 3: Eight Smaller Models (7B Each)
Run 8 separate 7B models, one per GPU for maximum flexibility:
```bash
# Each on a different GPU and port
for i in {0..7}; do
  port=$((8080 + i))
  vllm serve deepseek-ai/deepseek-coder-6.7b \
    --port $port \
    --device cuda:$i &
done
```

#### Option 4: Hybrid Approach (Recommended)
```bash
# 4 GPUs for vLLM (high throughput, many users)
vllm serve Qwen/Qwen2.5-Coder-72B \
  --tensor-parallel-size 4 \
  --device cuda:0,1,2,3 \
  --port 8080

# 4 GPUs for TGI (long context tasks)
docker run --gpus '"device=4,5,6,7"' --name tgi-server \
  -p 8081:80 --rm \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id deepseek-ai/deepseek-coder-33b \
  --num-shard 4
```

### Performance Comparison (2024-2025)

| Metric | TGI v3.0 | vLLM | Winner |
|--------|----------|------|--------|
| **Long prompts (200k+)** | 2 sec | 27.5 sec | TGI (13x faster) |
| **High concurrency** | Good | Excellent | vLLM |
| **Throughput** | Good | 1.5x better | vLLM |
| **Time to First Token** | Good | 1.7x faster | vLLM |
| **LoRA adapter support** | Limited | Full | vLLM |
| **Ease of deployment** | Simple | Complex | TGI |
| **Multi-GPU scaling** | Good | Excellent | vLLM |

### Best Practices for Multi-GPU Deployment

#### Tensor Parallelism Guidelines
- **Minimum TP**: Use smallest TP that fits model + context
- **For throughput**: Minimize TP, run multiple instances
- **For latency**: Set TP = number of GPUs in node
- **Memory formula**: Model size / TP < GPU memory × 0.9

#### When to Use Pipeline Parallelism
- Model too large for single node
- Multi-node deployments
- Uneven GPU splits needed

### Production Recommendations for Siemens

#### Primary Setup (vLLM for Production)
```bash
# Production deployment with load balancing
vllm serve Qwen/Qwen2.5-Coder-72B \
  --tensor-parallel-size 8 \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.90 \
  --port 8080 \
  --host 0.0.0.0
```

**Why vLLM for production:**
- Better multi-GPU scaling efficiency
- Higher throughput for concurrent users
- More flexible GPU allocation
- Production-ready features (metrics, health checks)

#### Secondary Setup (TGI for Specific Use Cases)
Use TGI when:
- Ultra-long context (200k+ tokens) is required
- Simpler deployment is priority
- Single model serving is sufficient

### Infrastructure Architecture

```
┌─────────────────────────────┐
│    Load Balancer (nginx)     │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┬──────────┐
    ▼             ▼          ▼
┌────────┐  ┌────────┐  ┌────────┐
│ vLLM   │  │ vLLM   │  │  TGI   │
│Instance│  │Instance│  │Instance│
│ GPU0-3 │  │ GPU4-6 │  │  GPU7  │
└────────┘  └────────┘  └────────┘
```

### Monitoring and Optimization

1. **GPU Utilization**: Target 85-95% for optimal throughput
2. **Memory Usage**: Monitor with `nvidia-smi dmon`
3. **Batch Size**: Adjust based on concurrent users
4. **Context Length**: Balance between capability and memory

### Cost-Benefit Analysis

With 8x H200 GPUs, you can:
- Serve **1 model at 671B parameters** (DeepSeek-V3)
- Serve **2 models at 70B parameters** each
- Serve **8 models at 7-13B parameters** each
- Achieve **50,000+ tokens/sec** aggregate throughput
- Support **100+ concurrent users** with sub-second latency

### Final Recommendation

For Siemens' enterprise deployment:

1. **Use vLLM** as primary inference engine
2. **Deploy 2-3 large models** (70B) for different use cases
3. **Reserve 1-2 GPUs** for experimental/testing models
4. **Implement load balancing** for high availability
5. **Monitor with Prometheus/Grafana** for performance metrics

This configuration provides:
- **Flexibility**: Multiple models for different tasks
- **Performance**: Optimal GPU utilization
- **Scalability**: Easy to adjust based on demand
- **Reliability**: Redundancy and failover capabilities