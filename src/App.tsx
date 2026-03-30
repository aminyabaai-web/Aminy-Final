import React, {
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
  startTransition,
  useCallback,
} from "react";
import { MotionConfig } from "motion/react";
// CRITICAL PATH - Regular imports for instant FCP (MINIMIZED)
import { NotificationPrompt, useShouldShowNotificationPrompt } from "./components/NotificationPrompt";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { usePaymentConfirmation, getPaymentStatusFromUrl, clearPaymentParamsFromUrl } from "./hooks/usePaymentConfirmation";
import { useGracePeriod } from "./hooks/useGracePeriod";
import { logger } from "./lib/logger";

// Lazy load SplashPage (full landing page)
const SplashPage = lazy(() =>
  import("./components/SplashPage").then((m) => ({
    default: m.SplashPage,
  })),
);
import { CLSOptimizer } from "./components/CLSOptimizer";
import { toast } from "sonner";
import { TierType, getTierDisplayName } from "./lib/tier-utils";
import { getScreenGateReason } from "./lib/feature-flags";
import {
  buildPilotAccessContext,
  getSurfaceAccessDecision,
  getSurfaceLaunchConfig,
  type EVVSystem,
  type PilotOrganization,
  type PilotPayer,
  type SystemOfRecord,
} from "./lib/product-truth";
import { LaunchStateBadge } from "./components/ui/LaunchStateBadge";
import { handleOnboardingComplete as triggerRetentionFlow } from "./lib/store";
import { AIProvider } from "./context/AIContext";
import { ConversationProvider } from "./context/ConversationContext";
import { ThemeProvider } from "./lib/theme-provider";
import { supabase } from "./utils/supabase/client";
import { getMFAState } from "./lib/mfa";
import { verifyAdminAccess } from "./hooks/useSecureSession";
import { setupSessionRefresh } from "./lib/security/session";
import { syncEncryptedStorage } from "./lib/security/encrypted-storage";
import { generatePHIAccessReport, getComplianceStatus } from "./lib/hipaa-compliance";
import { setSentryUser, clearSentryUser, addBreadcrumb } from "./lib/sentry";
import { setCurrentScreenGlobal } from "./lib/screen-state";
import { proactiveNudges } from "./lib/proactive-nudges";
import { generateDailyPlan } from "./lib/caregiver-workflow";
import { initAnalytics } from "./lib/analytics-engine";
import { checkAndAwardBadges } from "./lib/badge-service";
import { initPerformanceMonitoring } from "./lib/performance-monitor";
import { recordJuniorProgress } from "./lib/parent-junior-bridge";
import { incrementStreak } from "./lib/streak-service";
import { setupDailyCheckIns } from "./lib/push-notifications";
import { useScreenAnalytics } from "./hooks/useScreenAnalytics";
import { useBackgroundSync } from "./hooks/useBackgroundSync";
import { useAccessibilityEnhancements } from "./hooks/useAccessibilityEnhancements";
import { initTracking } from "./lib/tracking-init";
import { BREADCRUMB_TRAILS } from "./lib/breadcrumb-trails";

// DEFERRED - Load after first paint
const SafetyBoundary = lazy(() =>
  import("./components/SafetyBoundary").then((m) => ({
    default: m.SafetyBoundary,
  })),
);
const Toaster = lazy(() =>
  import("./components/ui/sonner").then((m) => ({
    default: m.Toaster,
  })),
);
const MobilePolishEnhancer = lazy(() =>
  import("./components/MobilePolishEnhancer").then((m) => ({
    default: m.MobilePolishEnhancer,
  })),
);
// CLSOptimizer now imported directly (not lazy loaded) for immediate CLS prevention
const OfflineIndicator = lazy(() =>
  import("./components/OfflineIndicator").then((m) => ({
    default: m.OfflineIndicator,
  })),
);
const OfflineBanner = lazy(() =>
  import("./components/OfflineBanner").then((m) => ({
    default: m.OfflineBanner,
  })),
);
const UpdateBanner = lazy(() =>
  import("./components/UpdateBanner").then((m) => ({
    default: m.UpdateBanner,
  })),
);
const CookieConsent = lazy(() =>
  import("./components/CookieConsent").then((m) => ({
    default: m.CookieConsent,
  })),
);
const DialogAccessibilityProvider = lazy(() =>
  import("./components/DialogAccessibilityProvider").then(
    (m) => ({ default: m.DialogAccessibilityProvider }),
  ),
);
const DeveloperModeHandler = lazy(() =>
  import("./components/DeveloperModeHandler").then((m) => ({
    default: m.DeveloperModeHandler,
  })),
);
const NPSSurveyModal = lazy(() =>
  import("./components/NPSSurveyModal").then((m) => ({
    default: m.NPSSurveyModal,
  })),
);
const FeedbackCollector = lazy(() =>
  import("./components/FeedbackCollector").then((m) => ({
    default: m.FeedbackCollector,
  })),
);
const FeedbackButton = lazy(() =>
  import("./components/FeedbackButton").then((m) => ({
    default: m.FeedbackButton,
  })),
);
const AppBreadcrumbs = lazy(() =>
  import("./components/AppBreadcrumbs").then((m) => ({
    default: m.AppBreadcrumbs,
  })),
);

// OPTIMIZED LAZY LOADING - With prefetch hints
const OnboardingStreamlined = lazy(() =>
  import(
    /* webpackPrefetch: true */ "./components/OnboardingStreamlined"
  ).then((m) => ({ default: m.OnboardingStreamlined })),
);
const Dashboard = lazy(() =>
  import(
    /* webpackPrefetch: true */ "./components/Dashboard10"
  ).then((m) => ({ default: m.Dashboard10 })),
);
const LoginScreen = lazy(() =>
  import(
    /* webpackPrefetch: true */ "./components/LoginScreen"
  ).then((m) => ({ default: m.LoginScreen })),
);
const CreateAccountScreen = lazy(() =>
  import(
    /* webpackPrefetch: true */ "./components/CreateAccountScreen"
  ).then((m) => ({ default: m.CreateAccountScreen })),
);
const PaywallScreen = lazy(() =>
  import("./components/PaywallSimplified").then((m) => ({
    default: m.PaywallSimplified,
  })),
);
const BenefitsNavigatorScreen = lazy(() =>
  import("./components/BenefitsNavigatorScreen").then((m) => ({
    default: m.BenefitsNavigatorScreen,
  })),
);
const PriorAuthFlow = lazy(() => import("./components/PriorAuthFlow"));
const TelehealthHome = lazy(() =>
  import("./components/telehealth/TelehealthHome").then((m) => ({
    default: m.TelehealthHome,
  })),
);
const CaregiverManagementScreen = lazy(() =>
  import("./components/CaregiverManagementScreen").then(
    (m) => ({ default: m.CaregiverManagementScreen }),
  ),
);
const RecordsVault = lazy(() =>
  import("./components/RecordsVault").then((m) => ({
    default: m.RecordsVault,
  })),
);
const JuniorPageEnhancedPro = lazy(() =>
  import("./components/JuniorPageEnhancedPro").then((m) => ({
    default: m.JuniorPageEnhancedPro,
  })),
);
const FreeScreeningFlow = lazy(() =>
  import("./components/FreeScreeningFlow").then((m) => ({
    default: m.FreeScreeningFlow,
  })),
);
const SettingsScreen = lazy(() =>
  import("./components/SettingsScreen").then((m) => ({
    default: m.SettingsScreen,
  })),
);
const ProfileScreen = lazy(() =>
  import("./components/ProfileScreen").then((m) => ({
    default: m.ProfileScreen,
  })),
);
const WeeklyAISummary = lazy(() =>
  import("./components/WeeklyAISummary").then((m) => ({
    default: m.WeeklyAISummary,
  })),
);
const AnalyticsCharts = lazy(() =>
  import("./components/AnalyticsCharts").then((m) => ({
    default: m.AnalyticsCharts,
  })),
);
const AuthCallback = lazy(() =>
  import("./components/AuthCallback").then((m) => ({
    default: m.AuthCallback,
  })),
);
const ForgotPasswordScreen = lazy(() =>
  import("./components/ForgotPasswordScreen").then((m) => ({
    default: m.ForgotPasswordScreen,
  })),
);
const ResetPasswordScreen = lazy(() =>
  import("./components/ResetPasswordScreen").then((m) => ({
    default: m.ResetPasswordScreen,
  })),
);
const PaymentConfirmation = lazy(() =>
  import("./components/PaymentConfirmation").then((m) => ({
    default: m.PaymentConfirmation,
  })),
);
const PersistentAskAminyFAB = lazy(() =>
  import("./components/PersistentAskAminyFAB").then((m) => ({
    default: m.PersistentAskAminyFAB,
  })),
);
const UrgentHelpModal = lazy(() =>
  import("./components/UrgentHelpModal").then((m) => ({
    default: m.UrgentHelpModal,
  })),
);
const PullToRefresh = lazy(() =>
  import("./components/PullToRefresh").then((m) => ({
    default: m.PullToRefresh,
  })),
);
const SwipeNavigation = lazy(() =>
  import("./components/SwipeNavigation").then((m) => ({
    default: m.SwipeNavigation,
  })),
);
const UnloadMindButton = lazy(() =>
  import("./components/UnloadMindButton").then((m) => ({
    default: m.UnloadMindButton,
  })),
);
const UnloadMindModal = lazy(() =>
  import("./components/UnloadMindModal").then((m) => ({
    default: m.UnloadMindModal,
  })),
);
const BCBACoachPortal = lazy(() =>
  import("./components/BCBACoachPortal").then((m) => ({
    default: m.BCBACoachPortal,
  })),
);
const LaunchStatusDashboard = lazy(() =>
  import("./components/LaunchStatusDashboard").then((m) => ({
    default: m.LaunchStatusDashboard,
  })),
);
const EnhancedAnalyticsDashboard = lazy(() =>
  import("./components/EnhancedAnalyticsDashboard").then((m) => ({
    default: m.EnhancedAnalyticsDashboard,
  })),
);
const CRSyncDashboard = lazy(() =>
  import("./components/CRSyncDashboard").then((m) => ({
    default: m.CRSyncDashboard,
  })),
);
const Phase2FeaturesMenu = lazy(() =>
  import("./components/Phase2FeaturesMenu").then((m) => ({
    default: m.Phase2FeaturesMenu,
  })),
);

// New marketplace and provider components
const ProviderMarketplace = lazy(() =>
  import("./components/ProviderMarketplace").then((m) => ({
    default: m.ProviderMarketplace,
  })),
);
const EVVDashboard = lazy(() =>
  import("./components/EVVDashboard"),
);
const ClaimsDashboard = lazy(() =>
  import("./components/ClaimsDashboard"),
);
const PayerOutcomesDashboard = lazy(() =>
  import("./components/PayerOutcomesDashboard"),
);
const ClinicalReportExport = lazy(() =>
  import("./components/ClinicalReportExport"),
);
const ProviderPortal = lazy(() =>
  import("./components/ProviderPortal").then((m) => ({
    default: m.ProviderPortal,
  })),
);
const ProviderOnboarding = lazy(() =>
  import("./components/ProviderOnboarding").then((m) => ({
    default: m.ProviderOnboarding,
  })),
);
const InsightNavigatorReport = lazy(() =>
  import("./components/InsightNavigatorReport").then((m) => ({
    default: m.InsightNavigatorReport,
  })),
);
const OutcomesTracking = lazy(() =>
  import("./components/OutcomesTracking").then((m) => ({
    default: m.OutcomesTracking,
  })),
);
const AdminPortal = lazy(() =>
  import("./components/AdminPortal").then((m) => ({
    default: m.AdminPortal,
  })),
);
const PrivacyPolicy = lazy(() =>
  import("./components/PrivacyPolicy").then((m) => ({
    default: m.PrivacyPolicy,
  })),
);
const TermsOfService = lazy(() =>
  import("./components/TermsOfService").then((m) => ({
    default: m.TermsOfService,
  })),
);
const ReferralLanding = lazy(() =>
  import("./components/ReferralLanding").then((m) => ({
    default: m.ReferralLanding,
  })),
);

// One Medical-inspired components
const MyAppointments = lazy(() =>
  import("./components/MyAppointments").then((m) => ({
    default: m.MyAppointments,
  })),
);
const ConversationalBooking = lazy(() =>
  import("./components/ConversationalBooking").then((m) => ({
    default: m.ConversationalBooking,
  })),
);

