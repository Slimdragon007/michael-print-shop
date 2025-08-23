#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { default: fetch } = require('node-fetch');

async function testUpload() {
  try {
    console.log('🧪 Testing single file upload...');
    
    // Test with a simple HTTP request first
    const API_BASE = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://example.com');
    const response = await fetch(`${API_BASE}/api/health`);
    const result = await response.json();
    
    console.log('✅ API is reachable:', result.status);
    
    // Use a specific test image we know exists
    const testFile = '/Users/michaelhaslim/Library/Mobile Documents/com~apple~CloudDocs/Etsy_Listing_Photos_BACKUP_2025-08-13/Accounting/Business Receipts (non biz card)/August 2021 Expenses & Statements/Amazon Lens invoice.jpg';
    const imageFile = path.basename(testFile);
    
    if (!imageFile) {
      console.log('❌ No test image found');
      return;
    }
    
    console.log(`📤 Testing upload with: ${imageFile}`);
    
    const filePath = testFile;
    const fileBuffer = fs.readFileSync(filePath);
    
    const formData = new FormData();
    formData.append('file', fileBuffer, imageFile);
    formData.append('metadata', JSON.stringify({
      title: 'Test Upload',
      description: 'Testing bulk upload script',
      category: 'Test',
      location: 'Unknown',
      tags: ['test'],
      featured: false,
      published: true
    }));

    const uploadResponse = await fetch(`${API_BASE}/api/photos`, {
      method: 'POST',
      body: formData
    });

    const uploadResult = await uploadResponse.json();
    console.log('📊 Upload result:', uploadResult);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUpload();