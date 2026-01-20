import React from 'react';
import compassImage from "figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showTagline?: boolean;
}

export function Logo({ size = 'md', showText = true, showTagline = false }: LogoProps) {
  const sizes = {
    sm: { 
      icon: 22, // Reduced from 24 (about 8% smaller)
      text: 'text-lg', 
      tagline: 'text-xs',
      iconMargin: 'mr-3',
      taglineSize: '9px',
      wordmarkSize: '18px',
      wordmarkTaglineSpacing: '5px' // Tighter spacing
    },
    md: { 
      icon: 36, // Reduced from 38 (about 5% smaller)
      text: 'text-2xl', 
      tagline: 'text-sm',
      iconMargin: 'mr-4',
      taglineSize: '10px',
      wordmarkSize: '24px',
      wordmarkTaglineSpacing: '5px' // Tighter spacing
    },
    lg: { 
      icon: 58, // Reduced from 62 (about 6% smaller)
      text: 'text-4xl', 
      tagline: 'text-base',
      iconMargin: 'mr-5',
      taglineSize: '11px',
      wordmarkSize: '40px',
      wordmarkTaglineSpacing: '6px' // Tighter spacing
    }
  };

  const currentSize = sizes[size];

  return (
    <div className="flex items-start">
      {/* Compass Icon - Using actual compass image with white background */}
      <div
        className={`relative flex items-center justify-center compass-animate ${currentSize.iconMargin}`}
        style={{
          width: currentSize.icon,
          height: currentSize.icon,
          flexShrink: 0,
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: 'white'
        }}
      >
        <img
          src={compassImage}
          alt="Aminy compass"
          className="object-contain"
          style={{
            width: '130%',
            height: '130%',
            transform: 'scale(1.15)'
          }}
        />
      </div>
      
      {/* Wordmark and Tagline Container */}
      {showText && (
        <div className="flex flex-col items-start">
          {/* "aminy" Wordmark - Primary Visual Anchor */}
          <div 
            className="text-primary leading-none"
            style={{ 
              fontFamily: 'Manrope, system-ui, sans-serif', 
              fontWeight: 700,
              fontSize: currentSize.wordmarkSize,
              letterSpacing: '-0.02em',
              marginBottom: showTagline ? currentSize.wordmarkTaglineSpacing : '0'
            }}
          >
            aminy
          </div>
          
          {/* Tagline - Left-aligned beneath wordmark for web hierarchy */}
          {showTagline && (
            <div 
              className="leading-tight"
              style={{ 
                fontFamily: 'Manrope, system-ui, sans-serif',
                fontSize: currentSize.taglineSize,
                fontWeight: 500, /* Increased from 400 for better visibility */
                letterSpacing: '0.02em',
                lineHeight: '1.2',
                textTransform: 'uppercase',
                color: 'var(--foreground)', /* Increased contrast from muted-foreground */
                fontStyle: 'italic',
                opacity: 0.75, /* Reduced opacity slightly for balance */
                textAlign: 'left' /* Changed from center to left for web hierarchy */
              }}
            >
              <div style={{ marginBottom: '1px' }}>
                Gentle guidance.
              </div>
              <div>
                Meaningful progress.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}