#!/bin/bash

echo "=== Testing vLLM Server ==="

# Test 1: Simple completion
echo -e "\n1. Testing basic chat completion..."
curl -s -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "TheBloke/deepseek-coder-6.7B-instruct-AWQ",
    "messages": [
      {"role": "user", "content": "Write hello world in Python"}
    ],
    "max_tokens": 50
  }' | jq -r '.choices[0].message.content'

# Test 2: Code generation
echo -e "\n2. Testing code generation..."
curl -s -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "TheBloke/deepseek-coder-6.7B-instruct-AWQ",
    "messages": [
      {"role": "user", "content": "Write a function to check if a number is prime"}
    ],
    "max_tokens": 200,
    "temperature": 0.2
  }' | jq -r '.choices[0].message.content'

# Test 3: Multi-turn conversation
echo -e "\n3. Testing conversation..."
curl -s -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "TheBloke/deepseek-coder-6.7B-instruct-AWQ",
    "messages": [
      {"role": "system", "content": "You are a helpful coding assistant"},
      {"role": "user", "content": "What is a REST API?"},
      {"role": "assistant", "content": "A REST API is a web service architecture..."},
      {"role": "user", "content": "Can you show me a simple example?"}
    ],
    "max_tokens": 300
  }' | jq -r '.choices[0].message.content'

echo -e "\n=== Tests Complete ==="