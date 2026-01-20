import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface SupportFooterLinkProps {
  onHelpOpen: () => void;
  isHidden?: boolean;
}

// Global guard to prevent multiple instances
let globalInstance: boolean = false;
let portalRoot: HTMLElement | null = null;

export function SupportFooterLink({ onHelpOpen, isHidden = false }: SupportFooterLinkProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);
  const [isKeyboardRaised, setIsKeyboardRaised] = useState(false);
  const instanceRef = useRef<boolean>(false);

  useEffect(() => {
    // Guard: Only allow one instance globally
    if (globalInstance) {
      return;
    }

    // Claim the global instance
    globalInstance = true;
    instanceRef.current = true;

    // Create or get the portal root
    let footerSlot = document.getElementById('support-footer-slot');
    if (!footerSlot) {
      footerSlot = document.createElement('div');
      footerSlot.id = 'support-footer-slot';
      document.body.appendChild(footerSlot);
    }
    
    portalRoot = footerSlot;
    setIsMounted(true);

    // Cleanup on unmount
    return () => {
      if (instanceRef.current) {
        globalInstance = false;
        instanceRef.current = false;
        
        // Remove portal root if we created it
        if (portalRoot && portalRoot.parentNode) {
          portalRoot.parentNode.removeChild(portalRoot);
          portalRoot = null;
        }
      }
    };
  }, []);

  // Modal/sheet detection
  useEffect(() => {
    if (!isMounted) return;

    const checkModalState = () => {
      // Check for modals, sheets, dialogs, and overlays
      const modalSelectors = [
        '[role="dialog"]',
        '[role="alertdialog"]',
        '.modal',
        '.sheet',
        '.overlay',
        '.popover',
        '[data-state="open"]',
        '.fixed.inset-0',
        '[aria-modal="true"]',
        '.z-50.fixed',
        '.backdrop-blur-sm.fixed',
        '[data-radix-dialog-content]',
        '[data-radix-sheet-content]'
      ];
      
      const hasActiveModal = modalSelectors.some(selector => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).some(el => {
          // Skip toast notifications
          if (el.hasAttribute('data-sonner-toaster') || el.closest('[data-sonner-toaster]')) {
            return false;
          }
          
          const style = window.getComputedStyle(el);
          const isVisible = style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           style.opacity !== '0';
          
          if (selector === '.fixed.inset-0' || selector === '.backdrop-blur-sm.fixed') {
            const hasModalContent = el.querySelector('[role="dialog"], .modal, .sheet');
            return isVisible && hasModalContent;
          }
          
          return isVisible;
        });
      });
      
      setShouldHide(hasActiveModal);
    };

    // Initial check
    checkModalState();

    // Set up observer for dynamic changes
    const observer = new MutationObserver(checkModalState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-modal', 'data-state', 'role']
    });

    // Cleanup observer
    return () => observer.disconnect();
  }, [isMounted]);

  // Keyboard detection for iOS Safari
  useEffect(() => {
    if (!isMounted) return;

    const handleFocusIn = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // Delay to allow keyboard to appear
        setTimeout(() => setIsKeyboardRaised(true), 300);
      }
    };

    const handleFocusOut = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // Delay to allow keyboard to disappear
        setTimeout(() => setIsKeyboardRaised(false), 300);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [isMounted]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onHelpOpen();
  };

  // Don't render if not mounted, hidden, or not the primary instance
  const finalHidden = isHidden || shouldHide;
  if (!isMounted || !portalRoot || !instanceRef.current) {
    return null;
  }

  const footerContent = (
    <div
      role="contentinfo"
      data-helpfooter="true"
      aria-label="Urgent Help footer"
      aria-hidden={finalHidden}
      className={`footer-wrapper ${isKeyboardRaised ? 'footer--raised' : ''}`}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: isKeyboardRaised 
          ? '8px' 
          : 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 16px)',
        width: 'max-content',
        zIndex: 40,
        pointerEvents: 'none',
        insetInline: 'auto',
        // ALWAYS center horizontally - never conditional
        transform: 'translateX(-50%)',
        // Additional centering insurance
        marginLeft: '0',
        marginRight: '0',
        // Smooth transitions
        transition: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'opacity 0.2s ease-in-out, bottom 0.3s ease-in-out'
          : 'opacity 0.2s ease-in-out, bottom 0.3s ease-in-out, transform 0.2s ease-in-out',
        // Handle visibility states
        opacity: finalHidden ? 0 : 1,
        visibility: finalHidden ? 'hidden' : 'visible'
      }}
    >
      <button
        onClick={handleClick}
        aria-label="Open Urgent Help"
        disabled={finalHidden}
        style={{
          pointerEvents: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '180px',
          height: '36px',
          borderRadius: '9999px',
          padding: '0 14px',
          fontWeight: '600',
          fontSize: '14px',
          backdropFilter: 'blur(8px)',
          background: window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'color-mix(in srgb, #0b1220 70%, transparent)'
            : 'color-mix(in srgb, var(--surface, #fff) 80%, transparent)',
          boxShadow: '0 6px 20px rgba(16,24,40,.08)',
          border: window.matchMedia('(prefers-color-scheme: dark)').matches
            ? '1px solid rgba(255,255,255,.16)'
            : '1px solid rgba(16,24,40,.08)',
          color: window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'rgba(255,255,255,.92)'
            : 'inherit',
          cursor: finalHidden ? 'default' : 'pointer',
          transition: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease'
            : 'all 0.2s ease',
          gap: '8px'
        }}
        tabIndex={finalHidden ? -1 : 1000}
        onMouseEnter={(e) => {
          if (!finalHidden) {
            const target = e.target as HTMLElement;
            target.style.transform = window.matchMedia('(prefers-reduced-motion: reduce)').matches 
              ? 'none' 
              : 'translateY(-1px)';
            target.style.boxShadow = '0 8px 25px rgba(16,24,40,.12)';
          }
        }}
        onMouseLeave={(e) => {
          if (!finalHidden) {
            const target = e.target as HTMLElement;
            target.style.transform = 'none';
            target.style.boxShadow = '0 6px 20px rgba(16,24,40,.08)';
          }
        }}
        onMouseDown={(e) => {
          if (!finalHidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const target = e.target as HTMLElement;
            target.style.transform = 'scale(0.98)';
          }
        }}
        onMouseUp={(e) => {
          if (!finalHidden) {
            const target = e.target as HTMLElement;
            target.style.transform = window.matchMedia('(prefers-reduced-motion: reduce)').matches 
              ? 'none' 
              : 'translateY(-1px)';
          }
        }}
      >
        <HelpCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
        <span style={{ whiteSpace: 'nowrap' }}>Urgent Help</span>
      </button>
    </div>
  );

  return createPortal(footerContent, portalRoot);
}

// Utility function to check if an instance is already mounted
export function isSupportFooterMounted(): boolean {
  return globalInstance;
}

// Utility function to manually reset the global guard (use with caution)
export function resetSupportFooterGuard(): void {
  globalInstance = false;
  if (portalRoot && portalRoot.parentNode) {
    portalRoot.parentNode.removeChild(portalRoot);
    portalRoot = null;
  }
}