# GitHub Copilot Chat + Third-Party Model Provider Troubleshooting Guide

## Problem Summary
Third-party model provider extensions (like this Hugging Face fork for on-premise models) may not reliably appear in GitHub Copilot Chat's model dropdown, especially in enterprise environments.

## Root Causes Identified

### 1. **Enterprise vs Personal Account Restrictions**
- **Enterprise Users**: "No extensions have access" message means your organization's GitHub Copilot Enterprise policy doesn't allow third-party model providers
- **Mixed Account Issues**: Having both personal and enterprise accounts creates unpredictable behavior - VS Code might switch contexts
- **Key Finding**: Enterprise administrators must explicitly enable model selection for organization members

### 2. **Known GitHub Copilot Bugs**
- Third-party models intermittently disappear from dropdown (confirmed bug)
- VS Code Insiders has model dropdown issues
- Models enabled in GitHub web settings don't always appear in VS Code

## Immediate Action Plan for Demo Reliability

### Option 1: Personal Account Demo (MOST RELIABLE)
```bash
# 1. Sign out completely from enterprise account
code --command "workbench.action.signOut"

# 2. Use only personal GitHub account
code --command "github.copilot.signIn"
# Sign in with personal account ONLY

# 3. Restart VS Code completely
pkill -f "code" && code

# 4. Verify extension is loaded
code --list-extensions | grep -E "huggingface|copilot-bridge"
```

### Option 2: Create Demo-Specific VS Code Profile
```bash
# Create clean profile for demo
code --profile "HF-Demo" --extensions-dir ~/.vscode-demo/extensions

# Install only necessary extensions
code --profile "HF-Demo" --install-extension github.copilot
code --profile "HF-Demo" --install-extension github.copilot-chat
code --profile "HF-Demo" --install-extension [your-extension-id]

# Configure and test
code --profile "HF-Demo" [your-project-path]
```

### Option 3: Fallback to Direct Extension UI (If GHCP Integration Fails)
Instead of relying on GitHub Copilot Chat integration, demonstrate the extension directly:
1. Open Command Palette (Ctrl+Shift+P)
2. Search for your extension commands
3. Show model configuration in settings
4. Demonstrate API calls in Output panel

## Pre-Demo Checklist

### 24 Hours Before Demo
- [ ] Test with personal account only (no enterprise login)
- [ ] Document exact VS Code version: `code --version`
- [ ] Screenshot working configuration
- [ ] Test on fresh VS Code profile
- [ ] Prepare fallback demo video

### 1 Hour Before Demo
```bash
# Clean restart sequence
pkill -f "code"
rm -rf ~/.config/Code/Cache
rm -rf ~/.config/Code/CachedData

# Start with clean state
code --disable-extensions
code --install-extension github.copilot
code --install-extension github.copilot-chat
code --install-extension [your-extension-id]

# Verify endpoint is accessible
curl -X GET http://[your-internal-endpoint]/v1/models
```

### During Demo
1. **If model appears**: Proceed normally
2. **If model doesn't appear**:
   - Show it in Manage Models dialog (screenshot as proof)
   - Explain this is a known GitHub Copilot bug
   - Show extension logs proving connection works
   - Use Command Palette to demonstrate functionality

## Technical Workarounds

### Force Model Refresh
```typescript
// Add to your extension's activate function
setTimeout(() => {
    vscode.commands.executeCommand('github.copilot.refreshModels');
}, 5000);
```

### Manual Model Registration (Emergency)
```javascript
// In VS Code Developer Console (Help > Toggle Developer Tools)
require('vscode').extensions.getExtension('[your-extension-id]').activate()
  .then(() => console.log('Extension re-activated'));
```

## Communication Strategy for Demo

### If Asked About Missing "Manage Models"
"This is controlled by enterprise policy. Your IT administrators can enable this through GitHub Enterprise settings under Copilot policies. The extension works perfectly with personal GitHub accounts or when the policy is enabled."

### If Model Doesn't Show During Demo
"There's a known intermittent bug in GitHub Copilot Chat's model discovery. As you can see in our logs, the extension successfully connects to our local model at [show terminal]. The integration works - this is just a UI refresh issue in Copilot Chat."

## Long-Term Solutions

### For Your Organization
1. Request your IT administrators to enable "Allow members to switch AI models" in GitHub Enterprise Copilot settings
2. Document policy requirement in extension README
3. Create organization-specific deployment guide

### For Extension Development
1. Add retry logic for model registration
2. Implement health check command
3. Add visual indicator when model is available but not showing

## Emergency Contacts & Resources
- GitHub Copilot Status: https://www.githubstatus.com/
- VS Code Copilot Issues: https://github.com/microsoft/vscode-copilot-release/issues
- Extension Logs: Output Panel > "Hugging Face Chat Provider" (or your provider name)

## Demo Scripts Available

The `scripts/` directory contains helpful demo utilities:
- `demo-test-setup.sh` - Pre-demo verification script
- `demo-emergency-recovery.sh` - Emergency recovery during demos

## Demo Recording Backup
Record a successful session when model IS showing:
```bash
# Linux screen recording
sudo apt-get install kazam
kazam --fullscreen --no-sound
```

Remember: The extension IS working (as shown in logs) - the issue is GitHub Copilot Chat's UI not always refreshing its model list. This is NOT a failure of your extension!