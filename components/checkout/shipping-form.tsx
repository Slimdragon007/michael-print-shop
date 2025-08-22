'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Truck } from 'lucide-react'

interface ShippingInfo {
  firstName: string
  lastName: string
  email: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
}

interface ShippingFormProps {
  onSubmit: (info: ShippingInfo) => void
  isLoading?: boolean
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export function ShippingForm({ onSubmit, isLoading = false }: ShippingFormProps) {
  const [formData, setFormData] = useState<ShippingInfo>({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  })

  const [errors, setErrors] = useState<Partial<ShippingInfo>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<ShippingInfo> = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    if (!formData.address.trim()) newErrors.address = 'Address is required'
    if (!formData.city.trim()) newErrors.city = 'City is required'
    if (!formData.state) newErrors.state = 'State is required'
    if (!formData.postalCode.trim()) newErrors.postalCode = 'Postal code is required'
    else if (!/^\d{5}(-\d{4})?$/.test(formData.postalCode)) {
      newErrors.postalCode = 'Invalid postal code format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleInputChange = (field: keyof ShippingInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Shipping Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={errors.firstName ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={errors.lastName ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className={errors.address ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address}</p>
            )}
          </div>

          {/* City, State, Postal Code */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={errors.city ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => handleInputChange('state', value)}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-sm text-red-500">{errors.state}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">ZIP Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                className={errors.postalCode ? 'border-red-500' : ''}
                disabled={isLoading}
                placeholder="12345"
              />
              {errors.postalCode && (
                <p className="text-sm text-red-500">{errors.postalCode}</p>
              )}
            </div>
          </div>

          {/* Country (fixed to US for now) */}
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select value={formData.country} disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Continue to Payment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}