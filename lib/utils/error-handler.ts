import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export interface ApiError {
  code: string
  message: string
  details?: any
  statusCode: number
}

export class PaymentError extends Error {
  code: string
  statusCode: number
  details?: any

  constructor(code: string, message: string, statusCode = 400, details?: any) {
    super(message)
    this.name = 'PaymentError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class ValidationError extends Error {
  code: string
  statusCode: number
  field?: string

  constructor(message: string, field?: string) {
    super(message)
    this.name = 'ValidationError'
    this.code = 'VALIDATION_ERROR'
    this.statusCode = 400
    this.field = field
  }
}

export class DatabaseError extends Error {
  code: string
  statusCode: number
  query?: string

  constructor(message: string, query?: string) {
    super(message)
    this.name = 'DatabaseError'
    this.code = 'DATABASE_ERROR'
    this.statusCode = 500
    this.query = query
  }
}

export class AuthenticationError extends Error {
  code: string
  statusCode: number

  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
    this.code = 'AUTHENTICATION_ERROR'
    this.statusCode = 401
  }
}

export class AuthorizationError extends Error {
  code: string
  statusCode: number

  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
    this.code = 'AUTHORIZATION_ERROR'
    this.statusCode = 403
  }
}

export class RateLimitError extends Error {
  code: string
  statusCode: number
  retryAfter?: number

  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(message)
    this.name = 'RateLimitError'
    this.code = 'RATE_LIMIT_ERROR'
    this.statusCode = 429
    this.retryAfter = retryAfter
  }
}

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Handle custom errors
  if (error instanceof PaymentError) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details
    }, { status: error.statusCode })
  }

  if (error instanceof ValidationError) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
      field: error.field
    }, { status: error.statusCode })
  }

  if (error instanceof DatabaseError) {
    return NextResponse.json({
      error: 'Database operation failed',
      code: error.code
    }, { status: error.statusCode })
  }

  if (error instanceof AuthenticationError) {
    return NextResponse.json({
      error: error.message,
      code: error.code
    }, { status: error.statusCode })
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json({
      error: error.message,
      code: error.code
    }, { status: error.statusCode })
  }

  if (error instanceof RateLimitError) {
    const response = NextResponse.json({
      error: error.message,
      code: error.code
    }, { status: error.statusCode })

    if (error.retryAfter) {
      response.headers.set('Retry-After', error.retryAfter.toString())
    }

    return response
  }

  // Handle Stripe errors
  if (error instanceof Stripe.errors.StripeError) {
    const statusCode = getStripeErrorStatusCode(error)
    return NextResponse.json({
      error: error.message,
      code: error.code || 'STRIPE_ERROR',
      type: error.type
    }, { status: statusCode })
  }

  // Handle standard errors
  if (error instanceof Error) {
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    return NextResponse.json({
      error: isDevelopment ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
      ...(isDevelopment && { stack: error.stack })
    }, { status: 500 })
  }

  // Unknown error type
  return NextResponse.json({
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  }, { status: 500 })
}

/**
 * Map Stripe error types to HTTP status codes
 */
function getStripeErrorStatusCode(error: Stripe.errors.StripeError): number {
  switch (error.type) {
    case 'card_error':
      return 402 // Payment required
    case 'rate_limit_error':
      return 429 // Too many requests
    case 'invalid_request_error':
      return 400 // Bad request
    case 'authentication_error':
      return 401 // Unauthorized
    case 'api_connection_error':
    case 'api_error':
    case 'idempotency_error':
    default:
      return 500 // Internal server error
  }
}

/**
 * Validate request body fields
 */
export function validateRequiredFields(body: any, requiredFields: string[]): void {
  const missingFields: string[] = []

  for (const field of requiredFields) {
    if (!body[field] || body[field] === '' || body[field] === null || body[field] === undefined) {
      missingFields.push(field)
    }
  }

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      missingFields[0]
    )
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email')
  }
}

/**
 * Validate phone number format (basic)
 */
export function validatePhone(phone: string): void {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    throw new ValidationError('Invalid phone number format', 'phone')
  }
}

/**
 * Validate monetary amount
 */
export function validateAmount(amount: number, field = 'amount'): void {
  if (typeof amount !== 'number' || amount < 0) {
    throw new ValidationError('Amount must be a non-negative number', field)
  }

  if (amount < 0.50) {
    throw new ValidationError('Amount must be at least $0.50', field)
  }

  if (amount > 999999.99) {
    throw new ValidationError('Amount exceeds maximum limit', field)
  }
}

/**
 * Validate quantity
 */
export function validateQuantity(quantity: number, field = 'quantity'): void {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new ValidationError('Quantity must be a positive integer', field)
  }

  if (quantity > 100) {
    throw new ValidationError('Quantity exceeds maximum limit (100)', field)
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength = 255): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
}

/**
 * Rate limiting helper
 */
export class RateLimit {
  private static requests = new Map<string, { count: number; resetTime: number }>()
  
  static check(identifier: string, limit: number, windowMs: number): void {
    const now = Date.now()
    const entry = this.requests.get(identifier)

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      })
      return
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      throw new RateLimitError(
        `Too many requests. Try again in ${retryAfter} seconds.`,
        retryAfter
      )
    }

    entry.count++
  }

  static reset(identifier: string): void {
    this.requests.delete(identifier)
  }

  static cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key)
      }
    }
  }
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  if (cfConnectingIP) {
    return cfConnectingIP
  }

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return 'unknown'
}