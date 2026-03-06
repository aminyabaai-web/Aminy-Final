import React, { ReactNode } from 'react';
import { FocusTrap } from './FocusTrap';

interface ModalOverlayProps {
  children: ReactNode;
  /** Called when user presses Escape or clicks the backdrop */
  onClose?: () => void;
  /** Additional classes on the backdrop container */
  className?: string;
  /** Whether focus trapping is active (default: true) */
  trapFocus?: boolean;
  /** aria-label for screen readers */
  'aria-label'?: string;
}

/**
 * Accessible modal overlay with:
 * - Focus trapping (Tab/Shift+Tab cycle within modal)
 * - Escape key to dismiss
 * - Click-outside-to-close on backdrop
 * - Proper ARIA role and labeling
 * - Focus restoration on unmount
 *
 * Usage:
 *   <ModalOverlay onClose={handleClose} aria-label="Confirm deletion">
 *     <div className="bg-white rounded-xl p-6">...content...</div>
 *   </ModalOverlay>
 */
export function ModalOverlay({
  children,
  onClose,
  className = '',
  trapFocus = true,
  'aria-label': ariaLabel,
}: ModalOverlayProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not its children
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <FocusTrap active={trapFocus} onEscape={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || 'Modal dialog'}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${className}`}
        onClick={handleBackdropClick}
      >
        {children}
      </div>
    </FocusTrap>
  );
}
