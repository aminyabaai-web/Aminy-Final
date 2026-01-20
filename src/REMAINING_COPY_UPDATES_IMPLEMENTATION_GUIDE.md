# Remaining Copy & UX Updates - Complete Implementation Guide

## Status: 2/14 Complete (14.3%)

**Completed:**
- ✅ Item 1: Splash Page Copy and Spacing
- ✅ Item 2: Home Dashboard (Chat-First)

**Remaining:** Items 3-14 (12 major updates)

---

## ITEM 3: ONBOARDING (VOICE + APPROVE) 🔴 HIGH PRIORITY

**File:** `/components/OnboardingFlow5Steps.tsx`

### Required Changes:

#### Step 2: New Prompt - "What matters most this week?"
Replace the current Goal Selection with:
```typescript
const priorityChips = [
  "Mornings",
  "Meltdowns", 
  "Communication",
  "Sleep",
  "School",
  "Feeding"
];
```

**UI Pattern:** Chip selection (multi-select allowed)
**AI Companion Strip:** "What matters most this week? Pick 1-3 areas."

#### Step 3: New Prompt - "When do you usually have a few minutes?"
Replace the current Schedule Setup with:
```typescript
const timeChips = [
  "Morning",
  "Afternoon",
  "Evening",
  "Weekends"
];
```

**UI Pattern:** Chip selection (multi-select allowed)
**AI Companion Strip:** "When do you usually have a few minutes?"

#### Step 4: New Prompt - "Any sensitivities we should watch?"
```typescript
const sensitivityChips = [
  "Sound",
  "Light",
  "Texture",
  "Transitions",
  "Crowds",
  "None/Unsure"
];
```

**UI Pattern:** Chip selection (multi-select allowed)
**AI Companion Strip:** "Any sensitivities we should watch? (No pressure—just helps us be gentle.)"

#### Step 5: Approve Screen
**Title:** "Your 7-day gentle start"

**Toggles (all ON by default):**
- "Today's routine" 
- "Two focus goals"
- "Calming supports"

**Buttons (horizontal row):**
- "Approve" (primary CTA)
- "Simplify" (secondary)
- "Not now" (tertiary/text link)

**Output Label:** "Diagnostic Prep Packet (not a diagnosis)"

**Implementation Notes:**
- Preserve existing step navigation
- Keep progress bar
- Maintain AI Companion Strip pattern
- Use existing chip styling from globals.css (.aminy-focus-area-pill patterns)

---

## ITEM 4: PRICING / PAYWALLS 🔴 HIGH PRIORITY

**Files:** 
- `/components/PaywallScreen.tsx`
- `/components/UpdatedPricingCards.tsx`
- `/components/ALaCarteMenu.tsx`
- `/components/ShopPage.tsx`

### Tier Structure (Exact Copy):

#### Core - $14.99/mo
- AI Companion unlimited
- Live AI Video (short bursts)
- Weekly Outcomes PDF
- Aminy Jr (standard)
- 2 caregivers

#### Pro - $29.99/mo
**Everything in Core, plus:**
- Aminy Jr (unlimited)
- Provider-ready packet
- Provider invites
- Live AI Video (up to 10 min)
- Priority analysis

#### Pro Plus - $49.99/mo
**Everything in Pro, plus:**
- Monthly human credit (30m RBT or 15m BCBA, use-it-or-lose-it)
- Live AI Video (up to 20 min)
- 48-hour coach SLA

#### Jr-Only - $14.99-19.99/mo
- Kid mode only
- Upsell on exports/time caps

### A la Carte Pricing
**RBT Sessions:**
- 15m: $14.99
- 30m: $24.99

**BCBA Sessions:**
- 15m: $29.99
- 30m: $49.99

**SLP Sessions:**
- 15m: $34.99
- 30m: $59.99

**4-packs:** Save 10-15%

**Implementation Notes:**
- Use clean card layout
- Highlight Pro as "Most Popular"
- Show value props clearly
- Mobile-responsive pricing table

---

## ITEM 5: REPORTS EXPORTS 🔴 HIGH PRIORITY

**File:** `/components/ReportsTab.tsx`

### Export Button Copy:
- **Core tier:** "Weekly Outcomes PDF (Core)" 
- **Pro/Pro Plus:** "Provider-ready packet (Pro/Pro Plus)"

**Watermark:** All exports watermarked, expire in 7 days

### Parity Note:
```
"All charts match the dashboard. New data automatically updates exports."
```

### Share Bar (3 actions):
1. "Copy link"
2. "Email to provider"  
3. "Save to Vault"

### Footer:
```
"For clinical use with your provider. Not a diagnosis."
```

