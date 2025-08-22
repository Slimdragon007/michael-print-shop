import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  
  // App Settings
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  
  // Optional Print Provider Keys
  PRINTFUL_API_KEY: z.string().optional(),
  GOOTEN_API_KEY: z.string().optional(),
  
  // Optional Email Settings
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  
  // Admin Settings
  ADMIN_EMAIL: z.string().email(),
  
  // Upload Settings
  MAX_FILE_SIZE: z.string().default('10485760'),
  ALLOWED_IMAGE_TYPES: z.string().default('image/jpeg,image/png,image/webp'),
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS: z.string().default('100'),
  RATE_LIMIT_WINDOW: z.string().default('900000'),
})

function validateEnv() {
  try {
    return envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      PRINTFUL_API_KEY: process.env.PRINTFUL_API_KEY,
      GOOTEN_API_KEY: process.env.GOOTEN_API_KEY,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      FROM_EMAIL: process.env.FROM_EMAIL,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
      ALLOWED_IMAGE_TYPES: process.env.ALLOWED_IMAGE_TYPES,
      RATE_LIMIT_REQUESTS: process.env.RATE_LIMIT_REQUESTS,
      RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
    })
  } catch (error) {
    console.error('Environment validation failed:', error)
    throw new Error('Invalid environment configuration')
  }
}

export const env = validateEnv()

// Helper functions for environment variables
export const getMaxFileSize = () => parseInt(env.MAX_FILE_SIZE)
export const getAllowedImageTypes = () => env.ALLOWED_IMAGE_TYPES.split(',')
export const getRateLimit = () => ({
  requests: parseInt(env.RATE_LIMIT_REQUESTS),
  window: parseInt(env.RATE_LIMIT_WINDOW),
})

// Check if optional features are enabled
export const isEmailEnabled = () => !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
export const isPrintfulEnabled = () => !!env.PRINTFUL_API_KEY
export const isGootenEnabled = () => !!env.GOOTEN_API_KEY