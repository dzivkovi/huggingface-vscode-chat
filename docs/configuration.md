# Configuration Reference

## Basic Settings

### Local Endpoint
```json
{
  "huggingface.localEndpoint": "http://localhost:8000"
}
```
Point to your vLLM, TGI, or Ollama server. Clear to use cloud models.

## Token Allocation

Control how context window is divided between input and output:

```json
{
  "huggingface.tokenAllocation.inputRatio": 0.65,    // Default: 65% for input
  "huggingface.tokenAllocation.outputRatio": 0.15,   // Default: 15% for output
  "huggingface.tokenAllocation.minimumOutput": 100    // Minimum tokens for response
}
```

### When to Adjust

**Getting token limit errors?**
- Increase `inputRatio` to 0.75
- Decrease `outputRatio` to 0.10

**Need longer responses?**
- Decrease `inputRatio` to 0.50
- Increase `outputRatio` to 0.30

## Network Timeouts

```json
{
  "huggingface.timeouts.localHealthCheck": 10000,   // 10 seconds
  "huggingface.timeouts.localModelFetch": 10000     // 10 seconds
}
```

Increase for slower servers or remote connections.

## VS Code Context Settings

Reduce context usage for small models (2048-4096 tokens):

```json
{
  "github.copilot.chat.editor.temporalContext.enabled": false,
  "github.copilot.chat.edits.temporalContext.enabled": false,
  "github.copilot.chat.edits.suggestRelatedFilesFromGitHistory": false
}
```

## Complete Example

For RTX 4060 with DeepSeek 6.7B:
```json
{
  "huggingface.localEndpoint": "http://localhost:8000",
  "huggingface.tokenAllocation.inputRatio": 0.70,
  "huggingface.tokenAllocation.outputRatio": 0.20,
  "github.copilot.chat.editor.temporalContext.enabled": false
}
```