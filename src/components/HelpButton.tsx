// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Button } from './ui/button';
import { HelpCircle, AlertTriangle } from 'lucide-react';
import { UrgentHelpSheet } from './HelpCenter';

interface HelpButtonProps {
  onHelpOpen: () => void;
  onUrgentHelpOpen?: () => void;
  onAnalytics?: (event: string, data: Record<string, unknown>) => void;
  className?: string;
  variant?: 'header' | 'standalone';
  showUrgentHelp?: boolean;
}

export function HelpButton({ 
  onHelpOpen, 
  onUrgentHelpOpen,
  onAnalytics,
  className = '', 
  variant = 'header',
  showUrgentHelp = false 
}: HelpButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showUrgentHelpSheet, setShowUrgentHelpSheet] = useState(showUrgentHelp);

  const handleClick = (e: React.MouseEvent) => {
    // Check if Shift+Click for urgent help
    if (e.shiftKey || e.ctrlKey) {
      setShowUrgentHelpSheet(true);
      onUrgentHelpOpen?.();
      onAnalytics?.('urgent_help_opened', { source: 'help_button_shortcut' });
    } else {
      onHelpOpen();
      onAnalytics?.('help_opened', { source: 'help_button' });
    }
  };

  const handleUrgentHelpClose = () => {
    setShowUrgentHelpSheet(false);
    onAnalytics?.('urgent_help_closed', { method: 'close_button' });
  };

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleFocus = () => {
    setShowTooltip(true);
  };

  const handleBlur = () => {
    setShowTooltip(false);
  };

  if (variant === 'standalone') {
    return (
      <div className="relative inline-block">
        <Button
          variant="outline"
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${className}`}
          aria-label="Help & Safety"
        >
          <HelpCircle className="w-4 h-4" />
          Help & Safety
        </Button>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50">
            Help & Safety
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
        {/* Urgent Help Sheet */}
        <UrgentHelpSheet 
          isOpen={showUrgentHelpSheet}
          onClose={handleUrgentHelpClose}
          onAnalytics={onAnalytics || (() => {})}
        />
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`
          w-11 h-11 p-0 rounded-lg 
          text-muted-foreground hover:text-foreground hover:bg-gray-100
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
          ${className}
        `}
        aria-label="Help & Safety"
      >
        <HelpCircle className="w-6 h-6" />
      </Button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50">
          Help & Safety
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
      
      {/* Urgent Help Sheet */}
      <UrgentHelpSheet 
        isOpen={showUrgentHelpSheet}
        onClose={handleUrgentHelpClose}
        onAnalytics={onAnalytics || (() => {})}
      />
    </div>
  );
}

// CSS for tooltip animations - add to globals.css
export const helpButtonStyles = `
/* Help Button Tooltip Animations */
.help-tooltip-enter {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

.help-tooltip-enter-active {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.help-tooltip-exit {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.help-tooltip-exit-active {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .help-button-header {
    border: 2px solid var(--foreground) !important;
    background: var(--background) !important;
    color: var(--foreground) !important;
  }
  
  .help-button-header:hover {
    background: var(--muted) !important;
    border-color: var(--accent) !important;
  }
  
  .help-button-header:focus {
    outline: 3px solid var(--accent) !important;
    outline-offset: 2px !important;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .help-tooltip {
    background: rgba(15, 23, 42, 0.95) !important;
    color: rgb(248, 250, 252) !important;
    border: 1px solid rgba(71, 85, 105, 0.3);
  }
  
  .help-tooltip::after {
    border-top-color: rgba(15, 23, 42, 0.95) !important;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .help-tooltip-enter-active,
  .help-tooltip-exit-active {
    transition: opacity 0.2s ease !important;
    transform: translateX(-50%) translateY(0) !important;
  }
}

/* Mobile touch optimization */
@media (max-width: 640px) {
  .help-button-header {
    min-width: 44px !important;
    min-height: 44px !important;
    -webkit-tap-highlight-color: rgba(8, 145, 178, 0.2);
  }
  
  .help-tooltip {
    font-size: 12px !important;
    padding: 6px 10px !important;
  }
}

/* Small mobile screens */
@media (max-width: 380px) {
  .help-button-header {
    min-width: 40px !important;
    min-height: 40px !important;
  }
  
  .help-button-header svg {
    width: 20px !important;
    height: 20px !important;
  }
}

/* iOS touch enhancements */
@supports (-webkit-touch-callout: none) {
  .help-button-header:active {
    transform: scale(0.96);
    transition: transform 0.1s ease;
  }
}
`;