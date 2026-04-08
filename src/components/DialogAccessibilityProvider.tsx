// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useEffect } from 'react';

/**
 * DialogAccessibilityProvider
 * 
 * Ensures all Dialog components meet WCAG accessibility standards by:
 * 1. Adding aria-describedby to DialogContent without DialogDescription
 * 2. Creating hidden descriptions for screen readers
 * 3. Monitoring for dynamically created dialogs
 * 
 * This provider eliminates the warning:
 * "Missing Description or aria-describedby={undefined} for {DialogContent}"
 */

export const DialogAccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Function to add accessibility attributes to dialog content
    const ensureDialogAccessibility = () => {
      // Find all dialog content elements
      const dialogContents = document.querySelectorAll('[role="dialog"]');
      
      dialogContents.forEach((dialog) => {
        // Check if dialog already has aria-describedby
        if (!dialog.hasAttribute('aria-describedby')) {
          // Get the dialog title
          const titleElement = dialog.querySelector('[data-slot="dialog-title"]') || 
                              dialog.querySelector('h2') ||
                              dialog.querySelector('[role="heading"]');
          
          // Get or create description
          let descriptionElement = dialog.querySelector('[data-slot="dialog-description"]');
          
          if (!descriptionElement) {
            // Create a hidden description based on the title
            const descId = `dialog-desc-${Math.random().toString(36).substr(2, 9)}`;
            descriptionElement = document.createElement('p');
            descriptionElement.id = descId;
            descriptionElement.className = 'sr-only';
            descriptionElement.setAttribute('data-slot', 'dialog-description');
            
            // Set description text
            if (titleElement) {
              descriptionElement.textContent = `${titleElement.textContent} dialog`;
            } else {
              descriptionElement.textContent = 'Dialog window';
            }
            
            // Insert description into dialog
            dialog.insertBefore(descriptionElement, dialog.firstChild);
            
            // Add aria-describedby to dialog
            dialog.setAttribute('aria-describedby', descId);
          } else {
            // Description exists, just add aria-describedby
            const descId = descriptionElement.id || `dialog-desc-${Math.random().toString(36).substr(2, 9)}`;
            if (!descriptionElement.id) {
              descriptionElement.id = descId;
            }
            dialog.setAttribute('aria-describedby', descId);
          }
        }
      });
    };

    // Run on mount
    ensureDialogAccessibility();

    // Create MutationObserver to handle dynamically added dialogs
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          ensureDialogAccessibility();
        }
      }
    });

    // Observe document body for dialog additions
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);

  return <>{children}</>;
};

/**
 * Utility function to manually ensure a specific dialog has proper accessibility
 * Can be called directly in components if needed
 */
export const ensureDialogDescription = (dialogElement: HTMLElement) => {
  if (dialogElement.getAttribute('role') !== 'dialog') {
    return;
  }

  if (dialogElement.hasAttribute('aria-describedby')) {
    // Already has description
    return;
  }

  // Find or create description
  let descriptionElement = dialogElement.querySelector('[data-slot="dialog-description"]') as HTMLElement;
  
  if (!descriptionElement) {
    const titleElement = dialogElement.querySelector('[data-slot="dialog-title"]') || 
                        dialogElement.querySelector('h2') ||
                        dialogElement.querySelector('[role="heading"]');
    
    const descId = `dialog-desc-${Math.random().toString(36).substr(2, 9)}`;
    descriptionElement = document.createElement('p');
    descriptionElement.id = descId;
    descriptionElement.className = 'sr-only';
    descriptionElement.setAttribute('data-slot', 'dialog-description');
    
    if (titleElement) {
      descriptionElement.textContent = `${titleElement.textContent} dialog`;
    } else {
      descriptionElement.textContent = 'Dialog window';
    }
    
    dialogElement.insertBefore(descriptionElement, dialogElement.firstChild);
    dialogElement.setAttribute('aria-describedby', descId);
  }
};
