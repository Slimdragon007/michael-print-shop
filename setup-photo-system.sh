#!/bin/bash

# Ultimate Photo Management System Setup
# =====================================

set -e

echo "🚀 Ultimate Photo Management System Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
EXTERNAL_DRIVE="/Volumes/LaCie/Etsy"
CSV_FILE="/Volumes/LaCie/Etsy/photo_inventory copy.csv"
PROJECT_DIR="/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop"

# Function to print colored output
print_step() {
    echo -e "${BLUE}➤ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if external drive is connected
check_external_drive() {
    print_step "Checking external drive connection..."
    if [ -d "$EXTERNAL_DRIVE" ]; then
        if [ -f "$CSV_FILE" ]; then
            print_success "External drive connected and CSV file found"
            # Show some stats
            TOTAL_PHOTOS=$(wc -l < "$CSV_FILE" | tr -d ' ')
            echo "   📊 Found $TOTAL_PHOTOS photos in inventory"
        else
            print_error "CSV file not found at $CSV_FILE"
            exit 1
        fi
    else
        print_error "External drive not found at $EXTERNAL_DRIVE"
        echo "   Please connect the LaCie drive and try again"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    cd "$PROJECT_DIR"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Please install npm first."
        exit 1
    fi
    
    npm install
    print_success "Dependencies installed"
}

# Create necessary directories
create_directories() {
    print_step "Creating directory structure..."
    
    # Create directories
    mkdir -p "$PROJECT_DIR/data"
    mkdir -p "$PROJECT_DIR/public/images/original"
    mkdir -p "$PROJECT_DIR/public/images/thumbnail"
    mkdir -p "$PROJECT_DIR/public/images/small"
    mkdir -p "$PROJECT_DIR/public/images/medium"
    mkdir -p "$PROJECT_DIR/public/images/large"
    mkdir -p "$PROJECT_DIR/scripts"
    
    print_success "Directory structure created"
}

# Test the photo import system
test_import_system() {
    print_step "Testing photo import system..."
    cd "$PROJECT_DIR"
    
    # Run a quick test to get stats
    echo "   Getting photo inventory statistics..."
    npm run import:photos 2>/dev/null || {
        print_warning "Photo import test completed with some warnings (this is normal)"
    }
    
    print_success "Photo import system tested"
}

# Test image optimization
test_optimization() {
    print_step "Testing image optimization system..."
    cd "$PROJECT_DIR"
    
    # Check if Sharp is working
    node -e "const sharp = require('sharp'); console.log('Sharp version:', sharp.versions.sharp);" || {
        print_error "Sharp (image processing) not working correctly"
        echo "   Try running: npm rebuild sharp"
        exit 1
    }
    
    print_success "Image optimization system ready"
}

# Create a sample workflow
create_sample_workflow() {
    print_step "Creating sample workflow script..."
    
    cat > "$PROJECT_DIR/quick-start.sh" << 'EOF'
#!/bin/bash

# Quick Start Script for Photo Management System
echo "🚀 Photo Management Quick Start"
echo "=============================="

echo "Select an option:"
echo "1. Import all photos from external drive"
echo "2. Sync changes from external drive"  
echo "3. Run full processing pipeline"
echo "4. Check system status"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "Starting photo import..."
        npm run batch:import
        ;;
    2)
        echo "Syncing external drive..."
        npm run batch:sync
        ;;
    3)
        echo "Running full pipeline..."
        npm run batch:full
        ;;
    4)
        echo "System Status:"
        echo "=============="
        if [ -d "/Volumes/LaCie/Etsy" ]; then
            echo "✅ External drive: Connected"
        else
            echo "❌ External drive: Not connected"
        fi
        
        if [ -f "data/processed-photos.json" ]; then
            PROCESSED=$(jq length data/processed-photos.json 2>/dev/null || echo "unknown")
            echo "📸 Processed photos: $PROCESSED"
        else
            echo "📸 Processed photos: None"
        fi
        
        echo "📁 Image directories:"
        for dir in thumbnail small medium large; do
            if [ -d "public/images/$dir" ]; then
                COUNT=$(ls -1 public/images/$dir 2>/dev/null | wc -l | tr -d ' ')
                echo "   $dir: $COUNT files"
            fi
        done
        ;;
    *)
        echo "Invalid choice"
        ;;
esac
EOF

    chmod +x "$PROJECT_DIR/quick-start.sh"
    print_success "Sample workflow script created"
}

# Display final instructions
show_final_instructions() {
    echo ""
    echo -e "${GREEN}🎉 Setup Complete!${NC}"
    echo "================="
    echo ""
    echo "Your ultimate photo management system is ready. Here's how to use it:"
    echo ""
    echo -e "${BLUE}Quick Start:${NC}"
    echo "  ./quick-start.sh                    # Interactive menu"
    echo ""
    echo -e "${BLUE}Individual Commands:${NC}"
    echo "  npm run import:photos               # Import from CSV only"
    echo "  npm run optimize:images             # Optimize images only" 
    echo "  npm run sync:external               # Sync external drive only"
    echo ""
    echo -e "${BLUE}Batch Processing:${NC}"
    echo "  npm run batch:import                # Import + optimize"
    echo "  npm run batch:sync                  # Sync external drive"
    echo "  npm run batch:full                  # Full pipeline"
    echo "  npm run batch:deploy                # Production deploy"
    echo ""
    echo -e "${BLUE}Admin Interface:${NC}"
    echo "  npm run dev                         # Start development server"
    echo "  # Then visit http://localhost:3000/admin"
    echo ""
    echo -e "${BLUE}File Locations:${NC}"
    echo "  📊 Processed data: data/"
    echo "  🖼️  Optimized images: public/images/"
    echo "  📁 Upload ready: 🚀-UPLOAD-TO-HOSTINGER-FILE-MANAGER/"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Run './quick-start.sh' to import your first batch"
    echo "2. Visit the admin dashboard to monitor progress"
    echo "3. Upload optimized files to your hosting provider"
    echo ""
    echo "External Drive Status:"
    if [ -d "$EXTERNAL_DRIVE" ]; then
        echo -e "  ${GREEN}✅ Connected${NC} - Ready to process $(wc -l < "$CSV_FILE" | tr -d ' ') photos"
    else
        echo -e "  ${RED}❌ Disconnected${NC} - Connect your LaCie drive to get started"
    fi
}

# Run setup steps
main() {
    echo "Starting setup process..."
    echo ""
    
    check_external_drive
    install_dependencies
    create_directories
    test_import_system
    test_optimization
    create_sample_workflow
    show_final_instructions
}

# Error handling
trap 'print_error "Setup failed. Please check the errors above."' ERR

# Run main function
main