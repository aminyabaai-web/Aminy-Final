# MVP Acceptance Criteria - 2025-10-18
## Aminy Production Readiness Assessment

**Status**: In Progress  
**Last Updated**: October 18, 2025  
**Review Date**: Pre-Launch Final QA

---

## Executive Summary

This document outlines the comprehensive acceptance criteria for Aminy's MVP launch. Each section includes specific requirements, implementation status, and pass/fail criteria for production readiness.

---

## 1. SPLASH SCREEN ENHANCEMENTS

### Requirements
- [ ] Add "Meet Aminy Autism" subhead above main headline
- [ ] Add safety note under CTA button: "Friendly, expert guidance. Not a diagnosis."
- [ ] Fix widows/orphans in all text blocks
- [ ] Ensure proper line breaks for mobile/desktop

### Implementation Status
**Current**: ⚠️ PARTIAL
- ✅ Headline updated to "I'll walk with you—every step."
- ✅ Safety note added under CTA buttons
- ✅ Logo moved down 16px
- ❌ "Meet Aminy Autism" subhead NOT added
- ❌ Widow/orphan prevention NOT fully implemented

### Pass Criteria
```
✓ "Meet Aminy Autism" appears above headline in all viewports
✓ Safety note visible on both mobile and desktop
✓ No single words on final lines of paragraphs
✓ Proper line wrapping on mobile (320px - 640px)
✓ All text crisp and readable (16px minimum)
```

### Fail Criteria
```
✗ Missing subhead
✗ Widows/orphans present in any viewport
✗ Text too small or illegible
✗ Improper line breaks causing readability issues
```

---

## 2. CHAT-FIRST HOME DASHBOARD

### Requirements
- [ ] Make Companion chat the primary pane (center, full height on mobile)
- [ ] Add compact "Today" strip at top (2-4 items)
- [ ] Add Quick Actions row under chat input (4 buttons)
- [ ] Add nudge suggestions inside chat
- [ ] Add feelings chips for emotional tracking
- [ ] Add bottom sheet for Live AI Video controls
- [ ] Ensure 44-48px tap targets on mobile

### Implementation Status
**Current**: ❌ NOT STARTED

### Today Strip Requirements
```tsx
interface TodayStripItem {
  icon: LucideIcon;
  title: string;
  time: string;
  status: 'upcoming' | 'current' | 'completed';
  onClick: () => void; // Opens contextual script in chat
}

// Display 2-4 items, horizontally scrollable
```

### Quick Actions Requirements
```tsx
const quickActions = [
  { label: "Start routine", icon: PlayCircle, color: "blue" },
  { label: "Log win", icon: Heart, color: "green" },
  { label: "Message coach", icon: MessageCircle, color: "purple" },
  { label: "Export report", icon: FileText, color: "gray" }
];

// Each button: min-height 44px, min-width 80px
```

### Nudge Suggestions
```typescript
const nudges = [
  "Try gentler step?",
  "Bank the win?",
  "Schedule telehealth?",
  "Need a calming activity?",
  "Want to log this progress?"
];

// Appear contextually based on conversation
```

### Feelings Chips
```typescript
const feelings = [
  { emoji: "😊", label: "Calm", color: "green" },
  { emoji: "😰", label: "Stressed", color: "yellow" },
  { emoji: "😢", label: "Overwhelmed", color: "red" },
  { emoji: "😐", label: "Neutral", color: "gray" },
  { emoji: "🎉", label: "Celebrating", color: "purple" }
];

// Tap to log emotion + AI responds contextually
```

### Live AI Video Bottom Sheet
```typescript
interface LiveAIVideoSession {
  duration: number; // Minutes available based on tier
  remaining: number; // Minutes left this month
  status: 'available' | 'in-session' | 'depleted';
  tier: 'core' | 'pro' | 'pro-plus';
}

// Core: short sessions (2-3 min)
// Pro: 10 min sessions
// Pro Plus: 20 min sessions
```

### Pass Criteria
```
✓ Chat pane is primary focus on all screens
✓ Today strip shows 2-4 contextual items
✓ Quick Actions all functional with proper icons
✓ Nudges appear based on conversation context
✓ Feelings chips log emotions + trigger AI response
✓ Live AI Video bottom sheet opens/closes smoothly
✓ All tap targets ≥ 44px on mobile
✓ Smooth animations (< 300ms)
✓ No layout shift when keyboard opens
```

### Fail Criteria
```
✗ Chat not primary interface
✗ Today strip missing or not functional
✗ Quick Actions missing or non-functional
✗ Nudges not appearing or broken
✗ Feelings chips not working
✗ Live AI Video controls broken
✗ Tap targets < 44px
✗ Janky animations or layout shifts
```

