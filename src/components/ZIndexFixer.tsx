// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { useEffect } from 'react';

interface ZIndexFixerProps {
  enabled?: boolean;
}

export const ZIndexFixer: React.FC<ZIndexFixerProps> = ({ enabled = true }) => {
  useEffect(() => {
    if (!enabled) return;

    const fixDropdownZIndex = () => {
      // Find all Radix Select content elements
      const selectContents = document.querySelectorAll('[data-radix-select-content]');
      
      selectContents.forEach((element) => {
        const htmlElement = element as HTMLElement;
        
        // Check if this dropdown contains communication level options
        const hasCommItems = element.querySelector('[data-value="single words"], [data-value="short phrases"], [data-value="sentences"], [data-value="fluent"]');
        
        // Check if this dropdown contains diagnosis options  
        const hasDiagnosisItems = element.querySelector('[data-value*="autism"], [data-value*="adhd"], [data-value*="speech"], [data-value*="delay"]');
        
        // Check if this dropdown contains age options
        const hasAgeItems = element.querySelector('[data-value="1"], [data-value="2"], [data-value="3"], [data-value="4"], [data-value="5"]');
        
        // Check if this dropdown contains relationship options
        const hasRelationshipItems = element.querySelector('[data-value="parent"], [data-value="caregiver"], [data-value="grandparent"], [data-value="guardian"], [data-value="other"]');
        
        // Check if this dropdown contains state options
        const hasStateItems = element.querySelector('[data-value*="alabama"], [data-value*="california"], [data-value*="florida"], [data-value*="new york"], [data-value*="texas"]');
        
        // Apply z-index based on content type
        if (hasCommItems) {
          htmlElement.style.zIndex = '10';
          htmlElement.setAttribute('data-field-type', 'communication');
        } else if (hasDiagnosisItems) {
          htmlElement.style.zIndex = '10000';
          htmlElement.setAttribute('data-field-type', 'diagnosis');
        } else if (hasAgeItems) {
          htmlElement.style.zIndex = '5000';
          htmlElement.setAttribute('data-field-type', 'age');
        } else if (hasRelationshipItems) {
          htmlElement.style.zIndex = '1200';
          htmlElement.setAttribute('data-field-type', 'relationship');
        } else if (hasStateItems) {
          htmlElement.style.zIndex = '1100';
          htmlElement.setAttribute('data-field-type', 'state');
        }
      });
    };

    // Fix immediately
    fixDropdownZIndex();

    // Fix when DOM changes (for dynamically opened dropdowns)
    const observer = new MutationObserver(() => {
      fixDropdownZIndex();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'data-radix-select-content']
    });

    // Also fix on any click (when dropdowns are opened)
    const handleClick = () => {
      setTimeout(fixDropdownZIndex, 50);
    };

    document.addEventListener('click', handleClick);

    // Fix on focus changes
    const handleFocus = () => {
      setTimeout(fixDropdownZIndex, 50);
    };

    document.addEventListener('focusin', handleFocus);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleClick);
      document.removeEventListener('focusin', handleFocus);
    };
  }, [enabled]);

  return null; // This component renders nothing
};

export default ZIndexFixer;