**Implementation Notes:**
- PDF generation with watermark
- Expiration logic (7 days)
- Email integration
- Vault save integration

---

## ITEM 6: PARENT HUB + COMMUNITY 🟡 MEDIUM PRIORITY

**File:** `/components/ParentHubPage.tsx`

### From Aminy Cards:
1. **Sleep regression at 4?**
   - "Short answer: Yes. Longer: Here's why + what helps..."
   - CTA: "Read 2-min guide"

2. **AAC myths busted**
   - "It won't slow speech—it unlocks it. Here's the research."
   - CTA: "See evidence"

3. **IEP meeting this week?**
   - "Print this 1-pager so you don't forget your asks."
   - CTA: "Get checklist"

### Ask Aminy Intents (Quick Chips):
- Sleep
- Feeding  
- School
- Behavior
- Benefits

### Community Card Template:
**Structure:**
```
[Avatar] Parent name • 2h ago
Post title (1-2 lines max)
[Engagement: X responses • Y helpful]
Actions: Save | Share | Hide similar
```

### Post Composer:
- Toggle: "Remove names/PHI" (ON by default)
- Character limit: 500
- Auto-save drafts

**Implementation Notes:**
- Card grid layout
- Intent chips link to Ask Aminy with pre-filled context
- Community moderation system
- PHI detection algorithm

---

## ITEM 7: BCBA/RBT NOTES 🟡 MEDIUM PRIORITY

**File:** `/components/BCBANotesTemplate.tsx`

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

### Reason Chips (when "Couldn't do"):
- Fatigue
- Environment
- Too hard
- Meltdown
- Scheduling

### AI Apply to Plan:
**Suggestion:** "I noticed 3+ 'too hard' this week. Want me to adjust the goal?"

### Storage Note:
```
"Saved [timestamp] • Provider can see this"
```

**Implementation Notes:**
- Form validation
- Auto-save every 30s
- Provider notification system
- ABC event tracking

---

## ITEM 8: BENEFITS NAVIGATOR 🟡 MEDIUM PRIORITY

**File:** `/components/BenefitsNavigatorScreen.tsx`

### Step Subtitle:
```
"I'll draft the letters—approve to send."
```

### Rule Badge:
```
"Last checked: Oct 2025"
```

### Buttons (3 actions):
- Sign
- Send
- Track

### Status Chips:
- Submitted
- In review
- Approved
- More info needed

### Microcopy:
```
"I'll nudge you only when something needs you."
```

**Implementation Notes:**
- Letter generation AI
- E-signature integration
- Status tracking system
- Notification preferences

---

## ITEM 9: TELEHEALTH 🟡 MEDIUM PRIORITY

**File:** `/components/TelehealthScreen.tsx`

### Scheduling Title:
```
"Choose a time that works"
```

### Reminders (all ON by default):
- Calendar invite
- Email
- SMS

### Previsit Label:
```
"I filled this out based on your week—edit anything."
```

### Post-visit Summary Title:
```
"Here's what we covered and what's next"
```

**Implementation Notes:**
- Calendar integration
- Video conferencing
- Pre-visit form auto-fill
- Post-visit summary generation

---

## ITEM 10: MULTI-CAREGIVER / MULTI-CHILD 🟢 LOW PRIORITY

**Files:**
- `/components/CaregiverManagementScreen.tsx`
- `/components/ChildSwitcher.tsx`

### Manage Caregivers Title:
```
"Manage caregivers"
```

### Roles:
- Owner
- Caregiver
- Read-only

### Actions:
- Invite via link/QR/code
- Revoke

### Child Switcher Label:
```
"Your children"
```

### Empty State:
```
"Add a child to get a plan tailored to them."
```

**Implementation Notes:**
- Permission system
- QR code generation
- Child profile management
- Data isolation per child

---

## ITEM 11: LIVE AI VIDEO BADGES 🟢 LOW PRIORITY

**File:** `/components/LiveAIVideoSheet.tsx`

### Tier Badges:
- **Core:** "Live AI Video (short bursts)"
- **Pro:** "Live AI Video (up to 10 min)"
- **Pro Plus:** "Live AI Video (up to 20 min) + coach review bookmarks"

### Async Option:
```
"Upload short video for AI tips"
```

**Implementation Notes:**
- Video time limits per tier
- Recording UI
- Async upload processing
- Bookmarking system

---

## ITEM 12: DEVELOPER MODE (SHIFT+D) 🟢 LOW PRIORITY

**File:** `/components/DeveloperModePanel.tsx`

### Jump To Navigation:
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
- Tier (Free/Core/Pro/Pro Plus/Jr-Only)
- Chat/Reports/Jr/LiveVideo entitlements
- Chat/Jr/Video caps
- Mock data on/off

