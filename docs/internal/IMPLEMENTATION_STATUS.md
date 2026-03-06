# Copy & UX Implementation Status

## Completed ✅

### 1. Splash Page Copy and Spacing
**File:** `/components/SplashScreen.tsx`
- ✅ Headline: "Meet Aminy Autism"
- ✅ Subhead: "Your daily AI companion for families navigating autism—gentle guidance, real progress."
- ✅ Primary CTA: "Get started"
- ✅ Secondary link: "See how it works"
- ✅ Micro note: "Friendly, expert guidance. Not a diagnosis."
- ✅ Exact mobile spacing: 60px top, 18px logo→headline, 10px headline→subhead, 18px subhead→CTA, 8px micro note

### 2. Home Dashboard (Chat-First)
**Files:** `/components/TodayStrip.tsx`, `/components/QuickActionsRow.tsx`, `/components/FeelingsChips.tsx`, `/components/LiveAIVideoSheet.tsx`
- ✅ Today items: "Morning routine (2 steps · 6 min)", "Ask for help (3 prompts · 4 min)", "Calm Corner (60-sec reset · 1 min)"
- ✅ Quick actions: "Start routine", "Log win", "Message coach", "Export report"
- ✅ Feelings chips: "Great", "Okay", "Tough"
- ✅ Live AI Video sheet title: "Live AI Video – I'll guide you in real time"

---

## In Progress 🔄

### 3. Onboarding (Voice + Approve)
**Priority:** HIGH
**File:** `/components/OnboardingFlow5Steps.tsx`

**Required Updates:**
```typescript
// Prompt 1: "What matters most this week?"
const priorityChips = ["Mornings", "Meltdowns", "Communication", "Sleep", "School", "Feeding"];

// Prompt 2: "When do you usually have a few minutes?"
const timeChips = ["Morning", "Afternoon", "Evening", "Weekends"];

// Prompt 3: "Any sensitivities we should watch?"
const sensitivityChips = ["Sound", "Light", "Texture", "Transitions", "Crowds", "None/Unsure"];

// Approve Screen
title: "Your 7-day gentle start"
toggles: ["Today's routine", "Two focus goals", "Calming supports"]
buttons: ["Approve", "Simplify", "Not now"]
outputLabel: "Diagnostic Prep Packet (not a diagnosis)"
```

### 4. Pricing / Paywalls
**Priority:** HIGH
**File:** `/components/PaywallScreen.tsx`

**Tier Structure:**
- **Core ($14.99/mo):** AI Companion unlimited, Live AI Video (short bursts), Weekly Outcomes PDF, Aminy Jr (standard), 2 caregivers
- **Pro ($29.99/mo):** Everything in Core + Aminy Jr (unlimited), Provider-ready packet, provider invites, Live AI Video (up to 10 min), priority analysis
- **Pro Plus ($49.99/mo):** Everything in Pro + monthly human credit (30m RBT or 15m BCBA, use-it-or-lose-it), Live AI Video (up to 20 min), 48-hour coach SLA
- **Jr-Only ($14.99-19.99/mo):** Kid mode only; upsell on exports/time caps
- **A la carte:** RBT 15m $14.99, 30m $24.99 | BCBA 15m $29.99, 30m $49.99 | SLP 15m $34.99, 30m $59.99 | 4-packs save 10-15%

---

## Pending Implementation 📋

### 5. Reports Exports
**File:** `/components/ReportsTab.tsx`
- Button text: "Weekly Outcomes PDF (Core)", "Provider-ready packet (Pro/Pro Plus)" - watermarked, expires in 7 days
- Parity note: "All charts match the dashboard. New data automatically updates exports."
- Share bar: "Copy link", "Email to provider", "Save to Vault"
- Footer: "For clinical use with your provider. Not a diagnosis."

### 6. Parent Hub + Community
**File:** `/components/ParentHubPage.tsx`
- From Aminy cards with exact copy
- Ask Aminy intents: Sleep, Feeding, School, Behavior, Benefits
- Community card template with "Save", "Share", "Hide similar" actions
- Post composer with "Remove names/PHI" toggle

### 7. BCBA/RBT Notes
**File:** `/components/BCBANotesTemplate.tsx`
- Section labels: Goal, Prompting level, Mastery criteria, Trials, ABC events, Dosage
- Quick taps: "As written", "Modified", "Couldn't do"
- Reason chips: Fatigue, Environment, Too hard, Meltdown, Scheduling
- AI Apply to Plan suggestion
- Storage note with timestamp

### 8. Benefits Navigator
**File:** `/components/BenefitsNavigatorScreen.tsx`
- Step subtitle: "I'll draft the letters—approve to send."
- Rule badge: "Last checked: Oct 2025"
- Buttons: Sign, Send, Track
- Status chips: Submitted, In review, Approved, More info needed
- Microcopy: "I'll nudge you only when something needs you."

