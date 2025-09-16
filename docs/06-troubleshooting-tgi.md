# TGI (Text Generation Inference) Troubleshooting Guide

This guide helps troubleshoot common issues when using TGI servers with the Hugging Face VS Code extension.

## Common Error Messages and Solutions

### 1. Connection Failed Errors

#### Error: "Failed to connect to TGI server"
**Causes:**
- TGI server is not running
- Incorrect endpoint URL
- Firewall blocking connection
- Docker container not exposed on the correct port

**Solutions:**
1. Check if TGI is running:
   ```bash
   docker ps | grep text-generation-inference
   ```

2. Verify the endpoint URL in VS Code settings:
   - Open Settings (Ctrl+,)
   - Search for "huggingface.customTGIEndpoint"
   - Ensure format is: `http://192.168.160.1:8080` (no trailing slash)

3. Test connectivity:
   ```bash
   curl http://192.168.160.1:8080/health
   ```

4. Check Docker port mapping:
   ```bash
   docker inspect <container_id> | grep -A 10 "PortBindings"
   ```

### 2. Empty Response Errors

#### Error: "The TGI server returned an empty response"
**Common Causes:**
1. **Model crashed during generation**
   - Check Docker logs: `docker logs <container_name>`
   - Look for errors like:
     - `ValueError: Value out of range`
     - Integer overflow errors
     - Memory allocation failures

2. **Input exceeds context length**
   - Reduce prompt size
   - Check model's maximum context length

3. **Out of GPU memory**
   - Monitor GPU memory: `nvidia-smi`
   - Consider using smaller batch size or quantized models

**Solutions:**
```bash
# View TGI logs
docker logs --tail 100 <container_name>

# Restart TGI with lower max tokens
docker restart <container_name>

# Check GPU memory usage
watch -n 1 nvidia-smi
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