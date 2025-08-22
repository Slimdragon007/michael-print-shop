'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { useAuthStore } from '@/store/auth-store'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuthStore()

  useEffect(() => {
    // Redirect if user is already authenticated
    if (user && !loading) {
      const redirectTo = searchParams.get('redirect') || '/'
      router.push(redirectTo)
    }
  }, [user, loading, router, searchParams])

  useEffect(() => {
    // Set mode based on URL parameter
    const modeParam = searchParams.get('mode')
    if (modeParam === 'signup') {
      setMode('signup')
    }
  }, [searchParams])

  const redirectTo = searchParams.get('redirect') || '/'

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="max-w-md mx-auto">
        <AuthForm
          mode={mode}
          onModeChange={setMode}
          redirectTo={redirectTo}
        />
      </div>
    </div>
  )
}