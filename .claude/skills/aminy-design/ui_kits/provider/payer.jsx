/* AACT Payer Scorecard — ported from AACTPayerDashboard.tsx (sage → teal).
   Executive KPI scorecard payers evaluate in rate negotiations: Finance · Clinical · Operations.
   Each metric: value / target / R-Y-G status / editable. Summary bar + scorecard export.
   Merges into window.ProviderScreens.Payer (loaded after screens.jsx). */
(function () {
  const { Card } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || { light(){}, medium(){}, success(){} };
  const toast = window.aminyToast || function(){};

  const I = {
    dollar: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    award: <><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></>,
    activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></>,
    check: <path d="M20 6 9 17l-5-5"/>,
    file: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></>,
  };
  const Ico = ({ n, s = 16, style }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{I[n]}</svg>;

  const FINANCE = [
    { id: "clean", label: "Clean Claim Rate", value: 96, target: 95, unit: "%", hib: true, note: "Below 90% is a contract-risk flag for MCOs.", pf: true },
    { id: "denial", label: "Denial Rate", value: 4.2, target: 5, unit: "%", hib: false, note: "Tracked separately by payer.", pf: true },
    { id: "dtp", label: "Days to Payment", value: 34, target: 30, unit: " days", hib: false, note: "Benchmark for negotiation leverage.", pf: true },
    { id: "ar90", label: "AR Aging >90 Days", value: 8, target: 10, unit: "%", hib: false, pf: true },
    { id: "tf", label: "Timely Filing Compliance", value: 100, target: 100, unit: "%", hib: true, note: "Payers are strict on this.", pf: true },
    { id: "under", label: "Underpayment Rate", value: 2.1, target: 0, unit: "%", hib: false, note: "Received vs. contracted rate.", pf: true },
    { id: "comm", label: "Commercial % of Revenue", value: 24, target: 30, unit: "%", hib: true, note: "Target >30% commercial mix.", pf: true },
    { id: "rph", label: "Revenue per Billable Hour", value: 88, target: 85, unit: "$/hr", hib: true, pf: false },
    { id: "conc", label: "Single-Payer Concentration", value: 52, target: 40, unit: "%", hib: false, note: "No single payer >40%.", pf: false },
  ];
  const CLINICAL = [
    { id: "bhcoe-q", label: "BHCOE Staff Qualification", value: 92, target: 90, unit: "%", hib: true, note: "Top credential in every payer meeting.", pf: true },
    { id: "bhcoe-sat", label: "BHCOE Family Satisfaction", value: 4.4, target: 4.2, unit: "/5.0", hib: true, pf: true },
    { id: "bhcoe-sd", label: "BHCOE Service Delivery", value: 87, target: 85, unit: "%", hib: true, pf: true },
    { id: "bhcoe-out", label: "BHCOE Clinical Outcomes", value: 71, target: 75, unit: "%", hib: true, note: "% meeting goals per cycle.", pf: true },
    { id: "bcba-c", label: "BCBA Credential Compliance", value: 100, target: 100, unit: "%", hib: true, note: "100% BACB-licensed.", pf: true },
    { id: "rbt-c", label: "RBT Registration Compliance", value: 100, target: 100, unit: "%", hib: true, pf: true },
    { id: "goal", label: "Goal Attainment Rate", value: 78, target: 75, unit: "%", hib: true, note: "≥80% of plan goals per cycle.", pf: true },
    { id: "behavior", label: "Problem Behavior Reduction", value: 64, target: 60, unit: "%", hib: true, note: "≥25% reduction in target freq.", pf: true },
    { id: "nps", label: "Caregiver NPS", value: 58, target: 50, unit: " pts", hib: true, pf: true },
    { id: "tx", label: "Tx Plan Update Compliance", value: 96, target: 100, unit: "%", hib: true, note: "MCOs audit this.", pf: true },
    { id: "grad", label: "Client Graduation Rate", value: 28, target: 30, unit: "%", hib: true, note: "Planned discharges vs. attrition.", pf: true },
    { id: "tele", label: "Telehealth Parent Training/mo", value: 3, target: 1, unit: "", hib: true, note: "Signals innovation to commercial payers.", pf: true },
  ];
  const OPS = [
    { id: "util", label: "Authorization Utilization", value: 71, target: 65, unit: "%", hib: true, note: "<65% under-delivery · >98% over-utilization.", pf: true },
    { id: "rta", label: "Days: Referral → 1st Appt", value: 12, target: 14, unit: " days", hib: false, note: "Under 14 days helps MCOs hit network adequacy.", pf: true },
    { id: "caseload", label: "Active Client Caseload", value: 142, target: 100, unit: "", hib: true, note: "Validates network capacity.", pf: true },
    { id: "rbthrs", label: "RBT Billable Hrs/Wk", value: 26, target: 25, unit: " hrs", hib: true, pf: false },
    { id: "noshow", label: "No-Show / Cancellation", value: 9, target: 10, unit: "%", hib: false, note: "MCOs watch this closely.", pf: true },
    { id: "openref", label: "Open Referrals >30d", value: 2, target: 0, unit: "", hib: false, note: "Target: zero.", pf: true },
    { id: "prod", label: "Staff Productivity Ratio", value: 0.87, target: 0.85, unit: "", hib: true, note: "Billed hrs ÷ paid clinical hrs.", pf: false },
    { id: "intake", label: "Intake Conversion Rate", value: 68, target: 70, unit: "%", hib: true, note: "Referrals → clients started.", pf: false },
  ];
  const CATS = [
    { id: "finance", label: "Finance", icon: "dollar", metrics: FINANCE },
    { id: "clinical", label: "Clinical Quality", icon: "award", metrics: CLINICAL },
    { id: "operations", label: "Operations", icon: "activity", metrics: OPS },
  ];

  function status(m) {
    if (m.value === null || m.value === undefined) return "info";
    const ratio = m.hib ? m.value / m.target : m.target / (m.value || 0.001);
    if (ratio >= 1) return "green";
    if (ratio >= 0.9) return "yellow";
    return "red";
  }
  const C = {
    green: { bd: "var(--aminy-grow-200)", bg: "var(--aminy-grow-50)", fg: "var(--aminy-grow-700)", dot: "var(--aminy-grow-500)" },
    yellow: { bd: "var(--aminy-win-200)", bg: "var(--aminy-win-50)", fg: "var(--aminy-win-700)", dot: "var(--aminy-win-500)" },
    red: { bd: "#f0c4bc", bg: "#fbeeeb", fg: "#b3402c", dot: "#d9583f" },
    info: { bd: "var(--color-border)", bg: "#fff", fg: "var(--color-text-subtle)", dot: "var(--color-text-subtle)" },
  };
  function fmt(m) {
    if (m.value === null || m.value === undefined) return "—";
    if (m.unit === "/5.0") return m.value.toFixed(1);
    if (m.id === "prod") return m.value.toFixed(2);
    if (m.unit === "$/hr") return "$" + m.value;
    return m.value % 1 === 0 ? String(m.value) : m.value.toFixed(1);
  }

  function KPICard({ m, onEdit }) {
    const st = status(m), c = C[st];
    const [editing, setEditing] = R.useState(false);
    const [draft, setDraft] = R.useState(String(m.value ?? ""));
    function save() { const n = parseFloat(draft); if (!isNaN(n)) { onEdit(m.id, n); haptic.success(); } setEditing(false); }
    return (
      <div style={{ padding: 14, borderRadius: 13, border: "1px solid " + c.bd, background: c.bg }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: c.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.2 }}>{m.label}</span>
              {m.pf && <span title="Payer-facing" style={{ fontSize: 9, fontWeight: 700, color: "var(--aminy-teal-700)", background: "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-200)", padding: "1px 5px", borderRadius: 999, flexShrink: 0 }}>PF</span>}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 3 }}>
              {editing ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <input autoFocus type="number" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }} style={{ width: 64, border: "1px solid var(--aminy-teal-500)", borderRadius: 7, padding: "3px 6px", fontSize: 15, fontWeight: 700, fontFamily: "var(--font-ui)", outline: "none" }} />
                  <button onClick={save} aria-label="Save" style={{ border: 0, background: "var(--aminy-teal-600)", color: "#fff", borderRadius: 7, width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico n="check" s={13} /></button>
                </span>
              ) : (
                <>
                  <span style={{ fontSize: 22, fontWeight: 800, color: c.fg, letterSpacing: "-0.02em" }}>{fmt(m)}</span>
                  <span style={{ fontSize: 12.5, color: "var(--color-text-muted)", fontWeight: 600 }}>{m.unit}</span>
                </>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>Target {m.hib ? "≥" : "≤"}{m.target}{m.unit === "/5.0" ? "/5.0" : (m.unit === "$/hr" ? "$/hr" : m.unit)}</div>
          </div>
          {!editing && <button onClick={() => { setDraft(String(m.value ?? "")); setEditing(true); haptic.light(); }} aria-label={"Edit " + m.label} style={{ flexShrink: 0, border: 0, background: "transparent", color: "var(--color-text-subtle)", cursor: "pointer", padding: 2 }}><Ico n="edit" s={14} /></button>}
        </div>
        {m.note && <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--color-text-subtle)", borderTop: "1px solid " + c.bd, marginTop: 9, paddingTop: 8, lineHeight: 1.4 }}>{m.note}</div>}
      </div>
    );
  }

  function SummaryBar({ cats }) {
    const all = cats.flatMap((c) => c.metrics);
    const g = all.filter((m) => status(m) === "green").length;
    const y = all.filter((m) => status(m) === "yellow").length;
    const r = all.filter((m) => status(m) === "red").length;
    const total = all.length;
    return (
      <div style={{ padding: 18, borderRadius: 14, background: "linear-gradient(120deg,var(--aminy-navy-800),var(--aminy-navy-700) 60%,var(--aminy-teal-800))", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>AACT Payer Scorecard</div>
            <div style={{ fontSize: 19, fontWeight: 800, marginTop: 3 }}>{total} metrics tracked</div>
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            {[["On target", g, "var(--aminy-grow-300)"], ["At risk", y, "var(--aminy-win-300)"], ["Off target", r, "#f0a594"]].map(([l, v, col]) => (
              <div key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: col }}>{v}</div><div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>{l}</div></div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", gap: 2, marginTop: 14 }}>
          {g > 0 && <div style={{ flex: g, background: "var(--aminy-grow-400)" }} />}
          {y > 0 && <div style={{ flex: y, background: "var(--aminy-win-400)" }} />}
          {r > 0 && <div style={{ flex: r, background: "#e07a63" }} />}
        </div>
      </div>
    );
  }

  function Payer() {
    const [tab, setTab] = R.useState("finance");
    const [cats, setCats] = R.useState(() => {
      try { const v = JSON.parse(localStorage.getItem("aminy-payer-kpis") || "{}"); return CATS.map((c) => ({ ...c, metrics: c.metrics.map((m) => v[m.id] !== undefined ? { ...m, value: v[m.id] } : m) })); }
      catch (e) { return CATS; }
    });
    function edit(id, value) {
      setCats((prev) => {
        const next = prev.map((c) => ({ ...c, metrics: c.metrics.map((m) => m.id === id ? { ...m, value } : m) }));
        const v = {}; next.forEach((c) => c.metrics.forEach((m) => { if (m.value != null) v[m.id] = m.value; }));
        localStorage.setItem("aminy-payer-kpis", JSON.stringify(v));
        return next;
      });
    }
    const active = cats.find((c) => c.id === tab);
    const BADGES = [
      { label: "BHCOE Accreditation", sub: "Renews Mar 2027", c: C.green },
      { label: "CASP Membership", sub: "Active", c: { bd: "var(--aminy-teal-200)", bg: "var(--aminy-teal-50)", fg: "var(--aminy-teal-700)" } },
      { label: "AACT AZ Contracts", sub: "AHCCCS + 9 commercial", c: C.green },
    ];
    return (
      <div style={{ padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="aminy-h3">Payer scorecard <span style={{ fontSize: 12, fontWeight: 700, color: "var(--aminy-teal-700)", background: "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-200)", padding: "2px 9px", borderRadius: 999, verticalAlign: "middle", marginLeft: 6 }}>Arizona</span></div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>The metrics MCOs and commercial payers evaluate in rate negotiations & network audits.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { haptic.light(); toast("KPIs saved", "Snapshot stored for this period"); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: "1px solid var(--color-border-strong)", background: "#fff", color: "var(--color-text)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Ico n="check" s={15} />Save</button>
            <button onClick={() => { haptic.success(); toast("Scorecard exported", "Payer-facing summary ready for rate letters"); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: 0, background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "var(--shadow-cta)" }}><Ico n="download" s={15} />Export scorecard</button>
          </div>
        </div>

        <SummaryBar cats={cats} />

        <div style={{ display: "flex", gap: 12 }}>
          {BADGES.map((b) => (
            <div key={b.label} style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: "1px solid " + b.c.bd, background: b.c.bg }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: b.c.fg }}>{b.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 1 }}>{b.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, background: "#fff", borderRadius: 13, padding: 5, border: "1px solid var(--color-border)" }}>
          {cats.map((c) => {
            const off = c.metrics.filter((m) => status(m) === "red").length;
            return (
              <button key={c.id} onClick={() => { haptic.light(); setTab(c.id); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", borderRadius: 9, border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, background: tab === c.id ? "var(--aminy-navy-800)" : "transparent", color: tab === c.id ? "#fff" : "var(--color-text-muted)" }}>
                <Ico n={c.icon} s={16} />{c.label}
                {off > 0 && <span style={{ width: 18, height: 18, fontSize: 11, fontWeight: 700, background: "#d9583f", color: "#fff", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>{off}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-strong)" }}>{active.label} — {active.metrics.length} metrics</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--color-text-subtle)" }}><Ico n="edit" s={12} />Tap pencil to enter values</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {active.metrics.map((m) => <KPICard key={m.id} m={m} onEdit={edit} />)}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 16, borderRadius: 12, background: "#fff", border: "1px solid var(--color-border)" }}>
          <Ico n="file" s={17} style={{ color: "var(--aminy-teal-600)", marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-strong)" }}>Payer scorecard export</div>
            <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 2, lineHeight: 1.5 }}>Export generates a payer-facing summary of all <strong>PF</strong>-flagged metrics for rate letters, MCO renegotiations, and AHCCCS contract renewals — the subset payers actively evaluate.</div>
          </div>
        </div>
      </div>
    );
  }

  window.ProviderScreens = window.ProviderScreens || {};
  window.ProviderScreens.Payer = Payer;
})();
