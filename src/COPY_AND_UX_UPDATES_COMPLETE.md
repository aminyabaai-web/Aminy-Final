# Copy and UX Updates - Complete Implementation Guide

## Overview
This document details the comprehensive content and UX updates across the entire Aminy application, implementing the finalized copy, spacing, and interaction patterns for production readiness.

---

## ✅ 1. Splash Page Copy and Spacing - COMPLETE

**Status:** Fully Implemented

**Changes Made:**
- **Headline:** "Meet Aminy Autism" 
- **Subhead:** "Your daily AI companion for families navigating autism—gentle guidance, real progress."
- **Primary CTA:** "Get started"
- **Secondary link:** "See how it works" 
- **Micro note:** "Friendly, expert guidance. Not a diagnosis."

**Spacing (Mobile):**
- Logo top: 60px ✅
- Logo → Headline: 18px ✅
- Headline → Subhead: 10px ✅
- Subhead → CTA: 18px ✅
- CTA → Secondary link: 16px ✅
- Secondary link → Micro note: 8px ✅

**File:** `/components/SplashScreen.tsx`

---

## 🔄 2. Home (Chat-First Dashboard)

**Status:** Needs Implementation

**Required Changes:**

### Today Items (2-4 max):
```tsx
const todayItems = [
  {
    title: "Morning routine",
    subtitle: "2 steps",
    duration: "6 min",
    icon: Calendar
  },
  {
    title: "Ask for help",
    subtitle: "3 prompts",
    duration: "4 min",
    icon: MessageCircle
  },
  {
    title: "Calm Corner",
    subtitle: "60-sec reset",
    duration: "1 min",
    icon: Heart
  }
];
```

### Quick Actions:
- "Start routine"
- "Log win"
- "Message coach"
- "Export report"

### Nudges:
- "Water break?"
- "Try the gentler step?"
- "End early and celebrate?"

### Feelings Chips:
- "Great"
- "Okay"
- "Tough"

### Bottom Sheet Title:
- "Live AI Video – I'll guide you in real time"

**Files to Update:**
- `/components/DashboardEnhanced.tsx`
- `/components/TodayStrip.tsx`
- `/components/QuickActionsRow.tsx`
- `/components/FeelingsChips.tsx`
- `/components/LiveAIVideoSheet.tsx`

---

## 🔄 3. Onboarding (Voice + Approve)

**Status:** Needs Implementation

**Required Changes:**

### Prompt 1: "What matters most this week?"
**Chips:**
- Mornings
- Meltdowns
- Communication
- Sleep
- School
- Feeding

### Prompt 2: "When do you usually have a few minutes?"
**Chips:**
- Morning
- Afternoon
- Evening
- Weekends

### Prompt 3: "Any sensitivities we should watch?"
**Chips:**
- Sound
- Light
- Texture
- Transitions
- Crowds
- None/Unsure

### Approve Screen:
**Title:** "Your 7-day gentle start"

**Toggles:**
- Today's routine
- Two focus goals
- Calming supports

**Buttons:**
- "Approve"
- "Simplify"
- "Not now"

**Output label:** "Diagnostic Prep Packet (not a diagnosis)"

**Files to Update:**
- `/components/OnboardingFlow5Steps.tsx`
- `/components/ApproveScreen.tsx`

---

## 🔄 4. Reports Exports

**Status:** Needs Implementation

**Required Changes:**

### Button Text:
- "Weekly Outcomes PDF (Core)"
- "Provider-ready packet (Pro/Pro Plus)" 
  - Watermarked, expires in 7 days

### Parity Note:
"All charts match the dashboard. New data automatically updates exports."

### Share Bar:
- "Copy link"
- "Email to provider"
- "Save to Vault"

### Footer Microcopy:
"For clinical use with your provider. Not a diagnosis."

**Files to Update:**
- `/components/ReportsTab.tsx`
- `/components/ProviderReadyPacket.tsx`
- `/components/WeeklyOutcomesPDF.tsx`

---

## 🔄 5. Parent Hub + Community

**Status:** Needs Implementation

**Required Changes:**

