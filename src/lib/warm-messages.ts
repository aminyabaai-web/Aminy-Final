/**
 * Warm-Expert Message Library for Aminy
 * All user-facing messages in gentle, supportive voice
 * 
 * Usage:
 * import { MESSAGES, getMessage } from './lib/warm-messages';
 * toast.error(MESSAGES.errors.reportGeneration);
 */

export const MESSAGES = {
  // Error messages (never say "error" or "failed")
  errors: {
    reportGeneration: "We couldn't create that report right now. Mind trying again?",
    voiceNotSupported: "Voice features aren't available on this device yet — but typing works great!",
    loadingData: "Taking a moment to load your info...",
    aiConnection: "AI connection hiccup — reconnecting now",
    networkIssue: "Looks like you're offline. We'll sync when you're back online.",
    uploadFailed: "That file didn't upload. Want to try again?",
    saveFailed: "We couldn't save that just now. Let's give it another shot?",
    deleteError: "Can't delete that right now. Try again in a moment?",
    genericError: "Something unexpected happened. Let's try that again?",
    parseError: "Having trouble loading your info — we'll retry",
    apiError: "Can't reach our servers right now. Check your connection?",
    validationError: "That doesn't quite look right. Check and try again?",
    authError: "Sign-in didn't work. Double-check your email and password?",
    permissionDenied: "We need permission to do that. Check your settings?",
    notFound: "Can't find that. It may have been moved or deleted.",
    timeout: "This is taking longer than expected. Want to try again?",
    rateLimited: "You're moving fast! Take a breath and try again in a moment.",
    serverError: "Our systems are having a moment. We'll be back shortly.",
    paymentError: "Payment didn't go through. Check your card details?"
  },

  // Success messages (celebrate small wins)
  success: {
    reportGenerated: "Report ready! 🎉",
    dataSaved: "Saved! Your progress is safe.",
    goalCompleted: "You did it! Goal complete. 🌟",
    profileUpdated: "Profile updated — looking good!",
    documentUploaded: "Document uploaded successfully",
    sessionScheduled: "Session scheduled — we'll remind you before it starts",
    reminderSet: "Reminder set — we've got your back",
    shareSuccess: "Shared! They'll get it right away.",
    accountCreated: "Welcome to Aminy! Let's get started. 🌿",
    passwordReset: "Password reset — you're all set!",
    emailVerified: "Email confirmed! You're good to go.",
    subscriptionActive: "Subscription active — full access unlocked! ✨",
    notificationEnabled: "Notifications on — we'll keep you posted",
    dataExported: "Your data is ready to download",
    settingsSaved: "Settings saved — changes applied",
    inviteSent: "Invite sent — they should get it shortly",
    feedbackSubmitted: "Thanks for the feedback! We hear you. 💙",
    completed: "All done! Nice work.",
    synced: "Everything's synced and up to date"
  },

  // Loading states (reassuring)
  loading: {
    generating: "Creating your report...",
    analyzing: "Looking through your child's progress...",
    connecting: "Connecting to AI...",
    uploading: "Uploading...",
    saving: "Saving...",
    loading: "Loading...",
    processing: "Processing...",
    thinking: "Thinking...",
    preparing: "Getting things ready...",
    syncing: "Syncing your data...",
    authenticating: "Signing you in...",
    refreshing: "Refreshing...",
    searching: "Searching...",
    calculating: "Calculating...",
    updating: "Updating...",
    verifying: "Verifying...",
    sending: "Sending..."
  },

  // Empty states (encouraging, not negative)
  empty: {
    noGoals: "Ready to set your first goal? Let's start small.",
    noDocs: "No documents yet. Upload one to get started.",
    noSessions: "No sessions scheduled. Book one when you're ready.",
    noPosts: "No posts yet. Be the first to share!",
    noReports: "No reports yet. Generate one to see progress.",
    noActivity: "Nothing here yet. Take your first step today.",
    noNotifications: "All caught up! Nothing new right now.",
    noMessages: "No messages yet. Start a conversation.",
    noResults: "No matches found. Try different search terms?",
    noHistory: "No history yet. Come back after some activity.",
    noFavorites: "No favorites yet. Save something you love!",
    noCalendar: "Your calendar is clear. Time to relax?",
    noReminders: "No reminders set. Add one so we can help."
  },

  // Confirmations (gentle, not alarming)
  confirmations: {
    delete: "Delete this? You can't undo it.",
    leave: "Leave without saving? Your changes will be lost.",
    cancel: "Cancel this? Your progress so far will be saved.",
    logout: "Sign out? You can always come back.",
    reset: "Start over? This will clear your current work.",
    archive: "Archive this? You can restore it later.",
    remove: "Remove this? It'll be gone for good.",
    clear: "Clear everything? This can't be undone.",
    disconnect: "Disconnect? You'll need to reconnect later.",
    unsubscribe: "Unsubscribe? You won't get these updates anymore.",
    disable: "Turn this off? You can enable it again anytime.",
    downgrade: "Downgrade plan? Some features will be locked."
  },

  // Instructions (clear, actionable)
  instructions: {
    uploadFile: "Tap to choose a file from your device",
    recordVoice: "Tap the mic and speak naturally",
    selectDate: "Pick a date that works for you",
    typeHere: "Type your message here...",
    chooseOption: "Pick the option that fits best",
    dragDrop: "Drag and drop, or tap to upload",
    scanQR: "Point your camera at the QR code",
    pressHold: "Press and hold to record",
    swipeLeft: "Swipe left for more options",
    pullRefresh: "Pull down to refresh",
    tapToExpand: "Tap to see details",
    longPressMore: "Long press for more options",
    doubleTapLike: "Double tap to like"
  },

  // Offline (reassuring, not blocking)
  offline: {
    banner: "You're offline — but you can still use Aminy",
    syncLater: "We'll sync your changes when you're back online",
    limitedFeatures: "Some features need internet — but core features work offline",
    reconnected: "Back online! Syncing now...",
    saving: "Saving locally — we'll sync when you're back online",
    queued: "Queued — will send when you're back online"
  },

  // Warnings (informative, not scary)
  warnings: {
    lowStorage: "Storage running low. Consider freeing up some space.",
    batteryLow: "Battery getting low. Consider charging soon.",
    slowConnection: "Connection is slow. Some features may take longer.",
    dataUsage: "Using cellular data. Large downloads may use your data plan.",
    sessionExpiring: "Your session will expire soon. Save your work!",
    unsavedChanges: "You have unsaved changes. Remember to save!",
    duplicateEntry: "That looks like a duplicate. Are you sure?",
    oldVersion: "New version available. Update for the best experience.",
    maintenance: "Scheduled maintenance soon. Save your work.",
    beta: "This feature is in beta. Let us know how it works!"
  },

  // Guidance (helpful, educational)
  guidance: {
    firstTime: "First time here? Let us show you around.",
    tipOfDay: "💡 Tip: {tip}",
    didYouKnow: "Did you know? {fact}",
    proTip: "Pro tip: {tip}",
    tryThis: "Try this: {suggestion}",
    nextStep: "Next step: {action}",
    learnMore: "Want to learn more? Tap here.",
    needHelp: "Need help? We're here for you.",
    quickTour: "Take a quick tour to learn the basics",
    tutorial: "New to this? Start with our quick tutorial"
  },

  // Time-sensitive (encouraging urgency without panic)
  timeSensitive: {
    expiringSoon: "This expires soon. Use it while you can!",
    limitedTime: "Limited time — don't miss out!",
    deadline: "Deadline: {date}. You've got this!",
    reminder: "Friendly reminder: {task}",
    upcoming: "Coming up: {event}",
    lastChance: "Last chance to {action}",
    actNow: "Time to {action} — it'll just take a moment"
  }
};

