// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Unload Mind Modal
 * Allows parents to dump their thoughts and get AI-powered task categorization
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Brain, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { FocusTrap } from './FocusTrap';
import { categorizeUserInput } from '../lib/aiOrchestrator';
import { useAminyStore } from '../lib/store';
import { CONTENT } from '../lib/content';
import { toast } from 'sonner';
import type { Task as AITask } from '../lib/aiOrchestrator';

interface UnloadMindModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksCreated?: (taskCount: number) => void;
}

export function UnloadMindModal({ isOpen, onClose, onTasksCreated }: UnloadMindModalProps) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [categorizedTasks, setCategorizedTasks] = useState<AITask[]>([]);
  const [encouragement, setEncouragement] = useState('');
  const [step, setStep] = useState<'input' | 'results'>('input');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const addTask = useAminyStore(state => state.addTask);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && step === 'input') {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, step]);

  // Handle escape key (focus trap handles Tab cycling)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setInput('');
    setCategorizedTasks([]);
    setEncouragement('');
    setStep('input');
    onClose();
  };

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);

    try {
      const response = await categorizeUserInput(input.trim());

      setCategorizedTasks(response.tasks);
      setEncouragement(response.encouragement);
      setStep('results');

      // Add tasks to store
      response.tasks.forEach((task, index) => {
        addTask({
          title: task.title,
          description: task.reason,
          priority: index + 1,
          timeEstimate: task.estimatedTime,
          skillType: task.category === 'routine' ? 'routine' : undefined,
          whyItHelps: task.reason,
        });
      });

      // Notify parent component
      if (onTasksCreated) {
        onTasksCreated(response.tasks.length);
      }
    } catch (error) {
      console.error('Failed to categorize input:', error);
      toast.error(CONTENT.UNLOAD_MIND.ERROR);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'important':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'routine':
        return 'bg-[#EEF4F8] text-blue-700 border-[#C8DDE8]';
      case 'someday':
        return 'bg-[#FAF7F2] text-[#5A6B7A] border-[#E8E4DF]';
      default:
        return 'bg-[#FAF7F2] text-[#5A6B7A] border-[#E8E4DF]';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      style={{ contain: 'strict', willChange: 'opacity' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <FocusTrap active={isOpen} onEscape={handleClose}>
        <div
          ref={modalRef}
          className="bg-white rounded-2xl max-w-2xl w-full mx-auto shadow-2xl"
          style={{ contain: 'layout style', minHeight: '400px', maxHeight: '90vh', overflow: 'auto' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="unload-mind-title"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E8E4DF] p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 id="unload-mind-title" className="text-[#1B2733]">
                  {CONTENT.UNLOAD_MIND.TITLE}
                </h2>
                <p className="text-sm text-[#5A6B7A]">
                  {step === 'input' ? CONTENT.UNLOAD_MIND.SUBTITLE : 'Here\'s what I found'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-[#5A6B7A] transition-colors rounded-lg"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 md:p-6">
          {step === 'input' && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="mind-dump" className="block text-sm text-[#3A4A57] mb-2">
                  What's on your mind? (No filters, just type)
                </label>
                <textarea
                  ref={textareaRef}
                  id="mind-dump"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={CONTENT.UNLOAD_MIND.PLACEHOLDER}
                  className="w-full min-h-[200px] p-4 border border-[#E8E4DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                  style={{ fontSize: '16px' }}
                  disabled={isProcessing}
                />
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-accent/5 rounded-lg border border-accent/10">
                <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                <p className="text-sm text-[#3A4A57]">
                  I'll help you break this down into clear, actionable steps and identify what to focus on first.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  disabled={isProcessing}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isProcessing}
                  className="bg-accent hover:bg-accent/90 text-white min-h-[44px] min-w-[120px]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {CONTENT.UNLOAD_MIND.PROCESSING}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {CONTENT.UNLOAD_MIND.SUBMIT_BUTTON}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-3 sm:space-y-6">
              {/* Encouragement */}
              {encouragement && (
                <div className="p-4 bg-accent/5 rounded-xl border border-accent/10">
                  <p className="text-[#3A4A57]">{encouragement}</p>
                </div>
              )}

              {/* Tasks */}
              <div>
                <h3 className="text-[#1B2733] mb-3">Your tasks</h3>
                <div className="space-y-2">
                  {categorizedTasks.map((task, index) => (
                    <div
                      key={`${task.category}-${task.title}-${index}`}
                      className={`p-4 rounded-xl border ${
                        index === 0
                          ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                          : 'border-[#E8E4DF] bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {index === 0 && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-accent/20 rounded-full">
                                <Sparkles className="w-3 h-3 text-accent" />
                                <span className="text-xs text-accent">Top Focus</span>
                              </div>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryColor(task.category)}`}>
                              {task.category}
                            </span>
                            <span className="text-xs text-[#5A6B7A]">{task.estimatedTime}</span>
                          </div>
                          <p className="text-[#1B2733]">{task.title}</p>
                          {task.reason && (
                            <p className="text-sm text-[#5A6B7A] mt-1 italic">💡 {task.reason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  onClick={handleClose}
                  className="bg-accent hover:bg-accent/90 text-white min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      </FocusTrap>
    </div>
  );
}
