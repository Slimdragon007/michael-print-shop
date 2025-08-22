# 🚀 Cloudflare CDN + R2 Integration Guide

Complete step-by-step guide to set up Cloudflare DNS, R2 image storage, and CDN for your print shop.

## 📋 Overview

This setup provides:
- **Global CDN**: Fast image delivery worldwide via Cloudflare's edge network
- **R2 Storage**: Cost-effective object storage for your 4,835+ images
- **Image Optimization**: On-the-fly resizing, format conversion (WebP/AVIF)
- **Smart Caching**: Intelligent cache headers for optimal performance
- **Fallback Strategy**: Graceful degradation to local images if needed

## 🎯 Prerequisites

1. **Hostinger Domain**: Your domain currently hosted on Hostinger
2. **Cloudflare Account**: Free account (paid plans offer more features)
3. **Wrangler CLI**: Install with `npm install -g wrangler`
4. **Node.js 18+**: For local development and deployment

## 📝 Step-by-Step Implementation

### Phase 1: DNS Migration (Hostinger → Cloudflare)

#### 1.1 Sign Up for Cloudflare
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Create account and verify email
3. Click "Add a Site"
4. Enter your domain (e.g., `yourdomain.com`)
5. Choose Free plan
6. Cloudflare will scan your existing DNS records

#### 1.2 Update Nameservers in Hostinger
1. **In Cloudflare Dashboard:**
   - Note the nameservers (e.g., `dana.ns.cloudflare.com`, `walt.ns.cloudflare.com`)

2. **In Hostinger Control Panel:**
   ```
   Domain → DNS/Nameservers → Change Nameservers
   Replace with Cloudflare nameservers
   ```
   
3. **Wait for Propagation**: 
   - Can take 24-48 hours
   - Check status at Cloudflare dashboard

#### 1.3 Configure SSL/TLS Settings
```
Cloudflare Dashboard → SSL/TLS → Overview
- Set SSL/TLS encryption mode: "Full (strict)"
- Enable "Always Use HTTPS"
- Enable "Automatic HTTPS Rewrites"
```

### Phase 2: R2 Setup

#### 2.1 Create R2 Buckets
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create production bucket
wrangler r2 bucket create print-shop-images

# Create preview bucket for testing
wrangler r2 bucket create print-shop-images-preview
```

#### 2.2 Get Account ID
```
Cloudflare Dashboard → Right sidebar → Account ID
Copy this for wrangler.toml
```

### Phase 3: Worker Deployment

#### 3.1 Update Configuration
```bash
# Edit wrangler.toml
account_id = "YOUR_ACCOUNT_ID_FROM_DASHBOARD"