---

## 3. VOICE-FIRST ONBOARDING

### Requirements
- [ ] Convert first 3 steps to conversational prompts
- [ ] Add mic icon default-on for voice input
- [ ] Add "Approve" screen: "Your 7-day gentle start"
- [ ] Add toggles for: Today's routine, Two goals, Calming supports
- [ ] Add action buttons: Approve, Simplify, Not now
- [ ] Add "Diagnostic Prep Packet" label where relevant

### Implementation Status
**Current**: ❌ NOT STARTED

### Conversational Prompts Structure
```tsx
interface ConversationalStep {
  prompt: string; // AI asks question
  micDefaultOn: boolean; // true for first 3 steps
  fallbackInput: 'text' | 'chips' | 'select';
  placeholder?: string;
}

// Example Step 1:
{
  prompt: "Tell me what you'd like help with. Just hit the mic and talk—I'm listening.",
  micDefaultOn: true,
  fallbackInput: 'text',
  placeholder: "Or type here..."
}
```

### Approve Screen Structure
```tsx
interface ApprovalItem {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: LucideIcon;
}

const approvalItems = [
  {
    id: "todays-routine",
    title: "Today's routine",
    description: "3 activities: morning, afternoon, calming",
    enabled: true,
    icon: Calendar
  },
  {
    id: "two-goals",
    title: "Two goals",
    description: "Communication and daily living skills",
    enabled: true,
    icon: Target
  },
  {
    id: "calming-supports",
    title: "Calming supports",
    description: "Quick sensory breaks when needed",
    enabled: true,
    icon: Heart
  }
];
```

### Pass Criteria
```
✓ Mic button prominent and default-on for steps 1-3
✓ Voice input works on mobile (iOS + Android)
✓ Fallback to text input if mic unavailable
✓ Approve screen shows all 3 items with toggles
✓ Approve button creates plan immediately
✓ Simplify button reduces to 1-2 items
✓ Not now button skips plan generation
✓ Diagnostic Prep Packet label visible in vault
✓ Smooth transitions between steps
```

### Fail Criteria
```
✗ Mic not working or not default-on
✗ Voice input broken on any platform
✗ Approve screen missing or broken
✗ Toggles not functional
✗ Action buttons not working
✗ Diagnostic Prep label missing
✗ Janky or broken transitions
```

---

## 4. REPORTS TAB ENHANCEMENTS

### Requirements
- [ ] Add Weekly Outcomes PDF button (Core tier)
- [ ] Add Provider-ready packet export (Pro/Pro Plus)
- [ ] Add watermark labels for exports
- [ ] Add expiring link labels (Pro Plus)
- [ ] Add metrics parity/cache notes
- [ ] Add sync status indicators

### Implementation Status
**Current**: ⚠️ PARTIAL
- ✅ Reports tab exists with basic functionality
- ❌ Weekly Outcomes PDF NOT implemented
- ❌ Provider packet export NOT implemented
- ❌ Watermarks NOT implemented
- ❌ Expiring links NOT implemented
- ❌ Cache/parity notes NOT implemented

### Report Types

#### A. Weekly Outcomes PDF (Core Tier)
```typescript
interface WeeklyOutcomesPDF {
  dateRange: { start: Date; end: Date };
  metrics: {
    activitiesCompleted: number;
    complianceRate: number;
    domainProgress: {
      communication: number;
      social: number;
      regulation: number;
      living: number;
    };
  };
  format: 'parent-friendly';
  watermark: 'Aminy - Generated [date]';
}
```

#### B. Provider-Ready Packet (Pro/Pro Plus)
```typescript
interface ProviderPacket {
  period: 'weekly' | 'monthly' | 'custom';
  includes: [
    'abc-analysis',
    'behavior-trends',
    'goal-progress',
    'clinical-recommendations'
  ];
  format: 'clinical-professional';
  watermark: 'Aminy Clinical Report - [date]';
  expiringLink?: {
    validDays: 30;
    accessCount: 'unlimited';
    password: boolean;
  };
}
```

### Cache/Parity Notes
```tsx
interface SyncStatus {
  lastSync: Date;
  status: 'synced' | 'pending' | 'error';
  pendingChanges: number;
  cacheWarning?: string;
}

// Display example:
<div className="sync-status">
  <div className="sync-indicator">
    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
    <span className="text-xs text-muted-foreground">
      Last synced: {formatRelativeTime(lastSync)} • All data current
    </span>
  </div>
  
  {cacheWarning && (
    <div className="cache-warning">
      <AlertTriangle className="w-4 h-4 text-yellow-600" />
      <p className="text-xs text-yellow-700">
        Some data cached locally. Reconnect to sync latest changes.
      </p>
    </div>
  )}
</div>
```

