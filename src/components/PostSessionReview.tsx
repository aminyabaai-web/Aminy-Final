// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

import React, { useState } from 'react';
import { Star, X, Send } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface PostSessionReviewProps {
  providerId: string;
  providerName: string;
  sessionDate: string;
  userId: string;
  onClose: () => void;
}

export default function PostSessionReview({ providerId, providerName, sessionDate, userId, onClose }: PostSessionReviewProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await supabase.from('provider_reviews').insert({
        provider_id: providerId,
        reviewer_user_id: userId,
        rating,
        comment: comment.trim() || null,
        is_anonymous: true,
        is_visible: true,
        session_date: sessionDate,
        created_at: new Date().toISOString(),
      });
      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch {
      // fire-and-forget — don't block user
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center pb-8 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
          <div className="text-3xl mb-2">🎉</div>
          <p className="font-semibold text-[#132F43]">Thanks for your feedback!</p>
          <p className="text-sm text-[#5A6B7A] mt-1">It helps families find great providers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/50 flex items-end justify-center px-4 pb-8">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-[#132F43]">How was your session?</p>
            <p className="text-sm text-[#5A6B7A]">with {providerName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#EDF4F7] text-[#5A6B7A]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className="w-9 h-9"
                fill={(hovered || rating) >= star ? '#2A7D99' : 'none'}
                stroke={(hovered || rating) >= star ? '#2A7D99' : '#CBD5E1'}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything you'd like to share? (optional)"
            className="w-full px-3 py-2.5 text-sm border border-[#E8E4DF] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#2A7D99] mb-4"
            rows={3}
            maxLength={500}
          />
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm text-[#5A6B7A] border border-[#E8E4DF] hover:bg-[#F6FBFB] transition-colors">
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: rating ? '#2A7D99' : undefined, color: rating ? 'white' : undefined }}
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Saving...' : 'Submit'}
          </button>
        </div>
        <p className="text-sm text-[#5A6B7A] text-center mt-3">Your review is anonymous and helps other families.</p>
      </div>
    </div>
  );
}
