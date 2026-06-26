// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * DataConfirmationModal — "Ready for Review" inbox (Bevel-style).
 *
 * When Aminy AI extracts structured data from chat (incidents, meds,
 * insurance, profile updates, etc.) some items need explicit user
 * confirmation before persisting. They accumulate as "pending" and
 * surface here as a slide-up bottom sheet — one card per item, with
 * a category icon-square, headline, raw quote, structured preview,
 * and Confirm / Skip actions. Matches Bevel's Health Records review
 * pattern (status pill + tidy card stack).
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  ChevronDown,
  AlertCircle,
  Pill,
  Shield,
  Baby,
  Stethoscope,
  GraduationCap,
  Apple,
  Target,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type { ExtractedDataPoint, DataCategory } from '../lib/chat-to-data-pipeline';

interface DataConfirmationModalProps {
  isOpen: boolean;
  pending: ExtractedDataPoint[];
  onConfirm: (item: ExtractedDataPoint) => void | Promise<void>;
  onSkip: (item: ExtractedDataPoint) => void;
  onConfirmAll: (items: ExtractedDataPoint[]) => void | Promise<void>;
  onClose: () => void;
}

interface CategoryStyle {
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string; // background
  iconColor: string;
}

const CATEGORY_STYLES: Record<DataCategory, CategoryStyle> = {
  incident:        { label: 'Behavioral incident', icon: AlertCircle,    color: '#E07A5F', iconColor: '#fff' },
  medication:      { label: 'Medication',          icon: Pill,           color: '#4795AE', iconColor: '#fff' },
  'goal-progress': { label: 'Goal progress',       icon: Target,         color: '#2A7D99', iconColor: '#fff' },
  insurance:       { label: 'Insurance',           icon: Shield,         color: '#216982', iconColor: '#fff' },
  routine:         { label: 'Daily routine',       icon: Calendar,       color: '#D4A373', iconColor: '#fff' },
  trigger:         { label: 'Trigger',             icon: AlertCircle,    color: '#E07A5F', iconColor: '#fff' },
  strategy:        { label: 'Effective strategy',  icon: Sparkles,       color: '#2A7D99', iconColor: '#fff' },
  appointment:     { label: 'Appointment',         icon: Calendar,       color: '#216982', iconColor: '#fff' },
  'provider-note': { label: 'Provider note',       icon: Stethoscope,    color: '#4795AE', iconColor: '#fff' },
  'child-profile': { label: 'Profile update',      icon: Baby,           color: '#2A7D99', iconColor: '#fff' },
  preference:      { label: 'Preference',          icon: Sparkles,       color: '#2A7D99', iconColor: '#fff' },
  milestone:       { label: 'Milestone',           icon: Sparkles,       color: '#2A7D99', iconColor: '#fff' },
  concern:         { label: 'Concern',             icon: AlertCircle,    color: '#E07A5F', iconColor: '#fff' },
  school:          { label: 'School',              icon: GraduationCap,  color: '#216982', iconColor: '#fff' },
  diet:            { label: 'Nutrition',           icon: Apple,          color: '#D4A373', iconColor: '#fff' },
};

