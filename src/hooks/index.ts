// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Hooks Barrel Export
 * Central export for all custom React hooks
 */

// Core utility hooks
export { useModal, type UseModalOptions, type UseModalReturn } from './useModal';
export { useAsync, type UseAsyncOptions, type UseAsyncReturn, type AsyncState } from './useAsync';
export { useForm, validators, type UseFormOptions, type UseFormReturn } from './useForm';

// Media and device hooks
export { useMediaQuery } from './use-media-query';
export { useKeyboardHeight } from './useKeyboardHeight';
export { useVoiceInput } from './useVoiceInput';

// AI and planning hooks
export { useAIPlanner } from './useAIPlanner';
export { useNudgeEngine } from './useNudgeEngine';

// Data and sync hooks
export { useOfflineSync } from './useOfflineSync';
export { useOutcomes } from './useOutcomes';
export { useReports } from './useReports';

// Auth and security hooks
export { useSecureSession } from './useSecureSession';
export { useMFA } from './useMFA';

// Payment and subscription hooks
export { usePaymentConfirmation } from './usePaymentConfirmation';
export { useSubscription } from './useSubscription';
export { useGracePeriod, type GracePeriodStatus, type UseGracePeriodOptions, type UseGracePeriodReturn } from './useGracePeriod';

// Organization and B2B hooks
export { useOrganization } from './useOrganization';

// Supabase data hooks (Wave 1B — replaces localStorage with Supabase-first)
export { useDashboardData } from './useDashboardData';
export { useJuniorData } from './useJuniorData';
export { useVideoSessionData } from './useVideoSessionData';
export { useAppointmentData } from './useAppointmentData';
export { useOnboardingData } from './useOnboardingData';
export { useProviderData } from './useProviderData';
export { useContentData } from './useContentData';
export { useMessagingData } from './useMessagingData';
export { useCommunityData } from './useCommunityData';

// PWA and device hooks
export { useStandaloneMode, type UseStandaloneModeReturn } from './useStandaloneMode';
export { useResponsiveLayout, type DeviceType, type UseResponsiveLayoutReturn } from './useResponsiveLayout';
export { useHapticFeedback, triggerHaptic, type HapticType, type UseHapticFeedbackReturn } from './useHapticFeedback';
export { useJuniorOfflineCache, type UseJuniorOfflineCacheReturn } from './useJuniorOfflineCache';
