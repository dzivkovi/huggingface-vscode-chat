# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Engineering Mindset

**Defensive Programming Psychology:**
- ALWAYS evaluate 2-3 solution alternatives before implementation
- Question assumptions, validate with evidence
- Prefer incremental, testable changes over big rewrites
- Document decision rationale in analysis/ folder for complex choices

**Technical Assessment Standards:**
- Be objective, not enthusiastic - focus on concrete technical merits
- Grade work accurately: A+ only for exceptional innovation
- Call out trade-offs and limitations honestly
- Reality-check claims with evidence

**Research-First Approach:**
- Use TodoWrite for multi-step technical analysis
- Research alternatives thoroughly before recommending
- Fact-check technical claims, especially comparisons
- Document systematic analysis for future reference

## Core Design Principles

### 1. Minimalism Above All
> **"Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."**
> — Antoine de Saint-Exupéry

**Apply this to everything:**
- **Code**: Remove unnecessary complexity, prefer simple solutions
- **Tests**: Add the minimum tests that prevent regressions (like our 3-test streaming fix)
- **Documentation**: Clear and concise beats comprehensive
- **Features**: Do one thing well rather than many things poorly

### 2. User Interaction First
**Before implementing ANYTHING, ask: "How will users interact with this?"**
- Browsing/scanning tasks → Flat layouts, minimize cognitive load
- Direct navigation tasks → Logical hierarchy acceptable
- API design → Think of the developer experience first
- Error messages → What would help the user fix the problem?

### 3. Defensive Programming (Enhanced)
**Beyond basic validation - expect everything to fail:**
- Test everything, validate ALL assumptions
- NEVER rush implementation - "measure 3x, cut 1x"
- Every external API call needs timeout and error handling
- Every user input needs validation and sanitization
- Plan for failures: What happens when the API is down? When types don't match?
- **TypeScript Example:**
  ```typescript
  // WRONG: Trusting external data
  const name = apiResponse.name;  // Could be undefined, null, number, etc.

  // RIGHT: Defensive validation
  const name = typeof apiResponse?.name === 'string'
    ? apiResponse.name.substring(0, 200)  // Also limit length!
    : 'Unknown';
  ```

### 4. Documentation-First Development
**The docs are the source of truth, not your memory:**
1. **ALWAYS** check latest official docs before implementing
2. Technology changes faster than training data
3. When docs conflict with existing code, trust the docs
4. For this project: Check HuggingFace original implementation first

### 5. Test Philosophy
**Tests are contracts, not suggestions:**
- **Tests are immutable**: Once written, tests define success
- **Implementation serves tests**, not vice versa
- **TDD for everything**: Write the test first, watch it fail, then implement
- **Regression tests**: The simplest test that would have caught your bug
- **For AI/nondeterministic systems**: Run 5+ times for consistency

### 6. Task Planning Guidelines
**Right-size your approach to the task:**
- **Complex tasks (3+ steps)**: ALWAYS use TodoWrite to track progress
- **Simple tasks (1-2 steps)**: Execute directly without todo overhead
- **Debugging sessions >1 hour**: Create analysis file in `analysis/YYYY-MM-DD/`
- **When stuck**: Step back, use TodoWrite to break down the problem

### 7. Tool Preferences
**Use the right tool, prefer the proven one:**
- **Searching**: ALWAYS use `Grep` tool (uses ripgrep) - NEVER use bash grep/find
- **File reading**: Use `Read` tool, not cat/head/tail commands
- **Pattern matching**: Grep tool over complex bash pipelines
- **Testing**: `npm test` first and often

## CRITICAL: HuggingFace Fork Grounding Rules

**This extension is forked from HuggingFace VS Code Chat. NEVER BREAK WHAT WORKS.**

### The "Measure 3x Cut 1x" Principle
**BEFORE making ANY changes to existing functionality:**
1. **FIRST**: Check the original HuggingFace implementation at https://github.com/huggingface/huggingface-vscode-chat
2. **SECOND**: Understand why they implemented it that way
3. **THIRD**: Test your assumptions against the original
4. **ONLY THEN**: Make your change

