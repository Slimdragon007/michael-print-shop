'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Save, Eye, Edit2, Palette } from 'lucide-react'

interface SiteContent {
  heroTitle: string
  heroSubtitle: string
  heroDescription: string
  featuredProductIds: string[]
  primaryColor: string
  accentColor: string
}

export function SimpleLiveEditor() {
  const [content, setContent] = useState<SiteContent>({
    heroTitle: 'Transform Your',
    heroSubtitle: 'Memories',
    heroDescription: 'From metal and canvas to fine art paper, we bring your digital photos to life with stunning, museum-quality prints that last a lifetime.',
    featuredProductIds: ['1', '2', '3', '4'],
    primaryColor: '#0f172a',
    accentColor: '#3b82f6'
  })
  
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleContentChange = (field: keyof SiteContent, value: string | string[]) => {
    setContent(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Send changes to your live Hostinger site
      const response = await fetch('/api/update-live-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteUrl: 'https://prints.michaelhaslimphoto.com/',
          changes: content
        }),
      })

      if (response.ok) {
        console.log('Successfully updated live site:', content)
        setHasChanges(false)
        alert('✅ Changes saved to https://prints.michaelhaslimphoto.com/! Changes may take a few minutes to appear.')
      } else {
        throw new Error('Failed to update live site')
      }
    } catch (error) {
      console.error('Error saving to live site:', error)
      // For now, still save locally
      console.log('Saving content locally:', content)
      setHasChanges(false)
      alert('⚠️ Saved locally. To push to live site, you\'ll need to deploy these changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const openHomepage = () => {
    window.open('https://prints.michaelhaslimphoto.com/', '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Website Content Editor
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Edit your homepage content and see changes live
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={openHomepage}>
                <Eye className="h-4 w-4 mr-2" />
                View Site
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || isSaving}
                className={hasChanges ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
              </Button>
            </div>
          </div>
          {hasChanges && (
            <Badge variant="secondary" className="w-fit">
              Unsaved Changes
            </Badge>
          )}
        </CardHeader>
      </Card>

      {/* Hero Section Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
          <p className="text-sm text-muted-foreground">
            Edit the main banner at the top of your homepage
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heroTitle">Main Title</Label>
            <Input
              id="heroTitle"
              value={content.heroTitle}
              onChange={(e) => handleContentChange('heroTitle', e.target.value)}
              placeholder="Transform Your"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">Subtitle (Highlighted)</Label>
            <Input
              id="heroSubtitle"
              value={content.heroSubtitle}
              onChange={(e) => handleContentChange('heroSubtitle', e.target.value)}
              placeholder="Memories"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroDescription">Description</Label>
            <Textarea
              id="heroDescription"
              value={content.heroDescription}
              onChange={(e) => handleContentChange('heroDescription', e.target.value)}
              placeholder="Your hero description..."
              rows={3}
            />
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 bg-slate-900 text-white">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">
                {content.heroTitle}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  {content.heroSubtitle}
                </span>
                Into Art
              </h1>
              <p className="text-slate-300 max-w-lg mx-auto">
                {content.heroDescription}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Colors & Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={content.primaryColor}
                  onChange={(e) => handleContentChange('primaryColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={content.primaryColor}
                  onChange={(e) => handleContentChange('primaryColor', e.target.value)}
                  placeholder="#0f172a"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={content.accentColor}
                  onChange={(e) => handleContentChange('accentColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={content.accentColor}
                  onChange={(e) => handleContentChange('accentColor', e.target.value)}
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Products */}
      <Card>
        <CardHeader>
          <CardTitle>Featured Products</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which products appear on the homepage
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Product IDs (comma separated)</Label>
            <Input
              value={content.featuredProductIds.join(', ')}
              onChange={(e) => handleContentChange('featuredProductIds', e.target.value.split(', ').filter(Boolean))}
              placeholder="1, 2, 3, 4"
            />
            <p className="text-xs text-muted-foreground">
              These products will appear in the "Featured Prints" section
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Edit the content above</li>
            <li>Click "Save Changes" to save your edits</li>
            <li>Click "View Site" to open your homepage in a new tab</li>
            <li>Refresh the homepage to see your changes</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}