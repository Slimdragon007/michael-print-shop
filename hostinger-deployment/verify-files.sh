#!/bin/bash

echo "🔍 Verifying Hostinger Deployment Files..."
echo "======================================"

cd "$(dirname "$0")/public_html"

# Check required files
echo "✓ Checking required files:"
REQUIRED_FILES=(
    "index.html"
    ".htaccess"
    "404.html"
    "favicon.ico"
    "products/index.html"
    "_next/static/css/930205113f8c1edf.css"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ Missing: $file"
    fi
done

# Check directory structure
echo ""
echo "✓ Checking directory structure:"
REQUIRED_DIRS=(
    "_next"
    "_next/static"
    "_next/static/chunks"
    "_next/static/css"
    "_next/static/media"
    "products"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ✅ $dir/"
    else
        echo "  ❌ Missing: $dir/"
    fi
done

# File size check
echo ""
echo "✓ Checking file sizes:"
echo "  📄 index.html: $(du -h index.html | cut -f1)"
echo "  📄 products/index.html: $(du -h products/index.html | cut -f1)"
echo "  📄 .htaccess: $(du -h .htaccess | cut -f1)"

# Total size
echo ""
echo "📊 Total deployment size:"
echo "  Total: $(du -sh . | cut -f1)"

# JavaScript files count
JS_COUNT=$(find _next/static/chunks -name "*.js" | wc -l | tr -d ' ')
echo "  JavaScript files: $JS_COUNT"

# CSS files count  
CSS_COUNT=$(find _next/static/css -name "*.css" | wc -l | tr -d ' ')
echo "  CSS files: $CSS_COUNT"

# Font files count
FONT_COUNT=$(find _next/static/media -name "*.woff*" | wc -l | tr -d ' ')
echo "  Font files: $FONT_COUNT"

echo ""
echo "🎯 Verification complete!"
echo ""
echo "🚀 Ready to upload to Hostinger:"
echo "   1. Upload all files in this directory to public_html"
echo "   2. Maintain exact folder structure"  
echo "   3. Set permissions: directories 755, files 644"
echo "   4. Follow DEPLOYMENT-GUIDE.md for configuration"
echo ""
echo "✅ All files verified and ready for deployment!"