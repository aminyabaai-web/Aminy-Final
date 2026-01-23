# Aminy Go-to-Market Roadmap

**Document Purpose**: This roadmap captures all strategic initiatives to ensure nothing is forgotten during implementation. Updated per McKinsey 10/10 assessment.

---

## Phase 1: Launch Requirements (Before Go-Live)

### Authentication & Payments (Critical Path)
- [ ] Complete Supabase auth integration (LoginScreen, CreateAccountScreen)
- [ ] Wire real Stripe webhooks with signature verification
- [ ] Set up RLS policies for all tables
- [ ] Configure Google OAuth
- [ ] Configure Apple OAuth
- [ ] Email verification flow

### Community Features (Launch Day)
- [ ] Parent community read/write access
- [ ] Community moderation tools
- [ ] Welcome flow for new community members
- [ ] Community guidelines display

### Referral Program (Launch Day)
- [ ] Referral code generation per user
- [ ] Referral tracking database table
- [ ] Referral rewards logic (free month? discount?)
- [ ] "Share your win" integration with referral
- [ ] Referral dashboard for users

### HSA/FSA Integration
- [ ] HSA/FSA eligibility badges on pricing page
- [ ] Letter of Medical Necessity template generator
- [ ] Superbill generation for reimbursement
- [ ] HSA/FSA FAQ content

---

## Phase 2: Short-Term (0-3 Months Post-Launch)

### School Partnerships
- [ ] School district licensing model
- [ ] Bulk account creation
- [ ] Teacher dashboard view
- [ ] IEP export format for schools
- [ ] FERPA compliance documentation

### Pediatrician Partnerships
- [ ] Provider referral program
- [ ] "Prescribed by" badge
- [ ] Provider dashboard (read-only access to referred families)
- [ ] QR code for clinic waiting rooms
- [ ] Provider resource kit (brochures, talking points)

### Enhanced Marketplace
- [ ] Provider ratings/reviews system
- [ ] 4-session bundle packages
- [ ] 8-session bundle packages with additional discount
- [ ] Insurance verification integration (Eligible API?)
- [ ] Provider response time badges
- [ ] "Verified BCBA" certification display

### Clinical Enhancements
- [ ] CPT code reference guide for families
- [ ] Evidence base citations (link strategies to research)
- [ ] BCBA certification verification for marketplace
- [ ] ICD-10 code suggestions based on child profile

---

## Phase 3: Medium-Term (3-12 Months)

### Medicaid Waiver & Self-Directed Programs (HIGH PRIORITY)
**Target**: Families using self-directed Medicaid waiver funds (HCBS, EPSDT waivers)
**Partners**: Fiscal agents like Acumen, PPL, GT Independence, Palco

- [ ] Fiscal agent partnership outreach (Acumen, PPL, GT Independence, Palco)
- [ ] "Approved vendor" status with major fiscal agents
- [ ] Integration with fiscal agent payment systems
- [ ] W-9/vendor enrollment documentation package
- [ ] Service code mapping (respite, parent training, community living supports)
- [ ] Invoicing format compatible with fiscal agent requirements
- [ ] Marketing materials for waiver coordinators
- [ ] State-by-state waiver program compatibility matrix
- [ ] Support coordinator education materials
- [ ] Participant-directed budget worksheet integration

**Why This Matters**:
- 900,000+ individuals use self-directed services
- Average annual budget: $30K-$80K per participant
- Parents already have approved funds to spend
- Fiscal agents actively seek quality vendors
- Low customer acquisition cost (waiver coordinator referrals)

### Paid Parent Caregiver Integration (SpokChoice/DCI Model)
**Target**: Parents employed as paid caregivers for their own children via Medicaid waivers

- [ ] SpokChoice/DCI partnership exploration
- [ ] Paid parent caregiver documentation templates
- [ ] Time tracking integration for parent caregivers
- [ ] Care notes format compatible with waiver requirements
- [ ] Training compliance tracking (CPR, first aid, etc.)
- [ ] EVV (Electronic Visit Verification) integration research
- [ ] Parent caregiver "professional mode" dashboard
- [ ] Service plan alignment tools
- [ ] Supervisor oversight portal for FMS employers

