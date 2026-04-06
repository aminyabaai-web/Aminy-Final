# Aminy LLC — Provisional Patent Claims (DRAFT)
## CONFIDENTIAL — ATTORNEY-CLIENT WORK PRODUCT
## Prepared: 2026-04-06

---

## IMPORTANT NOTICE

This document outlines potential patent claims for discussion with patent counsel.
These are DRAFT claims and must be reviewed and refined by a registered patent
attorney before filing. File as provisional patent applications to establish
priority dates.

**URGENCY:** If `edgarstaren/Aminy-Final` repo was ever public, the 1-year
grace period (35 USC 102(b)(1)) is running. File provisionals ASAP.

---

## Patent Application 1: AI-Powered Behavioral Health Context System

**Title:** System and Method for Dynamic Multi-Layer Context Injection in
Behavioral Health AI Assistants

**Abstract:** A computer-implemented method for generating personalized AI
responses in behavioral health applications by dynamically constructing system
prompts from multiple heterogeneous data sources including child developmental
profiles, sensory assessments, longitudinal therapy activity data, standardized
screening results, extracted conversational memory facts with confidence scores,
treatment goals, and real-time parent emotional context.

**Key Claims:**
1. A method for generating a personalized AI system prompt comprising:
   extracting a child profile including age, diagnoses, and communication level;
   retrieving sensory profile data; aggregating therapy activity data from a
   child-facing application; incorporating standardized screening results;
   injecting memory facts extracted from prior conversations with associated
   confidence scores; and incorporating treatment goal progress data.

2. The method of claim 1, further comprising extracting memory facts from
   conversational text using pattern-based extraction with confidence scoring
   across typed categories including preferences, routines, triggers, successes,
   challenges, and milestones.

3. The method of claim 2, wherein memory facts are extracted using a dual-mode
   system comprising an AI-powered extraction mode and a pattern-based fallback
   mode operable without network connectivity.

4. A method for translating clinical behavioral health terminology into
   parent-friendly language comprising: receiving SOAP-format clinical notes;
   applying systematic terminology replacement rules; and generating a
   plain-language summary with actionable home-based activity recommendations.

**Prior Art Distinction:** Existing healthcare AI systems use static persona
prompts. This invention dynamically constructs context from 7+ heterogeneous
real-time data sources with longitudinal memory persistence.

---

## Patent Application 2: Multi-Factor Provider Matching & Care Pathway Routing

**Title:** System and Method for Behavioral Health Provider Matching with
Urgency-Aware Care Pathway Routing

**Abstract:** A computer-implemented system for matching families with behavioral
health providers using a multi-factor scoring algorithm and routing to optimal
care pathways based on simultaneous assessment of clinical urgency, insurance
status, and service modality preferences.

**Key Claims:**
1. A method for matching a user with a healthcare provider comprising: receiving
   a natural language search query; extracting one or more clinical intents from
   the query; determining an urgency score on a multi-level scale; selecting a
   care pathway rail from a plurality of rails including cash-telehealth,
   insured-in-network, insured-out-of-network-superbill, in-clinic-referral,
   and crisis-hotline; and scoring candidate providers using a multi-factor
   fit algorithm.

2. The method of claim 1, wherein the multi-factor fit algorithm comprises
   ten weighted factors: credential match, specialty match, age expertise with
   early intervention bonus, availability with near-term bonus, language match,
   insurance plan-specific compatibility, telehealth capability, rating with
   review count weighting, geographic proximity using Haversine distance, and
   cultural competency.

3. The method of claim 1, further comprising generating a payment path
   recommendation comparing estimated costs across care rails based on the
   user's insurance plan type and provider network status.

4. A method for generating a human-readable explanation of why a specific
   provider matches a user's needs based on the contributing factors of the
   fit score.

---

## Patent Application 3: Automated Clinical Note Generation with Billing Code Confidence

**Title:** System and Method for Automated Generation of Clinical Session Notes
with Confidence-Scored Billing Code Recommendations

**Abstract:** A computer-implemented method for generating structured clinical
session notes in SOAP format from session activity data, with automatic
recommendation of CPT billing codes scored by confidence level based on session
type, duration alignment, and clinical context.

**Key Claims:**
1. A method for generating a clinical session note comprising: receiving
   structured session data including activities, goal progress, and behavioral
   observations; generating a SOAP-format note; calculating session metrics
   including accuracy, engagement, and goal progress; and recommending one or
   more CPT billing codes with associated confidence scores.

2. The method of claim 1, wherein CPT code confidence scoring is based on:
   session type alignment with code category, duration alignment with code
   unit structure, and presence of qualifying clinical activities.

