#!/bin/bash

# Quick Demo Setup Test Script
# Run this before your demo to ensure everything is working

echo "======================================"
echo "GitHub Copilot + Model Provider Extension Test"
echo "======================================"
echo ""

# 1. Check VS Code version
echo "1. VS Code Version:"
code --version | head -1
echo ""

# 2. Check extensions
echo "2. Required Extensions:"
echo -n "   GitHub Copilot: "
code --list-extensions | grep -q "github.copilot$" && echo "✓ Installed" || echo "✗ Missing"
echo -n "   GitHub Copilot Chat: "
code --list-extensions | grep -q "github.copilot-chat" && echo "✓ Installed" || echo "✗ Missing"
echo -n "   Model Provider Extension: "
code --list-extensions | grep -q -E "huggingface|copilot-bridge" && echo "✓ Installed" || echo "✗ Missing"
echo ""

# 3. Check local model endpoint
echo "3. Local Model Endpoint:"
# Read endpoint from settings.json or use environment variable
if [ -f .vscode/settings.json ]; then
    ENDPOINT=$(grep -o '"customTGIEndpoint"[[:space:]]*:[[:space:]]*"[^"]*"' .vscode/settings.json | cut -d'"' -f4)
fi
ENDPOINT=${ENDPOINT:-${LOCAL_MODEL_ENDPOINT:-"http://localhost:8000"}}
echo -n "   Testing $ENDPOINT... "
if curl -s -X GET "$ENDPOINT/v1/models" --max-time 5 | grep -q "id"; then
    echo "✓ Accessible"
    MODEL_ID=$(curl -s -X GET "$ENDPOINT/v1/models" --max-time 5 | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Model: $MODEL_ID"
else
    echo "✗ Not accessible"
fi
echo ""

# 4. Check configuration
echo "4. VS Code Settings:"
if [ -f .vscode/settings.json ]; then
    echo -n "   Custom TGI Endpoint: "
    grep -q "customTGIEndpoint" .vscode/settings.json && echo "✓ Configured" || echo "✗ Not configured"
else
    echo "   ✗ No .vscode/settings.json found"
fi
echo ""

# 5. Quick fixes
echo "5. Quick Fixes Available:"
echo "   a) Restart extensions: code --command 'workbench.action.reloadWindow'"
echo "   b) Clean profile demo: code --profile 'HF-Demo' ."
echo "   c) Force refresh: Open Command Palette > 'Developer: Reload Window'"
echo ""

# 6. Demo readiness
echo "======================================"
echo "Demo Readiness Check:"
all_good=true

code --list-extensions | grep -q "github.copilot$" || all_good=false
code --list-extensions | grep -q "github.copilot-chat" || all_good=false
code --list-extensions | grep -q -E "huggingface|copilot-bridge" || all_good=false
if [ -n "$ENDPOINT" ]; then
    curl -s -X GET "$ENDPOINT/v1/models" --max-time 5 | grep -q "id" 2>/dev/null || all_good=false
fi

if [ "$all_good" = true ]; then
    echo "✓ READY FOR DEMO (backend working)"
    echo ""
    echo "Note: If model doesn't appear in GHCP dropdown:"
    echo "1. This is a known GitHub Copilot bug"
    echo "2. Show it working in Manage Models dialog"
    echo "3. Show Output panel logs as proof"
else
    echo "✗ ISSUES DETECTED - Fix before demo!"
fi
echo "======================================"