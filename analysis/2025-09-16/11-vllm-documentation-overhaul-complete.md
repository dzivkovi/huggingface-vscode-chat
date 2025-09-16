# vLLM Documentation Overhaul - Complete Updates

**Date**: 2025-09-16 at 18:28:45 UTC
**Context**: Major documentation cleanup and vLLM integration updates for VS Code Hugging Face extension

## User Request

The user requested comprehensive documentation updates related to vLLM integration, including:
1. Fix all outdated TGI-focused documentation
2. Ensure vLLM is properly documented as the recommended solution
3. Fix configuration examples to match actual implementation
4. Add proper Docker Desktop instructions for vLLM startup

## Documentation Changes Summary

### Critical Fixes Applied

#### 1. Configuration Schema Correction
**Problem**: Documentation showed non-existent settings like `huggingface.inferenceBackend`
**Fix**: Updated all docs to use actual setting: `huggingface.customTGIEndpoint`

#### 2. TGI Deprecation
**Problem**: Documentation recommended TGI despite stability issues
**Fix**: Added deprecation warnings, positioned vLLM as primary recommendation

#### 3. vLLM Docker Parameters
**Problem**: Missing critical Docker flags caused crashes
**Root Cause**: Forgot `--shm-size=4g` and `--ipc=host` parameters
**Fix**: Added complete Docker command with ALL required parameters

### Files Updated

#### Core Documentation (docs/)
1. **01-architecture.md** - Added vLLM support, corrected configuration schema
2. **02-backend-decisions.md** - Changed from "TGI over alternatives" to "vLLM over TGI"
3. **03-setup-development.md** - Added script references for development
4. **04-setup-tgi.md** - Added deprecation warning
5. **05-installation.md** - Fixed configuration instructions, added vLLM option
6. **06-troubleshooting-tgi.md** - Renamed to "Local Inference", added vLLM sections
7. **07-viewing-logs.md** - Updated examples with vLLM endpoints
8. **08-model-selection-guide.md** - NEW comprehensive guide for model selection

#### Project Files
1. **README.md** - Added complete vLLM Docker command with warnings
2. **CLAUDE.md** - Added vLLM development section with troubleshooting
3. **Scripts reorganization** - Moved to `scripts/` folder per best practices

### New Resources Created

#### Model Selection Guide (docs/08-model-selection-guide.md)
Comprehensive guide including:
- Quick decision tree for hardware → model selection
- RTX 4060 specific recommendations with tested models
- Enterprise deployment architecture (3-phase approach)
- Infrastructure requirements by model size
- Performance expectations by deployment type
- Inference engine comparison (Ollama vs vLLM vs TGI)

#### Startup Scripts
- `scripts/start-vllm.sh` - Smart startup with container detection
- `scripts/stop-vllm.sh` - Clean shutdown
- `scripts/test-vllm.sh` - API endpoint testing
- `scripts/rebuild-extension.sh` - Quick development cycle

### Key Technical Insights

#### vLLM Docker Requirements (Critical)
```bash
docker run -d --name vllm-server \
  --gpus all \
  --shm-size=4g \        # ← REQUIRED: Shared memory
  --ipc=host \           # ← REQUIRED: IPC namespace
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model TheBloke/deepseek-coder-6.7B-instruct-AWQ \
  --quantization awq \
  --gpu-memory-utilization 0.85 \
  --max-model-len 2048 \ # ← REQUIRED: Prevent OOM
  --max-num-seqs 16 \
  --disable-log-stats
```

#### Performance Characteristics
- **vLLM on RTX 4060**: 5-8 tokens/sec (slower than Ollama but more stable)
- **Token limits**: 1536 input + 512 output = 2048 total
- **Memory usage**: ~4GB VRAM with AWQ quantization
- **Stability**: Superior to TGI (no integer overflow crashes)

### Integration Simplicity
One key finding emphasized in documentation:
- **Only ONE configuration change needed**: `customTGIEndpoint`
- Works with vLLM, TGI, or any OpenAI-compatible endpoint
- No code changes required, just configuration

## Impact

### For Users
- Clear, accurate instructions that actually work
- No more confusion about configuration settings
- Foolproof Docker commands with explanations

### For Developers
- Complete development workflow with scripts
- Accurate architecture documentation
- Clear troubleshooting guidance

### For Enterprise
- Phased deployment strategy
- Infrastructure sizing guide
- Cost estimates and performance expectations

## Lessons Learned

1. **Docker parameters matter**: Missing `--shm-size` or `--ipc` causes cryptic failures
2. **Documentation drift**: Original docs referenced non-existent settings
3. **Testing matters**: The `test-vllm.sh` script caught issues immediately
4. **Log levels impact performance**: DEBUG logging can slow streaming significantly

## Current Status

✅ vLLM server running successfully at http://localhost:8000
✅ All documentation updated and accurate
✅ Scripts created for easy management
✅ Extension working with proper token calculation
✅ Complete guide from laptop testing to enterprise deployment