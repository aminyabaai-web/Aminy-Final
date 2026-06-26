/* Provider-side extras — Org/Admin portal · Payer outcomes (MCO view) · Provider application.
   Desktop views with a top switcher. window → #root */
(function () {
  const { Button, Badge, Card, Stat, Avatar } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || { light(){}, medium(){}, success(){} };

  const I = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    pin: <><path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
    check: <path d="M20 6 9 17l-5-5"/>,
    plus: <><path d="M5 12h14"/><path d="M12 5v14"/></>,
    chart: <><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></>,
    shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>,
    doc: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></>,
    up: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></>,
  };
  const Ico = ({ n, s = 18, style }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{I[n]}</svg>;

  const Frame = ({ title, sub, right, children }) => (
    <div style={{ width: 1240, minHeight: 800, background: "var(--aminy-mist)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-xl)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", borderBottom: "1px solid var(--color-border)", background: "rgba(255,255,255,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src="../../assets/aminy_logo.png" alt="aminy" style={{ height: 26 }} />
          <span style={{ width: 1, height: 26, background: "var(--color-border-strong)" }} />
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: "var(--color-text-strong)" }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{sub}</div>}
          </div>
        </div>
        {right}
      </div>
      <div style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>
    </div>
  );

  /* ============ 1) ORG / ADMIN ============ */
  const STAFF = [
    { name: "Dr. Ana Morales", role: "BCBA-D · Clinical director", caseload: "7 clients", cred: "Active", tone: "grow" },
    { name: "Dr. Sam Chen", role: "BCBA", caseload: "8 clients", cred: "Active", tone: "grow" },
    { name: "Maria Garcia", role: "RBT", caseload: "4 clients", cred: "Renews Aug", tone: "win" },
    { name: "Jordan Lee", role: "RBT", caseload: "3 clients", cred: "Active", tone: "grow" },
    { name: "Priya Shah", role: "RBT-T", caseload: "2 clients", cred: "In supervision", tone: "care" },
  ];
  function OrgAdmin() {
    return (
      <Frame title="Rise Pediatric Therapies" sub="Organization admin" right={<Button size="sm" variant="primary" icon={<Ico n="plus" s={15} />} onClick={() => { haptic.light(); window.aminyToast && window.aminyToast("Invite sent — new seat added when accepted"); }}>Invite clinician</Button>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <Stat label="Clinicians" value="12" caption="9 billable this week" accent />
          <Stat label="Active clients" value="84" caption="+6 this month" />
          <Stat label="Locations" value="3" caption="Phoenix · Mesa · Tele" />
          <Stat label="Utilization" value="87" unit="%" caption="Target 85% · healthy" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }}>
          <Card padding={0}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", fontWeight: 600, color: "var(--color-text-strong)" }}>Team</div>
            {STAFF.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 18px", borderBottom: i < STAFF.length - 1 ? "1px solid var(--color-border)" : "0" }}>
                <Avatar name={s.name} tone="teal" size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{s.role}</div>
                </div>
                <span style={{ fontSize: 12.5, color: "var(--color-text-muted)", width: 90 }}>{s.caseload}</span>
                <Badge tone={s.tone}>{s.cred}</Badge>
              </div>
            ))}
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 12 }}>Locations</div>
              {[["Phoenix Clinic", "1240 E Osborn Rd", "6 rooms"], ["Mesa Clinic", "455 W Main St", "4 rooms"], ["Telehealth", "Statewide AZ", "Daily.co"]].map(([n, a, m], i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < 2 ? "1px solid var(--color-border)" : "0", alignItems: "center" }}>
                  <Ico n="pin" s={15} style={{ color: "var(--aminy-teal-600)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-strong)" }}>{n}</div><div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{a}</div></div>
                  <span style={{ fontSize: 11.5, color: "var(--color-text-subtle)" }}>{m}</span>
                </div>
              ))}
            </Card>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 10 }}>Compliance</div>
              {[["Credential renewals due (90d)", "2"], ["Supervision on track", "2 of 3"], ["Open incident reports", "0"]].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 2 ? "1px solid var(--color-border)" : "0", fontSize: 13 }}>
                  <span style={{ color: "var(--color-text-muted)" }}>{k}</span><span style={{ fontWeight: 700, color: "var(--color-text-strong)" }}>{v}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </Frame>
    );
  }

  /* ============ 2) PAYER OUTCOMES (MCO view) ============ */
  const PDOMAINS = [
    { name: "Communication", pct: 68 }, { name: "Daily living skills", pct: 61 }, { name: "Social connection", pct: 52 }, { name: "Challenging behavior ↓", pct: 74 },
  ];
  function PayerOutcomes() {
    return (
      <Frame title="Outcomes — AHCCCS cohort" sub="Q2 2026 · 312 members · de-identified aggregate" right={<Button size="sm" variant="secondary" icon={<Ico n="doc" s={15} />} onClick={() => { haptic.light(); window.aminyToast && window.aminyToast("Exporting quarterly outcomes report…"); }}>Export report</Button>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <Stat label="Members served" value="312" caption="+38 vs Q1" accent />
          <Stat label="Avg goal attainment" value="71" unit="%" caption="+4 pts vs Q1" />
          <Stat label="Utilization vs auth" value="92" unit="%" caption="Healthy band 85–105%" />
          <Stat label="Clean claim rate" value="95" unit="%" caption="Denials 3.1% · ↓0.6" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 16 }}>Goal attainment by domain</div>
            {PDOMAINS.map((d) => (
              <div key={d.name} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)" }}>{d.name}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--aminy-teal-700)" }}>{d.pct}%</span>
                </div>
                <div style={{ height: 9, background: "var(--aminy-navy-50)", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: d.pct + "%", height: "100%", borderRadius: 5, background: "var(--aminy-teal-500)" }} />
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: "var(--color-text-subtle)", marginTop: 4 }}>Attainment = % of authorized treatment goals met or exceeded within the quarter.</div>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 10 }}>Quarterly trend</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
                {[52, 58, 63, 67, 71].map((v, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <div style={{ width: "100%", height: v, background: i === 4 ? "var(--aminy-teal-600)" : "var(--aminy-teal-200)", borderRadius: 6 }} />
                    <span style={{ fontSize: 10, color: "var(--color-text-subtle)" }}>{["Q2'25", "Q3", "Q4", "Q1", "Q2"][i]}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 10 }}>Engagement</div>
              {[["Family app weekly-active", "78%"], ["Home practice completion", "64%"], ["Visit attendance", "94%"]].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 2 ? "1px solid var(--color-border)" : "0", fontSize: 13 }}>
                  <span style={{ color: "var(--color-text-muted)" }}>{k}</span><span style={{ fontWeight: 700, color: "var(--color-text-strong)" }}>{v}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </Frame>
    );
  }

  /* ============ 3) PROVIDER APPLICATION ============ */
  const STEPS = ["License & NPI", "Credentials", "Availability", "Review"];
  function Application() {
    const [step, setStep] = R.useState(0);
    const Field = ({ label, placeholder, half }) => (
      <div style={{ flex: half ? 1 : "none", width: half ? "auto" : "100%" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>{label}</div>
        <input placeholder={placeholder} style={{ width: "100%", boxSizing: "border-box", height: 46, padding: "0 13px", borderRadius: 10, border: "1px solid var(--color-border-strong)", fontSize: 14.5, fontFamily: "var(--font-ui)", color: "var(--color-text)", outline: "none", background: "#fff" }} />
      </div>
    );
    return (
      <Frame title="Join Aminy as a provider" sub="BCBA · SLP · OT — credential once, see families fast">
        <div style={{ maxWidth: 720, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* stepper */}
          <div style={{ display: "flex", gap: 8 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ height: 5, borderRadius: 3, background: i <= step ? "var(--aminy-teal-600)" : "var(--aminy-navy-100)", transition: "background .3s" }} />
                <span style={{ fontSize: 11.5, fontWeight: i === step ? 700 : 500, color: i <= step ? "var(--aminy-teal-700)" : "var(--color-text-subtle)", whiteSpace: "nowrap" }}>{s}</span>
              </div>
            ))}
          </div>
          <Card>
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 12 }}><Field label="Full name" placeholder="Dr. Ana Morales" half /><Field label="Credential" placeholder="BCBA-D" half /></div>
                <div style={{ display: "flex", gap: 12 }}><Field label="License number" placeholder="AZ-BACB-123456" half /><Field label="Licensing state" placeholder="Arizona" half /></div>
                <div style={{ display: "flex", gap: 12 }}><Field label="NPI" placeholder="10-digit NPI" half /><Field label="CAQH ID" placeholder="Optional — speeds credentialing" half /></div>
              </div>
            )}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[["State license", true], ["Liability insurance (COI)", true], ["Resume / CV", false], ["BLS/CPR certificate", false]].map(([doc, done], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: `1.5px dashed ${done ? "var(--aminy-grow-500)" : "var(--color-border-strong)"}`, background: done ? "var(--aminy-grow-50)" : "#fff" }}>
                    <Ico n={done ? "check" : "up"} s={17} style={{ color: done ? "var(--aminy-grow-600)" : "var(--aminy-teal-700)" }} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{doc}</span>
                    <button onClick={() => { haptic.light(); window.aminyToast && window.aminyToast(done ? "Re-uploading " + doc : "Choose a file for " + doc); }} style={{ height: 34, padding: "0 14px", borderRadius: 999, border: "1px solid var(--color-border-strong)", background: "#fff", color: "var(--color-text)", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>{done ? "Replace" : "Upload"}</button>
                  </div>
                ))}
              </div>
            )}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>When can families book you? You control this completely — change it anytime.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
                    <button key={d} onClick={() => haptic.light()} style={{ padding: "14px 0", borderRadius: 12, border: `1.5px solid ${i < 4 ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`, background: i < 4 ? "var(--aminy-teal-50)" : "#fff", color: i < 4 ? "var(--aminy-teal-800)" : "var(--color-text-muted)", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{d}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12 }}><Field label="Earliest start" placeholder="8:00 AM" half /><Field label="Latest end" placeholder="6:00 PM" half /><Field label="Session rate (cash-pay)" placeholder="$150 / hr" half /></div>
              </div>
            )}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center", alignItems: "center", padding: "10px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--aminy-teal-600)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-glow-teal)" }}><Ico n="check" s={28} style={{ color: "#fff" }} /></div>
                <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "var(--color-text-strong)" }}>Application ready to submit</div>
                <div style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.6, maxWidth: 420 }}>We verify your license and documents within 2–3 business days, then start payer credentialing on your behalf. You can see cash-pay families as soon as verification clears.</div>
              </div>
            )}
          </Card>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Button variant="ghost" onClick={() => { haptic.light(); setStep(Math.max(0, step - 1)); }} disabled={step === 0}>Back</Button>
            {step < 3
              ? <Button variant="primary" onClick={() => { haptic.light(); setStep(step + 1); }}>Continue</Button>
              : <Button variant="primary" icon={<Ico n="shield" s={16} />} onClick={() => { haptic.success(); window.aminyToast && window.aminyToast("Submitted — we'll email you within 2–3 business days"); }}>Submit application</Button>}
          </div>
        </div>
      </Frame>
    );
  }

  /* ============ 0) OPERATOR DASHBOARD (pilot ops) ============ */
  function Operator() {
    const [tab, setTab] = R.useState("overview");
    const TABS = [["overview", "Overview"], ["engagement", "Engagement"], ["ai", "AI usage"], ["clinical", "Clinical"], ["marketplace", "Marketplace"]];
    const Mini = ({ label, value, unit, caption, tone }) => (
      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3, margin: "6px 0 2px" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", color: "var(--color-text-strong)" }}>{value}</span>
          {unit && <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-muted)" }}>{unit}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: tone === "up" ? "var(--aminy-grow-600)" : "var(--color-text-subtle)", fontWeight: tone === "up" ? 600 : 400 }}>{caption}</div>
      </Card>
    );
    const Bars = ({ data, fmt }) => (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 96 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{ width: "100%", height: Math.max(6, d.v), background: i === data.length - 1 ? "var(--aminy-teal-600)" : "var(--aminy-teal-200)", borderRadius: 6 }} />
            <span style={{ fontSize: 10, color: "var(--color-text-subtle)" }}>{d.l}</span>
          </div>
        ))}
      </div>
    );
    return (
      <Frame title="Operator dashboard" sub="AACT Arizona pilot · 312 families · 47 days left"
        right={<div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", gap: 4, background: "var(--aminy-navy-50)", borderRadius: 999, padding: 4 }}>
            {["7d", "30d", "All"].map((r, i) => <button key={r} onClick={() => haptic.light()} style={{ padding: "5px 12px", borderRadius: 999, border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 12, background: i === 1 ? "#fff" : "transparent", color: i === 1 ? "var(--color-text-strong)" : "var(--color-text-muted)", boxShadow: i === 1 ? "var(--shadow-sm)" : "none" }}>{r}</button>)}
          </div>
          <Button size="sm" variant="secondary" icon={<Ico n="doc" s={15} />} onClick={() => { haptic.light(); window.aminyToast && window.aminyToast("Exporting pilot report (CSV)…"); }}>Export</Button>
        </div>}>
        {/* tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--color-border)", marginBottom: 2 }}>
          {TABS.map(([id, lb]) => (
            <button key={id} onClick={() => { haptic.light(); setTab(id); }} style={{ padding: "10px 16px", border: 0, borderBottom: `2px solid ${tab === id ? "var(--aminy-teal-600)" : "transparent"}`, background: "transparent", cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: tab === id ? 700 : 500, fontSize: 13.5, color: tab === id ? "var(--aminy-teal-700)" : "var(--color-text-muted)", marginBottom: -1 }}>{lb}</button>
          ))}
        </div>

        {tab === "overview" && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            <Mini label="Active families" value="312" caption="+38 this month" tone="up" />
            <Mini label="Onboarding rate" value="86" unit="%" caption="completed setup" />
            <Mini label="7-day activation" value="71" unit="%" caption="+5 pts vs last cohort" tone="up" />
            <Mini label="NPS" value="62" caption="34 promoters · 4 detractors" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 14 }}>Tier distribution</div>
              {[["Free", 58, "var(--aminy-navy-300)"], ["Starter", 22, "var(--aminy-teal-300)"], ["Core", 14, "var(--aminy-teal-500)"], ["Pro", 6, "var(--aminy-teal-700)"]].map(([n, p, c], i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}><span style={{ fontWeight: 600, color: "var(--color-text-strong)" }}>{n}</span><span style={{ color: "var(--color-text-muted)" }}>{p}%</span></div>
                  <div style={{ height: 9, background: "var(--aminy-navy-50)", borderRadius: 5, overflow: "hidden" }}><div style={{ width: p + "%", height: "100%", background: c, borderRadius: 5 }} /></div>
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: "var(--color-text-subtle)", marginTop: 2 }}>Paid conversion 42% · target 35%</div>
            </Card>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 14 }}>KPIs vs target</div>
              {[["Activation", "71%", "65%", true], ["Weekly retention", "78%", "70%", true], ["Paid conversion", "42%", "35%", true], ["Support load / family", "0.3", "0.5", true]].map(([k, v, t, ok], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < 3 ? "1px solid var(--color-border)" : "0" }}>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-muted)" }}>{k}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-strong)", width: 48, textAlign: "right" }}>{v}</span>
                  <span style={{ fontSize: 11.5, color: "var(--color-text-subtle)", width: 70, textAlign: "right" }}>target {t}</span>
                  <Ico n="check" s={15} style={{ color: "var(--aminy-grow-600)" }} />
                </div>
              ))}
            </Card>
          </div>
        </>}

        {tab === "engagement" && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            <Mini label="DAU / WAU" value="0.52" caption="sticky · target 0.40" tone="up" />
            <Mini label="Avg sessions / wk" value="5.8" caption="per active family" />
            <Mini label="4-week retention" value="68" unit="%" caption="+6 pts vs last cohort" tone="up" />
          </div>
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 14 }}>Weekly active families</div>
            <Bars data={[{ l: "W1", v: 40 }, { l: "W2", v: 55 }, { l: "W3", v: 62 }, { l: "W4", v: 70 }, { l: "W5", v: 78 }, { l: "W6", v: 88 }]} />
          </Card>
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 14 }}>Activation funnel</div>
            {[["Signed up", 100], ["Completed onboarding", 86], ["First AI conversation", 79], ["First plan generated", 64], ["Returned in week 2", 71]].map(([k, p], i) => (
              <div key={i} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}><span style={{ color: "var(--color-text-strong)", fontWeight: 600 }}>{k}</span><span style={{ color: "var(--color-text-muted)" }}>{p}%</span></div>
                <div style={{ height: 9, background: "var(--aminy-navy-50)", borderRadius: 5, overflow: "hidden" }}><div style={{ width: p + "%", height: "100%", background: "var(--aminy-teal-500)", borderRadius: 5 }} /></div>
              </div>
            ))}
          </Card>
        </>}

        {tab === "ai" && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            <Mini label="Conversations" value="4.2k" caption="this month" />
            <Mini label="Msgs / family / wk" value="11" caption="median" />
            <Mini label="Satisfaction" value="94" unit="%" caption="👍 of rated replies" tone="up" />
            <Mini label="Memory entries" value="2.8k" caption="facts remembered" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 14 }}>Top intents</div>
              {[["Behavior in the moment", 31], ["Routines & transitions", 24], ["Sleep & mealtime", 18], ["School / IEP", 15], ["Coverage & billing", 12]].map(([k, p], i) => (
                <div key={i} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}><span style={{ color: "var(--color-text-strong)", fontWeight: 600 }}>{k}</span><span style={{ color: "var(--color-text-muted)" }}>{p}%</span></div>
                  <div style={{ height: 9, background: "var(--aminy-navy-50)", borderRadius: 5, overflow: "hidden" }}><div style={{ width: (p * 3) + "%", height: "100%", background: "var(--aminy-teal-500)", borderRadius: 5 }} /></div>
                </div>
              ))}
            </Card>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 10 }}>Safety & escalation</div>
              {[["Escalated to BCBA", "38"], ["Crisis resources shown", "6"], ["Flagged for review", "11"], ["Avg first-response", "instant"]].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < 3 ? "1px solid var(--color-border)" : "0", fontSize: 13 }}><span style={{ color: "var(--color-text-muted)" }}>{k}</span><span style={{ fontWeight: 700, color: "var(--color-text-strong)" }}>{v}</span></div>
              ))}
            </Card>
          </div>
        </>}

        {tab === "clinical" && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            <Mini label="Goal attainment" value="71" unit="%" caption="met or exceeded" tone="up" />
            <Mini label="Home practice done" value="64" unit="%" caption="of assigned activities" />
            <Mini label="Visit attendance" value="94" unit="%" caption="kept appointments" />
          </div>
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 14 }}>Condition breakdown</div>
            {[["Autism (ASD)", 64], ["ADHD", 21], ["Speech / language", 9], ["Other", 6]].map(([k, p], i) => (
              <div key={i} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}><span style={{ color: "var(--color-text-strong)", fontWeight: 600 }}>{k}</span><span style={{ color: "var(--color-text-muted)" }}>{p}%</span></div>
                <div style={{ height: 9, background: "var(--aminy-navy-50)", borderRadius: 5, overflow: "hidden" }}><div style={{ width: p + "%", height: "100%", background: "var(--aminy-teal-500)", borderRadius: 5 }} /></div>
              </div>
            ))}
          </Card>
        </>}

        {tab === "marketplace" && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            <Mini label="Bookings" value="186" caption="this month" tone="up" />
            <Mini label="GMV" value="$48k" caption="cash + insurance" />
            <Mini label="Take rate" value="12" unit="%" caption="platform fee" />
            <Mini label="Active providers" value="34" caption="6 onboarding" />
          </div>
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 12 }}>Top providers</div>
            {[["Dr. Ana Morales", "BCBA-D", "28 sessions", "4.9★"], ["Dr. Sam Chen", "BCBA", "24 sessions", "4.8★"], ["Maria Garcia", "RBT", "19 sessions", "5.0★"]].map(([n, r, s, rt], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 0", borderBottom: i < 2 ? "1px solid var(--color-border)" : "0" }}>
                <Avatar name={n} tone="teal" size={34} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)" }}>{n}</div><div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{r}</div></div>
                <span style={{ fontSize: 12.5, color: "var(--color-text-muted)", width: 90 }}>{s}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--aminy-teal-700)" }}>{rt}</span>
              </div>
            ))}
          </Card>
        </>}
      </Frame>
    );
  }

  const VIEWS = [["operator", "Operator", Operator], ["org", "Org admin", OrgAdmin], ["payer", "Payer outcomes", PayerOutcomes], ["apply", "Provider application", Application]];

  function App() {
    const [v, setV] = R.useState("operator");
    const Cur = VIEWS.find((x) => x[0] === v)[2];
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", gap: 6, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 999, padding: 5, boxShadow: "var(--shadow-sm)" }}>
          {VIEWS.map(([id, lb]) => (
            <button key={id} onClick={() => { haptic.light(); setV(id); }} style={{ padding: "8px 18px", borderRadius: 999, border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, background: v === id ? "var(--aminy-teal-600)" : "transparent", color: v === id ? "#fff" : "var(--color-text-muted)" }}>{lb}</button>
          ))}
        </div>
        <Cur key={v} />
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