**Why This Matters**:
- Many states allow parents as paid caregivers via CDPAP/self-directed waivers
- These parents need documentation tools to justify their hours
- Aminy can provide the "evidence" that hours were spent on care
- Win-win: parents get paid, Aminy gets paying customers via fiscal agents

### Insurance Partnerships (Traditional)
- [ ] Outcomes data packaging for payers
- [ ] ROI calculator for insurers
- [ ] Pilot program with 1-2 regional insurers
- [ ] Claims integration API design
- [ ] Care coordination features for case managers

### Employer Benefits
- [ ] B2B pricing model
- [ ] HR admin dashboard
- [ ] Bulk onboarding
- [ ] Anonymous aggregate reporting for employers
- [ ] EAP integration documentation

### Research Partnerships
- [ ] IRB protocol template
- [ ] Anonymized data export for researchers
- [ ] Academic partnership outreach list
- [ ] Outcomes benchmarking database
- [ ] Published outcomes white paper

### International Expansion
- [ ] UK market assessment
- [ ] Canada market assessment (provincial healthcare)
- [ ] Australia market assessment
- [ ] Multi-language support architecture
- [ ] GDPR compliance (already needed)
- [ ] Local provider marketplace per region

---

## Phase 4: Long-Term (12+ Months)

### Provider SaaS
- [ ] B2B platform for BCBA practices
- [ ] Multi-family management dashboard
- [ ] Billing integration for providers
- [ ] Outcome tracking across caseload
- [ ] Supervision hour tracking

### Advanced AI Features
- [ ] Extended thinking for complex cases
- [ ] Vision/document analysis improvements
- [ ] Predictive insights (proactive recommendations)
- [ ] Natural language care plan generation
- [ ] Multi-modal support (video analysis of behaviors)

### Platform Ecosystem
- [ ] API access documentation (Pro+)
- [ ] Third-party integrations (smart home, wearables)
- [ ] Developer program
- [ ] App marketplace for add-ons

---

## Key Metrics to Track

### Acquisition
- Monthly signups (free)
- Trial conversion rate
- Referral signups %
- Provider referral signups

### Activation
- Onboarding completion rate
- First AI message sent
- First routine completed
- 7-day retention

### Revenue
- MRR by tier
- LTV by acquisition channel
- Churn rate by tier
- Annual plan adoption rate

### Engagement
- Daily active users (DAU)
- AI messages per user per day
- Routines completed per week
- Report exports per month

### Outcomes (The Moat)
- Average parent stress reduction %
- Routine adherence improvement
- Goals completed per month
- Provider session satisfaction

---

## Pricing Evolution Considerations

### Current Structure (Simplified)
- Free: $0 (7-day trial of Core)
- Core: $14.99/mo (recommended)
- Pro: $29.99/mo
- Family Plan: $49.99/mo

### Future Considerations
- Enterprise tier for clinics/schools
- Annual-only discounts
- Lifetime access option (one-time payment)
- Regional pricing for international
- Non-profit/low-income discount

---

## Risk Mitigation

### Regulatory Risk
- [ ] Healthcare attorney review of all claims
- [ ] "Not medical advice" disclaimers throughout
- [ ] HIPAA compliance certification
- [ ] State-by-state telehealth compliance review

### Competition Risk
- [ ] Continuous moat strengthening (memory + tracking + clinical)
- [ ] Provider network lock-in
- [ ] Community network effects
- [ ] Data asset value growth

### Retention Risk
- [ ] "Graduation" celebration pathway
- [ ] Sibling/new child discount
- [ ] Alumni community access
- [ ] Lifecycle expansion (school-age, teen, transition)

---

## Document History

| Date | Update |
|------|--------|
| 2026-01-23 | Initial roadmap from McKinsey 10/10 assessment |

---

*This is a living document. Update as priorities shift.*
