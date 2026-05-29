# Aminy Audit Findings (authoritative, 75 items)

## src/App.tsx
- **[CRITICAL] L3550** (mock-data-visible)
  - PROBLEM: The 'session-payout' route renders SessionPayoutTrigger with hardcoded placeholder props a real user sees: providerName='Provider' and sessionDescription='Demo Session' (3550-3557). 'Demo Session' shows in the confirm card (SessionPayoutTrigger:154), loading state ('Transferring … to Provider', 228), and success state (252). Not gated by isDemoMode().
  - FIX: Pass real session/provider props (sessionId, providerId, providerName, stripeConnectAccountId, sessionAmountCents, rail, sessionDescription) from the actual session being paid out, or gate this demo wiring behind isDemoMode().
- **[CRITICAL] L2894** (dead-handler)
  - PROBLEM: MyAppointments is rendered with no appointments prop and no userId (verified: App.tsx:2894 passes neither). The component defaults appointments=[] (MyAppointments:457), so the screen ALWAYS shows 'No upcoming appointments' even for users with booked sessions. The useAppointments() hook that loads real bookings is exported but never called. With no data flowing in, all per-card handlers (onJoinCall/onReschedule/onCancel/onLeaveReview/onBookAgain/onCompleteQuestionnaire) are also never passed, so every appointment action is dead.
  - FIX: In App.tsx call const { appointments } = useAppointments(userData.id) (or pass userId and call internally) and pass appointments plus real onJoinCall/onReschedule/onCancel/onLeaveReview/onBookAgain/onCompleteQuestionnaire handlers.

## src/components/CareTab.tsx
- **[CRITICAL] L101** (mock-data-visible)
  - PROBLEM: The Care/CareTab screen renders entirely hardcoded fake data to any real Pro user with NO isDemoMode() gate: fabricated coach 'Sarah Chen, BCBA, M.Ed' (107/123/135/147/177/258), fake two-way message threads (101-128), fake completed-session summaries with invented clinical insights (142-203), and fake minutes-usage history (211-226). A paying parent opening their care plan sees a realistic conversation with a clinician who does not exist. Most damaging defect in the batch. Verified: ungated useState seed arrays.
  - FIX: Replace all hardcoded useState seed arrays (messages, upcomingSessions, pastSessions, minutesWallet, minutesUsage) with real Supabase data for the signed-in user. Gate any demo seed strictly behind isDemoMode() from src/lib/demo-data.ts and render a proper empty state otherwise.
- **[HIGH] L252** (dead-handler)
  - PROBLEM: handleSendMessage simulates a coach reply via setTimeout (252-263), pushing a canned fabricated 'Sarah Chen' response 2s after the parent sends a real message (verified). A user messaging what they believe is their assigned BCBA receives an auto-generated fake reply with no human or AI behind it. Core chat flow is fake.
  - FIX: Persist the outgoing message to Supabase and remove the fabricated setTimeout auto-reply. Wire real coach/AI responses, or show 'Your coach will respond within office hours' with no fake message injected.
- **[HIGH] L305** (dead-handler)
  - PROBLEM: handleBuyMinutes (305-314) is a mock payment: it fires toast.success with description 'In production, this would integrate with Stripe for payment processing.' (verified). The 'Buy Additional Minutes' Purchase buttons (663, 679) charge nothing — a core payment flow is non-functional and surfaces a developer placeholder to the user.
  - FIX: Wire the Purchase buttons to the real Stripe checkout (src/lib/stripe-connect.ts), or hide the Buy Minutes section until billing is live. Remove the 'In production...' placeholder copy.
- **[HIGH] L580** (dead-handler)
  - PROBLEM: Upcoming-session action buttons 'Add to Calendar' (580), 'Reschedule' (583), and 'Cancel' (586) have no onClick. handleSessionAction('reschedule'|'cancel',...) exists (327-339) but is never wired, so a parent cannot manage a scheduled coaching session. Core scheduling flow.
  - FIX: Attach onClick={() => handleSessionAction('reschedule', session.id)} and 'cancel' to the respective buttons; wire Add to Calendar to AddToCalendarButtons (already used in CareCoordinationHub).
- **[MEDIUM] L836** (dead-handler)
  - PROBLEM: 'Export Summary' button (835-837) in the past-session detail has no onClick and does nothing when tapped.
  - FIX: Implement the export (PDF/clipboard) or remove the button.
- **[MEDIUM] L90** (dead-handler)
  - PROBLEM: App.tsx wires onBack={() => navigateToScreen('dashboard')} for the care-plan screen, but CareTab declares onBack in its props interface (50) yet never destructures it (signature at 90 omits onBack) and renders no back button (verified). Users on the care-plan screen have no in-screen way to go back.
  - FIX: Destructure onBack in the component signature and render a back control (ideally via the shared ScreenHeader onBack prop).
- **[MEDIUM] L460** (a11y)
  - PROBLEM: Icon-only message-composer buttons for Camera (460-462) and Paperclip (463-465) have no aria-label and no onClick. Both inaccessible to screen readers and non-functional.
  - FIX: Add aria-label='Attach photo' / aria-label='Attach file' and wire the handlers, or remove the buttons until attachments are supported.
- **[MEDIUM] L864** (layout-drift)
  - PROBLEM: Hand-rolled header (px-4 py-6, max-w-md mx-auto, purple Stethoscope tile) instead of the shared <ScreenHeader> (px-4 pt-3 pb-4). Padding/chrome drift from the other hub screens, and it omits the back button entirely (coupled to the missing-onBack finding above).
  - FIX: Replace with <ScreenHeader title='Care' subtitle='ABA-informed Behavior Coaching' onBack={onBack} icon={...} /> for consistent chrome and to surface the back control.

