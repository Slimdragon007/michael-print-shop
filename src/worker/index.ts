/**
 * Cloudflare Worker for Print Shop Image CDN
 * Serves optimized images from R2 with on-the-fly transformations
 */

interface Env {
  R2: R2Bucket;
  ASSETS?: Fetcher;
  ENVIRONMENT: string;
  CDN_BASE_URL: string;
}

interface ImageParams {
  w?: number;
  h?: number;
  q?: number;
  fmt?: 'webp' | 'avif' | 'jpeg' | 'png';
}

const SUPPORTED_FORMATS = ['webp', 'avif', 'jpeg', 'png', 'jpg'];
const DEFAULT_QUALITY = 80;
const MAX_WIDTH = 2400;
const MAX_HEIGHT = 2400;

// Cache settings
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days
const BROWSER_CACHE_TTL = 60 * 60 * 24; // 1 day
const STALE_WHILE_REVALIDATE = 60 * 60 * 24; // 1 day

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      // Only handle GET requests
      if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
      }

      // Extract image key from pathname
      const key = url.pathname.slice(1); // Remove leading slash
      
      if (!key) {
        return new Response('Missing image key', { status: 400 });
      }

      // Parse query parameters
      const params = parseImageParams(url.searchParams);
      if (!params) {
        return new Response('Invalid parameters', { status: 400 });
      }

      // Try to get from cache first
      const cacheKey = new Request(`${request.url}`, request);
      const cache = caches.default;
      let response = await cache.match(cacheKey);

      if (response) {
        // Add cache hit header
        response = new Response(response.body, response);
        response.headers.set('CF-Cache-Status', 'HIT');
        return response;
      }

      // Try to get image from R2
      let object = await env.R2.get(key);
      
      // If not found, try fallback image
      if (!object) {
        const fallbackKey = 'fallback/default.jpg';
        object = await env.R2.get(fallbackKey);
        
        if (!object) {
          return new Response('Image not found', { status: 404 });
        }
      }

      // Get the image data
      const imageData = await object.arrayBuffer();
      
      // Process the image based on parameters
      const processedImage = await processImage(imageData, params, request.headers);
      
      // Create response with proper headers
      response = new Response(processedImage.data, {
        headers: {
          'Content-Type': processedImage.contentType,
          'Cache-Control': `public, max-age=${BROWSER_CACHE_TTL}, s-maxage=${CACHE_TTL}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
          'ETag': `"${await generateETag(key, params)}"`,
          'CF-Cache-Status': 'MISS',
          'Last-Modified': object.uploaded.toUTCString(),
          'Vary': 'Accept',
        },
      });

      // Cache the response
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      
      return response;

    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },
};

function parseImageParams(searchParams: URLSearchParams): ImageParams | null {
  const params: ImageParams = {};

  // Width
  if (searchParams.has('w')) {
    const w = parseInt(searchParams.get('w')!);
    if (isNaN(w) || w <= 0 || w > MAX_WIDTH) {
      return null;
    }
    params.w = w;
  }

  // Height
  if (searchParams.has('h')) {
    const h = parseInt(searchParams.get('h')!);
    if (isNaN(h) || h <= 0 || h > MAX_HEIGHT) {
      return null;
    }
    params.h = h;
  }

  // Quality
  if (searchParams.has('q')) {
    const q = parseInt(searchParams.get('q')!);
    if (isNaN(q) || q < 1 || q > 100) {
      return null;
    }
    params.q = q;
  } else {
    params.q = DEFAULT_QUALITY;
  }

  // Format
  if (searchParams.has('fmt')) {
    const fmt = searchParams.get('fmt')!.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(fmt)) {
      return null;
    }
    params.fmt = fmt as ImageParams['fmt'];
  }

  return params;
}

async function processImage(
  imageData: ArrayBuffer, 
  params: ImageParams, 
  headers: Headers
): Promise<{ data: ArrayBuffer; contentType: string }> {
  
  // Determine best format based on Accept header and fmt parameter
  const acceptHeader = headers.get('Accept') || '';
  let format = params.fmt;
  
  if (!format) {
    if (acceptHeader.includes('image/avif')) {
      format = 'avif';
    } else if (acceptHeader.includes('image/webp')) {
      format = 'webp';
    } else {
      format = 'jpeg';
    }
  }

  // If no transformations needed and format is compatible, return original
  if (!params.w && !params.h && (!params.fmt || params.fmt === 'jpeg') && params.q === DEFAULT_QUALITY) {
    return {
      data: imageData,
      contentType: getContentType(format)
    };
  }

  // Use Cloudflare's image processing
  const options: any = {
    quality: params.q || DEFAULT_QUALITY,
    format: format,
  };

  if (params.w || params.h) {
    options.width = params.w;
    options.height = params.h;
    options.fit = 'scale-down'; // Maintain aspect ratio
  }

  try {
    // Create a request for Cloudflare Images API
    const imageRequest = new Request('https://imagedelivery.net/transform', {
      method: 'POST',
      body: imageData,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

    // Since we can't use Cloudflare Images API directly in this context,
    // we'll implement basic resizing logic or return original
    // In production, you'd integrate with Cloudflare Images or use a different approach

    return {
      data: imageData, // Return original for now
      contentType: getContentType(format)
    };

  } catch (error) {
    console.error('Image processing error:', error);
    // Fallback to original image
    return {
      data: imageData,
      contentType: getContentType('jpeg')
    };
  }
}

function getContentType(format: string): string {
  switch (format) {
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

async function generateETag(key: string, params: ImageParams): Promise<string> {
  const paramString = JSON.stringify(params);
  const data = new TextEncoder().encode(key + paramString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}