### Pass Criteria
```
✓ Weekly PDF generates correctly (Core tier)
✓ Provider packet exports with watermark (Pro/Pro Plus)
✓ Expiring links work correctly (Pro Plus)
✓ Link expiration enforced (30 days)
✓ Sync status visible and accurate
✓ Cache warnings appear when offline
✓ All exports include proper timestamps
✓ Exports are properly formatted (medical-grade)
```

### Fail Criteria
```
✗ PDF generation broken or missing
✗ Provider packet missing required sections
✗ Watermarks missing or incorrect
✗ Expiring links not working
✗ Sync status inaccurate
✗ Cache warnings missing
✗ Exports missing timestamps
✗ Unprofessional formatting
```

---

## 5. LIVE AI VIDEO BADGES & LIMITS

### Requirements
- [ ] Add Live AI Video badges to pricing tiers
- [ ] Display session limits per tier
- [ ] Add async video analysis note
- [ ] Show remaining minutes in UI
- [ ] Add upgrade prompts when depleted

### Implementation Status
**Current**: ❌ NOT STARTED

### Tier Limits
```typescript
const liveAIVideoLimits = {
  core: {
    sessionLength: 3, // minutes
    monthlySessions: 4,
    totalMinutes: 12,
    badge: "Short sessions",
    asyncAnalysis: true
  },
  pro: {
    sessionLength: 10,
    monthlySessions: 6,
    totalMinutes: 60,
    badge: "10-min sessions",
    asyncAnalysis: true
  },
  proPlus: {
    sessionLength: 20,
    monthlySessions: 6,
    totalMinutes: 120,
    badge: "20-min sessions",
    asyncAnalysis: true,
    humanCredit: {
      monthly: true,
      options: [
        { type: 'RBT', minutes: 30 },
        { type: 'BCBA', minutes: 15 }
      ],
      useItOrLoseIt: true
    }
  }
};
```

### Async Video Analysis Note
```tsx
<div className="async-analysis-note">
  <Info className="w-4 h-4 text-blue-600" />
  <p className="text-sm text-muted-foreground">
    All video sessions are analyzed by AI to provide personalized 
    insights and recommendations within 24 hours.
  </p>
</div>
```

### Pass Criteria
```
✓ Badges visible on pricing page for all tiers
✓ Session limits enforced correctly
✓ Remaining minutes displayed accurately
✓ Async analysis note visible
✓ Upgrade prompts appear when depleted
✓ Credits reset monthly (Pro Plus)
✓ Use-it-or-lose-it enforced
✓ Add-on packs available (never expire)
```

### Fail Criteria
```
✗ Badges missing or incorrect
✗ Limits not enforced
✗ Minutes display inaccurate
✗ Analysis note missing
✗ Upgrade prompts broken
✗ Credits don't reset
✗ Use-it-or-lose-it not working
✗ Add-ons missing
```

---

## 6. PARENT HUB ENHANCEMENTS

### Requirements
- [ ] Add "From Aminy" curated section
- [ ] Add AI-curated Community posts
- [ ] Add AI-curated Blog articles
- [ ] Implement de-identified sharing
- [ ] Add engagement metrics

### Implementation Status
**Current**: ⚠️ PARTIAL
- ✅ Parent Hub page exists
- ❌ "From Aminy" section NOT implemented
- ❌ AI-curated content NOT implemented
- ❌ De-identified sharing NOT implemented

### "From Aminy" Section Structure
```typescript
interface FromAminyContent {
  id: string;
  type: 'tip' | 'article' | 'video' | 'strategy';
  title: string;
  description: string;
  relevanceScore: number; // AI-calculated based on user profile
  readTime: number;
  tags: string[];
  createdAt: Date;
}

// AI curates based on:
// - Child's age, diagnosis, communication level
// - Parent's stated goals
// - Recent activity patterns
// - Engagement history
```

### De-Identified Sharing
```typescript
interface DeIdentifiedShare {
  originalContent: string;
  deidentifiedContent: string;
  removedInfo: {
    names: string[];
    locations: string[];
    ages: string[];
    specificDetails: string[];
  };
  shareId: string;
  expiresAt?: Date;
  visibility: 'community' | 'private-link' | 'provider';
}

// Example transformation:
// Original: "My son Alex (age 5) in Seattle..."
// De-identified: "My child (age 5) in the Pacific Northwest..."
```

