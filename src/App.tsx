import React, {
  useState,
  useEffect,
  lazy,
  Suspense,
  startTransition,
  useCallback,
} from "react";
// CRITICAL PATH - Regular imports for instant FCP (MINIMIZED)
import { ErrorBoundary } from "./components/ErrorBoundary";
import { usePaymentConfirmation, getPaymentStatusFromUrl, clearPaymentParamsFromUrl } from "./hooks/usePaymentConfirmation";

// Lazy load SplashPage (full landing page)
const SplashPage = lazy(() =>
  import("./components/SplashPage").then((m) => ({
    default: m.SplashPage,
  })),
);
import { CLSOptimizer } from "./components/CLSOptimizer";
import { toast } from "sonner";
import { TierType, getTierDisplayName } from "./lib/tier-utils";
import { handleOnboardingComplete as triggerRetentionFlow } from "./lib/store";
import { AIProvider } from "./context/AIContext";
import { ConversationProvider } from "./context/ConversationContext";
import { ThemeProvider } from "./lib/theme-provider";
import { supabase } from "./utils/supabase/client";
import { FeedbackButton } from "./components/FeedbackButton";
import { verifyAdminAccess } from "./hooks/useSecureSession";

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
const UpdateBanner = lazy(() =>
  import("./components/UpdateBanner").then((m) => ({
    default: m.UpdateBanner,
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

// OPTIMIZED LAZY LOADING - With prefetch hints
const OnboardingEnhanced = lazy(() =>
  import(
    /* webpackPrefetch: true */ "./components/OnboardingEnhanced"
  ).then((m) => ({ default: m.OnboardingEnhanced })),
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
  import("./components/PaywallScreen").then((m) => ({
    default: m.PaywallScreen,
  })),
);
const BenefitsNavigatorScreen = lazy(() =>
  import("./components/BenefitsNavigatorScreen").then((m) => ({
    default: m.BenefitsNavigatorScreen,
  })),
);
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
const SettingsScreen = lazy(() =>
  import("./components/SettingsScreen").then((m) => ({
    default: m.SettingsScreen,
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
const ProviderPortal = lazy(() =>
  import("./components/ProviderPortal").then((m) => ({
    default: m.ProviderPortal,
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
        console.error("Admin verification failed:", error);
        onAccessDenied();
      } finally {
        setIsVerifying(false);
      }
    }

    verifyAccess();
  }, [userId, onAccessDenied]);

  if (isVerifying) {
    return <LoadingSkeleton />;
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

// OPTIMIZED LOADING SKELETON - Ultra lightweight, prevents CLS
// Uses Aminy brand colors: Soft Cream (#F5F5F5), Muted Teal (#577590)
const LoadingSkeleton = React.memo(() => (
  <div
    className="min-h-screen flex items-center justify-center"
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
        borderTopColor: '#577590',
        contain: 'layout size',
        willChange: 'transform'
      }}
    ></div>
  </div>
));

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
  | "medications"; // Medication tracking for children

interface ChildProfile {
  id: string;
  name: string;
  age: number;
  conditions?: string[];
}

interface UserData {
  parentName: string;
  childName: string;
  childId?: string; // Add childId for URL params
  relationship: string;
  state: string;
  email?: string;
  hasCompletedOnboarding: boolean;
  tier?: TierType;
  role?: 'parent' | 'provider' | 'admin'; // Role-based access control
  children?: ChildProfile[]; // Multi-child support
  activeChildId?: string; // Currently selected child
}

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
  if (urlScreen && ["login", "create-account", "forgot-password", "reset-password", "privacy-policy", "terms-of-service", "join"].includes(urlScreen)) {
    return urlScreen as AppScreen;
  }

  // Check localStorage synchronously
  try {
    const storedUser = localStorage.getItem("aminy-user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.hasCompletedOnboarding) {
        // Prefetch dashboard immediately if we know user is logged in
        if (typeof window !== 'undefined') {
          import(/* webpackPrefetch: true */ "./components/Dashboard10").catch(() => {});
        }
        return "dashboard";
      } else if (user.email) {
        return "onboarding";
      }
    }
  } catch (e) {
    console.error("Failed to parse stored user data", e);
  }

  return "splash";
};

const getInitialUserData = (): UserData => {
  try {
    const storedUser = localStorage.getItem("aminy-user");
    if (storedUser) {
      return JSON.parse(storedUser);
    }
  } catch (e) {
    console.error("Failed to parse stored user data", e);
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
  const [userData, setUserData] = useState<UserData>(getInitialUserData);
  const [activeTab, setActiveTab] = useState("home");
  const [messagesLeft, setMessagesLeft] = useState(10);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showUnloadMindModal, setShowUnloadMindModal] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [paymentUserId, setPaymentUserId] = useState<string | null>(null);

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
          .then(() => {});
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
    window.open('mailto:support@aminy.app?subject=Payment%20Issue', '_blank');
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
        .catch(() => {});
      
      // Performance monitoring - lowest priority
      setTimeout(() => {
        import("./lib/performance-monitor")
          .then((m) => m.initPerformanceMonitoring?.())
          .catch(() => {});
      }, 3000);
      
      // Analytics - lowest priority
      setTimeout(() => {
        import("./lib/analytics-engine")
          .then((m) => m.initAnalytics?.())
          .catch(() => {});
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

      if (
        screen &&
        [
          "benefits",
          "telehealth",
          "caregivers",
          "vault",
          "junior",
        ].includes(screen)
      ) {
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

  // Mark as initialized immediately - session is checked synchronously on mount
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Supabase auth state listener - handles session changes from OAuth, login, logout
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Load user profile from Supabase
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              setUserData(prev => ({
                ...prev,
                parentName: profile.parent_name || prev.parentName,
                childName: profile.child_name || prev.childName,
                relationship: profile.relationship || prev.relationship,
                state: profile.state || prev.state,
                tier: (profile.tier as TierType) || prev.tier,
                role: profile.role || prev.role,
                email: session.user.email || prev.email,
                hasCompletedOnboarding: profile.has_completed_onboarding || false,
              }));

              // Navigate based on onboarding status
              if (profile.has_completed_onboarding) {
                navigateToScreen('dashboard');
              } else {
                navigateToScreen('onboarding');
              }
            } else {
              // New user, start onboarding
              setUserData(prev => ({
                ...prev,
                email: session.user.email || '',
              }));
              navigateToScreen('onboarding');
            }
          } catch (error) {
            console.error('Error loading profile:', error);
            // Still set email and proceed to onboarding
            setUserData(prev => ({
              ...prev,
              email: session.user.email || '',
            }));
            navigateToScreen('onboarding');
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear user data on sign out
          localStorage.removeItem('aminy-user');
          setUserData({
            parentName: '',
            childName: '',
            relationship: '',
            state: '',
            hasCompletedOnboarding: false,
            tier: 'free',
          });
          navigateToScreen('splash');
        }
      }
    );

    return () => subscription.unsubscribe();
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
    setUserData((prev) => ({
      ...prev,
      email,
      hasCompletedOnboarding: true,
    }));
    navigateToScreen("dashboard");
    toast.success("Good to see you — let's make today great.");
  };

  const handleCreateAccount = (email: string) => {
    setUserData((prev) => ({
      ...prev,
      email,
    }));
    navigateToScreen("onboarding");
  };

  const handleOnboardingComplete = (data: Partial<UserData>) => {
    const updatedData = {
      ...userData,
      ...data,
      hasCompletedOnboarding: true,
      tier: "free" as TierType, // Start as free, paywall will handle upgrade
    };

    setUserData((prev) => ({
      ...prev,
      ...data,
      hasCompletedOnboarding: true,
      tier: "free", // Start as free, paywall will handle upgrade
    }));

    // Trigger retention flows: email sequences, push notification scheduling
    if (updatedData.email && updatedData.childName && updatedData.parentName) {
      const userId = updatedData.email; // Use email as userId until Supabase auth provides one
      triggerRetentionFlow(
        userId,
        updatedData.email,
        updatedData.childName,
        updatedData.parentName
      ).catch(err => console.error('Failed to trigger retention flow:', err));
    }

    // Best practice: Show paywall immediately after onboarding
    // 60%+ of purchases happen before users ever use the app
    // 82% of trial starts happen on Day 0
    navigateToScreen("paywall");
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
    // Sign out from Supabase to clear the session
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    // Clear local storage
    localStorage.removeItem("aminy-user");
    localStorage.removeItem("aminy-onboarding-progress");
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
    if (userData.tier === "free" || userData.tier === "core") {
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
  const shouldEnableSwipe =
    currentScreen !== "splash" &&
    currentScreen !== "login" &&
    currentScreen !== "create-account";

  // Determine if screen should have pull-to-refresh
  const shouldEnablePullToRefresh =
    currentScreen === "dashboard";

  // Render current screen with lazy loading
  const renderScreen = () => {
    const screen = (() => {
      switch (currentScreen) {
        case "splash":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <SplashPage
                onStartTrial={handleGetStarted}
                onSignIn={handleLogin}
                onStartReflection={handleGetStarted}
              />
            </Suspense>
          );

        case "login":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
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
            <Suspense fallback={<LoadingSkeleton />}>
              <ForgotPasswordScreen
                onBack={() => navigateToScreen("login")}
                onBackToLogin={() => navigateToScreen("login")}
              />
            </Suspense>
          );

        case "reset-password":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
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
            <Suspense fallback={<LoadingSkeleton />}>
              <AuthCallback
                onAuthSuccess={(email) => {
                  setUserData(prev => ({ ...prev, email }));
                  // The auth state listener will handle the rest
                }}
                onPasswordReset={() => {
                  navigateToScreen("reset-password");
                }}
                onError={(message) => {
                  toast.error(message);
                  navigateToScreen("login");
                }}
              />
            </Suspense>
          );

        case "create-account":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <CreateAccountScreen
                onCreateAccount={handleCreateAccount}
                onBack={() => navigateToScreen("splash")}
                onLogin={() => navigateToScreen("login")}
              />
            </Suspense>
          );

        case "onboarding":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <OnboardingEnhanced
                onComplete={handleOnboardingComplete}
                initialData={{
                  email: userData.email || "",
                }}
              />
            </Suspense>
          );

        case "dashboard":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <Dashboard
                userData={{
                  parentName: userData.parentName,
                  childName: userData.childName,
                }}
                userTier={userData.tier}
                onNavigate={(destination) => {
                  // Handle paywall specially
                  if (destination === "paywall") {
                    handlePaywallTrigger();
                    return;
                  }
                  // Map any valid screen destination
                  const validScreens: AppScreen[] = [
                    "telehealth", "caregivers", "vault", "bcba-portal", "marketplace",
                    "provider-portal", "insight-report", "outcomes", "on-demand-telehealth",
                    "settings", "calm-tools", "incident-log", "care-plan", "resources",
                    "community", "profile", "benefits", "junior", "my-appointments",
                    "conversational-booking", "messages", "access-requests"
                  ];
                  if (validScreens.includes(destination as AppScreen)) {
                    navigateToScreen(destination as AppScreen);
                  }
                }}
              />
            </Suspense>
          );

        case "telehealth":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
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
            <Suspense fallback={<LoadingSkeleton />}>
              <CaregiverManagementScreen
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "vault":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <RecordsVault
                onBack={() => navigateToScreen("dashboard")}
                onClose={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "settings":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <SettingsScreen
                onBack={() => navigateToScreen("dashboard")}
                onLogout={handleLogout}
              />
            </Suspense>
          );

        case "paywall":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <PaywallScreen
                onSubscribe={handleSubscribe}
                onClose={() => navigateToScreen("dashboard")}
                currentTier={userData.tier}
                childName={userData.childName}
                isPostOnboarding={userData.hasCompletedOnboarding && userData.tier === 'free'}
              />
            </Suspense>
          );

        case "bcba-portal":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <BCBACoachPortal
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "launch-status":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <LaunchStatusDashboard
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "analytics":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <EnhancedAnalyticsDashboard
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "phase2-menu":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
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
            <Suspense fallback={<LoadingSkeleton />}>
              <ProviderMarketplace
                onBack={() => navigateToScreen("dashboard")}
                onBookProvider={(providerId) => {
                  // Navigate to telehealth booking flow
                  navigateToScreen("telehealth");
                }}
              />
            </Suspense>
          );

        case "provider-portal":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <ProviderPortal
                providerId="provider-1"
              />
            </Suspense>
          );

        case "insight-report":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <InsightNavigatorReport
                childId={userData.childId || "child-1"}
                mode="parent"
              />
            </Suspense>
          );

        case "outcomes":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <OutcomesTracking
                childId={userData.childId || "child-1"}
                initialView="caregiver"
              />
            </Suspense>
          );

        case "admin-portal":
          // Secure admin portal with server-side verification
          // SECURITY: Uses database role verification, not localStorage
          return (
            <Suspense fallback={<LoadingSkeleton />}>
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
            <Suspense fallback={<LoadingSkeleton />}>
              <OnDemandTelehealth
                onBack={() => navigateToScreen("dashboard")}
                onComplete={() => {
                  navigateToScreen("dashboard");
                  toast.success("Session completed successfully!");
                }}
                childName={userData.childName || "your child"}
                userTier={userData.tier}
              />
            </Suspense>
          );

        case "calm-tools":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <SensoryTools
                childName={userData.childName || "your child"}
                onBack={() => navigateToScreen("dashboard")}
                onSessionComplete={(data) => {
                }}
              />
            </Suspense>
          );

        case "incident-log":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <ActivityLog
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "care-plan":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <CareTab
                childName={userData.childName}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "resources":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <CommunityForYou
                childName={userData.childName}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "community":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <CommunityForYou
                childName={userData.childName}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "profile":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <SettingsScreen
                onBack={() => navigateToScreen("dashboard")}
                onLogout={handleLogout}
              />
            </Suspense>
          );

        case "benefits":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <BenefitsNavigatorScreen
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "junior":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <JuniorPageEnhancedPro
                childName={userData.childName || "Alex"}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "privacy-policy":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <PrivacyPolicy
                onBack={() => navigateToScreen("splash")}
              />
            </Suspense>
          );

        case "terms-of-service":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <TermsOfService
                onBack={() => navigateToScreen("splash")}
              />
            </Suspense>
          );

        case "join":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <ReferralLanding
                onNavigateToSignup={() => navigateToScreen("create-account")}
                onNavigateToLogin={() => navigateToScreen("login")}
              />
            </Suspense>
          );

        case "my-appointments":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <MyAppointments
                onBack={() => navigateToScreen("dashboard")}
                onBookNew={() => navigateToScreen("conversational-booking")}
                onNavigateToProvider={() => navigateToScreen("marketplace")}
              />
            </Suspense>
          );

        case "conversational-booking":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
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
            <Suspense fallback={<LoadingSkeleton />}>
              <SecureMessaging
                currentUserId={userData.id || "parent-1"}
                currentUserRole="parent"
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "access-requests":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <ProviderAccessRequests
                parentId={userData.id || "parent-1"}
                childId={userData.childId || "child-1"}
                childName={userData.childName || "your child"}
                onBack={() => navigateToScreen("dashboard")}
              />
            </Suspense>
          );

        case "provider-landing":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <ProviderLanding
                onApply={() => navigateToScreen("provider-apply")}
                onLogin={() => navigateToScreen("login")}
                onBack={() => navigateToScreen("splash")}
              />
            </Suspense>
          );

        case "provider-apply":
          return (
            <Suspense fallback={<LoadingSkeleton />}>
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
            <Suspense fallback={<LoadingSkeleton />}>
              <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
                <MedicationTracker
                  childId={userData.childId || "child-1"}
                  childName={userData.childName || "your child"}
                  onClose={() => navigateToScreen("dashboard")}
                />
              </div>
            </Suspense>
          );

        default:
          return (
            <Suspense fallback={<LoadingSkeleton />}>
              <SplashPage
                onStartTrial={handleGetStarted}
                onSignIn={handleLogin}
                onStartReflection={handleGetStarted}
              />
            </Suspense>
          );
      }
    })();

    // Wrap screen with Pull-to-Refresh if applicable
    const screenWithPullToRefresh =
      shouldEnablePullToRefresh ? (
        <Suspense fallback={screen}>
          <PullToRefresh onRefresh={handleRefresh}>
            {screen}
          </PullToRefresh>
        </Suspense>
      ) : (
        screen
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
          <Suspense fallback={<LoadingSkeleton />}>
            <SafetyBoundary>
              <DialogAccessibilityProvider>
                <MobilePolishEnhancer>
                  <CLSOptimizer>
                {/* Developer Mode - Access with Shift + D */}
                <DeveloperModeHandler
                  onNavigate={(screen, tab) => {
                    if (screen === "splash") {
                      navigateToScreen("splash");
                    } else if (screen === "onboarding") {
                      navigateToScreen("onboarding");
                    } else if (screen === "dashboard") {
                      navigateToScreen("dashboard", tab);
                    } else if (screen === "benefits") {
                      navigateToScreen("benefits");
                    } else if (screen === "telehealth") {
                      navigateToScreen("telehealth");
                    } else if (screen === "caregivers") {
                      navigateToScreen("caregivers");
                    } else if (screen === "vault") {
                      navigateToScreen("vault");
                    } else if (screen === "junior") {
                      navigateToScreen("junior");
                    } else if (screen === "paywall") {
                      navigateToScreen("paywall");
                    } else if (screen === "settings") {
                      navigateToScreen("settings");
                    } else if (screen === "bcba-portal") {
                      navigateToScreen("bcba-portal");
                    } else if (screen === "launch-status") {
                      navigateToScreen("launch-status");
                    } else if (screen === "analytics") {
                      navigateToScreen("analytics");
                    } else if (screen === "phase2-menu") {
                      navigateToScreen("phase2-menu");
                    } else if (screen === "marketplace") {
                      navigateToScreen("marketplace");
                    } else if (screen === "provider-portal") {
                      navigateToScreen("provider-portal");
                    } else if (screen === "insight-report") {
                      navigateToScreen("insight-report");
                    } else if (screen === "outcomes") {
                      navigateToScreen("outcomes");
                    } else if (screen === "admin-portal") {
                      navigateToScreen("admin-portal");
                    } else if (screen === "provider-landing") {
                      navigateToScreen("provider-landing");
                    } else if (screen === "provider-apply") {
                      navigateToScreen("provider-apply");
                    } else if (screen === "medications") {
                      navigateToScreen("medications");
                    } else if (screen === "on-demand-telehealth") {
                      navigateToScreen("on-demand-telehealth");
                    }
                  }}
                  onTierChange={(tier) => {
                    setUserData((prev) => ({
                      ...prev,
                      tier,
                    }));
                    toast.success(
                      `Tier updated to ${tier.toUpperCase()}`,
                    );
                  }}
                />

                <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
                  {/* Skip to content link for accessibility */}
                  <a
                    href="#main"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg focus:shadow-lg"
                  >
                    Skip to content
                  </a>

                  {/* Offline Indicator - Deferred */}
                  <Suspense fallback={null}>
                    <OfflineIndicator />
                  </Suspense>

                  {/* Update Available Banner - Deferred */}
                  <Suspense fallback={null}>
                    <UpdateBanner />
                  </Suspense>

                  {/* Main content with id for skip link */}
                  <main id="main">{renderScreen()}</main>

                  {/* Persistent Ask Aminy FAB */}
                  {showFAB && (
                    <Suspense fallback={null}>
                      <PersistentAskAminyFAB
                        tier={userData.tier}
                        messagesLeft={messagesLeft}
                        onPaywallTrigger={handlePaywallTrigger}
                        position="bottom-right"
                      />
                    </Suspense>
                  )}

                  {/* Toast notifications - Deferred */}
                  <Suspense fallback={null}>
                    <Toaster />
                  </Suspense>

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

                  {/* Unload Mind Button - Shows on dashboard and feature screens */}
                  {showFAB && (
                    <Suspense fallback={null}>
                      <UnloadMindButton
                        onClick={() => setShowUnloadMindModal(true)}
                      />
                    </Suspense>
                  )}

                  {/* Unload Mind Modal */}
                  {showUnloadMindModal && (
                    <Suspense fallback={null}>
                      <UnloadMindModal
                        isOpen={showUnloadMindModal}
                        onClose={() => setShowUnloadMindModal(false)}
                        onTasksCreated={(count) => {
                          toast.success(
                            `Created ${count} task${count !== 1 ? 's' : ''} and set your top focus!`,
                          );
                        }}
                      />
                    </Suspense>
                  )}

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

                  {/* Feedback Button - Always visible for user feedback */}
                  <FeedbackButton />
                </div>
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