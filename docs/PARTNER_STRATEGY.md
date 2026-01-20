# Partner Integration Strategy: Rise, AACT, Chimes, Acumen

**Date:** January 15, 2026
**Purpose:** Maximize Aminy's value proposition for key partner relationships

---

## Strategic Context

Dr. Karen Hans (Clinical Leader at Rise Services) outlined exactly what Aminy delivers:

> "Concierge-style clinical services model integrated with therapy, alongside the development of an online, subscription-based platform for parents"

**The opportunity:** Position Aminy as THE platform Rise should partner with, not build themselves.

---

## Partner Profiles

### 1. Rise Services Inc.
**What They Do:** Behavioral health services, DD services, autism support
**Their Need:** Technology platform for telehealth + parent support
**Our Advantage:** Platform already built, clinically compliant, ready to deploy

**Partnership Model:**
| Element | Proposal |
|---------|----------|
| Revenue Share | 70% Rise / 30% Aminy on telehealth visits |
| Platform Fee | $5/family/month or bundled in subscription |
| Branding | White-labeled "Rise Telehealth powered by Aminy" |
| Providers | Rise imports their BCBAs, therapists |
| Support | Aminy handles tech, Rise handles clinical |

**Key Talking Points:**
- "You don't need to build what we've already built"
- "Focus on clinical excellence, we handle technology"
- "Launch in weeks, not months/years"
- "72-hour telehealth-first rule already enforced"
- "Referral packets export to your local providers"

### 2. AACT (Arizona Autism Coalition for Therapy)
**What They Do:** Autism therapy advocacy and services in Arizona
**Their Need:** Broader reach, technology platform
**Our Advantage:** State-licensed provider routing already built

**Partnership Model:**
| Element | Proposal |
|---------|----------|
| Referral Fee | $50 per referred family that converts |
| Provider Listing | Featured placement for AACT providers |
| Co-Marketing | Joint webinars, Q&A sessions |
| Data Sharing | Anonymized outcome metrics |

### 3. Rise Pediatric Therapies
**What They Do:** PT, OT, Speech therapy for children
**Their Need:** Telehealth capability, parent engagement
**Our Advantage:** Multi-discipline provider routing (SLP, OT already supported)

**Partnership Model:**
| Element | Proposal |
|---------|----------|
| Integration | Therapists use Aminy for telehealth sessions |
| Revenue Share | 75% Therapist / 25% Aminy on telehealth |
| Home Programs | Aminy Home Program supports therapy carryover |
| Documentation | Visit summaries shared with therapist records |

### 4. Chimes ID&D (Intellectual/Developmental Disabilities)
**What They Do:** ID/DD services and support
**Their Need:** Parent/caregiver support technology
**Our Advantage:** Playbooks cover ID/DD needs, care coordination built-in

**Partnership Model:**
| Element | Proposal |
|---------|----------|
| Custom Content | ID/DD-specific playbooks and resources |
| Provider Pool | Chimes behavioral specialists on platform |
| Care Coordinator | Dedicated coordinator for Chimes families |
| Family Portal | Chimes-branded family experience |

### 5. Acumen Fiscal Agent / DCI
**What They Do:** Fiscal intermediary for self-directed services
**Their Need:** Approved vendor list, invoice generation
**Our Advantage:** Can generate Acumen-compatible invoices

**Partnership Model:**
| Element | Proposal |
|---------|----------|
| Vendor Status | Aminy becomes approved Acumen vendor |
| Invoice Format | Auto-generate Acumen-compliant invoices |
| Authorization Tracking | Track service hours against authorization |
| Billing Export | CSV/Excel export for Acumen submission |

---

## Technical Features for Partners

### Already Built (MVP)

| Feature | Partner Value |
|---------|---------------|
| 72-Hour Telehealth Routing | Ensures families get virtual care first |
| Multi-Provider Types | BCBAs, SLPs, OTs, therapists, coordinators |
| State Licensing Checks | Only shows providers licensed in family's state |
| Referral Packet PDF | Share child info with local therapists |
| Q&A Sessions | Multi-provider panel sessions |
| Playbooks Library | Evidence-based strategies for families |
| Visit Summaries | AI-generated documentation |
| Subscription Tiers | Flexible pricing for different family needs |

### Needs Building (for full partnership)

| Feature | Priority | Effort | Partner Benefit |
|---------|----------|--------|-----------------|
| White-Label Config | HIGH | 2-3 days | Custom branding per partner |
| Bulk Provider Import | HIGH | 1-2 days | Quickly add partner's team |
| Partner Dashboard | HIGH | 2-3 days | Analytics for partner admins |
| Revenue Reporting | HIGH | 1-2 days | Monthly revenue share statements |
| API Endpoints | MEDIUM | 2-3 days | Integration with partner systems |
| Acumen Invoice Export | MEDIUM | 1-2 days | Self-directed billing |
| Custom Playbooks | LOW | Ongoing | Partner-specific content |

---

## White-Label Implementation Plan

### Phase 1: Organization Model (2-3 days)

Create `/src/types/organization.ts`:
```typescript
interface Organization {
  id: string;
  name: string;  // "Rise Services"
  slug: string;  // "rise"
  branding: {
    logo: string;
    primaryColor: string;  // #577590 → custom
    secondaryColor: string;
    tagline: string;
  };
  domains: string[];  // ["rise.aminy.health"]
  providerPoolIds: string[];
  revenueShare: {
    telehealthPercent: number;  // 70%
    subscriptionPercent: number;  // 0%
  };
  features: {
    customPlaybooks: boolean;
    customQASessions: boolean;
    partnerDashboard: boolean;
  };
}
```

