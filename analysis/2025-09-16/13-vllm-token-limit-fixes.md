# vLLM Token Limit Error Fixes

**Date**: 2025-09-16 at 19:35:42 UTC
**Context**: Debugging and fixing persistent token limit errors when using vLLM with VS Code Copilot Chat
**Issue**: "What is a REST API?" query failing with token limit errors despite 2048 context

## The Problem Cascade

### Initial Error (404 Not Found)
**Root Cause**: Extension sending to `/chat/completions` instead of `/v1/chat/completions`
```typescript
// BUG: Still checking for old 'tgi|' prefix
const endpoint = model.id.startsWith('tgi|')  // This was false!
    ? `${baseUrl}/v1/chat/completions`
    : `${baseUrl}/chat/completions`;     // So fell through to wrong path
```

**Fix**: Changed condition to check for `local|` prefix
```typescript
const endpoint = model.id.startsWith('local|')  // Now correctly matches
    ? `${baseUrl}/v1/chat/completions`
    : `${baseUrl}/chat/completions`;
```

### Second Error (Token Limit Exceeded)
**Discovery**: MASSIVE discrepancy between estimation and reality
- **We estimated**: 2130 tokens
- **vLLM actually saw**: 2532 tokens (402 token difference!)
- **Cause**: vLLM's chat template adds ~400-500 tokens of formatting

**Initial Fix Attempt (Failed)**: Report full context to VS Code
```typescript
const maxInputTokens = contextLimit;  // 2048 - still failed!
```

**Final Solution**: Conservative limits accounting for overhead
```typescript
// Report only 65% of context to VS Code
const maxInputTokens = Math.floor(contextLimit * 0.65);  // ~1330 tokens

// In sendChatRequest, calculate what vLLM will actually see:
const VLLM_TEMPLATE_OVERHEAD = 500;
const ESTIMATION_ERROR_FACTOR = 1.2;
const estimatedVLLMTokens = Math.ceil(totalInputTokens * 1.2) + 500;
```

## Token Budget Breakdown

### For 2048 Context Model:
| Component | Tokens | Purpose |
|-----------|--------|---------|
| Total Context | 2048 | vLLM's hard limit |
| Chat Template | ~500 | vLLM formatting overhead |
| VS Code Context | 200-1000+ | Files, workspace info, history |
| User Message | ~50-200 | Actual question |
| Available Output | 100-500 | Response space |

### Why Simple Questions Failed:
VS Code sends **13-18 messages** of context for a simple "What is REST API?" query:
- Previous conversation history
- Open file contents
- Workspace information
- Git status
- Recent edits (temporal context)

## VS Code Settings to Reduce Context

### Verified Real Settings (from Context7):
```json
{
    // Disable temporal context (recently viewed/edited files)
    "github.copilot.chat.editor.temporalContext.enabled": false,
    "github.copilot.chat.edits.temporalContext.enabled": false,

    // Disable git history suggestions
    "github.copilot.chat.edits.suggestRelatedFilesFromGitHistory": false,

    // Reduce checkpoint overhead
    "chat.checkpoints.showFileChanges": false
}
```

### Settings That DON'T Exist (Fact-Checked):
```json
// ❌ These are NOT real VS Code settings:
"github.copilot.chat.contextProviders.workspace": false,
"github.copilot.chat.contextProviders.editor": false
```

## Test-Driven Development Gaps

### Why Bugs Weren't Caught:
1. **No endpoint construction tests** - Most critical logic had zero coverage
2. **Stale test files** - Old `tgi-*.js` files still in `/out/test/`
3. **Tests not checking runtime behavior** - Only tested isolated functions

### Tests Added:
Created `endpoint-construction.test.ts` with:
- Endpoint URL construction for local vs HF models
- Regression tests for `tgi|` vs `local|` prefix
- Critical bug prevention tests
- Model ID parsing validation

### CLAUDE.md Updated with Strict TDD:
```markdown
**⚠️ MANDATORY: ALL changes MUST follow strict TDD practices:**
1. Write tests FIRST before implementing any feature or fix
2. Run `npm run test` BEFORE declaring any task complete
3. Never skip tests - if tests don't exist, create them
```

## Final Working Configuration

### Extension Settings:
- **Input limit**: 65% of context (~1330 tokens for 2048)
- **Template overhead**: 500 tokens reserved
- **Estimation factor**: 1.2x multiplier for safety
- **Output allocation**: Dynamic based on remaining space

### VS Code Settings:
- Temporal context disabled
- Git history suggestions disabled
- Checkpoint file changes disabled

### Best Practices for Small Context Models:
1. **Close unnecessary files** - Each open file adds to context
2. **Clear chat history** - Start fresh conversations
3. **Work in clean window** - Minimize workspace context
4. **Keep queries focused** - Avoid long conversations

## Recommendation

**For production use with VS Code Copilot Chat:**
- Minimum 8K context model recommended
- 16K+ ideal for comfortable development
- 2048 is barely usable even with all optimizations

The 2048 token limit is fundamentally incompatible with VS Code's aggressive context inclusion strategy.