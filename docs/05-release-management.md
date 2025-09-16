# Release Management & Binary Distribution

Guide for creating and maintaining pre-built VSIX releases for business users.

## 🚀 **Quick Release Process**

### 1. Build New Release
```bash
# Update version in package.json first
npm version patch  # or minor/major

# Clean build
npm install
npm run compile

# Create VSIX package
npx @vscode/vsce package
```

### 2. Organize Release Files
```bash
# Copy to releases folder with version and latest
cp huggingface-vscode-chat-*.vsix releases/
cp huggingface-vscode-chat-*.vsix releases/huggingface-vscode-chat-latest.vsix

# Verify files
ls -la releases/
```

### 3. Update Documentation
- Update version number in `releases/README.md`
- Add new version row to download table
- Test installation with new VSIX file

### 4. Commit & Publish
```bash
git add releases/ package.json
git commit -m "release: v[VERSION] - Add pre-built VSIX for business users"
git tag v[VERSION]
git push && git push --tags
```

## 📦 **VSIX Packaging Details**

### Package Commands
```bash
# Basic package (most common)
npx @vscode/vsce package

# Package specific version
npx @vscode/vsce package --out releases/huggingface-vscode-chat-0.0.6.vsix

# Package and set version
npx @vscode/vsce package 0.0.6

# Preview package contents
npx @vscode/vsce package --list-files
```

### Package Configuration (package.json)
Key fields that affect packaging:
```json
{
  "name": "huggingface-vscode-chat",
  "version": "0.0.5",
  "publisher": "HuggingFace",
  "displayName": "Hugging Face Provider for GitHub Copilot Chat",
  "files": [
    "out/**/*",
    "assets/**/*"
  ],
  "main": "./out/extension.js"
}
```

## 🗂️ **Release Organization**

### Folder Structure
```
releases/
├── README.md                               # Installation guide
├── huggingface-vscode-chat-latest.vsix    # Always latest version
├── huggingface-vscode-chat-0.0.5.vsix     # Specific versions
└── huggingface-vscode-chat-0.0.6.vsix     # Future versions
```

### Naming Convention
- **Latest**: `huggingface-vscode-chat-latest.vsix` (for easy linking)
- **Versioned**: `huggingface-vscode-chat-[VERSION].vsix` (for archives)

## 🎯 **Business User Benefits**

### Before (Complex)
1. Install Node.js and npm
2. Clone repository
3. Run `npm install`
4. Run `npm run compile`
5. Press F5 for development host
6. **Time**: 10-15 minutes, requires technical knowledge

### After (Simple)
1. Download VSIX file
2. Install via VS Code command
3. **Time**: 30 seconds, any user can do it

## ✅ **Quality Checklist**

Before releasing new VSIX:

### Build Quality
- [ ] `npm run compile` succeeds
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (if tests exist)
- [ ] No TypeScript errors

### Package Quality
- [ ] VSIX file creates without errors
- [ ] File size is reasonable (<10MB typically)
- [ ] Contains expected files (`npx @vscode/vsce package --list-files`)

### Installation Testing
- [ ] Fresh VS Code installation can install VSIX
- [ ] Extension appears in Extensions panel
- [ ] Basic functionality works (model picker shows Hugging Face)
- [ ] No console errors on activation

### Documentation Updates
- [ ] Version updated in `releases/README.md`
- [ ] Download links work correctly
- [ ] Installation instructions tested

## 🔄 **Automated Release (Future)**

### GitHub Actions Setup
Consider automating with `.github/workflows/release.yml`:
```yaml
name: Create Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run compile
      - name: Package VSIX
        run: npx @vscode/vsce package
      - name: Create Release
        uses: actions/create-release@v1
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./huggingface-vscode-chat-*.vsix
```

## 📋 **Version Management**

### Semantic Versioning
- **PATCH** (0.0.X): Bug fixes, small updates
- **MINOR** (0.X.0): New features, backwards compatible
- **MAJOR** (X.0.0): Breaking changes

### Version Update Commands
```bash
# Automatic version bump and git tag
npm version patch   # 0.0.5 → 0.0.6
npm version minor   # 0.0.5 → 0.1.0
npm version major   # 0.0.5 → 1.0.0

# Manual version (update package.json manually)
npm version --no-git-tag-version 0.0.6
```

## 🎁 **Release Notes Template**

Create `CHANGELOG.md` entries:
```markdown
## [0.0.6] - 2025-01-XX

### Added
- New TensorRT-LLM integration support
- Binary releases for business users

### Changed
- Improved local inference stability
- Updated documentation structure

### Fixed
- Token calculation for small context models
- vLLM server connection reliability

### Deployment
- [📦 Download VSIX](./releases/huggingface-vscode-chat-0.0.6.vsix)
- [🛍️ VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=HuggingFace.huggingface-vscode-chat)
```

---

💡 **Tip**: Keep releases small and frequent. Business users prefer stable, incremental updates to major version jumps.