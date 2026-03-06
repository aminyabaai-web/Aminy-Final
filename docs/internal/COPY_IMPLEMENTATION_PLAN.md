# Copy & UX Updates - Implementation Plan

## Implementation Status

### ✅ Phase 1: Complete (1/14)
1. **Splash Page** - DONE
   - Headline: "Meet Aminy Autism"
   - Subhead: "Your daily AI companion for families navigating autism—gentle guidance, real progress."
   - Exact spacing implemented

### 🔄 Phase 2: High-Priority User-Facing (In Progress)

#### 2. Dashboard / Home (Chat-First)
**File:** `/components/TodayStrip.tsx`
**Updates:**
```typescript
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

**File:** `/components/QuickActionsRow.tsx`
**Updates:**
```typescript
const quickActions = [
  "Start routine",
  "Log win",
  "Message coach",
  "Export report"
];
```

**File:** `/components/FeelingsChips.tsx`
**Updates:**
```typescript
const feelings = ["Great", "Okay", "Tough"];
```

**File:** `/components/LiveAIVideoSheet.tsx`
**Title:** "Live AI Video – I'll guide you in real time"

---

#### 3. Onboarding Flow
**File:** `/components/OnboardingFlow5Steps.tsx`

**Prompt 1:** "What matters most this week?"
**Chips:** Mornings, Meltdowns, Communication, Sleep, School, Feeding

**Prompt 2:** "When do you usually have a few minutes?"
**Chips:** Morning, Afternoon, Evening, Weekends

**Prompt 3:** "Any sensitivities we should watch?"
**Chips:** Sound, Light, Texture, Transitions, Crowds, None/Unsure

**Approve Screen Title:** "Your 7-day gentle start"
**Toggles:** Today's routine, Two focus goals, Calming supports
**Buttons:** Approve, Simplify, Not now
**Output label:** "Diagnostic Prep Packet (not a diagnosis)"

---

#### 4. Pricing / Paywalls
**File:** `/components/PaywallScreen.tsx`

**Core ($14.99/month):**
- AI Companion unlimited
- Live AI Video (short bursts)
- Weekly Outcomes PDF
- Aminy Jr (standard)
- 2 caregivers

**Pro ($29.99/month):**
Everything in Core +
- Aminy Jr (unlimited)
- Provider-ready packet
- Provider invites
- Live AI Video (up to 10 min)
- Priority analysis

**Pro Plus ($49.99/month):**
Everything in Pro +
- Monthly human credit (30m RBT or 15m BCBA, use-it-or-lose-it)
- Live AI Video (up to 20 min)
- 48-hour coach SLA

**Jr-Only ($14.99-19.99/month):**
- Kid mode only
- Upsell on exports/time caps

**A la carte (never expire):**
- RBT: 15m $14.99, 30m $24.99
- BCBA: 15m $29.99, 30m $49.99
- SLP: 15m $34.99, 30m $59.99
- 4-packs save 10-15%

---

### 📋 Phase 3: Feature Enhancement

#### 5. Reports Exports
**File:** `/components/ReportsTab.tsx`

**Buttons:**
- "Weekly Outcomes PDF (Core)"
- "Provider-ready packet (Pro/Pro Plus)" - watermarked, expires in 7 days

**Parity note:** "All charts match the dashboard. New data automatically updates exports."

**Share bar:** Copy link, Email to provider, Save to Vault

**Footer:** "For clinical use with your provider. Not a diagnosis."

---

#### 6. Parent Hub + Community
**File:** `/components/ParentHubPage.tsx`

**From Aminy cards:**
- "This week's focus: I'll keep this light: two quick wins and one stretch. Approve?"
- "Wins to share: Three calm transitions in a row—want to celebrate?"
- "Next best experiment: Try a 2-min preview before transitions this week."

**Buttons:** Approve, Save for later

**Ask Aminy intents:** Sleep, Feeding, School, Behavior, Benefits

---

#### 7. Benefits Navigator
**File:** `/components/BenefitsNavigatorScreen.tsx`

**Step subtitle:** "I'll draft the letters—approve to send."
**Rule badge:** "Last checked: Oct 2025"
**Buttons:** Sign, Send, Track
**Status chips:** Submitted, In review, Approved, More info needed
**Microcopy:** "I'll nudge you only when something needs you."

---

#### 8. Telehealth
**File:** `/components/TelehealthScreen.tsx`

**Scheduling title:** "Choose a time that works"
**Reminders:** Calendar invite, Email, SMS
**Previsit label:** "I filled this out based on your week—edit anything."
**Post-visit summary title:** "Here's what we covered and what's next"

---

### 🔧 Phase 4: Professional Features

#### 9. Multi-Caregiver / Multi-Child
**File:** `/components/CaregiverManagementScreen.tsx`

**Title:** "Manage caregivers"
**Roles:** Owner, Caregiver, Read-only
**Actions:** Invite via link/QR/code, Revoke

**File:** `/components/ChildSwitcher.tsx`
**Label:** "Your children"
**Empty state:** "Add a child to get a plan tailored to them."

---

#### 10. Live AI Video Badges
**File:** `/components/LiveAIVideoSheet.tsx`

**Core:** "Live AI Video (short bursts)"
**Pro:** "Live AI Video (up to 10 min)"
**Pro Plus:** "Live AI Video (up to 20 min) + coach review bookmarks"
**Async:** "Upload short video for AI tips"

---

#### 11. Streaks, Share-a-Win, Outcome Tiles
**File:** `/components/StreakTracker.tsx`

**Title:** "Gentle streak"
**Subtitle:** "Consistency without pressure"
**Success toast:** "You kept at it this week—small steps count."
**Pause toast:** "Taking a breather today. I'll keep things light."

**File:** `/components/ShareWinCard.tsx`

**Headline:** "Today's win"
**Body:** "We nailed calm transitions today. Proud of this win."
**Footer:** "Shared with Aminy Autism"
**CTA:** "Copy link"
**Privacy:** "This post uses initials and no personal details."

**File:** `/components/OutcomeSignatureTiles.tsx`

**Tiles:**
- Minutes saved this week (footnote: "Estimated from shorter routines and fewer retries.")
- De-escalations shortened (footnote: "Based on average time from trigger to calm.")
**Tooltip:** "I estimate these from your plan activity, fidelity taps, and Calm Corner sessions."

---

#### 12. BCBA/RBT Notes
**File:** `/components/BCBANotesTemplate.tsx`

**Section labels:** Goal, Prompting level, Mastery criteria, Trials, ABC events, Dosage

**Quick taps:** As written, Modified, Couldn't do

**Reason chips:** Fatigue, Environment, Too hard, Meltdown, Scheduling

**Apply to Plan (AI):** "Suggest reducing prompts to partial physical and adding generalization in 2 settings."
**Buttons:** Apply, Edit, Dismiss

**Storage note:** "Saved to Vault with timestamp; included in Provider-ready packet."

---

### 🛠️ Phase 5: Developer Tools

#### 13. Developer Mode (Shift+D)
**File:** `/components/DeveloperModePanel.tsx` (NEW)

**Jump to:**
- Splash, Onboarding Approve, Home, Coach, Reports, Hub, Jr, Benefits, Telehealth, Paywalls

**Toggles:**
- Tier, Chat/Reports/Jr/LiveVideo entitlements
- Chat/Jr/Video caps, Mock data on/off

**Buttons:**
- Fill with sample family, Reset

---

### ✅ Phase 6: Design Guidance

#### 14. Mobile QA Checklist
**Non-code checklist:**
- ✅ 8pt grid
- ✅ 44-48px tap targets
- ✅ Safe areas
- ✅ Dark mode
- ✅ Haptics on Approve/Share
- ✅ Bottom sheet focus trap
- ✅ WCAG 2.1 AA
- ✅ Screen reader support
- ✅ Keyboard navigation
- ✅ Reduced motion

---

## Implementation Order

1. ✅ **Splash** (Complete)
2. 🔄 **Dashboard Today Items** (Current)
3. 🔄 **Quick Actions**
4. 🔄 **Feelings Chips**
5. 🔄 **Onboarding Prompts**
6. 🔄 **Pricing Tiers**
7. **Reports Exports**
8. **Parent Hub Cards**
9. **Benefits Navigator**
10. **Telehealth**
11. **Multi-Caregiver**
12. **Live AI Video Badges**
13. **Streaks & Outcomes**
14. **BCBA/RBT Notes**
15. **Developer Mode**

---

## Files to Update

### Immediate (Phase 2):
- ✅ `/components/SplashScreen.tsx`
- `/components/TodayStrip.tsx`
- `/components/QuickActionsRow.tsx`
- `/components/FeelingsChips.tsx`
- `/components/LiveAIVideoSheet.tsx`
- `/components/OnboardingFlow5Steps.tsx`
- `/components/PaywallScreen.tsx`

### Next (Phase 3):
- `/components/ReportsTab.tsx`
- `/components/ParentHubPage.tsx`
- `/components/FromAminySection.tsx`
- `/components/AskAminyIntentsRow.tsx`
- `/components/BenefitsNavigatorScreen.tsx`
- `/components/TelehealthScreen.tsx`

### Final (Phases 4-5):
- `/components/CaregiverManagementScreen.tsx`
- `/components/ChildSwitcher.tsx`
- `/components/StreakTracker.tsx`
- `/components/ShareWinCard.tsx`
- `/components/OutcomeSignatureTiles.tsx`
- `/components/BCBANotesTemplate.tsx`
- `/components/DeveloperModePanel.tsx` (NEW)

---

## Next Steps

**Immediate action:** Update Phase 2 components with exact copy from specification.

**Priority:** Dashboard components have highest user impact and should be completed first.

**Testing:** After each phase, verify copy matches specification exactly and spacing is correct.