### 9. Telehealth
**File:** `/components/TelehealthScreen.tsx`
- Scheduling title: "Choose a time that works"
- Reminders: Calendar invite, Email, SMS
- Previsit label: "I filled this out based on your week—edit anything."
- Post-visit summary title: "Here's what we covered and what's next"

### 10. Multi-Caregiver / Multi-Child
**Files:** `/components/CaregiverManagementScreen.tsx`, `/components/ChildSwitcher.tsx`
- Manage caregivers title: "Manage caregivers"
- Roles: Owner, Caregiver, Read-only
- Actions: Invite via link/QR/code, Revoke
- Child switcher label: "Your children"
- Empty state: "Add a child to get a plan tailored to them."

### 11. Live AI Video Badges
**File:** `/components/LiveAIVideoSheet.tsx`
- Core: "Live AI Video (short bursts)"
- Pro: "Live AI Video (up to 10 min)"
- Pro Plus: "Live AI Video (up to 20 min) + coach review bookmarks"
- Async: "Upload short video for AI tips"

### 12. Developer Mode (Shift+D)
**File:** `/components/DeveloperModePanel.tsx`
- Jump to navigation: Splash, Onboarding Approve, Home, Coach, Reports, Hub, Jr, Benefits, Telehealth, Paywalls
- Toggles: Tier, Chat/Reports/Jr/LiveVideo entitlements, Chat/Jr/Video caps, Mock data on/off
- Buttons: Fill with sample family, Reset

### 13. Streaks, Share-a-Win, Outcome Tiles
**Files:** `/components/StreakTracker.tsx`, `/components/ShareWinCard.tsx`, `/components/OutcomeSignatureTiles.tsx`
- Gentle streak: "Consistency without pressure"
- Success toast: "You kept at it this week—small steps count."
- Pause toast: "Taking a breather today. I'll keep things light."
- Share-a-win: Today's win card with privacy note
- Outcome tiles with footnotes and tooltips

### 14. Mobile QA Checklist
**Type:** Design Guidance (Non-Code)
- 8pt grid, 44-48px tap targets, safe areas, dark mode, haptics, focus trap
- Already implemented via `/styles/globals.css` and mobile components

---

## Implementation Order

1. ✅ **Splash** - COMPLETE
2. ✅ **Dashboard Today Items** - COMPLETE
3. 🔄 **Onboarding Prompts** - IN PROGRESS (High Priority)
4. 🔄 **Pricing Tiers** - IN PROGRESS (High Priority)
5. **Reports Exports** - Next
6. **Parent Hub Cards** - Next
7. **Benefits Navigator** - Next
8. **Telehealth** - Next
9. **Multi-Caregiver** - Next
10. **Live AI Video Badges** - Next
11. **Streaks & Outcomes** - Next
12. **BCBA/RBT Notes** - Next
13. **Developer Mode** - Final
14. **Mobile QA** - Continuous

---

## Files Modified

### Completed (4/35):
- `/components/SplashScreen.tsx` ✅
- `/components/TodayStrip.tsx` ✅
- `/components/QuickActionsRow.tsx` ✅ (already had correct copy)
- `/components/FeelingsChips.tsx` ✅ (already had correct copy)
- `/components/LiveAIVideoSheet.tsx` ✅

### In Progress (2/35):
- `/components/OnboardingFlow5Steps.tsx` 🔄
- `/components/PaywallScreen.tsx` 🔄

### Pending (29/35):
- `/components/ReportsTab.tsx`
- `/components/ParentHubPage.tsx`
- `/components/FromAminySection.tsx`
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
- `/components/UpdatedPricingCards.tsx`
- `/components/ALaCarteMenu.tsx`
- `/components/ShopPage.tsx`
- `/components/StreakTracker.tsx`
- `/components/ShareWinCard.tsx`
- `/components/OutcomeSignatureTiles.tsx`
- `/components/DeveloperModePanel.tsx`
- `/components/WeeklyOutcomesPDF.tsx`
- `/components/ProviderReadyPacket.tsx`
- `/App.tsx` (Developer Mode listener)
- And several others...

---

## Next Steps

**Immediate Priority:**
1. Complete Onboarding prompts and Approve screen
2. Update Pricing/Paywall tiers with exact copy
3. Implement Reports export buttons and microcopy
4. Update Parent Hub cards and Ask Aminy intents

**Testing Checklist:**
- [ ] All headlines match spec exactly
- [ ] All CTAs match spec exactly
- [ ] All microcopy matches spec
- [ ] No orphaned words in headlines
- [ ] Manual line breaks where specified
- [ ] Spacing measurements correct
- [ ] Touch targets 44-48px minimum
- [ ] Mobile responsiveness verified
- [ ] Accessibility compliance checked

---

**Status:** 4/14 items complete (28.6%)
**Last Updated:** $(date)
