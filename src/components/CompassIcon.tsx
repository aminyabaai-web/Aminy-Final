import React from 'react';
import compassImage from "figma:asset/2e39d2a71ccd340d3accf6a7d306e6a6a6781942.png";

interface CompassIconProps {
  className?: string;
  size?: number;
}

/**
 * CompassIcon - Reusable compass icon component using the Aminy compass image
 * Use this for small icon instances throughout the app (avatars, badges, etc.)
 */
export function CompassIcon({ className = '', size }: CompassIconProps) {
  return (
    <img 
      src={compassImage} 
      alt="Aminy compass" 
      className={className}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}
