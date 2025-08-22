import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Package, Truck, Mail, Calendar } from 'lucide-react'
import Link from 'next/link'

function OrderConfirmationContent() {
  // In a real app, you would fetch the order details using the order ID from the URL
  // For now, we'll show a generic confirmation page
  
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-900 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. Your order has been successfully placed.
          </p>
        </div>

        {/* Order Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Order Number:</span>
              <Badge variant="secondary">#ORDER-12345</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status:</span>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                Confirmed
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total:</span>
              <span className="font-semibold">$127.99</span>
            </div>
          </CardContent>
        </Card>

        {/* What's Next */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Email Confirmation</h4>
                <p className="text-sm text-muted-foreground">
                  You'll receive an email confirmation shortly with your order details and receipt.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Package className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium">Processing</h4>
                <p className="text-sm text-muted-foreground">
                  Your prints will be processed and prepared for shipping within 1-2 business days.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Truck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Shipping</h4>
                <p className="text-sm text-muted-foreground">
                  Once shipped, you'll receive a tracking number via email. Standard shipping takes 5-7 business days.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium">Estimated Delivery</h4>
                <p className="text-sm text-muted-foreground">
                  Your order should arrive between <strong>December 22-29, 2024</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild className="flex-1">
            <Link href="/products">
              Continue Shopping
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href="/">
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Support */}
        <div className="mt-8 p-4 bg-muted rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            Questions about your order? Contact us at{' '}
            <a href="mailto:support@prints.michaelhaslimphoto.com" className="text-primary hover:underline">
              support@prints.michaelhaslimphoto.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading order confirmation...</p>
        </div>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  )
}