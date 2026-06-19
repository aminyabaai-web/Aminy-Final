# Aminy — Owner Action Checklist
_Updated: 2026-06-18 — Everything blocking commercial launch, in order of urgency_

---

## CRITICAL — Do Before First Real User

### 1. Upgrade Supabase to Pro ($25/mo)
**Risk if skipped:** Free plan pauses after 7 days inactivity. All production data gets deleted.
- Go to: supabase.com/dashboard → your org (qpzsvafwcwyrkdolrjbu) → Settings → Billing
- Upgrade to Pro plan
- Confirm daily backups are enabled
- **Do this before anything else**

### 2. Rotate the Exposed Supabase Access Token
**Risk if skipped:** Token `sbp_60bc...` was logged in a previous session. Anyone with it can manage your project.
- Go to: supabase.com/dashboard → Account → Access Tokens
- Delete the old token
- Generate a new one
- Update any scripts that used the old one

### 3. Apply Pending Migration
One new migration needs to be applied to production:
```
20260618000000_daily_room_columns.sql
```
Run via Supabase MCP or: `supabase db push --linked`

---

## STRIPE — One Command Away From Revenue

### 4. Set Supabase Secrets for Stripe
Go to: Supabase Dashboard → Edge Functions → Secrets → Add:
```
STRIPE_SECRET_KEY       = sk_live_...      (from Stripe Dashboard → API keys)
STRIPE_WEBHOOK_SECRET   = whsec_...        (from Stripe Dashboard → Webhooks, after step 5)
RESEND_API_KEY          = re_...           (from resend.com → API Keys)
```

### 5. Register the Stripe Webhook Endpoint
- Go to: Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: `https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/stripe-webhook`
  _(standalone function — already deployed ACTIVE v2; the /payments/webhook route inside make-server-8a022548 is blocked by the Supabase JWT gateway and unreachable by Stripe)_
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copy the webhook signing secret → paste as `STRIPE_WEBHOOK_SECRET` in step 4 above

### 6. Edge Functions — Already Deployed
All required functions are ACTIVE. No deploy commands needed:
| Function | Version | Purpose |
|----------|---------|---------|
| `make-server-8a022548` | v146 | Main API (AI, bookings, provider management) |
| `stripe-webhook` | v2 | Stripe payment events → tier updates |
| `daily-webhook` | v1 | Daily.co events → provider no-show detection |
| `chat` | v19 | AI chat (Claude claude-sonnet-4-6 primary) |
| `telehealth` | v10 | Video session management |

---

## DAILY.CO — Now Wired, Needs Webhook Registration

### 7. Register Daily.co Webhook
- Go to: daily.co Dashboard → Developers → Webhooks → Add webhook
- URL: `https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/daily-webhook`
  _(Note: deployed as a standalone function `daily-webhook` — not a sub-route of make-server-8a022548)_
- Events: `participant-joined`, `meeting-ended`
- Copy the shared secret → add to Supabase secrets as `DAILY_WEBHOOK_SECRET`

This auto-detects provider no-shows and triggers the family apology + recovery flow.

---

## HIPAA — Required Before PHI Touches the System

### 8. Execute BAA with Anthropic
- Email: privacy@anthropic.com
- Request: Business Associate Agreement for Claude API processing PHI
- Required because: AI chat sessions contain child behavioral data, diagnoses, session notes
- Anthropic has a BAA process — it typically takes 1-2 weeks

### 9. Execute BAA with Twilio
- Portal: twilio.com/console → Compliance → HIPAA
- Required because: SMS reminders reference appointment details (provider name, time, type)
- Twilio offers BAA on qualifying plans (messaging at scale)

### 10. Execute BAA with Sentry
- Portal: sentry.io → Settings → Security & Privacy → HIPAA
- Required because: Error monitoring captures stack traces that may include user data
- Sentry offers BAA on Business plan ($26/mo minimum)

### 11. Privacy Policy + Terms of Service Update
- Add HIPAA Notice of Privacy Practices
- Explicitly state PHI handling, retention period, right to access, right to delete
- Link from: login screen, signup flow, settings

---

## COMMUNICATIONS — Twilio + Resend

