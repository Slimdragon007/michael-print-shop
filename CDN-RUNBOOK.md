# 🛠️ CDN Operations Runbook

Quick reference for common CDN operations and troubleshooting.

## 🚀 Daily Operations

### Upload New Images
```bash
# Upload new Etsy processed images
npm run upload:r2:etsy

# Upload all images from public/images
npm run upload:r2

# Dry run to see what would be uploaded
npm run upload:r2:dry
```

### Deploy Worker Updates
```bash
# Deploy to preview for testing
npm run cdn:deploy:preview

# Deploy to production
npm run cdn:deploy

# Test locally
npm run cdn:dev
```

## 🔧 Common Tasks

### 1. Purge Single Image from Cache
```bash
# Using curl (replace with your domain and API token)
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://cdn.yourdomain.com/products/ABC123/image.jpg"]}'

# Or via Cloudflare Dashboard
# Dashboard → Caching → Configuration → Purge Cache → Custom Purge → Enter URL
```

### 2. Purge All Cache
```bash
# Purge everything (use sparingly)
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### 3. Check R2 Storage Usage
```bash
# List all objects in bucket
wrangler r2 object list print-shop-images

# Check bucket info
wrangler r2 bucket list

# List objects with specific prefix
wrangler r2 object list print-shop-images --prefix products/
```

### 4. Upload Single Image
```bash
# Upload single file to R2
wrangler r2 object put print-shop-images/products/ABC123/canvas.jpg --file ./local-image.jpg

# Using the TypeScript helper
npx tsx -e "
import { R2Uploader } from './scripts/upload-to-r2.ts';
const uploader = new R2Uploader();
await uploader.uploadSingleImage('./local-image.jpg', 'products/ABC123/canvas.jpg');
"
```

### 5. Delete Image from R2
```bash
# Delete single object
wrangler r2 object delete print-shop-images/products/ABC123/canvas.jpg

# Using the TypeScript helper
npx tsx -e "
import { R2Uploader } from './scripts/upload-to-r2.ts';
const uploader = new R2Uploader();
await uploader.deleteFromR2('products/ABC123/canvas.jpg');
"
```

## 📊 Monitoring & Analytics

### Check Cache Performance
```
Cloudflare Dashboard → Analytics → Caching
- Cache hit ratio (aim for >90%)
- Bandwidth saved
- Top cached content
```

### Monitor Worker Performance
```
Cloudflare Dashboard → Workers & Pages → print-shop-cdn → Metrics
- Request volume
- Error rate (should be <1%)
- CPU time usage
- Memory usage
```

### View Real-time Logs
```bash
# Stream Worker logs
wrangler tail

# Filter logs for specific patterns
wrangler tail --grep "ERROR"
wrangler tail --grep "products/ABC123"
```

## 🔄 Credential Management

### 1. Rotate R2 Credentials
```bash
# Generate new R2 token in Cloudflare Dashboard
# Dashboard → R2 → Manage R2 API tokens → Create token

# Update in environment variables
IMAGE_CDN_BASE=https://cdn.yourdomain.com
CLOUDFLARE_API_TOKEN=new_token_here

# Test new credentials
wrangler r2 bucket list
```

### 2. Update Worker Environment Variables
```bash
# Via CLI
wrangler secret put ENVIRONMENT --env production
wrangler secret put CDN_BASE_URL --env production

# Or via Dashboard
# Dashboard → Workers & Pages → print-shop-cdn → Settings → Variables
```

## 🎨 Add New Image Variant Size

### 1. Update Worker Code
Edit `src/worker/index.ts`:
```typescript
// Add new size constants
const MAX_WIDTH = 3000;  // Increase if needed
const MAX_HEIGHT = 3000; // Increase if needed

// The worker automatically handles any size via query params
// No code changes needed for new sizes
```

### 2. Update App Helper
Edit `lib/imageCdn.ts`:
```typescript
// Add new variant function
export function extraLargeImageUrls(sku: string, variant: string = 'main') {
  const key = `products/${sku}/${variant}.jpg`;
  
  return {
    extraLarge: cdnUrl(key, { w: 2400, q: 95, fmt: 'webp' }),
    print: cdnUrl(key, { w: 3000, q: 95, fmt: 'jpeg' }), // For printing
    // ... other sizes
  };
}
```

### 3. Use New Sizes
```typescript
// In your components
import { extraLargeImageUrls } from '@/lib/imageCdn'

const urls = extraLargeImageUrls('ABC123', 'canvas')
const printUrl = urls.print // 3000px for printing
```

## 🖼️ Handle PNG with Transparency

### 1. Update Worker for PNG Support
Edit `src/worker/index.ts`:
```typescript
// Add PNG handling logic
function shouldPreservePNG(key: string, originalFormat: string): boolean {
  // Preserve PNG for logos, graphics with transparency
  if (originalFormat === 'png' && key.includes('/logos/')) return true;
  if (originalFormat === 'png' && key.includes('/graphics/')) return true;
  return false;
}

