import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductImageGallery } from '@/components/product/product-image-gallery'
import { ProductPrintOptions } from '@/components/product/product-print-options'
import { AddToCartButton } from '@/components/cart/add-to-cart-button'
import { WishlistButton } from '@/components/ui/wishlist-button'
import { getAllMockProducts } from '@/lib/mock-products'
import { hostingerAPI } from '@/lib/hostinger-api'
import { Share2, Ruler, Truck, Shield, Heart } from 'lucide-react'

interface ProductPageProps {
  params: {
    id: string
  }
}

async function getProduct(id: string) {
  try {
    // Get hybrid product list (Etsy + Hostinger)
    const etsyProducts = getAllMockProducts()
    
    // Try to get Hostinger products, but fall back to just Etsy if it fails
    let allProducts = etsyProducts
    try {
      const hybridProducts = await hostingerAPI.createHybridProductList(etsyProducts)
      allProducts = hybridProducts
    } catch (hostingerError) {
      console.warn('Failed to get Hostinger products, using only Etsy products:', hostingerError)
    }
    
    // Find the specific product
    const product = allProducts.find(p => p.id === id)
    
    if (!product) {
      return null
    }
    
    return product
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

// Disable static generation for now - use dynamic rendering
export const dynamic = 'force-dynamic'

// export async function generateStaticParams() {
//   try {
//     // Just use mock products for static generation to avoid build issues
//     const etsyProducts = getAllMockProducts()
    
//     return etsyProducts.map((product) => ({
//       id: product.id,
//     }))
//   } catch (error) {
//     console.error('Error generating static params:', error)
//     return []
//   }
// }

export async function generateMetadata({ params }: ProductPageProps) {
  const product = await getProduct(params.id)
  
  if (!product) {
    return {
      title: 'Product Not Found - Michael Haslim Photography',
    }
  }
  
  return {
    title: `${product.title} - Michael Haslim Photography`,
    description: product.description,
    keywords: product.tags?.join(', '),
    openGraph: {
      title: product.title,
      description: product.description,
      images: [product.image_url],
      type: 'product',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: product.description,
      images: [product.image_url],
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct(params.id)
  
  if (!product) {
    notFound()
  }
  
  const categoryName = typeof product.category === 'string' 
    ? product.category 
    : product.category.name
  
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: categoryName, href: `/products?category=${categoryName.toLowerCase()}` },
    { label: product.title, href: `/products/${product.id}` },
  ]
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      <div className="grid lg:grid-cols-2 gap-8 mt-6">
        {/* Product Images */}
        <div className="space-y-4">
          <ProductImageGallery 
            images={[
              {
                src: product.image_url,
                alt: product.title,
                width: product.dimensions?.width || 800,
                height: product.dimensions?.height || 600
              }
            ]}
          />
        </div>
        
        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{categoryName}</Badge>
              {product.tags?.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
            
            <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl font-bold">${product.base_price}</span>
              <div className="flex items-center gap-2">
                <WishlistButton productId={product.id} />
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
            
            <p className="text-muted-foreground text-lg leading-relaxed">
              {product.description}
            </p>
          </div>
          
          {/* Print Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Print Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductPrintOptions 
                options={product.print_options || []}
                basePrice={product.base_price}
              />
            </CardContent>
          </Card>
          
          {/* Add to Cart */}
          <div className="space-y-4">
            <AddToCartButton 
              product={product}
              className="w-full"
              size="lg"
            />
            
            <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Free shipping
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Quality guarantee
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Made to order
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Product Details Tabs */}
      <div className="mt-12">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
            <TabsTrigger value="care">Care</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Image Details</h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt>Dimensions:</dt>
                        <dd>{product.dimensions?.width || 'N/A'} x {product.dimensions?.height || 'N/A'} px</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Category:</dt>
                        <dd>{categoryName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Tags:</dt>
                        <dd>{product.tags?.join(', ') || 'None'}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3">Print Information</h3>
                    <p className="text-sm text-muted-foreground">
                      This photograph is printed on premium materials using professional-grade equipment. 
                      Each print is carefully inspected for quality before shipping.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="materials" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Fine Art Paper</h3>
                    <p className="text-sm text-muted-foreground">
                      Museum-quality archival paper with a smooth matte finish. Acid-free and lignin-free for long-lasting prints.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Metal Prints</h3>
                    <p className="text-sm text-muted-foreground">
                      Vibrant aluminum prints with incredible detail and color saturation. Scratch-resistant and waterproof.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Canvas</h3>
                    <p className="text-sm text-muted-foreground">
                      Gallery-wrapped canvas with a textured finish. Ready to hang with included mounting hardware.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="shipping" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Processing Time</h3>
                    <p className="text-sm text-muted-foreground">
                      Orders are typically processed within 2-3 business days. Custom sizes may take longer.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Shipping Options</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Standard Shipping: 5-7 business days</li>
                      <li>• Express Shipping: 2-3 business days</li>
                      <li>• Overnight Shipping: 1 business day</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Free Shipping</h3>
                    <p className="text-sm text-muted-foreground">
                      Free standard shipping on orders over $50 within the continental US.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="care" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Display Care</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Avoid direct sunlight to prevent fading</li>
                      <li>• Handle with clean, dry hands</li>
                      <li>• Store in a cool, dry place</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Cleaning</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Dust gently with a soft, lint-free cloth</li>
                      <li>• For metal prints, use a damp cloth if needed</li>
                      <li>• Never use harsh chemicals or abrasives</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}