## src/components/ConversationalBooking.tsx
- **[CRITICAL] L135** (mock-data-visible)
  - PROBLEM: FALLBACK_PROVIDERS is a hardcoded fabricated provider ('Dr. Sarah Chen', BCBA-D, rating 4.9, 47 reviews, id 'bcba-1'), NOT gated behind isDemoMode(). It is assigned to the live providers state on EVERY failure/empty path of the real Supabase query: error (378), zero supported-state results (407), no rows (409), thrown exception (413), and as the final featuredProvider fallback (638). Verified. A real user with no providers in-region, or any DB hiccup, sees this fake clinician and can attempt to book a real paid session against non-existent provider id 'bcba-1'.
  - FIX: Gate FALLBACK_PROVIDERS behind isDemoMode() like ProviderMarketplace does with DEMO_PROVIDERS. In production, on empty/error set providers to [] and render a real empty state. Never let a fake provider id reach saveBookingToDatabase / Stripe.

## src/components/MedicationTracker.tsx
- **[CRITICAL] L167** (mock-data-visible)
  - PROBLEM: When Supabase returns no medications, the component injects fabricated MEDICAL records for the real user's child: 'Methylphenidate 10mg' by 'Dr. Johnson' at 'CVS Pharmacy', plus 'Melatonin 3mg' (167-193). Rendered via App.tsx:2967 with NO isDemoMode() gate and no sample-data banner. A parent opening Medication Tracker for an empty child sees a fake controlled-substance regimen and fake prescriber attributed to their child — a safety/trust hazard on a medical screen. Verified: empty state already exists at line 672.
  - FIX: Replace the demo-data fallback (167-193) with the existing 'No medications added' empty state (line 672). Only seed Methylphenidate/Dr. Johnson when isDemoMode() is true.
- **[HIGH] L756** (dead-handler)
  - PROBLEM: On the History tab, 'Export Report' (756/758) and 'Share with Provider' (760/762) have no onClick — inert (verified). 'Share with Provider' is a core medication-sharing flow in the component's own feature list (line 16). The tab body also says 'Coming soon' (753), so the entire History tab is non-functional in production.
  - FIX: Wire onClick for export/share or remove the buttons until implemented; if intentionally deferred, hide the History tab rather than shipping inert primary actions on a medical feature.
