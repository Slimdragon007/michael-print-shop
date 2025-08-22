/**
 * Image CDN Helper for Print Shop
 * Provides seamless integration between local images and Cloudflare R2 CDN
 */

interface CDNOptions {
  w?: number;           // Width in pixels
  h?: number;           // Height in pixels  
  q?: number;           // Quality 1-100
  fmt?: 'webp' | 'avif' | 'jpeg' | 'png';  // Format
}

interface CDNConfig {
  enabled: boolean;
  baseUrl: string;
  fallbackToLocal: boolean;
}

// Get CDN configuration from environment
function getCDNConfig(): CDNConfig {
  const enabled = process.env.IMAGE_CDN_ENABLED === 'true';
  const baseUrl = process.env.IMAGE_CDN_BASE || process.env.CDN_BASE_URL || '';
  
  return {
    enabled: enabled && !!baseUrl,
    baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
    fallbackToLocal: process.env.IMAGE_CDN_FALLBACK !== 'false'
  };
}

/**
 * Generate CDN URL for an image with optional transformations
 * @param key - Image key (e.g., "products/ABC123/canvas.jpg")
 * @param options - Transformation options
 * @returns CDN URL or local fallback URL
 */
export function cdnUrl(key: string, options: CDNOptions = {}): string {
  const config = getCDNConfig();
  
  // If CDN is disabled, return local URL
  if (!config.enabled) {
    return getLocalImageUrl(key);
  }

  // Validate key
  if (!key || key.includes('..') || key.startsWith('/')) {
    console.warn(`Invalid image key: ${key}`);
    return getLocalImageUrl(key);
  }

  // Build query parameters
  const params = new URLSearchParams();
  
  if (options.w && options.w > 0) {
    params.set('w', options.w.toString());
  }
  
  if (options.h && options.h > 0) {
    params.set('h', options.h.toString());
  }
  
  if (options.q && options.q >= 1 && options.q <= 100) {
    params.set('q', options.q.toString());
  }
  
  if (options.fmt && ['webp', 'avif', 'jpeg', 'png'].includes(options.fmt)) {
    params.set('fmt', options.fmt);
  }

  // Construct CDN URL
  const queryString = params.toString();
  const url = `${config.baseUrl}/${key}${queryString ? `?${queryString}` : ''}`;
  
  return url;
}

/**
 * Generate responsive image sources for different screen sizes
 * @param key - Image key
 * @param options - Base transformation options
 * @returns Object with srcset and sizes for responsive images
 */
export function responsiveImageSources(key: string, options: CDNOptions = {}) {
  const config = getCDNConfig();
  
  if (!config.enabled) {
    return {
      src: getLocalImageUrl(key),
      srcset: '',
      sizes: ''
    };
  }

  // Define responsive breakpoints
  const breakpoints = [
    { width: 480, size: '(max-width: 480px)' },
    { width: 768, size: '(max-width: 768px)' },
    { width: 1024, size: '(max-width: 1024px)' },
    { width: 1600, size: '(max-width: 1600px)' },
    { width: 2400, size: '(min-width: 1601px)' }
  ];

  // Generate srcset
  const srcsetEntries = breakpoints.map(bp => {
    const url = cdnUrl(key, { ...options, w: bp.width });
    return `${url} ${bp.width}w`;
  });

  // Generate sizes attribute
  const sizes = breakpoints.map(bp => bp.size).join(', ');

  return {
    src: cdnUrl(key, options), // Default/fallback source
    srcset: srcsetEntries.join(', '),
    sizes
  };
}

/**
 * Generate product image variants (thumbnail, medium, large)
 * @param sku - Product SKU
 * @param variant - Image variant (e.g., "canvas", "framed", "main")
 * @param extension - File extension (default: jpg)
 * @returns Object with different sized URLs
 */
