# TGI Empty Response Debugging and Fix

Date: 2025-09-16 at 14:21:45 EST

## Context

After implementing TGI support for the Hugging Face VS Code extension, the user reported that while Hugging Face models worked fine, their locally hosted TGI server was returning no response despite appearing to complete successfully in the logs.

## The Problem

The extension logs showed:
- Request successfully sent to TGI server (`http://192.168.160.1:8080/v1/completions`)
- Stream started and data received
- `[DONE]` signal received indicating completion
- "Streaming response completed successfully"

However, the user received no output in the GitHub Copilot Chat UI.

The Docker logs revealed the actual issue:
```
ValueError: Value out of range: -172312851
2025-09-16T13:57:05.369238Z ERROR batch{batch_size=1}:decode:decode{size=1}:decode{size=1}: text_generation_router_v3::client: backends/v3/src/client/mod.rs:45: Server error: Value out of range: -172312851
```

## Root Cause Analysis

1. **TGI Server Bug**: The TGI server encountered an integer overflow error during decoding, likely due to:
   - Large prompt size (4538 characters)
   - Quantization issues with the model (bitsandbytes-nf4)
   - Internal TGI decoding bug

2. **Extension Silent Failure**: The extension was receiving SSE events including `[DONE]` but no actual text content. It marked this as "successful" even though no content was emitted to the user.

## Solution Implemented

### Enhanced Logging
```typescript
// Track what content is actually emitted
logger.debug(`Processing text content: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);

// Log when no text content in delta
logger.debug(`Received delta with no text content`, {
    hasChoice: !!choice,
    hasDelta: !!deltaObj,
    choiceKeys: choice ? Object.keys(choice) : [],
    deltaKeys: deltaObj ? Object.keys(deltaObj) : []
});

// Log SSE deltas for debugging
if (!this._hasEmittedAssistantText || Math.random() < 0.05) {
    logger.debug(`SSE delta received`, {
        data: JSON.stringify(parsed).substring(0, 300)
    });
}

// Warn when stream completes with no content
if (!this._hasEmittedAssistantText) {
    logger.warn("Stream completed but no text was emitted - possible server error");
}
```

### User-Visible Error Handling
```typescript
// In finally block - detect empty responses
if (!this._hasEmittedAssistantText && !token.isCancellationRequested) {
    logger.error("Stream completed but no content was emitted to user");
    try {
        progress.report(new vscode.LanguageModelTextPart(
            "The server returned an empty response. This may indicate a server error. Please check the TGI Docker logs."
        ));
        logger.warn("Emitted empty response warning to user");
    } catch (reportError) {
        logger.error("Failed to report empty response warning", reportError);
    }
}

// In error handler - provide feedback on errors
if (!this._hasEmittedAssistantText) {
    try {
        progress.report(new vscode.LanguageModelTextPart(
            "I encountered an error while processing the response. Please check the logs for details."
        ));
        logger.warn("Emitted error message to user due to stream error with no prior content");
    } catch (reportError) {
        logger.error("Failed to report error message to user", reportError);
    }
}
```

## Viewing Logs

Created documentation at `docs/viewing-logs.md` explaining:

1. **How to access logs**:
   - Open Output panel (`Ctrl+Shift+U`)
   - Select "Hugging Face Chat Provider" from dropdown

2. **What's logged**:
   - Extension activation and TGI endpoint configuration
   - Model discovery and loading
   - API request details (endpoint, model, parameters)
   - Streaming response events and SSE deltas
   - Parse errors and warnings
   - Connection issues and timeouts

## Recommendations for TGI Issues

1. **Reduce prompt size** - The 4538 character prompt may be triggering the overflow
2. **Update TGI** - Check for newer versions that may fix the integer overflow bug
3. **Try different quantization** - The bitsandbytes-nf4 quantization may be problematic
4. **Monitor Docker logs** - The real errors appear in Docker, not VS Code

## Key Improvements

- Extension now properly detects and reports empty responses
- Enhanced logging shows exactly what data is received from TGI
- User gets clear feedback when TGI fails instead of silent failure
- Better debugging tools for future issues

## Files Modified

- `/src/provider.ts` - Added comprehensive logging and error handling
- `/src/extension.ts` - Added logger initialization and logging
- `/src/utils.ts` - Updated error logging to use logger
- `/src/logger.ts` - Created new logger module with OutputChannel
- `/docs/viewing-logs.md` - Created documentation for viewing logs