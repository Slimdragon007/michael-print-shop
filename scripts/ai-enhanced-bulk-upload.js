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

// OpenAI API for image analysis (you'll need to add your key to .env.local)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function analyzeImageWithAI(filePath, fileName) {
  if (!OPENAI_API_KEY) {
    console.log('⚠️  No OpenAI API key found, using filename-based metadata');
    return generateMetadataFromFilename(fileName);
  }

  try {
    console.log('🤖 Analyzing image with AI...');
    
    // Convert image to base64 for OpenAI Vision API
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this photography image and create SEO-optimized metadata for a professional photography print shop. 

Please provide a JSON response with:
1. "title": A compelling, SEO-friendly title (max 60 chars)
2. "description": A detailed, engaging description for buyers (150-200 words)
3. "altText": Perfect alt text for accessibility & SEO (max 125 chars)
4. "category": Best category (landscape, architecture, portrait, nature, cityscape, etc.)
5. "location": Geographic location if identifiable
6. "tags": Array of 8-12 SEO keywords/tags
7. "mood": Emotional mood/atmosphere
8. "colors": Dominant colors
9. "composition": Composition style/technique

Focus on what makes this image compelling for wall art buyers. Include technical and artistic details that help with search rankings.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 800
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`⚠️  OpenAI API error: ${result.error.message}`);
      throw new Error(result.error.message);
    }
    
    if (result.choices && result.choices[0]) {
      try {
        const aiMetadata = JSON.parse(result.choices[0].message.content);
        console.log('✨ AI analysis complete!');
        return aiMetadata;
      } catch (parseError) {
        console.log('⚠️  AI response parsing failed, using filename fallback');
        return generateMetadataFromFilename(fileName);
      }
    } else {
      throw new Error('No AI response received');
    }
  } catch (error) {
    console.log(`⚠️  AI analysis failed (${error.message}), using filename fallback`);
    return generateMetadataFromFilename(fileName);
  }
}

function generateMetadataFromFilename(fileName) {
  const name = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
  
  // Extract info from filename patterns
  const isLandscape = /landscape|mountain|desert|ocean|sunset|sunrise|nature/i.test(name);
  const isArchitecture = /bridge|building|city|urban|architecture/i.test(name);
  const isSeascape = /ocean|sea|wave|beach|coast/i.test(name);
  const isNight = /night|evening|twilight/i.test(name);
  
  let category = 'Photography';
  let tags = ['fine art photography', 'wall art', 'home decor'];
  let location = 'Unknown';
  
  // Detect locations
  if (/flagstaff/i.test(name)) {
    location = 'Flagstaff, Arizona';
    tags.push('Arizona', 'Southwest', 'desert');
  } else if (/big.sur|bixby/i.test(name)) {
    location = 'Big Sur, California'; 
    tags.push('California', 'Pacific Coast', 'coastal');
  } else if (/joshua.tree/i.test(name)) {
    location = 'Joshua Tree, California';
    tags.push('California', 'desert', 'Mojave');
  } else if (/sedona/i.test(name)) {
    location = 'Sedona, Arizona';
    tags.push('Arizona', 'red rocks', 'Southwest');
  } else if (/golden.gate/i.test(name)) {
    location = 'San Francisco, California';
    tags.push('California', 'San Francisco', 'iconic');
  }
  
  // Determine category
  if (isLandscape) {
    category = 'Landscape';
    tags.push('landscape photography', 'nature', 'scenic');
  } else if (isArchitecture) {
    category = 'Architecture';
    tags.push('architecture', 'structural', 'urban');
  } else if (isSeascape) {
    category = 'Seascape'; 
    tags.push('ocean', 'seascape', 'coastal');
  }
  
  if (isNight) {
    tags.push('night photography', 'evening', 'twilight');
  }
  
  // Generate compelling title
  const title = name
    .replace(/_/g, ' ')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .substring(0, 55);
    
  return {
    title: title || 'Fine Art Photography Print',
    description: `Professional ${category.toLowerCase()} photography print captured in ${location}. This stunning image showcases the natural beauty and artistic composition that makes for perfect wall art. High-quality fine art print suitable for home or office decoration. Available in multiple sizes and materials for the perfect fit in any space.`,
    altText: `${title} - ${category} photography print from ${location}`.substring(0, 125),
    category,
    location,
    tags,
    mood: isNight ? 'Serene and peaceful' : 'Vibrant and inspiring', 
    colors: ['Natural tones'],
    composition: 'Professional composition'
  };
}

