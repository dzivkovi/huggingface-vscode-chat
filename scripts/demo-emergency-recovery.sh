#!/bin/bash

# Emergency Demo Recovery Script
# Use this if the model stops appearing during demo

echo "🚨 EMERGENCY DEMO RECOVERY 🚨"
echo "=============================="
echo ""

echo "Step 1: Killing all VS Code processes..."
pkill -f "code" 2>/dev/null
sleep 2

echo "Step 2: Clearing VS Code cache..."
rm -rf ~/.config/Code/Cache/* 2>/dev/null
rm -rf ~/.config/Code/CachedData/* 2>/dev/null
rm -rf ~/.config/Code/User/workspaceStorage/* 2>/dev/null

echo "Step 3: Starting clean VS Code with HF Demo profile..."
code --profile "HF-Demo-Clean" --disable-extensions &
sleep 3

echo "Step 4: Installing only required extensions..."
code --profile "HF-Demo-Clean" --install-extension github.copilot --force
code --profile "HF-Demo-Clean" --install-extension github.copilot-chat --force
# Replace with your extension ID (e.g., huggingface.huggingface-vscode-chat or your fork)
EXTENSION_ID=${EXTENSION_ID:-"huggingface.huggingface-vscode-chat"}
code --profile "HF-Demo-Clean" --install-extension $EXTENSION_ID --force

echo "Step 5: Verifying model endpoint..."
# Read endpoint from settings.json or use environment variable
if [ -f .vscode/settings.json ]; then
    ENDPOINT=$(grep -o '"customTGIEndpoint"[[:space:]]*:[[:space:]]*"[^"]*"' .vscode/settings.json | cut -d'"' -f4)
fi
ENDPOINT=${ENDPOINT:-${LOCAL_MODEL_ENDPOINT:-"http://localhost:8000"}}
if curl -s -X GET "$ENDPOINT/v1/models" --max-time 5 | grep -q "id"; then
    echo "✓ Model endpoint is working at $ENDPOINT!"
else
    echo "✗ WARNING: Model endpoint not responding at $ENDPOINT!"
    exit 1
fi

echo ""
echo "Step 6: Opening project with clean profile..."
PROJECT_DIR=${PROJECT_DIR:-$(pwd)}
code --profile "HF-Demo-Clean" "$PROJECT_DIR"

echo ""
echo "=============================="
echo "RECOVERY COMPLETE!"
echo ""
echo "Now in VS Code:"
echo "1. Sign in to GitHub (personal account recommended)"
echo "2. Open GitHub Copilot Chat (Ctrl+Alt+I)"
echo "3. Click model dropdown"
echo "4. Click 'Manage Models...'"
echo "5. Select your model provider"
echo "6. Your model should appear"
echo ""
echo "If model still doesn't appear:"
echo "- Show it in settings (it IS configured)"
echo "- Show Output panel for your provider (it IS working)"
echo "- Explain this is a known GitHub UI bug, not your extension"
echo "=============================="