# Update domain in routes section
routes = [
  { pattern = "cdn.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

#### 3.2 Deploy Worker
```bash
# Test locally first
wrangler dev

# Deploy to Cloudflare
wrangler deploy
```

#### 3.3 Configure Worker Routes in Dashboard
```
Cloudflare Dashboard → Workers & Pages → print-shop-cdn → Triggers
Add Route: cdn.yourdomain.com/*
Zone: yourdomain.com
```

### Phase 4: DNS Configuration

#### 4.1 Create CDN Subdomain
```
Cloudflare Dashboard → DNS → Records
Type: CNAME
Name: cdn
Target: print-shop-cdn.yourdomain.workers.dev
Proxy status: Proxied (orange cloud)
```

#### 4.2 Create Preview Subdomain (for testing)
```
Type: CNAME  
Name: preview-cdn
Target: print-shop-cdn.yourdomain.workers.dev
Proxy status: Proxied (orange cloud)
```

### Phase 5: Image Upload Strategy

#### 5.1 Bulk Upload Etsy Images
```bash
# Navigate to your processed images
cd data/etsy-processed/etsy_images

# Upload all product images to R2
find . -name "*.jpg" -exec wrangler r2 object put print-shop-images/{} --file {} \;

# Or use a script for better organization:
npm run upload:images:r2
```

#### 5.2 Upload Script (create in package.json)
```json
{
  "scripts": {
    "upload:images:r2": "tsx scripts/upload-to-r2.ts",
    "upload:preview": "tsx scripts/upload-to-r2.ts --bucket=preview"
  }
}
```

### Phase 6: App Integration

#### 6.1 Update Environment Variables
```bash
# Copy example and edit
cp .env.example .env.local

# Update these values:
IMAGE_CDN_ENABLED=true
IMAGE_CDN_BASE=https://cdn.yourdomain.com
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

#### 6.2 Update Image References
Let me scan your app to identify files that need updating...

## 🔄 Safe Rollout Strategy

### Step 1: Preview Testing
1. Deploy Worker with preview route
2. Upload small batch of test images
3. Test URLs: `https://preview-cdn.yourdomain.com/products/test/image.jpg`
4. Validate caching, formats, and quality

### Step 2: Production Deployment
```bash
# Switch to production CDN
IMAGE_CDN_BASE=https://cdn.yourdomain.com

# Update app configuration
npm run build
npm run deploy:hostinger
```

### Step 3: Monitor Performance
- Check Cloudflare Analytics for cache hit rates
- Monitor page load speeds
- Verify image quality across devices

## 🛠️ CLI Commands Reference

### Wrangler Commands
```bash
# Development
wrangler dev                          # Local development
wrangler dev --remote                 # Remote development

# Deployment  
wrangler deploy                       # Deploy to production
wrangler deploy --env preview         # Deploy to preview

# R2 Management
wrangler r2 bucket list               # List buckets
wrangler r2 object list print-shop-images    # List objects
wrangler r2 object put print-shop-images/path/image.jpg --file local-image.jpg
wrangler r2 object delete print-shop-images/path/image.jpg

# Logs and Monitoring
wrangler tail                         # View real-time logs
wrangler kv:namespace list            # List KV namespaces (if using)
```

### NPM Scripts (add to package.json)
```json
{
  "scripts": {
    "cdn:dev": "wrangler dev",
    "cdn:deploy": "wrangler deploy", 
    "cdn:deploy:preview": "wrangler deploy --env preview",
    "cdn:tail": "wrangler tail",
    "upload:r2:batch": "tsx scripts/upload-to-r2.ts",
    "upload:r2:single": "tsx scripts/upload-single-image.ts"
  }
}
```

## 🖼️ Image URL Examples

### CDN URLs
```javascript
// Basic image
https://cdn.yourdomain.com/products/ABC123/canvas.jpg

// Resized with WebP format
https://cdn.yourdomain.com/products/ABC123/canvas.jpg?w=800&fmt=webp

// High quality large image
https://cdn.yourdomain.com/products/ABC123/canvas.jpg?w=1600&q=90

// Square thumbnail
https://cdn.yourdomain.com/products/ABC123/canvas.jpg?w=400&h=400&q=80
```

### Using the Helper Function
```typescript
import { productImageUrls, cdnUrl } from '@/lib/imageCdn'

// Get all sizes for a product
const images = productImageUrls('ABC123', 'canvas')
// Returns: { thumbnail, medium, large, original, responsive, fallback }

// Custom transformations
const customUrl = cdnUrl('products/ABC123/canvas.jpg', {
  w: 1200,
  h: 800, 
  q: 85,
  fmt: 'webp'
})
```

## 🔍 Cloudflare Dashboard Steps

### Worker Configuration
```
Dashboard → Workers & Pages → Create Application → Create Worker
Name: print-shop-cdn
Deploy code (copy from src/worker/index.ts)

Settings → Variables:
- ENVIRONMENT: production
- CDN_BASE_URL: https://cdn.yourdomain.com

Settings → Bindings:
- R2 Bucket: R2 → print-shop-images
```

### DNS Records Setup
```
Dashboard → DNS → Records

Record 1:
Type: CNAME
Name: cdn  
Target: print-shop-cdn.yourdomain.workers.dev
Proxy: Proxied (🟠)

Record 2:
Type: CNAME
Name: preview-cdn
Target: print-shop-cdn.yourdomain.workers.dev  
Proxy: Proxied (🟠)
```

### SSL/TLS Configuration
```
Dashboard → SSL/TLS → Overview:
- SSL/TLS encryption mode: Full (strict)
- Always Use HTTPS: On
- Automatic HTTPS Rewrites: On

Dashboard → SSL/TLS → Edge Certificates:
- Always Use HTTPS: On
- HTTP Strict Transport Security (HSTS): Enable
```

## 🚨 Troubleshooting

### Common Issues

#### DNS Propagation
```bash
# Check DNS propagation
dig cdn.yourdomain.com
nslookup cdn.yourdomain.com

# Use online tools
https://www.whatsmydns.net/
```

#### Worker Errors
```bash
# View real-time logs
wrangler tail

# Common issues:
# - Account ID mismatch in wrangler.toml
# - Incorrect R2 bucket binding
# - Missing environment variables
```

#### R2 Upload Issues
```bash
# Check bucket permissions
wrangler r2 bucket list

# Verify file exists before upload
ls -la path/to/image.jpg

# Test single file upload
wrangler r2 object put print-shop-images/test.jpg --file test.jpg
```

#### Cache Issues
```bash
# Purge specific URLs
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://cdn.yourdomain.com/products/ABC123/image.jpg"]}'
```

### Performance Monitoring
```
Cloudflare Dashboard → Analytics → Web Analytics
- Page load times
- Cache hit ratios  
- Bandwidth usage
- Error rates

Dashboard → Speed → Optimization
- Enable Auto Minify (CSS, JS, HTML)
- Enable Brotli compression
- Enable Rocket Loader (optional)
```

## 📊 Expected Performance Improvements

### Before CDN (Hostinger only)
- **Load Time**: 2-5 seconds for image-heavy pages
- **Cache**: Limited to browser cache only
- **Global Performance**: Slower for international users
- **Bandwidth**: All traffic through Hostinger

### After CDN (Cloudflare + R2)
- **Load Time**: 0.5-1.5 seconds for same pages
- **Cache Hit Rate**: 85-95% after warm-up
- **Global Performance**: Consistent worldwide
- **Bandwidth Savings**: 60-80% reduction on origin server
- **Image Optimization**: Automatic WebP/AVIF conversion

## 💰 Cost Estimation

### Cloudflare Free Plan
- **Workers**: 100,000 requests/day free
- **R2**: 10GB storage free, $0.015/GB after
- **Bandwidth**: Free (when using Workers)

### For Your 4,835 Images (~2GB total)
- **Storage Cost**: Free (under 10GB limit)
- **Request Cost**: Free (under 100k/day)
- **Total Monthly Cost**: $0 on free plan

### Paid Plans (if needed)
- **Workers Paid**: $5/month for 10M requests
- **R2 Storage**: $0.015/GB/month
- **Pro Plan**: $20/month for advanced features

## 🎉 Success Checklist

### DNS Migration Complete ✅
- [ ] Nameservers updated in Hostinger
- [ ] SSL certificate active in Cloudflare
- [ ] Domain resolving through Cloudflare

### Worker Deployed ✅  
- [ ] Worker code deployed successfully
- [ ] R2 bucket created and linked
- [ ] Routes configured for cdn.yourdomain.com

### Images Uploaded ✅
- [ ] Test images uploaded to R2
- [ ] CDN URLs returning images correctly
- [ ] Cache headers working properly

### App Integration Complete ✅
- [ ] Environment variables configured
- [ ] Image helper functions implemented
- [ ] Existing image references updated

### Performance Validated ✅
- [ ] Page load speeds improved
- [ ] Cache hit rates above 80%
- [ ] Image quality maintained
- [ ] Mobile performance optimized

---

## 🚀 Your CDN is Ready!

With this setup, your print shop now has enterprise-level image delivery:
- ⚡ **Lightning Fast**: Global edge caching
- 💰 **Cost Effective**: Free for most usage levels  
- 🔧 **Fully Automated**: No manual intervention needed
- 📱 **Mobile Optimized**: Automatic format conversion
- 🌍 **Global Scale**: Cloudflare's 300+ data centers

**Ready to serve your 4,835 photos to the world!** 🖼️✨