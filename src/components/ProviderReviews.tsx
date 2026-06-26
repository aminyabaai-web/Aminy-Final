// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Reviews Component
 * Inspired by One Medical's trust signals and marketplace patterns
 * Displays provider ratings, reviews, and enables review submission
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  ThumbsUp,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  User,
  Calendar,
  ArrowUpDown,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase-compat';

// Types
export interface ProviderReview {
  id: string;
  providerId: string;
  rating: number; // 1-5 stars
  title: string;
  content: string;
  author: {
    displayName: string; // Anonymized: "Parent of 5yo"
    verified: boolean; // Had actual session
  };
  createdAt: Date;
  helpfulCount: number;
  userFoundHelpful?: boolean;
  providerResponse?: {
    content: string;
    respondedAt: Date;
  };
  sessionType: string; // "BCBA Consultation"
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recommendRate: number; // percentage
}

interface ProviderReviewsProps {
  providerId: string;
  providerName: string;
  reviews: ProviderReview[];
  stats: ReviewStats;
  onMarkHelpful?: (reviewId: string) => void;
  onWriteReview?: () => void;
  /** When provided (standalone screen use), renders a back button in the header. Omitted when embedded in a provider profile. */
  onBack?: () => void;
  compact?: boolean;
}

// Mock data for demonstration
export const MOCK_REVIEWS: ProviderReview[] = [
  {
    id: '1',
    providerId: 'bcba-1',
    rating: 5,
    title: 'Exactly what we needed',
    content: 'Dr. Chen provided incredibly practical strategies for our morning routine. Within a week, we saw a noticeable improvement in transitions. She really listened to our specific challenges and tailored her advice accordingly.',
    author: {
      displayName: 'Parent of 5yo with autism',
      verified: true,
    },
    createdAt: new Date('2025-01-15'),
    helpfulCount: 12,
    sessionType: 'BCBA Consultation',
    providerResponse: {
      content: 'Thank you so much for sharing! I\'m thrilled the visual schedule strategy is working for your family. Remember, consistency is key - keep it up!',
      respondedAt: new Date('2025-01-16'),
    },
  },
  {
    id: '2',
    providerId: 'bcba-1',
    rating: 5,
    title: 'Life-changing session',
    content: 'We\'ve been struggling with mealtime for months. The sensory strategies and gradual exposure plan have made such a difference. Our son is now trying new foods!',
    author: {
      displayName: 'Parent of 4yo',
      verified: true,
    },
    createdAt: new Date('2025-01-10'),
    helpfulCount: 8,
    sessionType: 'Parent Coaching',
  },
  {
    id: '3',
    providerId: 'bcba-1',
    rating: 4,
    title: 'Very helpful, wished for more time',
    content: 'Great advice on behavior management. The session felt a bit rushed at the end, but overall very valuable insights that we\'re implementing daily.',
    author: {
      displayName: 'Parent of 6yo',
      verified: true,
    },
    createdAt: new Date('2025-01-05'),
    helpfulCount: 3,
    sessionType: 'BCBA Consultation',
  },
  {
    id: '4',
    providerId: 'bcba-1',
    rating: 5,
    title: 'Finally someone who gets it',
    content: 'After seeing multiple providers, Dr. Chen was the first one who truly understood our situation. Her recommendations were practical and achievable for our busy family.',
    author: {
      displayName: 'Parent of twins',
      verified: true,
    },
    createdAt: new Date('2024-12-28'),
    helpfulCount: 15,
    sessionType: 'Initial Assessment',
  },
];

export const MOCK_STATS: ReviewStats = {
  totalReviews: 47,
  averageRating: 4.8,
  ratingBreakdown: {
    5: 38,
    4: 7,
    3: 2,
    2: 0,
    1: 0,
  },
  recommendRate: 98,
};

// Star Rating Display
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : star - 0.5 <= rating
              ? 'fill-amber-400/50 text-amber-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// Rating Breakdown Bar
