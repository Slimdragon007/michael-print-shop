#!/bin/bash

echo "🎨 Setting up Etsy Pipeline Integration"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the print-shop directory"
    exit 1
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3 first:"
    echo "  brew install python3"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if pip3 is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not available"
    echo "Please install pip3 first"
    exit 1
fi

echo "✅ pip3 found"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install pillow pandas python-slugify tqdm piexif

if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed successfully"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

# Make Python script executable
chmod +x scripts/etsy-pipeline.py
chmod +x scripts/etsy-integration.ts

# Check if external drive is connected
if [ -d "/Volumes/LaCie/Etsy" ]; then
    echo "✅ External drive detected at /Volumes/LaCie/Etsy"
    
    # Count photos
    photo_count=$(find "/Volumes/LaCie/Etsy" -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
    echo "📸 Found approximately $photo_count photos"
    
else
    echo "⚠️  External drive not detected at /Volumes/LaCie/Etsy"
    echo "   Please connect your LaCie drive before running the pipeline"
fi

# Create output directories
echo "📁 Creating output directories..."
mkdir -p data/etsy-processed
mkdir -p data/etsy-processed/etsy_images
mkdir -p data/etsy-processed/website_images
mkdir -p public/images/etsy

echo "✅ Setup complete!"
echo ""
echo "🚀 Available commands:"
echo "  npm run etsy:pipeline    - Run full Etsy processing pipeline"
echo "  npm run etsy:stats       - Check photo stats without processing"
echo "  npm run batch:etsy       - Run Etsy pipeline + integrate with website"
echo ""
echo "📋 Next steps:"
echo "  1. Ensure your LaCie drive is connected"
echo "  2. Run: npm run etsy:stats (to see what will be processed)"
echo "  3. Run: npm run etsy:pipeline (to process photos)"
echo "  4. Review output in data/etsy-processed/"
echo ""
echo "🎉 Ready to process your photos for Etsy!"