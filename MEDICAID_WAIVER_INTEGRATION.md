# Medicaid Waiver & Fiscal Agent Integration Specification

## Executive Summary

This document outlines Aminy's integration strategy with self-directed Medicaid waiver programs and fiscal management services (FMS) like Acumen, DCI, PPL, and others. This channel represents a significant growth opportunity with 900,000+ individuals using self-directed services nationally.

**Key Value Proposition**: Parents using waiver funds can pay for Aminy using their approved budget, while Aminy provides the documentation they need to justify service hours.

---

## Target Market

### Primary Users
1. **Paid Parent Caregivers** - Parents employed as caregivers for their own children via CDPAP, self-directed waivers
2. **Self-Directed Participants** - Families managing their own waiver budgets
3. **Support Coordinators/Waiver Case Managers** - Professionals who refer families to services

### Key Statistics
- 900,000+ individuals use self-directed services nationally
- Average annual budget: $30,000 - $80,000 per participant
- Growing 15-20% annually as states expand self-direction options
- Low customer acquisition cost through coordinator referrals

---

## Fiscal Agent Partners

### Tier 1 Partners (Priority)
| Partner | States | Notes |
|---------|--------|-------|
| **Acumen Fiscal Agent** | AZ, CO, FL, GA, IN, KS, MI, NC, NV, OH, OR, PA, SC, TN, TX, VA, WI | CEO relationship exists |
| **DCI (Direct Care Innovations)** | Multiple | CEO relationship exists |
| **Public Partnerships LLC (PPL)** | CA, CT, DC, FL, IL, KY, LA, MA, MD, MN, NJ, NY, OH, PA, RI, TX, WA | Largest national FMS |

### Tier 2 Partners
| Partner | States |
|---------|--------|
| GT Independence | AZ, CO, MI, MO, NJ, OH, PA, TX |
| Palco | AL, AR, CA, CO, GA, IA, ID, IN, KY, LA, MI, MO, MS, NC, NM, OK, OR, SC, TN, WA |
| Consumer Direct Care Network | AK, CO, MT, NV, SD, WA, WY |
| CDCN | Multiple |

---

## Service Code Mapping

### How Aminy Activities Map to Waiver Services

| Aminy Feature | Waiver Service | HCPCS Code | Typical Rate |
|---------------|----------------|------------|--------------|
| Daily care coordination | Respite Care | S5150 | $15-35/hr |
| Parent training (AI guidance) | Family Training | T1027 | $20-50/hr |
| Community living support | Community Living | T2025 | $15-30/hr |
| Habilitation activities | Habilitation | T2017 | $12-25/hr |
| Companion services | Companion | S5135 | $12-20/hr |
| Personal care documentation | Personal Care | T1019 | $15-30/hr |

### Documentation Aminy Generates
1. **Service Delivery Notes** - Auto-generated from completed activities
2. **Care Hours Log** - Time tracking for paid caregiver hours
3. **Progress Reports** - Weekly/monthly summaries for case managers
4. **ISP/POC Alignment** - Shows how activities map to service plan goals
5. **EVV-Compatible Records** - Electronic Visit Verification data (where required)

---

## Integration Architecture

### Phase 1: Vendor Enrollment (Month 1-2)

```
┌─────────────────────────────────────────────────────────────┐
│                    FISCAL AGENT PORTAL                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Acumen    │  │     DCI     │  │     PPL     │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│                   AMINY AS VENDOR                            │
│            (W-9, Service Agreement, Rates)                   │
└─────────────────────────────────────────────────────────────┘
```

**Deliverables:**
- [ ] W-9 and vendor enrollment forms for each FMS
- [ ] Service rate negotiation
- [ ] Compliance documentation (HIPAA BAA, insurance)
- [ ] Marketing materials for participant outreach

### Phase 2: Participant Onboarding Flow (Month 2-3)