### Hard-Learned Lessons from Painful Debugging (2025-09-27)

**What Went Wrong (So You Never Repeat It):**

1. **The AbortSignal Disaster**
   - **WRONG**: `signal: token as any` - NEVER use `as any` to bypass TypeScript!
   - **WRONG**: Adding AbortController when HF doesn't use it
   - **RIGHT**: Match HF exactly - they don't pass signal parameter at all
   ```typescript
   // HuggingFace original (WORKS):
   const response = await fetch(requestUrl, {
       method: "POST",
       headers,
       body: JSON.stringify(requestBody)
       // NO signal parameter!
   });
   ```

2. **The Progress Reporting Failure**
   - **WRONG**: `progress.report({ content: delta.content })`
   - **WRONG**: `progress.report({ text: delta.content })`
   - **RIGHT**: Use VS Code API classes EXACTLY like HF does:
   ```typescript
   // ALWAYS use VS Code API classes:
   progress.report(new vscode.LanguageModelTextPart(text));
   progress.report(new vscode.LanguageModelToolCallPart(id, name, args));
   ```

3. **Missing Features (Thinking Support)**
   - When HF has a feature we don't, copy it EXACTLY
   - Don't "improve" it, don't "optimize" it - COPY IT EXACTLY
   - Wrap in try-catch just like they do

### Golden Rules for This Codebase

1. **When Something Breaks**:
   - DON'T rush to fix
   - DO fetch the original HF file first
   - DO compare line-by-line
   - DO copy their exact implementation

2. **When Adding Features**:
   - Keep HF functionality intact
   - Add your features alongside, not instead of
   - Use feature flags or separate code paths if needed

3. **Type Safety**:
   - NEVER use `as any` to "fix" type errors
   - If you see `as any`, it's probably hiding a bug
   - Proper type conversions only (like CancellationToken → AbortSignal)

4. **API Compatibility**:
   - VS Code CancellationToken ≠ Web API AbortSignal
   - VS Code expects specific class instances, not duck-typed objects
   - When in doubt, check what HF does

### Reference Implementations to Check

When working on these areas, ALWAYS check HF original first:
- `src/provider.ts` - Main provider implementation
- Progress reporting in `readResponseStream` method
- Model registration and naming patterns
- Error handling and retry logic
- Thinking support implementation

### Documentation Requirements

After ANY debugging session that takes >1 hour:
1. Create analysis file in `analysis/YYYY-MM-DD/`
2. Document what broke, why, and how it was fixed
3. Update this section if new patterns discovered

**Remember**: This extension must work with BOTH HuggingFace cloud models AND local vLLM/TGI models. Breaking HF compatibility to "fix" local models is NOT acceptable.

## CRITICAL: Development Workflow Principles

**Parallel Task Execution:**
IMPORTANT: Always use parallel execution via the Task tool when possible. Examples of parallelizable tasks:
- Running `npm test` and `npm run lint` concurrently
- Analyzing TypeScript files across different modules simultaneously
- Testing multiple VS Code extension scenarios in parallel
- Searching for patterns across source directories concurrently
- Validating multiple configuration files at once

This improves performance significantly and should be the default approach for independent operations.

## CRITICAL: Important Rules

**Git Commit Guidelines:**
- **NEVER use `git add` or `git commit` without explicit user request**
- **NEVER sign commits or changes as Claude/AI** - use standard git authorship only
- Only commit when user explicitly asks: "commit this", "git add", "create a commit", etc.
- Default behavior: Make changes but DO NOT stage or commit them

