import React, { useState, useEffect, ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  webpSrc?: string;
  fallbackSrc?: string;
  lazy?: boolean;
  blur?: boolean;
  quality?: number;
  width?: number;
  height?: number;
}

/**
 * Check if browser supports WebP
 */
const checkWebPSupport = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webp = new Image();
    webp.onload = () => resolve(webp.width === 1);
    webp.onerror = () => resolve(false);
    webp.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
  });
};

/**
 * Convert image URL to WebP if possible
 */
const getWebPUrl = (src: string, quality: number = 85): string => {
  // If already WebP, return as-is
  if (src.endsWith('.webp')) return src;
  
  // Check if URL is from Unsplash or other image service that supports WebP
  if (src.includes('unsplash.com')) {
    const url = new URL(src);
    url.searchParams.set('fm', 'webp');
    url.searchParams.set('q', quality.toString());
    return url.toString();
  }
  
  // Check for Figma assets
  if (src.startsWith('figma:asset/')) {
    return src; // Figma assets are already optimized
  }
  
  // For other URLs, attempt to replace extension with .webp
  // This assumes your build process generates WebP versions
  const lastDot = src.lastIndexOf('.');
  if (lastDot > -1) {
    return `${src.substring(0, lastDot)}.webp`;
  }
  
  return src;
};

/**
 * Generate srcset for responsive images
 */
const generateSrcSet = (src: string, widths: number[] = [320, 640, 960, 1280, 1920]): string => {
  if (src.includes('unsplash.com')) {
    return widths
      .map(width => {
        const url = new URL(src);
        url.searchParams.set('w', width.toString());
        url.searchParams.set('fm', 'webp');
        return `${url.toString()} ${width}w`;
      })
      .join(', ');
  }
  
  return '';
};

export function OptimizedImage({
  src,
  alt,
  webpSrc,
  fallbackSrc,
  lazy = true,
  blur = true,
  quality = 85,
  width,
  height,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [supportsWebP, setSupportsWebP] = useState(false);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    checkWebPSupport().then(setSupportsWebP);
  }, []);
  
  const imageSrc = error
    ? (fallbackSrc || src)
    : supportsWebP
    ? (webpSrc || getWebPUrl(src, quality))
    : src;
  
  const srcSet = generateSrcSet(imageSrc);
  
  return (
    <picture className={className}>
      {/* WebP source */}
      {supportsWebP && !error && (
        <source
          type="image/webp"
          srcSet={srcSet || imageSrc}
          sizes={width ? `${width}px` : '100vw'}
        />
      )}
      
      {/* Fallback image */}
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className={`
          ${className || ''}
          ${blur && !isLoaded ? 'blur-sm' : ''}
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
          transition-all duration-300 ease-in-out
        `}
        style={{
          willChange: isLoaded ? 'auto' : 'opacity',
          ...props.style
        }}
        {...props}
      />
    </picture>
  );
}

/**
 * Preload critical images
 */
export const preloadImage = (src: string, webp: boolean = false): void => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = webp ? getWebPUrl(src) : src;
  
  if (webp) {
    link.type = 'image/webp';
  }
  
  document.head.appendChild(link);
};

/**
 * Lazy load images on scroll
 */
export const useLazyImage = (ref: React.RefObject<HTMLImageElement>) => {
  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const lazyImg = entry.target as HTMLImageElement;
            const dataSrc = lazyImg.getAttribute('data-src');
            
            if (dataSrc) {
              lazyImg.src = dataSrc;
              lazyImg.removeAttribute('data-src');
            }
            
            observer.unobserve(lazyImg);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    );
    
    observer.observe(img);
    
    return () => observer.disconnect();
  }, [ref]);
};
