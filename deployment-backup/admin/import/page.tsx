'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { CSVImporter, ImportResult, ImportOptions } from '@/lib/csv-import'
import { Badge } from '@/components/ui/badge'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [options, setOptions] = useState<ImportOptions>({
    generateDescriptions: true,
    generateTags: true,
    createCategories: true,
    defaultCategory: 'General',
  })

  const { user } = useAuthStore()
  const router = useRouter()

  if (!user || user.role !== 'admin') {
    router.push('/')
    return null
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    setResult(null)
    setValidationErrors([])

    // Validate CSV structure
    setValidating(true)
    try {
      const importer = new CSVImporter()
      const data = await importer.parseCSV(selectedFile)
      const validation = importer.validateCSVStructure(data)
      
      if (!validation.valid) {
        setValidationErrors(validation.errors)
      }
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Failed to parse CSV'])
    } finally {
      setValidating(false)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    try {
      const importer = new CSVImporter()
      const data = await importer.parseCSV(file)
      const importResult = await importer.importProducts(data, options)
      setResult(importResult)
    } catch (error) {
      setResult({
        success: false,
        imported: 0,
        errors: [{ row: 0, error: error instanceof Error ? error.message : 'Import failed', data: {} }],
        message: 'Import failed',
      })
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = `title,description,image_url,base_price,category,tags,width,height
"Beautiful Sunset",,"https://example.com/sunset.jpg",25.00,"Landscapes","sunset,nature,sky",1920,1080
"City Skyline",,"https://example.com/city.jpg",30.00,"Urban","city,buildings,skyline",2048,1365
"Portrait Study",,"https://example.com/portrait.jpg",35.00,"Portraits","portrait,people,black and white",1200,1600`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'product-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import Products</h1>
        <p className="text-muted-foreground">
          Bulk import products from a CSV file
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Import Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload CSV File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={importing}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Upload a CSV file with product data. Maximum file size: 10MB
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Import Options */}
          <Card>
            <CardHeader>
              <CardTitle>Import Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.generateDescriptions}
                  onChange={(e) => setOptions(prev => ({ ...prev, generateDescriptions: e.target.checked }))}
                />
                <span className="text-sm">Generate descriptions with AI</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.generateTags}
                  onChange={(e) => setOptions(prev => ({ ...prev, generateTags: e.target.checked }))}
                />
                <span className="text-sm">Auto-generate tags</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.createCategories}
                  onChange={(e) => setOptions(prev => ({ ...prev, createCategories: e.target.checked }))}
                />
                <span className="text-sm">Create new categories if they don't exist</span>
              </label>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Default Category
                </label>
                <Input
                  value={options.defaultCategory || ''}
                  onChange={(e) => setOptions(prev => ({ ...prev, defaultCategory: e.target.value }))}
                  placeholder="General"
                />
              </div>
            </CardContent>
          </Card>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!file || importing || validationErrors.length > 0}
            className="w-full"
            size="lg"
          >
            {importing ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Products
              </>
            )}
          </Button>
        </div>

        {/* Status and Results */}
        <div className="space-y-6">
          {/* File Status */}
          {file && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  File Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">File:</span>
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Size:</span>
                    <span className="text-sm">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Status:</span>
                    <div className="flex items-center gap-1">
                      {validating ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span className="text-sm">Validating...</span>
                        </>
                      ) : validationErrors.length > 0 ? (
                        <>
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-destructive">Invalid</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">Valid</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Validation Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm text-destructive">
                      • {error}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {result.imported}
                    </div>
                    <div className="text-sm text-muted-foreground">Imported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-destructive">
                      {result.errors.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>

                <p className="text-sm">{result.message}</p>

                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Errors:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-sm">
                          <Badge variant="destructive" className="mr-2">
                            Row {error.row}
                          </Badge>
                          {error.error}
                        </div>
                      ))}
                      {result.errors.length > 10 && (
                        <p className="text-sm text-muted-foreground">
                          ... and {result.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CSV Format Guide */}
          <Card>
            <CardHeader>
              <CardTitle>CSV Format Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <strong>Required columns:</strong>
                  <ul className="list-disc list-inside ml-2 text-muted-foreground">
                    <li>title - Product name</li>
                    <li>image_url - Full URL to product image</li>
                    <li>base_price - Price in dollars (e.g., 25.00)</li>
                    <li>width - Image width in pixels</li>
                    <li>height - Image height in pixels</li>
                  </ul>
                </div>
                <div>
                  <strong>Optional columns:</strong>
                  <ul className="list-disc list-inside ml-2 text-muted-foreground">
                    <li>description - Product description</li>
                    <li>category - Product category</li>
                    <li>tags - Comma-separated tags</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}