**Commit Message Conventions (Conventional Commits):**
This repository follows Conventional Commits specification. Use these prefixes:
- `feat:` - New feature for users (not a new feature for build script)
- `fix:` - Bug fix for users (not a fix to build script)
- `chore:` - Maintenance, cleanup, tooling, file removal (no production code change)
- `docs:` - Documentation ONLY changes (no code changes)
- `refactor:` - Code restructuring without changing external behavior
- `test:` - Adding missing tests or correcting existing tests
- `style:` - Code style changes (white-space, formatting, missing semi-colons, etc)
- `perf:` - Performance improvements

**Examples from this repository:**
- `chore: remove analysis date folders from git and fix .gitignore`
- `chore: streamline documentation and fix config property naming`
- `docs: Update README for v1.0.0 release with proper installation instructions`
- `fix: correct token calculation for vLLM models with template overhead`
- `feat: Release v1.0.0 - Production-ready vLLM HuggingFace Bridge`

**NEVER use `refactor:` for:**
- Documentation changes (use `docs:` or `chore:`)
- Configuration/property renaming (use `chore:` or `fix:`)
- File cleanup/removal (use `chore:`)

**Note:** Use `BREAKING CHANGE:` in commit body for changes that break backward compatibility

**Content Guidelines:**
- **NEVER use emojis in any files or documentation unless explicitly requested by the User**
- Keep all content professional and emoji-free by default

## CRITICAL: Test-Driven Development (TDD) Requirements

**⚠️ MANDATORY: ALL changes MUST follow strict TDD practices:**
1. **Write tests FIRST** before implementing any feature or fix
2. **Run `npm test` BEFORE** declaring any task complete
3. **Never skip tests** - if tests don't exist, create them
4. **Test coverage required** for:
   - Endpoint URL construction (especially local vs HF models)
   - Model ID parsing and prefix detection
   - Token calculation logic
   - Error handling paths
   - Configuration changes

**TDD Workflow (MUST FOLLOW):**
1. Write failing test for the bug/feature
2. Run tests to confirm failure: `npm test`
3. Implement minimal code to pass test
4. Run tests to confirm success: `npm test`
5. Refactor if needed
6. Run ALL tests before packaging: `npm test`
7. Auto-fix code style issues: `npm run lint` (auto-fixes like Ruff)
8. Verify no remaining issues: `npm run lint:check`
9. Type check: `npm run compile`
10. Only then: `npm run package`

## Development Commands

**Build and Development:**
- `npm test` - **RUN THIS FIRST AND OFTEN** - Run all Mocha unit tests
- `npm install` - Install dependencies (automatically runs VS Code API download)
- `npm run compile` - Compile TypeScript to JavaScript (with type checking)
- `npm run watch` - Compile with watch mode for development
- `npm run lint` - **Auto-fixes issues** (like `ruff format`) - ESLint with auto-fix
- `npm run lint:check` - Check only, no fixes (like `ruff check`)
- `npm run lint:strict` - Treat warnings as errors (for CI/CD)
- `npm run format` - Format code with Prettier

**Python → TypeScript/Node Tool Equivalents:**

| Python Tool | TypeScript/Node | Command | Purpose |
|------------|----------------|---------|----------|
| `pytest` | **Mocha** | `npm test` | Run unit tests |
| `pytest -v` | Mocha verbose | `npm test -- --reporter spec` | Detailed test output |
| `pytest file.py` | Test grep | `npm test -- --grep "pattern"` | Run specific tests |
| `ruff check` | **ESLint** | `npm run lint:check` | Check code quality |
| `ruff format` / `ruff --fix` | **ESLint fix** | `npm run lint` | Auto-fix issues |
| `ruff check --exit-non-zero-on-fix` | **ESLint strict** | `npm run lint:strict` | CI/CD mode |
| `black` | **Prettier** | `npm run format` | Code formatting |
| `mypy` | **TypeScript** | `npm run compile` | Type checking |
| `pip install` | **npm** | `npm install` | Install dependencies |
| `python -m build` | **vsce** | `npm run package` | Build distribution |

