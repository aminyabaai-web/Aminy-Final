import React, { useEffect, useState } from 'react';
// @ts-expect-error - @types/react-dom not installed
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface SupportSafetyPortalProps {
  modalOpen?: boolean;
  sheetOpen?: boolean;
  keyboardOpen?: boolean;
  hasBottomNav?: boolean;
  onHelpOpen: () => void;
}

export const SupportSafetyPortal: React.FC<SupportSafetyPortalProps> = ({
  modalOpen = false,
  sheetOpen = false,
  keyboardOpen = false,
  hasBottomNav = false,
  onHelpOpen
}) => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(true);

  // Find or create portal root
  useEffect(() => {
    const root = document.getElementById('safety-portal-root');
    setPortalRoot(root);
  }, []);

  // Update CSS variables and visibility
  useEffect(() => {
    // Set data attribute for CSS targeting
    document.body.dataset.hasNav = hasBottomNav ? 'true' : 'false';
    
    // Hide when overlays are active
    const shouldHide = modalOpen || sheetOpen || keyboardOpen;
    setVisible(!shouldHide);

    // Analytics - when visible
    if (!shouldHide) {
    }
  }, [modalOpen, sheetOpen, keyboardOpen, hasBottomNav]);

  const handleClick = () => {
    // Analytics - on click
    
    // Close any residual backdrops/sheets first
    const backdrops = document.querySelectorAll('[role="dialog"], .modal-backdrop, .sheet-backdrop');
    backdrops.forEach(backdrop => {
      if (backdrop instanceof HTMLElement) {
        backdrop.click();
      }
    });
    
    // Then open help
    onHelpOpen();
  };

  const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // ESC closes Help Center if open, otherwise no effect
      const helpCenter = document.querySelector('[data-help-center]');
      if (helpCenter) {
        const closeButton = helpCenter.querySelector('button[aria-label*="close"]');
        if (closeButton instanceof HTMLElement) {
          closeButton.click();
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

  // Don't render if portal root not available or should be hidden
  if (!portalRoot || !visible) {
    return null;
  }

  return createPortal(
    <button
      className="safetyChip"
      onClick={handleClick}
      role="button"
      aria-label="Urgent Help"
    >
      <HelpCircle className="w-4 h-4 flex-shrink-0" />
      <span className="whitespace-nowrap">Urgent Help</span>
    </button>,
    portalRoot
  );
};