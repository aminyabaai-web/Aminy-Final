/**
 * Session Bundles Component
 * Displays discounted session packages for the telehealth marketplace
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Package,
  Star,
  Check,
  Clock,
  Calendar,
  Zap,
  Sparkles,
  Users,
  ChevronRight,
  Loader2,
  CreditCard,
} from 'lucide-react';
import { SESSION_BUNDLES, SessionBundle } from '../types/telehealth';
import { createBundleCheckoutSession, BUNDLE_STRIPE_PRICES } from '../lib/stripe-service';

interface SessionBundlesProps {
  onSelectBundle: (bundle: SessionBundle) => void;
  onPurchaseBundle?: (bundle: SessionBundle) => Promise<void>;
  userId?: string;
  userTier?: string;
  showCompact?: boolean;
}

export function SessionBundles({
  onSelectBundle,
  onPurchaseBundle,
  userId,
  userTier,
  showCompact = false,
}: SessionBundlesProps) {
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [purchasingBundle, setPurchasingBundle] = useState<string | null>(null);

  const handleSelect = (bundle: SessionBundle) => {
    setSelectedBundle(bundle.id);
    onSelectBundle(bundle);
  };

  // Handle Stripe checkout
  const handlePurchase = async (bundle: SessionBundle) => {
    if (!userId) {
      // Redirect to login/signup
      alert('Please sign in to purchase a bundle');
      return;
    }

    setPurchasingBundle(bundle.id);

    try {
      if (onPurchaseBundle) {
        await onPurchaseBundle(bundle);
      } else {
        // Get user email from localStorage or context
        const userEmail = localStorage.getItem('user_email') || 'user@example.com';

        // Use the centralized Stripe service
        const { url } = await createBundleCheckoutSession({
          userId,
          email: userEmail,
          bundleId: bundle.id,
          bundlePrice: bundle.bundlePrice,
          consultCredits: bundle.consultSessions,
          deepReviewCredits: bundle.deepReviewSessions,
          validityDays: bundle.validityDays,
        });

        // Redirect to Stripe checkout
        if (url) {
          window.location.href = url;
        } else {
          // For demo/dev mode without real Stripe
          console.log('Demo mode: Would redirect to Stripe checkout for bundle:', bundle.id);
          alert(`Bundle "${bundle.name}" selected! In production with Stripe configured, this would redirect to checkout.`);
          setSelectedBundle(bundle.id);
        }
      }
    } catch (error) {
      console.error('Error purchasing bundle:', error);
      alert('Failed to initiate checkout. Please try again.');
    } finally {
      setPurchasingBundle(null);
    }
  };

  if (showCompact) {
    // Compact view for sidebar or widget
    return (
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Session Bundles</h3>
            <p className="text-sm text-purple-700">Save up to 20% with packages</p>
          </div>
        </div>
        <div className="space-y-2">
          {SESSION_BUNDLES.filter((b) => b.recommended).map((bundle) => (
            <button
              key={bundle.id}
              onClick={() => handleSelect(bundle)}
              className="w-full p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{bundle.name}</div>
                  <div className="text-sm text-gray-500">
                    Save {bundle.savingsPercent}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-purple-600">${bundle.bundlePrice}</div>
                  <div className="text-xs text-gray-400 line-through">
                    ${bundle.regularPrice}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <Button variant="link" className="w-full mt-2 text-purple-600">
          View all bundles
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </Card>
    );
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Badge className="bg-purple-100 text-purple-800 mb-3">
          <Sparkles className="w-3 h-3 mr-1" />
          Save with Bundles
        </Badge>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Session Packages
        </h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Get more support at a better price. All bundles include flexible scheduling
          with any of our expert providers.
        </p>
      </div>

      {/* Bundle Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SESSION_BUNDLES.map((bundle, index) => {
          const isSelected = selectedBundle === bundle.id;

          return (
            <motion.div
              key={bundle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`p-5 relative cursor-pointer transition-all hover:shadow-lg ${
                  bundle.recommended
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50'
                    : isSelected
                    ? 'border-teal-500 bg-teal-50'
                    : 'hover:border-gray-300'
                }`}
                onClick={() => handleSelect(bundle)}
              >
                {/* Recommended badge */}
                {bundle.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                {/* Bundle header */}
                <div className="mb-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    {bundle.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {bundle.description}
                  </p>
                </div>

                {/* Sessions included */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  {bundle.consultSessions > 0 && (
                    <div className="flex items-center gap-1 text-gray-700">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>{bundle.consultSessions}× 25-min</span>
                    </div>
                  )}
                  {bundle.deepReviewSessions > 0 && (
                    <div className="flex items-center gap-1 text-gray-700">
                      <Users className="w-4 h-4 text-green-500" />
                      <span>{bundle.deepReviewSessions}× 50-min</span>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    ${bundle.bundlePrice}
                  </span>
                  <span className="text-sm text-gray-400 line-through mb-1">
                    ${bundle.regularPrice}
                  </span>
                  <Badge className="bg-green-100 text-green-700 mb-1">
                    Save {bundle.savingsPercent}%
                  </Badge>
                </div>

                {/* Features */}
                <div className="space-y-2 mb-4">
                  {bundle.features.slice(0, 4).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Validity */}
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                  <Calendar className="w-3 h-3" />
                  <span>Valid for {bundle.validityDays} days</span>
                </div>

                {/* CTA */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePurchase(bundle);
                  }}
                  disabled={purchasingBundle === bundle.id}
                  className={`w-full ${
                    bundle.recommended
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  {purchasingBundle === bundle.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Purchase Bundle
                    </>
                  )}
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Single session option */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Not ready for a bundle?{' '}
          <button className="text-teal-600 hover:underline">
            Book a single session instead
          </button>
        </p>
      </div>
    </div>
  );
}

/**
 * User's Bundle Credits Display
 */
interface BundleCreditsProps {
  consultCredits: number;
  deepReviewCredits: number;
  expiresAt: string;
  onBookSession: (type: 'consult' | 'deep-review') => void;
}

export function BundleCredits({
  consultCredits,
  deepReviewCredits,
  expiresAt,
  onBookSession,
}: BundleCreditsProps) {
  const expiryDate = new Date(expiresAt);
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = daysUntilExpiry <= 14;

  return (
    <Card className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Package className="w-5 h-5 text-teal-600" />
          </div>
          <h3 className="font-semibold text-teal-900">Your Session Credits</h3>
        </div>
        {isExpiringSoon && (
          <Badge className="bg-amber-100 text-amber-700">
            Expires in {daysUntilExpiry} days
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white p-3 rounded-lg border border-teal-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600">25-min Consults</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {consultCredits}
          </div>
          <Button
            variant="link"
            className="p-0 h-auto text-sm text-teal-600"
            onClick={() => onBookSession('consult')}
            disabled={consultCredits === 0}
          >
            Book now →
          </Button>
        </div>

        <div className="bg-white p-3 rounded-lg border border-teal-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">50-min Reviews</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {deepReviewCredits}
          </div>
          <Button
            variant="link"
            className="p-0 h-auto text-sm text-teal-600"
            onClick={() => onBookSession('deep-review')}
            disabled={deepReviewCredits === 0}
          >
            Book now →
          </Button>
        </div>
      </div>

      <p className="text-xs text-teal-700">
        Credits expire on {expiryDate.toLocaleDateString()}. Use them with any provider!
      </p>
    </Card>
  );
}

export default SessionBundles;
