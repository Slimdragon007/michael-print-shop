#!/bin/bash

echo "🚀 Starting Photo Management System..."
echo "======================================"

# Check if external drive is mounted
if [ ! -d "/Volumes/LaCie/Etsy" ]; then
    echo "❌ LaCie drive not found at /Volumes/LaCie/Etsy"
    echo "Please ensure your external drive is connected and mounted"
    exit 1
fi

echo "✅ LaCie drive found"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the complete batch processing
echo "🔄 Processing all photos from external drive..."
npm run batch:full

echo ""
echo "🎉 Processing complete!"
echo ""
echo "📁 Your optimized files are ready in:"
echo "   🚀-UPLOAD-TO-HOSTINGER-FILE-MANAGER/"
echo ""
echo "🌐 Upload this folder to Hostinger File Manager to deploy your print shop!"
echo ""
echo "Next steps:"
echo "1. Open Hostinger File Manager"
echo "2. Upload contents of 🚀-UPLOAD-TO-HOSTINGER-FILE-MANAGER/"
echo "3. Your print shop will be live!"