### Phase 2: Provider Import (1-2 days)

Create `/src/lib/provider-import.ts`:
```typescript
interface ProviderImportRow {
  firstName: string;
  lastName: string;
  email: string;
  role: ProviderRole;
  credentials: string;
  licensedStates: string[];  // "AZ,CA,TX"
  npi?: string;
}

async function importProvidersFromCSV(
  file: File,
  organizationId: string
): Promise<ImportResult>
```

### Phase 3: Partner Dashboard (2-3 days)

Create `/src/components/partner/PartnerDashboard.tsx`:
- Session volume by day/week/month
- Provider utilization rates
- Family satisfaction scores
- Revenue totals
- Top concerns trending
- Provider performance metrics

### Phase 4: API for Integration (2-3 days)

Create partner API endpoints:
```
POST /api/partners/providers       # Add provider
GET  /api/partners/sessions        # List sessions
GET  /api/partners/families        # List families
GET  /api/partners/reports/revenue # Revenue report
POST /api/partners/invoices        # Generate invoice
```

---

## Competitive Positioning

### Why Partner vs. Build?

| Building In-House | Partnering with Aminy |
|-------------------|----------------------|
| 12-18 months to launch | Launch in 2-4 weeks |
| $500K-$1M+ development | Revenue share model |
| Hire engineering team | We handle technology |
| HIPAA compliance effort | Already compliant |
| Ongoing maintenance burden | We maintain platform |
| Feature parity uncertain | 72-hour rule, AI, video all ready |

### Aminy Unique Advantages

1. **72-Hour Telehealth-First Rule** - Clinically informed routing
2. **AI-Powered Support** - 24/7 parent guidance
3. **Multi-Discipline Platform** - BCBAs, SLPs, OTs, therapists in one place
4. **Evidence-Based Content** - Playbooks with citations
5. **Referral Packet Export** - Seamless therapy integration
6. **Subscription + Per-Visit Model** - Flexible revenue

---

## Go-to-Market with Rise

### Immediate Actions

1. **Week 1:** Complete external service setup (Stripe, Daily.co)
2. **Week 2:** Demo to Dr. Karen Hans with real booking flow
3. **Week 3:** Pilot with 10 Rise families
4. **Week 4:** Expand pilot, refine based on feedback
5. **Month 2:** Full launch announcement

### Demo Script for Rise

1. **Show Family Journey:**
   - Sign up → Quick intake → Browse concerns
   - See providers licensed in their state
   - Book within 72 hours
   - Video consultation
   - AI-generated summary
   - Care plan with action items

2. **Show Provider Journey:**
   - Provider portal
   - Availability management
   - Session notes
   - Patient list

3. **Show Partner Value:**
   - "Your BCBAs on the platform"
   - "Your branding"
   - "Revenue share monthly"
   - "Analytics dashboard"

### Pilot Metrics to Track

| Metric | Target |
|--------|--------|
| Time to first booking | < 10 minutes |
| Session completion rate | > 95% |
| Family satisfaction (NPS) | > 60 |
| Provider satisfaction | > 4.5/5 |
| Technical issues | < 1 per session |

---

## Revenue Projections

### Base Assumptions
- 100 Rise families in Year 1
- Average 2 telehealth visits/month/family @ $99
- 50% on Core subscription ($29/month)

### Year 1 Revenue Model

| Stream | Calculation | Annual Revenue |
|--------|-------------|----------------|
| Telehealth Visits | 100 families × 2 visits × $99 × 12 months × 30% Aminy share | $71,280 |
| Subscriptions | 50 families × $29/month × 12 months × 100% Aminy | $17,400 |
| **Total Year 1** | | **$88,680** |

### Year 2 (Scale with AACT, Chimes)
- 500 families across partners
- **Projected Revenue:** $500K+

### Year 3 (National Expansion)
- 2,000+ families
- Multiple partner organizations
- **Projected Revenue:** $2M+

---

## Technical Integration Points

### For Rise EHR Integration (Future)

```typescript
// FHIR-ready endpoints for Phase 2
interface FHIRPatientSummary {
  resourceType: 'Patient';
  id: string;
  name: HumanName[];
  telecom: ContactPoint[];
  // ... standard FHIR fields
}

interface FHIREncounter {
  resourceType: 'Encounter';
  id: string;
  status: 'finished' | 'in-progress';
  class: CodingReference;
  subject: Reference<Patient>;
  participant: EncounterParticipant[];
  // ... standard FHIR fields
}
```

### For Acumen Billing Export

```typescript
interface AcumenInvoice {
  serviceDate: string;  // YYYY-MM-DD
  serviceCode: string;  // e.g., "H0032" for parent training
  units: number;
  rate: number;
  providerNPI: string;
  clientID: string;
  authorizationNumber: string;
}

function generateAcumenInvoice(
  visitId: string
): AcumenInvoice
```

---

## Summary

Aminy is uniquely positioned to be the technology partner Rise Services and other Arizona autism/behavioral health providers need. The platform delivers exactly what Dr. Hans described, with the added advantage of being already built, clinically compliant, and ready to scale.

**The ask:** Partner with us, import your providers, and launch telehealth in weeks instead of building from scratch over years.

**The value:** Focus on what you do best (clinical excellence) while we handle the technology.

---

*Strategy document created: January 15, 2026*
