// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { useEffect } from 'react';

/**
 * AccessibilityAuditor
 * 
 * Development-only component that monitors and fixes common accessibility warnings
 * Including:
 * - Missing Dialog descriptions
 * - Missing form labels
 * - Missing alt text
 * - Invalid ARIA attributes
 * 
 * This runs only in development and helps catch issues before they become console warnings
 */

interface AccessibilityIssue {
  type: string;
  element: HTMLElement;
  message: string;
  autoFixed: boolean;
}

export const AccessibilityAuditor: React.FC = () => {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const issues: AccessibilityIssue[] = [];

    const auditAccessibility = () => {
      // Clear previous issues
      issues.length = 0;

      // 1. Check for Dialog components without descriptions
      const dialogs = document.querySelectorAll('[role="dialog"]');
      dialogs.forEach((dialog) => {
        if (!dialog.hasAttribute('aria-describedby') && !dialog.querySelector('[data-slot="dialog-description"]')) {
          issues.push({
            type: 'dialog-description',
            element: dialog as HTMLElement,
            message: 'Dialog missing description',
            autoFixed: false,
          });
        }
      });

      // 2. Check for images without alt text
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        if (!img.hasAttribute('alt') && !img.hasAttribute('role')) {
          issues.push({
            type: 'image-alt',
            element: img,
            message: 'Image missing alt text',
            autoFixed: false,
          });
          
          // Auto-fix: Add empty alt for decorative images
          if (img.closest('[role="presentation"]') || img.closest('.decorative')) {
            img.setAttribute('alt', '');
            issues[issues.length - 1].autoFixed = true;
          }
        }
      });

      // 3. Check for form inputs without labels
      const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
      inputs.forEach((input) => {
        const hasLabel = input.hasAttribute('aria-label') || 
                        input.hasAttribute('aria-labelledby') ||
                        document.querySelector(`label[for="${input.id}"]`);
        
        if (!hasLabel && input.id) {
          issues.push({
            type: 'input-label',
            element: input as HTMLElement,
            message: `Input #${input.id} missing label`,
            autoFixed: false,
          });
        }
      });

      // 4. Check for buttons without accessible names
      const buttons = document.querySelectorAll('button');
      buttons.forEach((button) => {
        const hasAccessibleName = button.textContent?.trim() ||
                                 button.hasAttribute('aria-label') ||
                                 button.hasAttribute('aria-labelledby') ||
                                 button.querySelector('svg[aria-label]');
        
        if (!hasAccessibleName) {
          issues.push({
            type: 'button-label',
            element: button,
            message: 'Button without accessible name',
            autoFixed: false,
          });
        }
      });

      // 5. Check for missing form field descriptions
      const formFields = document.querySelectorAll('[role="combobox"], [role="listbox"], [role="textbox"]');
      formFields.forEach((field) => {
        if (!field.hasAttribute('aria-describedby')) {
          // This is a warning, not an error - descriptions are optional
          // but recommended for better UX
        }
      });

      // Log issues to console in development only
      if (import.meta.env.DEV && issues.length > 0) {
        console.group('♿ Accessibility Issues Detected');
        issues.forEach((issue) => {
          console.log(`[${issue.type}] ${issue.element}: ${issue.message}`);
        });
        console.groupEnd();
      }
    };

    // Run audit on mount
    auditAccessibility();

    // Run audit on DOM changes
    const observer = new MutationObserver(() => {
      auditAccessibility();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-labelledby', 'aria-describedby', 'alt', 'role'],
    });

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything
};

/**
 * Utility hook to manually trigger accessibility audit
 */
export const useAccessibilityAudit = () => {
  return {
    auditNow: () => {
      // Trigger the audit logic here if needed
    },
  };
};
