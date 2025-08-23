#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { default: fetch } = require('node-fetch');

// Load environment variables
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

async function uploadPhoto(filePath) {
  try {
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fileBuffer, fileName);
    
    // Basic metadata from filename
    const metadata = {
      title: fileName.replace(/\.[^/.]+$/, ""), // Remove extension
      description: `Uploaded photo: ${fileName}`,
      category: 'Photography',
      location: 'Unknown',
      tags: ['uploaded', 'bulk-import'],
      featured: false,
      published: true
    };
    formData.append('metadata', JSON.stringify(metadata));

    console.log(`📤 Uploading ${fileName}...`);
    
    const response = await fetch(`${API_BASE}/api/photos`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ ${fileName} uploaded successfully! ID: ${result.data.id}`);
      return { success: true, fileName, id: result.data.id };
    } else {
      console.log(`❌ ${fileName} failed: ${result.message || result.error}`);
      return { success: false, fileName, error: result.message || result.error };
    }
  } catch (error) {
    const fileName = path.basename(filePath);
    console.log(`❌ ${fileName} error: ${error.message}`);
    return { success: false, fileName, error: error.message };
  }
}

function findImageFiles(dir) {
  const files = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip hidden directories and common non-image folders
        if (!item.startsWith('.') && !['node_modules', 'thumbnails', 'cache'].includes(item)) {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scanDirectory(dir);
  return files;
}

async function main() {
  const targetDir = process.argv[2];
  
  if (!targetDir) {
    console.log('💡 Usage: node scripts/bulk-upload-photos.js /path/to/your/photos');
    console.log('📁 Example: node scripts/bulk-upload-photos.js "/Users/yourname/Photos/Wedding"');
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    console.log(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }

  console.log(`🔍 Scanning for images in: ${targetDir}`);
  const imageFiles = findImageFiles(targetDir);
  
  if (imageFiles.length === 0) {
    console.log('📷 No image files found! Supported formats: JPG, JPEG, PNG, WebP');
    process.exit(1);
  }

  console.log(`📸 Found ${imageFiles.length} image files`);
  console.log('🚀 Starting bulk upload...\n');

  const results = [];
  
  // Upload all files
  const filesToUpload = imageFiles;
  
  for (let i = 0; i < filesToUpload.length; i++) {
    const file = filesToUpload[i];
    console.log(`[${i + 1}/${filesToUpload.length}] Processing ${path.basename(file)}`);
    
    const result = await uploadPhoto(file);
    results.push(result);
    
    // Small delay to not overwhelm the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('\n📊 Upload Summary:');
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📸 Total: ${results.length}`);

  if (failed.length > 0) {
    console.log('\n❌ Failed uploads:');
    failed.forEach(f => console.log(`   - ${f.fileName}: ${f.error}`));
  }

  console.log('\n🎉 Bulk upload complete!');
}

main().catch(console.error);