### Current State
- **Resend (email):** WIRED and ready. Just needs `RESEND_API_KEY` in Supabase secrets + domain verified
- **Twilio (SMS):** WIRED and ready. Needs `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in secrets + BAA

### 12. Verify aminy.ai Domain with Resend
- Go to: resend.com → Domains → Add domain → `aminy.ai`
- Add the DNS records they give you (SPF, DKIM) in your domain registrar
- Once verified: set `RESEND_VERIFIED_DOMAIN=true` in Supabase secrets
- Without this: emails send from `onboarding@resend.dev` (functional but looks unprofessional)

### 13. Set Twilio Secrets
```
TWILIO_ACCOUNT_SID   = AC...
TWILIO_AUTH_TOKEN    = ...
TWILIO_FROM_NUMBER   = +1...
```

### 14. Rotate the Twilio Auth Token
(Flagged in INVESTOR-READINESS.md — token was shared in a previous session)
- Twilio Console → Account → Auth Tokens → Rotate secondary → promote to primary

---

## AACT / RISE — Your Moat

### 15. Sign the AACT/Rise Partnership Agreement
This is the single highest-value thing you can do.
- What it unlocks: AHCCCS insured rail, $0 OOP for families, B2B per-visit invoicing
- What they get: white-labeled Aminy with their branding, Rethink EMR sync when live, EVV integration (DCI)
- Ask for: pilot with 5-10 BCBAs, 3-month evaluation period
- Revenue model: $32/completed session + $45/prior auth packet + $49/seat/mo for their BCBAs
- Estimated annual revenue from AACT alone (50 BCBAs × 20 sessions/week × 48 weeks): $1.5M

### 16. Set Rethink Credentials (After AACT Signs)
Once AACT gives you sandbox access:
```
RETHINK_CLIENT_ID      = ...
RETHINK_CLIENT_SECRET  = ...
RETHINK_BASE_URL       = https://api.rethinkbh.com
```
The Rethink edge function is already built and deployed. Adding credentials activates live EMR sync.

---

## IP PROTECTION

### 17. File a Provisional Patent Application
What to cover (each of these is a defensible claim):
- AI-assisted prior authorization timeline surfacing at booking time
- Coordination-of-benefits zero-OOP estimation presented pre-booking
- Provider reliability tier system (rolling 90-day window, matching deprioritization)
- PHQ-9 screener auto-delivery + CPT 96127 billing pipeline
- BCBA briefing via AI synthesis of child behavioral data pre-session
- Behavioral screener data migrated from pre-auth to authenticated account on signup

**Cost:** ~$2,000–3,000 for a provisional (good for 12 months, establishes priority date)
**Who:** Find a healthcare tech IP attorney. Ask AACT if they have one they use.

### 18. Register Trademark: AMINY
- USPTO.gov → TEAS Plus application
- Classes: 44 (health services), 42 (software/SaaS)
- Cost: ~$350/class
- 8-12 month timeline

### 19. Protect the Codebase
- GitHub repo is already private (transferred to aminyabaai-web org)
- Enable branch protection on `main`: Settings → Branches → Require PR + 1 review
- Consider IP assignment agreements with any contractors or advisors

---

## SUPPLY — The Actual Constraint

### 20. Onboard 10 BCBAs Before First Marketing Dollar
No amount of engineering fixes the empty marketplace problem.
- Target: 2-3 BCBAs who work with AHCCCS patients
- Offer: free platform for first 3 months, priority placement, direct onboarding call
- Source: Arizona BACB registry, LinkedIn (filter: BCBA + Arizona + ABA)
- Script: "I'm building the Headway for ABA. I need 3 BCBAs to be founding providers — your profile, your availability, zero fees for 90 days."

---

## NICE-TO-HAVE (Non-Blocking)

### 21. PHQ-9 Auto-Delivery Scheduler
- Supabase pg_cron job to query appointments 24h out, send PHQ-9 link
- PHQ-9 response webhook → insert into `screening_results` table → auto-bill CPT 96127 on insured visits
- Estimated 2-3 days of work

### 22. Branch Protection on Main
GitHub → aminyabaai-web/Aminy-Final → Settings → Branches → Add rule → `main` → Require PR reviews

### 23. Run WCAG Accessibility Audit
```bash
npm run test:e2e:accessibility
```
Fix any critical issues before going live (legal exposure in healthcare context)

---

## SUMMARY — Launch Sequencing

| Week | Action |
|------|--------|
| This week | Supabase Pro, rotate tokens, set Stripe secrets, deploy edge function, register Stripe webhook |
| Next week | Execute Anthropic + Sentry BAAs, verify Resend domain, sign AACT pilot |
| Week 3 | Register Daily.co webhook, set Twilio, onboard first 5 BCBAs |
| Week 4 | First real appointments, provisional patent filing |
| Month 2 | AACT full pilot, Twilio BAA, trademark filing |
