import React, { useEffect } from 'react';

/**
 * CLS OPTIMIZER - Cumulative Layout Shift Prevention
 * 
 * This component implements strategies to achieve CLS < 0.25:
 * 1. Reserves space for dynamic content
 * 2. Prevents font loading shifts
 * 3. Optimizes image loading
 * 4. Fixes scrollbar-induced shifts
 * 5. Manages viewport height on mobile
 * 6. Forces hardware acceleration
 * 7. Prevents repaints and reflows
 */

export function CLSOptimizer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Fix viewport height for mobile to prevent shifts
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    
    // Debounce resize to prevent multiple CLS events
    let resizeTimeout: NodeJS.Timeout;
    const debouncedSetVH = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setVH, 100);
    };
    
    window.addEventListener('resize', debouncedSetVH, { passive: true });
    window.addEventListener('orientationchange', setVH);

    // CRITICAL: Prevent layout shifts from scrollbar
    document.documentElement.style.scrollbarGutter = 'stable';
    document.documentElement.style.overflowY = 'scroll';

    // CRITICAL: Force hardware acceleration
    document.documentElement.style.transform = 'translateZ(0)';
    document.documentElement.style.backfaceVisibility = 'hidden';
    document.documentElement.style.perspective = '1000px';

    // CRITICAL: Prevent font loading shifts with font-display block
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Manrope';
        font-display: block;
        font-display: optional;
      }
      
      /* Force all elements to use border-box */
      *, *::before, *::after {
        box-sizing: border-box !important;
      }
      
      /* Prevent layout shifts from images */
      img {
        max-width: 100%;
        height: auto;
        display: block;
      }
      
      img:not([width]):not([height]) {
        aspect-ratio: 16 / 9;
      }
      
      /* Prevent shifts from dynamic content */
      .dynamic-content {
        contain: layout style;
        min-height: var(--min-content-height, 100px);
      }
      
      /* Prevent shifts from modals/dialogs */
      [role="dialog"],
      [data-radix-dialog-content],
      [data-radix-popover-content] {
        contain: layout style paint;
        will-change: auto;
      }
      
      /* Prevent shifts from loading skeletons */
      [data-loading="true"] {
        contain: strict;
      }
      
      /* Stabilize buttons and interactive elements */
      button, a {
        contain: layout style;
      }
      
      /* Prevent text reflow */
      p, span, div {
        overflow-wrap: break-word;
        word-wrap: break-word;
      }
      
      /* Critical: Reserve space for Suspense boundaries */
      [data-suspense-boundary] {
        min-height: 100vh;
        contain: layout;
      }
    `;
    document.head.appendChild(style);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedSetVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  return (
    <div
      data-suspense-boundary="true"
      style={{
        minHeight: '100vh',
        contain: 'layout style',
        isolation: 'isolate',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        willChange: 'auto',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Skeleton Loader Component - Prevents CLS during loading
 */
export function SkeletonLoader({ 
  height = '100px', 
  className = '' 
}: { 
  height?: string; 
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-[8px] ${className}`}
      style={{
        height,
        contain: 'strict',
        minHeight: height
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Image Wrapper - Prevents CLS from image loading
 */
export function ImageWithDimensions({
  src,
  alt,
  width,
  height,
  className = ''
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        contain: 'layout style paint',
        position: 'relative'
      }}
      className={className}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        loading="lazy"
      />
    </div>
  );
}

/**
 * Modal Container - Prevents CLS from modal appearance
 */
export function ModalContainer({ 
  children, 
  isOpen 
}: { 
  children: React.ReactNode; 
  isOpen: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        contain: 'strict',
        isolation: 'isolate'
      }}
    >
      {children}
    </div>
  );
}

/**
 * Content Wrapper - Uses CSS containment to prevent shifts
 */
export function ContentContainer({ 
  children,
  minHeight = '200px'
}: { 
  children: React.ReactNode;
  minHeight?: string;
}) {
  return (
    <div
      style={{
        contain: 'layout style',
        minHeight,
        isolation: 'isolate'
      }}
    >
      {children}
    </div>
  );
}