**Extension Development:**
- Press F5 in VS Code to launch Extension Development Host for testing
- Use `npm run package` to create VSIX package for development
- Use `npm run release` to create binary distribution in releases/ folder
- Use `scripts/rebuild-extension.sh` for quick rebuild and install cycle
- Use `scripts/test-vllm.sh` for testing vLLM API endpoints

## Architecture Overview

This is a VS Code extension that integrates Hugging Face Inference Providers with GitHub Copilot Chat. The extension acts as a language model chat provider for VS Code's built-in chat interface.

**Core Components:**

- **`src/extension.ts`** - Main extension entry point that registers the chat provider and management command
- **`src/provider.ts`** - `HuggingFaceChatModelProvider` class implementing VS Code's `LanguageModelChatProvider` interface
- **`src/types.ts`** - TypeScript interfaces for OpenAI-compatible API types and HF model metadata
- **`src/utils.ts`** - Utility functions for message conversion, tool calling, and request validation

**Key Architectural Patterns:**

1. **Chat Provider Integration**: Implements VS Code's Language Model Chat Provider API to integrate with GitHub Copilot Chat UI
2. **OpenAI API Compatibility**: Converts VS Code chat messages to OpenAI-compatible format for HF Router API calls
3. **Streaming Response Processing**: Handles Server-Sent Events (SSE) from HF Router with real-time text and tool call parsing
4. **Tool Call Support**: Full support for function calling with both structured (SSE tool_calls) and text-embedded tool calls
5. **Multi-Provider Model Management**: Dynamically fetches available models from multiple inference providers via HF Router

**API Integration:**
- Base URL: `https://router.huggingface.co/v1` (default cloud)
- Local inference via `huggingface.localEndpoint` setting
- Endpoints: `/models` (list models), `/chat/completions` (chat API)
- Authentication: Bearer token for cloud, optional for local
- User-Agent: Includes extension version and VS Code version for usage tracking

**Local Inference Support (vLLM/TGI):**
- Configuration: `"huggingface.localEndpoint": "http://localhost:8000"`
- vLLM endpoint: `/v1/chat/completions` (OpenAI-compatible)
- TGI endpoint: `/v1/chat/completions` (requires v2.0+)
- Models appear with `tgi|` prefix in model picker
- Dynamic token calculation based on model context limits

**Tool Calling Architecture:**
The extension supports two tool calling formats:
1. Standard OpenAI-style `tool_calls` in SSE deltas
2. Text-embedded tool calls using control tokens (`<|tool_call_begin|>`, `<|tool_call_argument_begin|>`, `<|tool_call_end|>`)

**State Management:**
- API key stored securely in VS Code SecretStorage
- Model list cached during provider initialization
- Tool call buffers managed per request to handle streaming responses
- Deduplication logic prevents duplicate tool call emissions

**Logging System (`src/logger.ts`):**
- Default log level: INFO (DEBUG messages filtered for performance)
- Output channel: "Hugging Face Chat Provider" in VS Code Output panel
- Performance consideration: DEBUG logging can slow down token streaming
- PRODUCTION: Always use `LogLevel.INFO` in logger.ts line 13
- DEBUGGING: Temporarily use `LogLevel.DEBUG` but revert before committing

## Testing and Package Management

- Uses `pnpm` as package manager (version 8.15.4+)
- TypeScript compilation target: ES2024, Node16 modules
- Test framework: Mocha with VS Code test runner
- No external runtime dependencies - only devDependencies for tooling

## ESLint Configuration Philosophy

**Pragmatic Linting (Ruff-like Approach):**
Our ESLint setup follows a pragmatic philosophy similar to Python's Ruff:

1. **Auto-fix by default**: `npm run lint` auto-fixes issues (like `ruff format`)
2. **Warnings over errors**: Most issues are warnings, not build-breaking errors
3. **Smart equality checks**: `eqeqeq: ['warn', 'smart']` allows `== null` for null/undefined checks
4. **Underscore convention**: Variables/params prefixed with `_` are ignored for unused checks
5. **Real-world pragmatism**: Allows `any` type, `!` assertions, and other practical necessities

