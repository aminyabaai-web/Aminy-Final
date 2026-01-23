/**
 * Risk Mitigation Strategies
 * Addresses key risks identified in McKinsey review:
 * 1. Graduation risk - parents may churn when child "graduates"
 * 2. Retention risk - maintaining engagement over time
 * 3. Regulatory risk - AI in healthcare positioning
 */

// ============================================================================
// GRADUATION RISK MITIGATION
// ============================================================================

/**
 * Strategies to retain users even when child's needs change
 */
export interface GraduationMitigationStrategy {
  id: string;
  name: string;
  description: string;
  targetPhase: 'pre-graduation' | 'graduation' | 'post-graduation';
  implementation: string;
}

export const GRADUATION_STRATEGIES: GraduationMitigationStrategy[] = [
  {
    id: 'milestone-celebration',
    name: 'Milestone Celebration Program',
    description: 'Celebrate progress with shareable milestone badges and reports',
    targetPhase: 'pre-graduation',
    implementation: 'Automated milestone detection with celebratory UI and share prompts',
  },
  {
    id: 'sibling-expansion',
    name: 'Sibling/Family Expansion',
    description: 'Encourage adding siblings or family members to the account',
    targetPhase: 'pre-graduation',
    implementation: 'Proactive prompts when child is thriving to add siblings',
  },
  {
    id: 'transition-support',
    name: 'Transition Support Tier',
    description: 'Reduced-price tier for families in transition',
    targetPhase: 'graduation',
    implementation: 'Offer 50% discount for 6 months during transition periods',
  },
  {
    id: 'alumni-community',
    name: 'Alumni Community Access',
    description: 'Free community access for graduated families',
    targetPhase: 'post-graduation',
    implementation: 'Lifetime community access for families who complete 12+ months',
  },
  {
    id: 'mentorship-program',
    name: 'Parent Mentor Program',
    description: 'Invite successful parents to mentor new families',
    targetPhase: 'post-graduation',
    implementation: 'Free Pro tier for active mentors who help 3+ families/month',
  },
  {
    id: 'progress-archive',
    name: 'Progress Archive',
    description: 'Downloadable archive of child\'s journey',
    targetPhase: 'graduation',
    implementation: 'Generate PDF/video compilation of progress over time',
  },
];

// ============================================================================
// RETENTION RISK MITIGATION
// ============================================================================

/**
 * Engagement hooks to maintain long-term retention
 */
export interface RetentionHook {
  id: string;
  name: string;
  trigger: string;
  action: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'on-demand';
  priority: 'high' | 'medium' | 'low';
}

export const RETENTION_HOOKS: RetentionHook[] = [
  {
    id: 'streak-protection',
    name: 'Streak Protection',
    trigger: 'User about to lose streak (no activity in 20+ hours)',
    action: 'Send push notification with easy quick-win activity',
    frequency: 'daily',
    priority: 'high',
  },
  {
    id: 'progress-highlight',
    name: 'Weekly Progress Highlight',
    trigger: 'Sunday evening',
    action: 'Send email/push with week\'s wins and next week preview',
    frequency: 'weekly',
    priority: 'high',
  },
  {
    id: 'personalized-nudge',
    name: 'Personalized AI Nudge',
    trigger: 'Based on child\'s current challenges',
    action: 'Proactive suggestion for relevant activity or strategy',
    frequency: 'daily',
    priority: 'high',
  },
  {
    id: 'community-connection',
    name: 'Community Connection',
    trigger: 'User hasn\'t engaged with community in 7 days',
    action: 'Highlight relevant community posts or wins from similar families',
    frequency: 'weekly',
    priority: 'medium',
  },
  {
    id: 'outcome-reminder',
    name: 'Outcome Reminder',
    trigger: 'Monthly subscription renewal approaching',
    action: 'Show ROI summary: stress reduction, goals achieved, savings',
    frequency: 'monthly',
    priority: 'high',
  },
  {
    id: 'win-prompt',
    name: 'Win Documentation Prompt',
    trigger: 'After completing activities',
    action: 'Ask user to share win with community or care team',
    frequency: 'on-demand',
    priority: 'medium',
  },
  {
    id: 'expert-recommendation',
    name: 'Expert Session Recommendation',
    trigger: 'User discusses complex challenge with AI',
    action: 'Suggest relevant expert session with discount',
    frequency: 'on-demand',
    priority: 'medium',
  },
];

/**
 * Churn prediction signals
 */
export interface ChurnSignal {
  signal: string;
  riskLevel: 'high' | 'medium' | 'low';
  mitigationAction: string;
}

