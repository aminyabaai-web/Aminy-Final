// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Floating Feedback Button
 * Always visible on all pages, allows users to report issues or suggestions
 */

import React, { useState } from 'react';
import { MessageCircle, X, Send, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { submitFeedback } from '@/lib/error-logging';
import { toast } from 'sonner';

type FeedbackType = 'bug' | 'suggestion' | 'question' | 'other';

const feedbackTypes: { type: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'bug', label: 'Report a bug', icon: <Bug className="w-4 h-4" />, color: 'text-red-500' },
  { type: 'suggestion', label: 'Suggestion', icon: <Lightbulb className="w-4 h-4" />, color: 'text-yellow-500' },
  { type: 'question', label: 'Question', icon: <HelpCircle className="w-4 h-4" />, color: 'text-blue-500' },
];

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedType, setSelectedType] = useState<FeedbackType>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    const result = await submitFeedback(message.trim(), selectedType);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Thank you for your feedback! We appreciate you helping us improve.');
      setMessage('');
      setSelectedType('other');
      setIsOpen(false);
    } else {
      toast.error(result.error || 'Failed to submit feedback. Please try again.');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessage('');
    setSelectedType('other');
  };

  return (
    <>
      {/* Floating button - fixed position, always visible */}
      <button
        onClick={() => setIsOpen(true)}
        className="group fixed bottom-20 right-4 z-40 flex h-12 items-center justify-center gap-2 rounded-full border border-white/80 bg-white px-4 text-[#3A4A57] shadow-[0_16px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#FAF7F2]"
        aria-label="Send feedback"
        title="Send feedback"
      >
        <MessageCircle className="w-5 h-5 text-[#6B9080] group-hover:scale-110 transition-transform" />
        <span className="hidden text-sm font-medium sm:inline">Feedback</span>
      </button>

      {/* Feedback modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md mx-0 sm:mx-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1B2733]">Share Feedback</h3>
              <button
                onClick={handleClose}
                aria-label="Close feedback"
                className="h-11 w-11 hover:bg-[#F0EDE8] rounded-full transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5 text-[#5A6B7A]" />
              </button>
            </div>

            {/* Feedback type selector */}
            <div className="flex gap-2 mb-4">
              {feedbackTypes.map(({ type, label, icon, color }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedType === type
                      ? 'bg-gray-900 text-white'
                      : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#E8E4DF]'
                  }`}
                >
                  <span className={selectedType === type ? 'text-white' : color}>
                    {icon}
                  </span>
                  {label}
                </button>
              ))}
            </div>

            {/* Message input */}
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                selectedType === 'bug'
                  ? "Describe what happened and what you expected to happen..."
                  : selectedType === 'suggestion'
                  ? "What would make Aminy better for you?"
                  : selectedType === 'question'
                  ? "What would you like to know?"
                  : "Tell us anything on your mind..."
              }
              rows={4}
              className="mb-4 resize-none"
              autoFocus
            />

            {/* Context info */}
            <p className="text-sm text-[#8A9BA8] mb-4">
              Your current page will be included to help us understand the context.
            </p>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
              className="w-full bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] hover:from-teal-700 hover:to-cyan-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Button>

            {/* Warm footer message */}
            <p className="mt-3 text-center text-sm text-[#8A9BA8]">
              We read every message. Thank you for helping us keep Aminy calmer and clearer.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackButton;
