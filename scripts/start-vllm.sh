#!/bin/bash
# Start vLLM server for RTX 4060 (8GB VRAM)
# This script starts the vLLM Docker container with all required parameters

echo "🚀 Starting vLLM server..."

# Check if container already exists
if docker ps -a | grep -q vllm-server; then
    echo "📦 Container 'vllm-server' already exists"

    # Check if it's running
    if docker ps | grep -q vllm-server; then
        echo "✅ vLLM server is already running!"
        echo "🌐 API available at: http://localhost:8000"
    else
        echo "▶️  Starting existing container..."
        docker start vllm-server
        echo "⏳ Waiting for vLLM to initialize (this takes 1-2 minutes)..."
        sleep 10
    fi
else
    echo "📦 Creating new vLLM container..."
    docker run -d --name vllm-server \
        --gpus all \
        --shm-size=4g \
        --ipc=host \
        -p 8000:8000 \
        -v ~/.cache/huggingface:/root/.cache/huggingface \
        vllm/vllm-openai:latest \
        --model TheBloke/deepseek-coder-6.7B-instruct-AWQ \
        --quantization awq \
        --gpu-memory-utilization 0.85 \
        --max-model-len 2048 \
        --max-num-seqs 16 \
        --disable-log-stats

    if [ $? -eq 0 ]; then
        echo "✅ Container created successfully!"
        echo "⏳ Waiting for model to load (this takes 2-3 minutes on first run)..."
        sleep 10
    else
        echo "❌ Failed to create container. Check Docker Desktop and GPU availability."
        exit 1
    fi
fi

# Monitor startup progress
echo ""
echo "📊 Monitoring startup progress..."
echo "----------------------------------------"

# Wait for server to be ready
MAX_ATTEMPTS=60  # 5 minutes maximum
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    # Check if model endpoint responds
    if curl -s http://localhost:8000/v1/models 2>/dev/null | grep -q "deepseek-coder"; then
        echo ""
        echo "✅ vLLM server is ready!"
        echo "🌐 API endpoint: http://localhost:8000"
        echo "📝 VS Code setting: huggingface.localEndpoint = http://localhost:8000"
        echo ""
        echo "Test with: curl http://localhost:8000/v1/models"
        exit 0
    fi

    # Show progress dots
    echo -n "."
    sleep 5
    ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "⚠️  Server is taking longer than expected. Check logs with:"
echo "docker logs vllm-server --tail 50"