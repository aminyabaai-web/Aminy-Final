/* Aminy Provider OS (B2B) — desktop practice app. Loads ../lib.jsx for primitives.
   Efficient, data-dense, same bones as the parent app — more signal. Violet = clinical accent. */
(function () {
  const R = React;
  const { Button, Badge, Card, Stat, Avatar, Input } = window.AminyKit;

  const I = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>,
    notes: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8M8 17h5"/></>,
    billing: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    sparkles: <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></>,
    check: <path d="M20 6 9 17l-5-5"/>,
    clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    timer: <><path d="M10 2h4"/><path d="M12 14v-4"/><circle cx="12" cy="14" r="8"/></>,
    pin: <><path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
    play: <path d="M6 4v16l14-8z" fill="currentColor" stroke="none"/>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>,
    chart: <><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></>,
    grad: <><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5"/></>,
  };
  const Ico = ({ n, s = 20, w = 2, style }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={style}>{I[n]}</svg>;

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: "grid" },
    { id: "clients", label: "Clients", icon: "users" },
    { id: "credentialing", label: "Credentialing", icon: "shield" },
    { id: "notes", label: "AI Notes", icon: "notes" },
    { id: "review", label: "Sign-off", icon: "shield" },
    { id: "messages", label: "Messages", icon: "inbox" },
    { id: "billing", label: "Billing", icon: "billing" },
    { id: "payer", label: "Payer Scorecard", icon: "chart" },
    { id: "evv", label: "Visit Verify", icon: "clock" },
    { id: "supervision", label: "Supervision", icon: "grad" },
    { id: "schedule", label: "Schedule", icon: "calendar" },
  ];

  function Sidebar({ active, onNav }) {
    return (
      <aside style={{ width: 248, flexShrink: 0, background: "#fff", borderRight: "1px solid var(--color-border)", color: "var(--color-text)", display: "flex", flexDirection: "column", padding: "24px 16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px 4px" }}>
          <img src="../../assets/aminy_logo.png" alt="Aminy" style={{ height: 26, width: "auto", display: "block" }} />
        </div>
        <div style={{ padding: "0 8px", marginBottom: 22 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--aminy-teal-700)" }}>for Providers</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((n) => {
            const on = n.id === active;
            return (
              <button key={n.id} onClick={() => onNav(n.id)} style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 11, border: 0, cursor: "pointer", background: on ? "var(--aminy-teal-50)" : "transparent", color: on ? "var(--aminy-teal-800)" : "var(--aminy-navy-500)", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: on ? 600 : 500, textAlign: "left" }}>
                {on && <span style={{ position: "absolute", left: 0, top: 9, bottom: 9, width: 3, borderRadius: "0 3px 3px 0", background: "var(--aminy-teal-600)" }} />}
                <Ico n={n.icon} s={18} w={on ? 2.2 : 1.8} /> {n.label}
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 11, padding: "11px 10px", background: "var(--aminy-navy-50)", borderRadius: 13 }}>
          <Avatar name="Ana Morales" tone="teal" size={36} />
          <div style={{ lineHeight: 1.3, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-strong)" }}>Dr. Morales</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>BCBA · Rise Pediatric Therapies</div>
          </div>
          <Ico n="settings" s={16} style={{ color: "var(--color-text-subtle)" }} />
        </div>
      </aside>
    );
  }

  function Topbar({ title }) {
    return (
      <div style={{ height: 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", borderBottom: "1px solid var(--color-border)", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 21, letterSpacing: "-0.025em", color: "var(--color-text-strong)", WebkitFontSmoothing: "antialiased" }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 15px", background: "#fff", border: "1px solid var(--color-border-strong)", borderRadius: 999, color: "var(--color-text-muted)", width: 248 }}>
            <Ico n="search" s={16} /> <span style={{ fontSize: 13 }}>Search clients, claims…</span>
          </div>
          <Button variant="primary" size="sm" style={{ background: "var(--aminy-teal-600)" }} icon={<Ico n="sparkles" s={16} />}>New note</Button>
        </div>
      </div>
    );
  }

  function KPIs() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <Stat label="Billable this week" value="26.5" unit="hrs" caption="Target 25 · on track" accent />
        <Stat label="Active clients" value="7" caption="6–8 healthy caseload" />
        <Stat label="Clean claim rate" value="96" unit="%" caption="+3 pts vs last month" />
        <Stat label="Supervision due" value="2" unit="RBTs" caption="By Friday" />
      </div>
    );
  }

  const ATTENTION = [
    { icon: "alert", tone: "var(--aminy-alert-600)", bg: "var(--aminy-alert-100)", t: "1 claim denied — 97153, Kai R.", m: "Payer: AHCCCS · code review needed", cta: "Resolve" },
    { icon: "shield", tone: "var(--aminy-teal-600)", bg: "var(--aminy-teal-50)", t: "Centene credentialing: docs requested", m: "CAQH attestation due in 4 days", cta: "Upload" },
    { icon: "clock", tone: "var(--aminy-win-600)", bg: "var(--aminy-win-50)", t: "RBT supervision: Jordan, Mia", m: "5% monthly hours — 2 visits left", cta: "Schedule" },
  ];

  function Dashboard() {
    return (
      <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
        <p className="aminy-affirm" style={{ margin: 0, maxWidth: 560 }}>Good morning, Dr. Morales — seven families are a little steadier because of this week. Here's what needs you.</p>
        <KPIs />
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
          <Card padding={0}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--color-border)", fontWeight: 600, color: "var(--color-text-strong)" }}>Needs attention</div>
            {ATTENTION.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < ATTENTION.length - 1 ? "1px solid var(--color-border)" : "0" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: a.bg, color: a.tone }}><Ico n={a.icon} s={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{a.t}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{a.m}</div>
                </div>
                <Button size="sm" variant="secondary">{a.cta}</Button>
              </div>
            ))}
          </Card>
          <Card padding={0}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--color-border)", fontWeight: 600, color: "var(--color-text-strong)" }}>Today</div>
            {[
              { t: "9:00", l: "Kai R. — direct (97153)", m: "Telehealth · 2 hrs" },
              { t: "11:30", l: "Mia T. — supervision (97155)", m: "In-clinic · 1 hr" },
              { t: "2:00", l: "Parent training — the Okafors", m: "97156 · 45 min" },
              { t: "3:30", l: "Note review + sign-off", m: "3 drafts pending" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 18px", borderBottom: i < 3 ? "1px solid var(--color-border)" : "0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--aminy-teal-600)", width: 44, flexShrink: 0 }}>{s.t}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-strong)" }}>{s.l}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{s.m}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    );
  }

  const PAYERS = [
    { payer: "AHCCCS (Medicaid)", stage: 4, status: "Active", tone: "grow" },
    { payer: "Blue Cross AZ", stage: 4, status: "Active", tone: "grow" },
    { payer: "Centene / Ambetter", stage: 2, status: "Docs requested", tone: "win" },
    { payer: "UnitedHealthcare", stage: 3, status: "Under review", tone: "care" },
    { payer: "Cigna", stage: 1, status: "Not started", tone: "navy" },
  ];
  const STAGES = ["Submitted", "Review", "Approved", "Active"];

  function Credentialing() {
    return (
      <div style={{ padding: 28, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div className="aminy-h3">Payer credentialing</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>Each panel is revenue you can bill. Lost time here is lost months.</div>
          </div>
          <Button variant="primary" size="sm" style={{ background: "var(--aminy-teal-600)" }}>Add payer</Button>
        </div>
        <Card padding={0}>
          {PAYERS.map((p, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr auto", gap: 18, alignItems: "center", padding: "16px 18px", borderBottom: i < PAYERS.length - 1 ? "1px solid var(--color-border)" : "0" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{p.payer}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {STAGES.map((s, si) => (
                  <React.Fragment key={si}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 }}>
                      <div style={{ width: "100%", height: 5, borderRadius: 3, background: si < p.stage ? "var(--aminy-teal-600)" : "var(--aminy-navy-100)" }} />
                      <span style={{ fontSize: 10, lineHeight: 1, whiteSpace: "nowrap", color: si < p.stage ? "var(--aminy-teal-700)" : "var(--color-text-subtle)", fontWeight: si < p.stage ? 600 : 500 }}>{s}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <Badge tone={p.tone}>{p.status}</Badge>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  function AINotes() {
    const [signed, setSigned] = R.useState(false);
    return (
      <div style={{ padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div className="aminy-h3">AI session note · Kai R. — 97153</div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>Drafted from your session data. You review and sign — Aminy never bills without you.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--aminy-teal-50)", color: "var(--aminy-teal-600)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico n="sparkles" s={16} /></div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--aminy-teal-600)" }}>Aminy draft · SOAP</span>
            </div>
            {[
              ["S — Subjective", "Caregiver reports smoother morning transition; Kai used \"first-then\" board without prompt twice this week."],
              ["O — Objective", "90-min session, natural-environment teaching. Manding: 14 independent mands (↑ from 9). 2 brief protests at transition, recovered <60s with visual timer."],
              ["A — Assessment", "Progress toward Goal 1 (transition tolerance) is on trajectory; prompt-fading criteria met for tooth-brushing chain. No new interfering behaviors."],
              ["P — Plan", "Continue NET 25 hrs/wk. Introduce delayed reinforcement on mands. Parent training 97156 to generalize first-then to evening routine."],
            ].map(([h, b], i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--aminy-navy-500)", letterSpacing: ".04em", marginBottom: 3 }}>{h}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--color-text)" }}>{b}</div>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 12 }}>Billing</div>
            {[["CPT code", "97153"], ["Units", "6 (15-min)"], ["Rate (HO)", "$94.76/hr"], ["Session total", "$568.56"], ["Payer", "AHCCCS"]].map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)", fontSize: 13 }}>
                <span style={{ color: "var(--color-text-muted)" }}>{k}</span><span style={{ fontWeight: 600, color: "var(--color-text-strong)" }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              {signed
                ? <Badge tone="grow" icon={<Ico n="check" s={14} />}>Signed &amp; queued to bill</Badge>
                : <Button variant="primary" fullWidth style={{ background: "var(--aminy-teal-600)" }} onClick={() => setSigned(true)}>Approve &amp; sign</Button>}
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 10, lineHeight: 1.5 }}>Your signature attests clinical accuracy. Aminy retains the note for 7 years per BACB 4.05.</div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const CLAIMS = [
    { id: "CLM-4821", client: "Kai R.", code: "97153", amt: "$568.56", status: "Denied", tone: "win", note: "Modifier mismatch" },
    { id: "CLM-4820", client: "Mia T.", code: "97155", amt: "$447.84", status: "Paid", tone: "grow", note: "—" },
    { id: "CLM-4819", client: "Liam O.", code: "97151", amt: "$715.68", status: "Pending", tone: "care", note: "Submitted 2d ago" },
    { id: "CLM-4818", client: "Ava P.", code: "97153", amt: "$568.56", status: "Paid", tone: "grow", note: "—" },
    { id: "CLM-4817", client: "Noah K.", code: "97156", amt: "$150.84", status: "Pending", tone: "care", note: "Submitted 1d ago" },
  ];

  function Billing() {
    return (
      <div style={{ padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          <Stat label="Billed this month" value="$48.2k" caption="Across 7 clients" accent />
          <Stat label="Collected" value="$44.9k" caption="93% collection rate" />
          <Stat label="In denial review" value="1" unit="claim" caption="$568 recoverable" />
        </div>
        <Card padding={0}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.8fr 1fr 1fr 0.8fr", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--color-border)", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
            <span>Claim</span><span>Client</span><span>CPT</span><span>Amount</span><span>Status</span><span></span>
          </div>
          {CLAIMS.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.8fr 1fr 1fr 0.8fr", gap: 12, padding: "14px 18px", borderBottom: i < CLAIMS.length - 1 ? "1px solid var(--color-border)" : "0", alignItems: "center", fontSize: 13 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-muted)" }}>{c.id}</span>
              <span style={{ fontWeight: 600, color: "var(--color-text-strong)" }}>{c.client}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{c.code}</span>
              <span style={{ fontWeight: 600 }}>{c.amt}</span>
              <span><Badge tone={c.tone}>{c.status}</Badge></span>
              <span style={{ textAlign: "right" }}>{c.status === "Denied" ? <Button size="sm" variant="primary" style={{ background: "var(--aminy-teal-600)" }}>Appeal</Button> : <span style={{ fontSize: 11, color: "var(--color-text-subtle)" }}>{c.note}</span>}</span>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  function Placeholder({ title }) {
    return <div style={{ padding: 28 }}><Card><div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}><div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-strong)", marginBottom: 6 }}>{title}</div>This surface is scaffolded in the kit — wire it to your data layer.</div></Card></div>;
  }

  function App() {
    const [tab, setTab] = R.useState(() => localStorage.getItem("aminy-provider-tab") || "dashboard");
    R.useEffect(() => { localStorage.setItem("aminy-provider-tab", tab); }, [tab]);
    const titles = { dashboard: "Dashboard", clients: "Clients", credentialing: "Credentialing", notes: "AI Notes", review: "Needs your sign-off", messages: "Messages", billing: "Billing", payer: "Payer Scorecard", evv: "Visit Verification", supervision: "Supervision", schedule: "Schedule" };
    const PS = window.ProviderScreens || {};
    const screens = {
      dashboard: <Dashboard />, credentialing: <Credentialing />, notes: <AINotes />, billing: <Billing />,
      payer: PS.Payer ? <PS.Payer /> : <Placeholder title="Payer Scorecard" />,
      review: PS.Review ? <PS.Review /> : <Placeholder title="Sign-off queue" />,
      messages: PS.Messages ? <PS.Messages /> : <Placeholder title="Messages" />,
      clients: PS.Clients ? <PS.Clients /> : <Placeholder title="Client roster" />,
      evv: PS.EVV ? <PS.EVV /> : <Placeholder title="Visit verification" />,
      supervision: PS.Supervision ? <PS.Supervision /> : <Placeholder title="Supervision" />,
      schedule: PS.Schedule ? <PS.Schedule /> : <Placeholder title="Schedule" />,
    };
    return (
      <div style={{ display: "flex", width: 1240, height: 800, background: "var(--aminy-mist)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-xl)", border: "1px solid var(--color-border)" }}>
        <Sidebar active={tab} onNav={setTab} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar title={titles[tab]} />
          <div key={tab} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", animation: "aminy-fade-up var(--dur-base) var(--ease-calm) both" }}>{screens[tab]}</div>
        </div>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
