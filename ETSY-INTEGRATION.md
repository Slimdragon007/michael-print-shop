# 🎨 Etsy Integration Pipeline

Transform your photography collection into Etsy-ready listings and website products with one command!

## 🚀 Quick Start

### 1. Setup (one-time)
```bash
# Run the setup script
./setup-etsy-pipeline.sh
```

### 2. Process Your Photos
```bash
# Check what will be processed (safe to run)
npm run etsy:stats

# Process all photos for Etsy + Website
npm run batch:etsy
```

## 📁 What Gets Created

### For Etsy Listings
- **Primary Images**: 3000x2400px perfect for Etsy
- **Additional Images**: 2000x2000px square format
- **CSV File**: Ready to upload to Etsy with titles, descriptions, tags, pricing

### For Your Website
- **Multiple Sizes**: 400px (thumb), 1000px (medium), 1600px (large)
- **Optimized**: Progressive JPEG, 90% quality
- **CSV Import**: Compatible with your existing product import system

## 🎯 Features

### ✨ Smart Product Recognition
- Groups photos by product automatically
- Identifies main images vs extras
- Creates unique SKUs for each product

### 🏷️ Auto-Generated Content
- **Titles**: "Big Sur California Coastline - Fine Art Photography Print"
- **Descriptions**: Professional Etsy-style descriptions with emojis
- **Tags**: Location, category, and keyword-based tags
- **Pricing**: Uses your existing pricing matrix

### 📸 Professional Image Processing
- **Watermarking**: Optional watermark overlay
- **Aspect Ratio**: Maintains original proportions with padding
- **Quality**: Optimized for web while preserving detail
- **Formats**: JPEG optimized for fast loading

### 🧠 Intelligent Categorization
Automatically detects from folder/filename:
- **Categories**: Landscapes, Architecture, Cityscapes, Nature
- **Locations**: California, Hawaii, Arizona, Other
- **Pricing**: Automatic pricing based on category + location

## 📊 Pricing Matrix

| Category | California | Hawaii | Arizona | Other |
|----------|------------|--------|---------|-------|
| Landscapes | $50 | $65 | $45 | $40 |
| Architecture | $45 | $55 | $40 | $35 |
| Cityscapes | $45 | $55 | $40 | $35 |
| Nature | $40 | $60 | $35 | $30 |

## 🔄 Workflow Integration

### With Your Existing System
1. **Etsy Pipeline** processes raw photos → Etsy listings + website images
2. **Website Import** uses your existing CSV import system
3. **Admin Dashboard** shows progress and stats
4. **Deployment** includes optimized images in your static build

### File Organization
```
data/etsy-processed/
├── etsy_listings.csv          # Upload to Etsy
├── products_for_import.csv    # Import to website
├── website_products.json      # Full product data
├── processing_report.json     # Stats and info
└── etsy_images/
    ├── product-1/
    │   ├── product-1_etsy_primary_3000x2400.jpg
    │   ├── product-1_etsy_square_2000.jpg
    │   ├── product-1_website_large_1600.jpg
    │   └── product-1_website_thumb_400.jpg
    └── product-2/
        └── ...
```

## 🛠️ Available Commands

### Main Commands
```bash
npm run etsy:pipeline     # Full Etsy processing pipeline
npm run etsy:stats        # Check stats without processing
npm run batch:etsy        # Etsy + website integration
```

### Individual Steps
```bash
python3 scripts/etsy-pipeline.py     # Run Python script directly
tsx scripts/etsy-integration.ts      # Run TypeScript wrapper
```

## ⚙️ Configuration

### Input Paths (edit in scripts/etsy-pipeline.py)
```python
INPUT_ROOT = Path("/Volumes/LaCie/Etsy")        # Your external drive
OUTPUT_ROOT = Path("./data/etsy-processed")     # Output directory
```

### Image Variants
```python
VARIANTS = [
    ("etsy_primary_3000x2400", 3000, 2400, "#ffffff"),
    ("etsy_square_2000", 2000, 2000, "#ffffff"),
    ("website_large_1600", 1600, 1600, "#ffffff"),
    ("website_medium_1000", 1000, 1000, "#ffffff"),
    ("website_thumb_400", 400, 400, "#ffffff"),
]
```

