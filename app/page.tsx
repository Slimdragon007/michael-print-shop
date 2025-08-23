import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Star, Truck, Shield, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProductGrid } from '@/components/product/product-grid'
import { getMockFeaturedProducts, getAllMockProducts } from '@/lib/mock-products'
import { hostingerAPI } from '@/lib/hostinger-api'

async function getFeaturedProducts() {
  // For now, use mock data during build and let client-side handle real photos
  // This prevents build-time fetch errors
  if (process.env.NODE_ENV !== 'development') {
    return getMockFeaturedProducts(8)
  }
  
  try {
    // Only fetch in development
    const apiUrl = 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/api/photos`, {
      cache: 'no-store'
    })
    const result = await response.json()
    
    if (result.success && result.data.length > 0) {
      // Convert photos to product format and return first 8 as featured
      return result.data.slice(0, 8).map((photo: any) => ({
        id: photo.id,
        title: photo.title,
        category: photo.category,
        location: photo.location,
        tags: photo.tags,
        basePrice: photo.basePrice || 545,
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl,
        metadata: photo.metadata
      }))
    }
    
    return getMockFeaturedProducts(8)
  } catch (error) {
    console.error('Error fetching featured products:', error)
    return getMockFeaturedProducts(8)
  }
}

export default async function Home() {
  const featuredProducts = await getFeaturedProducts()

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-10" />
        <div className="container mx-auto px-4 py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="bg-white/10 text-white">
                  Professional Quality Prints
                </Badge>
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  Transform Your
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    Memories
                  </span>
                  Into Art
                </h1>
                <p className="text-xl text-slate-300 max-w-lg">
                  From metal and canvas to fine art paper, we bring your digital photos to life with stunning, museum-quality prints that last a lifetime.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100" asChild>
                  <Link href="/products">
                    Shop Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-slate-900">
                  View Gallery
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-8">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-slate-600 border-2 border-white" />
                    ))}
                  </div>
                  <span className="text-sm text-slate-300">10,000+ happy customers</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-sm text-slate-300 ml-2">4.9/5 rating</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="aspect-square rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-1">
                    <div className="w-full h-full rounded-xl bg-slate-200" />
                  </div>
                  <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 p-1">
                    <div className="w-full h-full rounded-xl bg-slate-200" />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-1">
                    <div className="w-full h-full rounded-xl bg-slate-200" />
                  </div>
                  <div className="aspect-square rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-1">
                    <div className="w-full h-full rounded-xl bg-slate-200" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold">Why Choose PrintShop?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're committed to delivering exceptional quality and service with every order
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Premium Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Museum-quality prints using the finest materials and latest printing technology
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Fast Shipping</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Free shipping on orders over $50. Most orders ship within 2-3 business days
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>100% Guarantee ✓</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Not satisfied? We'll reprint or refund your order, no questions asked
                {/* Test: GitHub + Vercel auto-deployment working! */}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>Expert Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Our print specialists are here to help you choose the perfect options
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-2">Featured Prints</h2>
            <p className="text-muted-foreground">
              Discover our most popular and stunning photo prints
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/products">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {featuredProducts.length > 0 ? (
          <ProductGrid products={featuredProducts} showWishlist={true} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Featured products will appear here once added.</p>
            <Button className="mt-4" asChild>
              <Link href="/products">Browse All Products</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Print Materials */}
      <section className="bg-slate-50">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold">Choose Your Material</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each material offers a unique look and feel to showcase your photos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-slate-400 to-slate-600" />
              <CardHeader>
                <CardTitle>Metal Prints</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Vibrant colors and incredible detail on aluminum substrate
                </p>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Scratch and fade resistant</li>
                  <li>• Modern, sleek appearance</li>
                  <li>• Ready to hang</li>
                </ul>
                <Button className="w-full mt-4" variant="outline" asChild>
                  <Link href="/products?material=metal">View Metal Prints</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-amber-400 to-orange-600" />
              <CardHeader>
                <CardTitle>Canvas Prints</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gallery-wrapped canvas with rich, textured finish
                </p>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Museum-quality canvas</li>
                  <li>• Gallery-wrapped edges</li>
                  <li>• Classic, timeless look</li>
                </ul>
                <Button className="w-full mt-4" variant="outline" asChild>
                  <Link href="/products?material=canvas">View Canvas Prints</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-blue-400 to-purple-600" />
              <CardHeader>
                <CardTitle>Fine Art Paper</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Professional archival paper for gallery-quality prints
                </p>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Archival, acid-free paper</li>
                  <li>• Rich, deep colors</li>
                  <li>• Professional framing ready</li>
                </ul>
                <Button className="w-full mt-4" variant="outline" asChild>
                  <Link href="/products?material=fine-art-paper">View Paper Prints</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 lg:p-16 text-white text-center">
          <h2 className="text-3xl lg:text-5xl font-bold mb-4">
            Ready to Print Your Memories?
          </h2>
          <p className="text-lg lg:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Upload your photos and let us transform them into stunning wall art that you'll cherish forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50" asChild>
              <Link href="/products">
                Start Printing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              View Samples
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
