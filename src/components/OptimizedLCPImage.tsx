// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';

interface OptimizedLCPImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

/**
 * Optimized image component specifically for LCP (Largest Contentful Paint) optimization
 * - Uses native lazy loading with fetchpriority="high" for critical images
 * - Prevents layout shifts with explicit dimensions
 * - Provides immediate fallback with placeholder
 */
export function OptimizedLCPImage({ 
  src, 
  alt, 
  width, 
  height, 
  className 
}: OptimizedLCPImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Preload the image as soon as component mounts
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setHasError(true);
  }, [src]);

  return (
    <div 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        position: 'relative',
        contain: 'layout style paint',
      }}
      className={className}
    >
      {/* Placeholder while loading */}
      {!isLoaded && !hasError && (
        <div 
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '12px',
          }}
        />
      )}
      
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        decoding="async"
        loading="eager"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.2s ease-in',
          position: 'absolute',
          top: 0,
          left: 0,
          contentVisibility: 'auto',
          containIntrinsicSize: `${width}px ${height}px`,
        }}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        {...({ fetchpriority: 'high' } as React.ImgHTMLAttributes<HTMLImageElement>)}
      />

      {/* Error fallback */}
      {hasError && (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            borderRadius: '12px',
            color: '#0891b2',
            fontWeight: 600,
            fontSize: '20px',
          }}
        >
          Aminy
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
