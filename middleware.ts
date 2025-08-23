import { NextRequest, NextResponse } from 'next/server'
import { RateLimit, getClientIP } from '@/lib/utils/error-handler'
import { applySecurityHeaders, validateApiRequest, logSecurityEvent } from '@/lib/security/headers'

export function middleware(request: NextRequest) {
  const clientIP = getClientIP(request)
  const pathname = new URL(request.url).pathname
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Validate API requests
  const validation = validateApiRequest(request)
  if (!validation.valid) {
    logSecurityEvent({
      type: 'blocked_request',
      ip: clientIP,
      userAgent,
      path: pathname,
      details: validation.error
    })
    
    return new NextResponse('Access denied', { status: 403 })
  }
  
  // Apply rate limiting to sensitive endpoints
  try {
    applyRateLimit(request)
  } catch (rateLimitError) {
    logSecurityEvent({
      type: 'rate_limit',
      ip: clientIP,
      userAgent,
      path: pathname
    })
    
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (Date.now() + 60 * 1000).toString()
      }
    })
  }

  const response = NextResponse.next()
  
  // Add comprehensive security headers
  applySecurityHeaders(response, pathname)
  
  return response
}


function applyRateLimit(request: NextRequest) {
  const clientIP = getClientIP(request)
  const pathname = new URL(request.url).pathname
  
  // Different rate limits for different endpoints
  if (pathname.startsWith('/api/checkout')) {
    // Strict rate limiting for checkout (10 requests per 15 minutes)
    RateLimit.check(`checkout:${clientIP}`, 10, 15 * 60 * 1000)
  } else if (pathname.startsWith('/api/admin')) {
    // Admin endpoints (100 requests per 10 minutes)
    RateLimit.check(`admin:${clientIP}`, 100, 10 * 60 * 1000)
  } else if (pathname.startsWith('/api/webhooks')) {
    // Webhooks (1000 requests per hour - for Stripe webhooks)
    RateLimit.check(`webhook:${clientIP}`, 1000, 60 * 60 * 1000)
  } else if (pathname.startsWith('/api/orders')) {
    // Order queries (50 requests per 5 minutes)
    RateLimit.check(`orders:${clientIP}`, 50, 5 * 60 * 1000)
  } else if (pathname.startsWith('/api/')) {
    // General API (200 requests per 10 minutes)
    RateLimit.check(`api:${clientIP}`, 200, 10 * 60 * 1000)
  }
  
  // Clean up old rate limit entries periodically
  if (Math.random() < 0.01) { // 1% chance
    RateLimit.cleanup()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}