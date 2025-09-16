# Gemma Models Analysis for TGI on RTX 4060 (8GB VRAM)

Date: 2025-09-15 at 20:30:00 PST

## Executive Summary
Based on internet research, **Gemma 3 is the latest model** (released March 12, 2025), not Gemma 2. For your RTX 4060 with 8GB VRAM, **Gemma 3 1B** or **Gemma 3 4B with INT4 quantization** are your best options.

## Gemma 3 vs Gemma 2: What's Available

### Gemma 3 (Latest - March 2025)
- **Current generation** built on Gemini 2.0 technology
- Sizes: 270M, 1B, 4B, 12B, 27B
- Multimodal capabilities (4B+ models)
- 128K context window
- Better performance than Gemma 2

### Gemma 2 (Previous Generation - 2024)
- Sizes: 2B, 9B, 27B
- Text-only models
- Still available but superseded by Gemma 3

## VRAM Requirements for Your RTX 4060 (8GB)

### ✅ **Will Work on RTX 4060:**

#### Gemma 3 1B
- **FP16**: 2GB VRAM (plenty of headroom)
- **INT4**: 0.5GB VRAM
- **Verdict**: Will run perfectly with room for large context

#### Gemma 3 4B
- **FP16**: 8GB VRAM (very tight, may fail)
- **INT4**: 2.6GB VRAM (recommended)
- **Verdict**: Use quantized version for best results

#### Gemma 2 2B
- **FP16**: ~4.7GB VRAM
- **INT4**: ~1.5GB VRAM
- **Verdict**: Should work but Gemma 3 1B is newer/better

### ❌ **Won't Work on RTX 4060:**

#### Gemma 3 12B
- **FP16**: 24GB VRAM (3x your GPU)
- **INT4**: 6.6GB VRAM (might barely fit but no cache room)

#### Gemma 2 9B
- **FP16**: ~18GB VRAM
- **INT4**: ~5GB VRAM (tight fit, limited functionality)

## TGI Commands for Deployment

### Option 1: Gemma 3 1B (Best for Reliability)
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id google/gemma-3-1b-it \
  --max-batch-prefill-tokens 2048 \
  --max-total-tokens 4096
```

### Option 2: Gemma 3 4B Quantized (Best Performance)
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id google/gemma-3-4b-it \
  --quantize bitsandbytes-nf4 \
  --max-batch-prefill-tokens 1024 \
  --max-total-tokens 2048
```

### Option 3: Gemma 2 2B (Previous Gen Alternative)
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id google/gemma-2-2b-it \
  --max-batch-prefill-tokens 2048 \
  --max-total-tokens 4096
```

## Coding Capabilities

### Gemma 3 for Coding
- Evaluated on LiveCodeBench and Bird-SQL
- Strong performance on MATH benchmarks
- Can build natural language programming interfaces
- Supports function calling for complex tasks

### CodeGemma Alternative
- Google also offers **CodeGemma 2B** specifically for coding
- Built on Gemma foundation, optimized for code completion
- Evaluated on HumanEval, MBPP, BabelCode
- Supports C++, C#, Go, Java, JavaScript, Kotlin, Python, Rust

### Gemma 2 for Coding
- Gemma 2 2B has general coding capabilities
- No specific coding benchmarks published
- CodeGemma 2B is the better choice for pure coding tasks

## CodeGemma Models - Specialized for Programming

### Available CodeGemma Variants
1. **CodeGemma 2B** - Fast code completion (4.7GB FP16)
2. **CodeGemma 7B** - Code + language understanding (14GB FP16)
3. **CodeGemma 7B-IT** - Instruction-tuned for chat (14GB FP16)

### CodeGemma Performance Benchmarks
- **HumanEval Python**: Outperforms most 7B models except DeepSeek-Coder-7B
- **MultiPL-E**: Strong performance on Java, JavaScript, C++
- **MBPP**: Competitive results across multiple languages
- **GSM8K**: Best mathematical reasoning among 7B models
- **Context**: 8K tokens (same as base Gemma)

### TGI Installation Commands for CodeGemma

#### CodeGemma 2B (Will fit on RTX 4060)
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id google/codegemma-2b \
  --max-batch-prefill-tokens 2048 \
  --max-total-tokens 4096
```

#### CodeGemma 7B-IT with Quantization (Tight fit on RTX 4060)
```bash
docker run --gpus all --name tgi-server \
  -p 8080:80 --rm \
  ghcr.io/huggingface/text-generation-inference:2.4.1 \
  --model-id google/codegemma-7b-it \
  --quantize bitsandbytes-nf4 \  # Essential for 8GB VRAM
  --max-batch-prefill-tokens 512 \
  --max-total-tokens 2048
```

## Recommended Approach (UPDATED)

### Model Ranking for Programming on RTX 4060:
1. **CodeGemma 2B** - Best coding model that fits comfortably (4.7GB)
   - Specialized for code completion and generation
   - Trained on 500B tokens of code
   - Fill-in-the-middle capabilities

2. **Gemma 3 4B Quantized** - Good general + coding (2.6GB INT4)
   - Latest architecture
   - Broader capabilities beyond coding
   - Requires quantization

3. **CodeGemma 7B-IT Quantized** - Most capable but risky (~3.5GB INT4)
   - Best performance on benchmarks
   - Instruction-tuned for conversations
   - Very tight memory fit, may fail

4. **Gemma 3 1B** - Fallback option (2GB)
   - Will definitely work
   - Limited for complex debugging
   - Good for simple code tasks

### Why CodeGemma 2B Over Gemma 3 1B for Programming?
- **Specialized training**: 500B tokens of code vs general training
- **Code-specific features**: Fill-in-the-middle, code infilling
- **Proven benchmarks**: Tested on HumanEval, MBPP, BabelCode
- **Reasonable size**: 4.7GB leaves room for KV cache on 8GB GPU

## Memory Comparison Table

| Model | Parameters | FP16 VRAM | INT4 VRAM | Works on 8GB? |
|-------|------------|-----------|-----------|---------------|
| Gemma 3 1B | 1B | 2GB | 0.5GB | ✅ Excellent |
| Gemma 3 4B | 4B | 8GB | 2.6GB | ✅ With quantization |
| Gemma 2 2B | 2B | 4.7GB | 1.5GB | ✅ Yes |
| CodeGemma 2B | 2B | ~4.7GB | ~1.5GB | ✅ Yes |
| Gemma 3 12B | 12B | 24GB | 6.6GB | ❌ Too large |
| Gemma 2 9B | 9B | 18GB | 5GB | ❌ Too large |

## Final Recommendation

**Use Gemma 3 1B** with TGI. It's:
- The latest technology (March 2025)
- Guaranteed to fit with room for KV cache
- Built on Gemini 2.0 architecture
- Small enough to leave 6GB for operations

If you need stronger coding capabilities and Gemma 3 1B isn't sufficient, try **CodeGemma 2B** which is specifically optimized for programming tasks.