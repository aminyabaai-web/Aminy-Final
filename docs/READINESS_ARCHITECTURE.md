# Aminy Readiness Architecture

_Last updated: 2026-03-10_

## Why this file exists
This document preserves the ideal-state architecture while the product is shipped in sequenced launch tranches.

The build is intentionally split into two score lenses:
- Arizona operational excellence: near-9+ target
- National readiness: broad B2C and supported-state telehealth/coverage readiness

The goal is to avoid losing the long-term product shape while we ship the highest-leverage commercial and operational slices first.

## Strategic North Star
Aminy should become the family-facing intelligence and care-delivery layer that complements, rather than replaces, operator systems such as CentralReach.

The acquisition thesis is:
- CentralReach owns core clinic operations and documentation
- Aminy owns the family relationship, telehealth UX, caregiver AI, coverage navigation, and between-session engagement
- Together, they close the gap between clinic operations and family behavior in the real world

## Core product pillars
1. Caregiver Companion
2. Coverage Coach + Telehealth
3. Clinic / B2B2C / EVV / Claims
4. Junior: Learn + Calm Corner + Carry Over

## Launch-state model
Every major surface must declare:
- launch state
- audience scope
- data provenance
- system of record

Canonical contracts:
- `LaunchState = hidden | internal | pilot | limited_launch | live`
- `CareRail = cash_pay_direct | insured_partner_billed | insured_aminy_billed`
- `SyncStatus = synced | pending_sync | local_only | sync_failed`
- `DataProvenance = live | sample | local`
- `SystemOfRecord = external | aminy_shadow | aminy_primary`
- `EVVCutoverState = shadow | parallel_run | cutover_ready | primary`

## Market and payer shape
Live provider states in the current readiness program:
- Arizona
- Montana
- Texas

Definition of majority health-plan support:
- Coverage Coach and claim-ready workflows must support payer products covering at least 80% of target addressable volume in each live provider state
- Arizona remains the first depth market
- The app must not be structurally locked to Arizona-only payer logic

## Telehealth operating model
Family-facing rails:
- `cash_pay_direct`: Aminy merchant of record
- `insured_partner_billed`: Aminy owns the front-end, partner bills payer
- `insured_aminy_billed`: future state

Canonical white-label menu for AACT cash-pay day 1:
- Quick Consult, 25-30 min: $79
- Standard Session, 50-60 min: $149
- Diagnostic / Deep Review, 75-90 min: $229

Partner economics for insured visits:
- consult-class: $18 per completed visit
- standard session: $32 per completed visit
- diagnostic/eval: $55 per completed visit

Claims ops fees:
- prior-auth packet: $45
- claim-ready validated visit: $12
- clearinghouse submission + status tracking: $6
- denial rework packet: $20

Commercial rule:
- partner pays Aminy monthly, Net 15 ACH/autopay
- Aminy does not wait on payer reimbursement
- equity/investment stays outside the services deal

## Operator workflow
AACT is the first live clinic/operator lane.
Rise is the second validation environment.

CentralReach v1 is:
- roster pull
- goals / home-program pull
- insurance/auth context pull where available
- caregiver summary / provider packet export
- sync state and reconciliation visibility

CentralReach v1 is not:
- broad bidirectional write-back
- a replacement telehealth experience
- the family-facing AI or caregiver engagement layer

## EVV and paid caregiver path
EVV sequencing:
- shadow
- parallel run
- cutover ready
- primary

Initial system posture:
- SpokChoice current system of record
- DCI transition target
- Aminy captures shifts, evidence, and exports while reconciliation is proven

Cutover gate:
- three consecutive clean payroll cycles
- at least 99.5% reconciliation accuracy
- no unresolved critical exceptions

Commercial posture:
- sponsor-paid by partner org
- no direct family EVV charge at launch

## Junior ideal state
Junior is not only a learning app.
It is a three-lane child product:
- Learn
- Calm Corner
- Carry Over

Calm Corner requirements:
- one-tap regulation
- tactile delight
- instant soothing interaction
- haptics polish
- sensory profile personalization
- caregiver/provider-linked insight on what worked

Aminy Junior should try to win in two ways at once:
- stronger context and carryover than pure sensory apps
- increasingly competitive sensory delight and polish for the actual calming moment

## Legal and liability boundaries
Provider / clinic remains responsible for:
- care decisions
- outcomes
- medical necessity
- coding choices
- payer compliance
- final billing attestation

Aminy remains responsible for:
- platform security/privacy
- accurate processing of contracted workflow functions
- payment / payout / settlement logic it owns
- telehealth UX and white-label experience as contracted

Aminy must explicitly disclaim:
- practicing medicine
- guaranteeing outcomes
- guaranteeing reimbursement

## Score lens targets
This architecture is designed to support:
- Arizona operational story: ~8.9-9.1
- national readiness overall: ~8.3-8.6
- national B2C AI companion readiness: ~8.9-9.2
- national B2C cash-pay telehealth readiness in live-provider states: ~8.7-9.0

These numbers assume real operational proof, not just polished UI.

## AI layer and acquisition wedge
Aminy should not position AI as a generic assistant bolted onto clinic software.
It should be the family-facing intelligence layer that CentralReach does not currently own:
- caregiver companion intelligence
- coverage and telehealth routing intelligence
- provider-ready summarization and between-session signal
- Junior learning and Calm Corner regulation intelligence

If CentralReach is a likely acquirer, the moat is not just telehealth.
The moat is:
- the family relationship
- the AI memory and summarization layer
- the caregiver-to-provider signal loop
- the ability to turn family activity into operator-usable context without forcing clinics to build a consumer product themselves

## Independent provider network thesis
Aminy should support independent BCBAs and adjacent specialists who want to launch a telehealth practice from home.
That means the provider product must operate as a practice-in-a-box system:
- publish availability
- choose cash-pay and insured rails
- manage branded presence and booking
- receive payouts and settlement visibility
- keep families inside Aminy before, during, and after visits

This network matters strategically because it:
- grows B2C supply without waiting on enterprise partnerships
- increases coverage and telehealth access in waitlist-heavy markets
- gives Aminy a direct provider network path that is not fully dependent on partner clinics
- creates additional acquisition value as a supply layer CentralReach does not control today
