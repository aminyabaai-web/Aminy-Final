# Local Worktree Audit Update — March 11, 2026

## Executive Verdict

The local worktree is materially stronger than public GitHub `main`, and the biggest credibility gap is now closed: the caregiver core backend proof passes against the real Supabase project.

This is still not a 9+/10 product across the board.

Current honest score:
- Public GitHub `main`: **5.3/10**
- Local worktree before Supabase proof repair: **7.2/10**
- Local worktree after Supabase proof repair: **7.6/10**
- Arizona operating story: **8.3-8.5/10**
- National readiness: **8.0-8.2/10**

## What Changed

### Biggest closed gap
The real-backend caregiver proof now passes end to end.

Validated:
- authenticated onboarding persists child/profile data
- canonical AI conversation persistence works on the real backend
- memory facts persist
- daily plan snapshots persist
- Junior progress persists
- caregiver summary persists
- provider PDF path completes against stored records

### Supporting evidence
- `npm run test:e2e:caregiver:backend -- --workers=1` ✅
- `npm run test:e2e:caregiver -- --workers=1` ✅
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run test:run` ✅ (`329/329`)
- `VITE_USE_MOCK_DATA=false npm run build:prod-safe` ✅

## What Was Fixed In The Real Backend

The Supabase project was not aligned closely enough with the current app code. The proof originally failed before onboarding because auth user creation was broken.

### Root cause
The live project had an `on_auth_user_created` trigger that called `net.http_post(...)`, but `pg_net` was not installed. That made all auth user creation fail.

### Database repair applied
A repair migration was added locally and applied to the live project:
- `supabase/migrations/20260311110000_remote_backend_repair.sql`

That repair did three things:
1. made auth signup resilient even when `pg_net` is missing
2. aligned existing tables like `children`, `treatment_goals`, `conversations`, and `routine_completions` with current code expectations
3. created the missing canonical workflow tables used by the caregiver-core proof

## Current Scorecard

| Dimension | Score | Read |
|---|---:|---|
| Product / UI / UX | 8.2 | Better flow truth, still uneven in edge-case polish |
| Core feature reality | 8.0 | Caregiver core is now real enough to defend |
| AI chat / memory | 7.8 | Durable enough to trust more, still not differentiated enough for 9+ |
| Reports / caregiver analytics | 7.9 | Provider-ready path is much more credible |
| Telehealth / marketplace | 7.8 | Supported-state model is coherent, ops still need hardening |
| Insurance / billing / claims / credentialing | 7.0 | Better architecture and claim-ready path, still not live-broad enough |
| Monetization / pricing / paywall | 8.1 | Clearer economics, still needs more production conversion proof |
| B2B / clinic / CentralReach | 7.7 | Stronger operator story, still more scoped than proven |
| B2G / EVV / fiscal-agent | 7.1 | More serious, but not cutover-proven |
| Technical credibility | 8.0 | Core gates and proof are green; build warnings still remain |
| Strategy / moat / acquirer readiness | 8.2 | Much better wedge, especially if framed as AI/family/telehealth layer |

## Why It Is Still Not 9+

### 1. EVV is modeled, not cutover-proven
The product now looks serious for EVV, but it is still not the system-of-record replacement yet. It has to survive real reconciliation cycles against SpokChoice and DCI.

### 2. Payer rails are broader in architecture than in operations
The product is no longer structurally locked to only BCBA of AZ and MercyCare, but it is not yet honest to call the insured lane broadly production-grade across the majority of plans in each live state.

### 3. Telehealth ops still need deeper hardening
The product has the right booking and financial model, but still needs more operational proof around reschedules, no-shows, settlement, and room reliability.

### 4. CentralReach workflow is not yet real operator proof
The operator story is stronger, but it is still closer to a very strong integration plan than fully proven daily clinic usage.

### 5. Build-quality backlog remains
The build passes, but still emits non-trivial warnings:
- duplicate `DTM` case in `src/lib/clearinghouse-integration.ts`
- CSS minify warning
- large chunks
- mixed dynamic/static import chunking warnings

## Strategic Read

This worktree is now in the range where the acquisition story is more coherent:
- Aminy as the family-facing AI layer
- Aminy as the telehealth experience layer CentralReach lacks
- Aminy as the between-session engagement and summary layer
- Aminy as the eventual operator/EVV/payer expansion layer

That is materially better than the earlier “ambitious but too broad” position.

## Bottom Line

The biggest truth gap is now closed.
The local worktree has reached the rough score that was projected for this tranche.
It has **not** reached a defendable Arizona 9+ state yet.
It is substantially closer.
