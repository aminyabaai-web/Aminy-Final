/**
 * useModal Hook
 * Reusable modal state management with accessibility support
 *
 * Replaces 400+ instances of useState(false) for modal state
 */

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseModalOptions {
  /** Initial open state */
  defaultOpen?: boolean;
  /** Callback when modal opens */
  onOpen?: () => void;
  /** Callback when modal closes */
  onClose?: () => void;
  /** Close on escape key press */
  closeOnEscape?: boolean;
  /** Close when clicking outside */
  closeOnClickOutside?: boolean;
  /** Prevent body scroll when open */
  preventScroll?: boolean;
}

interface UseModalReturn {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Open the modal */
  open: () => void;
  /** Close the modal */
  close: () => void;
  /** Toggle the modal */
  toggle: () => void;
  /** Set open state directly */
  setIsOpen: (open: boolean) => void;
  /** Props to spread on the modal backdrop */
  backdropProps: {
    onClick: (e: React.MouseEvent) => void;
    'aria-hidden': boolean;
  };
  /** Props to spread on the modal content */
  contentProps: {
    role: 'dialog';
    'aria-modal': boolean;
    tabIndex: number;
  };
  /** Ref for the modal content (for click outside detection) */
  contentRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook for managing modal state with accessibility features
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const modal = useModal({ closeOnEscape: true });
 *
 *   return (
 *     <>
 *       <button onClick={modal.open}>Open Modal</button>
 *       {modal.isOpen && (
 *         <div {...modal.backdropProps}>
 *           <div ref={modal.contentRef} {...modal.contentProps}>
 *             <h2>Modal Content</h2>
 *             <button onClick={modal.close}>Close</button>
 *           </div>
 *         </div>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useModal(options: UseModalOptions = {}): UseModalReturn {
  const {
    defaultOpen = false,
    onOpen,
    onClose,
    closeOnEscape = true,
    closeOnClickOutside = true,
    preventScroll = true,
  } = options;

  const [isOpen, setIsOpenState] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  const open = useCallback(() => {
    // Store currently focused element
    previousActiveElement.current = document.activeElement;
    setIsOpenState(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpenState(false);
    onClose?.();
    // Restore focus to previous element
    if (previousActiveElement.current instanceof HTMLElement) {
      previousActiveElement.current.focus();
    }
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const setIsOpen = useCallback((open: boolean) => {
    if (open) {
      setIsOpenState(true);
      onOpen?.();
    } else {
      setIsOpenState(false);
      onClose?.();
    }
  }, [onOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, close]);

  // Prevent body scroll
  useEffect(() => {
    if (!preventScroll) return;

    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, preventScroll]);

  // Focus trap - focus the modal content when opened
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (closeOnClickOutside && e.target === e.currentTarget) {
      close();
    }
  }, [closeOnClickOutside, close]);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
    backdropProps: {
      onClick: handleBackdropClick,
      'aria-hidden': !isOpen,
    },
    contentProps: {
      role: 'dialog',
      'aria-modal': true,
      tabIndex: -1,
    },
    contentRef,
  };
}

/**
 * Hook for managing multiple modals
 *
 * @example
 * ```tsx
 * const modals = useModals(['confirm', 'settings', 'help']);
 *
 * modals.open('confirm');
 * modals.isOpen('settings');
 * modals.close('help');
 * ```
 */
export function useModals<T extends string>(modalNames: T[]) {
  const [openModals, setOpenModals] = useState<Set<T>>(new Set());

  const open = useCallback((name: T) => {
    setOpenModals(prev => new Set(prev).add(name));
  }, []);

  const close = useCallback((name: T) => {
    setOpenModals(prev => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);

  const toggle = useCallback((name: T) => {
    setOpenModals(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const isOpen = useCallback((name: T) => openModals.has(name), [openModals]);

  const closeAll = useCallback(() => {
    setOpenModals(new Set());
  }, []);

  return {
    open,
    close,
    toggle,
    isOpen,
    closeAll,
    openModals: Array.from(openModals),
  };
}

export default useModal;