export const CHURN_SIGNALS: ChurnSignal[] = [
  {
    signal: 'No login in 7+ days',
    riskLevel: 'high',
    mitigationAction: 'Send re-engagement email with personalized content',
  },
  {
    signal: 'Decreased AI chat usage (50%+ drop)',
    riskLevel: 'medium',
    mitigationAction: 'Suggest new use cases or features they haven\'t tried',
  },
  {
    signal: 'Routine completion rate dropping',
    riskLevel: 'medium',
    mitigationAction: 'Offer to adjust routine or suggest simpler activities',
  },
  {
    signal: 'No marketplace purchases in 60+ days',
    riskLevel: 'low',
    mitigationAction: 'Send discount code for expert session',
  },
  {
    signal: 'Support ticket with frustration',
    riskLevel: 'high',
    mitigationAction: 'Priority support response with potential free month',
  },
  {
    signal: 'Failed payment (not updated)',
    riskLevel: 'high',
    mitigationAction: 'Grace period + multiple payment update reminders',
  },
];

// ============================================================================
// REGULATORY RISK MITIGATION
// ============================================================================

/**
 * Compliance disclaimers and positioning
 */
export interface RegulatoryDisclaimer {
  id: string;
  context: string;
  disclaimer: string;
  displayLocation: 'footer' | 'modal' | 'inline' | 'onboarding';
}

export const REGULATORY_DISCLAIMERS: RegulatoryDisclaimer[] = [
  {
    id: 'not-medical-advice',
    context: 'AI chat responses',
    disclaimer: 'Aminy provides guidance and coaching, not medical advice. Always consult healthcare professionals for medical decisions.',
    displayLocation: 'footer',
  },
  {
    id: 'not-therapy',
    context: 'Telehealth marketplace',
    disclaimer: 'Consultations are for guidance and coaching. They are not a substitute for ongoing therapy or medical treatment.',
    displayLocation: 'modal',
  },
  {
    id: 'emergency',
    context: 'Crisis detection',
    disclaimer: 'If you or your child are in immediate danger, please call 911 or your local emergency services.',
    displayLocation: 'modal',
  },
  {
    id: 'progress-not-diagnosis',
    context: 'Progress reports',
    disclaimer: 'Progress tracking shows trends based on your input. It is not a clinical assessment or diagnosis.',
    displayLocation: 'inline',
  },
  {
    id: 'ai-limitations',
    context: 'AI features',
    disclaimer: 'Aminy uses AI to provide personalized suggestions based on your input. AI responses may not always be accurate. Use your judgment.',
    displayLocation: 'onboarding',
  },
];

/**
 * Safe messaging guidelines for AI
 */
export const AI_SAFE_MESSAGING_RULES = [
  'Never diagnose conditions',
  'Never recommend specific medications or dosages',
  'Never discourage professional medical care',
  'Always recommend professional consultation for serious concerns',
  'Acknowledge limitations when asked about medical topics',
  'Redirect crisis situations to emergency services immediately',
  'Use evidence-based language (research suggests, studies show)',
  'Avoid absolute statements (always, never, guaranteed)',
];

/**
 * HIPAA compliance checklist
 */
export const HIPAA_COMPLIANCE_CHECKLIST = [
  { item: 'Business Associate Agreement with subprocessors', status: 'required', note: 'Supabase, OpenAI, Stripe' },
  { item: 'Data encryption at rest', status: 'implemented', note: 'AES-256' },
  { item: 'Data encryption in transit', status: 'implemented', note: 'TLS 1.3' },
  { item: 'Access controls and audit logging', status: 'implemented', note: 'Row-level security' },
  { item: 'Breach notification procedures', status: 'required', note: 'Document procedures' },
  { item: 'Employee training', status: 'required', note: 'Annual HIPAA training' },
  { item: 'Risk assessment', status: 'required', note: 'Annual assessment' },
  { item: 'PHI retention and disposal', status: 'implemented', note: '7-year retention' },
];

/**
 * Get appropriate disclaimer for context
 */
export function getDisclaimer(context: string): string {
  const disclaimer = REGULATORY_DISCLAIMERS.find(d => d.context === context);
  return disclaimer?.disclaimer || REGULATORY_DISCLAIMERS[0].disclaimer;
}

/**
 * Check if content requires safety review
 */
export function requiresSafetyReview(content: string): boolean {
  const triggers = [
    /\b(suicide|self.?harm|hurt.?(myself|self))\b/i,
    /\b(abuse|violence|danger)\b/i,
    /\b(emergency|urgent|crisis)\b/i,
    /\b(medication|dosage|prescription)\b/i,
    /\b(diagnos|autism|adhd|add)\b/i,
  ];

  return triggers.some(pattern => pattern.test(content));
}

/**
 * Get crisis resources
 */
export function getCrisisResources(): { name: string; contact: string; description: string }[] {
  return [
    { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', description: 'Free, 24/7 support' },
    { name: 'Crisis Text Line', contact: 'Text HOME to 741741', description: 'Free, 24/7 text support' },
    { name: 'Emergency Services', contact: 'Call 911', description: 'For immediate danger' },
    { name: 'Autism Society Helpline', contact: '1-800-328-8476', description: 'Autism-specific support' },
  ];
}
