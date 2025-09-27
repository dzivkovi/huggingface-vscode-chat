# Logo Creation Guide for Siemens AI Provider

This guide documents how to create or modify the extension logo for future maintainers.

## Current Logo Setup

The extension uses `assets/siemens-vllm.png` - a combination of the vLLM logo with "SIEMENS" text overlay.

## Prerequisites

### Install ImageMagick on WSL/Linux:
```bash
sudo apt update && sudo apt install imagemagick -y

# Verify installation
convert --version
```

### Install fonts (optional, for better text rendering):
```bash
sudo apt install fonts-liberation fonts-dejavu-core
```

## Logo Creation Commands

### 1. Download vLLM Logo (if needed)
```bash
# Official vLLM logo from their media kit
cd assets
wget https://raw.githubusercontent.com/vllm-project/media-kit/main/vLLM-Logo.png -O vllm-logo.png

# Resize to standard VS Code extension size
convert vllm-logo.png -resize 256x256 vllm-icon-256.png
```

### 2. Create Siemens+vLLM Combined Logo (Current Design)
```bash
# Use full-size vLLM icon as background with SIEMENS text at top
convert assets/vllm-icon-256.png \
  -gravity north -pointsize 32 -fill "#009999" -font Helvetica -weight Bold \
  -annotate +0+15 "SIEMENS" \
  assets/siemens-vllm.png
```

### 3. Alternative Designs

#### Badge Style (S in corner)
```bash
# Add "S" badge to left corner of vLLM logo
convert assets/vllm-logo.png -resize 256x256 \
  \( -size 70x70 xc:"#009999" -gravity center \
     -pointsize 50 -fill white -annotate +0+0 "S" \) \
  -gravity northwest -geometry +10+10 -composite \
  assets/siemens-vllm-badge.png
```

#### With White Background Bar (for better text visibility)
```bash
convert assets/vllm-icon-256.png \
  \( -size 256x50 xc:"rgba(255,255,255,0.9)" \) \
  -gravity north -composite \
  -gravity north -pointsize 32 -fill "#009999" -font Helvetica -weight Bold \
  -annotate +0+15 "SIEMENS" \
  assets/siemens-vllm-alt.png
```

#### Text + Smaller Logo (centered composition)
```bash
convert -size 256x256 xc:white \
  -gravity north -pointsize 26 -fill "#009999" -font Helvetica \
  -annotate +0+30 "SIEMENS" \
  \( assets/vllm-logo.png -resize 140x140 \) \
  -gravity center -geometry +0+25 -composite \
  assets/siemens-vllm-centered.png
```

## Simple Text-Only Logos

### Option 1: Simple "S" Logo
```bash
# Siemens blue square with white S
convert -size 256x256 xc:"#009999" \
  -gravity center -pointsize 180 -fill white \
  -annotate +0+0 "S" \
  assets/siemens-s.png
```

### Option 2: "SAI" Text Logo
```bash
# White background with Siemens blue "SAI" text
convert -size 256x256 xc:white \
  -gravity center -pointsize 100 -fill "#009999" \
  -annotate +0+0 "SAI" \
  assets/siemens-sai.png
```

### Option 3: No Logo (Simplest)
```bash
# Just remove the icon line from package.json
# VS Code will use a generic extension icon
```

## Using Free Icons

### Download from Icon Libraries:
- https://icons8.com/icons/set/artificial-intelligence (free with attribution)
- https://www.flaticon.com/search?word=ai (free options available)
- https://feathericons.com/ (simple, MIT licensed)
- https://simpleicons.org/ (brand icons, including tech logos)

### Example: Using an AI icon from the web
```bash
# Download a free AI icon (example URL)
wget https://example.com/ai-icon.png -O assets/ai-icon.png

# Resize and add Siemens branding
convert assets/ai-icon.png -resize 200x200 \
  -gravity center -background white -extent 256x256 \
  -gravity north -pointsize 24 -fill "#009999" \
  -annotate +0+10 "SIEMENS" \
  assets/siemens-ai.png
```

## Colors Reference

- **Siemens Teal**: `#009999`
- **vLLM Blue**: `#00ADD8`
- **White**: `#FFFFFF`
- **Light Gray**: `#F0F0F0`

## Font Troubleshooting

If you get font errors like "unable to read font 'Arial'":

```bash
# List available fonts
convert -list font | grep family

# Common available fonts on WSL/Linux:
# - Helvetica (usually available)
# - DejaVu Sans (after installing fonts-dejavu-core)
# - Liberation Sans (after installing fonts-liberation)

# Or omit the -font parameter to use system default
convert assets/vllm-icon-256.png \
  -gravity north -pointsize 32 -fill "#009999" \
  -annotate +0+15 "SIEMENS" \
  assets/siemens-vllm.png
```

## Update package.json

After creating your logo, update the extension to use it:

```json
{
  "icon": "assets/your-new-logo.png"
}
```

Or remove the icon line entirely to use VS Code's generic extension icon.

## Testing Your Logo

1. Build the extension:
```bash
npm run package
```

2. Check the VSIX includes your logo:
```bash
unzip -l siemens-ai-provider-*.vsix | grep assets
```

3. Install and verify appearance:
```bash
code --install-extension siemens-ai-provider-*.vsix
```

## Best Practices

1. **Size**: Use 256x256px or 128x128px (VS Code will scale as needed)
2. **Format**: PNG with transparency support
3. **File Size**: Keep under 50KB for faster loading
4. **Clarity**: Ensure logo is recognizable at small sizes (as small as 32x32)
5. **Branding**: Include either "Siemens" text or "S" badge for enterprise identity
6. **Legal**: Don't use trademarked logos without permission

## Current Assets Structure

```
assets/
├── siemens-vllm.png           # Main logo (in use)
├── siemens-vllm-badge.png     # Alternative with S badge
├── vllm-icon-256.png          # Base vLLM icon
├── vllm-logo.png              # Original vLLM logo
├── huggingface-logo-original.png  # Preserved HF logo (not used)
└── air-gapped-vLLM-inference.png  # Documentation diagram
```

## Notes for Successors

- The current logo combines vLLM technology branding with Siemens corporate identity
- Using vLLM logo is acceptable as they provide a public media kit
- Avoid using HuggingFace logo to prevent trademark issues
- For official Siemens logos, check with corporate brand guidelines
- Consider user recognition - changing logos too often can confuse users