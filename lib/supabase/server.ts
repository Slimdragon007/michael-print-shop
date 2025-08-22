// import { createServerClient } from '@supabase/ssr' // Removed for Cloudflare R2
import { cookies } from 'next/headers'
import { Database } from '@/types'

export const createServerSupabaseClient = async () => {
  // Legacy function - now returns null since we use Cloudflare R2
  return null
}