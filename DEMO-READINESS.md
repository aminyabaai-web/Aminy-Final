# Demo Readiness — VC / J. Auer Prep Tracker
Owner checklist. Updated: 2026-07-02. (Claude maintains this; tell it to update as items close.)

## 1. Legal / IP (before any VC meeting)
- [ ] **NDA** — mutual NDA ready to send before the J. Auer demo. Reality check: most institutional VCs won't sign NDAs; use it for individuals/angels/strategic partners like Auer. Keep a one-pager version of the pitch that's safe to share unsigned.
- [ ] **IP assignment to Aminy LLC** — confirm ALL code/design/content is assigned to the LLC (founder IP assignment agreement signed by you; any contractor work-for-hire agreements collected). The codebase carries "Aminy LLC All Rights Reserved" headers — make the underlying paperwork match.
- [ ] **Trademark** — file "Aminy" (word mark + compass logo) with USPTO, classes 9/42/44. ~$350/class DIY or ~$1k with counsel.
- [ ] **Provisional patent (optional, cheap option value)** — the two-sided parent↔provider data loop + AI-supervised parent-as-co-therapist method may be claimable. ~$150 filing DIY, buys 12 months of "patent pending."
- [ ] **Entity hygiene** — LLC operating agreement current; consider Delaware C-corp conversion timing (VCs will require it at term sheet; don't need it for the demo).
- [ ] **Executed BAAs** — Anthropic, Twilio, Sentry, Supabase (partially done — verify each; VCs' diligence will ask).
- [ ] Rotate the Supabase access token that was shared in a work session (Dashboard → Account → Access Tokens).

## 2. Demo readiness (the meeting itself)
- [ ] **Demo account**: `edgar.staren+aminytest1@gmail.com` exists in prod (child "Kai", age 6, autism, transition meltdowns) — realistic, clean. Log in beforehand, keep the tab warm.
- [ ] **Seed 3–4 weeks of outcome check-ins** on the demo account so the trend chart shows a curve, not an empty state. (Claude can do this on request.)
- [ ] **Rehearse the 5-screen loop** (≤7 min): Splash → sign in → Dashboard (Kai's day) → **live AI moment** (ask: "Kai melted down leaving the playground — what do I try?") → Outcomes trend → Provider portal 30-sec flyover ("Practice in a Box: no clinic to set up, no company to join").
- [ ] **Backup recording** — screen-record the rehearsed loop with Loom/QuickTime in case of wifi/live failure. 2 min max.
- [ ] **Second device** — phone with the PWA installed (mobile is the real product; desktop is now polished too).
- [ ] **Kill switches** — dark mode set intentionally; notifications off; no test accounts visible in provider lists.

## 3. Materials
- [ ] **One-pager** (safe-to-share, no NDA needed): problem (1-in-31, 18-month waitlists), the loop ("parent logs at home → provider sees it → provider's plan flows back → AI remembers everything"), business model (B2C tiers + 25/10/5% take rate + B2B seats), the ask.
- [ ] **Deck (10 slides max)**: lead with the contrarian truth — *ABA supply mathematically can't scale; the only answer is software that makes the parent a supervised co-therapist. Incumbents sell to clinics and will never own the family.*
- [ ] **Explainer video** — owner idea: AI-generated video explaining what Aminy is. Recommendation: **hybrid** — AI-generated video (Runway/Sora/HeyGen) is fine for the *concept/brand* explainer (60–90s, warm, animated); but the *product* demo must be a real screen recording — clinical audiences and investors distrust AI-faked product footage. Two assets: (a) 60s AI concept video for the website/cold outreach, (b) 2-min real screen-capture product tour.
- [ ] **Data room lite** (Notion/Drive folder): cap table, entity docs, IP assignments, BAAs list, metrics dashboard screenshot, product roadmap, INVESTOR-READINESS.md contents.

## 4. Evidence (the gap between "intrigued" and "obsessed")
- [ ] **Sign AACT/Rise** — the single highest-value item. Revenue ≠ $0 + distribution proof.
- [ ] **20–50 real families onboarded** — the app captures baseline + weekly outcomes from day 1 by design; 90 days of usage = the outcomes chart that answers "where's your evidence?"
- [ ] **One killer retention metric** — weekly check-in completion rate / AI chats per parent per week. Instrument and watch it.
- [ ] **1–2 independent BCBAs running their practice on Aminy** — living proof of Practice-in-a-Box ("no clinic, no employer").

## 5. Product blockers still open (Claude's side, tracked)
- [ ] Provider-type live E2E results (solo BCBA / RBT / parent-link / telehealth bookability) — in flight
- [ ] Best-in-class outcomes data presentation (parent trend view, AI-chat data answers, admin analytics) — in flight
- [ ] Amazon Associates tag (owner signs up at affiliate-program.amazon.com; paste tag → 1-line wire-in)
- [ ] Network allowlist: add `aminy.ai` + `*.netlify.app` in claude.ai/code environment settings so Claude can test literal prod URLs
- [ ] Rethink sandbox creds (vendor-blocked)
- [ ] Clinical advisor cold-eye review before any clinical claims in the deck
