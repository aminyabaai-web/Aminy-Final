# Aminy Playwright UI Polish Audit

Generated from the latest local audit run on March 13, 2026.

Source of truth:
- `/private/tmp/Aminy-Final-audit-main/e2e-reports/DESIGN-AUDIT-REPORT.md`
- `/private/tmp/Aminy-Final-audit-main/e2e-reports/full-design-audit.json`

Audit result summary:
- Screens audited: `25`
- Overall score: `97/100`
- Total issues: `38`
- Critical issues: `0`

This report groups the remaining issues by product area and converts them into implementation guidance.

## Cross-App Patterns

### Visual issues
- Too many button color treatments are still visible on several screens.
- Some operator screens still look more like utilities than premium product surfaces.
- Heading hierarchy is still inconsistent on multiple screens, usually because a visible section jumps from `h1` or `h2` to `h4`.

### Interaction issues
- A few screens still do not present a clear primary next action.
- Some flows rely on secondary links or card clicks when a direct action button would be calmer and clearer.

### Trust issues
- Most trust gaps are now fixed, but a few ops screens still feel “internal” instead of “family-safe” or “operator-grade.”
- Some supported-state or operator constraints are visible in copy, but the action priority on those screens can still be clearer.

### Mobile issues
- The main mobile issues are not catastrophic layout breaks; they are mostly clarity and action hierarchy issues.
- Operator screens still need stronger mobile action grouping and more obvious primary actions.

### Exact fixes
- Standardize high-visibility actions onto `primary`, `secondary`, and `destructive` only.
- Clean remaining heading jumps on audited screens.
- Add one unmistakable primary CTA on every screen where the audit still flags it.

## Marketing / Splash / Auth

Screens:
- Splash / Landing
- Login
- Create Account
- Forgot Password

### Visual issues
- Splash still reads more like a polished landing page than a fully anchored product homepage.
- Forgot Password is visually clean but still sparse enough that it can feel like a detached utility view.

### Interaction issues
- Splash still lacks a clearly dominant CTA according to the audit heuristic.
- Login and Create Account still technically trip the “primary CTA” heuristic even though the flows are usable.
- Forgot Password lacks a visible navigation anchor back into the broader auth flow.

### Trust issues
- Low risk here now. The main issue is orientation, not truthfulness.

### Mobile issues
- Auth surfaces are generally strong on mobile already.
- Splash still benefits from a clearer “start here” hierarchy above the fold on smaller screens.

### Exact fixes
- Add an explicit top-level nav or utility nav to the splash hero.
- Make the primary hero CTA visually dominant enough to satisfy both people and audit heuristics.
- Add a clearer “Back to sign in” or equivalent nav affordance to Forgot Password.

## Onboarding / Child Profile / Companion Entry

Screens:
- Onboarding
- Dashboard entry states
- Profile child-management surfaces

### Visual issues
- Profile still has some mixed visual emphasis between edit controls, child cards, and account sections.

### Interaction issues
- Profile would benefit from a more obvious “edit/save/add child” action hierarchy.

### Trust issues
- Child profile truth is materially better now because of the real backend workflow.
- This area is strong enough functionally; remaining issues are polish and hierarchy.

### Mobile issues
- Child cards and profile controls should keep large hit areas and avoid crowding edit actions around dense metadata blocks.

### Exact fixes
- Reduce button color variance in Profile.
- Fix heading hierarchy in Profile.
- Make child-management actions more clearly grouped by intent.

## Dashboard / AI / Weekly Insights

Screens:
- Dashboard
- Weekly Insights
- Messages / AI entry
- Outcomes / Care Plan / Community related core screens

### Visual issues
- Dashboard and adjacent core screens still show too many button treatments.
- Heading hierarchy still skips on some sections, which makes the page feel less intentional than it should.

### Interaction issues
- Core caregiver flow is strong, but some cards still compete visually with the main next step.

### Trust issues
- Trust is much stronger now because sync-state and backend-authoritative workflow data are in place.
- The remaining trust issue is visual coherence: premium calm surfaces should feel quieter and more decisive.