### Buttons:
- Fill with sample family
- Reset

**Implementation Notes:**
- Keyboard listener (Shift+D)
- State management
- Sample data generator
- Reset functionality

---

## ITEM 13: STREAKS, SHARE-A-WIN, OUTCOME TILES 🟢 LOW PRIORITY

**Files:**
- `/components/StreakTracker.tsx`
- `/components/ShareWinCard.tsx`
- `/components/OutcomeSignatureTiles.tsx`

### Gentle Streak:
**Label:** "Consistency without pressure"

### Success Toast:
```
"You kept at it this week—small steps count."
```

### Pause Toast:
```
"Taking a breather today. I'll keep things light."
```

### Share-a-Win:
**Today's win card** with privacy note:
```
"Names removed before sharing"
```

### Outcome Tiles:
- Include footnotes
- Add tooltips for methodology
- Show confidence intervals

**Implementation Notes:**
- Streak calculation
- Toast system
- Share functionality
- Statistical visualization

---

## ITEM 14: MOBILE QA CHECKLIST ✅ DESIGN GUIDANCE

**Type:** Non-Code (Already Implemented via globals.css)

### Verification Checklist:
- ✅ 8pt grid system
- ✅ 44-48px tap targets
- ✅ Safe area insets
- ✅ Dark mode support
- ✅ Haptic feedback
- ✅ Focus trap in modals

**All styling already in `/styles/globals.css`**

---

## IMPLEMENTATION PRIORITY ORDER

### Phase 1: Critical User-Facing (Week 1)
1. ✅ Splash - COMPLETE
2. ✅ Dashboard - COMPLETE  
3. 🔴 Onboarding - HIGH PRIORITY
4. 🔴 Pricing - HIGH PRIORITY

### Phase 2: Feature Enhancement (Week 2)
5. 🔴 Reports - HIGH PRIORITY
6. 🟡 Parent Hub - MEDIUM PRIORITY
7. 🟡 BCBA Notes - MEDIUM PRIORITY
8. 🟡 Benefits - MEDIUM PRIORITY

### Phase 3: Professional Features (Week 3)
9. 🟡 Telehealth - MEDIUM PRIORITY
10. 🟢 Multi-Caregiver - LOW PRIORITY
11. 🟢 Live Video Badges - LOW PRIORITY

### Phase 4: Developer Tools & Polish (Week 4)
12. 🟢 Developer Mode - LOW PRIORITY
13. 🟢 Streaks/Outcomes - LOW PRIORITY
14. ✅ Mobile QA - COMPLETE

---

## TESTING CHECKLIST PER ITEM

For each implementation, verify:
- [ ] All headlines match spec exactly
- [ ] All CTAs match spec exactly
- [ ] All microcopy matches spec
- [ ] No orphaned words in headlines
- [ ] Manual line breaks where specified
- [ ] Spacing measurements correct
- [ ] Touch targets 44-48px minimum
- [ ] Mobile responsiveness verified
- [ ] Accessibility compliance checked
- [ ] Dark mode working
- [ ] High contrast mode working
- [ ] Reduced motion respected

---

## FILES REQUIRING UPDATES

### High Priority (Complete First):
- `/components/OnboardingFlow5Steps.tsx` ← Item 3
- `/components/PaywallScreen.tsx` ← Item 4
- `/components/ReportsTab.tsx` ← Item 5

### Medium Priority:
- `/components/ParentHubPage.tsx` ← Item 6
- `/components/BCBANotesTemplate.tsx` ← Item 7
- `/components/BenefitsNavigatorScreen.tsx` ← Item 8
- `/components/TelehealthScreen.tsx` ← Item 9

### Lower Priority:
- `/components/CaregiverManagementScreen.tsx` ← Item 10
- `/components/LiveAIVideoSheet.tsx` ← Item 11
- `/components/DeveloperModePanel.tsx` ← Item 12
- `/components/StreakTracker.tsx` ← Item 13
- `/components/ShareWinCard.tsx` ← Item 13
- `/components/OutcomeSignatureTiles.tsx` ← Item 13

---

## NEXT IMMEDIATE ACTION

**Recommended:** Implement Item 3 (Onboarding) first as it's the highest-impact user-facing screen after the splash/dashboard.

**Estimated Time:**
- Item 3: 2-3 hours
- Item 4: 3-4 hours  
- Item 5: 2-3 hours
- Items 6-14: 15-20 hours total

**Total Remaining Effort:** ~25-30 hours of focused development

---

**Last Updated:** Current Session
**Status:** 2/14 Complete (14.3% → Target: 100%)
