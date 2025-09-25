# Configuration Guide - VS Code Settings

## ✅ NEW: Configure Without Recompiling!

Starting with v0.0.6, all performance settings are now configurable through VS Code settings. **No recompilation needed!**

## How to Configure Settings

### Option 1: VS Code Settings UI (Recommended)

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "huggingface"
3. Adjust the settings:
   - **Token Allocation** settings for input/output ratios
   - **Timeouts** for network performance
   - **Custom TGI Endpoint** for your local server

### Option 2: Settings JSON

Add to your `.vscode/settings.json`:

```json
{
    // Your team's server
    "huggingface.customTGIEndpoint": "http://your-team-server:8443",

    // Token allocation (no rebuild needed!)
    "huggingface.tokenAllocation.inputRatio": 0.7,
    "huggingface.tokenAllocation.outputRatio": 0.25,
    "huggingface.tokenAllocation.minimumOutput": 200,

    // Network timeouts (milliseconds)
    "huggingface.timeouts.localHealthCheck": 10000,
    "huggingface.timeouts.localModelFetch": 10000
}
```

**Changes take effect immediately on the next request!**

## Available Settings

### 1. Token Allocation Ratios

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `huggingface.tokenAllocation.inputRatio` | 0.65 | 0.1-0.9 | Portion of context for input |
| `huggingface.tokenAllocation.outputRatio` | 0.15 | 0.05-0.5 | Portion of context for output |
| `huggingface.tokenAllocation.minimumOutput` | 100 | 50-1000 | Minimum tokens reserved for output |

**How to tune:**
- **For long conversations**: Set inputRatio to 0.5, outputRatio to 0.25
- **For short prompts**: Set inputRatio to 0.75 for more context
- **For code generation**: Set outputRatio to 0.3 for longer responses

### 2. Network Timeouts

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `huggingface.timeouts.localHealthCheck` | 5000 | 1000-30000 | Health check timeout (ms) |
| `huggingface.timeouts.localModelFetch` | 5000 | 1000-30000 | Model fetch timeout (ms) |

**How to tune:**
- **Slow networks**: Set to 10000 (10 seconds)
- **Local fast servers**: Set to 2000 (2 seconds) for faster failure detection
- **Remote servers**: Set to 15000 for cross-datacenter latency

## Real-World Scenarios

### Scenario 1: Air-Gapped Government Installation
```typescript
// Conservative for stability
const TOKEN_ALLOCATION = {
    INPUT_RATIO: 0.6,       // Safe margin
    OUTPUT_RATIO: 0.15,     // Prevent overruns
    MINIMUM_OUTPUT: 100
};

const TIMEOUTS = {
    LOCAL_HEALTH_CHECK: 3000,   // Fast local network
    LOCAL_MODEL_FETCH: 3000
};
```

### Scenario 2: Research Team with Large Models
```typescript
// Maximize context usage
const TOKEN_ALLOCATION = {
    INPUT_RATIO: 0.75,      // Large input documents
    OUTPUT_RATIO: 0.2,      // Detailed analysis
    MINIMUM_OUTPUT: 500     // Long explanations
};

const TIMEOUTS = {
    LOCAL_HEALTH_CHECK: 15000,  // Large model startup
    LOCAL_MODEL_FETCH: 15000
};
```

### Scenario 3: Code Generation Focus
```typescript
// Optimized for code output
const TOKEN_ALLOCATION = {
    INPUT_RATIO: 0.5,       // Brief prompts
    OUTPUT_RATIO: 0.45,     // Maximum code generation
    MINIMUM_OUTPUT: 1000    // Full functions
};
```

## Benefits of Externalized Settings

### 1. **Team Customization**
Different teams can tune for their needs without forking:
- Data Science: More output for analysis
- DevOps: Quick responses, short outputs
- Documentation: Balanced for explanations

### 2. **Model-Specific Tuning**
```typescript
// For 2K context model
INPUT_RATIO: 0.65  // Conservative

// For 32K context model
INPUT_RATIO: 0.8   // Use more context
```

### 3. **Network Adaptation**
```typescript
// LAN deployment
LOCAL_HEALTH_CHECK: 1000  // 1 second is enough

// Cloud deployment
LOCAL_HEALTH_CHECK: 20000 // Account for cold starts
```

### 4. **Debugging Made Easy**
```typescript
// Debugging token issues
console.log(`Input allocation: ${contextLimit * TOKEN_ALLOCATION.INPUT_RATIO}`);
console.log(`Output allocation: ${contextLimit * TOKEN_ALLOCATION.OUTPUT_RATIO}`);
```

## How to Find Your Optimal Settings

### 1. Start with Defaults
```typescript
INPUT_RATIO: 0.65, OUTPUT_RATIO: 0.15
```

### 2. Monitor Logs
Look for:
- "Token limit exceeded" → Decrease INPUT_RATIO
- "Response truncated" → Increase OUTPUT_RATIO
- "Timeout fetching" → Increase TIMEOUTS

### 3. Adjust Gradually
- Change by 0.05 increments
- Test with typical workloads
- Document what works

### 4. Share with Team
Create a team config:
```typescript
// ACME Corp Settings (tested with vLLM 0.5.0)
const TOKEN_ALLOCATION = {
    INPUT_RATIO: 0.7,       // Works well with our GPT-4 prompts
    OUTPUT_RATIO: 0.25,     // Good for our code reviews
    MINIMUM_OUTPUT: 200     // Ensures complete responses
};
```

## Quick Reference

| Setting | Default | Conservative | Aggressive | Use Case |
|---------|---------|--------------|------------|----------|
| INPUT_RATIO | 0.65 | 0.5 | 0.8 | How much context to use |
| OUTPUT_RATIO | 0.15 | 0.1 | 0.4 | Response length |
| MINIMUM_OUTPUT | 100 | 50 | 500 | Guarantee minimum tokens |
| HEALTH_CHECK | 5000 | 10000 | 2000 | Network speed |
| MODEL_FETCH | 5000 | 10000 | 2000 | Model list retrieval |

## Future Enhancements

With externalized constants, we can easily add:

1. **Per-model configuration**
```typescript
const MODEL_CONFIGS = {
    "deepseek-coder": { INPUT_RATIO: 0.7 },
    "llama-70b": { INPUT_RATIO: 0.6 }
};
```

2. **Dynamic adjustment**
```typescript
// Automatically reduce ratio if token errors occur
if (tokenLimitError) {
    TOKEN_ALLOCATION.INPUT_RATIO *= 0.9;
}
```

3. **User preferences**
```typescript
// VS Code settings UI
"huggingface.preferLongResponses": true
// Automatically sets OUTPUT_RATIO to 0.3
```

## Your Next Steps

1. **Test current settings** with your typical workload
2. **Note any issues** (truncation, timeouts)
3. **Adjust constants** based on your needs
4. **Share configurations** with your team
5. **Request features** for settings you need exposed

The externalized settings make the extension adaptable to YOUR specific needs without waiting for updates!