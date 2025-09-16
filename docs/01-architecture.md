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
    ConfigurableBackend {
        - router   (HF cloud)
        - tgi      (Text Generation Inference)
        - ollama   (Local CPU/GPU)
        - custom   (OpenAI-compatible)
    }
```

### Configuration System

**Settings-driven backend selection:**
- `inferenceBackend`: enum ["router", "tgi", "ollama", "custom"]
- `baseUrl`: dynamic endpoint (localhost:8080 for TGI)
- `requiresApiKey`: auto-detection per backend
- `contextLength` + `maxTokens`: model-specific tuning

### Backend Auto-Detection

```typescript
// Smart defaults based on backend choice
if (backend === "tgi") {
    baseUrl = "http://localhost:8080";
    requiresApiKey = false;
}
```

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