### Aminy Cards:
```tsx
const aminyCards = [
  {
    title: "This week's focus",
    body: "I'll keep this light: two quick wins and one stretch. Approve?",
    buttons: ["Approve", "Save for later"]
  },
  {
    title: "Wins to share",
    body: "Three calm transitions in a row—want to celebrate?",
    buttons: ["Approve", "Save for later"]
  },
  {
    title: "Next best experiment",
    body: "Try a 2-min preview before transitions this week.",
    buttons: ["Approve", "Save for later"]
  }
];
```

### Ask Aminy Intents:
- Sleep
- Feeding
- School
- Behavior
- Benefits

### Community Card Template:
```
Title
2-line summary
Why this for you
[Save] [Share] [Hide similar]
```

### Post Composer:
**Draft by Aminy:** "Here's a de-identified update you can post."
**Toggle:** "Remove names/PHI" (on)

**Files to Update:**
- `/components/ParentHubPage.tsx`
- `/components/FromAminySection.tsx`
- `/components/CommunityForYou.tsx`
- `/components/AskAminyIntentsRow.tsx`

---

## 🔄 6. BCBA/RBT Notes

**Status:** Needs Implementation

**Required Changes:**

### Section Labels:
- Goal
- Prompting level
- Mastery criteria
- Trials
- ABC events
- Dosage

### Quick Taps:
- "As written"
- "Modified"
- "Couldn't do"

### Reason Chips:
- Fatigue
- Environment
- Too hard
- Meltdown
- Scheduling

### Apply to Plan (AI):
"Suggest reducing prompts to partial physical and adding generalization in 2 settings."

**Buttons:**
- Apply
- Edit
- Dismiss

### Storage Note:
"Saved to Vault with timestamp; included in Provider-ready packet."

**Files to Update:**
- `/components/BCBANotesTemplate.tsx`
- `/components/RBTQuickActions.tsx`

---

## 🔄 7. Benefits Navigator

**Status:** Needs Implementation

**Required Changes:**

### Step Subtitle:
"I'll draft the letters—approve to send."

### Rule Badge:
"Last checked: Oct 2025"

### Buttons:
- Sign
- Send
- Track

### Status Chips:
- Submitted
- In review
- Approved
- More info needed

### Microcopy:
"I'll nudge you only when something needs you."

**Files to Update:**
- `/components/BenefitsNavigatorScreen.tsx`
- `/components/BenefitsLetterGenerator.tsx`
- `/components/BenefitsStatusPanel.tsx`

---

## 🔄 8. Telehealth

**Status:** Needs Implementation

**Required Changes:**

### Scheduling Title:
"Choose a time that works"

### Reminders:
- Calendar invite
- Email
- SMS

### Previsit Label:
"I filled this out based on your week—edit anything."

### Post-visit Summary Title:
"Here's what we covered and what's next"

**Files to Update:**
- `/components/TelehealthScreen.tsx`
- `/components/TelehealthScheduling.tsx`
- `/components/PostVisitSummary.tsx`

---

## 🔄 9. Multi-Caregiver / Multi-Child

**Status:** Needs Implementation

**Required Changes:**

### Manage Caregivers:
**Title:** "Manage caregivers"

**Roles:**
- Owner
- Caregiver
- Read-only

**Actions:**
- Invite via link/QR/code
- Revoke

### Child Switcher:
**Label:** "Your children"

**Empty State:** "Add a child to get a plan tailored to them."

**Files to Update:**
- `/components/CaregiverManagementScreen.tsx`
- `/components/ManageCaregivers.tsx`
- `/components/ChildSwitcher.tsx`

---

## 🔄 10. Pricing / Paywalls

**Status:** Needs Implementation

**Required Changes:**

### Core ($14.99/month):
- AI Companion unlimited
- Live AI Video (short bursts)
- Weekly Outcomes PDF
- Aminy Jr (standard)
- 2 caregivers

### Pro ($29.99/month):
Everything in Core +
- Aminy Jr (unlimited)
- Provider-ready packet
- Provider invites
- Live AI Video (up to 10 min)
- Priority analysis

### Pro Plus ($49.99/month):
Everything in Pro +
- Monthly human credit (30m RBT or 15m BCBA, use-it-or-lose-it)
- Live AI Video (up to 20 min)
- 48-hour coach SLA

