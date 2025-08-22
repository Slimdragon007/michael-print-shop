#!/bin/bash

echo "🚀 PrintShop Admin Deployment Script"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this from the print-shop directory"
    exit 1
fi

echo "📦 Building the project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo ""
echo "🌍 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Go to https://vercel.com"
echo "2. Sign up/login with GitHub, Google, or Email"
echo "3. Click 'New Project'"
echo "4. Upload this folder: $(pwd)"
echo "5. Vercel will auto-detect Next.js settings"
echo "6. Click 'Deploy'"
echo ""
echo "🎯 Your admin will be available at:"
echo "   https://your-project-name.vercel.app/admin"
echo "   https://your-project-name.vercel.app/admin/orders"
echo ""
echo "🔐 Environment Variables to add in Vercel:"
echo "   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key"
echo "   STRIPE_SECRET_KEY=sk_test_your_key"
echo ""
echo "✨ Then you can access your admin from anywhere in the world!"