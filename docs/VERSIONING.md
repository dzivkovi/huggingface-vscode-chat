# Versioning Strategy

This project follows semantic versioning (MAJOR.MINOR.PATCH) with a simple increment strategy.

## Version Increment Guidelines

### When to Increment

- **PATCH version (0.0.X)**: Increment for each new feature branch or issue
  - One increment per issue/branch (not per fix within the branch)
  - Bug fixes
  - Minor features
  - Documentation updates
  - Current practice for most changes

- **MINOR version (0.X.0)**: Increment for significant features
  - New major functionality
  - API changes that are backwards compatible
  - Multiple related features released together

- **MAJOR version (X.0.0)**: Increment for breaking changes
  - Backwards incompatible API changes
  - Major architectural refactoring
  - Significant behavior changes

## Workflow

1. **Create new branch for issue/feature**
   ```bash
   git checkout -b issue-3-local-only-mode
   ```

2. **Update version in package.json**
   ```bash
   # Edit package.json and increment version
   # Example: 0.0.5 -> 0.0.6
   ```

3. **Build and release**
   ```bash
   npm run release
   ```
   This creates:
   - `releases/huggingface-vscode-chat-0.0.6.vsix` (versioned file)
   - `releases/huggingface-vscode-chat-latest.vsix` (copy of latest version)

4. **Commit with version in message**
   ```bash
   git commit -m "feat: implement local-only mode (v0.0.6)"
   ```

## Historical Versions

All historical VSIX files are preserved in the `releases/` folder:
- `huggingface-vscode-chat-0.0.5.vsix` - Previous stable release
- `huggingface-vscode-chat-0.0.6.vsix` - Local-only mode feature
- `huggingface-vscode-chat-latest.vsix` - Always points to the most recent version

## Release Script

The `npm run release` script automatically:
1. Compiles the TypeScript code
2. Creates the VSIX package with current version from package.json
3. Copies versioned VSIX to releases/ folder
4. Updates the latest.vsix symlink/copy

The version is dynamically read from package.json, so you only need to update it in one place.