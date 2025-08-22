'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface AuthFormData {
  email: string
  password: string
  confirmPassword?: string
  fullName?: string
}

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onModeChange: (mode: 'signin' | 'signup') => void
  redirectTo?: string
}

export function AuthForm({ mode, onModeChange, redirectTo = '/' }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const { signIn, signUp } = useAuthStore()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthFormData>()

  const isSignUp = mode === 'signup'
  const password = watch('password')

  const onSubmit = async (data: AuthFormData) => {
    try {
      setIsLoading(true)
      setError('')

      if (isSignUp) {
        await signUp(data.email, data.password, data.fullName)
      } else {
        await signIn(data.email, data.password)
      }

      router.push(redirectTo)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {isSignUp ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
          {isSignUp ? 'Create Account' : 'Sign In'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Full Name (Sign Up only) */}
          {isSignUp && (
            <div>
              <label htmlFor="fullName" className="text-sm font-medium mb-1 block">
                Full Name
              </label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                {...register('fullName', {
                  required: isSignUp ? 'Full name is required' : false,
                })}
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>
              )}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="text-sm font-medium mb-1 block">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address',
                },
              })}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="text-sm font-medium mb-1 block">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password (Sign Up only) */}
          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium mb-1 block">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  })}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              <>
                {isSignUp ? <UserPlus className="h-4 w-4 mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </>
            )}
          </Button>

          {/* Mode Switch */}
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => onModeChange(isSignUp ? 'signin' : 'signup')}
              disabled={isLoading}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}