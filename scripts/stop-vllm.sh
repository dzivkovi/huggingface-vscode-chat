#!/bin/bash
# Stop vLLM server

echo "🛑 Stopping vLLM server..."

if docker ps | grep -q vllm-server; then
    docker stop vllm-server
    echo "✅ vLLM server stopped"
else
    echo "ℹ️  vLLM server is not running"
fi

echo ""
echo "To remove the container completely, run:"
echo "docker rm vllm-server"