### Pass Criteria
```
✓ "From Aminy" section visible with 3-5 curated items
✓ Content relevance ≥ 80% user satisfaction
✓ Community posts properly curated
✓ Blog articles relevant to user profile
✓ De-identification removes all PII
✓ Share preview shows de-identified version
✓ Original preserved for user's view
✓ Engagement metrics tracked
```

### Fail Criteria
```
✗ "From Aminy" section missing
✗ Content not personalized
✗ Community/blog not curated
✗ PII leaks in shared content
✗ De-identification broken
✗ Metrics not tracking
```

---

## 7. BCBA/RBT TEMPLATES & APPLY TO PLAN

### Requirements
- [ ] Add BCBA notes template
- [ ] Add RBT quick-action row
- [ ] Implement "Apply to Plan" AI suggestions
- [ ] Add Vault timestamps for all entries
- [ ] Add professional formatting

### Implementation Status
**Current**: ❌ NOT STARTED

### BCBA Notes Template
```typescript
interface BCBANotesTemplate {
  sessionType: 'initial-assessment' | 'follow-up' | 'plan-review' | 'parent-training';
  sessionDate: Date;
  sessionDuration: number;
  clientName: string; // Auto-filled
  observations: {
    behavior: string;
    antecedents: string;
    consequences: string;
    trends: string;
  };
  assessments: {
    currentSkills: string[];
    deficits: string[];
    reinforcers: string[];
  };
  recommendations: {
    strategies: string[];
    modifications: string[];
    nextSteps: string[];
  };
  aiSuggestions?: {
    planUpdates: string[];
    resourceLinks: string[];
    relevantGoals: string[];
  };
}
```

### RBT Quick Actions
```typescript
const rbtQuickActions = [
  {
    id: "log-session",
    label: "Log Session",
    icon: Clock,
    action: () => openSessionLogger()
  },
  {
    id: "update-goals",
    label: "Update Goals",
    icon: Target,
    action: () => openGoalEditor()
  },
  {
    id: "quick-note",
    label: "Quick Note",
    icon: FileText,
    action: () => openQuickNote()
  },
  {
    id: "message-parent",
    label: "Message Parent",
    icon: MessageCircle,
    action: () => openParentMessage()
  },
  {
    id: "abc-log",
    label: "ABC Log",
    icon: FileText,
    action: () => openABCLogger()
  }
];
```

### "Apply to Plan" Feature
```typescript
interface ApplyToPlanSuggestion {
  source: 'bcba-notes' | 'rbt-session' | 'parent-observation';
  suggestions: {
    goalUpdates: {
      goalId: string;
      currentTarget: string;
      suggestedTarget: string;
      reasoning: string;
    }[];
    newStrategies: {
      strategyName: string;
      domain: string;
      implementation: string;
      reasoning: string;
    }[];
    environmentalMods: {
      modification: string;
      context: string;
      reasoning: string;
    }[];
  };
  confidence: number; // 0-1
  reviewRequired: boolean;
}
```

### Vault Timestamps
```typescript
interface VaultEntry {
  id: string;
  type: 'bcba-notes' | 'rbt-session' | 'parent-note' | 'report' | 'document';
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
    role: 'parent' | 'bcba' | 'rbt' | 'provider';
  };
  lastModified: Date;
  lastModifiedBy: {
    id: string;
    name: string;
    role: string;
  };
  versions: {
    version: number;
    timestamp: Date;
    changes: string;
  }[];
}
```

### Pass Criteria
```
✓ BCBA template includes all required fields
✓ RBT quick actions all functional
✓ "Apply to Plan" generates relevant suggestions
✓ Suggestions have ≥ 70% acceptance rate
✓ All vault entries properly timestamped
✓ Version history tracked
✓ Professional medical-grade formatting
✓ HIPAA-conscious security measures
```

### Fail Criteria
```
✗ Template missing required fields
✗ Quick actions broken or missing
✗ "Apply to Plan" not working
✗ Suggestions irrelevant or low quality
✗ Timestamps missing or incorrect
✗ Version history broken
✗ Unprofessional formatting
✗ Security vulnerabilities
```

---

## 8. BENEFITS & TELEHEALTH FEATURES

### Requirements
- [ ] Add benefits letter generator with "last checked" badge
- [ ] Add telehealth scheduling with ICS/email/SMS export
- [ ] Add post-visit AI summary generator
- [ ] Add insurance provider tracking

### Implementation Status
**Current**: ❌ NOT STARTED