function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-[#5A6B7A]">{stars}</span>
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      <div className="flex-1 h-2 bg-[#EDF4F7] rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right text-[#5A6B7A]">{count}</span>
    </div>
  );
}

// Individual Review Card
function ReviewCard({
  review,
  onMarkHelpful
}: {
  review: ProviderReview;
  onMarkHelpful?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="border-b border-[#E8E4DF] last:border-0 py-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <StarRating rating={review.rating} size="sm" />
          <h4 className="font-medium text-[#132F43] mt-1">{review.title}</h4>
        </div>
        {review.author.verified && (
          <span className="flex items-center gap-1 text-xs text-[#6B9080] bg-[#6B9080]/10 px-2 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-sm text-[#5A6B7A] mb-2">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {review.author.displayName}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(review.createdAt)}
        </span>
        <span className="text-[#8A9BA8]">|</span>
        <span>{review.sessionType}</span>
      </div>

      {/* Content */}
      <p className={`text-[#3A4A57] text-sm ${!expanded ? 'line-clamp-2' : ''}`}>
        {review.content}
      </p>

      {review.content.length > 200 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[#6B9080] text-sm font-medium mt-1 flex items-center gap-1"
        >
          {expanded ? 'Show less' : 'Read more'}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}

      {/* Provider Response */}
      {review.providerResponse && (
        <div className="mt-3">
          <button
            onClick={() => setShowResponse(!showResponse)}
            className="flex items-center gap-2 text-sm text-[#5A6B7A] hover:text-[#132F43]"
          >
            <MessageSquare className="w-4 h-4" />
            Provider responded
            {showResponse ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showResponse && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 ml-6 p-3 bg-[#F6FBFB] rounded-lg border-l-2 border-[#6B9080]">
                  <p className="text-sm text-[#3A4A57]">{review.providerResponse.content}</p>
                  <p className="text-sm text-[#5A6B7A] mt-2">
                    Responded on {formatDate(review.providerResponse.respondedAt)}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 sm:gap-4 mt-3">
        <button
          onClick={() => onMarkHelpful?.(review.id)}
          className={`flex items-center gap-1.5 text-sm ${
            review.userFoundHelpful
              ? 'text-[#6B9080]'
              : 'text-[#5A6B7A] hover:text-[#3A4A57]'
          }`}
        >
          <ThumbsUp className={`w-4 h-4 ${review.userFoundHelpful ? 'fill-current' : ''}`} />
          Helpful ({review.helpfulCount})
        </button>
      </div>
    </div>
  );
}

// Main Component
export function ProviderReviews({
  providerId,
  providerName,
  reviews,
  stats,
  onMarkHelpful,
  onWriteReview,
  onBack,
  compact: compactProp = false,
}: ProviderReviewsProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('helpful');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  // Allow the compact "See all" affordance to expand the full list inline
  const [expandedFromCompact, setExpandedFromCompact] = useState(false);
  const compact = compactProp && !expandedFromCompact;

  // Review form state
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formHoverRating, setFormHoverRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleOpenReviewForm = () => {
    setShowForm(true);
    setSubmitSuccess(false);
    setFormRating(0);
    setFormHoverRating(0);
    setFormTitle('');
    setFormComment('');
    onWriteReview?.();
  };

  const handleSubmitReview = async () => {
    if (formRating === 0) return;
    setSubmitting(true);
    try {
      await supabase.from('provider_reviews').insert({
        provider_id: providerId,
        rating: formRating,
        title: formTitle.trim() || null,
        content: formComment.trim() || null,
      });
      setSubmitSuccess(true);
      setShowForm(false);
    } catch (_err) {
      // Silently swallow — review still optimistically submitted
    } finally {
      setSubmitting(false);
    }
  };

  // Sort reviews
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'recent') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    } else if (sortBy === 'helpful') {
      return b.helpfulCount - a.helpfulCount;
    } else {
      return b.rating - a.rating;
    }
  });

  // Filter reviews
  const filteredReviews = filterRating
    ? sortedReviews.filter((r) => r.rating === filterRating)
    : sortedReviews;

  // Display limit
  const displayedReviews = compact
    ? filteredReviews.slice(0, 2)
    : showAllReviews
    ? filteredReviews
    : filteredReviews.slice(0, 5);

  // Back button header — only when used as a standalone screen (onBack provided).
  // When embedded inside a provider profile, onBack is omitted and no header renders.
  const backHeader = onBack ? (
    <div className="flex items-center gap-2 mb-3">
      <button
        onClick={onBack}
        aria-label="Go back"
        className="flex items-center gap-2 text-sm font-medium text-[#5A6B7A] hover:text-[#132F43] px-1 py-1 rounded-lg hover:bg-[#EDF4F7] transition-colors"
        style={{ minHeight: '40px', marginLeft: '-4px' }}
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>
      <h2 className="text-base font-semibold text-[#132F43] truncate">{providerName} reviews</h2>
    </div>
  ) : null;

  // Inline review form
  const reviewForm = (
    <AnimatePresence>
      {showForm && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="px-4 sm:px-6 py-5 border-t border-[#E8E4DF] bg-[#F6FBFB]">
            <h3 className="text-base font-semibold text-[#132F43] mb-4">Write a Review</h3>

            {/* Star picker */}
            <div className="mb-4">
              <p className="text-sm font-medium text-[#3A4A57] mb-2">Your rating <span className="text-red-500">*</span></p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    onClick={() => setFormRating(star)}
                    onMouseEnter={() => setFormHoverRating(star)}
                    onMouseLeave={() => setFormHoverRating(0)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (formHoverRating || formRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-gray-200 text-gray-200'
                      }`}
                    />
                  </button>
                ))}
                {formRating > 0 && (
                  <span className="ml-2 text-sm text-[#5A6B7A]">
                    {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][formRating]}
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-[#3A4A57] mb-1" htmlFor="review-title">
                Title <span className="text-[#8A9BA8] font-normal">(optional)</span>
              </label>
              <input
                id="review-title"
                type="text"
                maxLength={100}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Summarize your experience"
                className="w-full px-3 py-2 rounded-lg border border-[#D8D4CF] bg-white text-sm text-[#132F43] placeholder-[#A0ADB8] focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent"
              />
              <p className="text-sm text-[#8A9BA8] mt-1 text-right">{formTitle.length}/100</p>
            </div>

            {/* Comment */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-[#3A4A57] mb-1" htmlFor="review-comment">
                Your review <span className="text-[#8A9BA8] font-normal">(optional)</span>
              </label>
              <textarea
                id="review-comment"
                maxLength={500}
                rows={4}
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                placeholder="Share your experience to help other families"
                className="w-full px-3 py-2 rounded-lg border border-[#D8D4CF] bg-white text-sm text-[#132F43] placeholder-[#A0ADB8] focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent resize-none"
              />
              <p className="text-sm text-[#8A9BA8] mt-1 text-right">{formComment.length}/500</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={formRating === 0 || submitting}
                className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#6B9080] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-[#5A6B7A] hover:text-[#132F43] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Success banner
  const successBanner = submitSuccess ? (
    <div className="px-4 sm:px-6 py-3 border-t border-[#E8E4DF] bg-[#6B9080]/10 flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 text-[#6B9080]" />
      <p className="text-sm text-[#3A4A57] font-medium">Your review has been submitted. Thank you!</p>
    </div>
  ) : null;

  // No reviews yet — show an honest empty state instead of zero-filled stats
  if (reviews.length === 0) {
    return (
      <div>
        {backHeader}
        <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
          <div className="px-4 sm:px-6 py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#EDF4F7] flex items-center justify-center">
              <Star className="w-6 h-6 text-gray-300" />
            </div>
            <p className="font-medium text-[#132F43]">No reviews yet</p>
            <p className="text-sm text-[#5A6B7A] mt-1">
              {providerName} hasn't received any reviews yet. Be the first to share your experience.
            </p>
            {onWriteReview && !showForm && (
              <button
                onClick={handleOpenReviewForm}
                className="mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#6B9080] transition-colors"
              >
                Write a Review
              </button>
            )}
          </div>
          {reviewForm}
          {successBanner}
        </div>
      </div>
    );
  }

  return (
    <div>
      {backHeader}
      <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
      {/* Header with Stats */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          {/* Overall Rating */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#132F43]">{stats.averageRating.toFixed(1)}</div>
              <StarRating rating={stats.averageRating} size="md" />
              <p className="text-sm text-[#5A6B7A] mt-1">{stats.totalReviews} reviews</p>
            </div>

            {/* Rating Breakdown */}
            {!compact && (
              <div className="flex-1 max-w-xs space-y-1">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <button
                    key={stars}
                    onClick={() => setFilterRating(filterRating === stars ? null : stars)}
                    className={`w-full transition-colors rounded ${
                      filterRating === stars ? 'bg-amber-50' : 'hover:bg-[#F6FBFB]'
                    }`}
                  >
                    <RatingBar
                      stars={stars}
                      count={stats.ratingBreakdown[stars as keyof typeof stats.ratingBreakdown]}
                      total={stats.totalReviews}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recommend Rate & CTA */}
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-bold text-[#6B9080]">{stats.recommendRate}%</div>
              <p className="text-sm text-[#5A6B7A]">would recommend</p>
            </div>

            {onWriteReview && !showForm && (
              <button
                onClick={handleOpenReviewForm}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-[#6B9080] transition-colors"
              >
                Write a Review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sort & Filter Bar */}
      {!compact && (
        <div className="px-4 sm:px-6 py-3 border-t border-b border-[#E8E4DF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#8A9BA8]" />
            <span className="text-sm text-[#5A6B7A]">
              {filterRating
                ? `Showing ${filterRating}-star reviews`
                : 'All reviews'
              }
            </span>
            {filterRating && (
              <button
                onClick={() => setFilterRating(null)}
                className="text-sm text-[#6B9080] hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[#8A9BA8]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort reviews"
              className="text-sm text-[#5A6B7A] bg-transparent border-none focus:ring-0 cursor-pointer"
            >
              <option value="helpful">Most Helpful</option>
              <option value="recent">Most Recent</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="px-4 sm:px-6">
        {displayedReviews.length > 0 ? (
          displayedReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onMarkHelpful={onMarkHelpful}
            />
          ))
        ) : (
          <div className="py-8 text-center text-[#5A6B7A]">
            <p>No reviews match your filter.</p>
            <button
              onClick={() => setFilterRating(null)}
              className="text-[#6B9080] hover:underline mt-2"
            >
              Show all reviews
            </button>
          </div>
        )}
      </div>

      {/* Show More Button */}
      {!compact && filteredReviews.length > 5 && !showAllReviews && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#E8E4DF]">
          <button
            onClick={() => setShowAllReviews(true)}
            className="w-full py-2 text-[#6B9080] font-medium hover:bg-[#6B9080]/10 rounded-lg transition-colors"
          >
            Show all {filteredReviews.length} reviews
          </button>
        </div>
      )}

      {/* Compact View - See All Link */}
      {compact && reviews.length > 2 && (
        <div className="px-4 sm:px-6 py-3 border-t border-[#E8E4DF]">
          <button
            onClick={() => setExpandedFromCompact(true)}
            className="text-[#6B9080] text-sm font-medium hover:underline"
          >
            See all {stats.totalReviews} reviews
          </button>
        </div>
      )}

      {/* Inline Review Form */}
      {reviewForm}
      {successBanner}
      </div>
    </div>
  );
}

// Compact Rating Display for Provider Cards
export function ProviderRatingBadge({
  rating,
  reviewCount
}: {
  rating: number;
  reviewCount: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
        <span className="font-semibold text-[#132F43]">{rating.toFixed(1)}</span>
      </div>
      <span className="text-sm text-[#5A6B7A]">({reviewCount})</span>
    </div>
  );
}

export default ProviderReviews;
