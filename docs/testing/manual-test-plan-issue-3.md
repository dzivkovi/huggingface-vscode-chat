# Manual Test Plan for Local-Only Mode (v0.0.6)

## Test Scenarios for Issue #3

### Automated Unit Testing
**New in v0.0.6:** Comprehensive unit tests have been added to automatically verify local-only mode functionality.

**Run Unit Tests:**
```bash
# Command line
npm test

# VS Code Testing Panel
1. Open Testing sidebar (flask icon)
2. Click "Refresh Tests"
3. Run "local-only-mode.test.ts" suite
```

**Unit Test Coverage:**
- ✅ Local mode without API key (air-gapped scenario)
- ✅ Cloud mode with API key
- ✅ Mode switching between local and cloud
- ✅ Error handling for invalid endpoints
- ✅ Token calculation logic
- ✅ Model ID parsing

### Manual Test Scenarios

### 1. Air-Gapped Setup Test
**Setup:**
- Configure `huggingface.customTGIEndpoint` to local server (e.g., `http://localhost:8000`)
- Ensure NO HuggingFace API key is configured
- Start local vLLM/TGI server

**Expected Result:**
- Extension should activate without errors
- Model picker should show local models only
- NO prompts for HuggingFace API key
- Chat should work with local models

### 2. Cloud-Only Setup Test
**Setup:**
- Remove/clear `huggingface.customTGIEndpoint` setting
- Configure valid HuggingFace API key

**Expected Result:**
- Extension should activate normally
- Model picker should show HuggingFace cloud models
- Chat should work with cloud models

### 3. Mode Switching Test
**Setup:**
- Start with local endpoint configured
- Remove local endpoint configuration
- Add HuggingFace API key
- Reload extension

**Expected Result:**
- Should switch from local-only to cloud mode
- Model picker should update to show cloud models

### 4. Error Handling Test
**Setup:**
- Configure invalid local endpoint
- No HuggingFace API key

**Expected Result:**
- Should handle error gracefully
- Should still show generic local model entry
- Error should be logged but not crash extension

## Validation Checklist

### Automated Tests (Run First)
- [ ] Unit tests pass: `npm test`
- [ ] VS Code Testing panel shows all tests green
- [ ] Test coverage includes local-only mode scenarios

### Manual Validation
- [ ] Local inference works WITHOUT HF API key
- [ ] No authentication prompts in local mode
- [ ] Extension activates in air-gapped environment
- [ ] Mode switching works correctly
- [ ] No regression in HF cloud functionality
- [ ] Version 0.0.6 displays in extension details

## Testing Infrastructure Improvements (v0.0.6)

### VS Code Testing Panel Integration
- Fixed missing `@vscode/test-cli` dependency
- Added `src/test/runTest.ts` for VS Code test runner
- Added `src/test/index.ts` for Mocha orchestration
- Created `.vscode-test.js` for test configuration

### Test File Organization
- Moved test documentation to `docs/testing/`
- Moved test utilities to `scripts/testing/`
- All unit tests in `src/test/*.test.ts`
- Compiled tests in `out/test/*.test.js`

## Log Messages to Verify

When in local-only mode, check VS Code Output panel for:
- "Local inference endpoint configured - operating in local-only mode"
- "Returning X local model(s) - HF cloud models skipped"

When in cloud mode, check for:
- "No local endpoint configured - operating in cloud mode"