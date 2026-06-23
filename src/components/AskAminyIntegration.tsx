// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { FloatingAskAminy } from './FloatingAskAminy';
import { FloatingAskAminyEnhanced } from './FloatingAskAminyEnhanced';
import { useFeatureFlags } from '../lib/feature-flags';

interface AskAminyIntegrationProps {
  userTier: string;
  userData: { parentName: string; childName: string };
  onPaywallTrigger?: () => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Safe integration component that switches between original and enhanced Ask Aminy
 * based on feature flags. This allows for gradual rollout and easy rollback.
 */
export function AskAminyIntegration({
  userTier,
  userData,
  onPaywallTrigger,
  className,
  disabled = false
}: AskAminyIntegrationProps) {
  const { isEnabled } = useFeatureFlags();

  // Use enhanced version only if feature flag is enabled
  const useEnhanced = isEnabled('enhancedFloatingButton');

  if (useEnhanced) {
    return (
      <FloatingAskAminyEnhanced
        userTier={userTier}
        userData={userData}
        onPaywallTrigger={onPaywallTrigger}
        className={className}
        disabled={disabled}
        showPulse={isEnabled('improvedUI')}
        enableContextDetection={isEnabled('contextDetection')}
        enableAnalytics={isEnabled('analyticsTracking')}
      />
    );
  }

  // Fallback to original stable version
  return (
    <FloatingAskAminy
      userTier={userTier}
      userData={userData}
      onPaywallTrigger={onPaywallTrigger}
      className={className}
      disabled={disabled}
    />
  );
}

// Dev component for testing both versions side by side
export function AskAminyComparison({
  userTier,
  userData,
  onPaywallTrigger,
  className,
  disabled = false
}: AskAminyIntegrationProps) {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <AskAminyIntegration
        userTier={userTier}
        userData={userData}
        onPaywallTrigger={onPaywallTrigger}
        className={className}
        disabled={disabled}
      />
    );
  }

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-3 sm:gap-4 z-30">
      <div className="relative">
        <div className="absolute -top-8 right-0 text-sm bg-black text-white px-2 py-1 rounded">
          Enhanced
        </div>
        <FloatingAskAminyEnhanced
          userTier={userTier}
          userData={userData}
          onPaywallTrigger={onPaywallTrigger}
          className="relative bottom-0 right-0"
          disabled={disabled}
          showPulse={true}
          enableContextDetection={true}
          enableAnalytics={true}
        />
      </div>
      
      <div className="relative">
        <div className="absolute -top-8 right-0 text-sm bg-gray-600 text-white px-2 py-1 rounded">
          Original
        </div>
        <FloatingAskAminy
          userTier={userTier}
          userData={userData}
          onPaywallTrigger={onPaywallTrigger}
          className="relative bottom-0 right-0"
          disabled={disabled}
        />
      </div>
    </div>
  );
}