### Watermark Settings
```python
ADD_WATERMARK = True                    # Enable/disable
WATERMARK_PATH = Path("./watermark.png") # Your watermark file
WATERMARK_OPACITY = 0.15               # 15% opacity
WATERMARK_SCALE = 0.20                 # 20% of image size
WATERMARK_POS = "bottom_right"         # Position
```

## 📈 Performance

### Processing Speed
- **Small collection** (50 photos): ~2-3 minutes
- **Medium collection** (200 photos): ~8-10 minutes  
- **Large collection** (500+ photos): ~20-30 minutes

### Output Size
- **Input**: High-resolution photos (5-15MB each)
- **Etsy Primary**: ~800KB-1.2MB
- **Website Images**: ~200-600KB
- **Total Size Reduction**: ~75-85%

## 🔍 Quality Control

### Before Upload to Etsy
1. Review `etsy_listings.csv` for accuracy
2. Check product titles and descriptions
3. Verify pricing is correct
4. Ensure images look good in preview

### Before Website Import
1. Review `products_for_import.csv`
2. Test image loading on website
3. Check category assignments
4. Verify tags are appropriate

## 🚨 Troubleshooting

### External Drive Not Found
```bash
# Check if drive is mounted
ls /Volumes/LaCie/Etsy

# If not found, reconnect and remount
```

### Python Dependencies Missing
```bash
# Reinstall dependencies
pip3 install pillow pandas python-slugify tqdm piexif

# Or run setup again
./setup-etsy-pipeline.sh
```

### Processing Errors
```bash
# Check the processing report
cat data/etsy-processed/processing_report.json

# Look for specific error details
```

### Memory Issues
```bash
# For large collections, increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run batch:etsy
```

## 🎯 Customization

### Modify Product Titles
Edit the title generation in `scripts/etsy-pipeline.py`:
```python
title = key.replace("-", " ").title()
# Add your custom logic here
```

### Change Pricing
Update the `PRICE_MATRIX` in `scripts/etsy-pipeline.py`:
```python
PRICE_MATRIX = {
    'Landscapes': {'California': 60, 'Hawaii': 75, ...},
    # Your custom pricing
}
```

### Adjust Image Sizes
Modify the `VARIANTS` array for different sizes:
```python
VARIANTS = [
    ("custom_size", 2500, 2000, "#ffffff"),
    # Add your variants
]
```

### Custom Descriptions
Edit the `create_etsy_description()` function:
```python
def create_etsy_description(title, category, location):
    # Your custom description template
    return "Your custom description"
```

## 📊 Integration with Admin Dashboard

The pipeline integrates with your existing admin dashboard:

1. **Processing Status**: Real-time progress updates
2. **Statistics**: Photo counts, categories, locations
3. **Import Queue**: Ready-to-import CSV files
4. **Error Tracking**: Detailed error reports

## 🔄 Automation Ideas

### Scheduled Processing
```bash
# Add to crontab for daily processing
0 2 * * * cd /path/to/print-shop && npm run batch:etsy
```

### Watch Folder
```bash
# Process new photos automatically when added
npm run sync:external && npm run batch:etsy
```

## 📞 Support

### Common Issues
1. **Photos not found**: Check external drive connection
2. **Poor quality output**: Adjust JPEG quality settings
3. **Wrong categories**: Update detection logic
4. **Pricing errors**: Review pricing matrix

### Getting Help
- Check processing reports in `data/etsy-processed/`
- Review error logs in terminal output
- Verify file permissions on external drive

---

## 🎉 Success! 

Your photography collection is now ready for:
- ✅ **Etsy**: Professional listings with optimized images
- ✅ **Website**: Fast-loading product pages
- ✅ **SEO**: Properly tagged and categorized
- ✅ **Sales**: Competitive pricing based on location/category

**Ready to sell your art!** 📸💰