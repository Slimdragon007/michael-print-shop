#!/usr/bin/env python3
"""
Etsy Listing Photo Pipeline - Integrated with Print Shop System
Adapted for your existing TypeScript photo management workflow
"""

import os, re, hashlib, json
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance
import pandas as pd
from slugify import slugify
from tqdm import tqdm
from datetime import datetime

# -------- CONFIG - Updated for your system --------
INPUT_ROOT  = Path("/Volumes/LaCie/Etsy")  # Your external drive
OUTPUT_ROOT = Path("/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/data/etsy-processed")
WEBSITE_IMAGES = Path("/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/public/images")
# --------------------------------------------------

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}

# Variants to create (matching your existing system + Etsy requirements)
VARIANTS = [
    ("etsy_primary_3000x2400", 3000, 2400, "#ffffff"),    # Etsy primary image
    ("etsy_square_2000", 2000, 2000, "#ffffff"),          # Etsy square format
    ("website_large_1600", 1600, 1600, "#ffffff"),        # Your large format
    ("website_medium_1000", 1000, 1000, "#ffffff"),       # Your medium format
    ("website_thumb_400", 400, 400, "#ffffff"),           # Your thumbnail
]

# Watermark settings
ADD_WATERMARK   = True
WATERMARK_PATH  = Path("./watermark.png")  # Add your watermark file
WATERMARK_OPACITY = 0.15
WATERMARK_SCALE   = 0.20
WATERMARK_POS     = "bottom_right"

# Etsy/Website settings
MAX_EXTRAS        = 9
DEFAULT_TAGS      = ["fine art print", "photography", "wall art", "landscape", "home decor"]
DEFAULT_MATERIALS = ["archival ink", "fine-art paper", "museum quality"]

# Price matrix matching your existing system
PRICE_MATRIX = {
    'Architecture': {'California': 45, 'Hawaii': 55, 'Arizona': 40, 'Other': 35},
    'Landscapes': {'California': 50, 'Hawaii': 65, 'Arizona': 45, 'Other': 40},
    'Cityscapes': {'California': 45, 'Hawaii': 55, 'Arizona': 40, 'Other': 35},
    'Nature': {'California': 40, 'Hawaii': 60, 'Arizona': 35, 'Other': 30},
    'Other': {'California': 35, 'Hawaii': 45, 'Arizona': 30, 'Other': 25}
}

# File pattern to group products (improved for your naming)
PRODUCT_REGEX = re.compile(r"^([A-Za-z0-9\-_ ]+?)[-_ ]?(main|extra|listing)?[-_ ]?\d{0,2}[-_ ]?\d{4}[-_ ]?[a-f0-9]*\.(jpg|jpeg|png|tif|tiff)$", re.I)

def iter_images(root: Path):
    """Find all valid image files"""
    for p in root.rglob("*"):
        if p.suffix.lower() in ALLOWED_EXT and p.is_file():
            # Skip if in listing_print_files (these are already processed)
            if "listing_print_files" in str(p):
                continue
            yield p

def product_key(p: Path) -> str:
    """Extract product key from filename"""
    m = PRODUCT_REGEX.match(p.name)
    if m:
        stem = m.group(1)
    else:
        # Fallback for non-standard naming
        stem = p.stem.split('_')[0] if '_' in p.stem else p.stem
    
    return slugify(stem, max_length=50)

def parse_metadata_from_path(p: Path) -> dict:
    """Extract category, location from folder structure and filename"""
    parts = p.parts
    
    # Try to extract category from parent folders
    category = "Other"
    location = "Other"
    
    # Look for category indicators in path
    path_str = str(p).lower()
    if any(x in path_str for x in ["landscape", "nature", "scenic"]):
        category = "Landscapes"
    elif any(x in path_str for x in ["architecture", "building", "structure"]):
        category = "Architecture"
    elif any(x in path_str for x in ["city", "urban", "skyline"]):
        category = "Cityscapes"
    elif any(x in path_str for x in ["nature", "wildlife", "natural"]):
        category = "Nature"
    
    # Look for location indicators
    if any(x in path_str for x in ["hawaii", "maui", "oahu"]):
        location = "Hawaii"
    elif any(x in path_str for x in ["california", "ca", "big_sur", "carmel", "monterey"]):
        location = "California"
    elif any(x in path_str for x in ["arizona", "az", "sedona", "flagstaff"]):
        location = "Arizona"
    
    return {"category": category, "location": location}

