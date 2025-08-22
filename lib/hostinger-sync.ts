// Sync manager for updating your Hostinger website from the admin dashboard

export interface HostingerUpdatePayload {
  action: 'update_product' | 'add_product' | 'reorder_products' | 'update_featured'
  data: any
}

export class HostingerSync {
  private baseUrl = 'https://prints.michaelhaslimphoto.com'
  
  // Generate JavaScript code to update the Hostinger site
  generateProductsJS(products: any[]): string {
    const hostingerProducts = products.map(product => {
      // Convert our format back to Hostinger format
      if (product.id.startsWith('h_')) {
        // This is already a Hostinger product, keep original format
        return this.convertToHostingerFormat(product)
      } else {
        // This is an Etsy product, add to Hostinger
        return this.convertEtsyToHostingerFormat(product)
      }
    }).filter(Boolean)
    
    return `// Auto-generated products array - Updated ${new Date().toISOString()}
const products = ${JSON.stringify(hostingerProducts, null, 2)};

// Auto-update collections based on new products
const collections = {
  all: products,
  bestsellers: products.filter(p => p.bestseller),
  landscape: products.filter(p => p.category === 'landscape'),
  seascape: products.filter(p => p.category === 'seascape'),
  maui: products.filter(p => p.location === 'maui'),
  bigisland: products.filter(p => p.location === 'bigisland'),
  california: products.filter(p => p.tags && p.tags.includes('california')),
  architecture: products.filter(p => p.category === 'architecture')
};`
  }
  
  private convertToHostingerFormat(product: any) {
    return {
      id: parseInt(product.id.replace('h_', '')),
      title: product.title,
      location: this.extractLocation(product.tags),
      category: typeof product.category === 'string' ? product.category : product.category.name.toLowerCase(),
      price: product.base_price,
      description: product.description,
      imageUrl: product.image_url,
      sizes: this.convertPrintOptionsToSizes(product.print_options),
      bestseller: product.is_featured || false,
      limited: false,
      tags: product.tags
    }
  }
  
  private convertEtsyToHostingerFormat(product: any) {
    return {
      id: parseInt(product.id) + 1000, // Offset Etsy IDs to avoid conflicts
      title: product.title,
      location: this.extractLocation(product.tags),
      category: typeof product.category === 'string' ? product.category : product.category.name.toLowerCase(),
      price: product.base_price,
      description: product.description,
      imageUrl: product.image_url,
      sizes: this.convertPrintOptionsToSizes(product.print_options),
      bestseller: product.is_featured || false,
      limited: false,
      tags: [...product.tags, 'etsy-import']
    }
  }
  
  private extractLocation(tags: string[]): string {
    const locationTags = ['maui', 'bigisland', 'california', 'arizona', 'hawaii']
    const found = tags.find(tag => locationTags.includes(tag.toLowerCase()))
    return found || 'other'
  }
  
  private convertPrintOptionsToSizes(printOptions: any[]): Record<string, number> {
    const sizes: Record<string, number> = {}
    
    if (printOptions && printOptions.length > 0) {
      printOptions.forEach(option => {
        sizes[option.size] = option.price_modifier + 65 // Base price assumption
      })
    } else {
      // Default sizes
      sizes['8x10'] = 65
      sizes['11x14'] = 85
      sizes['16x20'] = 125
    }
    
    return sizes
  }
  
  // Generate deployment instructions
  generateDeploymentInstructions(updatedJS: string): string {
    return `
# Hostinger Website Update Instructions

## 📁 Files to Update:
1. Update the products array in your main JavaScript file
2. Replace the existing products array with the generated code below

## 🔄 Generated JavaScript:
\`\`\`javascript
${updatedJS}
\`\`\`

## 📤 Deployment Steps:
1. Copy the generated JavaScript above
2. Log into your Hostinger file manager
3. Navigate to your website's JavaScript file
4. Replace the existing \`const products = [...]\` array
5. Save the file
6. Your website will automatically update with the new products!

## ✅ What This Update Includes:
- All your Etsy photos integrated into the Hostinger site
- Updated collections and filtering
- Maintained all existing Hawaii photos
- Preserved your site's functionality
- Added new categories from your Etsy collection

## 🎯 Result:
Your prints.michaelhaslimphoto.com site will now show both:
- Original Hawaii photography collection
- New Etsy collection (Big Sur, Golden Gate, etc.)
`
  }
  
  // Create a downloadable update file
  generateUpdateFile(products: any[]): { filename: string, content: string } {
    const updatedJS = this.generateProductsJS(products)
    const instructions = this.generateDeploymentInstructions(updatedJS)
    
    return {
      filename: `hostinger-update-${new Date().toISOString().split('T')[0]}.js`,
      content: updatedJS
    }
  }
}

export const hostingerSync = new HostingerSync()