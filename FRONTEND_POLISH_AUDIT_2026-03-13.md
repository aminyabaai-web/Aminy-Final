# Aminy Frontend Polish Audit

Generated: 2026-03-13  
Scope: local worktree at `/tmp/Aminy-Final-audit-main`

## Summary

The product is materially calmer, more coherent, and more trustworthy than the original audit baseline. The remaining front-end gap is no longer broad product direction. It is shell quality, high-traffic screen consistency, and a small amount of lingering workflow polish.

Current honest score after the latest validation pass:

- Local worktree: `8.7-8.8/10`
- Arizona operating story: `8.9/10`
- National readiness: `8.5-8.6/10`

Expected score delta from the remaining front-end fixes in this document:

- Local worktree: `+0.2 to +0.3`
- Arizona operating story: `+0.1 to +0.2`
- National readiness: `+0.1 to +0.2`

That means frontend polish alone can likely push the local worktree to roughly `8.9-9.0`, but not honestly beyond that without more operational proof on EVV, payer rails, and clinic usage.

## Screen Groups

### 1. Marketing / Splash / Auth

Status:
- Strong
- Calm visual direction is now credible
- Primary CTAs are clear

Visual issues:
- Minor opportunity to tighten headline widths and form spacing rhythm between splash, login, and create-account

Interaction issues:
- Minimal

Trust issues:
- Minimal

Mobile issues:
- Generally strong

Exact fixes:
- Keep one brand lockup treatment across splash, login, create account, and forgot password
- Tighten top spacing and reduce duplicate helper copy on auth surfaces

Expected score delta:
- `+0.0 to +0.05`

### 2. Onboarding / Child Profile / Companion Entry

Status:
- Strong
- Flow is calmer and more linear than before

Visual issues:
- Could use tighter hierarchy between question prompt, answer area, and progress/state

Interaction issues:
- Some waiting states still feel generic

Trust issues:
- Good overall

Mobile issues:
- Fine, but still worth one dedicated spacing pass on small screens

Exact fixes:
- Standardize prompt headers and button placement
- Improve loading / thinking transitions so they feel more intentional and less default

Expected score delta:
- `+0.05`

### 3. Dashboard / AI / Weekly Insights

Status:
- Strong
- Much calmer than before
- Main shell quality is materially improved

Visual issues:
- Dashboard still has more button/accent variety than necessary
- Heading hierarchy still skips on some screens

Interaction issues:
- Floating AI/chat surfaces can still compete with task cards if not carefully collapsed

Trust issues:
- Good overall; improved significantly

Mobile issues:
- Better than before, but still worth one pass on card stacking and overflow

Exact fixes:
- Reduce dashboard buttons to a tighter primary/secondary/accent system
- Normalize heading levels across dashboard and weekly insights
- Keep the floating AI surface minimized by default after certain actions

Expected score delta:
- `+0.05 to +0.1`

### 4. Telehealth Browse / Booking / Confirmation / Join

Status:
- Improved
- Not fully premium yet

Visual issues:
- Booking flow still has room to feel more One Medical than “app form”
- Confirmation could be cleaner and more emotionally calming

Interaction issues:
- Reschedule / no-show / refund pathways need clearer in-flow explanation
- Join-room state still needs a final polish pass

Trust issues:
- Better, but commercial/legal clarity should stay visually obvious during booking

Mobile issues:
- High priority for final pass

Exact fixes:
- Tighten provider card hierarchy
- Simplify slot selection visual density
- Add clearer “what happens next” block on confirmation
- Make cancel/refund/no-show terms visible but calmer
- Make join-room state feel more like an appointment room and less like a generic video screen

Expected score delta:
- `+0.1 to +0.15`

### 5. Coverage Coach / Payer / Claims

Status:
- Structurally much stronger
- Screen quality is better, but not yet premium operator-grade everywhere

Visual issues:
- Some button/accent inconsistency remains
- Heading hierarchy issue remains on claims and payer screens

Interaction issues:
- Claim queue and coverage routing are clearer than before, but still read like internal tooling in places