/**
 * Get a message with optional context replacement
 * 
 * @example
 * getMessage('errors', 'reportGeneration')
 * getMessage('guidance', 'tipOfDay', { tip: 'Save often!' })
 */
export function getMessage(
  category: keyof typeof MESSAGES, 
  key: string, 
  context?: Record<string, string>
): string {
  const message = (MESSAGES[category] as Record<string, string>)?.[key];
  
  if (!message) {
    return MESSAGES.errors.genericError;
  }
  
  // Replace placeholders like {tip}, {date}, etc.
  if (context) {
    return message.replace(/\{(\w+)\}/g, (_: string, k: string) => context[k] || '');
  }
  
  return message;
}

/**
 * Get random message from a category (useful for variety)
 */
export function getRandomMessage(category: keyof typeof MESSAGES): string {
  const messages = Object.values(MESSAGES[category]);
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Format console logs in warm tone (for development)
 */
export function logWarm(action: string, details?: unknown) {
  const prefix = '🌿 Aminy:';
  if (details) {
  } else {
  }
}

/**
 * Replace technical error with warm message
 */
export function warmifyError(error: Error | string): string {
  const errorString = typeof error === 'string' ? error : error.message;
  
  // Map common error patterns to warm messages
  const errorMap: Record<string, string> = {
    'network': MESSAGES.errors.networkIssue,
    'fetch': MESSAGES.errors.apiError,
    'timeout': MESSAGES.errors.timeout,
    'permission': MESSAGES.errors.permissionDenied,
    'not found': MESSAGES.errors.notFound,
    '404': MESSAGES.errors.notFound,
    '500': MESSAGES.errors.serverError,
    '429': MESSAGES.errors.rateLimited,
    'parse': MESSAGES.errors.parseError,
    'invalid': MESSAGES.errors.validationError
  };

  // Check if error matches any pattern
  for (const [pattern, message] of Object.entries(errorMap)) {
    if (errorString.toLowerCase().includes(pattern)) {
      return message;
    }
  }

  // Default to generic error
  return MESSAGES.errors.genericError;
}
