# TGI Model Installation Attempts Summary

Date: 2025-09-15 at 21:10:00 PST

## Context
User asked if we had evaluated or tried to install Qwen2.5-Coder-7B in TGI, after seeing it recommended as the top model for their RTX 4060 laptop.

## User Query
"Please remind me if we evaluated or tried to install this model in TGI: ollama pull qwen2.5-coder:7b"

## Analysis and Findings

### Models We Actually Attempted with TGI

No, we did not try to install Qwen2.5-Coder in TGI. Here's the complete history of what we actually tried:

#### 1. **DeepSeek-Coder-6.7B** - FAILED
- **When**: Earlier in session
- **Issue**: Model requires 13.4GB VRAM
- **GPU**: RTX 4060 has only 8GB
- **Result**: Out of memory error

#### 2. **Phi-3.5-mini-instruct** - FAILED
- **When**: 00:58:40 - 00:10:59 (timestamps from tgi.log)
- **Download**: Successful (10.5 minutes)
- **Issue**: Model used 7.73GB VRAM, leaving only ~45MB
- **Error**: "Not enough memory to handle 4096 prefill tokens"
- **Result**: Failed during warmup phase when allocating KV cache

#### 3. **CodeGemma-2B** - FAILED
- **When**: 00:30:44 (timestamp from tgi.log)
- **Issue**: Gated model requiring Google authentication
- **Error**: "GatedRepoError: Access to model google/codegemma-2b is restricted"
- **Result**: Could not even download without authentication

#### 4. **StarCoder2-3B** - SUCCESS!
- **When**: Started at 00:35:02, successful at 00:57:36
- **First attempt**: Failed with `AssertionError` at line 133 - `max_input_tokens is None`
- **Second attempt**: Success with `--max-input-tokens 4096` parameter added
- **Download time**: 16 minutes 26 seconds
- **Startup time**: 97 seconds for shard initialization
- **Status**: Successfully running on port 8080
- **Memory**: Using KV-cache blocks: 121517
- **Why it worked**: Added missing `--max-input-tokens` parameter

### Why Qwen2.5-Coder Was Not Tried in TGI

The command `ollama pull qwen2.5-coder:7b` is specifically for **Ollama**, not TGI:

- **ollama pull** = Ollama's command to download models
- **docker run ... ghcr.io/huggingface/text-generation-inference** = TGI's deployment method

We recommended Qwen2.5-Coder for Ollama because:
1. Ollama automatically handles quantization to fit your VRAM
2. It's simpler than TGI's Docker setup
3. Better suited for Windows laptops (native support)
4. After seeing multiple TGI failures, Ollama emerged as the better option

### If You Want to Try Qwen2.5-Coder in TGI

Here's the TGI command (though not recommended given your experience):

```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id Qwen/Qwen2.5-Coder-7B-Instruct \
  --quantize bitsandbytes-nf4 \
  --max-batch-prefill-tokens 2048 \
  --max-total-tokens 4096
```

### Recommendation

Given your TGI experience:
- **3 failures** (DeepSeek-Coder, Phi-3.5, CodeGemma)
- **1 in progress** (StarCoder2-3B)
- **Memory constraints** consistently problematic

**Use Ollama for Qwen2.5-Coder** - it's designed for consumer GPUs and will handle the memory management automatically.