### Benefits Letter Generator
```typescript
interface BenefitsLetter {
  insuranceProvider: string;
  providerName?: string;
  servicesRequesting: ('ABA' | 'SLP' | 'OT' | 'PT')[];
  childInfo: {
    name: string;
    age: number;
    diagnosis: string[];
  };
  justification: string; // AI-generated
  supportingDocs: string[]; // Vault references
  generatedDate: Date;
  lastChecked?: Date; // Last insurance verification
  template: 'standard' | 'appeal' | 'initial-request';
}
```

### Telehealth Scheduling
```typescript
interface TelehealthAppointment {
  sessionType: 'rbt-checkin-30' | 'bcba-consult-15' | 'bcba-deep-50';
  provider: {
    id: string;
    name: string;
    credentials: string;
    specialty: string;
  };
  scheduledTime: Date;
  duration: number;
  meetingLink?: string;
  exports: {
    ics: () => Blob; // Calendar file
    email: () => void; // Email reminder
    sms: () => void; // SMS reminder
  };
  reminders: {
    email: Date[];
    sms: Date[];
    push: Date[];
  };
}
```

### Post-Visit AI Summary
```typescript
interface PostVisitSummary {
  sessionId: string;
  sessionType: string;
  provider: string;
  date: Date;
  duration: number;
  keyTakeaways: {
    category: 'strength' | 'challenge' | 'recommendation' | 'next-step';
    content: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  actionItems: {
    task: string;
    dueDate?: Date;
    assignedTo: 'parent' | 'provider' | 'both';
    completed: boolean;
  }[];
  planUpdates: {
    goalId: string;
    update: string;
    type: 'target-change' | 'strategy-addition' | 'environment-mod';
  }[];
  followUpRecommended: {
    timeframe: string;
    reason: string;
    sessionType: string;
  };
}
```

### Pass Criteria
```
✓ Letter generator creates professional letters
✓ "Last checked" badge updates automatically
✓ Insurance provider database accurate
✓ Telehealth scheduling fully functional
✓ ICS export works in all calendar apps
✓ Email reminders sent successfully
✓ SMS reminders sent successfully
✓ Post-visit summary generated within 24 hours
✓ Summary includes all key sections
✓ Action items properly tracked
```

### Fail Criteria
```
✗ Letter quality unprofessional
✗ "Last checked" not updating
✗ Insurance data outdated
✗ Scheduling broken
✗ Calendar exports not working
✗ Email reminders failing
✗ SMS reminders failing
✗ Summary not generating
✗ Summary missing key information
✗ Action items not tracked
```

---

## 9. MULTI-CAREGIVER & MULTI-CHILD SUPPORT

### Requirements
- [ ] Add multi-caregiver invite flow
- [ ] Add role-based permissions
- [ ] Add multi-child profile switcher
- [ ] Add shared plan access
- [ ] Add activity attribution

### Implementation Status
**Current**: ❌ NOT STARTED

### Multi-Caregiver Structure
```typescript
interface CaregiverProfile {
  id: string;
  name: string;
  email: string;
  relationship: 'parent' | 'co-parent' | 'grandparent' | 'nanny' | 'guardian' | 'other';
  role: 'admin' | 'caregiver' | 'viewer';
  permissions: {
    canEditPlan: boolean;
    canViewReports: boolean;
    canShareData: boolean;
    canInviteOthers: boolean;
    canManageBilling: boolean;
    canMessageProviders: boolean;
  };
  invitedBy: string;
  invitedAt: Date;
  acceptedAt?: Date;
  lastActive: Date;
}
```

### Multi-Child Structure
```typescript
interface ChildProfile {
  id: string;
  name: string;
  age: number;
  diagnosis: string[];
  communicationLevel: string;
  plan: CarePlan;
  caregivers: string[]; // Caregiver IDs with access
  subscriptionTier: 'core' | 'pro' | 'pro-plus' | 'jr-only';
  createdAt: Date;
  isActive: boolean;
}

interface FamilyAccount {
  accountId: string;
  primaryCaregiver: string;
  children: ChildProfile[];
  activeChildId: string; // Currently viewing
  caregivers: CaregiverProfile[];
  subscriptions: {
    childId: string;
    tier: string;
    billing: BillingInfo;
  }[];
}
```

