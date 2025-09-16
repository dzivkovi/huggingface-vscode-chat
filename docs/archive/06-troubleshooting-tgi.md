# Local Inference Server Troubleshooting Guide

This guide helps troubleshoot common issues when using vLLM or TGI servers with the Hugging Face VS Code extension.

## Common Error Messages and Solutions

### 1. Connection Failed Errors

#### Error: "Failed to connect to server"
**Causes:**
- Server is not running
- Incorrect endpoint URL
- Firewall blocking connection
- Docker container not exposed on the correct port

**Solutions:**

For vLLM:
1. Check if vLLM is running:
   ```bash
   docker ps | grep vllm
   ```

2. Verify the endpoint URL in VS Code settings:
   - Open Settings (Ctrl+,)
   - Search for "huggingface.customTGIEndpoint"
   - For vLLM: `http://localhost:8000` (no trailing slash)
   - For TGI: `http://localhost:8080` (no trailing slash)

3. Test connectivity:
   ```bash
   curl http://192.168.160.1:8080/health
   ```

4. Check Docker port mapping:
   ```bash
   docker inspect <container_id> | grep -A 10 "PortBindings"
   ```

### 2. Token Limit Errors

#### vLLM: "maximum context length is 2048 tokens"
**Common Causes:**
1. **Input too large for model context**
   - vLLM strictly enforces context limits
   - Extension automatically calculates max_tokens based on input size

**Solutions:**
- Reduce prompt size
- Use a model with larger context window
- Check actual context limit: `curl http://localhost:8000/v1/models`

#### TGI: "The server returned an empty response"
**Common Causes:**
1. **Model crashed (integer overflow)**
   - TGI has known stability issues with large contexts
   - Consider switching to vLLM

**Solutions:**
```bash
# View server logs
docker logs --tail 100 <container_name>

# For vLLM - check model info
curl http://localhost:8000/v1/models

# For TGI - restart container
docker restart <container_name>
```

### 3. HTTP Status Errors

#### 404 Not Found
**Meaning:** The endpoint path is incorrect

**Solution:**
- Ensure TGI is configured to serve at `/v1/completions`
- Check the endpoint URL doesn't have typos

#### 500 Internal Server Error
**Common Causes:**
- Model quantization issues
- Input validation failures
- Memory allocation errors

**Solutions:**
1. Check Docker logs for specific error:
   ```bash
   docker logs <container_name> | grep ERROR
   ```

2. Restart TGI with different parameters:
   ```bash
   docker run --gpus all \
     --shm-size 1g \
     -p 8080:80 \
     -v $PWD/data:/data \
     ghcr.io/huggingface/text-generation-inference:latest \
     --model-id bigcode/starcoder2-3b \
     --max-input-length 2048 \
     --max-total-tokens 4096
   ```

#### 503 Service Unavailable
**Meaning:** TGI server is not ready

**Common Causes:**
- Model still loading
- Server crashed and restarting
- Out of resources

**Solutions:**
1. Wait for model to load (can take several minutes for large models)
2. Check server status:
   ```bash
   curl http://192.168.160.1:8080/health
   ```
3. Monitor Docker logs during startup:
   ```bash
   docker logs -f <container_name>
   ```

### 4. Model Loading Issues

#### Quantization Errors
**Error Example:** "Integer overflow in quantized weights"

**Solutions:**
1. Use a different quantization method:
   ```bash
   # Try without quantization
   docker run ... --quantize none

   # Or try different quantization
   docker run ... --quantize bitsandbytes
   ```

2. Use a pre-quantized model from Hugging Face Hub

#### Memory Errors
**Error:** "CUDA out of memory"

**Solutions:**
1. Reduce batch size:
   ```bash
   docker run ... --max-batch-prefill-tokens 512
   ```

2. Use a smaller model or quantized version

3. Increase shared memory:
   ```bash
   docker run --shm-size 2g ...
   ```

## Debugging Steps

### 1. Enable Detailed Logging

In VS Code:
1. Open the Output panel (View → Output)
2. Select "Hugging Face Chat Provider" from dropdown
3. Watch logs during requests

### 2. Test TGI Directly

Test your TGI server without VS Code:

```bash
# Test health endpoint
curl http://192.168.160.1:8080/health

# List available models
curl http://192.168.160.1:8080/v1/models

# Test completion
curl -X POST http://192.168.160.1:8080/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "bigcode/starcoder2-3b",
    "prompt": "def hello():",
    "max_tokens": 50,
    "stream": false
  }'
```

### 3. Monitor TGI Performance

```bash
# Watch Docker stats
docker stats <container_name>

# Monitor logs in real-time
docker logs -f <container_name>

# Check GPU utilization
nvidia-smi -l 1
```

## Recommended TGI Configuration

For RTX 4060 (8GB VRAM), here's a tested configuration:

```bash
docker run --gpus all \
  --shm-size 1g \
  -p 8080:80 \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id bigcode/starcoder2-3b \
  --quantize bitsandbytes-nf4 \
  --max-input-length 2048 \
  --max-total-tokens 4096 \
  --max-batch-prefill-tokens 512
```

## Getting Help

If you continue experiencing issues:

1. **Check TGI Documentation**: https://huggingface.co/docs/text-generation-inference
2. **Report Extension Issues**: https://github.com/anthropics/claude-code/issues
3. **TGI GitHub Issues**: https://github.com/huggingface/text-generation-inference/issues

### Information to Include in Bug Reports

When reporting issues, include:
1. TGI Docker command used
2. Model name and size
3. GPU model and VRAM
4. Error messages from:
   - VS Code Output panel
   - Docker logs (`docker logs <container>`)
5. TGI version (`docker images | grep text-generation`)