def load_rgb(path: Path):
    """Load image and convert to RGB"""
    try:
        im = Image.open(path)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGB")
        return im
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return None

def pad_resize(im: Image.Image, w: int, h: int, bg: str):
    """Resize image maintaining aspect ratio with padding"""
    im2 = im.copy()
    im2.thumbnail((w, h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (w, h), bg)
    canvas.paste(im2, ((w-im2.width)//2, (h-im2.height)//2))
    return canvas

def add_watermark(im: Image.Image):
    """Add watermark if enabled and file exists"""
    if not ADD_WATERMARK or not WATERMARK_PATH.exists():
        return im
    
    try:
        base = im.convert("RGBA")
        wm = Image.open(WATERMARK_PATH).convert("RGBA")
        
        # Scale watermark
        tgt = int(min(base.size) * WATERMARK_SCALE)
        wm = wm.resize((tgt, int(tgt * wm.height / wm.width)), Image.Resampling.LANCZOS)
        
        # Apply opacity
        alpha = wm.split()[3]
        wm.putalpha(ImageEnhance.Brightness(alpha).enhance(WATERMARK_OPACITY))
        
        # Position watermark
        margin = int(0.02 * min(base.size))
        pos_map = {
            "bottom_right": (base.width - wm.width - margin, base.height - wm.height - margin),
            "bottom_left": (margin, base.height - wm.height - margin),
            "top_right": (base.width - wm.width - margin, margin),
            "top_left": (margin, margin),
            "center": ((base.width - wm.width) // 2, (base.height - wm.height) // 2),
        }
        
        base.alpha_composite(wm, pos_map.get(WATERMARK_POS, pos_map["bottom_right"]))
        return base.convert("RGB")
    except Exception as e:
        print(f"Warning: Could not add watermark: {e}")
        return im

def md5hash(path: Path):
    """Generate MD5 hash of file for unique naming"""
    h = hashlib.md5()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()[:10]
    except:
        return "unknown"

def calculate_price(category: str, location: str) -> float:
    """Calculate price using your existing pricing matrix"""
    cat_prices = PRICE_MATRIX.get(category, PRICE_MATRIX['Other'])
    return cat_prices.get(location, cat_prices['Other'])

def generate_tags(product_key: str, category: str, location: str) -> list:
    """Generate tags for Etsy listing"""
    tags = DEFAULT_TAGS.copy()
    
    # Add category-specific tags
    if category == "Landscapes":
        tags.extend(["nature", "scenic", "landscape photography"])
    elif category == "Architecture":
        tags.extend(["building", "structure", "architectural"])
    elif category == "Cityscapes":
        tags.extend(["urban", "city", "skyline"])
    elif category == "Nature":
        tags.extend(["natural", "outdoor", "wilderness"])
    
    # Add location
    if location != "Other":
        tags.append(location.lower())
    
    # Add product-specific keywords
    keywords = product_key.replace("-", " ").split()
    tags.extend([k for k in keywords if len(k) > 2])
    
    # Remove duplicates and limit to 13 (Etsy max)
    return list(dict.fromkeys(tags))[:13]

def create_etsy_description(title: str, category: str, location: str) -> str:
    """Generate professional Etsy description"""
    desc_parts = [
        f"🖼️ {title}",
        "",
        f"Transform your space with this stunning {category.lower()} photograph"
    ]
    
    if location != "Other":
        desc_parts.append(f"captured in the breathtaking landscapes of {location}.")
    else:
        desc_parts.append("featuring exceptional composition and natural beauty.")
    
    desc_parts.extend([
        "",
        "✨ WHAT YOU GET:",
        "• High-resolution digital download",
        "• Multiple sizes included (8x10, 11x14, 16x20)",
        "• Print-ready files at 300 DPI",
        "• Instant download after purchase",
        "",
        "🎨 PRINT DETAILS:",
        "• Professional archival quality recommended",
        "• Museum-grade paper for lasting beauty",
        "• Frame not included",
        "",
        "📐 SIZING OPTIONS:",
        "Files are sized to print perfectly at standard frame sizes. Print at home or at your local print shop.",
        "",
        "🚚 DELIVERY:",
        "Instant digital download - no waiting, no shipping fees!",
        "",
        "💝 Perfect for home decor, office spaces, or as a thoughtful gift for photography and nature lovers.",
        "",
        "Questions? Message me anytime!"
    ])
    
    return "\n".join(desc_parts)

def main():
    """Main processing pipeline"""
    print("🎨 Etsy Listing Photo Pipeline")
    print("=" * 50)
    
    # Create output directories
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    (OUTPUT_ROOT / "etsy_images").mkdir(exist_ok=True)
    (OUTPUT_ROOT / "website_images").mkdir(exist_ok=True)
    
    # Group images by product
    print("📂 Analyzing photo collection...")
    groups = {}
    total_files = 0
    
    for p in iter_images(INPUT_ROOT):
        key = product_key(p)
        groups.setdefault(key, []).append(p)
        total_files += 1
    
    # Sort files within each group
    for key in groups:
        groups[key].sort()
    
    print(f"Found {total_files} images grouped into {len(groups)} products")
    
    # Process each product group
    results = []
    etsy_listings = []
    website_products = []
    
    for key, files in tqdm(groups.items(), desc="Processing products"):
        try:
            # Create product output directory
            product_dir = OUTPUT_ROOT / "etsy_images" / key
            product_dir.mkdir(parents=True, exist_ok=True)
            
            # Get metadata from first file
            primary_file = files[0]
            metadata = parse_metadata_from_path(primary_file)
            
            # Load primary image
            im = load_rgb(primary_file)
            if im is None:
                continue
            
            # Create all variants
            variant_paths = {}
            for label, w, h, bg in VARIANTS:
                resized = pad_resize(im, w, h, bg)
                watermarked = add_watermark(resized)
                
                output_path = product_dir / f"{key}_{label}.jpg"
                watermarked.save(output_path, "JPEG", quality=90, optimize=True, progressive=True)
                variant_paths[label] = str(output_path)
            
            # Process additional images
            additional_images = []
            for i, extra_file in enumerate(files[1:MAX_EXTRAS + 1]):
                extra_im = load_rgb(extra_file)
                if extra_im is None:
                    continue
                
                # Create square version for additional images
                resized = pad_resize(extra_im, 2000, 2000, "#ffffff")
                watermarked = add_watermark(resized)
                
                extra_path = product_dir / f"{key}_extra_{i+1}_{md5hash(extra_file)}.jpg"
                watermarked.save(extra_path, "JPEG", quality=90, optimize=True, progressive=True)
                additional_images.append(str(extra_path))
            
            # Generate product data
            title = key.replace("-", " ").title()
            category = metadata["category"]
            location = metadata["location"]
            price = calculate_price(category, location)
            tags = generate_tags(key, category, location)
            description = create_etsy_description(title, category, location)
            
            # Etsy listing data
            etsy_listing = {
                "sku": key,
                "title": f"{title} - Fine Art Photography Print",
                "description": description,
                "price": f"{price:.2f}",
                "materials": ", ".join(DEFAULT_MATERIALS),
                "tags": ", ".join(tags),
                "category": category,
                "location": location,
                "primary_image": variant_paths.get("etsy_primary_3000x2400", ""),
                "additional_images": ", ".join([variant_paths.get("etsy_square_2000", "")] + additional_images),
                "folder": str(product_dir),
                "source_files": len(files),
                "created_at": datetime.now().isoformat()
            }
            etsy_listings.append(etsy_listing)
            
            # Website product data (compatible with your existing system)
            website_product = {
                "id": key,
                "title": title,
                "description": f"Beautiful {category.lower()} photography from {location}. Professional quality print ready for your home or office.",
                "category": category,
                "location": location,
                "image_type": "Main_Images",
                "web_path": f"/images/{key}_website_medium_1000.jpg",
                "thumbnail_path": f"/images/{key}_website_thumb_400.jpg",
                "large_path": f"/images/{key}_website_large_1600.jpg",
                "dimensions": {"width": im.width, "height": im.height},
                "tags": tags,
                "base_price": price,
                "variants": variant_paths
            }
            website_products.append(website_product)
            
        except Exception as e:
            print(f"Error processing {key}: {e}")
            continue
    
    # Save results
    print("\n💾 Saving processed data...")
    
    # Save Etsy listings CSV
    etsy_df = pd.DataFrame(etsy_listings)
    etsy_csv_path = OUTPUT_ROOT / "etsy_listings.csv"
    etsy_df.to_csv(etsy_csv_path, index=False)
    print(f"✅ Etsy listings: {etsy_csv_path}")
    
    # Save website products (compatible with your system)
    website_json_path = OUTPUT_ROOT / "website_products.json"
    with open(website_json_path, 'w') as f:
        json.dump(website_products, f, indent=2)
    print(f"✅ Website products: {website_json_path}")
    
    # Save website CSV (compatible with your existing CSV importer)
    website_csv_data = []
    for product in website_products:
        website_csv_data.append({
            "title": product["title"],
            "description": product["description"],
            "image_url": product["web_path"],
            "base_price": product["base_price"],
            "category": product["category"],
            "tags": ", ".join(product["tags"]),
            "width": product["dimensions"]["width"],
            "height": product["dimensions"]["height"]
        })
    
    website_csv_path = OUTPUT_ROOT / "products_for_import.csv"
    website_df = pd.DataFrame(website_csv_data)
    website_df.to_csv(website_csv_path, index=False)
    print(f"✅ Website import CSV: {website_csv_path}")
    
    # Generate processing report
    report = {
        "processed_at": datetime.now().isoformat(),
        "total_products": len(etsy_listings),
        "total_images_processed": sum(listing["source_files"] for listing in etsy_listings),
        "categories": {cat: len([l for l in etsy_listings if l["category"] == cat]) 
                     for cat in set(l["category"] for l in etsy_listings)},
        "locations": {loc: len([l for l in etsy_listings if l["location"] == loc]) 
                     for loc in set(l["location"] for l in etsy_listings)},
        "output_paths": {
            "etsy_csv": str(etsy_csv_path),
            "website_json": str(website_json_path),
            "website_csv": str(website_csv_path),
            "images_directory": str(OUTPUT_ROOT / "etsy_images")
        }
    }
    
    report_path = OUTPUT_ROOT / "processing_report.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print summary
    print(f"\n🎉 Processing Complete!")
    print(f"📊 Summary:")
    print(f"   • Products created: {len(etsy_listings)}")
    print(f"   • Images processed: {sum(listing['source_files'] for listing in etsy_listings)}")
    print(f"   • Categories: {', '.join(report['categories'].keys())}")
    print(f"   • Locations: {', '.join(report['locations'].keys())}")
    print(f"\n📁 Output files:")
    print(f"   • Etsy listings: {etsy_csv_path}")
    print(f"   • Website products: {website_json_path}")
    print(f"   • Import CSV: {website_csv_path}")
    print(f"   • Processing report: {report_path}")
    print(f"\n🚀 Next steps:")
    print(f"   1. Review the CSV files")
    print(f"   2. Copy optimized images to your website")
    print(f"   3. Import products to your database")
    print(f"   4. Upload to Etsy using the etsy_listings.csv")

if __name__ == "__main__":
    main()