### Profile Switcher UI
```tsx
<div className="child-profile-switcher">
  <button 
    onClick={toggleSwitcher}
    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
  >
    <Avatar className="w-8 h-8">
      <AvatarFallback>{activeChild.name[0]}</AvatarFallback>
    </Avatar>
    <span className="font-medium">{activeChild.name}</span>
    <ChevronDown className="w-4 h-4" />
  </button>
  
  {isOpen && (
    <div className="absolute top-full mt-2 w-64 bg-white rounded-lg shadow-lg">
      {children.map(child => (
        <button
          key={child.id}
          onClick={() => switchToChild(child.id)}
          className="w-full p-3 flex items-center gap-3 hover:bg-muted"
        >
          <Avatar className="w-10 h-10">
            <AvatarFallback>{child.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <div className="font-medium">{child.name}</div>
            <div className="text-sm text-muted-foreground">
              Age {child.age}
            </div>
          </div>
          {child.id === activeChild.id && (
            <Check className="w-5 h-5 text-accent" />
          )}
        </button>
      ))}
      
      <div className="border-t p-2">
        <button
          onClick={addNewChild}
          className="w-full p-2 flex items-center gap-2 text-accent hover:bg-accent/10 rounded-md"
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium">Add another child</span>
        </button>
      </div>
    </div>
  )}
</div>
```

### Pass Criteria
```
✓ Invite flow sends email correctly
✓ Role permissions enforced properly
✓ Child switcher works smoothly
✓ Data properly isolated per child
✓ Shared plans accessible to authorized caregivers
✓ Activity attribution shows correct caregiver
✓ Billing separated per child if needed
✓ All caregivers see real-time updates
```

### Fail Criteria
```
✗ Invite emails not sending
✗ Permission enforcement broken
✗ Switcher not working
✗ Data leakage between children
✗ Shared access broken
✗ Attribution incorrect
✗ Billing confusion
✗ Updates not syncing
```

---

## 10. PRICING & TIER STRUCTURE

### Requirements
- [ ] Update pricing to Core ($14.99), Pro ($29.99), Pro Plus ($49.99)
- [ ] Add Jr-Only tier ($14.99-$19.99)
- [ ] Add Live AI Video badges per tier
- [ ] Add monthly human credit (Pro Plus)
- [ ] Add use-it-or-lose-it disclaimer
- [ ] Add a la carte menu with 4-pack discounts
- [ ] Add B2B2C affiliate pricing (15-25%)
- [ ] Add provider seat pricing ($29-49/mo)

### Implementation Status
**Current**: ❌ NOT STARTED

### New Tier Structure
```typescript
const pricingTiers = {
  core: {
    name: "Core",
    price: 14.99,
    billing: "monthly",
    features: [
      "Unlimited Ask Aminy (AI companion)",
      "Live AI Video (short sessions)",
      "Daily care plan with activities",
      "Weekly Outcomes PDF",
      "Progress tracking & insights",
      "Aminy Jr: Basic games and rewards",
      "Community: Read-only + 1 intro post"
    ],
    liveAIVideo: {
      badge: "Short sessions",
      duration: 3,
      sessions: 4
    }
  },
  pro: {
    name: "Pro",
    price: 29.99,
    billing: "monthly",
    popular: true,
    features: [
      "Everything in Core, plus:",
      "Live AI Video (10-minute sessions)",
      "Provider-ready reports (watermarked)",
      "Document vault (IEPs, evaluations)",
      "Aminy Jr: Full game library",
      "Community: Full participation",
      "Benefits letter generator",
      "Telehealth scheduling (ICS/email/SMS)",
      "Post-visit AI summaries"
    ],
    liveAIVideo: {
      badge: "10-min sessions",
      duration: 10,
      sessions: 6
    }
  },
  proPlus: {
    name: "Pro Plus",
    price: 49.99,
    billing: "monthly",
    features: [
      "Everything in Pro, plus:",
      "Live AI Video (20-minute sessions)",
      "Monthly human credit: 30min RBT or 15min BCBA",
      "Use-it-or-lose-it monthly credit",
      "BCBA notes template access",
      "RBT quick-action coaching",
      "\"Apply to Plan\" AI suggestions",
      "Priority support",
      "Expiring link reports",
      "Add-on packs available (never expire)"
    ],
    liveAIVideo: {
      badge: "20-min sessions",
      duration: 20,
      sessions: 6
    },
    humanCredit: {
      monthly: true,
      options: [
        { type: "RBT", minutes: 30, price: 0 },
        { type: "BCBA", minutes: 15, price: 0 }
      ],
      useItOrLoseIt: true,
      note: "Credit resets monthly. Unused minutes do not roll over."
    }
  },
  jrOnly: {
    name: "Jr-Only",
    price: { min: 14.99, max: 19.99 },
    billing: "monthly",
    features: [
      "Aminy Jr: Full game library",
      "Rewards & token system",
      "Kid-friendly activities",
      "Progress tracking",
      "No parent plan features"
    ],
    note: "Perfect if you only want games for your child"
  }
};
```

