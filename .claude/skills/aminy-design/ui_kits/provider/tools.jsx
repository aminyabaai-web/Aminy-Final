/* Provider revenue tools — Denial Workbench + Payouts (Stripe Connect).
   Ported from DenialWorkbench.tsx + ProviderPayoutSetup.tsx; rebuilt in the
   Aminy system (mist + teal, real CARC codes, 90/10 split). window → #root */
(function () {
  const { Button, Badge, Card, Stat } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || { light(){}, medium(){}, success(){} };
  const toast = (m) => window.aminyToast && window.aminyToast(m);

  const I = {
    alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></>,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    chart: <><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></>,
    refresh: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></>,
    zap: <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>,
    file: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></>,
    back: <path d="m15 18-6-6 6-6"/>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>,
    check: <path d="M20 6 9 17l-5-5"/>,
    shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>,
  };
  const Ico = ({ n, s = 18, style }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{I[n]}</svg>;

  const Frame = ({ title, sub, children }) => (
    <div style={{ width: 1240, minHeight: 800, background: "var(--aminy-mist)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-xl)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 72, flexShrink: 0, display: "flex", alignItems: "center", gap: 16, padding: "0 32px", borderBottom: "1px solid var(--color-border)", background: "rgba(255,255,255,0.8)" }}>
        <img src="../../assets/aminy_logo.png" alt="aminy" style={{ height: 26 }} />
        <span style={{ width: 1, height: 26, background: "var(--color-border-strong)" }} />
        <div><div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: "var(--color-text-strong)" }}>{title}</div>{sub && <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{sub}</div>}</div>
      </div>
      <div style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>{children}</div>
    </div>
  );

  // ===== DENIAL WORKBENCH =====
  const CAT = {
    auth: { label: "Authorization", bg: "var(--aminy-care-50)", fg: "var(--aminy-care-600)" },
    "missing-info": { label: "Missing Info", bg: "#eff6ff", fg: "#2563eb" },
    coding: { label: "Coding Error", bg: "var(--aminy-win-50)", fg: "var(--aminy-win-600)" },
    "medical-necessity": { label: "Medical Necessity", bg: "var(--aminy-alert-100)", fg: "var(--aminy-alert-600)" },
    "timely-filing": { label: "Timely Filing", bg: "var(--aminy-navy-50)", fg: "var(--aminy-navy-700)" },
    duplicate: { label: "Duplicate", bg: "var(--aminy-navy-50)", fg: "var(--aminy-navy-500)" },
  };
  const DENIALS = [
    { id: "d5", claim: "CLM-2026-0830", who: "Riley C.", dos: "Feb 20", cpt: "90834", payer: "Cigna", amt: 150, carc: "CO-29", reason: "Claim submitted after filing deadline", cat: "timely-filing", days: 0, status: "new", action: "Locate clearinghouse submission receipt for proof" },
    { id: "d3", claim: "CLM-2026-0862", who: "Sam R.", dos: "Mar 5", cpt: "97153", payer: "AHCCCS", amt: 240, carc: "CO-50", reason: "Service not considered medically necessary", cat: "medical-necessity", days: 4, status: "in-review", action: "Submit clinical appeal with treatment plan" },
    { id: "d2", claim: "CLM-2026-0876", who: "Jordan K.", dos: "Mar 10", cpt: "90834", payer: "Aetna", amt: 150, carc: "CO-16", reason: "Subscriber ID does not match payer records", cat: "missing-info", days: 9, status: "new", action: "Verify subscriber ID and resubmit" },
    { id: "d1", claim: "CLM-2026-0891", who: "Alex M.", dos: "Mar 15", cpt: "90837", payer: "BCBS Arizona", amt: 185, carc: "CO-197", reason: "Prior authorization not obtained before service date", cat: "auth", days: 14, status: "new", action: "Request retro-authorization from BCBS" },
    { id: "d8", claim: "CLM-2026-0780", who: "Drew N.", dos: "Jan 30", cpt: "97153", payer: "AHCCCS", amt: 120, carc: "CO-97", reason: "Procedure bundled — partial payment applied", cat: "coding", days: 29, status: "recovered", action: "Partial recovery achieved via modifier 59" },
  ];
  const SST = { new: ["New", "win"], "in-review": ["In Review", "care"], appealed: ["Appealed", "navy"], recovered: ["Recovered", "grow"] };
  function urgency(d) { return d <= 0 ? "var(--aminy-alert-600)" : d <= 7 ? "var(--aminy-alert-600)" : d <= 14 ? "var(--aminy-win-600)" : "var(--color-text-muted)"; }

  function DenialWorkbench() {
    const [view, setView] = R.useState("inbox");
    const [sel, setSel] = R.useState(null);
    const [letter, setLetter] = R.useState(false);
    const atRisk = DENIALS.filter((d) => !["recovered", "written-off"].includes(d.status)).reduce((s, d) => s + d.amt, 0);
    const urgent = DENIALS.filter((d) => d.days <= 7 && !["recovered"].includes(d.status)).length;

    if (sel) {
      const c = CAT[sel.cat];
      return (
        <Frame title="Denial Workbench" sub={`${urgent} urgent · $${atRisk.toLocaleString()} at risk`}>
          <button onClick={() => { setSel(null); setLetter(false); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: 0, cursor: "pointer", color: "var(--color-text-muted)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, alignSelf: "flex-start" }}><Ico n="back" s={15} /> Back to inbox</button>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div><div style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-strong)" }}>{sel.who}</div><div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>{sel.claim} · {sel.dos}</div></div>
                  <Badge tone={SST[sel.status][1]}>{SST[sel.status][0]}</Badge>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                  {[["Payer", sel.payer], ["CPT", sel.cpt], ["Denied", "$" + sel.amt], ["Deadline", sel.days <= 0 ? "EXPIRED" : sel.days + " days"]].map(([k, v]) => (
                    <div key={k}><div style={{ color: "var(--color-text-subtle)" }}>{k}</div><div style={{ fontWeight: 700, color: k === "Denied" ? "var(--aminy-alert-600)" : k === "Deadline" ? urgency(sel.days) : "var(--color-text-strong)" }}>{v}</div></div>
                  ))}
                </div>
              </Card>
              <div style={{ background: "var(--aminy-alert-100)", border: "1px solid #fecaca", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 10 }}>
                <Ico n="alert" s={17} style={{ color: "var(--aminy-alert-600)", flexShrink: 0, marginTop: 1 }} />
                <div><div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b" }}>{sel.carc}: {c.label}</div><div style={{ fontSize: 12.5, color: "#b91c1c", marginTop: 2, lineHeight: 1.5 }}>{sel.reason}</div></div>
              </div>
              <div style={{ background: "var(--aminy-grow-50)", border: "1px solid var(--aminy-grow-100)", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 10 }}>
                <Ico n="zap" s={17} style={{ color: "var(--aminy-grow-600)", flexShrink: 0, marginTop: 1 }} />
                <div><div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>Suggested action</div><div style={{ fontSize: 12.5, color: "#15803d", marginTop: 2, lineHeight: 1.5 }}>{sel.action}</div></div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Button variant="primary" fullWidth icon={<Ico n="file" s={15} />} onClick={() => { haptic.light(); setLetter(!letter); }}>{letter ? "Hide" : "Generate"} appeal letter</Button>
              <Button variant="secondary" fullWidth icon={<Ico n="send" s={15} />} onClick={() => toast("Claim resubmitted to " + sel.payer)}>Resubmit claim</Button>
              <Button variant="ghost" fullWidth onClick={() => toast("Marked for write-off")}>Write off</Button>
              {letter && (
                <Card padding={0} style={{ marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--color-border)" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--aminy-care-600)", display: "inline-flex", alignItems: "center", gap: 6 }}><Ico n="zap" s={13} /> AI-drafted appeal</span>
                    <button onClick={() => toast("Copied")} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: 0, cursor: "pointer", color: "var(--color-text-muted)", fontSize: 12, fontWeight: 600 }}><Ico n="copy" s={12} /> Copy</button>
                  </div>
                  <pre style={{ margin: 0, padding: 14, fontFamily: "var(--font-mono)", fontSize: 10.5, lineHeight: 1.55, color: "var(--color-text)", whiteSpace: "pre-wrap", maxHeight: 220, overflowY: "auto", background: "var(--aminy-mist)" }}>{`RE: Appeal of Claim ${sel.claim}
Patient: ${sel.who} · DOS ${sel.dos}
CPT ${sel.cpt} · Denied $${sel.amt} · ${sel.carc}

Dear Appeals Committee,

I am appealing the denial of the above claim.
The service was medically necessary and
appropriate for the patient's condition.

Enclosed: treatment plan with measurable
goals, progress notes, and supporting
documentation.

I respectfully request reconsideration and
reprocessing for payment.

Sincerely,
Dr. Ana Morales, BCBA-D · NPI 1234567890`}</pre>
                </Card>
              )}
            </div>
          </div>
        </Frame>
      );
    }

    return (
      <Frame title="Denial Workbench" sub={`${urgent} urgent · $${atRisk.toLocaleString()} at risk`}>
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {[["inbox", "Inbox", "inbox"], ["analytics", "Analytics", "chart"], ["rework", "Rework", "refresh"]].map(([id, lb, ic]) => (
            <button key={id} onClick={() => { haptic.light(); setView(id); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 15px", borderRadius: 9, border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, background: view === id ? "var(--aminy-navy-950)" : "transparent", color: view === id ? "#fff" : "var(--color-text-muted)" }}><Ico n={ic} s={15} /> {lb}{id === "inbox" && <span style={{ background: view === id ? "#fff" : "var(--aminy-alert-600)", color: view === id ? "var(--aminy-navy-950)" : "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>3</span>}</button>
          ))}
        </div>

        {view === "inbox" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {DENIALS.map((d) => {
              const c = CAT[d.cat];
              return (
                <div key={d.id} onClick={() => { haptic.light(); setSel(d); }} style={{ background: "#fff", border: `1px solid ${d.days <= 7 && d.status !== "recovered" ? "#fecaca" : "var(--color-border)"}`, borderRadius: 14, padding: "13px 16px", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Ico n="alert" s={15} style={{ color: d.days <= 7 ? "var(--aminy-alert-600)" : "var(--aminy-win-600)" }} /><span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{d.who}</span></div>
                    <Badge tone={SST[d.status][1]}>{SST[d.status][0]}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.fg, background: c.bg, borderRadius: 999, padding: "2px 8px" }}>{c.label}</span>
                    <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>{d.carc} · {d.payer} · {d.cpt}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginBottom: 8, lineHeight: 1.4 }}>{d.reason}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-strong)" }}>${d.amt}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: urgency(d.days) }}>{d.days <= 0 ? "DEADLINE EXPIRED" : d.days + "d to appeal"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {view === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              <Stat label="Total denied" value={"$" + DENIALS.reduce((s, d) => s + d.amt, 0).toLocaleString()} caption={DENIALS.length + " claims"} />
              <Stat label="Recovered" value="$120" caption="1 claim" accent />
              <Stat label="Denial rate" value="12" unit="%" caption="−2% vs last mo" />
              <Stat label="Recovery rate" value="68" unit="%" caption="+5% vs last mo" />
            </div>
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 14 }}>Top denial reasons</div>
              {[["Authorization", 38], ["Medical necessity", 24], ["Coding error", 20], ["Missing info", 12], ["Timely filing", 6]].map(([k, v]) => (
                <div key={k} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}><span style={{ fontWeight: 600, color: "var(--color-text-strong)" }}>{k}</span><span style={{ color: "var(--color-text-muted)" }}>{v}%</span></div>
                  <div style={{ height: 8, background: "var(--aminy-navy-50)", borderRadius: 4, overflow: "hidden" }}><div style={{ width: v + "%", height: "100%", background: "var(--aminy-care-600)", borderRadius: 4 }} /></div>
                </div>
              ))}
            </Card>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 12 }}>
              <Ico n="chart" s={20} style={{ color: "#2563eb", flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13, color: "#1d4ed8", lineHeight: 1.55 }}><b>Revenue impact:</b> at a 12% denial rate, ~$31k/yr is at risk. Cutting denials 3% recovers an estimated $8k per quarter — Aminy's auth checks target exactly that.</div>
            </div>
          </div>
        )}
        {view === "rework" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {DENIALS.filter((d) => ["new", "in-review"].includes(d.status)).map((d) => (
              <Card key={d.id} padding={14}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div><div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)" }}>{d.who}</div><div style={{ fontSize: 11.5, color: "var(--color-text-subtle)" }}>{d.claim}</div></div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: urgency(d.days) }}>{d.days <= 0 ? "OVERDUE" : d.days + "d left"}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginBottom: 10 }}>{d.action}</div>
                <div style={{ display: "flex", gap: 8 }}><Button size="sm" variant="secondary" onClick={() => toast("Opening correction…")}>Fix</Button><Button size="sm" variant="primary" onClick={() => toast("Resubmitted")}>Resubmit</Button></div>
              </Card>
            ))}
          </div>
        )}
      </Frame>
    );
  }

  // ===== PAYOUTS (Stripe Connect) =====
  const PAYOUTS = [
    { desc: "Direct therapy — Kai R.", date: "Jun 22, 2026", amt: "$511.70", status: ["Paid", "grow"] },
    { desc: "Supervision — Mia T.", date: "Jun 21, 2026", amt: "$403.06", status: ["Paid", "grow"] },
    { desc: "Parent training — Okafors", date: "Jun 20, 2026", amt: "$135.76", status: ["Pending", "win"] },
    { desc: "Direct therapy — Ava P.", date: "Jun 18, 2026", amt: "$511.70", status: ["Paid", "grow"] },
  ];
  function Payouts() {
    return (
      <Frame title="Payout Setup" sub="Receive payments for your sessions · Stripe Connect">
        <div style={{ maxWidth: 560, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--aminy-teal-50)", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico n="card" s={17} /></div><span style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text-strong)" }}>Stripe Connect</span></div>
              <Badge tone="grow" icon={<Ico n="check" s={12} />}>Active</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div style={{ background: "var(--aminy-teal-50)", borderRadius: 14, padding: 14, textAlign: "center" }}><div style={{ fontSize: 12, color: "var(--aminy-teal-700)", fontWeight: 600, marginBottom: 4 }}>Available</div><div style={{ fontSize: 22, fontWeight: 800, color: "var(--aminy-teal-700)", letterSpacing: "-0.02em" }}>$1,562</div></div>
              <div style={{ background: "var(--aminy-mist)", borderRadius: 14, padding: 14, textAlign: "center" }}><div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600, marginBottom: 4 }}>Pending</div><div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-strong)", letterSpacing: "-0.02em" }}>$136</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--color-text-subtle)" }}><Ico n="shield" s={13} /> Payouts processed securely via Stripe · 2 business days</div>
          </Card>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 12 }}>Payout schedule</div>
            {[["Platform fee", "10%"], ["Your share", "90%"], ["Payout timing", "2 business days"], ["Minimum payout", "$0 (auto)"]].map(([k, v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < 3 ? "1px solid var(--color-border)" : 0, fontSize: 13.5 }}><span style={{ color: "var(--color-text-muted)" }}>{k}</span><span style={{ fontWeight: 700, color: "var(--color-text-strong)" }}>{v}</span></div>
            ))}
          </Card>
          <Card padding={0}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", fontWeight: 700, fontSize: 14, color: "var(--color-text-strong)" }}>Recent payouts</div>
            {PAYOUTS.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: i < PAYOUTS.length - 1 ? "1px solid var(--color-border)" : 0 }}>
                <div><div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)" }}>{p.desc}</div><div style={{ fontSize: 11.5, color: "var(--color-text-subtle)" }}>{p.date}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-strong)" }}>{p.amt}</div><Badge tone={p.status[1]}>{p.status[0]}</Badge></div>
              </div>
            ))}
          </Card>
        </div>
      </Frame>
    );
  }

  const VIEWS = [["denials", "Denial Workbench", DenialWorkbench], ["payouts", "Payouts", Payouts]];
  function App() {
    const [v, setV] = R.useState("denials");
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
