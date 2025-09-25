#!/bin/bash

# Install dependencies for VS Code testing in WSL
echo "Installing VS Code test dependencies for WSL..."

# These packages are required for running VS Code in headless mode
sudo apt-get update
sudo apt-get install -y \
    libnspr4 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    xvfb

echo "Dependencies installed. You can now run tests with xvfb:"
echo "xvfb-run -a npm test"