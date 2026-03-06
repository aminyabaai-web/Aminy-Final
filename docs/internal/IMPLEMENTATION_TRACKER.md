# Copy & UX Updates - Implementation Tracker

## ✅ COMPLETED (2/14)

### Item 1: Splash Page Copy and Spacing ✅
**Status:** COMPLETE  
**File:** `/components/SplashScreen.tsx`
- ✅ Headline: "Meet Aminy Autism"
- ✅ Subhead: "Your daily AI companion for families navigating autism—gentle guidance, real progress."
- ✅ Primary CTA: "Get started"
- ✅ Secondary link: "See how it works"
- ✅ Micro note: "Friendly, expert guidance. Not a diagnosis."
- ✅ Exact mobile spacing implemented

### Item 2: Home Dashboard (Chat-First) ✅
**Status:** COMPLETE  
**Files:** `/components/TodayStrip.tsx`, `/components/LiveAIVideoSheet.tsx`
- ✅ Today items with exact copy
- ✅ Quick actions verified
- ✅ Feelings chips verified
- ✅ Live AI Video sheet title updated

---

## 🔴 HIGH PRIORITY - NEXT TO IMPLEMENT

### Item 3: Onboarding (Voice + Approve)
**Status:** READY FOR IMPLEMENTATION  
**File:** `/components/OnboardingFlow5Steps.tsx`
**Complexity:** HIGH (requires significant restructuring)

**Changes Needed:**
1. Replace Step 1 with "What matters most this week?" (6 chips)
2. Replace Step 2 with "When do you usually have a few minutes?" (4 chips)
3. Add Step 3: "Any sensitivities we should watch?" (6 chips)
4. Add Step 4: Approve Screen with toggles and buttons
5. Keep Step 5: Junior setup prompt

**Estimated Effort:** 3-4 hours

---

### Item 4: Pricing / Paywalls
**Status:** READY FOR IMPLEMENTATION  
**Files:** `/components/PaywallScreen.tsx`, `/components/UpdatedPricingCards.tsx`
**Complexity:** MEDIUM-HIGH

**Changes Needed:**
1. Update Core tier ($14.99/mo) with exact features
2. Update Pro tier ($29.99/mo) with exact features
3. Update Pro Plus tier ($49.99/mo) with exact features
4. Add Jr-Only tier ($14.99-19.99/mo)
5. Update a la carte pricing in `/components/ALaCarteMenu.tsx`

**Estimated Effort:** 2-3 hours

---

## 🟡 MEDIUM PRIORITY

### Item 5: Reports Exports
**Files:** `/components/ReportsTab.tsx`, `/components/WeeklyOutcomesPDF.tsx`
**Changes Needed:**
- Update export button copy by tier
- Add watermark note
- Add parity note
- Add share bar (Copy link, Email, Save to Vault)
- Update footer

**Estimated Effort:** 2-3 hours

---

### Item 6: Parent Hub + Community
**Files:** `/components/ParentHubPage.tsx`, `/components/FromAminySection.tsx`
**Changes Needed:**
- Update From Aminy cards (3 cards with exact copy)
- Update Ask Aminy intent chips (5 chips)
- Update community card template
- Add post composer with PHI toggle

**Estimated Effort:** 2-3 hours

---

### Item 7: BCBA/RBT Notes
**File:** `/components/BCBANotesTemplate.tsx`
**Changes Needed:**
- Update section labels
- Add quick taps
- Add reason chips
- Add AI suggestion system
- Update storage note

**Estimated Effort:** 2-3 hours

---

### Item 8: Benefits Navigator
**File:** `/components/BenefitsNavigatorScreen.tsx`
**Changes Needed:**
- Update step subtitle
- Add rule badge
- Update button copy
- Add status chips
- Update microcopy

**Estimated Effort:** 2 hours

---

### Item 9: Telehealth
**Files:** `/components/TelehealthScreen.tsx`, `/components/TelehealthScheduling.tsx`
**Changes Needed:**
- Update scheduling title
- Update reminder toggles
- Update previsit label
- Add post-visit summary title

**Estimated Effort:** 2 hours

---

## 🟢 LOWER PRIORITY

### Item 10: Multi-Caregiver / Multi-Child
**Files:** `/components/CaregiverManagementScreen.tsx`, `/components/ChildSwitcher.tsx`
**Changes Needed:**
- Update titles and labels
- Add role system
- Update action buttons
- Add empty states

**Estimated Effort:** 2 hours

---

### Item 11: Live AI Video Badges
**File:** `/components/LiveAIVideoSheet.tsx`
**Changes Needed:**
- Add tier-specific badges
- Update async option copy

**Estimated Effort:** 1 hour

---

### Item 12: Developer Mode (Shift+D)
**File:** `/components/DeveloperModePanel.tsx`
**Changes Needed:**
- Add jump-to navigation
- Add tier toggles
- Add entitlement toggles
- Add sample data buttons

**Estimated Effort:** 3 hours

---

### Item 13: Streaks, Share-a-Win, Outcome Tiles
**Files:** `/components/StreakTracker.tsx`, `/components/ShareWinCard.tsx`, `/components/OutcomeSignatureTiles.tsx`
**Changes Needed:**
- Update streak copy
- Update toasts
- Add share-a-win privacy note
- Add outcome tile footnotes

**Estimated Effort:** 2 hours

---

### Item 14: Mobile QA Checklist ✅
**Status:** ALREADY IMPLEMENTED  
**Type:** Design Guidance (Non-Code)
All mobile polish already in `/styles/globals.css`

---

## TOTAL REMAINING EFFORT

**High Priority (Items 3-4):** 5-7 hours  
**Medium Priority (Items 5-9):** 10-13 hours  
**Lower Priority (Items 10-13):** 8 hours  

**TOTAL ESTIMATED:** 23-28 hours of focused development

---

## RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Critical User-Facing (This Sprint)
1. ✅ Splash - COMPLETE
2. ✅ Dashboard - COMPLETE
3. 🔴 Onboarding (Item 3) - START HERE
4. 🔴 Pricing (Item 4) - NEXT

### Phase 2: Core Features (Next Sprint)
5. Reports (Item 5)
6. Parent Hub (Item 6)
7. BCBA Notes (Item 7)

### Phase 3: Professional Features (Sprint 3)
8. Benefits (Item 8)
9. Telehealth (Item 9)
10. Multi-Caregiver (Item 10)

### Phase 4: Polish & Tools (Sprint 4)
11. Live Video Badges (Item 11)
12. Developer Mode (Item 12)
13. Streaks/Outcomes (Item 13)
14. ✅ Mobile QA - COMPLETE

---

## QUALITY CHECKLIST (Per Item)

Before marking any item complete, verify:
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

## DOCUMENTATION

**Complete Specifications:**
- `/COPY_AND_UX_UPDATES_COMPLETE.md` - Full spec for all 14 items
- `/COPY_IMPLEMENTATION_PLAN.md` - Detailed implementation plan
- `/ONBOARDING_UPDATES_SPEC.md` - Specific onboarding changes
- `/REMAINING_COPY_UPDATES_IMPLEMENTATION_GUIDE.md` - Comprehensive guide

**Current Status:** 2/14 complete (14.3%)  
**Target:** 14/14 complete (100%)

---

**Last Updated:** Current Session  
**Next Action:** Implement Item 3 (Onboarding) or Item 4 (Pricing)