### A La Carte Menu
```typescript
const aLaCarteServices = [
  {
    service: "RBT Session",
    duration: 30,
    unit: "minutes",
    singlePrice: 49,
    fourPack: {
      price: 175,
      savings: 21,
      note: "Save $21"
    },
    expires: false
  },
  {
    service: "BCBA Session",
    duration: 15,
    unit: "minutes",
    singlePrice: 89,
    fourPack: {
      price: 320,
      savings: 36,
      note: "Save $36"
    },
    expires: false
  },
  {
    service: "SLP Session",
    duration: 30,
    unit: "minutes",
    singlePrice: 69,
    fourPack: {
      price: 249,
      savings: 27,
      note: "Save $27"
    },
    expires: false
  }
];
```

### B2B2C Pricing
```typescript
const b2bPricing = {
  affiliate: {
    revenueShare: { min: 15, max: 25 },
    unit: "percent",
    note: "Affiliate partners receive 15-25% of subscription revenue",
    requirements: [
      "Minimum 50 referrals per quarter",
      "Active community engagement",
      "Brand alignment verification"
    ]
  },
  providerSeat: {
    price: { min: 29, max: 49 },
    billing: "monthly",
    unit: "per clinician",
    features: [
      "Full clinical dashboard access",
      "Client management tools",
      "Session logging",
      "Progress reporting",
      "Parent communication",
      "HIPAA-compliant storage"
    ],
    note: "Price varies based on organization size and features"
  },
  subcontractedProvider: {
    note: "Contact for custom pricing",
    details: [
      "Revenue sharing model",
      "Session-based compensation",
      "Insurance billing support",
      "Custom contract terms"
    ]
  }
};
```

### Pass Criteria
```
✓ All tier prices correctly displayed
✓ Features accurately listed per tier
✓ Live AI Video badges visible
✓ Human credit clearly explained (Pro Plus)
✓ Use-it-or-lose-it disclaimer visible
✓ A la carte menu shows 4-pack discounts
✓ "Never expire" note on add-on packs
✓ B2B2C pricing documented
✓ Provider seat details clear
✓ Upgrade/downgrade flows work
```

### Fail Criteria
```
✗ Pricing incorrect or outdated
✗ Features misrepresented
✗ Badges missing
✗ Human credit confusing
✗ Disclaimer missing
✗ Discounts not showing
✗ Expiration unclear
✗ B2B2C info missing
✗ Provider seats not functional
✗ Tier changes broken
```

---

## 11. MOBILE QA CHECKLIST

### Critical Touch Targets (44-48px minimum)

#### Homepage/Splash
- [ ] "Start free" CTA button ≥ 48px
- [ ] "Log in" link ≥ 44px
- [ ] Trust badge pills ≥ 44px tap area
- [ ] Help footer link ≥ 44px

#### Onboarding
- [ ] Continue button ≥ 48px
- [ ] Back button ≥ 44px
- [ ] Goal chips ≥ 48px
- [ ] Schedule toggles ≥ 44px
- [ ] Mic button ≥ 52px
- [ ] Approve/Simplify/Not now buttons ≥ 48px

#### Dashboard
- [ ] Bottom nav icons ≥ 48px
- [ ] Quick Actions row buttons ≥ 44px
- [ ] Today strip items ≥ 44px
- [ ] Feelings chips ≥ 44px
- [ ] Chat send button ≥ 44px
- [ ] Nudge suggestion chips ≥ 44px

#### Care Tab
- [ ] Activity cards tap area ≥ 48px
- [ ] Complete/Start buttons ≥ 44px
- [ ] Segmented control buttons ≥ 48px

#### Reports Tab
- [ ] Export buttons ≥ 44px
- [ ] Share buttons ≥ 44px
- [ ] Tab switcher items ≥ 44px

### Safe Area Compliance

#### iOS Safe Areas
- [ ] Top inset respected (notch devices)
- [ ] Bottom inset respected (home indicator)
- [ ] Left/right insets respected (landscape)
- [ ] No content hidden behind notch
- [ ] No content hidden behind home indicator

#### Android Safe Areas
- [ ] Navigation bar spacing correct
- [ ] Status bar spacing correct
- [ ] Edge-to-edge handled properly
- [ ] Gesture navigation compatible

### Typography Readability

#### Font Sizes
- [ ] Body text ≥ 16px (prevents iOS zoom)
- [ ] Secondary text ≥ 14px
- [ ] Caption text ≥ 12px
- [ ] Headings properly scaled

#### Line Heights
- [ ] Body text line-height ≥ 1.5
- [ ] Headings line-height ≥ 1.3
- [ ] No widows/orphans in paragraphs

### Performance Benchmarks

