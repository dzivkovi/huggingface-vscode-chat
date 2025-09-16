#!/bin/bash
echo "Cleaning and rebuilding HF extension..."
rm -rf out/
npm run compile
echo ""
echo "Build complete! Compiled files:"
ls -la out/*.js | head -3
echo ""
echo "Checking endpoint in compiled code:"
grep -o "v1/[a-z]*completions" out/provider.js | head -2
echo ""
echo "✅ Now please:"
echo "1. Close VS Code completely"
echo "2. Make sure no VS Code processes are running" 
echo "3. Open VS Code again"
echo "4. The extension will use the new code"