### Mobile issues
- Main dashboard is usable on mobile, but tighter action prioritization would reduce scan fatigue.

### Exact fixes
- Standardize button treatments on Dashboard, Messages, Outcomes, Care Plan, and Community.
- Fix heading jumps on Dashboard and related core screens.
- Keep the caregiver next step, plan completion, and AI prompt actions visually dominant over lower-priority cards.

## Telehealth Browse / Booking / Confirmation / Join

Screens:
- Telehealth Home
- Provider Marketplace
- Book Visit
- Appointment Confirmation
- Join / waiting-room / video handoff surfaces

### Visual issues
- Telehealth Home is now strong and scored `100/100`.
- Provider Marketplace still shows color-treatment drift.
- Booking and confirmation are cleaner than before, but they still need one last premium pass to fully match the One Medical / Calm bar.

### Interaction issues
- Booking and confirmation need the last clarity pass on:
  - booking choices
  - payment expectations
  - reschedule/cancel/no-show explanation
  - room join readiness

### Trust issues
- Supported-state filtering and real provider-state gating are materially better now.
- The remaining trust work is around operational clarity, not fake availability.

### Mobile issues
- Booking flow must keep large taps for slot selection, pricing confirmation, and join flow.
- Confirmation needs a stronger “what happens next” summary on narrow screens.

### Exact fixes
- Keep provider cards and slot rows simpler on mobile.
- Add a clearer booking summary block before payment redirect.
- Make room-join state and reminder state more visible in confirmation and appointment views.
- Reduce color variance in Marketplace.
- Fix heading hierarchy in Marketplace.

## Coverage Coach / Payer / Claims

Screens:
- Benefits Navigator
- Claims Dashboard
- Payer Outcomes Dashboard

### Visual issues
- Benefits Navigator is strong and scored `100/100`.
- Claims and Payer screens are structurally much better, but they still need operator-grade calmness and more obvious primary actions.

### Interaction issues
- Claims Dashboard still lacks a clearer primary operator action according to the audit.
- Payer Dashboard is close, but its hierarchy can still be simplified.

### Trust issues
- These screens are now substantially more truthful.
- Remaining issue is not truth, but “ops confidence”: they should look like mature workflows, not strong prototypes.

### Mobile issues
- Claims and payer views need stronger grouping of filters, queue states, and next actions on narrow widths.

### Exact fixes
- Add a clearer primary CTA to Claims Dashboard.
- Fix heading hierarchy in Claims and Payer Dashboard.
- Reduce color variance in payer-adjacent cards and summary metrics where possible.

## Junior / Calm Corner / Rewards / Transition Support

Screens:
- Junior Mode
- Calm Corner child flow
- Rewards surfaces
- Visual schedule / transition support

### Visual issues
- Junior Mode is visually strong and scored `99/100`.
- It still carries some legacy “practice app” DNA that is no longer central to the product direction.

### Interaction issues
- The home is already pointing in the right direction, but the narrowed product story should be even more explicit:
  - Calm now
  - Reward progress
  - Transition support
  - optional practice only if helpful

### Trust issues
- Low risk here.
- The main product risk is strategic drift: if Junior keeps trying to be a broad child-learning surface, it weakens the product.

### Mobile issues
- Junior is naturally mobile-first and should remain that way.
- Calm Corner interactions should remain one-tap, low-reading, and immediate.

### Exact fixes
- Keep the current narrowed direction and finish the in-product transition to:
  - Calm Corner
  - Rewards
  - Transitions
- Keep optional practice de-emphasized.
- Revisit the user-facing name later; do not rename until the narrowed product shape is fully settled.

## Provider Portal / Provider Onboarding

Screens:
- Provider Portal
- Provider Onboarding

### Visual issues
- Provider Portal still shows color variance and heading inconsistency.
- Provider Onboarding is strong, but its primary action could be more explicit.

### Interaction issues
- Provider Portal now feels operator-usable, but it still needs cleaner action hierarchy in denser sections.
- Provider Onboarding should make the next step more visually dominant.