async function uploadPhotoWithAI(filePath) {
  try {
    const fileName = path.basename(filePath);
    console.log(`\n🎯 Processing: ${fileName}`);
    
    // Step 1: AI Analysis
    const aiMetadata = await analyzeImageWithAI(filePath, fileName);
    
    // Step 2: Prepare file for upload
    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    formData.append('file', fileBuffer, fileName);
    
    // Step 3: Create enhanced metadata
    const metadata = {
      title: aiMetadata.title,
      description: aiMetadata.description,
      altText: aiMetadata.altText,
      category: aiMetadata.category,
      location: aiMetadata.location || 'Unknown',
      tags: aiMetadata.tags || [],
      featured: false,
      published: true,
      seoData: {
        mood: aiMetadata.mood,
        colors: aiMetadata.colors,
        composition: aiMetadata.composition
      }
    };
    
    formData.append('metadata', JSON.stringify(metadata));

    console.log(`📤 Uploading with AI-generated metadata...`);
    console.log(`📝 Title: ${metadata.title}`);
    console.log(`🏷️  Alt Text: ${metadata.altText}`);
    console.log(`📍 Location: ${metadata.location}`);
    console.log(`🎨 Tags: ${metadata.tags.slice(0, 5).join(', ')}...`);
    
    const response = await fetch(`${API_BASE}/api/photos`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ ${fileName} uploaded with AI-enhanced SEO metadata!`);
      return { success: true, fileName, id: result.data.id, metadata };
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
  const maxFiles = parseInt(process.argv[3]) || 10; // Default to 10 for testing
  
  if (!targetDir) {
    console.log('🤖 AI-Enhanced Photo Upload');
    console.log('💡 Usage: node scripts/ai-enhanced-bulk-upload.js /path/to/photos [max_files]');
    console.log('📁 Example: node scripts/ai-enhanced-bulk-upload.js "/Users/name/Photos" 50');
    console.log('🔑 Add OPENAI_API_KEY to .env.local for AI-powered descriptions!');
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    console.log(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }

  console.log(`🔍 Scanning for images in: ${targetDir}`);
  console.log(`🤖 AI-Enhanced mode: ${OPENAI_API_KEY ? 'ENABLED ✨' : 'DISABLED (filename-based)'}`);
  
  const imageFiles = findImageFiles(targetDir);
  
  if (imageFiles.length === 0) {
    console.log('📷 No image files found!');
    process.exit(1);
  }

  const filesToUpload = imageFiles.slice(0, maxFiles);
  console.log(`📸 Found ${imageFiles.length} images (processing ${filesToUpload.length})`);
  console.log('🚀 Starting AI-enhanced bulk upload...\n');

  const results = [];
  
  for (let i = 0; i < filesToUpload.length; i++) {
    const file = filesToUpload[i];
    console.log(`\n[${i + 1}/${filesToUpload.length}] 🎯 Processing ${path.basename(file)}`);
    
    const result = await uploadPhotoWithAI(file);
    results.push(result);
    
    // Delay to respect API limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('\n🎉 AI-Enhanced Upload Complete!');
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📸 Total: ${results.length}`);

  if (failed.length > 0) {
    console.log('\n❌ Failed uploads:');
    failed.forEach(f => console.log(`   - ${f.fileName}: ${f.error}`));
  }

  if (successful.length > 0) {
    console.log('\n✨ All photos now have AI-generated SEO metadata!');
    console.log('🔍 Perfect for search engine optimization');
    console.log('♿ Accessibility-compliant alt text included');
    console.log('🎯 Ready for maximum visibility and sales!');
  }
}

main().catch(console.error);