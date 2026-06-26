/* Parent utility screens — Checkout (Stripe) · Notifications · Medication tracker · Outcomes.
   Top pills switch screens; each is a full phone view in the system. window → #root */
(function () {
  const { AIcon, PhoneShell } = window;
  const { Button, Badge, Stat } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || { light(){}, medium(){}, success(){} };

  const Head = ({ title, sub, right }) => (
    <div style={{ padding: "8px 18px 12px", display: "flex", alignItems: "center", gap: 11, borderBottom: "1px solid var(--color-border)", background: "#fff" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: "var(--color-text-strong)" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );

  /* ============ 1) CHECKOUT (Stripe) ============ */
  function Checkout() {
    const [paid, setPaid] = R.useState(false);
    const F = ({ label, placeholder, half }) => (
      <div style={{ flex: half ? 1 : "none", width: half ? "auto" : "100%" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>{label}</div>
        <input placeholder={placeholder} style={{ width: "100%", boxSizing: "border-box", height: 46, padding: "0 13px", borderRadius: 10, border: "1px solid var(--color-border-strong)", fontSize: 15, fontFamily: "var(--font-ui)", color: "var(--color-text)", outline: "none", background: "#fff" }} />
      </div>
    );
    if (paid) return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 30px", textAlign: "center" }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--aminy-grow-500)", display: "flex", alignItems: "center", justifyContent: "center" }}><AIcon name="check" size={34} style={{ color: "#fff" }} /></div>
        <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 23, letterSpacing: "-0.025em", color: "var(--color-text-strong)", margin: 0 }}>Welcome to Core.</h2>
        <p style={{ fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.55, margin: 0, maxWidth: 280 }}>Your trial starts now — first charge on June 24, and we'll remind you 3 days before. Receipt's in your email.</p>
        <Button variant="secondary" onClick={() => setPaid(false)}>Back</Button>
      </div>
    );
    return (
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <Head title="Checkout" sub="Core · annual" />
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-100)", borderRadius: 16, padding: 15 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-strong)" }}>Aminy Core — annual</div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--color-text-strong)" }}>$129<span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-muted)" }}>/yr</span></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12.5, color: "var(--aminy-teal-800)" }}>
              <span>14-day free trial, then $129/yr</span><span style={{ fontWeight: 700, color: "var(--aminy-grow-600)" }}>Save 28%</span>
            </div>
          </div>
          <button onClick={() => { haptic.medium(); setPaid(true); }} style={{ height: 50, borderRadius: 12, border: 0, background: "#000", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}> Pay</button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--color-text-subtle)", fontSize: 12 }}>
            <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />or pay with card<span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          </div>
          <F label="Card number" placeholder="1234 1234 1234 1234" />
          <div style={{ display: "flex", gap: 10 }}><F label="Expiry" placeholder="MM / YY" half /><F label="CVC" placeholder="123" half /><F label="ZIP" placeholder="85001" half /></div>
          <Button variant="primary" size="lg" fullWidth onClick={() => { haptic.success(); setPaid(true); }}>Start free trial</Button>
          <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--color-text-subtle)", lineHeight: 1.55 }}>🔒 Secured by Stripe · HSA/FSA eligible · cancel anytime in Settings.<br/>You won't be charged until June 24, 2026.</div>
        </div>
      </div>
    );
  }

  /* ============ 2) NOTIFICATIONS ============ */
  const NOTIFS = [
    { g: "Today", items: [
      { icon: "video", tint: "var(--aminy-teal-50)", fg: "var(--aminy-teal-700)", t: "OT with Dr. Patel at 3:00", m: "Starts in 40 min — join from Home.", cta: "Join", unread: true },
      { icon: "shield", tint: "var(--aminy-care-50)", fg: "var(--aminy-care-600)", t: "Dr. Morales answered your question", m: "\"Dinner table bolting\" — signed review ready.", cta: "Read", unread: true },
      { icon: "sparkles", tint: "var(--aminy-teal-50)", fg: "var(--aminy-teal-700)", t: "Gentle nudge for tonight", m: "Bedtime runway: dim lights at 7:30.", unread: false },
    ]},
    { g: "This week", items: [
      { icon: "award", tint: "var(--aminy-win-50)", fg: "var(--aminy-win-600)", t: "Kai hit a milestone 🎉", m: "Named \"frustrated\" without prompting — twice.", unread: false },
      { icon: "file", tint: "var(--aminy-navy-50)", fg: "var(--aminy-navy-700)", t: "Claim update", m: "CLM-4821 appeal approved · $568 recovered.", unread: false },
    ]},
  ];
  function Notifications() {
    const [read, setRead] = R.useState({});
    return (
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <Head title="Notifications" right={<button onClick={() => { haptic.light(); setRead({ all: true }); }} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--aminy-teal-700)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-ui)" }}>Mark all read</button>} />
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {NOTIFS.map((g) => (
            <div key={g.g}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", margin: "0 4px 8px" }}>{g.g}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.items.map((n, i) => {
                  const unread = n.unread && !read.all;
                  return (
                    <div key={i} style={{ background: "#fff", border: `1px solid ${unread ? "var(--aminy-teal-200)" : "var(--color-border)"}`, borderRadius: 16, padding: "13px 14px", display: "flex", gap: 12, boxShadow: "var(--shadow-sm)", position: "relative" }}>
                      {unread && <span style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: 999, background: "var(--aminy-teal-600)" }} />}
                      <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: n.tint, color: n.fg }}><AIcon name={n.icon} size={18} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)", paddingRight: 14 }}>{n.t}</div>
                        <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 2, lineHeight: 1.45 }}>{n.m}</div>
                        {n.cta && <button onClick={() => { haptic.light(); window.aminyToast && window.aminyToast(n.cta + " → opening…"); }} style={{ marginTop: 8, height: 32, padding: "0 14px", borderRadius: 999, border: 0, background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>{n.cta}</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--color-text-subtle)" }}>You choose what comes through — tune in Settings → Notifications.</div>
        </div>
      </div>
    );
  }

  /* ============ 3) MEDICATION TRACKER ============ */
  const MEDS = [
    { name: "Guanfacine", dose: "1 mg · morning", time: "7:30 AM", status: "taken", color: "var(--aminy-grow-500)" },
    { name: "Melatonin", dose: "3 mg · bedtime", time: "8:00 PM", status: "due", color: "var(--aminy-teal-600)" },
    { name: "Vitamin D", dose: "1000 IU · with breakfast", time: "7:30 AM", status: "taken", color: "var(--aminy-grow-500)" },
  ];
  function Meds() {
    const [logged, setLogged] = R.useState({});
    return (
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <Head title="Medications" sub="Kai · today" />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 9 }}>
            <Stat label="Today" value={String(2 + Object.keys(logged).length)} unit="/3" caption="Doses logged" accent style={{ flex: 1 }} />
            <Stat label="Streak" value="6" unit="days" caption="All doses on time" style={{ flex: 1 }} />
          </div>
          {MEDS.map((m, i) => {
            const done = m.status === "taken" || logged[i];
            return (
              <div key={i} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: "13px 15px", display: "flex", alignItems: "center", gap: 13, boxShadow: "var(--shadow-sm)" }}>
                <div style={{ width: 10, height: 42, borderRadius: 5, background: done ? "var(--aminy-grow-500)" : m.color, flexShrink: 0, opacity: done ? 1 : 0.85 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--color-text-strong)" }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>{m.dose} · {m.time}</div>
                </div>
                {done
                  ? <Badge tone="grow" icon={<AIcon name="check" size={13} />}>Taken</Badge>
                  : <Button size="sm" variant="primary" onClick={() => { haptic.success(); setLogged((l) => ({ ...l, [i]: true })); }}>Log dose</Button>}
              </div>
            );
          })}
          <div style={{ background: "var(--aminy-win-50)", border: "1px solid var(--aminy-win-100)", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 11, alignItems: "center" }}>
            <AIcon name="bell" size={17} style={{ color: "var(--aminy-win-600)", flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12.5, color: "var(--aminy-win-600)", lineHeight: 1.45 }}><b>Refill heads-up:</b> Guanfacine has ~6 days left. Your pharmacy has the renewal.</div>
            <button onClick={() => { haptic.light(); window.aminyToast && window.aminyToast("Refill request sent to CVS Phoenix"); }} style={{ height: 32, padding: "0 12px", borderRadius: 999, border: "1px solid var(--aminy-win-100)", background: "#fff", color: "var(--aminy-win-600)", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Refill</button>
          </div>
          <Button variant="secondary" fullWidth icon={<AIcon name="send" size={15} />} onClick={() => { haptic.light(); window.aminyToast && window.aminyToast("Med log shared with Dr. Morales"); }}>Share log with care team</Button>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--color-text-subtle)", lineHeight: 1.5 }}>Always follow your prescriber's guidance. Aminy tracks — it never advises on dosing.</div>
        </div>
      </div>
    );
  }

  /* ============ 4) OUTCOMES ============ */
  const DOMAINS = [
    { name: "Communication", pct: 72, delta: "+9 this quarter", spark: [3, 4, 4, 5, 6, 7, 7] },
    { name: "Daily living", pct: 58, delta: "+12 this quarter", spark: [2, 3, 3, 4, 4, 5, 6] },
    { name: "Social connection", pct: 41, delta: "+5 this quarter", spark: [2, 2, 3, 3, 3, 4, 4] },
  ];
  function Outcomes() {
    return (
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <Head title="Outcomes" sub="Kai · last 6 months" right={<button onClick={() => { haptic.light(); window.aminyToast && window.aminyToast("Exporting outcomes PDF…"); }} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--aminy-teal-700)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-ui)" }}>Export</button>} />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)", border: "1px solid var(--aminy-teal-100)", borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--aminy-teal-700)", marginBottom: 6 }}>The headline</div>
            <div style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.015em", color: "var(--color-text-strong)", lineHeight: 1.35 }}>Kai met 7 of 9 goals this period — and the hardest one (morning transitions) is trending up.</div>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <Stat label="Goals met" value="7" unit="/9" caption="This period" accent style={{ flex: 1 }} />
            <Stat label="Sessions" value="46" caption="Attendance 96%" style={{ flex: 1 }} />
            <Stat label="Hours" value="118" caption="Direct therapy" style={{ flex: 1 }} />
          </div>
          {DOMAINS.map((d) => (
            <div key={d.name} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{d.name}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--aminy-grow-600)" }}>{d.delta}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, height: 8, background: "var(--aminy-navy-50)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: d.pct + "%", height: "100%", borderRadius: 4, background: "var(--aminy-teal-500)" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--aminy-teal-700)", width: 36, textAlign: "right" }}>{d.pct}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 26, marginTop: 10 }}>
                {d.spark.map((v, i) => <span key={i} style={{ flex: 1, height: v * 3.4, background: i === d.spark.length - 1 ? "var(--aminy-teal-600)" : "var(--aminy-teal-200)", borderRadius: 3 }} />)}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: "var(--color-text-subtle)", textAlign: "center", lineHeight: 1.55, padding: "0 12px" }}>Progress isn't linear — a flat month doesn't erase a good quarter. Your BCBA reviews these trends with you each cycle.</div>
        </div>
      </div>
    );
  }

  const SCREENS = [["checkout", "Checkout", Checkout], ["notifs", "Notifications", Notifications], ["meds", "Meds", Meds], ["outcomes", "Outcomes", Outcomes]];

  function App() {
    const [s, setS] = R.useState("notifs");
    const Cur = SCREENS.find((x) => x[0] === s)[2];
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", gap: 6, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 999, padding: 5, boxShadow: "var(--shadow-sm)" }}>
          {SCREENS.map(([id, lb]) => (
            <button key={id} onClick={() => { haptic.light(); setS(id); }} style={{ padding: "8px 16px", borderRadius: 999, border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, background: s === id ? "var(--aminy-teal-600)" : "transparent", color: s === id ? "#fff" : "var(--color-text-muted)" }}>{lb}</button>
          ))}
        </div>
        <PhoneShell bg="linear-gradient(180deg,var(--aminy-mist),var(--aminy-mist-deep))">
          <div key={s} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}><Cur /></div>
        </PhoneShell>
      </div>
    );
  }

  function mount() {
    if (!window.PhoneShell || !window.AminyKit) { setTimeout(mount, 60); return; }
    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  }
  mount();
})();