### Trust issues
- Much better than before because operator-grade rails are persisted now.
- Remaining issue is premium clarity, not core truth.

### Mobile issues
- Dense provider data needs clearer separation between “summary,” “queue,” and “next action” blocks.

### Exact fixes
- Reduce button-color variance in Provider Portal.
- Fix heading hierarchy in Provider Portal.
- Add a clearer primary CTA to Provider Onboarding.

## EVV / Caregiver Timesheet

Screens:
- EVV Dashboard
- Caregiver Timesheet

### Visual issues
- EVV is close, but still a little too dashboard-like in places.
- Caregiver Timesheet still shows button-color variance and heading skips.

### Interaction issues
- EVV Dashboard still needs a stronger primary action in the audit’s eyes.
- Timesheet flow should keep the next step obvious, especially for stressed caregivers.

### Trust issues
- These surfaces are much more truthful now, but they are still not cutover-proven.
- They should keep speaking clearly about shadow / parallel-run posture until operational proof exists.

### Mobile issues
- These flows need to remain exceptionally clear on mobile because the likely real use case is mobile-first.

### Exact fixes
- Add a clearer primary CTA to EVV Dashboard.
- Reduce color variance in Caregiver Timesheet.
- Fix heading hierarchy in Caregiver Timesheet.

## CentralReach / Operator Workflow

Screens:
- CentralReach Sync Dashboard

### Visual issues
- This screen is much stronger than before and now scores `98/100`.
- Remaining issue is mostly hierarchy and action clarity.

### Interaction issues
- It still wants a more obvious primary action.
- Retry, reconciliation, and export actions should feel more unified.

### Trust issues
- Good direction now.
- Still strategically a `pull + export + reconciliation` product, not full two-way write-back.

### Mobile issues
- Sync and reconciliation actions need strong primary/secondary grouping on smaller widths.

### Exact fixes
- Add a clearer primary CTA on the main CentralReach Sync screen.
- Fix heading hierarchy where the audit still flags it.

## Paywall / Pricing / Billing

Screens:
- Paywall
- Billing-adjacent settings and payment follow-up flows

### Visual issues
- Paywall is much more truthful than before, but still has color-treatment drift.

### Interaction issues
- Main pricing path is now clearer, but plan cards should remain tighter and simpler than the rest of the app.

### Trust issues
- Trust is much stronger because fake social proof is gone.
- Remaining work is polish and conversion clarity, not truth repair.

### Mobile issues
- Plan comparison and upgrade actions need strong spacing and reduced visual clutter on narrow screens.

### Exact fixes
- Reduce color variance in the paywall surface.
- Fix heading hierarchy on Paywall.
- Keep the primary conversion CTA visually dominant over plan-detail content.

## Highest-Signal Remaining Fixes

1. Standardize button treatments on the remaining offender screens:
   - Dashboard
   - Settings
   - Profile
   - Marketplace
   - Paywall
   - Outcomes
   - Care Plan
   - Community
   - Provider Portal
   - Caregiver Timesheet

2. Fix heading hierarchy on the recurring screens flagged by the audit:
   - Dashboard
   - Settings
   - Profile
   - Marketplace
   - Paywall
   - Claims
   - Payer
   - Caregiver Timesheet
   - CentralReach Sync
   - Provider Portal
   - Junior

3. Add clearer primary CTAs where still missing:
   - Splash
   - Forgot Password
   - Crisis Resources
   - Claims Dashboard
   - EVV Dashboard
   - CentralReach Sync
   - Provider Onboarding

## Score Impact

Current local UI audit:
- `97/100`

If the remaining color, heading, and CTA issues are cleaned up well:
- projected UI audit score: `98 to 99/100`

Expected product-score effect:
- local worktree overall: `+0.1 to +0.2`
- Arizona operating story: `+0.1`
- national readiness: `+0.1`

This is enough to tighten the experience meaningfully, but not enough by itself to honestly claim `9+` across the entire product. The remaining gap after this report is mostly operational proof and the last product-shape cleanup around Junior.
