# vLLM Rename and Dynamic Token Detection Implementation

**Date**: 2025-09-16 at 19:41:23 UTC
**Context**: Comprehensive refactoring of Hugging Face VS Code extension to rename TGI references to vLLM and implement dynamic token limit detection
**Previous Work**: Extension was already working with vLLM but still used "TGI" naming throughout codebase

## User Request

The user requested two major changes:
1. "why do we still call pluging TGI, let's rename all source code & testing references to vLLM because that is what my team will use on the big server"
2. "I feel dynamic detection is a must there must be info you can see from http://localhost:8000/v1/models"

## Implementation Summary

### 1. Comprehensive TGI → vLLM Rename

#### Source Code Changes (`src/provider.ts`)
- Renamed `_tgiEndpoint` → `_localEndpoint`
- Changed all "TGI" references to "local inference" or "vLLM"
- Updated model ID format: `tgi|endpoint|model` → `local|endpoint|model`
- Renamed methods:
  - `checkTGIHealth()` → `checkLocalHealth()`
  - `fetchTGIModels()` → `fetchLocalModels()`
- Updated error messages to reference "local server" instead of "TGI server"
- Changed comments and documentation strings

#### Extension Changes (`src/extension.ts`)
- Updated configuration change listener comments
- Changed notification messages from "TGI endpoint" to "Local inference endpoint"
- Added note about keeping `customTGIEndpoint` config key for backward compatibility

#### Test File Updates
- Renamed `tgi-debug.test.ts` → `local-debug.test.ts`
- Deleted `tgi-integration.test.ts` and created `local-integration.test.ts`
- Updated all test cases to use:
  - `local|` prefix instead of `tgi|`
  - `/v1/chat/completions` endpoint (vLLM) instead of `/v1/completions` (TGI)
  - "vLLM" and "local" terminology throughout

### 2. Dynamic Token Limit Detection

#### New Method: `detectContextLimit()`
```typescript
private async detectContextLimit(endpoint: string): Promise<number | null> {
    // Queries /v1/models endpoint
    // Extracts max_model_len from first model
    // Returns context limit or null if unable to detect
}
```

#### Enhanced `fetchLocalModels()`
- Now stores context limits in `_modelContextLimits: Map<string, number>`
- Parses `max_model_len` from vLLM's `/v1/models` response
- Logs detected limits for each model

#### Dynamic Token Calculation
Instead of hardcoded values (1900/148), now uses:
- **85% of context** for input tokens (allows for VS Code hidden context)
- **15% of context** for output tokens
- Example for 2048 context: 1740 input / 307 output tokens

#### Model Information Enhancement
- Tooltips now show actual context limit: `"Local model at endpoint (2048 token context)"`
- Each model stores its specific context limit
- Falls back to 2048 tokens if detection fails

## Technical Verification

### vLLM `/v1/models` Response
```json
{
  "object": "list",
  "data": [{
    "id": "TheBloke/deepseek-coder-6.7B-instruct-AWQ",
    "max_model_len": 2048,
    "owned_by": "vllm"
  }]
}
```

### Compilation and Testing
- Extension compiles without errors
- All tests updated to use new naming
- Package created: `huggingface-vscode-chat-0.0.5.vsix`
- Extension installed and verified working

## Key Benefits

1. **Clear Naming**: Code now accurately reflects vLLM usage instead of legacy TGI
2. **Dynamic Adaptation**: Extension automatically detects and adapts to model context limits
3. **Better UX**: Users see actual token limits in tooltips
4. **Future-Proof**: Works with any vLLM model without hardcoding limits
5. **Backward Compatible**: Configuration key unchanged to avoid breaking existing setups

## Files Modified

### Core Files
- `src/provider.ts` - 50+ changes for rename and dynamic detection
- `src/extension.ts` - 4 changes for naming consistency
- `src/test/local-debug.test.ts` - Complete rewrite from TGI tests
- `src/test/local-integration.test.ts` - New test file for vLLM
- `src/test/token-calculation.test.ts` - Updated model ID format

### Deleted Files
- `src/test/tgi-integration.test.ts` - Replaced with local version
- Original `tgi-debug.test.ts` - Renamed to local-debug.test.ts

## Implementation Notes

### Token Allocation Strategy
The 85/15 split was chosen because:
- VS Code adds hidden context (workspace info, etc.)
- Users need reasonable output space
- Leaves buffer to prevent "context exceeded" errors

### Error Handling
- Gracefully falls back to 2048 tokens if detection fails
- Logs detection failures at debug level
- Continues to work even if `/v1/models` endpoint is unavailable

## Current Status

✅ All TGI references renamed to vLLM/local inference
✅ Dynamic token detection implemented and working
✅ Tests updated and passing
✅ Extension packaged and installed (v0.0.5)
✅ Verified working with live vLLM server at http://localhost:8000

The extension now properly detects and adapts to vLLM's context limits dynamically, providing a better experience for teams using vLLM servers with different model configurations.