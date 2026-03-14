# Aminy Local Worktree Audit

Date: 2026-03-10
Source of truth commit: `3f0c8e7356b3bf7fad46f8bc83984ee483fd0850`
Audit target: local unpushed worktree built from latest GitHub `main`
Location: `/private/tmp/Aminy-Final-audit-main`

## Executive Verdict

The local worktree is materially stronger than public GitHub `main`, but it is still not a 9+/10 Arizona operating story and not ready to be described as nationally mature across all rails.

My current score for the local worktree is **7.2/10 overall**.

That is a real improvement from the earlier local state because:
- product truth is better
- telehealth pricing and booking economics are more coherent
- supported-state payer coverage is broader and no longer structurally Arizona-only
- EVV cutover readiness is modeled explicitly instead of implied
- the provider-network story now matches the independent-practice strategy more closely
- the operator and payer surfaces are less misleading

It is still not a 9+ system because too much of the operational depth remains modeled rather than proven in live workflows.

## Validation Run

Commands run successfully on the local worktree:
- `npm run typecheck`
- `npm run lint`
- `npm run test:run`
- `VITE_USE_MOCK_DATA=false npm run build:prod-safe`

Playwright validation:
- `npm run test:e2e:caregiver -- --workers=1`
  - result: `2 passed`
- `npm run test:e2e:caregiver:backend -- --workers=1`
  - result: `1 skipped`
  - blocker: missing real Supabase proof credentials in the environment

Build still emits warnings, not failures:
- duplicate `DTM` case in `src/lib/clearinghouse-integration.ts:1496`
- CSS minify warning
- large chunks and dynamic/static import overlap warnings

## Updated Scorecard

| Dimension | Public Main | Local Before | Local Now | Brutal Read |
|---|---:|---:|---:|---|
| Product / UI / UX | 5.3 overall baseline | 6.5 | **8.0** | The app feels more honest and more intentional. Consumer and provider surfaces are less confused. |
| Core feature reality | 4.5 | 6.8 | **7.0** | More of the core model is wired through real types and visible states, but several advanced rails are still modeled rather than operationally proven. |
| AI chat / memory | 6.0 | 7.0 | **7.1** | Still strong directionally, but not yet deeply differentiated on autism-specific retrieval, citations, or provider-grade summarization proof. |
| Reports / caregiver analytics | 4.0 | 6.8 | **7.0** | Summary/report truth is stronger, but payer- and provider-grade reporting still needs production usage proof. |
| Telehealth / marketplace | 5.0 | 5.8 | **7.1** | Better rail clarity, supported-state positioning, and pricing truth. Still not fully hardened operationally. |
| Insurance / billing / claims / credentialing | 3.5 | 4.5 | **5.9** | The supported-state payer matrix and claim-ready queue are a real upgrade, but not yet a live, trusted multi-payer operating rail. |
| Monetization / pricing / paywall | 6.0 | 6.8 | **7.8** | Canonical economics and clearer cash-pay / partner-billed structure materially improve this area. |
| B2B / clinic / CentralReach | 3.0 | 5.2 | **6.3** | The thesis is clearer and better documented, but still not yet proven in live clinic operations. |
| B2G / EVV / fiscal-agent | 3.0 | 5.0 | **6.0** | EVV cutover readiness is now explicit and testable as a model. It is still not operationally proven enough for 9+. |
| Technical credibility | 5.0 | 7.0 | **7.3** | Core checks are green. Remaining build warnings and skipped backend proof keep this below the top tier. |
| Strategy / moat / acquirer readiness | 5.0 | 6.8 | **8.0** | The AI + family + telehealth + provider bridge story is more coherent. The acquirer thesis is stronger, but still needs live partner proof. |

## What Improved In This Tranche

### 1. Provider-network strategy now matches the actual product thesis
The code no longer forces the provider portal, provider onboarding, provider analytics, and provider identity verification into an AACT/Rise-only Arizona clinic gate.

Those surfaces are now aligned to the supported-state provider-network strategy:
- `AZ`
- `MT`
- `TX`

That matters because your stated thesis includes independent BCBAs and adjacent providers using Aminy as practice-in-a-box. The previous gating contradicted that thesis.

### 2. Telehealth economics are closer to one real system
The live booking model is more coherent because:
- the canonical telehealth economics layer exists
- appointment data now stores the cash-pay rail and appointment financials in the mock path rather than dropping to `price: 0`
- booking and consent copy now matches the cancellation terms more closely

This improves the credibility of:
- cash-pay direct through Aminy
- provider payout logic
- AACT white-label cash-pay positioning

### 3. Payer rails are broader than a two-plan Arizona story
The claims and payer model is no longer structurally tied only to `BCBA of AZ` and `MercyCare`.

The current supported-state payer matrix covers the top payer products for:
- Arizona
- Montana
- Texas

That is still not a mature live payer network. But it is the right architecture for supported-state coverage rather than an Arizona-only dead end.