**Key ESLint Rules:**
- **Bug Prevention**: `no-undef`, `no-unreachable`, `no-constant-condition`
- **Code Quality**: `no-unused-vars` (warn), `curly`, `semi`
- **Allowed**: `console.log`, `require()`, `any` type, floating promises (VS Code specific)

**Linting Commands:**
```bash
npm run lint          # Auto-fix issues (default, like ruff)
npm run lint:check    # Check only, no fixes
npm run lint:strict   # CI mode - warnings become errors
```

## Defensive Programming in TypeScript

**ALWAYS validate inputs and handle edge cases:**

```typescript
// Example: Defensive model validation
function processModel(model: unknown): LanguageModelChatInformation {
    // Type guards - never trust external data
    if (!model || typeof model !== 'object') {
        logger.error('Invalid model object received', model);
        throw new Error('Invalid model object');
    }

    const safeModel = model as any;

    // Defensive defaults and validation
    const id = String(safeModel.id || 'default').substring(0, 100); // Limit length
    const name = String(safeModel.name || 'Unknown Model').substring(0, 200);
    const maxInputTokens = Math.min(Math.max(0, Number(safeModel.maxInputTokens) || 2048), 128000);

    // Always return valid structure
    return {
        id,
        name,
        family: "vllm-bridge",
        version: "1.0.0",
        maxInputTokens,
        maxOutputTokens: Math.min(maxInputTokens / 4, 4096),
        capabilities: {
            toolCalling: Boolean(safeModel.toolCalling),
            imageInput: Boolean(safeModel.imageInput)
        }
    };
}

// Example: Safe async operations with timeouts
async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        return response;
    } catch (error) {
        if (error.name === 'AbortError') {
            logger.error(`Request timeout after ${timeout}ms: ${url}`);
            throw new Error(`Request timeout: ${url}`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Example: Never trust array indices
function safeArrayAccess<T>(arr: T[], index: number, defaultValue: T): T {
    if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
        return defaultValue;
    }
    return arr[index] ?? defaultValue;
}
```

**Key Defensive Patterns:**
1. **Always validate external inputs** - API responses, user configs, file contents
2. **Use type guards** - Don't cast blindly with `as`
3. **Set reasonable limits** - String lengths, array sizes, numeric ranges
4. **Provide sensible defaults** - Never return undefined when a value is expected
5. **Handle all error cases** - Network failures, timeouts, invalid data
6. **Log errors with context** - Include relevant data for debugging
7. **Test edge cases** - Empty arrays, null values, extreme numbers

## vLLM Development and Testing

**Quick vLLM Setup for Testing:**
```bash
# Start vLLM with recommended model for RTX 4060 (8GB VRAM)
docker run -d --name vllm-server --gpus all -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model TheBloke/deepseek-coder-6.7B-instruct-AWQ \
  --quantization awq \
  --gpu-memory-utilization 0.8

# Test the endpoint
scripts/test-vllm.sh
```

**Key vLLM Considerations:**
1. **Token Limits**: vLLM strictly enforces context limits (e.g., 2048 tokens)
2. **Dynamic Calculation**: Extension calculates `max_tokens` based on input size
3. **Model Configuration**: Lines 121-122, 139-140 in `provider.ts` set token limits
4. **Endpoint Format**: vLLM uses `/v1/chat/completions` (not `/v1/completions`)
5. **Performance**: Expect 5-8 tokens/sec on RTX 4060 (slower than Ollama but more stable)

**Common Issues and Fixes:**
- **Token limit errors**: Reduce model's `maxInputTokens` in provider.ts
- **Empty responses**: Check Docker logs for crashes (TGI has stability issues)
- **Slow performance**: Normal for vLLM; prioritizes stability over speed
- **Extension not updating**: VS Code caches compiled code; restart completely

