import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, ArrowLeft, Home } from 'lucide-react'

export default function ProductNotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-md mx-auto text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Product Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Sorry, we couldn't find the product you're looking for. It may have been moved or is no longer available.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/products">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Browse Products
              </Link>
            </Button>
            <Button asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}