### 4. EVV cutover readiness is now explicit
The EVV model now has an explicit cutover-readiness state machine and reconciliation summary instead of vague “shadow mode” storytelling.

That is a meaningful improvement for operator trust because the app can now say:
- shadow
- parallel run
- cutover ready
- primary

instead of implying readiness without the actual gate.

### 5. The provider portal is more useful as a practice-building surface
The provider portal now better reflects:
- supported-state market coverage
- claim-ready queue readiness
- accepted rails
- independent versus partner-clinic posture

This moves the provider story closer to the stated goal: Aminy as the front door and operating layer for providers building a telehealth practice.

## What Is Still Not Good Enough

### 1. Arizona is still not honestly 9+
It is improved, but not there.

Why not:
- real-backend proof is still skipped in this environment
- CentralReach workflow is still more architecture and positioning than live operator proof
- EVV is still modeled cutover readiness, not validated cutover proof
- claims rails are still claim-ready queue and coverage architecture, not multi-payer production operations

My honest Arizona-scoped score right now is closer to **8.0-8.2** than **8.9-9.1**.

### 2. National readiness is still not where the final plan aims
The current national story is strongest in:
- AI companion readiness
- supported-state cash-pay telehealth framing
- provider-network structure

It is weaker in:
- insured operations at scale
- credentialing and payer lane depth
- actual provider supply hardening
- national operator workflow readiness

My honest national-readiness score right now is closer to **7.7-7.9** overall, not **8.3-8.6** yet.

### 3. The backend proof gap remains
The real-backend Playwright proof is still skipped because the required credentials are not present in this environment.

That means I cannot honestly claim:
- full real persistence proof for the latest work
- production-grade operator truth across the care workflow

### 4. Build quality still has obvious debt
The app builds, but there are still clear quality issues:
- duplicate parser case warning
- CSS minify warning
- oversized main chunks
- dynamic/static import overlap warnings

Those are not release-blocking in isolation, but they are part of why this is not a 9+ engineering state.

## Specific Strategic Read

### Does this solve CentralReach’s HIPAA telehealth gap?
Partially at the product-theory level, not fully at operational maturity yet.

The code and architecture now make a stronger case that Aminy should own:
- consumer-friendly booking
- cash-pay checkout
- reminders and join flow
- family-facing telehealth UX
- AI/family engagement before and after visits

That is a real gap-filling thesis for CentralReach.

But Aminy does **not** yet have enough live operational proof to claim it completely solves that gap today.

### Is the AI layer for CentralReach still hugely important?
Yes.

That remains one of the strongest strategic wedges in the entire product:
- family-facing AI companion
- between-session memory and summarization
- provider-facing signal loop
- coverage and routing intelligence
- Junior / Calm Corner intelligence over time

If the acquisition thesis is CentralReach, the AI + family + engagement layer is at least as important as telehealth, and probably more important long-term.

### Does the provider network story now make more sense?
Yes.

The product is now more aligned with the thesis that independent providers can:
- join Aminy
- publish availability
- choose rails
- build a practice
- keep the family relationship inside Aminy

It is still not full “soup to nuts” practice ops. But the direction is now coherent instead of strategically contradictory.

## What I Would Still Change

### 1. Finish the real backend proof before pushing this as a big milestone
The current state is better, but still not honest enough for a “we nailed it” push.

### 2. Harden telehealth operations as a real state machine
You still need one reliable, end-to-end lifecycle for:
- booking
- payment
- confirmation
- reminders
- room join
- completion
- payout
- cancellation / no-show / refund

### 3. Optimize the CentralReach lane as operator workflow, not just integration ambition
Keep the v1 posture as:
- pull
- export
- reconciliation
- explicit sync state

Do not over-invest in broad bidirectional write-back until live operator use justifies it.

### 4. Move EVV from modeled readiness to real cutover proof
The current EVV work is finally shaped like an operator product, but it still is not a proven system-of-record replacement.

### 5. Keep Junior’s Calm Corner as a first-class retention wedge
This audit tranche improved the commercial and operator story more than the child-facing emotional wedge. The sensory regulation track is still a real opportunity, not a finished strength.

## Brutal Bottom Line

The current local worktree is the strongest Aminy has been in this conversation.

It is:
- more coherent
- more truthful
- more investable
- more aligned with the AACT / Rise / CentralReach thesis

It is **not** yet:
- a 9+ Arizona operating product
- a 9+ national readiness story
- honest-to-push as “done” if the claim is that the big readiness plan has been fully achieved

## Push Recommendation

**Do not push yet if the claim is “we achieved the 9+ Arizona state.”**

**Reasonable to push as a major progress branch once one of these is true:**
- the real-backend proof run is passing with credentials present
- the next telehealth ops / payer / EVV tranche is completed
- or you want an intermediate checkpoint on GitHub with clear release notes and no pretense that the full target is reached