Trust issues:
- Stronger than before
- Needs continued live-data discipline

Mobile issues:
- Operator-heavy screens still need a small-screen interpretation check

Exact fixes:
- Normalize headings and subheads
- Tighten tab and queue row emphasis
- Use one primary CTA per screen rather than multiple equal-weight controls

Expected score delta:
- `+0.05 to +0.1`

### 6. Junior / Calm Corner

Status:
- Direction is now correct
- Not fully implemented as the narrowed product yet

Visual issues:
- Calm Corner needs more premium tactile/sensory feel
- Some of the old “Junior” visual inheritance is still present

Interaction issues:
- Child-facing actions are better, but the narrowed product is not fully carried through every surface

Trust issues:
- Improved
- Parent-facing value proposition is clearer

Mobile issues:
- Child mode must be treated as mobile-first

Exact fixes:
- Keep the product narrowed to:
  - Calm Corner
  - Rewards
  - Transition support
- Remove remaining high-visibility cues that imply broad educational ambitions
- Add 3-5 elite tactile regulation tools before expanding further

Expected score delta:
- `+0.1`

### 7. Provider Portal / Provider Onboarding

Status:
- Stronger
- More credible as a practice-building/operator surface

Visual issues:
- Portal still has more color/button variety than ideal

Interaction issues:
- Good overall

Trust issues:
- Better

Mobile issues:
- Provider portal remains desktop-first in feel; acceptable, but still worth checking

Exact fixes:
- Normalize action hierarchy
- Keep partner / supported-state context visible without clutter

Expected score delta:
- `+0.05`

### 8. EVV / Caregiver Timesheet

Status:
- Stronger structurally than visually

Visual issues:
- Caregiver timesheet still shows the multi-color inconsistency pattern

Interaction issues:
- Workflow is more serious, but still needs a cleaner primary action rhythm

Trust issues:
- Improved significantly because the shadow/system-of-record framing is honest

Mobile issues:
- Important because this surface is real-world mobile-first usage

Exact fixes:
- Simplify top-level actions
- Make clock-in/out, export, and discrepancy review the clear priority
- Reduce ornamental styling in favor of calm task clarity

Expected score delta:
- `+0.05 to +0.1`

### 9. CentralReach / Operator Workflow

Status:
- Stronger
- Now operator-usable
- Still not visually as polished as the caregiver core

Visual issues:
- Dense information hierarchy still needs final tightening

Interaction issues:
- Sync retry and reconciliation states are good, but can feel more guided

Trust issues:
- Good and improving

Mobile issues:
- Primarily desktop, but still needs responsive sanity checks

Exact fixes:
- Strengthen queue hierarchy
- Make the primary “review / retry / reconcile” action more visually obvious
- Reduce competing status treatments

Expected score delta:
- `+0.05`

### 10. Paywall / Pricing / Billing

Status:
- Much more truthful than the original version

Visual issues:
- Still part of the multi-color inconsistency cluster

Interaction issues:
- Good overall

Trust issues:
- Strongly improved because fake proof has been removed

Mobile issues:
- Worth one more small-screen review on plan comparison density

Exact fixes:
- Keep one dominant upgrade CTA
- Reduce visual competition between plan cards
- Maintain simple, honest value framing

Expected score delta:
- `+0.05`

## Highest-Leverage Remaining UI Fixes

1. Standardize button/accent color usage on the remaining `95/100` screens.
2. Normalize heading hierarchy on the screens still flagged for skipped heading levels.
3. Finish the telehealth booking / confirmation / join pass.
4. Finish the child-facing narrowing of Junior into Calm Corner + Rewards + Transition.
5. Keep the shell calm and premium; do not reintroduce module-style admin clutter.

## Recommendation

The next polish pass should focus on:

1. Telehealth booking / confirmation / join
2. Color + heading cleanup on the remaining 95/100 screens
3. Junior narrowing and calm-corner premium feel

That is the fastest honest path from the current `8.7-8.8` local state to a defensible `8.9-9.0` local frontend/product state.
