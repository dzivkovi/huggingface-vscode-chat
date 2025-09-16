# Getting Started Guide

**Welcome to the Hugging Face VS Code Extension!** This guide helps you navigate the documentation and get started quickly.

## 📖 Documentation Structure

Read the documentation in this order based on your role and goals:

### For End Users (Just Want to Use the Extension)
1. **[05-installation.md](./05-installation.md)** - Install and configure the extension
2. **[06-setup-vllm.md](./06-setup-vllm.md)** - Set up local vLLM server (recommended)
3. **[07-vllm-vscode-integration.md](./07-vllm-vscode-integration.md)** - Configure VS Code for vLLM
4. **[04-setup-tgi.md](./04-setup-tgi.md)** - Set up local TGI server (legacy/deprecated)
5. **[07-viewing-logs.md](./07-viewing-logs.md)** - Access extension logs

### For Developers (Want to Modify/Contribute)
1. **[01-architecture.md](./01-architecture.md)** - Understand the technical design
2. **[03-setup-development.md](./03-setup-development.md)** - Development environment and build process
3. **[05-installation.md](./05-installation.md)** - Test your changes
4. **[04-setup-tgi.md](./04-setup-tgi.md)** - Local inference server setup

### For Decision Makers (Evaluating for Enterprise)
1. **[02-backend-decisions.md](./02-backend-decisions.md)** - Business case and strategy
2. **[01-architecture.md](./01-architecture.md)** - Technical architecture
3. **[04-setup-tgi.md](./04-setup-tgi.md)** - Deployment requirements

## 🚀 Quick Start Paths

### I Just Want to Try It (5 minutes)
1. Download the `.vsix` file
2. Follow **[05-installation.md](./05-installation.md)** → "Option 1: Use Hugging Face Router"
3. Get API key from Hugging Face
4. Start chatting in VS Code!

### I Want Local AI (30 minutes)
1. Install Docker and ensure GPU support
2. Follow **[06-setup-vllm.md](./06-setup-vllm.md)** to run vLLM server (recommended)
3. Follow **[07-vllm-vscode-integration.md](./07-vllm-vscode-integration.md)** to configure VS Code
4. Alternative: **[04-setup-tgi.md](./04-setup-tgi.md)** for TGI (legacy support)

### I Want to Develop/Contribute (60 minutes)
1. Clone the repository
2. Follow **[03-setup-development.md](./03-setup-development.md)** for environment setup
3. Read **[01-architecture.md](./01-architecture.md)** to understand the codebase
4. Make changes and test with local TGI

### I'm Evaluating for Enterprise
1. Read **[02-backend-decisions.md](./02-backend-decisions.md)** for business benefits
2. Review **[01-architecture.md](./01-architecture.md)** for technical requirements
3. Test with **[04-setup-tgi.md](./04-setup-tgi.md)** on representative hardware
4. Plan deployment with **[05-installation.md](./05-installation.md)**

## 💡 Key Concepts

### What This Extension Does
- **Integrates** with GitHub Copilot Chat interface
- **Provides** Hugging Face models as language model provider
- **Supports** multiple backends: Cloud (Router), Local (vLLM/TGI), CPU (Ollama)
- **Enables** air-gapped enterprise deployments

### What You Get
- **Same VS Code experience** as GitHub Copilot Chat
- **Choice of models** from Hugging Face ecosystem
- **Local inference** for privacy/security (vLLM recommended)
- **Enterprise-ready** air-gapped deployment

### Prerequisites
- **For Users**: VS Code + GitHub Copilot extension
- **For Local AI**: NVIDIA GPU + Docker (or CPU with Ollama)
- **For Development**: Node.js + pnpm + TypeScript knowledge

## 🆘 Need Help?

### Common Issues
- **Extension not appearing**: Ensure GitHub Copilot is installed
- **No models available**: Check configuration in VS Code settings
- **Connection errors**: Verify TGI server is running and accessible

### Support Resources
- **Configuration**: See individual setup guides
- **Troubleshooting**: Check the relevant setup document
- **Development**: See development setup guide
- **Issues**: File on GitHub repository

## 📋 Document Quick Reference

| Document | Purpose | Audience | Time |
|----------|---------|----------|------|
| [01-architecture.md](./01-architecture.md) | Technical design | Developers | 15 min |
| [02-backend-decisions.md](./02-backend-decisions.md) | Business strategy | Decision makers | 10 min |
| [03-setup-development.md](./03-setup-development.md) | Dev environment | Developers | 30 min |
| [04-setup-tgi.md](./04-setup-tgi.md) | Local TGI (legacy) | Users/Admins | 45 min |
| [06-setup-vllm.md](./06-setup-vllm.md) | Local vLLM (recommended) | Users/Admins | 30 min |
| [07-vllm-vscode-integration.md](./07-vllm-vscode-integration.md) | vLLM VS Code setup | Users/Admins | 10 min |
| [08-model-selection-guide.md](./08-model-selection-guide.md) | Choose models for your hardware | Developers | 15 min |
| [05-installation.md](./05-installation.md) | Extension install | Everyone | 10 min |
| [06-troubleshooting-tgi.md](./06-troubleshooting-tgi.md) | TGI debugging | Users/Admins | 20 min |
| [07-viewing-logs.md](./07-viewing-logs.md) | Log access | Everyone | 5 min |

Start with the document that matches your immediate goal!