### Jr-Only ($14.99-19.99/month):
- Kid mode only
- Upsell on exports/time caps

### A la carte (never expire):
**RBT:**
- 15m: $14.99
- 30m: $24.99

**BCBA:**
- 15m: $29.99
- 30m: $49.99

**SLP:**
- 15m: $34.99
- 30m: $59.99

**4-packs save 10-15%**

### B2B2C band:
- Affiliate share: 15-25%
- Provider seat: $29-49/mo
- Subcontracted provider pricing (internal)

**Files to Update:**
- `/components/PaywallScreen.tsx`
- `/components/UpdatedPricingCards.tsx`
- `/components/ALaCarteMenu.tsx`
- `/components/ShopPage.tsx`

---

## 🔄 11. Live AI Video Badges

**Status:** Needs Implementation

**Required Changes:**

### Badge Text by Tier:
- **Core:** "Live AI Video (short bursts)"
- **Pro:** "Live AI Video (up to 10 min)"
- **Pro Plus:** "Live AI Video (up to 20 min) + coach review bookmarks"

### Async Analysis:
"Upload short video for AI tips"

**Files to Update:**
- `/components/LiveAIVideoSheet.tsx`
- `/components/TelehealthScreen.tsx`

---

## 🔄 12. Developer Mode (Shift+D)

**Status:** Needs Implementation

**Required Features:**

### Jump to:
- Splash
- Onboarding Approve
- Home
- Coach
- Reports
- Hub
- Jr
- Benefits
- Telehealth
- Paywalls

### Toggles:
- Tier
- Chat/Reports/Jr/LiveVideo entitlements
- Chat/Jr/Video caps
- Mock data on/off

### Buttons:
- Fill with sample family
- Reset

**Files to Create/Update:**
- `/components/DeveloperModePanel.tsx` (New)
- `/components/DeveloperModeHandler.tsx` (Update)
- `/App.tsx` (Add Shift+D listener)

---

## 🔄 13. Streaks, Share-a-Win, Outcome Tiles

**Status:** Needs Implementation

**Required Changes:**

### Gentle Streak Tile:
**Title:** "Gentle streak"
**Subtitle:** "Consistency without pressure"
**Success toast:** "You kept at it this week—small steps count."
**Pause toast:** "Taking a breather today. I'll keep things light."

### Share-a-Win Card:
**Headline:** "Today's win"
**Body:** "We nailed calm transitions today. Proud of this win."
**Footer:** "Shared with Aminy Autism"
**CTA:** "Copy link"
**Privacy:** "This post uses initials and no personal details."

### Outcome Tiles:
**Minutes saved this week**
- Footnote: "Estimated from shorter routines and fewer retries."

**De-escalations shortened**
- Footnote: "Based on average time from trigger to calm."

**Tooltip:** "I estimate these from your plan activity, fidelity taps, and Calm Corner sessions."

**Files to Update:**
- `/components/StreakTracker.tsx`
- `/components/ShareWinCard.tsx`
- `/components/OutcomeSignatureTiles.tsx`
- `/components/DashboardEnhanced.tsx`

---

## 📋 14. Mobile QA Checklist

**Status:** Design Guidance (Not Code)

**Checklist Items:**
- ✅ 8pt grid system
- ✅ 44-48px tap targets
- ✅ Safe area support (iOS/Android)
- ✅ Dark mode compatibility
- ✅ Haptics on Approve/Share actions
- ✅ Bottom sheet focus trap
- ✅ WCAG 2.1 Level AA compliance
- ✅ Screen reader support
- ✅ Keyboard navigation
- ✅ Reduced motion support

**Reference Files:**
- `/styles/globals.css` (Mobile styles)
- `/components/MobilePolishEnhancer.tsx`
- `/components/FocusTrap.tsx`
- `/lib/haptics.ts`

---

## Implementation Priority

### Phase 1 - Critical User-Facing (Complete First):
1. ✅ Splash page copy - DONE
2. 🔄 Home dashboard (Today items, Quick actions)
3. 🔄 Onboarding flow updates
4. 🔄 Pricing/Paywall updates