export function productImageUrls(sku: string, variant: string = 'main', extension: string = 'jpg') {
  const key = `products/${sku}/${variant}.${extension}`;
  
  return {
    thumbnail: cdnUrl(key, { w: 400, h: 400, q: 80, fmt: 'webp' }),
    medium: cdnUrl(key, { w: 1000, q: 85, fmt: 'webp' }),
    large: cdnUrl(key, { w: 1600, q: 90, fmt: 'webp' }),
    original: cdnUrl(key),
    
    // Responsive sources for modern browsers
    responsive: responsiveImageSources(key, { q: 85, fmt: 'webp' }),
    
    // JPEG fallbacks for older browsers
    fallback: {
      thumbnail: cdnUrl(key, { w: 400, h: 400, q: 80, fmt: 'jpeg' }),
      medium: cdnUrl(key, { w: 1000, q: 85, fmt: 'jpeg' }),
      large: cdnUrl(key, { w: 1600, q: 90, fmt: 'jpeg' })
    }
  };
}

/**
 * Generate gallery image URLs
 * @param slug - Gallery slug
 * @param index - Image index
 * @param extension - File extension (default: jpg)
 * @returns Object with different sized URLs
 */
export function galleryImageUrls(slug: string, index: number, extension: string = 'jpg') {
  const key = `gallery/${slug}/${index}.${extension}`;
  
  return {
    thumbnail: cdnUrl(key, { w: 300, h: 300, q: 80, fmt: 'webp' }),
    medium: cdnUrl(key, { w: 800, q: 85, fmt: 'webp' }),
    large: cdnUrl(key, { w: 1600, q: 90, fmt: 'webp' }),
    original: cdnUrl(key),
    responsive: responsiveImageSources(key, { q: 85, fmt: 'webp' })
  };
}

/**
 * Generate Etsy listing image URLs (specific sizes for Etsy requirements)
 * @param sku - Product SKU
 * @param variant - Image variant
 * @param extension - File extension (default: jpg)
 * @returns Object with Etsy-specific sizes
 */
export function etsyImageUrls(sku: string, variant: string = 'main', extension: string = 'jpg') {
  const key = `products/${sku}/${variant}.${extension}`;
  
  return {
    primary: cdnUrl(key, { w: 3000, h: 2400, q: 90, fmt: 'jpeg' }),    // Etsy primary
    square: cdnUrl(key, { w: 2000, h: 2000, q: 90, fmt: 'jpeg' }),     // Etsy additional
    listing: cdnUrl(key, { w: 1600, q: 90, fmt: 'jpeg' }),             // General listing
    thumbnail: cdnUrl(key, { w: 400, h: 400, q: 80, fmt: 'jpeg' })     // Thumbnail
  };
}

/**
 * Preload critical images for performance
 * @param keys - Array of image keys to preload
 * @param options - Transformation options
 * @returns Array of preload link elements
 */
export function preloadImages(keys: string[], options: CDNOptions = {}) {
  if (typeof window === 'undefined') return []; // Server-side safe
  
  return keys.map(key => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = cdnUrl(key, options);
    return link;
  });
}

/**
 * Get local image URL as fallback
 * @param key - Image key
 * @returns Local URL path
 */
function getLocalImageUrl(key: string): string {
  // Remove any leading slash and ensure it starts with /images/
  const cleanKey = key.replace(/^\/+/, '');
  
  if (cleanKey.startsWith('images/')) {
    return `/${cleanKey}`;
  }
  
  return `/images/${cleanKey}`;
}

/**
 * Utility to check if CDN is available/enabled
 * @returns boolean indicating CDN availability
 */
export function isCDNEnabled(): boolean {
  return getCDNConfig().enabled;
}

/**
 * Get CDN base URL for direct access
 * @returns CDN base URL or empty string if disabled
 */
export function getCDNBaseUrl(): string {
  const config = getCDNConfig();
  return config.enabled ? config.baseUrl : '';
}

/**
 * Generate cache-busting URL (useful for admin uploads)
 * @param key - Image key
 * @param options - Transformation options
 * @returns CDN URL with cache-busting parameter
 */
export function cdnUrlWithCacheBust(key: string, options: CDNOptions = {}): string {
  const url = cdnUrl(key, options);
  const separator = url.includes('?') ? '&' : '?';
  const timestamp = Date.now();
  return `${url}${separator}cb=${timestamp}`;
}

// Export types for TypeScript users
export type { CDNOptions, CDNConfig };