# Multi-Backend Architecture

## Core Design

**Transform**: Hugging Face Router-only → Multi-backend provider system

**Goal**: Enable air-gapped enterprise deployments while maintaining GitHub Copilot Chat integration

## Provider Architecture

```
VS Code GitHub Copilot Chat Interface
            ↓
    HuggingFaceChatModelProvider
            ↓
    Current Implementation:
        - router   (HF cloud - default)
        - customTGIEndpoint (supports vLLM/TGI/OpenAI-compatible)

    Supported Servers via customTGIEndpoint:
        - vLLM     (Recommended for local GPU)
        - TGI      (Legacy, deprecated)
        - Ollama   (CPU-friendly)
        - Any OpenAI-compatible server
```

### Configuration System

**Actual Implementation (as of v0.0.5):**
- `huggingface.customTGIEndpoint`: URL for local inference server
  - Works with vLLM, TGI, or any OpenAI-compatible endpoint
  - Example: `http://localhost:8000` for vLLM
  - Example: `http://localhost:8080` for TGI

**How It Works:**
1. If `customTGIEndpoint` is set, extension uses it for local inference
2. Models appear with prefix `tgi|` in the model picker
3. Extension auto-detects model capabilities from server
4. Dynamic token calculation based on model's context length

## Enterprise Benefits

See **[02-backend-decisions.md](./02-backend-decisions.md)** for complete business case and strategic benefits.

**Key Technical Advantages:**
- **Multi-backend flexibility**: Router/TGI/Ollama/Custom endpoints
- **VS Code integration maintained**: Same GitHub Copilot Chat interface
- **OpenAI API compatibility**: Full tool calling and streaming support

## Technical Implementation

### Provider Pattern
- **Single provider class** with configurable backend
- **OpenAI API compatibility** - unified interface
- **Streaming responses** - real-time token generation
- **Dynamic reconfiguration** - change backends without restart

### Message Flow
```
User Query → VS Code Chat → Provider → TGI Server → GPU Inference → Streaming Response
```

### Authentication Strategy
- **Cloud backends**: Bearer token authentication
- **Local backends**: No authentication required
- **Conditional headers**: Auth only when needed

## Deployment Scenarios

### Enterprise Data Center (Target)
- **Hardware**: 8 x H200 servers
- **Model**: Large coding models (7B-70B)
- **Network**: Internal TGI cluster
- **Access**: Employee laptops via company network

### Development Workstation
- **Hardware**: RTX 4060 (8GB VRAM)
- **Model**: StarCoder2-3B (proven working)
- **Setup**: Docker TGI container
- **Access**: localhost:8080

### Corporate Laptop
- **Hardware**: CPU-only
- **Model**: Ollama with quantization
- **Fallback**: Automatic CPU inference
- **Performance**: 2-12 tokens/sec

## Architecture Advantages

### Simplicity
- **Single extension** - works across all environments
- **Minimal complexity** - shared provider interface
- **Easy maintenance** - configuration-driven differences

### Security
- **No cloud dependency** - all inference local
- **Secret isolation** - API keys only for cloud fallback
- **Audit compliance** - full traffic control

### Performance
- **GPU optimization** - TGI maximizes H200 utilization
- **Memory efficiency** - quantization for smaller GPUs
- **Low latency** - no network round-trips to cloud

This architecture enables enterprises to use the familiar GitHub Copilot Chat interface with their own infrastructure, maintaining security and performance while providing developers with the same quality experience.