// Provider-Parent Messaging (HIPAA-compliant)
const SecureMessaging = lazy(() =>
  import("./components/messaging/SecureMessaging").then((m) => ({
    default: m.SecureMessaging,
  })),
);

// Provider Access Request Management
const ProviderAccessRequests = lazy(() =>
  import("./components/ProviderAccessRequests").then((m) => ({
    default: m.ProviderAccessRequests,
  })),
);

// Provider Landing and Application
const ProviderLanding = lazy(() =>
  import("./components/ProviderLanding").then((m) => ({
    default: m.ProviderLanding,
  })),
);
const ProviderApplication = lazy(() =>
  import("./components/ProviderApplication").then((m) => ({
    default: m.ProviderApplication,
  })),
);

// Medication Tracking
const MedicationTracker = lazy(() =>
  import("./components/MedicationTracker").then((m) => ({
    default: m.MedicationTracker,
  })),
);

// Crisis Resources - cached offline
const CrisisResources = lazy(() =>
  import("./components/CrisisResources").then((m) => ({
    default: m.CrisisResources,
  })),
);

// Keyboard Help Modal - Shows keyboard shortcuts
const KeyboardHelpModal = lazy(() =>
  import("./components/KeyboardHelpModal").then((m) => ({
    default: m.KeyboardHelpModal,
  })),
);

// Desktop sidebar navigation (hidden on mobile, visible md+)
const DesktopSideNav = lazy(() =>
  import("./components/DesktopSideNav").then((m) => ({
    default: m.DesktopSideNav,
  })),
);

// Secure Admin Portal Wrapper with server-side verification
const SecureAdminPortalWrapper = React.memo(function SecureAdminPortalWrapper({
  userId,
  onBack,
  onAccessDenied,
}: {
  userId?: string;
  onBack: () => void;
  onAccessDenied: () => void;
}) {
  const [isVerifying, setIsVerifying] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    async function verifyAccess() {
      if (!userId) {
        setIsVerifying(false);
        onAccessDenied();
        return;
      }

      try {
        const hasAccess = await verifyAdminAccess(userId);
        setIsAdmin(hasAccess);
        if (!hasAccess) {
          onAccessDenied();
        }
      } catch (error) {
        logger.error("Admin verification failed", error);
        onAccessDenied();
      } finally {
        setIsVerifying(false);
      }
    }

    verifyAccess();
  }, [userId, onAccessDenied]);

  if (isVerifying) {
    return <LoadingSkeleton screen="admin" />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600 mb-6">
            The admin portal is only available to authorized Aminy administrators.
          </p>
          <button
            onClick={onBack}
            className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent/90 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <AdminPortal onBack={onBack} />;
});
const OnDemandTelehealth = lazy(() =>
  import("./components/OnDemandTelehealth").then((m) => ({
    default: m.OnDemandTelehealth,
  })),
);

// New navigation screens
const SensoryTools = lazy(() =>
  import("./components/SensoryTools").then((m) => ({
    default: m.SensoryTools,
  })),
);
const ActivityLog = lazy(() =>
  import("./components/ActivityLog").then((m) => ({
    default: m.ActivityLog,
  })),
);
const CareTab = lazy(() =>
  import("./components/CareTab").then((m) => ({
    default: m.CareTab,
  })),
);
const CommunityForYou = lazy(() =>
  import("./components/CommunityForYou").then((m) => ({
    default: m.CommunityForYou,
  })),
);

// New feature components - Store, Community Hub, Provider Analytics
const StoreMarketplace = lazy(() =>
  import("./components/StoreMarketplace").then((m) => ({
    default: m.StoreMarketplace,
  })),
);
const CommunityHub = lazy(() =>
  import("./components/CommunityHub").then((m) => ({
    default: m.CommunityHub,
  })),
);
const B2BPartnerPortal = lazy(() =>
  import("./components/B2BPartnerPortal").then((m) => ({
    default: m.B2BPartnerPortal,
  })),
);
const B2BOrgSetup = lazy(() =>
  import("./components/B2BOrgSetup").then((m) => ({
    default: m.B2BOrgSetup,
  })),
);
const ProviderIdentityVerification = lazy(() =>
  import("./components/ProviderIdentityVerification").then((m) => ({
    default: m.ProviderIdentityVerification,
  })),
);
const CaregiverEnrollmentWizard = lazy(() =>
  import("./components/CaregiverEnrollmentWizard").then((m) => ({
    default: m.CaregiverEnrollmentWizard,
  })),
);
const ProviderAnalytics = lazy(() =>
  import("./components/provider/ProviderAnalytics").then((m) => ({
    default: m.ProviderAnalytics,
  })),
);
const VisionAI = lazy(() =>
  import("./components/VisionAI").then((m) => ({
    default: m.VisionAI,
  })),
);
const OutcomeMeasures = lazy(() =>
  import("./components/OutcomeMeasures").then((m) => ({
    default: m.OutcomeMeasures,
  })),
);

// MFA (Multi-Factor Authentication) - HIPAA requirement for providers/admins
const MFAEnrollment = lazy(() =>
  import("./components/MFAEnrollment").then((m) => ({
    default: m.MFAEnrollment,
  })),
);
const MFAVerification = lazy(() =>
  import("./components/MFAVerification").then((m) => ({
    default: m.MFAVerification,
  })),
);

// Cherry-picked from Aminy-Final — enhanced telehealth + new features
const VideoCall = lazy(() => import("./components/VideoCall"));
const PreCallSetup = lazy(() => import("./components/PreCallSetup"));
const BCBASessionBriefing = lazy(() =>
  import("./components/BCBASessionBriefing").then((m) => ({
    default: m.BCBASessionBriefing,
  })),
);
const ProviderReviews = lazy(() => import("./components/ProviderReviews"));
const ReferralDashboard = lazy(() => import("./components/ReferralDashboard"));
const MCHATScreening = lazy(() =>
  import("./components/MCHATScreening").then((m) => ({
    default: m.MCHATScreening,
  })),
);
const AccountSettingsPremium = lazy(() => import("./components/AccountSettingsPremium"));
const CaregiverTimesheet = lazy(() => import("./components/CaregiverTimesheet"));
const ParentCalmMode = lazy(() =>
  import("./components/ParentCalmMode").then((m) => ({
    default: m.ParentCalmMode,
  })),
);
const TokenRewardsBoard = lazy(() => import("./components/TokenRewardsBoard"));
const MemorySettingsPage = lazy(() =>
  import("./components/MemorySettingsPage").then((m) => ({
    default: m.MemorySettingsPage,
  })),
);
const CaregiverCredentialingWizard = lazy(() =>
  import("./components/provider/CaregiverCredentialingWizard").then((m) => ({
    default: m.CaregiverCredentialingWizard,
  })),
);
const ProviderClinicalTemplates = lazy(() =>
  import("./components/provider/ProviderClinicalTemplates").then((m) => ({
    default: m.ProviderClinicalTemplates,
  })),
);
const DailyVideoRoom = lazy(() =>
  import("./components/DailyVideoRoom").then((m) => ({
    default: m.DailyVideoRoom,
  })),
);
const MultiRoleTelehealthRoom = lazy(() =>
  import("./components/MultiRoleTelehealthRoom").then((m) => ({
    default: m.MultiRoleTelehealthRoom,
  })),
);
const ParentApprovalCard = lazy(() =>
  import("./components/ParentApprovalCard").then((m) => ({
    default: m.ParentApprovalCard,
  })),
);
const ShareViewer = lazy(() =>
  import("./components/ShareViewer").then((m) => ({
    default: m.ShareViewer,
  })),
);
const VideoCallRoom = lazy(() =>
  import("./components/telehealth/VideoCallRoom"),
);

// === Sprint components: BATCH 1-7 (March 9, 2026) ===
const StripeRevenueDashboard = lazy(() =>
  import("./components/StripeRevenueDashboard").then((m) => ({
    default: m.StripeRevenueDashboard,
  })),
);
const WaitingRoom = lazy(() =>
  import("./components/telehealth/WaitingRoom").then((m) => ({
    default: m.WaitingRoom,
  })),
);
const PWAInstallPrompt = lazy(() =>
  import("./components/PWAInstallPrompt").then((m) => ({
    default: m.PWAInstallPrompt,
  })),
);
const AppReviewPrompt = lazy(() =>
  import("./components/AppReviewPrompt").then((m) => ({
    default: m.AppReviewPrompt,
  })),
);
const PaymentFailureBanner = lazy(() =>
  import("./components/PaymentFailureBanner").then((m) => ({
    default: m.PaymentFailureBanner,
  })),
);
const OnboardingQuickStart = lazy(() =>
  import("./components/OnboardingQuickStart").then((m) => ({
    default: m.OnboardingQuickStart,
  })),
);
const JuniorMilestoneShare = lazy(() =>
  import("./components/JuniorMilestoneShare").then((m) => ({
    default: m.JuniorMilestoneShare,
  })),
);

// GATED SCREEN PLACEHOLDER - Shown when a screen is behind a disabled feature flag
const GATE_MESSAGES: Record<string, { title: string; description: string }> = {
  'b2b': {
    title: 'Coming Soon for Organizations',
    description: 'This feature is designed for clinics, schools, and organizations. It will be available in a future update.',
  },
  'b2g': {
    title: 'Payer Portal Coming Soon',
    description: 'This dashboard is designed for insurance companies and managed care organizations.',
  },
  'fiscal-agent': {
    title: 'Fiscal Agent Integration Coming Soon',
    description: 'EVV and caregiver management features are coming in a future update.',
  },
  'dev-mode': {
    title: 'Developer Tools',
    description: 'This screen is only available in developer mode.',
  },
  internal: {
    title: 'Internal Workflow',
    description: 'This surface is reserved for internal or pilot-only operations until the live workflow is verified.',
  },
  pilot: {
    title: 'Pilot Access Required',
    description: 'This workflow is live only for invited Arizona pilot users while Aminy validates the operational path.',
  },
};

const GatedScreenPlaceholder = React.memo(function GatedScreenPlaceholder({
  gateReason,
  onBack,
  customTitle,
  customDescription,
}: {
  gateReason: string;
  onBack: () => void;
  customTitle?: string;
  customDescription?: string;
}) {
  const baseMsg = GATE_MESSAGES[gateReason] || GATE_MESSAGES['b2b'];
  const msg = {
    title: customTitle || baseMsg.title,
    description: customDescription || baseMsg.description,
  };
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{msg.title}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">{msg.description}</p>
        <button
          onClick={onBack}
          className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
});

// OPTIMIZED LOADING SKELETON - Ultra lightweight, prevents CLS
// Uses Aminy brand colors: Soft Cream (#F5F5F5), Muted Teal (#0891b2)
// Contextual loading messages by screen category
const LOADING_MESSAGES: Record<string, string> = {
  dashboard: 'Loading your dashboard...',
  telehealth: 'Connecting to telehealth...',
  marketplace: 'Finding providers near you...',
  vault: 'Opening your secure vault...',
  settings: 'Loading your preferences...',
  junior: 'Setting up a fun session...',
  benefits: 'Checking your coverage...',
  'calm-tools': 'Preparing calming activities...',
  outcomes: 'Calculating your progress...',
  'insight-report': 'Generating your insights...',
  'analytics-charts': 'Crunching your data...',
  onboarding: 'Getting things ready for you...',
};