**Testing Changes:**
```bash
# Quick rebuild and reinstall
scripts/rebuild-extension.sh

# Verify in VS Code
1. Open Output panel (Ctrl+Shift+U)
2. Select "Hugging Face Chat Provider"
3. Check logs show correct endpoint
```

## Release Process

**Simple Binary Distribution:**
- `npm run release` - Creates VSIX and copies to releases/ folder for business users
- Commit releases/ folder to provide download links in GitHub

**Marketplace Publishing:**
- Releases use GitHub Actions workflow triggered on `release/**` branches
- Version in package.json must match branch tag
- Automated VSIX packaging and VS Code Marketplace publishing

## GitLab CLI (GLAB) Reference

**For GitLab issue and pipeline management, see comprehensive documentation:**

```bash
# Quick reference - view the complete GLAB guide
cat .claude/GLAB.md
```

**Essential GLAB commands for this project:**
```bash
# Project-specific issue management
GITLAB_HOST=gitlab.industrysoftware.automation.siemens.com glab issue list --assignee @me --label "on-prem1"
glab issue view <issue-number> -R DevOps/apps/codesentinel-lite

# CRITICAL: Use update for labels (NOT edit) - prevents common failures
glab issue update <id> --label "state::in progress"

# CRITICAL: Comment first, then close (no --comment flag exists)
glab issue comment <id> --message "Completion summary"
glab issue close <id>

# Debug board visibility issues
glab issue view <id> --output json | grep -A5 '"labels"'

# Other essential commands
glab mr list --assignee @me                     # List merge requests
glab ci list                                    # View pipeline status
glab auth status                                # Check authentication
```

**Authentication for self-hosted GitLab:**
```bash
# Most reliable enterprise pattern
export GITLAB_HOST=your-gitlab-instance.com
glab auth login --hostname your-gitlab-instance.com --token YOUR_TOKEN

# Per-command override (alternative)
GITLAB_HOST=your-gitlab-instance.com glab issue list --assignee @me
```

**Note:** The `.claude/GLAB.md` file contains comprehensive mappings from GitHub CLI to GitLab CLI, troubleshooting guides, and enterprise authentication patterns. Reference this file when working with GitLab repositories, issues, merge requests, and CI/CD pipelines.

## Quick Debugging Reference (When Things Break)

### STEP 1: Check Original HuggingFace Implementation
```bash
# Fetch the original file you're debugging
curl -s https://raw.githubusercontent.com/huggingface/huggingface-vscode-chat/main/src/provider.ts > /tmp/hf-original-provider.ts

# Compare with our version
diff -u /tmp/hf-original-provider.ts src/provider.ts | head -100
```

### STEP 2: Common Bug Patterns to Check

**"Failed to construct 'Request': member signal is not of type AbortSignal"**
- Check line ~870-880 in provider.ts
- Should NOT have `signal: token as any`
- HF doesn't use signal parameter at all

**"Sorry, no response was returned" (but logs show 200 OK)**
- Check progress.report() calls
- Must use: `new vscode.LanguageModelTextPart()`
- NOT: `{ content: ... }` or `{ text: ... }`

**Missing thinking/reasoning display**
- Check lines ~580-610 in readResponseStream
- Should have thinking support block from HF

### STEP 3: Verification Commands
```bash
# 1. Always run tests first
npm test

# 2. Check compilation
npm run compile

# 3. Lint check
npm run lint

# 4. Build extension
npm run package

# 5. Check git history if unsure when bug introduced
git log --oneline -20 src/provider.ts
```

### STEP 4: Emergency Recovery
```bash
# If you've broken everything, get back to known good state
git stash
git fetch origin
git checkout origin/main -- src/provider.ts

# Then carefully reapply your changes one by one
```

### Remember: When in Doubt, Check HuggingFace Original!
The original implementation at https://github.com/huggingface/huggingface-vscode-chat works. If our fork doesn't work, we diverged incorrectly. Always ground fixes in their implementation.