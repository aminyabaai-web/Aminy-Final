// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useEffect } from 'react';
import { Button } from './ui/button';
import { CrisisResources } from './GlobalDisclaimer';
import {
  X,
  AlertTriangle
} from 'lucide-react';

export interface UrgentHelpModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onAnalytics?: (event: string, data: Record<string, unknown>) => void;
}

export function UrgentHelpModal({ isOpen = true, onClose, onAnalytics = () => {} }: UrgentHelpModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
        onAnalytics('urgent_help_closed', { method: 'escape_key' });
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, onAnalytics]);

  const handleClose = () => {
    onClose();
    onAnalytics('urgent_help_closed', { method: 'close_button' });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="urgent-help-title"
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 id="urgent-help-title" className="text-lg sm:text-xl font-semibold text-red-900">
                Urgent Help
              </h2>
              <p className="text-sm text-red-700">
                Emergency resources & support
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-2 hover:bg-red-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label="Close urgent help"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 md:p-6">
          <CrisisResources />
        </div>
      </div>
    </div>
  );
}