# Development Setup

## Prerequisites

- **Node.js**: Latest LTS version
- **pnpm**: Version 8.15.4+ (package manager)
- **VS Code**: Version 1.104.0+ (for extension development)

## Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd huggingface-vscode-chat
pnpm install                    # Installs deps + VS Code API
```

## Development Commands

### Build & Compile
```bash
pnpm run compile               # TypeScript → JavaScript
pnpm run watch                 # Development mode with auto-compile
```

### Code Quality
```bash
pnpm run lint                  # ESLint checks
pnpm run format                # Prettier formatting
pnpm run test                  # Run test suite
```

### Extension Testing
```bash
# In VS Code
F5                             # Launch Extension Development Host
```

### Development Scripts
```bash
# Quick rebuild and reinstall
scripts/rebuild-extension.sh      # Compiles, packages, and reinstalls

# Test vLLM API endpoints
scripts/test-vllm.sh              # Tests model listing and chat completion
```

### Package for Distribution

#### Prerequisites for Packaging
```bash
# Install VS Code Extension Manager (if not installed)
npm install -g @vscode/vsce
```

#### Build and Package Steps
```bash
# 1. Ensure clean build
pnpm run compile               # Compile TypeScript
pnpm run test                  # Ensure tests pass

# 2. Create VSIX package
npx @vscode/vsce package       # Creates .vsix file (e.g., huggingface-vscode-chat-0.0.5.vsix)
```

#### Install Locally for Testing
```bash
# Method 1: Command line
code --install-extension huggingface-vscode-chat-0.0.5.vsix

# Method 2: VS Code UI
# 1. Ctrl+Shift+P → "Extensions: Install from VSIX"
# 2. Select the .vsix file
# 3. Reload VS Code
```

#### Package Structure
The `.vsix` file excludes:
- Source TypeScript files (`src/`)
- Development tools (`node_modules/test/`)
- Large cache files (`data/` directory)
- Analysis documents (`analysis/`)
- Test files and logs

See `.vscodeignore` for complete exclusion list.

## File Structure

```
src/
├── extension.ts               # Entry point, provider registration
├── provider.ts                # Main chat provider implementation
├── types.ts                   # TypeScript interfaces
└── utils.ts                   # Helper functions

docs/                          # Documentation (this file)
out/                          # Compiled JavaScript
```

## Configuration for Testing

### Local TGI Development
```json
// VS Code settings.json
{
  "huggingface.inferenceBackend": "tgi",
  "huggingface.baseUrl": "http://localhost:8080",
  "huggingface.requiresApiKey": false
}
```

### Cloud Router Fallback
```json
{
  "huggingface.inferenceBackend": "router",
  "huggingface.baseUrl": "https://router.huggingface.co/v1",
  "huggingface.requiresApiKey": true
}
```

## Technical Details

- **TypeScript**: ES2024 target, Node16 modules
- **Dependencies**: Zero runtime deps (dev-only tooling)
- **Test Framework**: Mocha with vscode-test
- **API Compatibility**: OpenAI-compatible endpoints
- **Authentication**: VS Code SecretStorage for API keys

## Release Process

- **Trigger**: Push to `release/**` branch
- **Automation**: GitHub Actions handles VSIX packaging
- **Publishing**: Automated VS Code Marketplace deployment