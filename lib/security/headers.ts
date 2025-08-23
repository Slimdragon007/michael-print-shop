import { NextResponse } from 'next/server'

/**
 * Security headers configuration for production environments
 */
export const SECURITY_HEADERS = {
  // Content Security Policy - Tailored for e-commerce with Stripe
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),

  // HTTP Strict Transport Security
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS Protection (legacy but still useful)
  'X-XSS-Protection': '1; mode=block',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy (Feature Policy successor)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=(self)',
    'interest-cohort=()', // Disable FLoC
    'payment=(self "https://js.stripe.com" "https://checkout.stripe.com")',
    'usb=()',
    'bluetooth=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'fullscreen=(self)',
    'picture-in-picture=()',
    'screen-wake-lock=()',
    'web-share=(self)'
  ].join(', '),

  // Cross-Origin Policies
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'same-site',

  // DNS Prefetch Control
  'X-DNS-Prefetch-Control': 'off',

  // Server Information (security through obscurity)
  'Server': 'print-shop',

  // Expect-CT (Certificate Transparency)
  'Expect-CT': 'max-age=86400, enforce',

  // X-Permitted-Cross-Domain-Policies
  'X-Permitted-Cross-Domain-Policies': 'none'
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(response: NextResponse, pathname: string): void {
  // Apply all security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value)
  })

  // Context-specific headers
  if (pathname.includes('/admin')) {
    // Stricter cache control for admin pages
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    // Additional admin security
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive')
  }

  if (pathname.startsWith('/api/')) {
    // API-specific headers
    response.headers.set('Cache-Control', 'no-store, must-revalidate')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    
    // CORS headers for API
    if (pathname.startsWith('/api/webhooks')) {
      // Webhooks need specific CORS handling
      response.headers.set('Access-Control-Allow-Origin', 'https://stripe.com')
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature')
    } else {
      // General API CORS
      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
  }

  if (pathname.includes('/checkout')) {
    // Allow Stripe resources for checkout
    const checkoutCSP = SECURITY_HEADERS['Content-Security-Policy']
      .replace("frame-src 'self' https://js.stripe.com https://hooks.stripe.com", 
               "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com")
    
    response.headers.set('Content-Security-Policy', checkoutCSP)
  }
}

/**
 * Security validation for API requests
 */
export function validateApiRequest(request: Request): { valid: boolean; error?: string } {
  const userAgent = request.headers.get('user-agent')
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // Block requests without user agent (likely bots)
  if (!userAgent) {
    return { valid: false, error: 'Missing user agent' }
  }

  // Block known malicious user agents
  const maliciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zmap/i,
    /dirbuster/i,
    /gobuster/i,
    /wpscan/i,
    /<script/i,
    /javascript:/i
  ]

  if (maliciousUserAgents.some(pattern => pattern.test(userAgent))) {
    return { valid: false, error: 'Malicious user agent detected' }
  }

  // Validate origin for sensitive endpoints
  const pathname = new URL(request.url).pathname
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/checkout')) {
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
      'https://localhost:3000'
    ].filter(Boolean)

    if (origin && !allowedOrigins.includes(origin)) {
      return { valid: false, error: 'Invalid origin' }
    }
  }

  return { valid: true }
}

/**
 * Generate nonce for inline scripts (if needed)
 */
export function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Security metrics for monitoring
 */
export class SecurityMetrics {
  private static metrics = {
    blockedRequests: 0,
    rateLimitHits: 0,
    maliciousUserAgents: 0,
    cspViolations: 0,
    invalidOrigins: 0
  }

  static increment(metric: keyof typeof SecurityMetrics.metrics): void {
    this.metrics[metric]++
  }

  static getMetrics() {
    return { ...this.metrics }
  }

  static reset(): void {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key as keyof typeof this.metrics] = 0
    })
  }
}

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(event: {
  type: 'rate_limit' | 'malicious_ua' | 'invalid_origin' | 'blocked_request'
  ip: string
  userAgent?: string
  path: string
  details?: any
}): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level: 'SECURITY',
    ...event
  }

  // In production, send to logging service
  console.warn('SECURITY EVENT:', logEntry)
  
  // Update metrics
  switch (event.type) {
    case 'rate_limit':
      SecurityMetrics.increment('rateLimitHits')
      break
    case 'malicious_ua':
      SecurityMetrics.increment('maliciousUserAgents')
      break
    case 'invalid_origin':
      SecurityMetrics.increment('invalidOrigins')
      break
    case 'blocked_request':
      SecurityMetrics.increment('blockedRequests')
      break
  }
}