3. The method of claim 1, further comprising a workflow pipeline including:
   generating a draft note; enabling provider inline editing with tracked
   changes; translating the note to parent-friendly language; obtaining parent
   digital signature acknowledgment; and exporting in EHR-compatible format.

4. A method for validating clinical session notes for submission readiness
   comprising checking completeness of SOAP sections, presence of billing codes,
   and generating a readiness score.

---

## Patent Application 4: EVV Reconciliation with Predictive Clean Rate Analysis

**Title:** System and Method for Electronic Visit Verification Reconciliation
with GPS-Aided Matching and Predictive Clean Rate Analysis

**Abstract:** A computer-implemented method for reconciling electronic visit
verification records with billed sessions using GPS proximity matching,
temporal variance detection, and predictive clean rate analysis for proactive
denial prevention in Medicaid-funded behavioral health services.

**Key Claims:**
1. A method for reconciling EVV records comprising: comparing scheduled and
   actual visit times to detect temporal variance; verifying provider location
   using Haversine distance calculation between GPS check-in coordinates and
   expected service location; comparing billed units with actual service
   duration; and categorizing discrepancies by type and severity.

2. The method of claim 1, further comprising generating a clean cycle dashboard
   showing percentage of compliant records per billing period, historical trend
   analysis, and predictive readiness scoring for fiscal agent submission.

3. The method of claim 1, further comprising fiscal agent-specific validation
   rules where different fiscal agents (Acumen, DCI, PPL, Conduent) have
   distinct GPS proximity thresholds, unit matching requirements, and
   credential verification rules.

4. A method for generating submission proof for fiscal agent review comprising
   timestamp verification, record count certification, blocking issue
   resolution tracking, and integrity hash generation.

---

## Patent Application 5: Parent-Child Bidirectional Therapy Engagement System

**Title:** System and Method for Bidirectional Parent-Child Clinical Engagement
with Proactive Therapeutic Nudging

**Abstract:** A computer-implemented system comprising a child-facing therapeutic
activity application and a parent-facing clinical dashboard connected by a
bidirectional data bridge that enables parents to set clinical focus areas,
receive structured activity reports with emotion tracking, and receive proactive
alerts based on real-time pattern detection in child engagement data.

**Key Claims:**
1. A system for therapeutic engagement comprising: a child-facing application
   providing domain-specific therapeutic activities; a parent-facing interface
   for setting clinical focus areas with priority levels; and a bidirectional
   data bridge transmitting focus area settings to the child application and
   structured activity results including accuracy, prompt level, and emotional
   state to the parent interface.

2. The system of claim 1, further comprising a proactive alerting engine that
   detects patterns in child engagement data including: domain avoidance,
   accuracy decline, engagement reduction, sensory overload inference from
   session duration patterns, frustration patterns, mastery plateaus, and
   domain imbalance.

3. The system of claim 2, wherein sensory overload inference comprises
   analyzing session duration and accuracy decay patterns to estimate the
   child's effective attention window for each activity domain.

4. A method for generating personalized activity recommendations comprising
   analyzing treatment goal progress, identifying weak developmental domains,
   selecting domain-appropriate therapeutic activities, and generating
   parent-actionable home task suggestions.

---

## FILING PRIORITY

| Priority | Application | Estimated Cost | Deadline Risk |
|----------|------------|----------------|---------------|
| 1 | App 1 (AI Context) | $3-5K provisional | HIGH if repo was public |
| 2 | App 2 (Provider Match) | $3-5K provisional | HIGH if repo was public |
| 3 | App 5 (Parent-Child Bridge) | $3-5K provisional | HIGH if repo was public |
| 4 | App 3 (Note Gen + CPT) | $3-5K provisional | MEDIUM |
| 5 | App 4 (EVV Reconciliation) | $3-5K provisional | MEDIUM |

**Total estimated cost for 5 provisional filings: $15-25K**
**Full utility patent prosecution (if provisionals convert): $50-100K over 2-3 years**

---

## TRADEMARK FILINGS

| Mark | Class | Status | Est. Cost |
|------|-------|--------|-----------|
| AMINY | IC 009 (Software), IC 042 (SaaS) | NEEDS FILING | $350/class |
| ASK AMINY | IC 009, IC 042 | NEEDS FILING | $350/class |
| AMINY JR | IC 009 | NEEDS FILING | $350/class |
| EASE (child app) | IC 009, IC 042 | NEEDS SEARCH | $350/class |
| CALM CORNER | IC 009 | NEEDS SEARCH | $350/class |

**Estimated total: $3,000-5,000 for initial filings**

---

*This document is prepared for discussion with patent counsel and does not
constitute legal advice. Consult a registered patent attorney before filing.*
