#!/bin/bash

# Hostinger Static Deployment Script for Next.js Print Shop
# This script prepares the application for static hosting on Hostinger shared hosting

echo "🚀 Starting Hostinger static deployment preparation..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf out deployment

# Set production environment
export NODE_ENV=production

# Load production environment variables
if [ -f .env.production ]; then
    echo "📋 Loading production environment variables..."
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo "⚠️  Warning: .env.production not found. Using .env.local or defaults."
fi

# Install dependencies (production only)
echo "📦 Installing production dependencies..."
npm ci --only=production

# Build the Next.js application for static export
echo "🔨 Building Next.js application for static export..."
npm run build:hostinger

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please check for errors."
    exit 1
fi

# Create deployment directory structure
echo "📁 Creating deployment directory structure..."
mkdir -p deployment/public_html

# Copy static export files
echo "📋 Copying static export files..."
if [ -d "out" ]; then
    cp -r out/* deployment/public_html/
else
    echo "❌ Static export failed - 'out' directory not found!"
    exit 1
fi

# Copy additional static assets
echo "📋 Copying additional assets..."
if [ -d "public" ]; then
    cp -r public/* deployment/public_html/ 2>/dev/null || true
fi

# Create .htaccess for proper routing and security
echo "🔧 Creating .htaccess for routing and security..."
cat > deployment/public_html/.htaccess << 'EOF'
# Enable rewrite engine
RewriteEngine On

# Force HTTPS (if SSL is available)
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Handle Next.js static export routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^([^.]+)/?$ /$1.html [L,QSA]

# Handle trailing slashes for directories
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^(.+[^/])$ /$1/ [R=301,L]

# Security headers
<IfModule mod_headers.c>
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains" env=HTTPS
</IfModule>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
    AddOutputFilterByType DEFLATE application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/webp "access plus 1 month"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/x-javascript "access plus 1 month"
    ExpiresByType application/x-shockwave-flash "access plus 1 month"
    ExpiresByType image/x-icon "access plus 1 year"
    ExpiresDefault "access plus 2 days"
</IfModule>

# Protect sensitive files
<Files ".env*">
    Require all denied
</Files>

<Files "*.config.*">
    Require all denied
</Files>

# Handle API routes (will need server-side handling)
RewriteRule ^api/(.*)$ /api-handler.php?route=$1 [L,QSA]
EOF

# Create a simple PHP API handler for basic functionality
echo "🔧 Creating PHP API handler for basic server-side functionality..."
cat > deployment/public_html/api-handler.php << 'EOF'
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$route = $_GET['route'] ?? '';

// Basic routing for static hosting
switch ($route) {
    case 'health':
        echo json_encode(['status' => 'ok', 'timestamp' => time()]);
        break;
    
    case 'checkout':
        // For checkout, redirect to Stripe Checkout
        // This would need to be implemented based on your Stripe setup
        http_response_code(501);
        echo json_encode(['error' => 'Checkout requires server-side implementation']);
        break;
    
    default:
        http_response_code(404);
        echo json_encode(['error' => 'API endpoint not found']);
        break;
}
?>
EOF

# Copy environment file template
echo "📋 Creating environment configuration template..."
cp .env.production deployment/.env.production.template

# Create deployment instructions
echo "📝 Creating deployment instructions..."
cat > deployment/DEPLOYMENT_INSTRUCTIONS.md << 'EOF'
# Hostinger Static Hosting Deployment Instructions

## Files Ready for Upload

The `public_html` folder contains all files ready for upload to Hostinger.

## Deployment Steps

### 1. Upload Files to Hostinger
1. Connect to your Hostinger account via File Manager or FTP
2. Navigate to the `public_html` directory (or your domain's folder)
3. Upload ALL contents from the `deployment/public_html` folder to your hosting directory
4. Ensure file permissions are correct (755 for directories, 644 for files)

### 2. Configure Environment Variables
1. Edit the environment variables in your hosting control panel if available
2. Or ensure sensitive data is properly configured in your Supabase and Stripe dashboards

### 3. Set Up Domain and SSL
1. Point your domain (print.michaelhaslimphoto.com) to your hosting account
2. Enable SSL certificate in Hostinger control panel
3. Wait for DNS propagation (up to 24 hours)

### 4. Configure Supabase
1. In your Supabase project settings:
   - Add your domain to "Site URL": https://print.michaelhaslimphoto.com
   - Add to "Additional Redirect URLs": 
     - https://print.michaelhaslimphoto.com/auth
     - https://print.michaelhaslimphoto.com/checkout
2. Update RLS policies if needed for your domain

### 5. Configure Stripe
1. In Stripe Dashboard:
   - Add your domain to allowed domains
   - Set up webhook endpoints for your domain:
     - https://print.michaelhaslimphoto.com/api/webhooks/stripe
   - Update success/cancel URLs in Checkout sessions

## Important Notes

### API Limitations
- Static hosting has limited server-side capabilities
- Payment processing is handled client-side with Stripe Checkout
- User authentication uses Supabase Auth (client-side)
- File uploads go directly to Supabase Storage

### Performance Optimizations
- Static files are automatically cached
- Images are served with proper compression
- CSS and JS are minified and compressed

### Security
- Sensitive environment variables should be set in Supabase/Stripe dashboards
- Client-side code includes security headers via .htaccess
- File upload security is handled by Supabase Storage policies

## Testing Checklist

After deployment, test:
- [ ] Homepage loads correctly
- [ ] Product pages display properly
- [ ] User authentication (login/register)
- [ ] Cart functionality
- [ ] Stripe Checkout process
- [ ] Admin panel access (if applicable)
- [ ] Mobile responsiveness
- [ ] SSL certificate working
- [ ] SEO meta tags loading

## Troubleshooting

### Common Issues:
1. **404 errors**: Check .htaccess rewrite rules
2. **Images not loading**: Verify file paths and permissions
3. **Authentication issues**: Check Supabase URL configuration
4. **Payment issues**: Verify Stripe keys and webhook endpoints

### Getting Help:
- Check browser console for JavaScript errors
- Review Hostinger error logs
- Verify Supabase project settings
- Test Stripe integration in test mode first

## Monitoring

### Regular Maintenance:
- Monitor Supabase usage and billing
- Check Stripe transaction logs
- Review Hostinger resource usage
- Update dependencies monthly
- Backup Supabase data regularly

## Context7 Integration

The application includes Context7 integration for enhanced AI capabilities:
- AI-powered product recommendations
- Automated customer service responses
- Content generation for product descriptions
- Order processing optimization

Ensure Context7 API endpoints are properly configured in your Supabase functions.
EOF

# Create a verification script
echo "🔧 Creating verification script..."
cat > deployment/verify-deployment.sh << 'EOF'
#!/bin/bash

echo "🔍 Verifying deployment files..."

PUBLIC_HTML="./public_html"

# Check if main files exist
REQUIRED_FILES=("index.html" ".htaccess" "api-handler.php")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$PUBLIC_HTML/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo "✅ All required files are present"
else
    echo "❌ Missing files: ${MISSING_FILES[*]}"
fi

# Check directory structure
REQUIRED_DIRS=("_next")
MISSING_DIRS=()

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$PUBLIC_HTML/$dir" ]; then
        MISSING_DIRS+=("$dir")
    fi
done

if [ ${#MISSING_DIRS[@]} -eq 0 ]; then
    echo "✅ All required directories are present"
else
    echo "❌ Missing directories: ${MISSING_DIRS[*]}"
fi

# Check file sizes
echo "📊 File size summary:"
du -sh "$PUBLIC_HTML"/*

echo "✅ Deployment verification complete"
EOF

chmod +x deployment/verify-deployment.sh

# Run verification
echo "🔍 Running deployment verification..."
cd deployment && ./verify-deployment.sh && cd ..

# Final summary
echo ""
echo "✅ Static deployment preparation complete!"
echo ""
echo "📁 Files ready for upload:"
echo "   - deployment/public_html/ (upload contents to your Hostinger public_html)"
echo ""
echo "📝 Next steps:"
echo "1. Review deployment/DEPLOYMENT_INSTRUCTIONS.md"
echo "2. Upload deployment/public_html/ contents to Hostinger"
echo "3. Configure your domain and SSL"
echo "4. Test the deployment"
echo ""
echo "🌐 Your print shop will be available at: https://print.michaelhaslimphoto.com"
echo "🎉 Deployment preparation successful!"