```
┌─────────────────────────────────────────────────────────────┐
│                 PARTICIPANT ONBOARDING                       │
│                                                              │
│  1. "How will you pay?"                                      │
│     ├── [ ] Credit Card / HSA/FSA                           │
│     ├── [ ] Medicaid Waiver / Self-Directed                 │
│     └── [ ] Insurance (coming soon)                          │
│                                                              │
│  2. If Waiver Selected:                                      │
│     ├── Select State → Show available waivers               │
│     ├── Select Fiscal Agent → Acumen, DCI, PPL, etc.        │
│     ├── Enter Participant ID                                │
│     └── Enter Service Authorization # (optional)            │
│                                                              │
│  3. Service Mapping:                                         │
│     ├── "What services are approved in your plan?"          │
│     ├── [ ] Respite    [ ] Parent Training                  │
│     ├── [ ] Habilitation    [ ] Community Living            │
│     └── Map Aminy features to approved services             │
│                                                              │
│  4. Billing Setup:                                           │
│     ├── Invoice directly to fiscal agent? (if approved)     │
│     └── Generate superbill for manual submission?           │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Documentation Engine (Month 3-4)

```
┌─────────────────────────────────────────────────────────────┐
│              AUTOMATIC DOCUMENTATION GENERATION              │
│                                                              │
│  User Activity                    Documentation Output       │
│  ────────────                    ───────────────────────     │
│  Complete morning routine   →    Service note + hours log   │
│  AI chat about strategies   →    Parent training note       │
│  Log behavior incident      →    Clinical observation       │
│  Track progress metrics     →    Outcome measurement        │
│  Export weekly report       →    ISP progress report        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           GENERATED SERVICE NOTE                     │    │
│  │                                                      │    │
│  │  Date: 01/23/2026                                   │    │
│  │  Participant: [Child Name]                          │    │
│  │  Service: Parent Training (T1027)                   │    │
│  │  Duration: 2.5 hours                                │    │
│  │                                                      │    │
│  │  Summary: Parent utilized Aminy's AI guidance to    │    │
│  │  implement ABA-based transition strategies during   │    │
│  │  morning routine. Child demonstrated improvement    │    │
│  │  in compliance with visual schedule (80% vs 60%    │    │
│  │  baseline). Parent practiced prompting hierarchy.   │    │
│  │                                                      │    │
│  │  Goals Addressed:                                   │    │
│  │  - ISP Goal 1.2: Increase routine compliance       │    │
│  │  - ISP Goal 2.1: Reduce transition meltdowns       │    │
│  │                                                      │    │
│  │  [Export PDF] [Submit to Fiscal Agent]              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Paid Parent Caregiver Mode

### User Experience

When a user identifies as a paid caregiver for their child:

1. **Dashboard Changes**
   - "Caregiver Mode" toggle in settings
   - Hours tracking widget on main dashboard
   - Quick "Clock In/Clock Out" functionality
   - Service note generation prompts

2. **Time Tracking**
   ```
   ┌─────────────────────────────────────────┐
   │  📋 Today's Caregiver Hours             │
   │                                          │
   │  Clocked In: 8:00 AM                    │
   │  Current Duration: 4h 32m               │
   │                                          │
   │  Activities Logged:                      │
   │  ✓ Morning routine (1.5 hrs)            │
   │  ✓ Parent training - transitions (1 hr) │
   │  ✓ Community outing prep (45 min)       │
   │  ○ Afternoon routine (in progress)      │
   │                                          │
   │  [Clock Out] [Add Manual Entry]          │
   └─────────────────────────────────────────┘
   ```

3. **Weekly Summary Export**
   - Total hours by service type
   - Narrative summaries for each day
   - Signature line for supervisor (if required)
   - Export formats: PDF, CSV (for fiscal agent upload)

### EVV Compliance

Some states require Electronic Visit Verification. Aminy can provide:
- GPS location stamps (opt-in) for service delivery
- Timestamp verification for clock in/out
- API integration with EVV systems (Sandata, HHAeXchange)

---

## Pricing for Waiver Participants

### Option 1: Direct Invoice to Fiscal Agent
- Aminy bills fiscal agent directly as approved vendor
- Monthly subscription: $99/month (Core) or $149/month (Pro)
- Participant uses no out-of-pocket funds

### Option 2: Superbill Reimbursement
- Participant pays Aminy directly
- Aminy generates superbill with service codes
- Participant submits to fiscal agent for reimbursement
- Reimbursement rate depends on approved services

### Option 3: Hybrid
- Base subscription paid by participant (or HSA/FSA)
- Per-hour documentation fee billed to fiscal agent
- Example: $5/hour for documented caregiver hours

---

## Implementation Roadmap

### Month 1: Foundation
- [ ] Legal review of FMS vendor requirements
- [ ] Create vendor enrollment packet
- [ ] Initiate conversations with Acumen and DCI (existing relationships)
- [ ] Build "Waiver Payment" option in onboarding

### Month 2: Pilot
- [ ] Complete vendor enrollment with Acumen/DCI
- [ ] Build Paid Caregiver Mode dashboard
- [ ] Create service note templates
- [ ] Pilot with 10-20 families