const LoadingSkeleton = React.memo(({ message, screen }: { message?: string; screen?: string }) => {
  const [showTimeout, setShowTimeout] = React.useState(false);
  // Auto-pick contextual message from screen name if no explicit message
  const displayMessage = message || (screen ? LOADING_MESSAGES[screen] : undefined);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowTimeout(true), 10000); // 10 seconds
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        contain: 'layout style paint',
        contentVisibility: 'auto'
      }}
    >
      <div
        className="w-8 h-8 rounded-full animate-spin"
        style={{
          width: '2rem',
          height: '2rem',
          border: '2px solid rgba(87, 117, 144, 0.2)',
          borderTopColor: '#0891b2',
          contain: 'layout size',
          willChange: 'transform'
        }}
      ></div>
      {displayMessage && (
        <p style={{ color: '#6B7280', fontSize: '0.875rem', textAlign: 'center' }}>
          {displayMessage}
        </p>
      )}
      {showTimeout && (
        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <p style={{ color: '#9CA3AF', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            Having trouble loading?
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              color: '#0891b2',
              fontSize: '0.75rem',
              fontWeight: 500,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
});

type AppScreen =
  | "splash"
  | "login"
  | "create-account"
  | "onboarding"
  | "dashboard"
  | "paywall"
  | "telehealth"      // Marketplace for BCBA/RBT sessions
  | "caregivers"
  | "vault"           // Document storage for AI context
  | "settings"
  | "bcba-portal"     // Provider portal for notes
  | "launch-status"
  | "analytics"
  | "phase2-menu"
  | "marketplace"     // Full provider marketplace
  | "provider-portal" // Provider-facing portal
  | "provider-onboarding" // Provider signup/registration flow
  | "insight-report"  // Living intake document
  | "outcomes"
  | "admin-portal"    // AACT pilot metrics dashboard
  | "on-demand-telehealth"  // Urgent +$50 sessions
  | "calm-tools"      // Sensory/calming tools for kids
  | "incident-log"    // Log behavioral incidents
  | "care-plan"       // Daily care plan management
  | "resources"       // Resource library
  | "community"       // Community support
  | "profile"         // User profile settings
  | "benefits"        // Benefits navigator
  | "junior"          // Kid-friendly Aminy Jr mode
  | "auth-callback"   // OAuth and password reset callback handler
  | "forgot-password" // Password reset request
  | "reset-password"  // Set new password after reset
  | "privacy-policy"  // Privacy policy page
  | "terms-of-service" // Terms of service page
  | "join" // Referral landing page (/join?ref=CODE)
  | "my-appointments" // Appointment management dashboard
  | "conversational-booking" // AI-driven booking flow
  | "messages" // Provider-parent secure messaging
  | "access-requests" // Provider access request management
  | "provider-landing" // Provider marketing landing page
  | "provider-apply" // Provider application form
  | "medications" // Medication tracking for children
  | "crisis-resources" // Offline-available crisis resources
  | "weekly-insights" // AI weekly summary
  | "analytics-charts" // Visual analytics
  | "store" // Resource store/marketplace
  | "community-hub" // Parent community hub
  | "provider-analytics" // Provider analytics dashboard
  | "evv-dashboard" // EVV (Electronic Visit Verification) for Medicaid compliance
  | "claims-dashboard" // Costs & Coverage for parents
  | "payer-dashboard" // Payer Outcomes Dashboard for insurance/MCO stakeholders
  | "clinical-reports" // Clinical PDF export for pediatricians/BCBAs
  | "free-screening" // Pre-signup screening acquisition funnel
  | "prior-auth" // Prior authorization flow
  | "b2b-partner" // B2B partner portal
  | "b2b-setup" // B2B org setup wizard
  | "caregiver-enrollment" // Paid caregiver enrollment
  | "outcome-measures" // Standardized outcome assessments
  | "provider-identity-verification" // Provider background check + ID verification
  | "vision-ai" // Photo + Video AI analysis
  | "mfa-enrollment" // MFA setup for providers/admins (HIPAA)
  | "mfa-verification" // MFA code entry after login
  | "video-call" // Native Daily.co video call with chat + recording
  | "pre-call-setup" // Camera/mic testing before telehealth
  | "bcba-briefing" // Pre-session clinical briefing for providers
  | "provider-reviews" // Provider review display
  | "referral-dashboard" // Referral tracking dashboard
  | "mchat-screening"
  | "account-settings"
  | "caregiver-timesheet"
  | "parent-calm-mode"
  | "token-rewards"
  | "memory-settings"
  | "caregiver-credentialing" // Caregiver credentialing wizard
  | "clinical-templates" // Provider clinical templates
  | "daily-video-room" // Daily.co video room
  | "multi-role-telehealth" // Multi-role telehealth room
  | "parent-approval" // Parent approval card for provider suggestions
  | "share-viewer" // Share viewer for non-authenticated users
  | "video-call-room" // Telehealth video call room
  | "cr-sync" // CentralReach sync dashboard
  | "revenue-dashboard" // Stripe revenue metrics (admin)
  | "waiting-room"; // Telehealth waiting room

const AUTH_REDIRECT_SCREENS: AppScreen[] = [
  "splash",
  "login",
  "create-account",
  "auth-callback",
  "onboarding",
  "paywall",
  "mfa-enrollment",
  "mfa-verification",
];

const PUBLIC_NO_REDIRECT_SCREENS: AppScreen[] = [
  "provider-landing",
  "provider-apply",
  "privacy-policy",
  "terms-of-service",
];

function getAuthenticatedLandingScreen(): AppScreen {
  return "dashboard";
}

function shouldRedirectAfterAuth(screen: AppScreen): boolean {
  return AUTH_REDIRECT_SCREENS.includes(screen);
}

const LOCAL_LAUNCH_BADGE_SCREENS = new Set<AppScreen>([
  'telehealth',
  'marketplace',
  'on-demand-telehealth',
]);

const EVV_SYSTEM_LABELS: Record<EVVSystem, string> = {
  spokchoice: 'SpokChoice current',
  dci: 'DCI transition',
  acumen: 'Acumen workflow',
  manual: 'Manual workflow',
};

const SYSTEM_OF_RECORD_LABELS: Record<SystemOfRecord, string> = {
  external: 'External system of record',
  aminy_shadow: 'Aminy shadow mode',
  aminy_primary: 'Aminy primary workflow',
};

const SurfaceLaunchNotice = React.memo(function SurfaceLaunchNotice({
  screen,
}: {
  screen: AppScreen;
}) {
  const launchConfig = getSurfaceLaunchConfig(screen);
  if (launchConfig.state === 'live' || launchConfig.state === 'hidden' || LOCAL_LAUNCH_BADGE_SCREENS.has(screen)) {
    return null;
  }

  return (
    <div className="border-b border-violet-200 bg-violet-50/80 px-4 py-3">
      <div className="mx-auto max-w-7xl space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <LaunchStateBadge state={launchConfig.state} label={launchConfig.badgeLabel} />
          {launchConfig.programLabel ? (
            <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-700">
              {launchConfig.programLabel}
            </span>
          ) : null}
          {launchConfig.pathwayLabel ? (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              {launchConfig.pathwayLabel}
            </span>
          ) : null}
          {launchConfig.payerLabel ? (
            <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700">
              {launchConfig.payerLabel}
            </span>
          ) : null}
          {launchConfig.evvSystem ? (
            <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700">
              {EVV_SYSTEM_LABELS[launchConfig.evvSystem]}
            </span>
          ) : null}
          {launchConfig.systemOfRecord ? (
            <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700">
              {SYSTEM_OF_RECORD_LABELS[launchConfig.systemOfRecord]}
            </span>
          ) : null}
        </div>
        {launchConfig.message ? (
          <p className="max-w-4xl text-sm text-violet-900/90">{launchConfig.message}</p>
        ) : null}
      </div>
    </div>
  );
});

interface ChildProfile {
  id: string;
  name: string;
  age: number;
  conditions?: string[];
}

interface UserData {
  id?: string;
  userId?: string;
  name?: string;
  parentName: string;
  childName: string;
  childAge?: number;
  childId?: string;
  childDOB?: string;
  relationship: string;
  state: string;
  email?: string;
  hasCompletedOnboarding: boolean;
  tier?: TierType;
  role?: 'parent' | 'provider' | 'admin';
  children?: ChildProfile[];
  activeChildId?: string;
  providerName?: string;
  pilotEligible?: boolean;
  pilotOrganization?: PilotOrganization | null;
  pilotPayers?: PilotPayer[];
  evvSystem?: EVVSystem;
  systemOfRecord?: SystemOfRecord;
}

// Screens accessible via deep links (?screen=xxx)
const DEEP_LINKABLE_SCREENS: AppScreen[] = [
  "login", "create-account", "forgot-password", "reset-password",
  "privacy-policy", "terms-of-service", "join",
  "provider-landing", "provider-apply",
  "benefits", "telehealth", "caregivers", "vault", "junior",
  "crisis-resources", "incident-log", "free-screening",
  "clinical-reports", "weekly-insights",
  "claims-dashboard", "payer-dashboard", "evv-dashboard",
  "provider-portal", "provider-onboarding", "cr-sync",
];

const CHROMELESS_SCREENS = new Set<AppScreen>([
  "splash",
  "login",
  "create-account",
  "forgot-password",
  "reset-password",
  "auth-callback",
  "join",
  "provider-landing",
  "provider-apply",
  "terms-of-service",
  "privacy-policy",
  "paywall",
  "free-screening",
  "mchat-screening",
]);

// Initialize screen state synchronously to prevent LCP delays
const getInitialScreen = (): AppScreen => {
  // Check for auth callback first (OAuth redirects, password reset)
  const pathname = window.location.pathname;
  if (pathname === '/auth/callback' || pathname.includes('/auth/callback')) {
    return "auth-callback";
  }

  // Check for referral landing page (/join?ref=CODE)
  if (pathname === '/join' || pathname.includes('/join')) {
    return "join";
  }

  // Check for provider landing page (/providers)
  if (pathname === '/providers' || pathname === '/for-providers') {
    return "provider-landing";
  }

  // Check for provider application (/providers/apply)
  if (pathname === '/providers/apply' || pathname.includes('/providers/apply')) {
    return "provider-apply";
  }

  // Check URL params
  const params = new URLSearchParams(window.location.search);
  const urlScreen = params.get("screen");
  if (urlScreen && DEEP_LINKABLE_SCREENS.includes(urlScreen as AppScreen)) {
    return urlScreen as AppScreen;
  }

  // Check encrypted storage synchronously (syncEncryptedStorage uses cache for sync reads)
  try {
    const storedUser = syncEncryptedStorage.getItem("aminy-user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.hasCompletedOnboarding) {
        // Prefetch dashboard so the caregiver workflow is reachable on reload.
        if (typeof window !== 'undefined') {
          import(/* webpackPrefetch: true */ "./components/Dashboard10").catch((err) => logger.dev('Prefetch failed', err));
        }
        return getAuthenticatedLandingScreen();
      } else if (user.email) {
        return "onboarding";
      }
    }
  } catch (e) {
    logger.error("Failed to parse stored user data", e);
  }

  return "splash";
};

const getInitialUserData = (): UserData => {
  try {
    const storedUser = syncEncryptedStorage.getItem("aminy-user");
    if (storedUser) {
      return JSON.parse(storedUser);
    }
  } catch (e) {
    logger.error("Failed to parse stored user data", e);
  }

  return {
    parentName: "",
    childName: "",
    relationship: "",
    state: "",
    hasCompletedOnboarding: false,
    tier: "free",
  };
};

export default function App() {
  const [currentScreen, setCurrentScreen] =
    useState<AppScreen>(getInitialScreen);
  const currentScreenRef = useRef<AppScreen>(currentScreen);
  // Keep ref in sync so async callbacks (auth listener) see the latest screen
  // Also broadcast to the shared screen-state module so the AI context layer
  // (and other non-React code) can read the current screen without pathname hacks.
  useEffect(() => {
    currentScreenRef.current = currentScreen;
    setCurrentScreenGlobal(currentScreen);
  }, [currentScreen]);

  // Track screen navigation for Sentry debugging + scroll to top
  const prevScreenRef = useRef<AppScreen>(currentScreen);
  useEffect(() => {
    const prev = prevScreenRef.current;
    if (prev !== currentScreen) {
      addBreadcrumb('navigation', `Screen: ${prev} → ${currentScreen}`, {
        from: prev,
        to: currentScreen,
        timestamp: new Date().toISOString(),
      });
      prevScreenRef.current = currentScreen;
    }
    // Scroll to top when navigating between screens
    // Target both window AND .mobile-polish-wrapper (the actual scroll container on mobile)
    window.scrollTo(0, 0);
    document.querySelector('.mobile-polish-wrapper')?.scrollTo(0, 0);
  }, [currentScreen]);

  const [userData, setUserData] = useState<UserData>(getInitialUserData);
  const showDesktopAppShell = userData.hasCompletedOnboarding && !CHROMELESS_SCREENS.has(currentScreen);
  const pilotAccessContext = buildPilotAccessContext({
    state: userData.state,
    role: userData.role,
    email: userData.email,
    organization: userData.pilotOrganization,
    payers: userData.pilotPayers,
    pilotEligible: userData.pilotEligible,
    evvSystem: userData.evvSystem,
    systemOfRecord: userData.systemOfRecord,
  });
  const [activeTab, setActiveTab] = useState("home");
  const [messagesLeft, setMessagesLeft] = useState(10);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showUnloadMindModal, setShowUnloadMindModal] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [showNPSSurvey, setShowNPSSurvey] = useState(false);
  const [showFeedbackCollector, setShowFeedbackCollector] = useState(false);
  // Track whether the next SIGNED_OUT is from an intentional logout vs. session expiry
  const intentionalLogoutRef = useRef(false);
  // Track whether the user ever had a valid session (prevents false "expired" toasts in dev/demo mode)
  const hadSessionRef = useRef(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [paymentUserId, setPaymentUserId] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  // MFA state — tracks whether we need enrollment or verification after login
  const [mfaGracePeriodEnds, setMfaGracePeriodEnds] = useState<Date | undefined>(undefined);
  const [mfaRequired, setMfaRequired] = useState(false);

  // Cross-screen state (Wave 1B: replaces localStorage for screen-to-screen data passing)
  const [pendingProviderId, setPendingProviderId] = useState<string>('');
  const [viewingProviderId, setViewingProviderId] = useState<string>('');
  const [viewingProviderName, setViewingProviderName] = useState<string>('Provider');
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [dailyRoomUrl, setDailyRoomUrl] = useState<string>('');
  const [activeFamilyId, setActiveFamilyId] = useState<string>('');
  const [activePatientId, setActivePatientId] = useState<string>('');

  // Push notification prompt — show after user reaches dashboard
  const shouldShowNotificationPrompt = useShouldShowNotificationPrompt();

  // Payment grace period — monitors failed payments and shows banner
  const {
    inGracePeriod,
    daysRemaining,
    bannerMessage: graceBannerMessage,
    severity: graceSeverity,
  } = useGracePeriod({
    userId: userData.id,
    autoFetch: Boolean(userData.id && userData.tier && userData.tier !== 'free'),
  });

  // === Sprint hooks (Batch 7 integration) ===
  // Screen analytics — track which screens are visited + time spent
  useScreenAnalytics(currentScreen, { trackScroll: true, trackInteractions: true, tier: userData.tier });
  // Background sync — process offline queue when connectivity returns
  useBackgroundSync();
  // Accessibility enhancements — runtime a11y improvements (focus management, announcements)
  useAccessibilityEnhancements(currentScreen);
  // App review prompt — self-contained component manages its own visibility

  useEffect(() => {
    if (currentScreen === "dashboard" && shouldShowNotificationPrompt && userData.id) {
      // Delay prompt to let the dashboard load first
      const timer = setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, shouldShowNotificationPrompt, userData.id]);

  // ======================================
  // PAYMENT CONFIRMATION - Check URL for payment return
  // ======================================
  useEffect(() => {
    const paymentStatus = getPaymentStatusFromUrl();

    if (paymentStatus.isPaymentReturn && paymentStatus.success) {
      // User returned from Stripe with success - show confirmation modal
      setShowPaymentConfirmation(true);

      // Get user ID from Supabase session
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          setPaymentUserId(user.id);
        }
      });
    } else if (paymentStatus.isPaymentReturn && paymentStatus.cancelled) {
      // User cancelled payment
      toast.info('Payment cancelled. You can try again anytime.');
      clearPaymentParamsFromUrl();
    }
  }, []);

  // Payment confirmation hook
  const paymentConfirmation = usePaymentConfirmation({
    userId: paymentUserId,
    onSuccess: (tier) => {
      // Update user data with new tier
      setUserData((prev) => ({
        ...prev,
        tier,
      }));
      // Also update in Supabase profile
      if (paymentUserId) {
        supabase
          .from('profiles')
          .update({ tier })
          .eq('id', paymentUserId)
          .then(() => { /* profile update complete */ }, (err: unknown) => logger.error('Failed to update profile tier', err));
      }
    },
    onTimeout: () => {
      // Payment verification timed out, but payment may still process
    },
  });

  const handlePaymentConfirmContinue = useCallback(() => {
    setShowPaymentConfirmation(false);
    clearPaymentParamsFromUrl();
    navigateToScreen('dashboard');

    if (paymentConfirmation.status === 'success' && paymentConfirmation.tier) {
      toast.success(`Welcome to Aminy ${getTierDisplayName(paymentConfirmation.tier)}! 🎉`);
    }
  }, [paymentConfirmation.status, paymentConfirmation.tier]);

  const handlePaymentConfirmCancel = useCallback(() => {
    // Open support link
    window.open('mailto:support@aminy.ai?subject=Payment%20Issue', '_blank');
  }, []);

  // Memoized callbacks for AuthCallback to prevent re-render loops
  const handleAuthCallbackSuccess = useCallback((email: string) => {
    setUserData(prev => ({ ...prev, email }));
    // The auth state listener will handle the rest
  }, []);

  const handleAuthCallbackPasswordReset = useCallback(() => {
    navigateToScreen("reset-password");
  }, []);

  const handleAuthCallbackError = useCallback((message: string) => {
    toast.error(message);
    navigateToScreen("login");
  }, []);

  // ======================================
  // OPTIMIZED INITIALIZATION - CRITICAL PATH FIRST
  // ======================================

  useEffect(() => {
    // Viewport height is already set in index.html - just handle updates
    let timeoutId: NodeJS.Timeout;
    const debouncedSetVH = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", `${vh}px`);
      }, 150);
    };

    window.addEventListener("resize", debouncedSetVH);
    window.addEventListener("orientationchange", () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    });

    // DEFER: Load non-critical modules after interaction or 2s
    const loadNonCritical = () => {
      // Haptics
      import("./lib/haptics")
        .then((m) => m.enableAutoHaptics?.())
        .catch((err) => logger.dev('Haptics module load failed', err));

      // Performance monitoring - lowest priority
      setTimeout(() => {
        try {
          initPerformanceMonitoring();
        } catch (err) {
          logger.dev('Performance monitor load failed', err);
        }
      }, 3000);

      // Analytics - lowest priority
      setTimeout(() => {
        try {
          initAnalytics();
        } catch (err) {
          logger.dev('Analytics engine load failed', err);
        }
      }, 5000);
    };

    // Only load after user interaction OR 2 seconds
    const loadTimer = setTimeout(loadNonCritical, 2000);
    const interactionEvents = ['click', 'touchstart', 'keydown', 'scroll'];
    const loadOnInteraction = () => {
      clearTimeout(loadTimer);
      loadNonCritical();
      interactionEvents.forEach(e => window.removeEventListener(e, loadOnInteraction));
    };
    interactionEvents.forEach(e => window.addEventListener(e, loadOnInteraction, { once: true, passive: true }));

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(loadTimer);
      window.removeEventListener("resize", debouncedSetVH);
      window.removeEventListener("orientationchange", () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", `${vh}px`);
      });
      interactionEvents.forEach(e => window.removeEventListener(e, loadOnInteraction));
    };
  }, []);

  // URL handling for direct navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(
        window.location.search,
      );
      const screen = params.get("screen");
      const tab = params.get("tab");

      if (screen && DEEP_LINKABLE_SCREENS.includes(screen as AppScreen)) {
        setCurrentScreen(screen as AppScreen);
      }

      if (tab) {
        setActiveTab(tab);
      }
    };

    window.addEventListener("popstate", handlePopState);
    handlePopState(); // Check on mount

    return () =>
      window.removeEventListener("popstate", handlePopState);
  }, []);

  // Update URL when screen changes - preserve existing params
  const navigateToScreen = (
    screen: AppScreen,
    tab?: string,
  ) => {
    setCurrentScreen(screen);
    if (tab) setActiveTab(tab);

    // Start from current URLSearchParams to preserve existing params (e.g., childId)
    const params = new URLSearchParams(window.location.search);

    // Update screen param
    if (screen !== "dashboard" && screen !== "splash") {
      params.set("screen", screen);
    } else {
      params.delete("screen");
    }

    // Update tab param
    if (tab) {
      params.set("tab", tab);
    } else {
      params.delete("tab");
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.pushState({}, "", newUrl);
  };

  // Debug navigation hooks — only available in development
  if (import.meta.env.DEV) {
    window.__navigateToScreen = (screen: string) => navigateToScreen(screen as AppScreen);
    window.__setCurrentScreen = (screen: string) => setCurrentScreen(screen as AppScreen);
  }

  // Mark as initialized immediately - session is checked synchronously on mount
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // HIPAA compliance dashboard — eagerly load compliance status on mount
  // so it's available for admin dashboard, settings, and audit exports
  const [hipaaComplianceScore, setHipaaComplianceScore] = useState<number | null>(null);
  useEffect(() => {
    try {
      const status = getComplianceStatus();
      setHipaaComplianceScore(status.overallScore);
      logger.info('[HIPAA] Compliance score loaded on startup:', status.overallScore);
    } catch (err) {
      logger.warn('[HIPAA] Compliance status check failed (non-fatal):', err);
    }
  }, []);

  // Listen for DataService errors and show toast notifications
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ operation: string; message: string }>).detail;
      const userMessage = detail.message?.includes('JWT')
        ? 'Your session has expired. Please sign in again.'
        : 'Something went wrong. Please try again.';
      toast.error(userMessage);
    };
    window.addEventListener('dataservice:error', handler);
    return () => window.removeEventListener('dataservice:error', handler);
  }, []);

  // NPS Survey trigger — show after 7 days of first sign-up, max once per 90 days
  useEffect(() => {
    const NPS_COOLDOWN_KEY = 'aminy-nps-last-shown';
    const NPS_FIRST_LOGIN_KEY = 'aminy-first-login';
    const NPS_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
    const NPS_DELAY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (!userData.id) return;

    try {
      // Respect cooldown
      const lastShown = localStorage.getItem(NPS_COOLDOWN_KEY);
      if (lastShown && Date.now() - Number(lastShown) < NPS_COOLDOWN_MS) return;

      // Track first login time
      let firstLogin = Number(localStorage.getItem(NPS_FIRST_LOGIN_KEY) || '0');
      if (!firstLogin) {
        firstLogin = Date.now();
        localStorage.setItem(NPS_FIRST_LOGIN_KEY, String(firstLogin));
      }

      // Show after 7 days of first login
      if (Date.now() - firstLogin >= NPS_DELAY_MS) {
        const timer = setTimeout(() => setShowNPSSurvey(true), 15000);
        return () => clearTimeout(timer);
      }
    } catch {
      // Silently fail — NPS is non-critical
    }
  }, [userData.id]);

  // CSS rule [style*="opacity: 0"] { opacity: 1 !important } in index.css handles
  // the inline opacity:0 that motion/react v12 sets as initial animation state.
  // WAAPI animations override CSS !important while running, so active animations
  // still work correctly. The CSS rule is the passive safety net.

  // Supabase auth state listener - handles session changes from OAuth, login, logout
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        window.setTimeout(() => {
          void (async () => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          hadSessionRef.current = true;
          // Load user profile and children data from Supabase
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            // Also load children data
            const { data: children } = await supabase
              .from('children')
              .select('*')
              .eq('parent_id', session.user.id)
              .order('created_at', { ascending: true });

            // Find the primary child or first child
            const primaryChild = children?.find((c: { is_primary?: boolean }) => c.is_primary) || children?.[0];

            if (profile) {
              const sessionEmail = session.user.email || '';
              const metadataParentName = typeof session.user.user_metadata?.full_name === 'string'
                ? session.user.user_metadata.full_name
                : '';

              setUserData(prev => {
                const sameAccount = Boolean(prev.email && prev.email === sessionEmail);

                return ({
                  ...prev,
                  id: session.user.id,
                  userId: session.user.id,
                  name: metadataParentName || prev.name,
                  parentName: profile.parent_name || metadataParentName || (sameAccount ? prev.parentName : ''),
                  childName: primaryChild?.name || profile.child_name || (sameAccount ? prev.childName : ''),
                  childAge: primaryChild?.age_years || primaryChild?.age || (sameAccount ? prev.childAge : undefined),
                  childId: primaryChild?.id || (sameAccount ? prev.childId : undefined),
                  activeChildId: primaryChild?.id || (sameAccount ? prev.activeChildId : undefined),
                  children: children || prev.children,
                  relationship: profile.relationship || (sameAccount ? prev.relationship : ''),
                  state: profile.state || (sameAccount ? prev.state : ''),
                  tier: (profile.tier as TierType) || prev.tier,
                  role: profile.role || prev.role,
                  email: sessionEmail || prev.email,
                  hasCompletedOnboarding: profile.has_completed_onboarding || false,
                  pilotEligible: typeof profile.pilot_eligible === 'boolean' ? profile.pilot_eligible : prev.pilotEligible,
                pilotOrganization: typeof profile.pilot_organization === 'string'
                  ? profile.pilot_organization as PilotOrganization
                  : prev.pilotOrganization,
                pilotPayers: Array.isArray(profile.pilot_payers)
                  ? profile.pilot_payers as PilotPayer[]
                  : prev.pilotPayers,
                  evvSystem: typeof profile.evv_system === 'string'
                    ? profile.evv_system as EVVSystem
                    : prev.evvSystem,
                  systemOfRecord: typeof profile.system_of_record === 'string'
                    ? profile.system_of_record as SystemOfRecord
                    : prev.systemOfRecord,
                });
              });

              // Set Sentry user context for error tracking
              setSentryUser({
                id: session.user.id,
                email: session.user.email,
                tier: profile.tier || 'free',
              });

              // Start the proactive nudge scheduler for authenticated users
              proactiveNudges.start();

              // Only navigate if user is on an auth/login screen — don't redirect
              // away from public pages like provider-landing.
              // Use ref to get the *current* screen (avoids stale closure).
              const screen = currentScreenRef.current;
              if (!PUBLIC_NO_REDIRECT_SCREENS.includes(screen) && shouldRedirectAfterAuth(screen)) {
                if (profile.has_completed_onboarding) {
                  // ─── MFA CHECK (HIPAA) ─────────────────────────
                  // For providers/admins, check MFA status before allowing access.
                  const userRole = profile.role || 'parent';
                  if (userRole === 'provider' || userRole === 'admin') {
                    try {
                      const mfaState = await getMFAState();

                      if (mfaState.needsVerification) {
                        // Has MFA enrolled but session is only AAL1 — verify
                        navigateToScreen('mfa-verification');
                        return; // Don't navigate further until MFA verified
                      }

                      if (mfaState.needsEnrollment) {
                        // MFA required but not enrolled — force enrollment
                        setMfaRequired(true);
                        setMfaGracePeriodEnds(undefined);
                        navigateToScreen('mfa-enrollment');
                        return;
                      }

                      if (!mfaState.status.isEnrolled && !mfaState.requirement.required && mfaState.requirement.gracePeriodEnds) {
                        // Within grace period, not enrolled — prompt enrollment (skippable)
                        // Throttle prompts: at most once per day via localStorage
                        const prompted = localStorage.getItem('aminy-mfa-enrollment-prompted');
                        const now = Date.now();
                        const ONE_DAY = 24 * 60 * 60 * 1000;

                        if (!prompted || (now - parseInt(prompted, 10)) > ONE_DAY) {
                          localStorage.setItem('aminy-mfa-enrollment-prompted', String(now));
                          setMfaRequired(false);
                          setMfaGracePeriodEnds(mfaState.requirement.gracePeriodEnds);
                          navigateToScreen('mfa-enrollment');
                          return;
                        }
                      }

                      // MFA satisfied or grace period prompt already shown today — proceed
                    } catch (mfaError) {
                      // MFA check failed — don't block login, log and continue
                      logger.error('MFA check failed during sign-in', mfaError);
                    }
                  }
                  // ─── END MFA CHECK ─────────────────────────────

                  navigateToScreen(getAuthenticatedLandingScreen());
                } else {
                  navigateToScreen('onboarding');
                }
              }
            } else {
              // New user, start onboarding
              setUserData(prev => ({
                ...prev,
                email: session.user.email || '',
              }));
              const screen = currentScreenRef.current;
              if (shouldRedirectAfterAuth(screen)) {
                navigateToScreen('onboarding');
              }
            }
          } catch (error) {
            logger.error('Error loading profile', error);
            // Still set email
            setUserData(prev => ({
              ...prev,
              email: session.user.email || '',
            }));
            const screen = currentScreenRef.current;
            if (shouldRedirectAfterAuth(screen)) {
              navigateToScreen('onboarding');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          // Stop the proactive nudge scheduler
          proactiveNudges.stop();

          // Clear Sentry user context
          clearSentryUser();

          // Detect session expiry vs. intentional logout
          const wasIntentional = intentionalLogoutRef.current;
          intentionalLogoutRef.current = false; // Reset the flag

          // Clear user data on sign out (removes both encrypted + unencrypted versions)
          syncEncryptedStorage.removeItem('aminy-user');
          setUserData({
            parentName: '',
            childName: '',
            relationship: '',
            state: '',
            hasCompletedOnboarding: false,
            tier: 'free',
          });
          navigateToScreen('login');

          if (!wasIntentional && hadSessionRef.current) {
            // Session expired unexpectedly — let the user know
            toast.error('Your session has expired. Please sign in again.', {
              duration: 6000,
            });
            logger.dev('Session expired — auto-signed out');
          }
          hadSessionRef.current = false;
        } else if (event === 'TOKEN_REFRESHED') {
          logger.dev('Auth token refreshed successfully');
        }
          })();
        }, 0);
      }
    );

    // Auto-refresh session tokens before expiry (every 60s)
    const cleanupSessionRefresh = setupSessionRefresh();

    return () => {
      subscription.unsubscribe();
      cleanupSessionRefresh();
      // Stop nudge scheduler when the app-level auth effect cleans up
      proactiveNudges.stop();
    };
  }, []);

  // Periodic session health check — every 5 minutes, verify the session is still valid
  // This catches edge cases where the token silently expires between auto-refresh cycles
  useEffect(() => {
    const authScreens = ['login', 'create-account', 'auth-callback', 'splash'];
    const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

    const checkSession = async () => {
      const screen = currentScreenRef.current;
      // Only check if user is on an authenticated screen
      if (authScreens.includes(screen)) return;

      try {
        // Only check if user previously had a valid session (skip in dev/demo mode)
        if (!hadSessionRef.current) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Session is gone — token refresh must have failed silently
          logger.dev('Session health check: no active session, redirecting to login');
          toast.error('Your session has expired. Please sign in again.', {
            duration: 6000,
          });
          hadSessionRef.current = false;
          navigateToScreen('login');
        }
      } catch {
        // Network error — don't redirect, just log
        logger.dev('Session health check: network error (ignoring)');
      }
    };

    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Save user data to localStorage whenever it changes
  useEffect(() => {
    if (userData.parentName || userData.childName) {
      localStorage.setItem(
        "aminy-user",
        JSON.stringify(userData),
      );
    }
  }, [userData]);

  const handleGetStarted = () => {
    navigateToScreen("create-account");
  };

  const handleLogin = () => {
    navigateToScreen("login");
  };

  const handleLoginSuccess = (email: string) => {
    // Only set email here — the auth state listener will load the full profile
    // (childName, childAge, hasCompletedOnboarding, etc.) from Supabase and
    // navigate to the correct screen (dashboard or onboarding).
    setUserData((prev) => ({
      ...prev,
      email,
    }));
    toast.success("Good to see you — let's make today great.");
  };

  const handleCreateAccount = (email: string) => {
    setUserData((prev) => ({
      ...prev,
      email,
    }));
    navigateToScreen("onboarding");
  };

  const handleOnboardingComplete = async (data: Partial<UserData>) => {
    const updatedData = {
      ...userData,
      ...data,
      hasCompletedOnboarding: true,
      tier: "free" as TierType, // Start as free, paywall will handle upgrade
    };

    // Update local state FIRST - this ensures navigation works
    setUserData((prev) => ({
      ...prev,
      ...data,
      hasCompletedOnboarding: true,
      tier: "free",
    }));

    navigateToScreen(getAuthenticatedLandingScreen());

    // Do DB operations in background - don't block the user
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        if (userId) {
          // Upsert profile - non-blocking (only use columns that exist in profiles table)
          supabase.from('profiles').upsert({
            id: userId,
            parent_name: updatedData.parentName,
            child_name: updatedData.childName,
            relationship: updatedData.relationship,
            state: updatedData.state,
            tier: 'free',
            has_completed_onboarding: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' }).then(null, (err: unknown) => logger.error('Profile upsert error', err));

          const { data: children } = await supabase
            .from('children')
            .select('id, name, age_years, is_primary')
            .eq('parent_id', userId)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true });

          const primaryChild = children?.find((child: { is_primary?: boolean }) => child.is_primary) || children?.[0];

          if (primaryChild?.id) {
            setUserData((prev) => ({
              ...prev,
              childId: primaryChild.id,
              activeChildId: primaryChild.id,
              childName: primaryChild.name || prev.childName,
              childAge: primaryChild.age_years || prev.childAge,
            }));
          }

          // Trial tracking - non-blocking
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 7);
          supabase.from('trial_tracking').upsert({
            user_id: userId,
            trial_started_at: new Date().toISOString(),
            trial_ends_at: trialEnd.toISOString(),
            conversations_used: 0,
            max_trial_conversations: 5,
            is_converted: false,
          }, { onConflict: 'user_id' }).then(null, (err: unknown) => logger.error('Trial tracking error', err));

          if (primaryChild?.id) {
            const defaultGoals = [
              { id: `goal-${primaryChild.id}-comm`, title: 'Communication', progress: 0, is_active: true },
              { id: `goal-${primaryChild.id}-reg`, title: 'Self-Regulation', progress: 0, is_active: true },
              { id: `goal-${primaryChild.id}-routine`, title: 'Daily Routines', progress: 0, is_active: true },
            ];
            supabase.from('goals').upsert(
              defaultGoals.map(g => ({
                ...g,
                user_id: userId,
                child_id: primaryChild.id,
                created_at: new Date().toISOString(),
              })),
              { onConflict: 'id' }
            ).then(null, (err: unknown) => logger.error('Goals creation error', err));

            generateDailyPlan({ userId, childId: primaryChild.id }).catch((err) => {
              logger.error('Daily plan generation error', err);
            });
          }

          // Retention flows - non-blocking
          if (updatedData.email && updatedData.childName && updatedData.parentName) {
            triggerRetentionFlow(
              userId,
              updatedData.email,
              updatedData.childName,
              updatedData.parentName
            ).catch(err => logger.error('Retention flow error', err));
          }
        }
      } catch (error) {
        logger.error('Background onboarding save error', error);
      }
    })();
  };

  const handlePaywallTrigger = () => {
    navigateToScreen("paywall");
  };

  const handleSubscribe = (tier: TierType) => {
    setUserData((prev) => ({
      ...prev,
      tier,
    }));
    navigateToScreen("dashboard");
    // Use utility function for consistent tier display names
    toast.success(
      `Upgraded to ${getTierDisplayName(tier)}! 🚀`,
    );
  };

  const handleLogout = async () => {
    // Flag so the auth listener knows this is intentional (not a session expiry)
    intentionalLogoutRef.current = true;
    // Stop proactive nudge scheduler on explicit logout
    proactiveNudges.stop();
    // Sign out from Supabase to clear the session
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logger.error("Error signing out", error);
    }
    // Clear local storage (encrypted storage handles both enc_ and plain keys)
    syncEncryptedStorage.removeItem("aminy-user");
    syncEncryptedStorage.removeItem("aminy-onboarding-progress");
    setUserData({
      parentName: "",
      childName: "",
      relationship: "",
      state: "",
      hasCompletedOnboarding: false,
      tier: "free",
    });
    setCurrentScreen("splash");
    setActiveTab("home");
    // Clear all URL params on logout
    window.history.pushState({}, "", window.location.pathname);
    toast.info("You have been logged out");
  };

  const handleMessageSent = () => {
    if (userData.tier === "free") {
      setMessagesLeft((prev) => Math.max(0, prev - 1));
    }
  };

  const handleHelpOpen = () => {
    setShowHelpModal(true);
  };

  const handleHelpClose = () => {
    setShowHelpModal(false);
  };

  // Pull-to-refresh handler for dashboard
  const handleRefresh = async () => {
    if (currentScreen === "dashboard") {
      // Simulate data refresh
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Dashboard refreshed");
      return Promise.resolve();
    }
    return Promise.resolve();
  };

  // Swipe navigation handlers
  const handleSwipeLeft = () => {
    // Navigate forward in screen history if applicable
    if (currentScreen === "dashboard") {
      // Could navigate to next tab or screen
    }
  };

  const handleSwipeRight = () => {
    // Navigate back in screen history
    if (
      currentScreen !== "splash" &&
      currentScreen !== "dashboard"
    ) {
      navigateToScreen("dashboard");
    }
  };

  // Show FAB on feature screens (but NOT on Dashboard since it has its own integrated chat)
  // Also NOT on Junior - kids don't need Ask Aminy
  const showFAB =
    currentScreen === "benefits" ||
    currentScreen === "telehealth" ||
    currentScreen === "caregivers" ||
    currentScreen === "vault";

  // Determine if screen should have swipe navigation
  // Exclude public/standalone pages that need native scrolling
  const shouldEnableSwipe =
    currentScreen !== "splash" &&
    currentScreen !== "login" &&
    currentScreen !== "create-account" &&
    currentScreen !== "onboarding" &&
    currentScreen !== "provider-landing" &&
    currentScreen !== "provider-apply" &&
    currentScreen !== "free-screening" &&
    currentScreen !== "mfa-enrollment" &&
    currentScreen !== "mfa-verification";

  // Determine if screen should have pull-to-refresh
  const shouldEnablePullToRefresh =
    currentScreen === "dashboard";

  // Render current screen with lazy loading
  const renderScreen = () => {
    const launchConfig = getSurfaceLaunchConfig(currentScreen);
    const surfaceAccess = getSurfaceAccessDecision(currentScreen, pilotAccessContext);

    // Check if this screen is gated behind a product feature flag.
    // Pilot-authorized Arizona users can bypass the generic env gate for pilot-tagged surfaces.
    const gateReason = getScreenGateReason(currentScreen);
    if (
      gateReason &&
      !(
        (launchConfig.state === "pilot" || launchConfig.state === "limited_launch") &&
        surfaceAccess.allowed
      )
    ) {
      const shouldUsePilotCopy = launchConfig.state === 'pilot' || launchConfig.state === 'limited_launch';
      return (
        <GatedScreenPlaceholder
          gateReason={shouldUsePilotCopy ? "pilot" : gateReason}
          customTitle={shouldUsePilotCopy ? surfaceAccess.title : undefined}
          customDescription={shouldUsePilotCopy ? surfaceAccess.message : undefined}
          onBack={() => navigateToScreen("dashboard")}
        />
      );
    }

    if (!surfaceAccess.allowed) {
      return (
        <GatedScreenPlaceholder
          gateReason={surfaceAccess.gateReason || "pilot"}
          customTitle={surfaceAccess.title}
          customDescription={surfaceAccess.message}
          onBack={() => navigateToScreen("dashboard")}
        />
      );
    }

    const screen = (() => {
      switch (currentScreen) {
        case "splash":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <SplashPage
                onStartTrial={handleGetStarted}
                onSignIn={handleLogin}
                onStartReflection={handleGetStarted}
                onForProviders={() => navigateToScreen("provider-landing")}
                onFreeScreening={() => navigateToScreen("free-screening")}
              />
            </Suspense>
          );

        case "login":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <LoginScreen
                onLogin={handleLoginSuccess}
                onBack={() => navigateToScreen("splash")}
                onCreateAccount={() =>
                  navigateToScreen("create-account")
                }
                onForgotPassword={() =>
                  navigateToScreen("forgot-password")
                }
              />
            </Suspense>
          );

        case "forgot-password":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ForgotPasswordScreen
                onBack={() => navigateToScreen("login")}
                onBackToLogin={() => navigateToScreen("login")}
              />
            </Suspense>
          );

        case "reset-password":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ResetPasswordScreen
                onSuccess={() => {
                  toast.success("Password updated successfully!");
                  navigateToScreen("login");
                }}
                onBack={() => navigateToScreen("login")}
              />
            </Suspense>
          );

        case "auth-callback":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <AuthCallback
                onAuthSuccess={handleAuthCallbackSuccess}
                onPasswordReset={handleAuthCallbackPasswordReset}
                onError={handleAuthCallbackError}
              />
            </Suspense>
          );

        case "create-account":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <CreateAccountScreen
                onCreateAccount={handleCreateAccount}
                onBack={() => navigateToScreen("splash")}
                onLogin={() => navigateToScreen("login")}
              />
            </Suspense>
          );

        case "free-screening":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <FreeScreeningFlow
                onBack={() => navigateToScreen("splash")}
                onSignUp={() => navigateToScreen("create-account")}
                onBookEvaluation={() => {
                  // Screening routing handled by useOnboardingData hook — navigate directly
                  navigateToScreen("marketplace");
                }}
              />
            </Suspense>
          );

        case "onboarding":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <OnboardingStreamlined
                onComplete={handleOnboardingComplete}
                initialEmail={userData.email || ""}
              />
            </Suspense>
          );

        case "dashboard":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <Dashboard
                userData={{
                  parentName: userData.parentName,
                  childName: userData.childName,
                }}
                userTier={userData.tier}
                userRole={userData.role || 'parent'}
                onNavigate={(destination) => {
                  // Handle paywall specially
                  if (destination === "paywall") {
                    handlePaywallTrigger();
                    return;
                  }
                  // Handle AI center button — open the floating chat panel
                  if (destination === "ask-aminy") {
                    setFabOpen(true);
                    return;
                  }
                  // Map nav IDs to screen IDs (bottom nav / More menu aliases)
                  const navAliases: Record<string, AppScreen> = {
                    'plan': 'care-plan',
                    'document-vault': 'vault',
                    'care': 'conversational-booking',
                    'reports': 'clinical-reports',
                    'vision-ai': 'vision-ai',
                    'caregiver-enrollment': 'caregiver-enrollment',
                    'b2b-partner': 'b2b-partner',
                    'b2b-setup': 'b2b-setup',
                  };
                  const resolved = navAliases[destination] || destination;
                  // Map any valid screen destination
                  const validScreens: AppScreen[] = [
                    "telehealth", "caregivers", "vault", "bcba-portal", "marketplace",
                    "provider-portal", "provider-onboarding", "insight-report", "outcomes", "on-demand-telehealth",
                    "settings", "calm-tools", "incident-log", "care-plan", "resources",
                    "community", "profile", "benefits", "junior", "my-appointments",
                    "conversational-booking", "messages", "access-requests", "store",
                    "community-hub", "provider-analytics", "weekly-insights", "analytics-charts",
                    "evv-dashboard", "claims-dashboard", "payer-dashboard", "clinical-reports",
                    "prior-auth", "vision-ai", "caregiver-enrollment", "b2b-partner", "b2b-setup",
                    "outcome-measures", "cr-sync", "revenue-dashboard", "waiting-room",
                    "referral-dashboard",
                  ];
                  if (validScreens.includes(resolved as AppScreen)) {
                    navigateToScreen(resolved as AppScreen);
                  }
                }}
              />
            </Suspense>
          );

        case "telehealth":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <TelehealthHome
                onBack={() => navigateToScreen("dashboard")}
                userState={userData.state || "AZ"}
                userName={userData.parentName || "there"}
                onNavigate={(destination) => {
                  if (destination === "on-demand-telehealth") {
                    navigateToScreen("on-demand-telehealth");
                  } else if (destination === "messages") {
                    // Navigate to Ask Aminy / messages
                    navigateToScreen("dashboard");
                  } else if (destination === "resources") {
                    navigateToScreen("resources");
                  } else if (destination === "find-care") {
                    navigateToScreen("marketplace");
                  }
                }}
              />
            </Suspense>
          );

        case "caregivers":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <CaregiverManagementScreen
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "vault":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <RecordsVault
                onBack={() => navigateToScreen("dashboard")}
                onClose={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "settings":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <SettingsScreen
                onBack={() => navigateToScreen("dashboard")}
                onLogout={handleLogout}
                onNavigate={(screen) => navigateToScreen(screen as AppScreen)}
                userTier={userData.tier || 'free'}
              />
            </Suspense>
          );

        case "paywall":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <PaywallScreen
                onSubscribe={handleSubscribe}
                onClose={() => navigateToScreen("dashboard")}
                childName={userData.childName}
              />
            </Suspense>
          );

        case "bcba-portal":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <BCBACoachPortal
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "launch-status":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <LaunchStatusDashboard
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "analytics":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <EnhancedAnalyticsDashboard
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "phase2-menu":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <Phase2FeaturesMenu
                onNavigate={(screen) => {
                  if (screen === "bcba-portal") {
                    navigateToScreen("bcba-portal");
                  } else if (screen === "launch-status") {
                    navigateToScreen("launch-status");
                  } else if (screen === "analytics") {
                    navigateToScreen("analytics");
                  } else if (screen === "marketplace") {
                    navigateToScreen("marketplace");
                  } else if (screen === "provider-portal") {
                    navigateToScreen("provider-portal");
                  } else if (screen === "outcomes") {
                    navigateToScreen("outcomes");
                  }
                }}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "marketplace":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ProviderMarketplace
                onBack={() => navigateToScreen("dashboard")}
                onBookSession={(providerId: string) => {
                  // Navigate to telehealth booking flow
                  navigateToScreen("telehealth");
                }}
              />
            </Suspense>
          );

        case "provider-portal":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ProviderPortal
                providerId={userData.id || '00000000-0000-0000-0000-000000000000'}
              />
            </Suspense>
          );

        case "provider-onboarding":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ProviderOnboarding
                onBack={() => navigateToScreen("dashboard")}
                onComplete={(providerId) => {
                  // After onboarding, route to identity verification before marketplace listing
                  setPendingProviderId(providerId);
                  navigateToScreen("provider-identity-verification");
                }}
              />
            </Suspense>
          );

        case "provider-identity-verification":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ProviderIdentityVerification
                providerId={pendingProviderId || 'unknown'}
                onComplete={() => navigateToScreen("provider-portal")}
                onBack={() => navigateToScreen("provider-portal")}
              />
            </Suspense>
          );

        case "insight-report":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <InsightNavigatorReport
                childId={userData.childId || "child-1"}
                mode="parent"
              />
            </Suspense>
          );

        case "outcomes":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <OutcomesTracking
                childId={userData.childId || "child-1"}
                view="caregiver"
              />
            </Suspense>
          );

        case "admin-portal":
          // Secure admin portal with server-side verification
          // SECURITY: Uses database role verification, not localStorage
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <SecureAdminPortalWrapper
                userId={userData.id}
                onBack={() => navigateToScreen("dashboard")}
                onAccessDenied={() => {
                  toast.error("Admin access denied");
                  navigateToScreen("dashboard");
                }}
              />
            </Suspense>
          );

        case "on-demand-telehealth":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <OnDemandTelehealth
                onBack={() => navigateToScreen("dashboard")}
                onSessionEnd={() => {
                  navigateToScreen("dashboard");
                  toast.success("Session completed successfully!");
                }}
                childName={userData.childName || "your child"}
                userTier={userData.tier as string}
              />
            </Suspense>
          );

        case "calm-tools":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <SensoryTools
                childName={userData.childName || "your child"}
                onBack={() => navigateToScreen("dashboard")}
                onSessionComplete={async (sessionData) => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    const uid = user?.id;
                    if (uid) {
                      // Persist calm session to Supabase
                      await supabase.from('calm_tool_sessions').insert({
                        user_id: uid,
                        mood_before: sessionData?.moodBefore || null,
                        mood_after: sessionData?.moodAfter || null,
                        duration_seconds: sessionData?.duration || 0,
                        coins_earned: sessionData?.coinsEarned || 10,
                        tool_type: sessionData?.toolType || 'calm',
                        completed_at: new Date().toISOString(),
                      }).then(() => {});

                      // Streak + badges
                      incrementStreak(uid).catch(() => {});
                      checkAndAwardBadges(uid, 'calm_session').catch(() => {});

                      // Record to parent-junior bridge
                      recordJuniorProgress(userData.childId || 'default', {
                        activityId: `calm-${Date.now()}`,
                        activityTitle: sessionData?.toolType || 'Calm Tool Session',
                        domain: 'regulation',
                        durationSeconds: (sessionData?.duration || 0) * 60,
                        tokensEarned: sessionData?.coinsEarned || 10,
                        completedAt: new Date().toISOString(),
                      });
                    }
                    toast.success(`Great job! +${sessionData?.coinsEarned || 10} calm coins earned`);
                  } catch (e) {
                    console.error('Session complete error:', e);
                    toast.success('Session complete!');
                  }
                }}
              />
            </Suspense>
          );

        case "incident-log":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ActivityLog
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "care-plan":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <CareTab
                childName={userData.childName}
                userTier={userData.tier as string}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "resources":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <CommunityForYou
                childName={userData.childName}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "community":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <CommunityForYou
                childName={userData.childName}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "profile":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ProfileScreen
                onBack={() => navigateToScreen("dashboard")}
                onNavigate={(screen) => navigateToScreen(screen as AppScreen)}
                userTier={userData.tier || 'free'}
              />
            </Suspense>
          );

        case "benefits":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <BenefitsNavigatorScreen
                onBack={() => navigateToScreen("dashboard")}
                onNavigate={(screen: string) => navigateToScreen(screen as AppScreen)}
              />
            </Suspense>
          );

        case "prior-auth":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <PriorAuthFlow
                onBack={() => navigateToScreen("benefits")}
                onComplete={() => navigateToScreen("benefits")}
                childName={userData.childName}
              />
            </Suspense>
          );

        case "junior":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <JuniorPageEnhancedPro
                userData={{
                  parentName: userData.parentName || "Parent",
                  childName: userData.childName || "Alex"
                }}
                userTier={userData.tier || "starter"}
              />
            </Suspense>
          );

        case "privacy-policy":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <PrivacyPolicy
                onBack={() => navigateToScreen("splash")}
              />
            </Suspense>
          );

        case "terms-of-service":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <TermsOfService
                onBack={() => navigateToScreen("splash")}
              />
            </Suspense>
          );

        case "join":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ReferralLanding
                onNavigateToSignup={() => navigateToScreen("create-account")}
                onNavigateToLogin={() => navigateToScreen("login")}
              />
            </Suspense>
          );

        case "my-appointments":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <MyAppointments
                onBack={() => navigateToScreen("dashboard")}
                onBookNew={() => navigateToScreen("conversational-booking")}
                onNavigateToProvider={() => navigateToScreen("marketplace")}
              />
            </Suspense>
          );

        case "conversational-booking":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ConversationalBooking
                onBack={() => navigateToScreen("telehealth")}
                onComplete={() => {
                  navigateToScreen("my-appointments");
                  toast.success("Session booked! You'll receive a confirmation email.");
                }}
                childName={userData.childName || "your child"}
              />
            </Suspense>
          );

        case "messages":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <SecureMessaging
                userId={userData.id || "parent-1"}
                userRole="parent"
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "access-requests":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ProviderAccessRequests
                userId={userData.id || "parent-1"}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "provider-landing":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ProviderLanding
                onApply={() => navigateToScreen("provider-apply")}
                onLogin={() => navigateToScreen("login")}
                onBack={() => navigateToScreen("splash")}
              />
            </Suspense>
          );

        case "provider-apply":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ProviderApplication
                onBack={() => navigateToScreen("provider-landing")}
                onSuccess={() => {
                  toast.success("Application submitted! We'll review your credentials.");
                  navigateToScreen("dashboard");
                }}
                userEmail={userData.email}
                userName={userData.parentName}
              />
            </Suspense>
          );

        case "medications":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
                <MedicationTracker
                  childId={userData.childId || "child-1"}
                  childName={userData.childName || "your child"}
                  onClose={() => navigateToScreen("dashboard")}
                />
              </div>
            </Suspense>
          );

        case "crisis-resources":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <CrisisResources
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "weekly-insights":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24">
                <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                  <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigateToScreen("dashboard")}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <span className="sr-only">Back</span>
                        ←
                      </button>
                      <h1 className="text-xl font-semibold dark:text-white">Weekly Insights</h1>
                    </div>
                  </div>
                </div>
                <div className="max-w-2xl mx-auto px-4 py-6">
                  <WeeklyAISummary
                    childName={userData.childName || 'Your child'}
                    childId={userData.activeChildId}
                    onViewDetails={() => navigateToScreen("analytics-charts")}
                  />
                </div>
              </div>
            </Suspense>
          );

        case "analytics-charts":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24">
                <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                  <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigateToScreen("dashboard")}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <span className="sr-only">Back</span>
                        ←
                      </button>
                      <h1 className="text-xl font-semibold dark:text-white">Analytics</h1>
                    </div>
                  </div>
                </div>
                <div className="max-w-2xl mx-auto px-4 py-6">
                  <AnalyticsCharts
                    childName={userData.childName || 'Your child'}
                    childId={userData.activeChildId}
                  />
                </div>
              </div>
            </Suspense>
          );

        case "store":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <StoreMarketplace
                onBack={() => navigateToScreen("dashboard")}
                userTier={userData.tier || 'free'}
                onUpgrade={() => navigateToScreen("paywall")}
              />
            </Suspense>
          );

        case "community-hub":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <CommunityHub
                onBack={() => navigateToScreen("dashboard")}
                userTier={userData.tier || 'free'}
                userName={userData.parentName || 'Parent'}
                userId={userData.userId || ''}
                onUpgrade={() => navigateToScreen("paywall")}
              />
            </Suspense>
          );

        case "provider-analytics":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ProviderAnalytics
                providerId={userData.id || '00000000-0000-0000-0000-000000000000'}
                onBack={() => navigateToScreen("provider-portal")}
              />
            </Suspense>
          );

        case "evv-dashboard":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <EVVDashboard
                childId={userData.activeChildId || userData.childId || "child-1"}
                childName={userData.childName || "Your Child"}
                userRole={userData.role === 'provider' ? 'provider' : userData.role === 'admin' ? 'admin' : 'parent'}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "claims-dashboard":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ClaimsDashboard
                userId={paymentUserId || "demo-user"}
                childId={userData.activeChildId || userData.childId || "child-1"}
                childName={userData.childName || "Your Child"}
                childDOB={userData.childDOB}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "payer-dashboard":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <PayerOutcomesDashboard
                organizationName="Aminy Health Plan"
                organizationType="mco"
                onExportReport={() => {
                  try {
                    const compliance = getComplianceStatus();
                    const phiReport = generatePHIAccessReport(90);
                    const exportData = {
                      generatedAt: new Date().toISOString(),
                      complianceScore: compliance.overallScore,
                      unresolvedAlerts: compliance.unresolvedAlerts,
                      phiAccessSummary: {
                        totalAccesses: phiReport.totalAccesses,
                        uniqueUsers: phiReport.uniqueUsers,
                        riskScore: phiReport.riskScore,
                      },
                      retentionCompliant: compliance.retentionCompliant,
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `aminy-payer-report-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error(error);
                  }
                }}
              />
            </Suspense>
          );

        case "clinical-reports":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ClinicalReportExport
                childName={userData.childName || "Your Child"}
                childId={userData.childId || "child-1"}
                userTier={userData.tier || "free"}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "b2b-partner":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <B2BPartnerPortal
                onContactSales={() => toast.info("Sales team will reach out within 24 hours.")}
                onNavigate={(screen) => navigateToScreen(screen as AppScreen)}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "b2b-setup":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <B2BOrgSetup
                onComplete={() => navigateToScreen("dashboard")}
                onBack={() => navigateToScreen("b2b-partner")}
              />
            </Suspense>
          );

        case "caregiver-enrollment":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <CaregiverEnrollmentWizard
                onComplete={() => navigateToScreen("dashboard")}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "vision-ai":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <VisionAI
                tier={userData.tier === 'proplus' ? 'pro_plus' : userData.tier === 'pro' ? 'pro' : 'core'}
                onBack={() => navigateToScreen("dashboard")}
                onAnalysisComplete={(_result) => {
                  // Vision result stored by useContentData hook — no localStorage needed
                  navigateToScreen("dashboard");
                }}
              />
            </Suspense>
          );

        case "outcome-measures":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <OutcomeMeasures
                userId={userData.id}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "mfa-enrollment":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <MFAEnrollment
                onComplete={() => {
                  navigateToScreen(getAuthenticatedLandingScreen());
                }}
                onSkip={!mfaRequired ? () => {
                  navigateToScreen(getAuthenticatedLandingScreen());
                } : undefined}
                required={mfaRequired}
                gracePeriodEnds={mfaGracePeriodEnds}
              />
            </Suspense>
          );

        case "mfa-verification":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <MFAVerification
                onSuccess={() => {
                  navigateToScreen(getAuthenticatedLandingScreen());
                }}
                onCancel={() => {
                  // Cancel MFA — sign out and return to login
                  intentionalLogoutRef.current = true;
                  supabase.auth.signOut();
                  navigateToScreen('login');
                }}
                email={userData.email}
              />
            </Suspense>
          );

        case "video-call":
          return (
            <Suspense fallback={<LoadingSkeleton screen="telehealth" />}>
              <VideoCall
                sessionId={activeSessionId || ''}
                userId={userData.id || ''}
                userName={userData.name || 'User'}
                isProvider={userData.role === 'provider' || userData.role === 'admin'}
                onCallEnd={() => navigateToScreen("telehealth")}
              />
            </Suspense>
          );

        case "pre-call-setup":
          return (
            <Suspense fallback={<LoadingSkeleton screen="telehealth" />}>
              <PreCallSetup
                onReady={() => navigateToScreen("video-call")}
                onCancel={() => navigateToScreen("telehealth")}
              />
            </Suspense>
          );

        case "bcba-briefing":
          return (
            <Suspense fallback={<LoadingSkeleton screen="telehealth" />}>
              <BCBASessionBriefing
                familyId={activeFamilyId || ''}
                childName={userData.childName || 'Patient'}
                parentName={userData.name || 'Parent'}
                sessionType="bcba-45"
                onStartSession={() => navigateToScreen("pre-call-setup")}
              />
            </Suspense>
          );

        case "provider-reviews":
          return (
            <Suspense fallback={<LoadingSkeleton screen="marketplace" />}>
              <ProviderReviews
                providerId={viewingProviderId || ''}
                providerName={viewingProviderName || 'Provider'}
                reviews={[]}
                stats={{ averageRating: 0, totalReviews: 0, ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, recommendRate: 0 }}
              />
            </Suspense>
          );

        case "referral-dashboard":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ReferralDashboard
                userId={userData.id || ''}
                userName={userData.name || 'User'}
              />
            </Suspense>
          );

        case "mchat-screening":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <MCHATScreening
                onComplete={(score, riskLevel) => {
                  logger.info('M-CHAT screening complete', { score, riskLevel });
                  navigateToScreen("dashboard");
                }}
                onBack={() => navigateToScreen("dashboard")}
                childName={userData.childName || "your child"}
              />
            </Suspense>
          );

        case "account-settings":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <AccountSettingsPremium
                onBack={() => navigateToScreen("settings")}
                onLogout={handleLogout}
                onNavigate={(screen) => navigateToScreen(screen as AppScreen)}
                userTier={userData.tier}
              />
            </Suspense>
          );

        case "caregiver-timesheet":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <CaregiverTimesheet
                onBack={() => navigateToScreen("caregivers")}
                caregiverName={userData.parentName || "Caregiver"}
              />
            </Suspense>
          );

        case "parent-calm-mode":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ParentCalmMode
                isOpen={true}
                fullScreen={true}
                onClose={() => navigateToScreen("dashboard")}
                onTalkToAminy={() => navigateToScreen("dashboard")}
                parentName={userData.parentName || "Parent"}
              />
            </Suspense>
          );

        case "token-rewards":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <TokenRewardsBoard
                onBack={() => navigateToScreen("junior")}
                availableTokens={0}
                onSpendTokens={(amount) => {
                  logger.info('Tokens spent', { amount });
                }}
                childName={userData.childName || "your child"}
              />
            </Suspense>
          );

        case "memory-settings":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <MemorySettingsPage
                userId={userData.id || ''}
                onClose={() => navigateToScreen("settings")}
              />
            </Suspense>
          );

        case "caregiver-credentialing":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <CaregiverCredentialingWizard />
            </Suspense>
          );

        case "clinical-templates":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ProviderClinicalTemplates
                patientId={activePatientId || ''}
                patientName={userData.childName || 'Patient'}
              />
            </Suspense>
          );

        case "daily-video-room":
          return (
            <Suspense fallback={<LoadingSkeleton screen="telehealth" />}>
              <DailyVideoRoom
                roomUrl={dailyRoomUrl || ''}
              />
            </Suspense>
          );

        case "multi-role-telehealth":
          return (
            <Suspense fallback={<LoadingSkeleton screen="telehealth" />}>
              <MultiRoleTelehealthRoom
                onLeave={() => navigateToScreen("telehealth")}
                role={
                  (userData.role === 'provider' || userData.role === 'admin')
                    ? 'bcba'
                    : 'parent'
                }
                patientName={userData.childName || 'Patient'}
              />
            </Suspense>
          );

        case "parent-approval":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ParentApprovalCard
                suggestion={{
                  id: '',
                  type: 'routine_change',
                  status: 'proposed' as const,
                  createdAt: new Date().toISOString(),
                  providerId: '',
                  providerName: '',
                  providerRole: '',
                  childId: userData.childId || '',
                  rationale: '',
                  expectedOutcome: '',
                  payload: {} as Record<string, unknown>,
                }}
                onAccept={() => navigateToScreen("dashboard")}
                onReject={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "share-viewer":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <ShareViewer
                token={new URLSearchParams(window.location.search).get('token') || ''}
                onStartTrial={() => navigateToScreen("create-account")}
              />
            </Suspense>
          );

        case "video-call-room":
          return (
            <Suspense fallback={<LoadingSkeleton screen="telehealth" />}>
              <VideoCallRoom
                sessionId={activeSessionId || ''}
                userId={userData.id || ''}
                userName={userData.name || 'User'}
                isProvider={userData.role === 'provider' || userData.role === 'admin'}
                childName={userData.childName}
                onCallEnd={() => navigateToScreen("telehealth")}
              />
            </Suspense>
          );

        case "cr-sync":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <CRSyncDashboard
                userId={paymentUserId || userData.id || userData.userId || ''}
                childId={userData.activeChildId || userData.childId}
                onBack={() => navigateToScreen("settings")}
              />
            </Suspense>
          );

        case "revenue-dashboard":
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <StripeRevenueDashboard
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "waiting-room":
          return (
            <Suspense fallback={<LoadingSkeleton screen="telehealth" />}>
              <WaitingRoom
                appointmentId={activeSessionId || 'pending'}
                providerName={userData.providerName || 'Your Provider'}
                userName={userData.parentName || userData.name || 'Parent'}
                userId={userData.id || userData.userId || ''}
                onAdmitted={() => navigateToScreen("video-call-room")}
                onCancel={() => navigateToScreen("telehealth")}
              />
            </Suspense>
          );

        default:
          return (
            <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
              <SplashPage
                onStartTrial={handleGetStarted}
                onSignIn={handleLogin}
                onStartReflection={handleGetStarted}
                onForProviders={() => navigateToScreen("provider-landing")}
              />
            </Suspense>
          );
      }
    })();

    const screenWithLaunchNotice = launchConfig.showGlobalBanner !== false && !LOCAL_LAUNCH_BADGE_SCREENS.has(currentScreen)
      ? (
          <>
            {(launchConfig.state === 'pilot' || launchConfig.state === 'limited_launch') ? (
              <SurfaceLaunchNotice screen={currentScreen} />
            ) : null}
            {screen}
          </>
        )
      : screen;

    // Wrap screen with Pull-to-Refresh if applicable
    const screenWithPullToRefresh =
      shouldEnablePullToRefresh ? (
        <Suspense fallback={screenWithLaunchNotice}>
          <PullToRefresh onRefresh={handleRefresh}>
            {screenWithLaunchNotice}
          </PullToRefresh>
        </Suspense>
      ) : (
        screenWithLaunchNotice
      );

    // Wrap screen with Swipe Navigation if applicable
    return shouldEnableSwipe ? (
      <Suspense fallback={screenWithPullToRefresh}>
        <SwipeNavigation
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          disabled={!shouldEnableSwipe}
        >
          {screenWithPullToRefresh}
        </SwipeNavigation>
      </Suspense>
    ) : (
      screenWithPullToRefresh
    );
  };

  return (
    <ThemeProvider defaultTheme="system">
      <AIProvider>
        <ConversationProvider>
          <ErrorBoundary>
          <Suspense fallback={<LoadingSkeleton screen={currentScreen} />}>
            <SafetyBoundary>
              <DialogAccessibilityProvider>
                <MobilePolishEnhancer>
                  <CLSOptimizer>
                {/* Developer Mode - Only in development builds (Shift + D) */}
                {import.meta.env.DEV && (
                <DeveloperModeHandler
                  onNavigate={(screen) => {
                    navigateToScreen(screen as AppScreen);
                  }}
                  onTierChange={(tier) => {
                    setUserData((prev) => ({
                      ...prev,
                      tier: tier as TierType,
                    }));
                    toast.success(
                      `Tier updated to ${tier.toUpperCase()}`,
                    );
                  }}
                />
                )}

                <MotionConfig reducedMotion="user">
                <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
                  {/* Skip links for keyboard navigation accessibility */}
                  <div className="skip-links">
                    <a
                      href="#main"
                      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-3 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:font-medium focus:min-h-[44px] focus:flex focus:items-center"
                    >
                      Skip to main content
                    </a>
                    <a
                      href="#main-navigation"
                      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-56 focus:z-[9999] focus:px-4 focus:py-3 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:font-medium focus:min-h-[44px] focus:flex focus:items-center"
                    >
                      Skip to navigation
                    </a>
                  </div>

                  {/* Offline Indicator - Deferred */}
                  <Suspense fallback={null}>
                    <OfflineIndicator
                      onCrisisResourcesClick={() => navigateToScreen("crisis-resources")}
                    />
                  </Suspense>

                  {/* Offline Banner - Shows sync status at bottom */}
                  <Suspense fallback={null}>
                    <OfflineBanner />
                  </Suspense>

                  {/* Update Available Banner - Deferred */}
                  <Suspense fallback={null}>
                    <UpdateBanner />
                  </Suspense>

                  {/* PWA Install Prompt — encourage app installation */}
                  <Suspense fallback={null}>
                    <PWAInstallPrompt />
                  </Suspense>

                  {/* Desktop layout: sidebar + content; Mobile: content only */}
                  <div className={showDesktopAppShell ? "mx-auto max-w-7xl md:flex" : "mx-auto max-w-7xl"}>
                    {/* Desktop sidebar navigation (hidden on mobile via component) */}
                    {showDesktopAppShell ? (
                      <Suspense fallback={null}>
                        <DesktopSideNav
                          currentScreen={currentScreen}
                          onNavigate={(screen: string) => navigateToScreen(screen as AppScreen)}
                          userName={userData.name}
                        />
                      </Suspense>
                    ) : null}

                    {/* Main content area */}
                    <div className="flex-1 min-w-0">
                      {/* Payment grace period banner — shows when payment failed */}
                      {inGracePeriod && graceBannerMessage && (
                        <div
                          role="alert"
                          className={`px-4 py-3 text-sm font-medium flex items-center justify-between gap-3 ${
                            graceSeverity === 'critical'
                              ? 'bg-red-50 text-red-800 border-b border-red-200'
                              : 'bg-amber-50 text-amber-800 border-b border-amber-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg flex-shrink-0" aria-hidden="true">
                              {graceSeverity === 'critical' ? '🚨' : '⚠️'}
                            </span>
                            <span className="truncate">{graceBannerMessage}</span>
                          </div>
                          <button
                            onClick={() => navigateToScreen('paywall' as AppScreen)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] ${
                              graceSeverity === 'critical'
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-amber-600 text-white hover:bg-amber-700'
                            }`}
                          >
                            Update Payment
                          </button>
                        </div>
                      )}

                      {/* Main content with id for skip link - tabIndex for focus management */}
                      <main
                        id="main"
                        tabIndex={-1}
                        className="outline-none"
                        role="main"
                        aria-label="Main content"
                      >
                        {/* Breadcrumbs for deep navigation screens */}
                        {BREADCRUMB_TRAILS[currentScreen] && (
                          <Suspense fallback={null}>
                            <AppBreadcrumbs
                              items={BREADCRUMB_TRAILS[currentScreen]}
                              onNavigate={(screen) => navigateToScreen(screen as AppScreen)}
                              className="bg-white/80 backdrop-blur-sm border-b border-gray-100"
                            />
                          </Suspense>
                        )}
                        {renderScreen()}
                      </main>
                    </div>
                  </div>

                  {/* Persistent Ask Aminy FAB */}
                  {showFAB && (
                    <Suspense fallback={null}>
                      <PersistentAskAminyFAB
                        tier={userData.tier}
                        messagesLeft={messagesLeft}
                        onPaywallTrigger={handlePaywallTrigger}
                        position="bottom-right"
                        isOpen={fabOpen}
                        onOpenChange={setFabOpen}
                        onNavigate={(screen) => navigateToScreen(screen as AppScreen)}
                        childName={userData.childName || userData.parentName || 'your child'}
                      />
                    </Suspense>
                  )}

                  {/* Toast notifications - Deferred */}
                  <Suspense fallback={null}>
                    <Toaster />
                  </Suspense>

                  {/* Cookie Consent Banner — GDPR opt-in gates Sentry + GA */}
                  <Suspense fallback={null}>
                    <CookieConsent
                      onAccept={() => {
                        try {
                          initTracking();
                        } catch {
                          // Non-blocking: consent persists even if analytics bootstrap hiccups.
                        }
                      }}
                    />
                  </Suspense>

                  {/* Notification opt-in lives in the screen flow now to avoid duplicate modal pressure. */}

                  {/* Urgent Help Modal */}
                  {showHelpModal && (
                    <Suspense fallback={null}>
                      <UrgentHelpModal
                        isOpen={showHelpModal}
                        onClose={handleHelpClose}
                        onAnalytics={() => {}}
                      />
                    </Suspense>
                  )}

                  {/* Unload Mind removed — AI is now center nav button */}

                  {/* Payment Confirmation Modal */}
                  {showPaymentConfirmation && (
                    <Suspense fallback={null}>
                      <PaymentConfirmation
                        status={paymentConfirmation.status}
                        tier={paymentConfirmation.tier}
                        error={paymentConfirmation.error}
                        isPolling={paymentConfirmation.isPolling}
                        onRetry={paymentConfirmation.retry}
                        onContinue={handlePaymentConfirmContinue}
                        onCancel={handlePaymentConfirmCancel}
                      />
                    </Suspense>
                  )}

                  {/* Feedback Button - hidden during immersive child and booking flows */}
                  {!['junior', 'conversational-booking', 'video-call', 'pre-call-setup'].includes(currentScreen) && (
                    <Suspense fallback={null}>
                      <FeedbackButton />
                    </Suspense>
                  )}

                  {/* App Review Prompt — self-contained, triggered after positive sessions */}
                  <Suspense fallback={null}>
                    <AppReviewPrompt />
                  </Suspense>

                  {/* NPS Survey Modal — triggered after 7 days */}
                  {showNPSSurvey && (
                    <Suspense fallback={null}>
                      <NPSSurveyModal
                        isOpen={showNPSSurvey}
                        onClose={() => {
                          setShowNPSSurvey(false);
                          try {
                            localStorage.setItem('aminy-nps-last-shown', String(Date.now()));
                          } catch { /* non-critical */ }
                        }}
                        userId={userData.id || userData.userId || ''}
                        childName={userData.childName || 'your child'}
                        trigger="day_7"
                      />
                    </Suspense>
                  )}

                  {/* Feedback Collector — available on demand */}
                  {showFeedbackCollector && (
                    <Suspense fallback={null}>
                      <FeedbackCollector
                        isOpen={showFeedbackCollector}
                        onClose={() => setShowFeedbackCollector(false)}
                        userId={userData.id || userData.userId || ''}
                        context={currentScreen}
                      />
                    </Suspense>
                  )}

                  {/* Keyboard Help Modal - Shows on F1 or Shift+? */}
                  <Suspense fallback={null}>
                    <KeyboardHelpModal />
                  </Suspense>
                </div>
                </MotionConfig>
              </CLSOptimizer>
            </MobilePolishEnhancer>
          </DialogAccessibilityProvider>
        </SafetyBoundary>
      </Suspense>
    </ErrorBoundary>
        </ConversationProvider>
      </AIProvider>
    </ThemeProvider>
  );
}
