# Hostinger Deployment Guide - Print Shop Static Site

## 🎯 Deployment Summary

**Status**: ✅ **READY FOR UPLOAD**

The Next.js print shop application has been successfully built and optimized for static hosting on Hostinger shared hosting.

## 📁 Files Ready for Upload

All files in the `public_html/` directory are ready to upload to your Hostinger File Manager.

### File Structure
```
public_html/
├── .htaccess              # Server configuration & routing
├── index.html             # Homepage (70KB)
├── 404.html              # Error page (28KB)
├── favicon.ico           # Site icon
├── products/
│   └── index.html        # Products page
├── _next/                # Next.js static assets
│   └── static/
│       ├── chunks/       # JavaScript bundles
│       ├── css/         # Stylesheets
│       └── media/       # Fonts and images
└── *.svg files          # Static icons
```

## 🚀 Upload Instructions

### Step 1: Access Hostinger File Manager
1. Log into your Hostinger hPanel
2. Navigate to "File Manager"
3. Go to your domain's `public_html` folder

### Step 2: Upload Files
1. **Delete existing content** in public_html (if any)
2. **Upload ALL files** from the `public_html/` directory
3. Maintain the exact folder structure
4. Ensure the `.htaccess` file is uploaded (may be hidden)

### Step 3: Set File Permissions
```
Directories: 755
Files: 644
```

## ⚙️ Configuration Steps

### 1. Environment Variables
The application uses client-side environment variables. Update these in your production environment:

**Required for Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Required for Stripe:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Required for App:**
- `NEXT_PUBLIC_APP_URL=https://print.michaelhaslimphoto.com`
- `NEXT_PUBLIC_APP_NAME=Print Shop`

### 2. Supabase Configuration
In your Supabase project dashboard:
1. Go to Authentication → Settings
2. Add your domain to **Site URL**: `https://print.michaelhaslimphoto.com`
3. Add to **Additional Redirect URLs**:
   - `https://print.michaelhaslimphoto.com/auth`
   - `https://print.michaelhaslimphoto.com/products`

### 3. Stripe Configuration (when ready)
In your Stripe Dashboard:
1. Add domain to allowed domains
2. Set up webhook endpoints for:
   - `https://print.michaelhaslimphoto.com/api/webhooks/stripe`
3. Update success/cancel URLs in checkout sessions

### 4. Domain & SSL Setup
1. Point `print.michaelhaslimphoto.com` to your Hostinger hosting
2. Enable SSL certificate in Hostinger control panel
3. Wait for DNS propagation (up to 24 hours)

## 🔧 Technical Details

### Static Export Features
- ✅ Homepage with hero section and featured content
- ✅ Products page with filter functionality (client-side)
- ✅ Responsive design with Tailwind CSS
- ✅ SEO optimization with meta tags
- ✅ Performance optimized assets
- ✅ Error handling (404 page)

### What's Included
- **Client-side routing**: Works with `.htaccess` redirects
- **Static assets**: All CSS, JS, and fonts optimized
- **Security headers**: Configured in `.htaccess`
- **Caching**: Optimized cache headers for performance
- **Compression**: Gzip compression enabled

### What's Currently Disabled
For this initial deployment, the following features are temporarily disabled:
- ❌ Authentication pages (will require server-side handling)
- ❌ Shopping cart functionality (will require session management)
- ❌ Checkout process (will require payment processing setup)
- ❌ Admin panel (will require authentication)

## 📋 Testing Checklist

After upload, test these items:

### Basic Functionality
- [ ] Homepage loads correctly
- [ ] Products page loads
- [ ] Navigation works between pages
- [ ] 404 page shows for invalid URLs
- [ ] Mobile responsiveness works
- [ ] Images and fonts load properly

### Performance
- [ ] Page load speed < 3 seconds
- [ ] Lighthouse score > 90
- [ ] CSS and JS files load correctly
- [ ] No console errors

### SEO
- [ ] Meta tags present in source code
- [ ] Favicon displays correctly
- [ ] Open Graph meta tags work
- [ ] Google can crawl the site

## 🔍 Troubleshooting

### Common Issues

**404 Errors for Pages:**
- Check `.htaccess` file is uploaded and readable
- Verify file permissions are correct
- Ensure HTML files exist in correct locations

**Images Not Loading:**
- Check file paths in HTML source
- Verify images are uploaded to correct directories
- Check file permissions

**CSS/JS Not Loading:**
- Verify `_next` folder and contents are uploaded
- Check browser console for 404 errors
- Ensure static asset paths are correct

### Logs and Debugging
- Check Hostinger error logs in cPanel
- Use browser developer tools for client-side errors
- Test with different devices/browsers

## 🔗 Important URLs

After deployment:
- **Main Site**: https://print.michaelhaslimphoto.com
- **Products**: https://print.michaelhaslimphoto.com/products
- **404 Test**: https://print.michaelhaslimphoto.com/invalid-page

## 📞 Support Information

If you encounter issues:
1. Check Hostinger documentation
2. Review browser console errors
3. Test with different browsers
4. Verify DNS propagation status

## 🎉 Next Steps

Once the basic site is working:
1. **Enable Authentication**: Restore auth pages with proper Supabase setup
2. **Add E-commerce**: Implement cart and checkout functionality
3. **Setup Analytics**: Add Google Analytics or similar
4. **Content Management**: Set up product catalog in Supabase
5. **Payment Processing**: Configure Stripe for live payments

---

**Generated**: August 14, 2025
**Build Version**: Static Export v1.0
**Next.js Version**: 15.4.6

✅ **READY TO DEPLOY** - All files tested and optimized for Hostinger shared hosting.