export function DataConfirmationModal({
  isOpen,
  pending,
  onConfirm,
  onSkip,
  onConfirmAll,
  onClose,
}: DataConfirmationModalProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [processing, setProcessing] = useState<Set<number>>(new Set());

  const handleConfirm = async (item: ExtractedDataPoint, index: number) => {
    setProcessing((s) => new Set(s).add(index));
    try {
      await onConfirm(item);
    } finally {
      setProcessing((s) => {
        const next = new Set(s);
        next.delete(index);
        return next;
      });
    }
  };

  const handleConfirmAll = async () => {
    await onConfirmAll(pending);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-[#FAF7F2] rounded-t-3xl border-t border-[#F0EDE8] flex flex-col max-h-[88vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="data-confirm-title"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle */}
            <div className="pt-2 pb-1 flex justify-center" aria-hidden="true">
              <div className="w-10 h-1 rounded-full bg-[#F0EDE8]" />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4 flex items-start justify-between border-b border-[#F0EDE8]">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#6B9080]/10 text-[#6B9080] text-xs font-semibold tracking-wider uppercase mb-1.5">
                  <Sparkles className="w-3 h-3" />
                  Ready for review
                </div>
                <h2 id="data-confirm-title" className="text-lg font-semibold text-[#1B2733] leading-tight">
                  {pending.length === 1
                    ? 'Aminy heard something — want to save it?'
                    : `Aminy heard ${pending.length} things — want to save them?`}
                </h2>
                <p className="mt-1 text-sm text-[#8E9BAA] leading-relaxed">
                  Confirm what's accurate. We'll only save what you approve.
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-3 w-9 h-9 rounded-full hover:bg-[#F0EDE8] flex items-center justify-center flex-shrink-0 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[#5A6B7A]" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {pending.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#2A7D99]/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-[#2A7D99]" />
                  </div>
                  <p className="text-sm font-medium text-[#1B2733]">All caught up</p>
                  <p className="mt-1 text-sm text-[#8E9BAA]">Nothing waiting on your review.</p>
                </div>
              ) : (
                pending.map((item, i) => (
                  <ItemCard
                    key={`${item.category}-${i}`}
                    item={item}
                    index={i}
                    expanded={expandedIndex === i}
                    onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
                    onConfirm={() => handleConfirm(item, i)}
                    onSkip={() => onSkip(item)}
                    isProcessing={processing.has(i)}
                  />
                ))
              )}
            </div>

            {/* Footer actions */}
            {pending.length > 1 && (
              <div className="px-5 py-3 border-t border-[#F0EDE8] flex items-center gap-2"
                   style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-white border border-[#F0EDE8] text-sm font-medium text-[#5A6B7A] hover:bg-[#F0EDE8] active:scale-[0.99] transition-all"
                >
                  Review later
                </button>
                <button
                  onClick={handleConfirmAll}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] text-white text-sm font-semibold active:scale-[0.99] transition-transform"
                >
                  Save all {pending.length}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface ItemCardProps {
  item: ExtractedDataPoint;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onConfirm: () => void;
  onSkip: () => void;
  isProcessing: boolean;
}

function ItemCard({ item, expanded, onToggle, onConfirm, onSkip, isProcessing }: ItemCardProps) {
  const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.preference;
  const Icon = style.icon;
  const confidenceLabel = item.confidence >= 0.8
    ? 'High confidence'
    : item.confidence >= 0.65
      ? 'Likely match'
      : 'Best guess';
  const confidenceColor = item.confidence >= 0.8
    ? '#2A7D99'
    : item.confidence >= 0.65
      ? '#2A7D99'
      : '#D4A373';

  const previewEntries = Object.entries(item.structuredData)
    .filter(([_, v]) => v !== '' && v != null)
    .slice(0, 4);

  return (
    <div className="rounded-2xl bg-white border border-[#F0EDE8] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 text-left active:bg-[#FAF7F2] transition-colors"
        aria-expanded={expanded}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: style.color }}
        >
          <Icon className="w-4 h-4" style={{ color: style.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#1B2733]">{style.label}</p>
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: `${confidenceColor}15`, color: confidenceColor }}
            >
              {confidenceLabel}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[#5A6B7A] leading-snug">
            {item.suggestedAction}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#8E9BAA] flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-[#F0EDE8] space-y-3 pt-3">
          {/* Quote of raw text */}
          <div className="rounded-xl bg-[#FAF7F2] border border-[#F0EDE8] px-3 py-2">
            <p className="text-xs font-semibold tracking-wider text-[#8E9BAA] uppercase mb-1">
              You said
            </p>
            <p className="text-sm text-[#1B2733] leading-snug italic">
              "{item.rawText}"
            </p>
          </div>

          {/* Structured data preview */}
          {previewEntries.length > 0 && (
            <div className="rounded-xl bg-[#FAF7F2] border border-[#F0EDE8] px-3 py-2">
              <p className="text-xs font-semibold tracking-wider text-[#8E9BAA] uppercase mb-1.5">
                What we'll save
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {previewEntries.map(([key, value]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-sm text-[#8E9BAA] capitalize truncate">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </dt>
                    <dd className="text-sm font-medium text-[#1B2733] truncate">
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Per-item actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-xl bg-white border border-[#F0EDE8] text-sm font-medium text-[#5A6B7A] hover:bg-[#FAF7F2] active:scale-[0.99] transition-all disabled:opacity-40"
            >
              Skip
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold active:scale-[0.99] transition-transform disabled:opacity-60"
            >
              {isProcessing ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataConfirmationModal;
