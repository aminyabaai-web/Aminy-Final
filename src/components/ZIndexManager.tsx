import React, { useEffect } from 'react';

export const ZIndexManager: React.FC = () => {
  useEffect(() => {
    let highestZIndex = 2000; // Start with a higher base to avoid conflicts
    const activeDropdowns = new Set<HTMLElement>();
    
    const ensureDropdownVisibility = () => {
      // Find all currently open select content elements
      const openSelects = document.querySelectorAll('[data-radix-select-content][data-state="open"]');
      const allSelectElements = document.querySelectorAll('[data-radix-select-content]');
      
      // Reset all dropdown z-indexes to base level
      allSelectElements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.zIndex = '1500';
      });
      
      // Apply increasing z-index to open dropdowns based on opening order
      Array.from(openSelects).forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const zIndex = 2000 + (index * 10);
        htmlElement.style.zIndex = zIndex.toString();
        
        // Also ensure viewport positioning
        htmlElement.style.position = 'absolute';
        
      });
      
      // Handle any other dropdown types (autocomplete, etc.)
      const otherDropdowns = document.querySelectorAll('.insurance-suggestions-dropdown, .diagnosis-search-dropdown, .diagnosis-suggestions');
      otherDropdowns.forEach((element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.zIndex = '1800';
      });
    };
    
    // Enhanced mutation observer to catch all dropdown state changes
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          
          // Check for radix select state changes
          if (mutation.attributeName === 'data-state' && 
              target.hasAttribute('data-radix-select-content')) {
            shouldUpdate = true;
          }
          
          // Check for any dropdown visibility changes
          if (mutation.attributeName === 'style' || 
              mutation.attributeName === 'class' ||
              mutation.attributeName === 'aria-hidden') {
            if (target.closest('[data-radix-select-content]') ||
                target.classList.contains('insurance-suggestions-dropdown') ||
                target.classList.contains('diagnosis-search-dropdown') ||
                target.classList.contains('diagnosis-suggestions')) {
              shouldUpdate = true;
            }
          }
        }
        
        // Check for new dropdown elements being added
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              if (element.hasAttribute?.('data-radix-select-content') ||
                  element.querySelector?.('[data-radix-select-content]') ||
                  element.classList?.contains('insurance-suggestions-dropdown') ||
                  element.classList?.contains('diagnosis-search-dropdown')) {
                shouldUpdate = true;
              }
            }
          });
        }
      });
      
      if (shouldUpdate) {
        // Small delay to ensure DOM updates are complete
        setTimeout(ensureDropdownVisibility, 5);
      }
    });
    
    // Start comprehensive observation
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['data-state', 'style', 'class', 'aria-hidden', 'data-radix-select-content']
    });
    
    // Handle click events for dropdown triggers
    const handleDropdownTrigger = (event: Event) => {
      const target = event.target as HTMLElement;
      const selectTrigger = target.closest('[data-radix-select-trigger]');
      
      if (selectTrigger) {
        // Multiple timeouts to catch all states
        setTimeout(ensureDropdownVisibility, 10);
        setTimeout(ensureDropdownVisibility, 50);
        setTimeout(ensureDropdownVisibility, 100);
      }
    };
    
    // Handle focus events
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-radix-select-trigger]') ||
          target.closest('.insurance-suggestions-dropdown') ||
          target.closest('.diagnosis-search-dropdown')) {
        setTimeout(ensureDropdownVisibility, 10);
      }
    };
    
    // Add event listeners
    document.addEventListener('click', handleDropdownTrigger, true);
    document.addEventListener('focusin', handleFocus, true);
    
    // Initial check
    setTimeout(ensureDropdownVisibility, 100);
    
    // Periodic check to catch any missed updates
    const intervalId = setInterval(ensureDropdownVisibility, 1000);
    
    // Cleanup
    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleDropdownTrigger, true);
      document.removeEventListener('focusin', handleFocus, true);
      clearInterval(intervalId);
    };
  }, []);
  
  return null;
};

export default ZIndexManager;