### Month 3: Documentation Engine
- [ ] Auto-generate service notes from activities
- [ ] Build hours tracking and export
- [ ] Create ISP goal alignment feature
- [ ] Add supervisor oversight portal

### Month 4: Scale
- [ ] Expand to PPL and other fiscal agents
- [ ] Build state-by-state waiver compatibility
- [ ] Add EVV integration (where required)
- [ ] Launch support coordinator marketing

### Month 5-6: Optimization
- [ ] Direct billing integration with fiscal agents
- [ ] Custom reporting for case managers
- [ ] Outcomes data for waiver program evaluation
- [ ] White-label option for fiscal agents

---

## Technical Requirements

### Database Schema Additions

```sql
-- Waiver participant profile
CREATE TABLE waiver_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  state VARCHAR(2) NOT NULL,
  waiver_program VARCHAR(100),
  fiscal_agent_id VARCHAR(50),
  participant_id VARCHAR(100),
  service_authorization VARCHAR(100),
  approved_services TEXT[], -- Array of service codes
  weekly_authorized_hours DECIMAL,
  evv_required BOOLEAN DEFAULT false,
  caregiver_mode_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Caregiver time entries
CREATE TABLE caregiver_time_entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  waiver_profile_id UUID REFERENCES waiver_profiles(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  service_code VARCHAR(10),
  activities_completed TEXT[],
  notes TEXT,
  gps_location JSONB, -- Optional EVV
  status VARCHAR(20) DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service notes
CREATE TABLE service_notes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  time_entry_id UUID REFERENCES caregiver_time_entries(id),
  service_code VARCHAR(10),
  service_date DATE,
  duration_hours DECIMAL,
  narrative TEXT,
  goals_addressed TEXT[],
  participant_response TEXT,
  caregiver_signature BOOLEAN DEFAULT false,
  supervisor_signature BOOLEAN,
  supervisor_id UUID,
  export_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

```typescript
// Waiver profile management
POST   /api/waiver/profile          // Create waiver profile
GET    /api/waiver/profile          // Get current user's profile
PUT    /api/waiver/profile          // Update profile
GET    /api/waiver/fiscal-agents    // List fiscal agents by state

// Time tracking
POST   /api/caregiver/clock-in      // Start shift
POST   /api/caregiver/clock-out     // End shift
GET    /api/caregiver/entries       // List time entries
PUT    /api/caregiver/entries/:id   // Update entry

// Service notes
POST   /api/service-notes           // Create service note
GET    /api/service-notes           // List notes
GET    /api/service-notes/:id/pdf   // Export as PDF
POST   /api/service-notes/bulk      // Bulk generate from activities

// Reporting
GET    /api/waiver/weekly-summary   // Weekly hours summary
GET    /api/waiver/monthly-report   // Monthly report for case manager
GET    /api/waiver/superbill        // Generate superbill
```

---

## Success Metrics

### Adoption
- Number of waiver participants onboarded
- Fiscal agents enrolled as partners
- States with active users

### Engagement
- Average documented hours per user/week
- Service notes generated
- Reports exported to case managers

### Revenue
- Revenue from waiver billing
- Average revenue per waiver participant
- Fiscal agent contract value

### Impact
- Hours approved/paid vs documented
- Case manager satisfaction scores
- Participant outcomes improvement

---

## Competitive Advantage

### Why Aminy vs. Other Documentation Tools

| Feature | Aminy | Generic EVV | Paper Forms |
|---------|-------|-------------|-------------|
| AI-powered care guidance | ✅ | ❌ | ❌ |
| Auto-generated service notes | ✅ | ❌ | ❌ |
| Progress tracking | ✅ | Limited | ❌ |
| BCBA marketplace access | ✅ | ❌ | ❌ |
| ISP goal alignment | ✅ | ❌ | Manual |
| EVV compliance | ✅ | ✅ | ❌ |
| Family engagement features | ✅ | ❌ | ❌ |

### Value to Fiscal Agents

1. **Reduced Administrative Burden** - Pre-formatted documentation
2. **Better Outcomes Data** - Track service effectiveness
3. **Participant Satisfaction** - Better tools = happier families
4. **Compliance** - Proper documentation reduces audit risk

---

## Next Steps

1. **Immediate**: Schedule calls with Acumen and DCI CEOs
2. **Week 1**: Complete vendor enrollment paperwork
3. **Week 2-3**: Build Paid Caregiver Mode UI
4. **Week 4**: Pilot with 5 families
5. **Month 2**: Full launch to waiver participants
