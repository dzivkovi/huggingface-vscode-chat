# Viewing Extension Logs

The Hugging Face Chat Provider extension now includes comprehensive logging to help debug issues.

## How to View Logs

1. **Open the Output Panel**:
   - Use keyboard shortcut: `Ctrl+Shift+U` (or `Cmd+Shift+U` on Mac)
   - Or from menu: View → Output

2. **Select the Log Channel**:
   - In the Output panel, find the dropdown on the right side
   - Select **"Hugging Face Chat Provider"** from the dropdown

## What's Logged

The extension logs:
- Extension activation and initialization
- TGI endpoint configuration
- Model discovery and loading
- API requests (endpoint, model, parameters)
- Streaming response events
- Parse errors and warnings
- Connection issues and timeouts
- Error details with stack traces

## Log Levels

- **INFO**: General information about operations
- **DEBUG**: Detailed information for debugging
- **WARN**: Warnings about potential issues
- **ERROR**: Error messages with details

## Example Log Output

```
[2025-09-16T04:30:00.123Z] [0.001s] [INFO] Hugging Face Chat Provider extension activating...
[2025-09-16T04:30:00.125Z] [0.003s] [INFO] Extension version: 0.0.5, VS Code version: 1.104.0
[2025-09-16T04:30:00.126Z] [0.004s] [INFO] TGI endpoint configured: http://192.168.160.1:8080
[2025-09-16T04:30:00.127Z] [0.005s] [INFO] Hugging Face Chat Provider registered successfully
[2025-09-16T04:30:05.234Z] [5.112s] [INFO] Processing TGI request to http://192.168.160.1:8080
[2025-09-16T04:30:05.235Z] [5.113s] [DEBUG] TGI request prepared
{
  "endpoint": "http://192.168.160.1:8080/v1/completions",
  "model": "bigcode/starcoder2-3b",
  "promptLength": 45,
  "maxTokens": 2048
}
[2025-09-16T04:30:05.567Z] [5.445s] [DEBUG] Request sent to http://192.168.160.1:8080/v1/completions
[2025-09-16T04:30:05.789Z] [5.667s] [DEBUG] Stream started - receiving data
[2025-09-16T04:30:08.123Z] [8.001s] [DEBUG] Received [DONE] signal from streaming response
[2025-09-16T04:30:08.124Z] [8.002s] [DEBUG] Streaming response completed successfully
```

## Troubleshooting Common Issues

### No Response from TGI
Look for:
- `Processing TGI request to...` - Confirms request is being sent
- `Request sent to...` - Shows the exact endpoint
- `Stream started` - Indicates server is responding
- Any ERROR entries about timeouts or connection issues

### Parse Errors
Look for:
- `Failed to parse SSE line` - Shows malformed data from server
- The logged data fragment helps identify format issues

### Connection Drops
Look for:
- `Stream read error - connection may have dropped`
- `Stream timeout - no data received for 60 seconds`
- Stack traces in ERROR logs

## Reload After Configuration Changes

When you change the TGI endpoint in settings, the extension will prompt you to reload. Check the logs after reload to confirm the new endpoint is configured correctly.