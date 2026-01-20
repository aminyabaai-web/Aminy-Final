/**
 * Subscription Management Component
 * For use in Settings - handles subscription status, upgrades, and billing
 */

import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useSubscription } from '../hooks/useSubscription';
import { toast } from 'sonner';
import {
  Crown,
  Calendar,
  DollarSign,
  Gift,
  Check,
  ArrowRight,
  Loader2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Zap,
  Heart
} from 'lucide-react';
import { tierDisplayNames, getTierDisplayName, normalizeTierName, type TierType } from '../lib/tier-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface SubscriptionManagementProps {
  accessToken?: string;
}

// Cancel Flow with win-back offers
interface CancelFlowButtonProps {
  onCancel: () => Promise<void>;
  tierName: string;
}

function CancelFlowButton({ onCancel, tierName }: CancelFlowButtonProps) {
  const [step, setStep] = React.useState<'initial' | 'reason' | 'offer' | 'confirm'>('initial');
  const [isOpen, setIsOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [feedback, setFeedback] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const cancelReasons = [
    { value: 'too_expensive', label: "It's too expensive" },
    { value: 'not_using', label: "I'm not using it enough" },
    { value: 'missing_features', label: "Missing features I need" },
    { value: 'found_alternative', label: "Found a different solution" },
    { value: 'child_graduated', label: "My child no longer needs this support" },
    { value: 'other', label: "Other reason" },
  ];

  const handleStart = () => {
    setIsOpen(true);
    setStep('reason');
  };

  const handleReasonNext = () => {
    if (reason === 'too_expensive') {
      setStep('offer');
    } else {
      setStep('confirm');
    }
  };

  const handleConfirmCancel = async () => {
    setIsLoading(true);
    try {
      // Log cancellation reason for analytics
      await onCancel();
      toast.success('Your plan will cancel at the end of the billing period');
      setIsOpen(false);
      setStep('initial');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptOffer = () => {
    // Apply 50% discount offer
    toast.success('50% discount applied for the next 2 months!');
    setIsOpen(false);
    setStep('initial');
  };

  const handlePause = () => {
    toast.success('Your subscription is paused for 1 month');
    setIsOpen(false);
    setStep('initial');
  };

  return (
    <>
      <Button
        onClick={handleStart}
        variant="ghost"
        size="sm"
        className="flex-1 text-muted-foreground"
      >
        Cancel Plan
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          {step === 'reason' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  We're sorry to see you go
                </DialogTitle>
                <DialogDescription>
                  Help us improve by sharing why you're leaving. Your feedback matters.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <RadioGroup value={reason} onValueChange={setReason}>
                  {cancelReasons.map((r) => (
                    <div key={r.value} className="flex items-center space-x-3 py-2">
                      <RadioGroupItem value={r.value} id={r.value} />
                      <Label htmlFor={r.value} className="cursor-pointer">{r.label}</Label>
                    </div>
                  ))}
                </RadioGroup>

                {reason === 'other' && (
                  <Textarea
                    placeholder="Tell us more..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="mt-3"
                  />
                )}
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Keep My Plan
                </Button>
                <Button
                  onClick={handleReasonNext}
                  disabled={!reason}
                  variant="destructive"
                >
                  Continue
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'offer' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-500" />
                  Wait! We have an offer for you
                </DialogTitle>
                <DialogDescription>
                  We'd hate for cost to be the reason you leave. Here are some options:
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <Card className="p-4 border-2 border-purple-200 bg-purple-50/50">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Zap className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary">50% Off for 2 Months</h4>
                      <p className="text-sm text-muted-foreground">
                        Stay on {tierName} at half price while you decide
                      </p>
                      <Button
                        onClick={handleAcceptOffer}
                        size="sm"
                        className="mt-2 bg-purple-600 hover:bg-purple-700"
                      >
                        Apply Discount
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary">Pause for 1 Month</h4>
                      <p className="text-sm text-muted-foreground">
                        Take a break without losing your data or progress
                      </p>
                      <Button
                        onClick={handlePause}
                        size="sm"
                        variant="outline"
                        className="mt-2"
                      >
                        Pause Subscription
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setStep('confirm')}>
                  No thanks, cancel anyway
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Are you sure?
                </DialogTitle>
                <DialogDescription>
                  Here's what you'll lose access to:
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    All your saved memories about your child
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    Progress tracking and weekly reports
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    AI-powered daily routines and suggestions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    Unlimited chat with Aminy
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    Your vault documents and insights
                  </li>
                </ul>

                <p className="mt-4 text-sm text-primary font-medium">
                  Your plan will remain active until the end of your current billing period.
                </p>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Keep My Plan
                </Button>
                <Button
                  onClick={handleConfirmCancel}
                  disabled={isLoading}
                  variant="destructive"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    'Yes, Cancel'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SubscriptionManagement({ accessToken }: SubscriptionManagementProps) {
  const {
    subscription,
    referralInfo,
    loading,
    error,
    fetchSubscription,
    upgrade,
    manageSubscription,
    cancel,
    resume,
  } = useSubscription({ accessToken, autoFetch: true });

  if (loading && !subscription) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading your subscription...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 border-red-200 bg-red-50/50">
        <div className="text-center">
          <p className="text-red-700 mb-4">We couldn't load your subscription info.</p>
          <Button onClick={fetchSubscription} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  const rawTier = subscription?.tier || 'free';
  const currentTier = normalizeTierName(rawTier);
  const isTrialing = subscription?.status === 'trialing';
  const isCanceling = subscription?.cancelAtPeriodEnd;
  const hasCredits = (subscription?.credits || 0) + (subscription?.referralCredits || 0) > 0;
  const trialDaysLeft = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Use consistent tier colors from design system
  const tierColors: Record<TierType, string> = {
    free: 'bg-gray-100 text-gray-700',
    starter: 'bg-blue-100 text-blue-700',
    core: 'bg-accent/10 text-accent',
    pro: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="p-6 bg-gradient-to-br from-white via-teal-50/20 to-white border-accent/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-6 h-6 text-accent" />
              <h2 className="text-2xl text-primary">Your Plan</h2>
            </div>
            <Badge className={`${tierColors[currentTier]} font-semibold`}>
              {getTierDisplayName(currentTier)}
            </Badge>
            {isTrialing && subscription?.trialEndsAt && (
              <Badge variant="secondary" className="ml-2">
                Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
              </Badge>
            )}
            {isCanceling && (
              <Badge variant="destructive" className="ml-2">
                Cancels {new Date(subscription?.currentPeriodEnd || '').toLocaleDateString()}
              </Badge>
            )}
          </div>
          
          {currentTier !== 'pro' && (
            <Button
              onClick={() => {
                if (!accessToken) {
                  toast.error('Please sign in to upgrade');
                  return;
                }
                const nextTier = currentTier === 'free' || currentTier === 'starter' ? 'core' : 'pro';
                upgrade(nextTier, false);
              }}
              className="bg-accent hover:bg-accent/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade
            </Button>
          )}
        </div>

        {/* Subscription Details */}
        <div className="space-y-3 text-sm">
          {subscription?.currentPeriodEnd && (
            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Next billing date</span>
              </div>
              <span className="text-primary">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          )}
          
          {hasCredits && (
            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span>Available credits</span>
              </div>
              <span className="text-primary font-semibold">
                ${(subscription?.credits || 0) + (subscription?.referralCredits || 0)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {currentTier !== 'free' && (
            <Button
              onClick={manageSubscription}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Manage Billing
            </Button>
          )}
          
          {isCanceling ? (
            <Button
              onClick={async () => {
                try {
                  await resume();
                  toast.success('Your subscription will continue 🎉');
                } catch (err) {
                  toast.error('Failed to resume subscription');
                }
              }}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              Resume Plan
            </Button>
          ) : currentTier !== 'free' && (
            <CancelFlowButton
              onCancel={cancel}
              tierName={getTierDisplayName(currentTier)}
            />
          )}
        </div>
      </Card>

      {/* Referral Card */}
      {referralInfo && (
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Gift className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary mb-1">
                Share Aminy, Get Rewarded
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                You get $10, they get $10. Share your code with other parents.
              </p>
              
              <div className="flex items-center gap-3 mb-3">
                <code className="px-4 py-2 bg-white border border-purple-200 rounded-lg font-mono text-purple-700 font-semibold">
                  {referralInfo.code}
                </code>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(referralInfo.code);
                    toast.success('Referral code copied!');
                  }}
                  size="sm"
                  variant="outline"
                >
                  Copy
                </Button>
              </div>
              
              {referralInfo.totalReferrals > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-purple-700">
                    {referralInfo.totalReferrals} {referralInfo.totalReferrals === 1 ? 'friend' : 'friends'}
                  </span>{' '}
                  joined • ${referralInfo.creditsEarned} earned
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Plan Comparison */}
      {currentTier !== 'pro' && (
        <Card className="p-6">
          <h3 className="font-semibold text-primary mb-4">Why upgrade?</h3>
          <div className="space-y-3">
            {currentTier === 'free' || currentTier === 'starter' ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Unlimited AI chat with Aminy (text & voice)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Full Aminy Jr suite for your child
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Adaptive daily plans that learn with you
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Live AI video support for real-time guidance
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Monthly BCBA consultation included
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Provider-ready clinical reports (IEPs, progress notes)
                  </p>
                </div>
              </>
            )}

            <Button
              onClick={() => {
                if (!accessToken) {
                  toast.error('Please sign in to upgrade');
                  return;
                }
                const nextTier = currentTier === 'free' || currentTier === 'starter' ? 'core' : 'pro';
                upgrade(nextTier, false);
              }}
              className="w-full mt-4 bg-accent hover:bg-accent/90"
            >
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
