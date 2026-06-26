// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * App Review Prompt UI Component (v2)
 *
 * A delightful, non-intrusive modal asking users to rate the app.
 * Only shown when useAppReviewPrompt() determines the user is
 * in a positive state and has had enough engagement (3+ positive
 * sessions in the last 7 days or 2+ legacy positive signals).
 *
 * Includes direct App Store / Play Store links for PWA users.
 */

import { useState } from 'react';
import { Star, Heart, X, ExternalLink } from 'lucide-react';
import { useAppReviewPrompt } from '../hooks/useAppReviewPrompt';

// Store links — replace IDs once published
const STORE_LINKS = {
  ios: 'https://apps.apple.com/app/aminy/id0000000000?action=write-review',
  android:
    'https://play.google.com/store/apps/details?id=app.aminy&showAllReviews=true',
  web: 'https://aminy.app/review',
};

function getStoreLink(): { url: string; label: string } {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  if (isIOS) return { url: STORE_LINKS.ios, label: 'App Store' };
  if (isAndroid) return { url: STORE_LINKS.android, label: 'Play Store' };
  return { url: STORE_LINKS.web, label: 'our website' };
}

export function AppReviewPrompt() {
  const { shouldShowPrompt, triggerReview, dismissPrompt, neverAskAgain } =
    useAppReviewPrompt();
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  if (!shouldShowPrompt) return null;

  const store = getStoreLink();

  const handleRatingClick = (rating: number) => {
    setSelectedRating(rating);
    if (rating >= 4) {
      // Good rating  -- route to store
      setTimeout(() => triggerReview(), 800);
    } else {
      // Lower rating -- ask for feedback internally (don't send to store)
      setTimeout(() => {
        dismissPrompt();
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="rounded-2xl bg-white shadow-2xl border border-[#E8E4DF] p-5 relative max-w-sm w-full">
        {/* Close button */}
        <button
          onClick={dismissPrompt}
          className="absolute right-3 top-3 p-1.5 rounded-full text-[#8A9BA8] hover:text-[#5A6B7A] hover:bg-[#EDF4F7] transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>

        <div className="text-center">
          {/* Heart icon */}
          <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
          </div>

          <h3 className="text-base font-semibold text-[#132F43] mb-1">
            Enjoying Aminy?
          </h3>
          <p className="text-sm text-[#5A6B7A] mb-4">
            Your review helps other autism families discover us
          </p>

          {/* Star rating */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleRatingClick(rating)}
                onMouseEnter={() => setHoveredRating(rating)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110 active:scale-95"
                aria-label={`Rate ${rating} stars`}
              >
                <Star
                  size={28}
                  className={`transition-colors ${
                    rating <= (hoveredRating || selectedRating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-[#8A9BA8]'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Selected feedback */}
          {selectedRating > 0 && selectedRating < 4 && (
            <p className="text-sm text-[#5A6B7A] mb-3 animate-in fade-in">
              Thank you for your feedback. We&apos;ll use it to improve!
            </p>
          )}
          {selectedRating >= 4 && (
            <div className="flex flex-col items-center gap-2 mb-3 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-sm text-[#6B9080]">
                <ExternalLink size={12} />
                <span>Taking you to leave a review...</span>
              </div>
              <a
                href={store.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#6B9080] underline"
              >
                Leave a review on {store.label}
              </a>
            </div>
          )}

          {/* Don't ask again */}
          <button
            onClick={neverAskAgain}
            className="text-sm text-[#8A9BA8] hover:text-[#5A6B7A] transition-colors"
          >
            Don&apos;t ask me again
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppReviewPrompt;
