/**
 * Aminy Brand Voice Constants
 *
 * Core Voice: "Gentle guidance. Meaningful progress. Proactive calm."
 *
 * Guidelines:
 * - Suggestive over directive
 * - Acknowledge effort and pace
 * - Celebrate small wins
 * - Normalize emotions
 * - Frame as "together" not "you must"
 */

// Status Labels - Warm alternatives to clinical terms
export const statusLabels = {
  // Progress states
  notStarted: "Getting started",
  inProgress: "On the way",
  complete: "Complete",
  pending: "Being reviewed",
  actionNeeded: "Ready when you are",
  incomplete: "In progress",

  // Review states
  approved: "Looking good",
  denied: "Let's try another way",
  needsInfo: "A few more details needed",

  // Emotional states - warmer than clinical
  overwhelmed: "Feeling a lot",
  stressed: "Heavy day",
  managing: "Finding balance",
  good: "Feeling steady",
  confident: "Feeling strong",
} as const;

// Button Labels - Inviting over demanding
export const buttonLabels = {
  start: "Let's begin",
  continue: "Continue together",
  save: "Save for later",
  submit: "Share with us",
  add: "Add to your plan",
  skip: "Maybe later",
  retry: "Let's try again",
  cancel: "Not right now",
  done: "All set",
  next: "Next step",
  back: "Go back",
  close: "Close",
  confirm: "Sounds good",
  invite: "Invite to your team",
  setup: "Set things up",
  learn: "Learn more",
  explore: "Explore",
  getStarted: "Get started",
  viewMore: "See more",
  viewLess: "See less",
} as const;

// Empty States - Encouraging, not accusatory
export const emptyStates = {
  noGoals: "Your goals will appear here as you build your plan",
  noMessages: "Your conversation history will be saved here",
  noActivities: "Activities you complete will show up here",
  noData: "We're gathering information for you",
  noResults: "We couldn't find what you're looking for",
  noTeam: "Add family members or caregivers to share the journey",
  noProgress: "Every journey starts somewhere—you're here, and that matters",
  noRewards: "Rewards you earn will appear here",
  noHistory: "Your history will build over time",
} as const;

// Processing Messages - Understanding, not analyzing
export const processingMessages = {
  thinking: "Taking a moment to think...",
  understanding: "Understanding your needs...",
  crafting: "Crafting something just for you...",
  preparing: "Preparing your plan...",
  loading: "Getting things ready...",
  saving: "Saving your progress...",
  sending: "On its way...",
  generating: "Creating something special...",
  checking: "Checking on that...",
} as const;

// Success Messages - Celebratory, warm
export const successMessages = {
  saved: "Saved! Your progress is safe.",
  sent: "On its way!",
  completed: "Well done! Another step forward.",
  goalAchieved: "You did it! That's meaningful progress.",
  streakContinued: "Your consistency is building something powerful.",
  taskDone: "Nicely done.",
  uploaded: "Upload complete.",
  updated: "All updated.",
} as const;

// Error Messages - Supportive, solution-focused
export const errorMessages = {
  generic: "Something went sideways. Let's try again.",
  network: "We lost connection. Let's try again in a moment.",
  notFound: "We couldn't find that. Let's look together.",
  unauthorized: "Let's get you signed in first.",
  timeout: "That took longer than expected. Let's try again.",
  validation: "We need a bit more information to continue.",
  serverError: "Our system hit a bump. We're looking into it.",
  saveFailed: "We couldn't save that. Your work isn't lost—let's try again.",
} as const;

// Onboarding Copy - Gentle, validating
export const onboardingCopy = {
  welcome: "Welcome. We're glad you're here.",
  understood: "We hear you. That sounds hard.",
  courage: "It takes courage to look closely at what your child needs.",
  together: "You're not doing this alone anymore.",
  pacing: "Take your time. There's no rush.",
  progress: "Every answer helps us understand your family better.",
  almostThere: "Just a few more questions, then we'll build your plan together.",
  complete: "You did it. Let's see what we've built together.",
} as const;

// Nudge Messages - Supportive, not pushy
export const nudgeMessages = {
  reminder: "A gentle reminder is waiting for you.",
  streak: "You've been showing up consistently—that matters.",
  missed: "Life happens. When you're ready, we're here.",
  celebrate: "Look how far you've come.",
  encourage: "Parenting is hard. You're doing meaningful work.",
  selfCare: "You can't pour from an empty cup. How are you?",
  returnWelcome: "Welcome back. Ready to pick up where we left off?",
} as const;

// Insurance/Benefits Copy - Reducing burden, not demanding
export const benefitsCopy = {
  intro: "Let us handle the paperwork so you can focus on your child.",
  checking: "Checking what coverage might be available...",
  found: "Good news—we found some options for you.",
  needsInfo: "A few details will help us unlock more support.",
  denied: "This one didn't work out, but we have other paths to try.",
  approved: "Your coverage is confirmed. One less thing to worry about.",
  letterDraft: "We've drafted this for you—review and send when ready.",
  appeal: "Appeals can work. Let us help you try again.",
} as const;

// AI Chat Copy - Collaborative, warm
export const aiChatCopy = {
  greeting: "Hi! I'm here to help whenever you need.",
  thinking: "Let me think about that...",
  followUp: "Would you like to explore that more?",
  clarify: "Help me understand a bit more...",
  validate: "That makes complete sense.",
  support: "That sounds really challenging. Here's what might help...",
  celebrate: "That's wonderful progress!",
  redirect: "I want to make sure I give you accurate guidance. Let me check on that.",
  limit: "I'd love to keep helping. Upgrading unlocks our full conversation.",
} as const;

// Team/Caregiver Copy - Collaborative, warm
export const teamCopy = {
  intro: "Build your support team",
  invitePrompt: "Who else helps care for your child?",
  roleExplain: {
    owner: "Full access to everything",
    caregiver: "Can view and update daily activities",
    readOnly: "Can see progress and plans",
  },
  inviteSent: "Invitation sent! They'll get an email to join.",
  joined: "They're now part of your team.",
} as const;

// Helper function to get personalized copy
export function personalize(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || `{${key}}`);
}

// Example: personalize("Hi {name}!", { name: "Sarah" }) => "Hi Sarah!"
