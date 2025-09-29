# Contributing to Hugging Face VS Code Chat Extension

Thank you for your interest in contributing! This extension brings both cloud and local inference capabilities to VS Code, and we welcome contributions that enhance either aspect.

## 🎯 Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/huggingface-vscode-chat
cd huggingface-vscode-chat

# 2. Install dependencies
npm install

# 3. Run tests first (TDD is mandatory)
npm run test

# 4. Open in VS Code and press F5 to debug
code .
```

## 📋 Before You Start

1. **Check existing issues** - Your idea might already be discussed
2. **Open an issue first** - Discuss your proposed changes before coding
3. **Read CLAUDE.md** - Contains critical development guidelines for AI assistants and developers
4. **One feature per PR** - Keep changes focused and reviewable

## 🔧 Development Workflow

### Test-Driven Development (MANDATORY)

**All contributions MUST follow TDD:**

```bash
# 1. Write failing test first
# 2. Run: npm run test  (confirm it fails ❌)

# 3. Write minimal code to pass
# 4. Run: npm run test  (confirm it passes ✓)

# 5. Refactor if needed
# 6. Run: npm run test  (ensure all tests still pass ✓✓)
```

### VS Code Extension Development

**Debug the extension:**
1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test your changes in the new VS Code window
4. Set breakpoints in `src/` files for debugging

**Essential commands:**
```bash
npm run compile    # Build TypeScript
npm run watch      # Auto-compile on changes
npm run lint       # Check code quality
npm run format     # Format with Prettier
npm run package    # Create VSIX for testing
```

### Local Inference Testing

For changes affecting local inference:

```bash
# Start local vLLM server (requires NVIDIA GPU)
docker run -d --name vllm-test --gpus all -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model TheBloke/deepseek-coder-6.7B-instruct-AWQ \
  --quantization awq \
  --max-model-len 2048

# Test endpoint
scripts/test-vllm.sh

# Configure VS Code
# Set: "huggingface.localEndpoint": "http://localhost:8000"
```

## 📝 Contribution Process

### 1. Design First (Optional but Recommended)

For complex features, use our design template:
```bash
# Create design document from template
cp analysis/0000/README.md analysis/0000/DESIGN.md
# Edit DESIGN.md with your proposal
# Then run: /issue "Your issue title" (if using Claude Code)
```

### 2. Create Issue

Use our templates:
- **[Story]** - User-facing features
- **[Epic]** - Large features with multiple parts
- **[Chore]** - Refactoring, build improvements

### 3. Submit Pull Request

Your PR should:
- Reference the issue: `Closes #123`
- Include test results (before/after)
- Update documentation if needed
- Pass all CI checks

Use our PR template which focuses on:
- Evaluation results
- Implementation approach
- Validation checklist

## 🎯 Areas We Need Help

- **Local Inference**: Improving vLLM/TGI integration
- **Token Management**: Better context limit handling
- **Model Support**: Adding new inference providers
- **Testing**: Increasing test coverage
- **Documentation**: Improving setup guides
- **Performance**: Optimizing streaming response handling

## 🚫 What NOT to Do

- **Don't** commit without running tests
- **Don't** add emojis to code/docs (unless explicitly requested)
- **Don't** make large changes without discussion
- **Don't** mix features in one PR
- **Don't** skip the TDD workflow

## 🏗️ Project Structure

```
src/
├── extension.ts    # Extension entry point
├── provider.ts     # Chat provider implementation
├── types.ts        # TypeScript interfaces
├── utils.ts        # Utility functions
└── logger.ts       # Logging system

test/
└── *.test.ts       # Test files (mirror src/ structure)

scripts/
├── rebuild-extension.sh  # Quick rebuild helper
└── test-vllm.sh          # vLLM testing script
```

## 📦 Development Commands

```bash
# Build & Test
npm run compile      # Compile TypeScript
npm run watch       # Auto-compile on changes
npm test            # Run all tests
npm run lint        # Auto-fix linting issues
npm run lint:check  # Check linting without fixes

# Package Extension
npm run package     # Create .vsix file
npm run release     # Build and copy to releases/

# Quick Development Cycle
scripts/rebuild-extension.sh  # Rebuild and reinstall
```

## 💡 Tips for Success

1. **Start small** - Fix a bug or improve docs first
2. **Ask questions** - Open an issue if unsure
3. **Test edge cases** - Especially token limits
4. **Consider air-gapped users** - Local inference should work offline
5. **Follow existing patterns** - Check similar code in the project

## 📚 Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Language Model Chat Provider Docs](https://code.visualstudio.com/api/extension-guides/ai/language-model-chat-provider)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference) (for compatibility)
- [vLLM Documentation](https://docs.vllm.ai/)

## 🤝 Getting Help

- **Issues**: Open a GitHub issue with `[Question]` prefix
- **Debugging**: Check logs in Output > "Hugging Face Chat Provider"
- **Local Setup**: See [Local Setup Guide](docs/local-setup.md)

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:
- Be respectful and constructive
- Focus on technical merit
- Help others learn and grow

---

**Remember**: Quality > Quantity. A well-tested, focused PR is worth more than a large, untested one.

Thank you for contributing to make AI-powered coding accessible to everyone!