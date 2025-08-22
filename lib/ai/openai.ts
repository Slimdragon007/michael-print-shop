import OpenAI from 'openai'
import { env } from '@/lib/env'
import { AIProductSuggestion } from '@/types'

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

export class AIService {
  async generateProductDescription(title: string, category: string, tags: string[] = []): Promise<string> {
    try {
      const prompt = `Generate a compelling product description for a photo print titled "${title}" in the ${category} category. ${tags.length > 0 ? `Related themes: ${tags.join(', ')}.` : ''} The description should be 2-3 sentences, highlight the visual appeal and printing quality, and make customers want to buy it.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copywriter specializing in photo printing and wall art. Write compelling product descriptions that emphasize visual impact, quality, and emotional appeal.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      })

      return completion.choices[0]?.message?.content?.trim() || ''
    } catch (error) {
      console.error('Error generating product description:', error)
      throw new Error('Failed to generate product description')
    }
  }

  async generateProductTags(title: string, description: string, category: string): Promise<string[]> {
    try {
      const prompt = `Generate 5-8 relevant tags for a photo print with the following details:
Title: ${title}
Description: ${description}
Category: ${category}

Return only the tags as a comma-separated list. Focus on visual elements, style, mood, and potential use cases.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in photo categorization and tagging. Generate relevant, searchable tags that customers would use to find photos.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.5,
      })

      const response = completion.choices[0]?.message?.content?.trim() || ''
      return response.split(',').map(tag => tag.trim()).filter(Boolean)
    } catch (error) {
      console.error('Error generating product tags:', error)
      throw new Error('Failed to generate product tags')
    }
  }

  async categorizePrint(title: string, description: string): Promise<string> {
    try {
      const availableCategories = [
        'Landscapes',
        'Portraits',
        'Abstract',
        'Nature',
        'Urban',
        'Black & White',
        'Animals',
        'Architecture',
        'Travel',
        'Sports',
        'Fine Art',
        'Wedding',
        'Family',
        'Still Life'
      ]

      const prompt = `Categorize this photo print into one of the following categories: ${availableCategories.join(', ')}.

Title: ${title}
Description: ${description}

Return only the category name that best fits this image.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert photo curator. Categorize photos based on their content and style.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 50,
        temperature: 0.3,
      })

      const category = completion.choices[0]?.message?.content?.trim() || 'General'
      
      // Validate the category is in our list
      if (availableCategories.includes(category)) {
        return category
      }
      
      return 'General'
    } catch (error) {
      console.error('Error categorizing print:', error)
      return 'General'
    }
  }

  async generateProductSuggestions(imageUrl: string): Promise<AIProductSuggestion> {
    try {
      const prompt = `Analyze this image and suggest product details for a photo print:

Image URL: ${imageUrl}

Provide:
1. A compelling title (5-8 words)
2. A 2-3 sentence description
3. 5-7 relevant tags
4. The most appropriate category

Format your response as JSON with keys: title, description, tags (array), category.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert photo analyst and copywriter. Analyze images and create compelling product information for photo prints.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      })

      const response = completion.choices[0]?.message?.content?.trim() || ''
      
      try {
        const parsed = JSON.parse(response)
        return {
          title: parsed.title || 'Untitled Print',
          description: parsed.description || 'Beautiful photo print',
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          category: parsed.category || 'General',
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError)
        return {
          title: 'Untitled Print',
          description: 'Beautiful photo print',
          tags: [],
          category: 'General',
        }
      }
    } catch (error) {
      console.error('Error generating product suggestions:', error)
      throw new Error('Failed to analyze image')
    }
  }

  async improvePrintDescription(currentDescription: string, title: string, category: string): Promise<string> {
    try {
      const prompt = `Improve this product description for a photo print:

Current description: "${currentDescription}"
Title: ${title}
Category: ${category}

Make it more compelling, professional, and sales-focused while keeping it concise (2-3 sentences). Focus on visual appeal, quality, and emotional impact.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copywriter specializing in luxury photo prints and wall art. Improve product descriptions to be more compelling and sales-focused.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      })

      return completion.choices[0]?.message?.content?.trim() || currentDescription
    } catch (error) {
      console.error('Error improving description:', error)
      return currentDescription
    }
  }

  async generateAltText(title: string, description: string): Promise<string> {
    try {
      const prompt = `Generate SEO-optimized alt text for an image based on:
Title: ${title}
Description: ${description}

The alt text should be descriptive, concise (under 125 characters), and good for SEO. Focus on what's visually in the image.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert. Generate descriptive, concise alt text for images that improves accessibility and search rankings.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 50,
        temperature: 0.5,
      })

      return completion.choices[0]?.message?.content?.trim() || title
    } catch (error) {
      console.error('Error generating alt text:', error)
      return title
    }
  }
}