# Internal Inference Engine Setup Guide for Siemens

Date: 2025-09-15 at 18:51:42 PST

## Context
User from Siemens requested detailed guidance on setting up internal inference engines (Ollama, vLLM, or TGI) to replace Hugging Face's external inference providers for the VS Code chat extension. They have Ollama running locally and need infrastructure guidance for enterprise deployment.

## User Query
The user wants to understand:
1. How Hugging Face inference routing works
2. What inference engines can replace it (Ollama, vLLM, alternatives)
3. How to set up these models internally
4. How to integrate with the VS Code extension
5. Practical testing with local Ollama installation

## Analysis and Solution

### Understanding Hugging Face's Router Architecture

Hugging Face's router (`router.huggingface.co/v1`) acts as a unified gateway that:
- Routes requests to 15+ inference providers (OpenAI, Anthropic, Groq, Cerebras, etc.)
- Provides OpenAI-compatible API format
- Handles authentication and billing
- Automatically selects providers or allows manual specification

### Inference Engine Options

#### Option 1: Ollama (Simplest)
**Pros:**
- One-command installation
- Built-in OpenAI compatibility (`/v1/chat/completions`)
- No API key required
- Easy model management with pull commands
- Supports streaming and tool calling (Llama 3.1)

**Setup:**
```bash
ollama pull codellama:70b
ollama serve
```

**Integration:** Change one line in extension:
```typescript
const BASE_URL = "http://localhost:11434/v1";
```

#### Option 2: vLLM (Production Performance)
**Pros:**
- High throughput with PagedAttention
- Multi-GPU support
- Continuous batching
- OpenAI-compatible endpoints
- Production-ready performance

**Setup:**
```bash
python -m vllm.entrypoints.openai.api_server \
  --model huggingface/codellama-70b \
  --port 8000 \
  --api-key siemens-internal-key
```

#### Option 3: Text Generation Inference (TGI)
**Pros:**
- Hugging Face's official solution
- Docker-based deployment
- Excellent memory efficiency
- OpenAI compatibility in v2.0+

**Setup:**
```bash
docker run --gpus all --rm -p 8080:80 \
  ghcr.io/huggingface/text-generation-inference:2.0 \
  --model-id codellama/CodeLlama-70b-Instruct-hf \
  --messages-api-enabled
```

### Adapter Layer Solution

Created a FastAPI adapter to bridge between VS Code extension expectations and various inference backends:

```python
# Transforms responses to HF Router format
# Proxies chat completions with streaming
# Handles authentication and logging
# Works with Ollama, vLLM, or TGI backends
```

### Production Architecture for Siemens

```
VS Code Extension → Load Balancer → Adapter Layer → Multiple vLLM/TGI Instances
```

**Infrastructure Requirements:**
- 70B models: 2x A100 80GB, 128GB RAM
- 7B models: 1x A100 40GB, 32GB RAM
- Storage: 200GB SSD for large models

### Implementation Strategy

1. **Phase 1**: Local Ollama testing
2. **Phase 2**: Single GPU server with vLLM
3. **Phase 3**: Multi-node deployment with load balancing

### Key Findings

1. **Minimal Code Changes**: Only one line needs modification in the extension
2. **OpenAI Compatibility**: All recommended solutions support OpenAI format
3. **No External Dependencies**: Complete isolation from external providers possible
4. **Flexible Deployment**: Can start simple (Ollama) and scale to production (vLLM cluster)

### Comparison Matrix

| Feature | Ollama | vLLM | TGI |
|---------|--------|------|-----|
| Setup Complexity | ⭐ Simple | ⭐⭐ Moderate | ⭐⭐ Moderate |
| Performance | ⭐⭐ Good | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent |
| Multi-GPU | ❌ No | ✅ Yes | ✅ Yes |
| Production Ready | Desktop | Server | Server |

## Summary

The Hugging Face VS Code extension can be easily adapted to work with internal inference engines. Ollama provides the quickest path to testing with its built-in OpenAI compatibility. For production at Siemens, vLLM or TGI offer enterprise-grade performance with multi-GPU support. The adapter layer ensures compatibility regardless of the chosen backend, requiring only a single URL change in the extension configuration.