// In processImage function
if (shouldPreservePNG(key, detectedFormat)) {
  format = 'png'; // Force PNG to preserve transparency
}
```

### 2. Upload PNG Files
```bash
# PNGs are automatically handled by the upload script
npm run upload:r2

# Or upload specific PNG
wrangler r2 object put print-shop-images/graphics/logo.png --file ./logo.png
```

## 🚨 Emergency Procedures

### 1. CDN Complete Failure - Switch to Local Images
```bash
# Disable CDN immediately via environment variable
echo "IMAGE_CDN_ENABLED=false" >> .env.local

# Rebuild and deploy
npm run build
npm run deploy:hostinger

# Images will automatically fall back to local URLs
```

### 2. Worker Deployment Rollback
```bash
# Check deployment history
wrangler deployments list

# Rollback to previous version
wrangler rollback [DEPLOYMENT_ID]

# Or disable Worker route temporarily
# Dashboard → Workers & Pages → print-shop-cdn → Triggers → Delete Route
```

### 3. R2 Bucket Recovery
```bash
# List objects to verify integrity
wrangler r2 object list print-shop-images > bucket-inventory.txt

# Restore from backup (if you have one)
# This would depend on your backup strategy

# Re-upload critical images
npm run upload:r2:etsy
```

## 📈 Performance Optimization

### 1. Optimize Cache Headers
Edit `src/worker/index.ts`:
```typescript
// Adjust cache TTL based on content type
const getCacheTTL = (key: string) => {
  if (key.includes('/products/')) return 60 * 60 * 24 * 7; // 7 days for products
  if (key.includes('/gallery/')) return 60 * 60 * 24 * 30; // 30 days for gallery
  return 60 * 60 * 24; // 1 day default
};
```

### 2. Monitor and Tune
```bash
# Check cache hit rates
# Aim for >90% cache hit rate

# Monitor error rates
# Should be <1% error rate

# Check response times
# Should be <200ms globally
```

## 🔍 Troubleshooting Common Issues

### Issue: Images Not Loading
```bash
# Check DNS resolution
dig cdn.yourdomain.com

# Test direct Worker URL
curl https://print-shop-cdn.yourdomain.workers.dev/products/test/image.jpg

# Check R2 object exists
wrangler r2 object get print-shop-images/products/test/image.jpg

# Check Worker logs
wrangler tail --grep "ERROR"
```

### Issue: Slow Image Loading
```bash
# Check cache headers
curl -I https://cdn.yourdomain.com/products/ABC123/image.jpg

# Look for:
# Cache-Control: public, max-age=86400
# CF-Cache-Status: HIT

# If MISS, check cache configuration
```

### Issue: Wrong Image Format
```bash
# Test format conversion
curl -H "Accept: image/webp" https://cdn.yourdomain.com/products/ABC123/image.jpg

# Should return WebP if supported
# Check Content-Type header
```

### Issue: Upload Failures
```bash
# Check wrangler authentication
wrangler auth whoami

# Re-authenticate if needed
wrangler auth login

# Check bucket permissions
wrangler r2 bucket list

# Test with single file
wrangler r2 object put print-shop-images/test.jpg --file test.jpg
```

## 📞 Support Contacts

### Cloudflare Support
- **Free Plan**: Community forums
- **Paid Plans**: Support tickets
- **Enterprise**: Dedicated support

### Internal Escalation
1. Check this runbook first
2. Review Worker logs: `wrangler tail`
3. Check Cloudflare Analytics dashboard
4. If still stuck, check the main CDN documentation

## 📋 Maintenance Schedule

### Daily
- [ ] Check cache hit rates (should be >90%)
- [ ] Monitor error rates (should be <1%)
- [ ] Review Worker logs for issues

### Weekly
- [ ] Review storage usage and costs
- [ ] Check for failed uploads
- [ ] Test image loading speeds

### Monthly
- [ ] Review and optimize cache settings
- [ ] Check for Worker performance improvements
- [ ] Audit unused images in R2

### Quarterly
- [ ] Review and rotate API credentials
- [ ] Evaluate new Cloudflare features
- [ ] Performance benchmarking
- [ ] Cost optimization review

---

## 🚨 Emergency Contact Info

- **Cloudflare Status**: https://www.cloudflarestatus.com/
- **R2 Status**: https://www.cloudflarestatus.com/
- **Documentation**: https://developers.cloudflare.com/

**Remember**: Most issues can be resolved by checking logs and following this runbook! 🛠️