### Phase 2 - Feature Enhancement:
5. 🔄 Reports exports
6. 🔄 Parent Hub + Community
7. 🔄 BCBA/RBT notes
8. 🔄 Benefits Navigator

### Phase 3 - Professional Features:
9. 🔄 Telehealth
10. 🔄 Multi-caregiver/Multi-child
11. 🔄 Live AI Video badges
12. 🔄 Streaks & Share-a-win

### Phase 4 - Developer Tools:
13. 🔄 Developer Mode panel

---

## Testing Checklist

### Copy Accuracy:
- [ ] All headlines match spec exactly
- [ ] All CTAs match spec exactly
- [ ] All microcopy matches spec
- [ ] No orphaned words in headlines
- [ ] Manual line breaks where specified

### Spacing Accuracy:
- [ ] Logo-to-headline spacing correct (mobile)
- [ ] Headline-to-subhead spacing correct
- [ ] Subhead-to-CTA spacing correct
- [ ] CTA-to-micro-note spacing correct
- [ ] All measurements within 56-64px range

### Mobile Responsiveness:
- [ ] Touch targets 44-48px minimum
- [ ] Safe area insets respected
- [ ] Keyboard doesn't obscure inputs
- [ ] Bottom sheets properly positioned
- [ ] All text readable at 320px width

### Accessibility:
- [ ] All interactive elements focusable
- [ ] Focus trap working in modals
- [ ] Escape key closes modals
- [ ] Screen reader announcements correct
- [ ] Color contrast meets WCAG AA

---

## Files Modified Summary

### Completed (1/14):
- `/components/SplashScreen.tsx` ✅

### Pending Implementation (13/14):
- `/components/DashboardEnhanced.tsx`
- `/components/TodayStrip.tsx`
- `/components/QuickActionsRow.tsx`
- `/components/FeelingsChips.tsx`
- `/components/LiveAIVideoSheet.tsx`
- `/components/OnboardingFlow5Steps.tsx`
- `/components/ApproveScreen.tsx`
- `/components/ReportsTab.tsx`
- `/components/ProviderReadyPacket.tsx`
- `/components/WeeklyOutcomesPDF.tsx`
- `/components/ParentHubPage.tsx`
- `/components/FromAminySection.tsx`
- `/components/CommunityForYou.tsx`
- `/components/AskAminyIntentsRow.tsx`
- `/components/BCBANotesTemplate.tsx`
- `/components/RBTQuickActions.tsx`
- `/components/BenefitsNavigatorScreen.tsx`
- `/components/BenefitsLetterGenerator.tsx`
- `/components/BenefitsStatusPanel.tsx`
- `/components/TelehealthScreen.tsx`
- `/components/TelehealthScheduling.tsx`
- `/components/PostVisitSummary.tsx`
- `/components/CaregiverManagementScreen.tsx`
- `/components/ManageCaregivers.tsx`
- `/components/ChildSwitcher.tsx`
- `/components/PaywallScreen.tsx`
- `/components/UpdatedPricingCards.tsx`
- `/components/ALaCarteMenu.tsx`
- `/components/ShopPage.tsx`
- `/components/DeveloperModePanel.tsx` (New)
- `/components/DeveloperModeHandler.tsx`
- `/components/StreakTracker.tsx`
- `/components/ShareWinCard.tsx`
- `/components/OutcomeSignatureTiles.tsx`
- `/App.tsx` (Developer Mode listener)

---

## Next Steps

1. **Review this document** - Confirm all copy and specs are correct
2. **Prioritize implementation** - Start with Phase 1 items
3. **Update components systematically** - One phase at a time
4. **Test thoroughly** - Use Mobile QA checklist
5. **Deploy incrementally** - Phase-by-phase rollout

---

## Notes

- All copy changes maintain the warm, supportive Aminy tone
- Spacing follows Apple-level precision (8pt grid)
- Mobile-first approach with desktop enhancements
- Accessibility is never compromised
- Performance remains optimal

---

**Document Version:** 1.0  
**Last Updated:** $(date)  
**Status:** Phase 1 (1/14 items complete)
