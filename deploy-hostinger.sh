#!/bin/bash

# Hostinger Deployment Script for Next.js E-commerce Photo Print Website
# This script prepares and deploys the application to Hostinger

echo "🚀 Starting Hostinger deployment process..."

# Build the Next.js application
echo "📦 Building Next.js application..."
npm run build

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p deployment

# Copy necessary files
echo "📋 Copying application files..."
cp -r .next deployment/
cp -r public deployment/
cp package.json deployment/
cp package-lock.json deployment/
cp .env.production deployment/.env
cp .htaccess deployment/

# Create server.js for Hostinger Node.js hosting
cat > deployment/server.js << 'EOF'
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
EOF

# Create ecosystem.config.js for PM2 (if using PM2 on Hostinger)
cat > deployment/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'print-shop',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Create deployment instructions
cat > deployment/DEPLOYMENT_INSTRUCTIONS.md << 'EOF'
# Hostinger Deployment Instructions

## Prerequisites
1. Hostinger Business or Cloud Hosting plan with Node.js support
2. SSH access to your Hostinger account
3. Domain configured (print.michaelhaslimphoto.com)

## Deployment Steps

### 1. Upload Files via FTP/SFTP
- Connect to your Hostinger account via FTP
- Navigate to public_html directory
- Upload all files from the deployment folder

### 2. SSH into Hostinger
```bash
ssh your_username@your_server_ip
```

### 3. Navigate to application directory
```bash
cd ~/public_html
```

### 4. Install dependencies
```bash
npm install --production
```

### 5. Set up environment variables
- Create .env file with your production variables
- Copy content from .env.example and update with real values

### 6. Start the application

#### Option A: Using PM2 (recommended)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Option B: Using Node.js directly
```bash
node server.js
```

### 7. Configure Hostinger Panel
1. Go to Hostinger hPanel
2. Navigate to "Node.js" section
3. Set application root to public_html
4. Set application entry point to server.js
5. Set Node.js version to 18.x or higher
6. Click "Create" or "Save"

### 8. Configure Domain
1. In hPanel, go to "Domains"
2. Point print.michaelhaslimphoto.com to your application
3. Enable SSL certificate

### 9. Set up Cron Jobs (optional)
For automated tasks, add cron jobs in hPanel:
- Database cleanup: `0 2 * * * cd ~/public_html && node scripts/cleanup.js`
- Backup: `0 3 * * * cd ~/public_html && node scripts/backup.js`

## Post-Deployment

### Verify Installation
1. Visit https://print.michaelhaslimphoto.com
2. Check all pages load correctly
3. Test checkout process with Stripe test mode
4. Verify admin panel access

### Monitor Application
- Check PM2 logs: `pm2 logs`
- Monitor resource usage: `pm2 monit`
- View error logs in Hostinger panel

### Troubleshooting
- If site shows 500 error, check Node.js logs
- Ensure all environment variables are set
- Verify database connection to Supabase
- Check file permissions (755 for directories, 644 for files)
EOF

echo "✅ Deployment preparation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Review deployment/DEPLOYMENT_INSTRUCTIONS.md"
echo "2. Create .env.production with your production environment variables"
echo "3. Upload the deployment folder contents to Hostinger"
echo "4. Follow the deployment instructions"
echo ""
echo "🎉 Your e-commerce photo print website is ready for deployment!"