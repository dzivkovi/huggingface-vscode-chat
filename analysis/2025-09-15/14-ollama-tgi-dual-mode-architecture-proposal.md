# Dual-Mode Architecture Proposal: Ollama (CPU) + TGI (GPU)

Date: 2025-09-15 at 20:31:45 PST

## Context
User is considering a dual-mode design for the Hugging Face VS Code extension that would automatically use Ollama for CPU-only systems (corporate laptop) and TGI for GPU-enabled systems (home setup with RTX 4060).

## Query
"If we were to update this plugin to use Ollama on non-GPU laptops vs. TGI on GPU laptops, would that work? Or I'm splitting hairs and complicated design?"

## Analysis and Findings

### Key Constraint Discovered
**TGI does NOT support CPU-only inference**. It requires NVIDIA GPUs with CUDA support, making it unsuitable for corporate laptops without GPU.

### Feasibility Assessment
✅ **This design is technically feasible** but adds significant complexity.

## Proposed Architecture

### 1. Runtime Detection System
- Use `child_process.exec()` to check for GPU availability
- Run `nvidia-smi` on startup to detect NVIDIA GPUs
- Store result in extension state for provider selection

### 2. Provider Factory Pattern
```typescript
// Abstract base provider
abstract class BaseModelProvider
  - OllamaProvider extends BaseModelProvider
  - TGIProvider extends BaseModelProvider
  - HFRouterProvider extends BaseModelProvider (current)

// Factory selects provider based on:
- GPU availability
- User configuration preference
- Model requirements
```

### 3. Configuration Schema
Add new settings to `package.json`:
- `huggingface.inferenceMode`: "auto" | "ollama" | "tgi" | "router"
- `huggingface.ollamaUrl`: Local Ollama endpoint
- `huggingface.tgiUrl`: Local TGI endpoint
- `huggingface.routerUrl`: HF Router endpoint (default)

### 4. Model Mapping Strategy
- **Ollama models**: qwen2.5-coder, deepseek-coder, codellama
- **TGI models**: CodeGemma-2B, Gemma-3-1B (quantized)
- Map equivalent models between providers for seamless switching

## Pros and Cons Analysis

### Advantages ✅
1. **Single extension works everywhere** - No manual configuration needed
2. **Optimal performance per environment** - GPU acceleration when available
3. **Automatic switching** - Detects hardware and selects best provider
4. **Seamless experience** - Works across different devices without user intervention

### Disadvantages ❌
1. **3x code complexity** - Must maintain three separate provider implementations
2. **Model inconsistency** - Different model names/capabilities per provider
3. **Testing burden** - Each provider needs separate test coverage
4. **Settings sync issues** - Configuration conflicts when syncing across devices
5. **Maintenance overhead** - Updates must be tested across all providers

## Performance Comparison

### Ollama Performance
- **CPU-only**: 2-12 tokens/second (depending on processor)
- **With GPU**: 5-10x faster (automatic GPU acceleration)
- **Memory**: Works within system RAM constraints

### TGI Performance
- **GPU-only**: Maximum performance for supported models
- **CPU**: Not supported - will not run
- **Memory**: Requires fitting entire model in VRAM

## Recommendations

### Primary Recommendation: Use Ollama Everywhere
**Rationale:**
1. **Ollama works on both GPU and CPU** - Automatically uses GPU when available
2. **5-10x performance boost** with GPU happens automatically
3. **Single codebase** to maintain - reduced complexity
4. **Consistent model names** across all devices
5. **10-minute setup** vs hours of dual-mode implementation
6. **Built-in quantization** - Models automatically fit in available memory

### Alternative: Simple ENV-based Switching
If dual-mode is required, implement minimal complexity:
```javascript
// Use environment variable
const BACKEND = process.env.INFERENCE_BACKEND || 'ollama';
const BASE_URL = BACKEND === 'tgi'
  ? process.env.TGI_URL
  : process.env.OLLAMA_URL;
```

Benefits:
- Minimal code changes needed
- Single provider class with conditional URL/auth
- Easy to test and maintain

### Not Recommended: Full Multi-Provider Architecture
While technically possible, the complexity cost outweighs benefits given that Ollama already provides CPU/GPU flexibility.

## Decision Matrix

| Factor | Ollama-Only | ENV-Switch | Full Multi-Provider |
|--------|------------|------------|-------------------|
| Setup Time | 10 min | 1 hour | 4-8 hours |
| Code Complexity | Low | Medium | High |
| Maintenance | Easy | Moderate | Complex |
| Performance | Good | Good | Optimal |
| Flexibility | Medium | High | Very High |
| Testing Effort | Low | Medium | High |

## Conclusion
The dual-mode architecture is feasible but unnecessarily complex given that Ollama already provides automatic GPU acceleration when available. The recommendation is to standardize on Ollama for both CPU and GPU environments, providing a simpler, more maintainable solution with minimal performance trade-offs.