- **[LOW] L434** (a11y)
  - PROBLEM: Icon-only buttons lack aria-label: the close button (435, X icon only), and the Edit2 (716) / Trash2 (727) icon-only action buttons on each medication card. Screen-reader users hear only 'button'. (Hand-rolled screen does not get ScreenHeader's labeling for free.)
  - FIX: Add aria-label to the icon-only buttons, e.g. aria-label='Close', aria-label={`Edit ${med.name}`}, aria-label={`Delete ${med.name}`} at 435, 716, 727.

## src/components/ProviderApplication.tsx
- **[CRITICAL] L995** (copy-error)
  - PROBLEM: Provider Terms agreement states a flat '15% per session' platform fee; Key Terms (1004) and the rate helper (947, earnings = hourly_rate*0.85) repeat it. No 15% rail exists: src/lib/stripe-connect.ts PLATFORM_FEE_RATES is cash_pay 0.35 / insured 0.10 / aact_pilot 0.05 (verified), and sibling ProviderOnboarding correctly shows 35/10/5. A provider agreeing to '15%' is shown a fabricated, contractually wrong fee in a binding terms checkbox — a legal/financial misrepresentation.
  - FIX: Replace the hardcoded 15% references (947, 995, 1004) with the rail-based rates from PLATFORM_FEE_RATES and recompute the earnings helper from the correct rate, or remove the flat-rate earnings line and link to the canonical fee schedule.
- **[HIGH] L1008** (copy-error)
  - PROBLEM: Key Terms list claims 'HIPAA-compliant telehealth platform included'; same absolute claim on the benefits card 'HIPAA Compliant' (1056). Aminy standard requires 'HIPAA-conscious', not an absolute compliance assertion.
  - FIX: Change 'HIPAA-compliant telehealth platform' to 'HIPAA-conscious telehealth platform' (1008) and the benefits card 'HIPAA Compliant' to 'HIPAA-conscious' (1056).
- **[MEDIUM] L196** (runtime-risk)
  - PROBLEM: NPI-required validation array includes 'pt' (196: ['bcba','psychologist','therapist','slp','ot','pt']) but 'pt' is not a member of this form's ProviderType union (PROVIDER_TYPES at 79-87 define bcba|bcaba|rbt|psychologist|therapist|slp|ot). The 'pt' entry is unreachable, and bcaba is silently excluded from the NPI requirement — the list appears copied from a different type set.
  - FIX: Remove the unreachable 'pt' and confirm the intended required set against the actual ProviderType union (decide whether bcaba should require NPI).
- **[MEDIUM] L993** (dead-handler)
  - PROBLEM: On the final Review/Submit step, the three legal links the provider must agree to — 'Provider Terms of Service', 'Privacy Policy', 'Platform Fee Agreement' (993-995) — all use href='#'. The user is asked to legally accept documents that are not reachable. Core onboarding/legal-consent dead link.
  - FIX: Point each link to the real Terms/Privacy/Fee Agreement routes (the landing page already uses /?screen=terms-of-service and /?screen=privacy-policy) or open the documents in a modal before allowing consent.
- **[LOW] L604** (a11y)
  - PROBLEM: The State <select> on Step 2 has no associated label or aria-label (the visible 'State *' text at 601 is a sibling <label> with no htmlFor and the select has no id), so screen readers do not announce the field. Same for the rate input at 937 inside the Review step.
  - FIX: Add htmlFor/id linkage or aria-label='License state' to the select (604) and an aria-label to the session-rate input (937).

## src/components/ProviderPortal.tsx
- **[CRITICAL] L461** (mock-data-visible)
  - PROBLEM: When the provider_sessions query returns zero rows, the code falls through to push hardcoded demo sessions for 'Emma Thompson'/'Jennifer Thompson' and 'Liam Chen'/'David Chen' (461-486). NOT gated by isDemoMode() — runs for any real provider with no sessions. A brand-new real provider sees fabricated patients on the Dashboard and Sessions tab, contradicting the Clients tab which correctly shows an empty state (1165). Verified: ungated `if (sessionsList.length === 0)` block.
  - FIX: Remove the demo-session fallback block (461-486) so existing empty states render. If demo data is wanted for sales, gate it behind isDemoMode() from src/lib/demo-seed.ts.
- **[CRITICAL] L1460** (mock-data-visible)
  - PROBLEM: The Earnings tab 'Recent Sessions' list is a fully hardcoded array of fake patients and fabricated dollar amounts: Emma Thompson $99 (pending), Liam Chen $99, Noah Williams $99, Emma Thompson $175 (1460-1465). Always rendered — no DB source, no isDemoMode() gate — so every real provider sees fake earnings/transactions and fictitious client names on a financial screen. Verified.
  - FIX: Replace the hardcoded array with real transaction data (provider_earnings / provider_sessions) and add a 'No sessions yet' empty state. Do not ship fabricated patient names and amounts to real users.
- **[HIGH] L2051** (copy-error)
  - PROBLEM: Risky payment guarantees: 'Configure your bank account for guaranteed biweekly payments via Aminy' (2051) and 'You get paid biweekly regardless of payer timing.' (2074, Claims tab) (verified). These promise unconditional payout timing the platform may not honor.
  - FIX: Soften to non-guarantee wording, e.g. 'Set up direct deposit to receive payouts on a biweekly schedule' and 'Aminy aims to pay biweekly; timing may vary with payer processing.' Remove 'guaranteed' and 'regardless of payer timing.'
- **[MEDIUM] L1436** (mock-data-visible)
  - PROBLEM: Fabricated trend percentages are hardcoded next to real earnings: 'This Month' trend '+12%' (1436) and 'YTD Total' '+18%' (1439). Static literals unrelated to actual earnings; a real provider sees an invented growth metric presented as fact on the Earnings cards.
  - FIX: Compute the trend from thisMonth vs lastMonth (and a real YTD baseline), or remove the trend chips until real comparison data exists.
- **[MEDIUM] L848** (mock-data-visible)
  - PROBLEM: The notification bell renders a hardcoded unread badge of '3' (847-849) with no backing data, and the bell button has no onClick (840-850). Every provider sees a permanent fake '3 notifications' indicator that does nothing when tapped.
  - FIX: Wire the badge to a real unread-notification count (hide when 0) and add an onClick to open the notifications panel, or remove the static badge.
- **[LOW] L1338** (dead-handler)
  - PROBLEM: TelehealthSessionEngine's onStartSession callback is a no-op stub: it ignores the config and just calls setActiveTab('sessions') with a 'TODO: create Daily.co room' comment (1338-1341). Starting a session is a core flow, but the handler does not create or join a room — the provider is silently bounced back to the Sessions tab.
  - FIX: Implement room creation/navigation in onStartSession (create the Daily.co room from config and route to the video room), or disable the start affordance until implemented.
- **[LOW] L529** (runtime-risk)
  - PROBLEM: In loadProviderData the provider stats update reads earningsThisMonth: earnings.thisMonth (529) from the closure's stale 'earnings' state, not the freshly computed values just passed to setEarnings (513-518). Because setState is async, provider.earningsThisMonth lags one refresh behind (stays 0 on first load), so the Dashboard 'Earnings' stat (1027) shows a stale/zero figure even when earnings exist.
  - FIX: Use the locally computed monthly total (the rounded thisMonth value) when calling setProvider, rather than reading from the not-yet-updated 'earnings' state.

## src/components/SettingsScreen.tsx
- **[CRITICAL] L1461** (mock-data-visible)
  - PROBLEM: Hardcoded fake insurance PHI shown to real users. hasInsurance defaults to true (line 130), so the Privacy & Data section renders an 'Insurance Information' card whose 'View' reveals fabricated data: Plan 'Blue Cross Blue Shield', Member ID '••••••6789', Group 'GRP123' (1461-1463). Not gated behind isDemoMode() — every user sees fake coverage presented as their own on-file insurance. Verified.
  - FIX: Load real insurance from Supabase and render only when present; default hasInsurance to false until data loads. If no real data exists, show a 'No insurance on file' state instead of the hardcoded BCBS/Member ID/Group block.
- **[LOW] L459** (mock-data-visible)
  - PROBLEM: Data export shows a fake progress bar: handleExportData uses a setInterval that increments exportProgress by 10 every 500ms up to 90% ('// Simulate export progress', verified at 459) independent of the actual Supabase fetch. The percentage shown is fabricated, not tied to real export progress.
  - FIX: Drive the progress indicator from real fetch milestones, or replace the percentage bar with an indeterminate spinner so the UI does not present a fabricated progress value.

## src/components/analytics/OutcomesDashboard.tsx
- **[CRITICAL] L101** (mock-data-visible)
  - PROBLEM: MOCK_PROVIDERS hardcodes fabricated provider identities (Dr. Sarah Chen BCBA-D, Marcus Williams, Priya Kapoor, James Torres RBT, Alicia Monroe) with fake client counts/outcome scores. Rendered for real users via App.tsx:3575 with NO isDemoMode() gate and no 'sample data' banner; fetchData() keeps these rows even when Supabase returns real data (comment line 347). Verified: providers seeded as initial state at 300, no isDemoMode import anywhere in file. A real user sees a Provider Performance table full of invented clinicians.
  - FIX: Gate all MOCK_* constants behind isDemoMode() from src/lib/demo-seed.ts; when not in demo mode and Supabase is empty, render empty states. At minimum the provider table (489-526) must not show invented BCBA names to production users.
- **[CRITICAL] L62** (mock-data-visible)
  - PROBLEM: MOCK_KPI/MOCK_WEEKLY/MOCK_PROGRAMS render fabricated platform metrics (47 active clients, 312 sessions, 68% mastery, '+50pp' trend at 431, program trial counts) shown verbatim to real users; the footer (531) and subtitles state them as fact. No 'Sample data' banner, unlike sibling screens. Verified: kpi/weekly seeded from MOCK_* as initial state (296-297).
  - FIX: Add a 'Sample data' banner when real data is absent and/or gate behind isDemoMode(). Do not present hardcoded counts as live platform metrics in the footer/subtitles.
- **[LOW] L360** (layout-drift)
  - PROBLEM: Hand-rolled header (360-379) instead of the shared <ScreenHeader>. Uses px-4 py-4 (standard is px-4 pt-3 pb-4), a different back-button icon (ArrowLeft vs ScreenHeader's ChevronLeft), and a center-aligned title — visibly inconsistent chrome vs other hub screens.
  - FIX: Replace the custom header with <ScreenHeader title={providerId ? 'Provider Outcomes' : 'Platform Outcomes'} onBack={onBack} actions={<refresh button>} />.

## src/components/provider/ProviderPayoutSetup.tsx
- **[CRITICAL] L83** (runtime-risk)
  - PROBLEM: PracticeInfoSection queries/upserts provider_profiles keyed on a nonexistent column 'provider_id': .eq('provider_id', providerId) (83), .upsert(...,{onConflict:'provider_id'}) with provider_id in payload (113,121). The table's PK is 'id' and ProviderPortal queries .eq('id', providerId) (312/315) (verified). The select silently returns no row (forcing edit mode, 94) and the upsert fails — NPI, taxonomy code, and practice name (billing-critical) never load or save.
  - FIX: Use the correct key column 'id': .eq('id', providerId), upsert with { id: providerId, ... } and { onConflict: 'id' }, mirroring ProviderPortal's column names for this table.
- **[MEDIUM] L148** (layout-drift)
  - PROBLEM: The Practice Information subsection uses off-brand raw blue while the rest of the screen uses brand teal #43AA8B: Building2 icon 'text-blue-600' on 'bg-blue-50' (141), Edit button 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' (148), and input/select focus rings 'focus:ring-blue-400' (189,205,221). Not part of a deliberate gradient — an inconsistent accent on a teal-branded screen.
  - FIX: Replace the blue accent classes with teal equivalents (teal-50/teal-600/teal-700, focus:ring-teal-400 or the #43AA8B token) to match the rest of ProviderPayoutSetup.

## src/components/provider/SessionPayoutTrigger.tsx
- **[CRITICAL] L181** (copy-error)
  - PROBLEM: The payout breakdown hardcodes 'Platform fee (10%)' but the dollar amount comes from calculateProviderAmount(sessionAmountCents, rail) where rail defaults to 'cash_pay'=35% (verified in stripe-connect.ts). With wired sessionAmountCents=15000 ($150) it shows '-$52.50' next to literal '(10%)' and 'Provider receives $97.50' — the label contradicts the math on a payment-release screen. 10% is correct only for the insured rail.
  - FIX: Derive the label from the rail: const feePct = Math.round(getPlatformFeeRate(rail)*100); render `Platform fee (${feePct}%)`. Never hardcode '10%' when the fee is rail-parameterized.

## src/components/FreeScreeningFlow.tsx
- **[HIGH] L114** (copy-error)
  - PROBLEM: Insight card shown to every real user mid-screening states 'Everything you share is HIPAA-protected and encrypted.' — an absolute HIPAA guarantee. Verified that SplashPage:470 deliberately uses 'HIPAA-Conscious', so this line is both a risky compliance claim and inconsistent with the rest of the product (LoginScreen, SplashScreen also use the softer wording).
  - FIX: Reword to remove the guarantee, e.g. 'Everything you share is encrypted and handled with HIPAA-conscious privacy practices. You control who sees it.' Match the 'HIPAA-conscious' wording used elsewhere.

## src/components/JrKidMode.tsx
- **[HIGH] L534** (runtime-risk)
  - PROBLEM: ModuleInterface builds Tailwind classes from runtime template literals: bg-gradient...from-${config.color}-50... (534), bg-${config.color}-500 (564,607), text-${config.color}-500 (626), hover:bg-${config.color}-600 (607). Tailwind v4 JIT only emits classes found as complete static strings (per project CLAUDE.md), so these dynamic classes are never generated — every activity screen (speech/social/sensory/routines) renders with no background, an unstyled icon circle, and a colorless CTA. The team already knows this breaks (comment at line 206) but fixed only the rewards grid.
  - FIX: Use a static lookup map like rewardColors at line 207 (moduleColors[config.color] = { bg, gradient, hover, text }) and apply complete class strings, or use inline style/brand hex. Apply to 534, 564, 607, 626.
- **[MEDIUM] L291** (runtime-risk)
  - PROBLEM: The token badge renders {tokens} raw at 291 (and 190 in the rewards header). The tokens prop is optional (interface line 39) and is NOT defaulted in the destructure (49). If a caller omits it, the badge renders 'undefined'/nothing in a child-facing UI. Token math elsewhere guards with tokens ?? 0 (101,134,135,223) but these two display sites do not.
  - FIX: Default the prop (tokens = 0) in the destructure at line 49, or render {tokens ?? 0} at 190 and 291.
- **[LOW] L332** (runtime-risk)
  - PROBLEM: Reduced-motion hover fallbacks use non-existent Tailwind shades: hover:bg-blue-150 (332), hover:bg-green-150 (344), hover:bg-purple-150 (356), hover:bg-orange-150 (368), hover:bg-pink-150 (380). The default Tailwind scale has no -150 step and none exist in index.css, so users with prefers-reduced-motion get no hover feedback on the activity tiles.
  - FIX: Use a valid shade (e.g. hover:bg-blue-200) for the reduced-motion branch on 332, 344, 356, 368, 380.
- **[LOW] L329** (responsive)
  - PROBLEM: Duplicate/contradictory gap utilities on the activity grid: className contains both 'gap-3 sm:gap-4 sm:gap-6' (329, and again at 204 in the rewards grid). Two sm: gap values means only the last wins; the intended gap-4 at sm is silently dropped.
  - FIX: Pick one responsive gap scale, e.g. 'gap-3 sm:gap-6', on lines 204 and 329.

## src/components/PayerOutcomesDashboard.tsx
- **[HIGH] L577** (copy-error)
  - PROBLEM: Hardcoded controlled-study efficacy claim presented as fact to payers/MCOs: 'Families using Aminy achieve goals 23% faster than control group.' No cited or gated study; a fabricated clinical-research result. It sits OUTSIDE the page's 'pilot sample metrics' disclosure (241-243), which covers metric values only — not a control-group assertion. Payer/admin users evaluating value-based contracts would read this as a real RCT outcome.
  - FIX: Remove the control-group comparison or replace with disclosed, sourced language. Do not assert a control-group result without a cited study.
- **[MEDIUM] L500** (copy-error)
  - PROBLEM: Member Satisfaction (metrics.memberSatisfaction, which defaults to the fabricated 92% from DEFAULT_METRICS when no live metrics prop is passed — the actual case in App.tsx:3123) is captioned 'Based on quarterly CAHPS surveys.' This attributes placeholder data to a specific named real-world survey instrument, contradicting the page's own disclosure of pilot sample metrics. Misleading provenance.
  - FIX: Condition the 'Based on quarterly CAHPS surveys' caption so it only appears when real CAHPS-sourced data is connected (when providedMetrics is present), consistent with the providedMetrics provenance branching at 136-145.
- **[MEDIUM] L652** (missing-empty-state)
  - PROBLEM: The Claim-Ready Queue (Claims Ops tab) renders cases via visibleClaimQueue.map(...) with no empty-state branch. When claimQueue is empty — the realistic state, since the backing claim_ready_cases/denial_records tables/RLS migrations are not deployed (per project CLAUDE.md) — the Card body renders completely blank (the trailing 'additional cases' notice at 703 is also gated on 0>0=false). The user sees the heading and Queue Health all-zeros with an empty white card and no explanation.
  - FIX: Add an empty-state branch: when visibleClaimQueue.length === 0, render a message (e.g. 'No claim-ready cases for the {marketLabel} lane yet') inside the queue Card.

## src/components/ProviderLanding.tsx
- **[HIGH] L126** (mock-data-visible)
  - PROBLEM: Real users see a fabricated provider on the public landing hero: 'Dr. Sarah Mitchell, BCBA, LBA', rating '4.9 (127 reviews)', plus fabricated metrics '42 Active Clients', '$8.2k This Month', '98% Satisfaction' (130-146). Invented marketing data presented as a real verified provider, not gated behind isDemoMode().
  - FIX: Label the card explicitly as an illustrative example ('Sample profile') or replace with a real opted-in provider. Do not present invented client counts, earnings, and review counts as real.
- **[HIGH] L385** (mock-data-visible)
  - PROBLEM: Three fabricated testimonials with fake named people and invented outcomes shown to real users: 'Dr. Emily Chen, Clinical Psychologist', 'Marcus Johnson, BCBA' (claim 'I've grown my practice 3x since joining Aminy'), 'Sarah Williams, SLP, CCC-SLP' (385-401). Fabricated endorsements with an unsubstantiated 3x metric on a pre-launch product.
  - FIX: Remove the fabricated testimonials or replace with real, attributable provider quotes. Do not ship invented named endorsements or the '3x practice growth' claim.
- **[HIGH] L221** (copy-error)
  - PROBLEM: Public marketing feature card states 'HIPAA-compliant video sessions integrated directly into the platform.' Violates the HIPAA-conscious standard with an absolute compliance claim on a public page.
  - FIX: Change 'HIPAA-compliant video sessions' to 'HIPAA-conscious video sessions'.
- **[LOW] L366** (mock-data-visible)
  - PROBLEM: Earnings calculator presents specific projected figures ('$2,250' weekly, '= $9,000/month or $108,000/year', 363-366) as a concrete 'BCBA Earnings Example' on a public marketing page. Combined with the rate ranges, this implies guaranteed-looking earnings without a disclaimer — borderline representation risk for a healthcare-services marketplace.
  - FIX: Label clearly as a hypothetical illustration with a disclaimer ('Example only; actual earnings vary'), which the card currently lacks.
- **[LOW] L291** (layout-drift)
  - PROBLEM: Typo'd flex utility 'items-flex-start' on the desktop 'How It Works' row. 'items-flex-start' is not a valid Tailwind/CSS class (valid is 'items-start'); the class is a no-op so the intended alignment is silently not applied.
  - FIX: Replace 'items-flex-start' with 'items-start'.

## src/components/ProviderMarketplace.tsx
- **[HIGH] L1444** (copy-error)
  - PROBLEM: Trust footer asserts 'HIPAA Compliant', shown to every real user at the bottom of the marketplace. Per the standard a hard 'HIPAA-compliant' claim should be softened.
  - FIX: Change the badge text from 'HIPAA Compliant' to 'HIPAA-conscious' (or 'HIPAA-aligned practices').
- **[MEDIUM] L478** (mock-data-visible)
  - PROBLEM: generateMockProviders() defines 9 fully fabricated providers (Dr. Sarah Chen BCBA-D, Marcus Johnson, Ashley Thompson, Dr. Emily Rodriguez, etc.) but is never called anywhere — verified dead code (zero call sites; real data comes from the Supabase query / isDemoMode()-gated DEMO_PROVIDERS at 270-271). Not user-visible today, but a production-cleanup hazard: any future re-wire (like the catch-block fallback already present in ConversationalBooking) would expose fabricated clinicians.
  - FIX: Delete generateMockProviders() (and the now-unused generateAvailability helper if only used by mock data) so fabricated providers cannot be accidentally surfaced. Demo walkthroughs are already served by isDemoMode()/DEMO_PROVIDERS.

## src/components/ProviderOnboarding.tsx
- **[HIGH] L618** (copy-error)
  - PROBLEM: Aminy Network track description makes a 'Guaranteed biweekly pay.' claim. 'Guaranteed' is a risky/absolute claim; for a marketplace that gates payouts on verification and live-market status, guaranteeing pay is a compliance/legal risk.
  - FIX: Soften 'Guaranteed biweekly pay.' to 'Biweekly payouts.' or 'Reliable biweekly payouts.'
- **[LOW] L396** (copy-error)
  - PROBLEM: Onboarding header subtitle restricts the network to 'AZ, MT, or TX' ('Join the supported-state provider network in AZ, MT, or TX'), but the services-step Aminy Network track copy (618) lists payer access 'across AZ, MT, FL, NV, and TX'. The supported-state set is stated inconsistently within the same flow, and both are hardcoded rather than derived from SUPPORTED_PROVIDER_STATES (rendered dynamically at 568).
  - FIX: Drive both strings from SUPPORTED_PROVIDER_STATES so the launch-state list is consistent, or reconcile the two hardcoded lists.

## src/components/RecordsVault.tsx
- **[HIGH] L854** (dead-handler)
  - PROBLEM: Bulk Delete fakes success on real PHI documents: the bulk Delete button (854-862) calls confirm() then toast.success('${n} records deleted') and clears selection but performs NO deletion (deleteVaultDocument is never called). Same for bulk Archive (847-853) and bulk Share (840-846), which only toast. The user is told records were permanently deleted but they remain in storage — a misleading destructive action on a health vault.
  - FIX: Wire bulk Delete to deleteVaultDocument() for each selected id and refresh; wire Archive/Share to real mutations or remove the buttons. Do not show success toasts for actions that did not occur.
- **[HIGH] L552** (runtime-risk)
  - PROBLEM: Default record sort is broken for all real data. The Supabase->record mapping (444-456, 490-502) sets `date` but never `createdAt`. The default 'newest' (519) and 'oldest' comparator reads new Date(b.createdAt).getTime() (552-554); with createdAt undefined, getTime() is NaN, so every comparison is NaN and records render in unstable order.
  - FIX: Add createdAt: doc.uploadedAt || new Date().toISOString() to both map blocks, or change the comparator to sort on the populated `record.date` (the field the display row at line 228 reads).
- **[HIGH] L230** (runtime-risk)
  - PROBLEM: Every record shows a garbage file size. The map sets files[0].size to a STRING like '123 KB' or '—' (452, 498), but the type declares size:number (79) and formatFileSize (177-183) runs Math.log/Math.pow on it. Called at 230 as formatFileSize(record.files[0]?.size || 0) with a string, Math.log('123 KB') is NaN, so the row shows 'NaN undefined'.
  - FIX: Map `size` as a number (raw doc.fileSize bytes) so formatFileSize can format it; drop the '—' string fallback or guard formatFileSize against non-numeric input.
- **[MEDIUM] L964** (runtime-risk)
  - PROBLEM: View Record modal maps files with key={file.id} (964-965), but the mapped files[] objects never include an id (map blocks at 452, 498 set only name/size/type). React keys are all undefined, producing duplicate-key warnings and unstable reconciliation. The array also lacks url/uploadedAt that the EnhancedVaultRecord.files type (74-81) declares.
  - FIX: Include id (and url/uploadedAt) when mapping doc->files, or key on file.name/index. Align the mapped file object with the declared files[] shape.
- **[MEDIUM] L535** (dead-handler)
  - PROBLEM: Full-text 'search inside docs' silently never matches. The placeholder promises 'Search titles, tags, or text inside docs…' (607) and the filter checks record.vaultText?.toLowerCase().includes(...) (535), but vaultText is never populated in the Supabase->record mapping (444-456, 490-502), so content search always falls back to title/type. The advertised in-document search is dead.
  - FIX: Populate vaultText from the OCR/extracted-text column when mapping, or remove the 'text inside docs' promise from the placeholder until OCR search is wired.
- **[LOW] L779** (copy-error)
  - PROBLEM: Sort dropdown is missing the 'Z–A' option even though 'z-a' is a valid sortBy state handled in the comparator (557). The SelectContent only lists Newest/Oldest/A–Z (779-782), so users can never reach the implemented Z–A sort.
  - FIX: Add <SelectItem value='z-a'>Z–A</SelectItem> to the Sort dropdown, or remove the unused 'z-a' branch.
- **[LOW] L250** (dead-handler)
  - PROBLEM: The per-row 'More actions' (MoreVertical) button only fires a toast listing actions that don't exist: toast.success('More actions: Rename, Move to..., Link to Goal/Session, Download, Delete') (250-253). It opens no menu — it advertises capabilities the UI cannot perform.
  - FIX: Replace with a real dropdown menu wired to rename/move/download/delete handlers, or remove the button until the menu exists.
- **[LOW] L173** (copy-error)
  - PROBLEM: Off-brand raw Tailwind color: the image file icon uses 'text-blue-500' (173), which is a valid class but outside the Aminy palette (teal #43AA8B / slate #577590 / cream / peach) and not part of a deliberate gradient.
  - FIX: Use a brand token (e.g. text-[#577590] slate) or muted-foreground for the image file icon to stay on-brand with the PDF (red) / generic (gray) icon set.

## src/components/AnalyticsCharts.tsx
- **[MEDIUM] L524** (mock-data-visible)
  - PROBLEM: The 'Pattern Insights' card states fabricated clinical claims as the child's real data: 'Morning transitions have improved 15% over the past 2 weeks' (530), 'Peak activity occurs between 4-8pm' (527), 'Bedtime routine shows consistent improvement' (533). Hardcoded strings not derived from chartData, sitting far below the 'Sample Data' banner at 401, so a scrolling parent reads invented progress about their child as fact. The '+12% this week' badge (435) is likewise hardcoded.
  - FIX: Derive insights from chartData, or remove the static Insights card / +12% badge in non-demo mode; the top banner does not cover claims this far down the scroll.

## src/components/AskABCBA.tsx
- **[MEDIUM] L148** (copy-error)
  - PROBLEM: User-facing copy makes a hard turnaround guarantee: 'AI draft instantly · BCBA-verified within 24 hours' (148), repeated as 'BCBA-signed within 24 hours' (216), in the empty state (229), and in the submit toast 'BCBA review within 24h' (117). A guaranteed clinician response-time SLA is a risky claim that may not hold operationally.
  - FIX: Soften to non-guaranteed phrasing, e.g. 'AI draft instantly · BCBA review, typically within 24 hours', with matching changes at 117, 216, 229.
- **[LOW] L136** (layout-drift)
  - PROBLEM: Header markup is hand-rolled (136-151), and the ThreadDetail sub-view repeats a second hand-rolled header (264-273), instead of using the shared <ScreenHeader> (px-4 pt-3 pb-4). Drifts from the standardized chrome.
  - FIX: Use <ScreenHeader> for both the list view and the ThreadDetail header.

## src/components/CommunityForYou.tsx
- **[MEDIUM] L852** (dead-handler)
  - PROBLEM: Multiple inert buttons: 'Join Now' for a LIVE Q&A session (853) has no onClick — joining a live BCBA session is a core community action; the ExternalLink on upcoming sessions (867), 'Browse' past-archive (887), the Events 'Filter' (630), and the spotlight 'Share' (789) are all handler-less. 'Join Now' / 'Browse' are advertised core features that do nothing.
  - FIX: Wire onClick for 'Join Now' (open session URL) and the archive 'Browse' at minimum; remove or disable the Filter/ExternalLink/Share buttons until implemented.
- **[LOW] L168** (mock-data-visible)
  - PROBLEM: DEFAULT_POSTS hardcodes fabricated authors/engagement: 'Dr. Lisa Chen, OT' (186) with 567 likes, plus 'Aminy Care Team'/'Aminy BCBA Team' with invented like counts, rendered in the For You tab by default. Mitigated (not critical) because a 'Preview — sample data' banner shows at 899-901, but the fabricated individual clinician name 'Dr. Lisa Chen, OT' still reads as a real credentialed author.
  - FIX: Move DEFAULT_POSTS behind isDemoMode(), or replace the fake clinician byline with a generic 'Aminy Editorial' attribution; rely on the existing empty state (478) for real users.
- **[LOW] L908** (a11y)
  - PROBLEM: Icon-only back button (908-913, ArrowLeft only) and the icon-only ExternalLink button (867) have no aria-label. Screen readers announce them as unlabeled 'button'.
  - FIX: Add aria-label='Back' to the back button (908) and a descriptive aria-label to the ExternalLink button (867).

## src/components/MyAppointments.tsx
- **[MEDIUM] L466** (dead-handler)
  - PROBLEM: onBack is destructured (466) but never rendered in the header (483-529) — there is no back button on the my-appointments screen even though App.tsx passes onBack={() => navigateToScreen('dashboard')}.
  - FIX: Render a back button in the header (or adopt ScreenHeader with onBack).
- **[LOW] L482** (layout-drift)
  - PROBLEM: Page background is bg-gray-50 and the header is hand-rolled (px-4 py-4, bg-white border-gray-200) rather than the shared <ScreenHeader> chrome and the brand cream #FAF7F2 used by sibling screens CareCoordinationHub and AskABCBA. Visual inconsistency across the hub screens.
  - FIX: Use the brand cream background and the shared ScreenHeader to match CareCoordinationHub/AskABCBA.

## src/components/PricingTiers.tsx
- **[MEDIUM] L231** (copy-error)
  - PROBLEM: The Annual toggle shows a hardcoded '· save 28%' badge applied globally, but 28% is only accurate for Core (179.88 vs 129 = 28.3%). Pro saves ~22.5% (359.88 vs 279) and Family ~20.2% (599.88 vs 479). A user reading the Pro or Family card sees an overstated 'save 28%' — a misleading pricing claim.
  - FIX: Compute savings per tier from tierPricing (each TierCard carries priceMonthly/priceAnnual), or change the global copy to a non-numeric phrase like 'save up to 28%' / 'best value annually'.

## src/components/SplashPage.tsx
- **[MEDIUM] L512** (copy-error)
  - PROBLEM: Live landing page value-prop badge reads '24/7 AI Support' / 'Always there for you' (verified). A round-the-clock support claim of the type the standard flags as risky; for a behavioral-health product it implies crisis coverage the app does not guarantee.
  - FIX: Soften to an honest capability statement, e.g. 'AI guidance, anytime' / 'Here whenever you need it', avoiding the literal '24/7' framing. Keep 911/988 crisis routing as the real escalation path (already in the screening disclaimer).

## src/components/AACTPartnerSetup.tsx
- **[LOW] L171** (copy-error)
  - PROBLEM: User-facing copy renders the system-of-record product name as the raw lowercase enum from config.systemOfRecord. For partnerOrg='aact' (App.tsx:2684), PARTNER_CONFIGS.aact.systemOfRecord==='rethink', so the bullet reads 'Sync with rethink — sessions, notes, claims auto-flow' and the invite-card sentence (162) reads '...rethink sync...'. The product is 'Rethink' (proper noun); the adjacent evvSystem is correctly upper-cased (172), so this is inconsistent. Seen by Cori at AACT.
  - FIX: Map config.systemOfRecord to a display label (rethink -> 'Rethink', centralreach -> 'CentralReach', aminy_native -> 'Aminy') before rendering at 162 and 171, rather than printing the raw enum.
- **[LOW] L131** (layout-drift)
  - PROBLEM: Hand-rolled header markup (131-146: px-4 pt-3 pb-4 bg-white border-b + back button + 12x12 gradient icon + title/subtitle) re-implements the shared ScreenHeader. This instance's title is NOT truncated (no truncate class), unlike ScreenHeader's h1, so a long config.displayName wraps differently here than on sibling screens.
  - FIX: Use <ScreenHeader title={`${config.displayName} Provider Onboarding`} subtitle={`One-click invites · CSV import · ${config.payoutRail.replace('_',' ')} contract auto-applied`} icon={<Building2 className='w-6 h-6' />} onBack={onBack} variant='flat' /> instead of the hand-rolled block.

## src/components/CareCoordinationHub.tsx
- **[LOW] L157** (layout-drift)
  - PROBLEM: Header markup is hand-rolled (157-179) duplicating the back button, gradient icon tile, and title block instead of using the shared <ScreenHeader> (px-4 pt-3 pb-4). ScreenHeader's own doc comment names CareCoordinationHub as a screen that should use it, so this is exactly the drift it was created to prevent.
  - FIX: Replace the hand-rolled header div with <ScreenHeader title='Care Coordination' subtitle={...} onBack={onBack} icon={<ShieldCheck className='w-6 h-6' />} actions={<AISparkleButton .../>} />.

## src/components/OrgAdminDashboard.tsx
- **[LOW] L168** (layout-drift)
  - PROBLEM: Hand-rolled header markup (167-186: px-4 pt-3 pb-4 bg-white border-b, back button, 12x12 gradient icon + title) duplicates the shared ScreenHeader (src/components/ui/ScreenHeader.tsx) instead of using it. The no-org fallback header at 145 uses pt-3 pb-2, already inconsistent with this pb-4 instance — exactly the drift ScreenHeader exists to stop.
  - FIX: Replace the hand-rolled block (167-186) with <ScreenHeader title={org.name} onBack={onBack} icon={<Building2 className='w-6 h-6' />} actions={...badges} variant='flat' />, moving the plan/status badges into the actions slot.

## src/components/SplashScreen.tsx
- **[LOW] L140** (copy-error)
  - PROBLEM: Button label says 'Start Your 7-Day Free Trial' (140, also 205) while the aria-label says 'Start your 14-day free trial - no credit card needed' (138, 203) — visible CTA and screen-reader announcement disagree, and both contradict the live SplashPage/CreateAccountScreen 14-day trial. Verified dead code: SplashScreen.tsx is imported only by its own test file, not rendered anywhere (live splash is SplashPage.tsx). Not user-visible today but ships an inconsistent claim if re-wired.
  - FIX: Either delete the orphaned SplashScreen.tsx, or align the copy so the visible text and aria-label both say '14-day' (138, 140, 203, 205) to match SplashPage/CreateAccountScreen.

## src/components/provider/ProviderApplication.tsx
- **[LOW] L584** (layout-drift)
  - PROBLEM: On Step 2 the License Number/State fields are forced into 'grid-cols-2' with no responsive breakdown (also License Expiry/NPI at 617). At 375px the two inputs plus their left icon padding (pl-10) are cramped; the date and NPI inputs clip/overflow within a ~165px column. The rest of the form uses responsive 'grid-cols-2 sm:grid-cols-3', so these fixed 2-col rows drift.
  - FIX: Make these rows stack on mobile, e.g. 'grid grid-cols-1 sm:grid-cols-2 gap-4', so the date and NPI fields are not clipped at 375px.
