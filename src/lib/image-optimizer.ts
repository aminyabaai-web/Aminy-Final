/**
 * Image Optimization Utilities
 * Optimize images for performance and responsive loading
 */

export const IMAGE_SIZES = {
  thumbnail: 200,
  card: 400,
  hero: 800,
  full: 1200,
  avatar: 100
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

/**
 * Get optimized image URL with size and format hints
 */
export function getOptimizedImageUrl(
  url: string, 
  size: ImageSize = 'card',
  options?: {
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
    blur?: boolean;
  }
): string {
  const width = IMAGE_SIZES[size];
  const quality = options?.quality ?? 80;
  const format = options?.format ?? 'webp';
  
  // Optimize Unsplash images
  if (url.includes('unsplash.com')) {
    let optimized = `${url}?w=${width}&q=${quality}&fm=${format}&fit=crop&auto=format`;
    if (options?.blur) {
      optimized += '&blur=20';
    }
    return optimized;
  }
  
  // Optimize Cloudinary images
  if (url.includes('cloudinary.com')) {
    return url.replace('/upload/', `/upload/w_${width},q_${quality},f_${format}/`);
  }
  
  // For other sources, return as-is (or implement custom CDN logic)
  return url;
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(baseUrl: string, sizes: ImageSize[]): string {
  return sizes
    .map(size => {
      const url = getOptimizedImageUrl(baseUrl, size);
      const width = IMAGE_SIZES[size];
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Get blur placeholder data URL
 */
export function getBlurPlaceholder(url: string): string {
  return getOptimizedImageUrl(url, 'thumbnail', { blur: true, quality: 10 });
}

/**
 * Preload critical images
 */
export function preloadImage(url: string, size: ImageSize = 'card'): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = getOptimizedImageUrl(url, size);
  link.imageSrcset = generateSrcSet(url, ['thumbnail', size, 'hero']);
  document.head.appendChild(link);
}

/**
 * Lazy load image with IntersectionObserver
 */
export function lazyLoadImage(
  element: HTMLImageElement,
  options?: IntersectionObserverInit
): () => void {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        const srcset = img.dataset.srcset;
        
        if (src) img.src = src;
        if (srcset) img.srcset = srcset;
        
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  });

  observer.observe(element);

  // Return cleanup function
  return () => observer.disconnect();
}

/**
 * Optimize image component props
 */
export interface OptimizedImageProps {
  src: string;
  alt: string;
  size?: ImageSize;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  className?: string;
}

/**
 * Get image props optimized for performance
 */
export function getOptimizedImageProps(props: OptimizedImageProps) {
  const { src, alt, size = 'card', loading = 'lazy', priority = false, className } = props;
  
  const optimizedSrc = getOptimizedImageUrl(src, size);
  const srcSet = generateSrcSet(src, ['thumbnail', size, 'hero']);
  const blurDataURL = getBlurPlaceholder(src);
  const width = IMAGE_SIZES[size];
  
  return {
    src: optimizedSrc,
    srcSet,
    sizes: `(max-width: 768px) 100vw, ${width}px`,
    alt,
    loading: priority ? 'eager' : loading,
    decoding: priority ? 'sync' : 'async',
    fetchPriority: priority ? ('high' as const) : ('auto' as const),
    width,
    height: Math.round(width * 0.75), // Assume 4:3 aspect ratio
    className,
    style: {
      backgroundImage: `url(${blurDataURL})`,
      backgroundSize: 'cover',
      contentVisibility: 'auto'
    }
  };
}

/**
 * Calculate optimal image size based on viewport
 */
export function getOptimalImageSize(containerWidth: number): ImageSize {
  if (containerWidth <= 200) return 'thumbnail';
  if (containerWidth <= 400) return 'card';
  if (containerWidth <= 800) return 'hero';
  return 'full';
}

/**
 * Preconnect to image CDNs
 */
export function preconnectImageCDNs() {
  const cdns = [
    'https://images.unsplash.com',
    'https://res.cloudinary.com'
  ];

  cdns.forEach(cdn => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = cdn;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// Auto-preconnect on module load
if (typeof window !== 'undefined') {
  preconnectImageCDNs();
}