#### Load Times
- [ ] Initial page load < 2s (3G)
- [ ] Tab switching < 300ms
- [ ] Modal opening < 200ms
- [ ] Chat response < 500ms

#### Frame Rate
- [ ] Scrolling ≥ 60fps
- [ ] Animations ≥ 60fps
- [ ] No janky transitions
- [ ] Smooth keyboard animations

#### Memory Usage
- [ ] App footprint < 100MB
- [ ] No memory leaks detected
- [ ] Smooth on low-end devices

### Accessibility

#### Screen Reader Support
- [ ] All buttons have aria-labels
- [ ] All images have alt text
- [ ] Proper heading hierarchy
- [ ] Focus order logical

#### Keyboard Navigation
- [ ] Tab order correct
- [ ] Focus visible
- [ ] Escape closes modals
- [ ] Enter submits forms

#### Color Contrast
- [ ] Text contrast ≥ 4.5:1
- [ ] Interactive elements ≥ 3:1
- [ ] High contrast mode supported

### Cross-Platform Testing

#### iOS
- [ ] Safari (latest)
- [ ] Safari (iOS 15+)
- [ ] Chrome iOS
- [ ] Standalone PWA

#### Android
- [ ] Chrome (latest)
- [ ] Chrome (Android 10+)
- [ ] Samsung Internet
- [ ] Standalone PWA

### Offline Functionality
- [ ] Cache strategy implemented
- [ ] Offline indicator visible
- [ ] Data syncs on reconnect
- [ ] No data loss when offline

### Pass/Fail Summary

**PASS**: All checklist items must pass  
**FAIL**: Any critical item fails

---

## 12. OVERALL MVP ACCEPTANCE

### Launch Blockers (Must Fix)

```
🔴 CRITICAL - Blocks Launch
- Missing "Meet Aminy Autism" subhead
- Chat-first home not implemented
- Voice-first onboarding not implemented
- Multi-caregiver support not implemented
- Pricing tiers not updated
- Mobile tap targets < 44px in multiple places
```

### High Priority (Should Fix)

```
🟡 HIGH PRIORITY - Degrades Experience
- Weekly Outcomes PDF not implemented
- Provider packet export incomplete
- Live AI Video limits not enforced
- "From Aminy" section missing
- BCBA/RBT templates not available
- Benefits letter generator missing
```

### Medium Priority (Nice to Have)

```
🟢 MEDIUM PRIORITY - Enhancement
- Async video analysis note
- De-identified sharing incomplete
- Post-visit summaries partial
- B2B2C pricing documentation
- Advanced cache/parity notes
```

---

## Implementation Timeline

### Week 1: Critical Foundation
- [ ] Update splash screen with subhead + safety note
- [ ] Implement chat-first dashboard layout
- [ ] Add Today strip component
- [ ] Add Quick Actions row
- [ ] Update pricing tiers

### Week 2: Voice & Mobile
- [ ] Implement voice-first onboarding
- [ ] Add Approve screen
- [ ] Fix all mobile tap targets
- [ ] Implement safe area handling
- [ ] Add Live AI Video bottom sheet

### Week 3: Professional Features
- [ ] Add BCBA/RBT templates
- [ ] Implement "Apply to Plan"
- [ ] Add Weekly Outcomes PDF
- [ ] Add Provider packet export
- [ ] Implement multi-caregiver invites

### Week 4: Polish & Launch
- [ ] Complete benefits letter generator
- [ ] Add telehealth scheduling
- [ ] Implement post-visit summaries
- [ ] Final mobile QA pass
- [ ] Launch readiness review

---

## Sign-Off Checklist

### Product Team
- [ ] All features meet requirements
- [ ] User flows tested end-to-end
- [ ] Edge cases handled
- [ ] Error states implemented

### Design Team
- [ ] Visual design approved
- [ ] Mobile responsive verified
- [ ] Accessibility standards met
- [ ] Brand consistency maintained

### Engineering Team
- [ ] Code quality verified
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation complete

### QA Team
- [ ] All test cases passed
- [ ] Cross-browser tested
- [ ] Mobile devices tested
- [ ] Regression testing complete

---

## Final Verdict

**Status**: 🔴 NOT READY FOR LAUNCH

**Critical Issues**: 10  
**High Priority Issues**: 8  
**Medium Priority Issues**: 5

**Estimated Completion**: 4 weeks

**Next Steps**:
1. Prioritize critical blockers
2. Assign resources to Week 1 tasks
3. Schedule daily standups
4. Set up staging environment for QA
5. Plan soft launch for internal testing

---

**Document Version**: 1.0  
**Last Review**: October 18, 2025  
**Next Review**: Weekly until launch
