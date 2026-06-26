/* Provider OS — deeper surfaces: Clients roster, EVV (clock/records/budget),
   RBT Supervision. Ported from EVVDashboard.tsx + supervision/roster structures.
   Rebuilt in the Aminy system (mist + teal). Attaches window.ProviderScreens. */
(function () {
  const R = React;
  const { Button, Badge, Card, Stat, Avatar } = window.AminyKit;
  const haptic = window.aminyHaptic || { light(){}, medium(){}, success(){} };

  const I = {
    timer: <><path d="M10 2h4"/><path d="M12 14v-4"/><circle cx="12" cy="14" r="8"/></>,
    pin: <><path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
    play: <path d="M6 4v16l14-8z" fill="currentColor" stroke="none"/>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>,
    check: <path d="M20 6 9 17l-5-5"/>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></>,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    video: <><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    plus: <><path d="M5 12h14"/><path d="M12 5v14"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></>,
    msg: <><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></>,
    sparkles: <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>,
    shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>,
    notes: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></>,
  };
  const Ico = ({ n, s = 18, w = 2, style }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={style}>{I[n]}</svg>;

  // ============ CLIENTS ROSTER ============
  const CLIENTS = [
    { name: "Kai R.", age: 7, code: "97153", tone: "grow", status: "Active", hrs: "25/wk", auth: "284 units left", next: "Today 9:00", focus: "Morning transitions" },
    { name: "Mia T.", age: 5, code: "97155", tone: "grow", status: "Active", hrs: "20/wk", auth: "192 units left", next: "Today 11:30", focus: "Communication" },
    { name: "Liam O.", age: 9, code: "97151", tone: "win", status: "Assessment", hrs: "—", auth: "Pending auth", next: "Thu 2:00", focus: "Intake eval" },
    { name: "Ava P.", age: 6, code: "97153", tone: "grow", status: "Active", hrs: "18/wk", auth: "96 units left", next: "Fri 10:00", focus: "Self-care" },
    { name: "Noah K.", age: 8, code: "97156", tone: "care", status: "Parent training", hrs: "4/wk", auth: "48 units left", next: "Mon 3:30", focus: "Generalization" },
  ];
  function Clients() {
    const [q, setQ] = R.useState("");
    const rows = CLIENTS.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
    return (
      <div style={{ padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="aminy-h3">Your caseload</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>5 active · a healthy load is 6–8. You have room for 2 more.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 14px", background: "#fff", border: "1px solid var(--color-border-strong)", borderRadius: 999, color: "var(--color-text-muted)", width: 220 }}>
            <Ico n="search" s={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" style={{ border: 0, outline: 0, background: "transparent", fontSize: 13, fontFamily: "var(--font-ui)", color: "var(--color-text)", width: "100%" }} />
          </div>
        </div>
        <Card padding={0}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 1fr 1.1fr 1fr 0.6fr", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--color-border)", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
            <span>Client</span><span>CPT</span><span>Status</span><span>Authorization</span><span>Next visit</span><span></span>
          </div>
          {rows.map((c, i) => (
            <div key={i} onClick={() => haptic.light()} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 1fr 1.1fr 1fr 0.6fr", gap: 12, padding: "13px 18px", borderBottom: i < rows.length - 1 ? "1px solid var(--color-border)" : "0", alignItems: "center", fontSize: 13, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={c.name} tone={c.tone === "care" ? "care" : "teal"} size={34} />
                <div><div style={{ fontWeight: 600, color: "var(--color-text-strong)" }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{c.age} yrs · {c.focus}</div></div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{c.code}</span>
              <span><Badge tone={c.tone}>{c.status}</Badge></span>
              <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{c.auth}</span>
              <span style={{ color: "var(--color-text)", fontSize: 12, fontWeight: 600 }}>{c.next}</span>
              <span style={{ textAlign: "right", color: "var(--color-text-subtle)" }}><Ico n="chevron" s={16} /></span>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  // ============ EVV (clock / records / budget) ============
  const AUTHS = [
    { id: "a1", name: "ABA Skills Training", code: "H2014", num: "AZ-2024-78543", used: 196, total: 480 },
    { id: "a2", name: "Adaptive Behavior Tx", code: "97153", num: "AZ-2024-78544", used: 128, total: 320 },
  ];
  const RECORDS = [
    { who: "Maria Garcia, RBT", date: "Feb 24", in: "9:00 AM", out: "12:15 PM", dur: "3h 15m", units: 13, code: "H2014", status: "verified", loc: "1234 Elm St, Phoenix" },
    { who: "Maria Garcia, RBT", date: "Feb 22", in: "1:30 PM", out: "4:00 PM", dur: "2h 30m", units: 10, code: "H2014", status: "verified", loc: "1234 Elm St, Phoenix" },
    { who: "Dr. Sarah Chen, BCBA", date: "Feb 21", in: "10:00 AM", out: "11:00 AM", dur: "1h 0m", units: 4, code: "97153", status: "submitted", loc: "Aminy Clinic, Phoenix" },
    { who: "Maria Garcia, RBT", date: "Feb 20", in: "9:00 AM", out: "11:30 AM", dur: "2h 30m", units: 10, code: "H2014", status: "pending", loc: "Location mismatch" },
  ];
  const RSTATUS = { verified: "grow", submitted: "care", pending: "win", rejected: "navy" };
  function EVV() {
    const [tab, setTab] = R.useState("clock");
    const [running, setRunning] = R.useState(false);
    const [secs, setSecs] = R.useState(0);
    const [auth, setAuth] = R.useState("a1");
    R.useEffect(() => { if (!running) return; const id = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(id); }, [running]);
    const fmt = (s) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    const TABS = [["clock", "Clock In/Out"], ["records", "Records"], ["budget", "Budget"]];
    return (
      <div style={{ padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div className="aminy-h3" style={{ display: "flex", alignItems: "center", gap: 8 }}>Visit verification</div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>Arizona DDD pilot · GPS-verified shadow EVV · clock, reconcile, export.</div>
        </div>
        <div style={{ display: "flex", gap: 9, background: "var(--aminy-win-50)", border: "1px solid var(--aminy-win-100)", borderRadius: 12, padding: "10px 14px" }}>
          <Ico n="alert" s={16} style={{ color: "var(--aminy-win-600)", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "var(--aminy-win-600)", lineHeight: 1.5 }}>Shadow mode — confirm payroll-critical submissions in your primary EVV system until the pilot is validated.</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {TABS.map(([id, lb]) => (
            <button key={id} onClick={() => { haptic.light(); setTab(id); }} style={{ padding: "8px 16px", borderRadius: 9, border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, background: tab === id ? "var(--aminy-teal-600)" : "transparent", color: tab === id ? "#fff" : "var(--color-text-muted)" }}>{lb}</button>
          ))}
        </div>

        {tab === "clock" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 12 }}>Service authorization</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {AUTHS.map((a) => {
                  const on = auth === a.id;
                  return (
                    <button key={a.id} onClick={() => { haptic.light(); setAuth(a.id); }} style={{ textAlign: "left", padding: 12, borderRadius: 12, cursor: "pointer", border: `2px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border)"}`, background: on ? "var(--aminy-teal-50)" : "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)" }}>{a.name}</div><div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{a.code} · Auth #{a.num}</div></div>
                        <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, fontWeight: 700, color: "var(--aminy-teal-700)" }}>{a.total - a.used}</div><div style={{ fontSize: 10, color: "var(--color-text-subtle)" }}>of {a.total}</div></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
            <Card>
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                {running ? (
                  <>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Session in progress</div>
                    <div style={{ fontSize: 42, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-text-strong)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{fmt(secs)}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "6px 0 16px", display: "inline-flex", alignItems: "center", gap: 5 }}><Ico n="pin" s={13} /> GPS verified · {Math.ceil(secs / 900)} units</div>
                    <button onClick={() => { haptic.success(); setRunning(false); setSecs(0); }} style={{ width: "100%", height: 52, borderRadius: 14, border: 0, cursor: "pointer", background: "var(--aminy-alert-600)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Ico n="stop" s={18} /> Clock Out</button>
                  </>
                ) : (
                  <>
                    <div style={{ width: 72, height: 72, margin: "4px auto 14px", borderRadius: "50%", background: "var(--aminy-teal-50)", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico n="timer" s={32} /></div>
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16, lineHeight: 1.5 }}>Pick an authorization, then clock in to start tracking this visit.</div>
                    <button onClick={() => { haptic.success(); setRunning(true); }} style={{ width: "100%", height: 52, borderRadius: 14, border: 0, cursor: "pointer", background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "var(--shadow-cta)" }}><Ico n="play" s={18} /> Clock In</button>
                    <div style={{ fontSize: 11, color: "var(--color-text-subtle)", marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5 }}><Ico n="pin" s={12} /> GPS location recorded for EVV compliance</div>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {tab === "records" && (
          <Card padding={0}>
            {RECORDS.map((r, i) => (
              <div key={i} style={{ padding: "14px 18px", borderBottom: i < RECORDS.length - 1 ? "1px solid var(--color-border)" : "0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div><div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)" }}>{r.who}</div><div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{r.date}</div></div>
                  <Badge tone={RSTATUS[r.status]}>{r.status}</Badge>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, fontSize: 12 }}>
                  {[["In", r.in], ["Out", r.out], ["Duration", r.dur], ["Units", `${r.units} · ${r.code}`]].map(([k, v]) => (
                    <div key={k}><div style={{ color: "var(--color-text-subtle)" }}>{k}</div><div style={{ fontWeight: 600, color: "var(--color-text)" }}>{v}</div></div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11, color: r.status === "pending" ? "var(--aminy-win-600)" : "var(--color-text-muted)" }}><Ico n="pin" s={12} /> {r.loc}</div>
              </div>
            ))}
          </Card>
        )}

        {tab === "budget" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {AUTHS.map((a) => {
              const pct = Math.round((a.used / a.total) * 100);
              const col = pct > 90 ? "var(--aminy-alert-600)" : pct > 70 ? "var(--aminy-win-500)" : "var(--aminy-teal-600)";
              return (
                <Card key={a.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div><div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{a.name}</div><div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Auth #{a.num}</div></div>
                    <Badge tone={pct > 90 ? "win" : "grow"}>{pct > 90 ? "Review usage" : "On track"}</Badge>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 5 }}><span>{a.used} used</span><span>{a.total - a.used} remaining</span></div>
                  <div style={{ height: 10, background: "var(--aminy-navy-50)", borderRadius: 5, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: col, borderRadius: 5 }} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border)", textAlign: "center" }}>
                    {[["Days left", "68"], ["Units/wk", "32"], ["Projected end", "Apr 12"]].map(([k, v]) => (
                      <div key={k}><div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-strong)" }}>{v}</div><div style={{ fontSize: 11, color: "var(--color-text-subtle)" }}>{k}</div></div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ============ RBT SUPERVISION ============
  const RBTS = [
    { name: "Maria Garcia", role: "RBT", clients: 4, supHrs: 4.2, reqHrs: 5, pct: 84, next: "Fri 1:00", tone: "win" },
    { name: "Jordan Lee", role: "RBT", clients: 3, supHrs: 5.1, reqHrs: 5, pct: 102, next: "Done this month", tone: "grow" },
    { name: "Priya Shah", role: "RBT-T", clients: 2, supHrs: 2.0, reqHrs: 5, pct: 40, next: "Tue 10:00", tone: "care" },
  ];
  function Supervision() {
    return (
      <div style={{ padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div className="aminy-h3">RBT supervision</div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>BACB requires ≥5% of each RBT's monthly hours under your supervision. Aminy tracks it automatically.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          <Stat label="RBTs supervised" value="3" caption="2 on track · 1 behind" />
          <Stat label="Supervision logged" value="11.3" unit="hrs" caption="This month" accent />
          <Stat label="Due this week" value="2" unit="sessions" caption="Maria, Priya" />
        </div>
        <Card padding={0}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", fontWeight: 600, color: "var(--color-text-strong)" }}>Your supervisees</div>
          {RBTS.map((r, i) => (
            <div key={i} style={{ padding: "14px 18px", borderBottom: i < RBTS.length - 1 ? "1px solid var(--color-border)" : "0", display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar name={r.name} tone="teal" size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{r.name}</span><Badge tone="navy">{r.role}</Badge></div>
                <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>{r.clients} clients · next: {r.next}</div>
              </div>
              <div style={{ width: 160 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}><span>{r.supHrs}/{r.reqHrs} hrs</span><span style={{ fontWeight: 700, color: r.pct >= 100 ? "var(--aminy-grow-600)" : r.pct >= 80 ? "var(--aminy-win-600)" : "var(--aminy-care-600)" }}>{r.pct}%</span></div>
                <div style={{ height: 7, background: "var(--aminy-navy-50)", borderRadius: 4, overflow: "hidden" }}><div style={{ width: Math.min(100, r.pct) + "%", height: "100%", borderRadius: 4, background: r.pct >= 100 ? "var(--aminy-grow-500)" : r.pct >= 80 ? "var(--aminy-win-500)" : "var(--aminy-care-600)" }} /></div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => haptic.light()}>Log session</Button>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  // ============ REVIEW INBOX (sign-off queue) ============
  const QUEUE = [
    { id: "q1", kind: "Family question", who: "Sarah (Kai's mom)", topic: "Feeding", when: "2h ago", q: "Kai bolts from the dinner table after two bites every night. How do we build tolerance without making meals a battle?", ai: "Start with \"first two bites, then a break\" — let him leave, then return. Keep portions tiny and predictable. Build sitting time by 30 seconds a week. Pair the table with a regulating fidget he only gets at meals. We're shaping duration, not intake.", sum: "Mealtime escape behavior — wants tolerance-building without conflict." },
    { id: "q2", kind: "Session note", who: "Kai R. · 97153", topic: "SOAP", when: "Today 12:15", q: "90-min NET session. 14 independent mands (↑ from 9), 2 brief transition protests recovered <60s.", ai: "S: Caregiver reports smoother mornings. O: 14 independent mands, prompt-fading criteria met for tooth-brushing. A: On trajectory for Goal 1. P: Continue NET 25h/wk; introduce delayed reinforcement.", sum: "Strong manding gains; ready to sign + bill 6 units." },
    { id: "q3", kind: "Family question", who: "Alex (Kai's dad)", topic: "Sleep", when: "Yesterday", q: "Bedtime is taking 90 minutes. Is that normal and what can we try?", ai: "A 30-minute \"bedtime runway\" with dimmed lights, screens off, and the same 3 steps in order helps. Kai's nervous system needs predictability to wind down. One consistent night already helps.", sum: "Bedtime latency ~90min — wants a wind-down routine." },
  ];
  function Review() {
    const [items, setItems] = R.useState(QUEUE);
    const [active, setActive] = R.useState(null);
    const [draft, setDraft] = R.useState("");
    const open = items.find((x) => x.id === active);
    function openItem(it) { haptic.light(); setActive(it.id); setDraft(it.ai); }
    function sign() { haptic.success(); setItems((a) => a.filter((x) => x.id !== active)); setActive(null); window.aminyToast && window.aminyToast("Signed & sent to the family ✓"); }

    if (open) {
      return (
        <div style={{ padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
          <button onClick={() => setActive(null)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, background: "none", border: 0, cursor: "pointer", color: "var(--aminy-teal-700)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600 }}>← Back to queue</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge tone={open.kind === "Session note" ? "care" : "teal"}>{open.kind}</Badge>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{open.who} · {open.when}</span>
          </div>
          <Card>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 6 }}>{open.kind === "Session note" ? "Session data" : "Their question"}</div>
            <div style={{ fontSize: 14, color: "var(--color-text-strong)", lineHeight: 1.55 }}>{open.q}</div>
          </Card>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <Ico n="sparkles" s={15} style={{ color: "var(--aminy-teal-700)" }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--aminy-teal-700)" }}>Aminy draft — edit, then sign</span>
            </div>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={7} style={{ width: "100%", boxSizing: "border-box", fontSize: 14, fontFamily: "var(--font-ui)", color: "var(--color-text)", border: "1px solid var(--aminy-teal-200)", borderRadius: 14, padding: "14px 16px", resize: "none", outline: "none", lineHeight: 1.6, background: "var(--aminy-teal-50)" }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button variant="primary" icon={<Ico n="shield" s={16} />} onClick={sign}>Sign &amp; send</Button>
            <Button variant="ghost" onClick={() => setDraft(open.ai)}>Reset to draft</Button>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-text-subtle)" }}>Your signature attests clinical accuracy · retained 7 yrs (BACB 4.05)</span>
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div className="aminy-h3">Needs your sign-off</div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>Aminy drafts every family answer and session note. You review, edit, and sign — nothing reaches a family unsigned.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          <Stat label="Awaiting you" value={items.length} caption="Questions + notes" accent />
          <Stat label="Avg review time" value="2" unit="min" caption="With AI drafts" />
          <Stat label="Signed this week" value="18" caption="On time" />
        </div>
        <Card padding={0}>
          {items.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}><Ico n="check" s={28} style={{ color: "var(--aminy-grow-500)" }} /><div style={{ marginTop: 8, fontWeight: 600, color: "var(--color-text-strong)" }}>All caught up</div><div style={{ fontSize: 13 }}>Nothing waiting on your signature.</div></div>
          ) : items.map((it, i) => (
            <button key={it.id} onClick={() => openItem(it)} style={{ width: "100%", textAlign: "left", display: "flex", gap: 14, padding: "16px 18px", borderBottom: i < items.length - 1 ? "1px solid var(--color-border)" : "0", background: "none", border: 0, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomStyle: "solid", borderBottomColor: "var(--color-border)", cursor: "pointer", alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: it.kind === "Session note" ? "var(--aminy-care-50)" : "var(--aminy-teal-50)", color: it.kind === "Session note" ? "var(--aminy-care-600)" : "var(--aminy-teal-700)" }}><Ico n={it.kind === "Session note" ? "notes" : "inbox"} s={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <Badge tone={it.kind === "Session note" ? "care" : "teal"}>{it.kind}</Badge>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{it.who} · {it.when}</span>
                </div>
                <div style={{ fontSize: 13.5, color: "var(--color-text-strong)", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 6 }}><Ico n="sparkles" s={13} style={{ color: "var(--aminy-teal-600)", flexShrink: 0 }} /> {it.sum}</div>
              </div>
              <Ico n="chevron" s={16} style={{ color: "var(--color-text-subtle)", marginTop: 8, flexShrink: 0 }} />
            </button>
          ))}
        </Card>
      </div>
    );
  }

  // ============ SCHEDULE (joinable visits + add-to-calendar) ============
  const TODAY_VISITS = [
    { time: "9:00", end: "11:00", client: "Kai R.", code: "97153", kind: "Direct · NET", joinable: true, soon: true },
    { time: "11:30", end: "12:30", client: "Mia T.", code: "97155", kind: "Supervision", joinable: true, soon: false },
    { time: "2:00", end: "2:45", client: "The Okafors", code: "97156", kind: "Parent training", joinable: true, soon: false },
    { time: "3:30", end: "4:00", client: "Sign-off block", code: "—", kind: "Note review", joinable: false, soon: false },
  ];
  function calLinks(v) {
    // Build real calendar URLs (Google explicit; Apple/Outlook via .ics download in production)
    const title = encodeURIComponent(`Aminy: ${v.client} (${v.code})`);
    return {
      google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${encodeURIComponent(v.kind)}`,
      outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${encodeURIComponent(v.kind)}`,
    };
  }
  function Schedule() {
    const [joining, setJoining] = R.useState(null);
    const [calFor, setCalFor] = R.useState(null);
    if (joining) {
      return (
        <div style={{ padding: 0, flex: 1, display: "flex", flexDirection: "column", background: "#0C1620", minHeight: 600 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, color: "#fff" }}>
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg,var(--aminy-teal-500),var(--aminy-teal-700))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 34, fontFamily: "var(--font-ui)", animation: "aminy-breathe 4s var(--ease-breath) infinite" }}>{joining.client.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-ui)", letterSpacing: "-0.02em" }}>Telehealth · {joining.client}</div>
            <div style={{ fontSize: 13, color: "#8FA3B2" }}>Secure room · {joining.code} · {joining.kind}</div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={() => { haptic.medium(); setJoining(null); }} style={{ height: 48, padding: "0 22px", borderRadius: 14, border: "1px solid #2C4253", background: "transparent", color: "#D6E2EA", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Leave</button>
              <button style={{ height: 48, padding: "0 22px", borderRadius: 14, border: 0, background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><Ico n="video" s={18} /> In session</button>
            </div>
            <div style={{ fontSize: 11, color: "#5E7488", marginTop: 4 }}>Powered by a HIPAA-conscious video room</div>
          </div>
        </div>
      );
    }
    return (
      <div style={{ padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="aminy-h3">Today · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>4 visits · join directly, no separate link to hunt for.</div>
          </div>
          <Button size="sm" variant="secondary" icon={<Ico n="plus" s={15} />} onClick={() => { haptic.light(); window.aminyToast && window.aminyToast("New visit — pick a client & time"); }}>Add visit</Button>
        </div>
        <Card padding={0}>
          {TODAY_VISITS.map((v, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", borderBottom: i < TODAY_VISITS.length - 1 ? "1px solid var(--color-border)" : "0", background: v.soon ? "var(--aminy-teal-50)" : "transparent" }}>
              <div style={{ width: 58, flexShrink: 0, textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-strong)" }}>{v.time}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-subtle)" }}>{v.end}</div>
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "var(--color-border)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{v.client}</span>
                  {v.soon && <Badge tone="teal">Starts soon</Badge>}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{v.kind}{v.code !== "—" ? ` · ${v.code}` : ""}</div>
              </div>
              <div style={{ position: "relative", display: "flex", gap: 8, alignItems: "center" }}>
                {v.joinable && (
                  <button onClick={() => { haptic.light(); setCalFor(calFor === i ? null : i); }} aria-label="Add to calendar" style={{ width: 40, height: 40, borderRadius: 11, border: "1px solid var(--color-border-strong)", background: "#fff", color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Ico n="calendar" s={17} /></button>
                )}
                {v.joinable
                  ? <button onClick={() => { haptic.success(); setJoining(v); }} style={{ height: 40, padding: "0 16px", borderRadius: 11, border: 0, background: v.soon ? "var(--aminy-teal-600)" : "#fff", color: v.soon ? "#fff" : "var(--aminy-teal-700)", boxShadow: v.soon ? "var(--shadow-cta)" : "inset 0 0 0 1px var(--aminy-teal-200)", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Ico n="video" s={16} /> Join</button>
                  : <span style={{ fontSize: 12, color: "var(--color-text-subtle)", paddingRight: 6 }}>—</span>}
                {calFor === i && (
                  <div style={{ position: "absolute", top: 46, right: 0, zIndex: 5, background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 6, width: 168 }}>
                    {[["Apple Calendar", "apple"], ["Google Calendar", "google"], ["Outlook", "outlook"]].map(([lb, k]) => (
                      <a key={k} href={k === "apple" ? "#" : calLinks(v)[k]} target="_blank" rel="noreferrer" onClick={() => { haptic.light(); setCalFor(null); window.aminyToast && window.aminyToast("Added to " + lb); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 8, textDecoration: "none", color: "var(--color-text)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500 }}><Ico n="calendar" s={14} style={{ color: "var(--aminy-teal-700)" }} /> {lb}</a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>
        <div style={{ fontSize: 12, color: "var(--color-text-subtle)", textAlign: "center" }}>Visits auto-sync to your connected calendar · families get the same join link in their app.</div>
      </div>
    );
  }

  // ============ MESSAGES (provider ↔ family threads) ============
  const THREADS = [
    { id: "m1", who: "Sarah (Kai's mom)", child: "Kai R.", last: "Thank you — we'll try the timer tonight 💛", time: "9:32a", unread: 0, you: false,
      msgs: [["fam", "Quick one — Kai had a great morning! The first-then board worked."], ["me", "That's wonderful. Consistency is doing the heavy lifting. Keep the same order each day."], ["fam", "Thank you — we'll try the timer tonight 💛"]] },
    { id: "m2", who: "Alex (Kai's dad)", child: "Kai R.", last: "Sounds good, see you Thursday", time: "Yest", unread: 2, you: false,
      msgs: [["fam", "Are we still on for Thursday's review?"], ["me", "Yes — 2pm telehealth. I'll bring the updated goals."], ["fam", "Sounds good, see you Thursday"]] },
    { id: "m3", who: "Mia's parents", child: "Mia T.", last: "You: Shared this week's note", time: "Mon", unread: 0, you: true,
      msgs: [["me", "Shared this week's session note — Mia's manding is really taking off."]] },
  ];
  function Messages() {
    const [active, setActive] = R.useState(null);
    const [text, setText] = R.useState("");
    const [extra, setExtra] = R.useState({});
    const open = THREADS.find((t) => t.id === active);
    const endRef = R.useRef(null);
    R.useEffect(() => { if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight; }, [active, extra]);
    function send() {
      if (!text.trim()) return;
      haptic.light();
      setExtra((e) => ({ ...e, [active]: [...(e[active] || []), ["me", text.trim()]] }));
      setText("");
    }
    if (open) {
      const all = [...open.msgs, ...(extra[active] || [])];
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, height: 728 }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setActive(null)} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--aminy-teal-700)", fontSize: 18 }}>←</button>
            <Avatar name={open.who} tone="teal" size={38} />
            <div><div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--color-text-strong)" }}>{open.who}</div><div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Re: {open.child}</div></div>
          </div>
          <div ref={endRef} style={{ flex: 1, overflowY: "auto", padding: "18px 24px", display: "flex", flexDirection: "column", gap: 10, background: "var(--aminy-mist)" }}>
            {all.map(([who, body], i) => (
              <div key={i} style={{ maxWidth: "70%", alignSelf: who === "me" ? "flex-end" : "flex-start", padding: "10px 14px", borderRadius: 16, fontSize: 14, lineHeight: 1.45, background: who === "me" ? "var(--aminy-teal-600)" : "var(--color-bg-elevated)", color: who === "me" ? "#fff" : "var(--color-text)", border: who === "me" ? 0 : "1px solid var(--color-border)", borderBottomRightRadius: who === "me" ? 5 : 16, borderBottomLeftRadius: who === "me" ? 16 : 5 }}>{body}</div>
            ))}
          </div>
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", gap: 10, alignItems: "center" }}>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message the family…" style={{ flex: 1, height: 44, border: "1px solid var(--color-border-strong)", borderRadius: 999, padding: "0 16px", fontSize: 14, fontFamily: "var(--font-ui)", color: "var(--color-text)", outline: "none", background: "var(--color-bg-elevated)" }} />
            <button onClick={send} aria-label="Send" style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--aminy-teal-600)", color: "#fff", border: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-cta)" }}><Ico n="send" s={17} /></button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div className="aminy-h3">Messages</div><div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>Direct, async threads with your families. Calm and on the record.</div></div>
          <Button size="sm" variant="secondary" icon={<Ico n="plus" s={15} />} onClick={() => { haptic.light(); window.aminyToast && window.aminyToast("New message — pick a family"); }}>New message</Button>
        </div>
        <Card padding={0}>
          {THREADS.map((t, i) => (
            <button key={t.id} onClick={() => { haptic.light(); setActive(t.id); }} style={{ width: "100%", textAlign: "left", display: "flex", gap: 14, padding: "15px 18px", borderBottom: i < THREADS.length - 1 ? "1px solid var(--color-border)" : "0", background: "none", border: 0, borderBottomWidth: i < THREADS.length - 1 ? 1 : 0, borderBottomStyle: "solid", borderBottomColor: "var(--color-border)", cursor: "pointer", alignItems: "center" }}>
              <Avatar name={t.who} tone="teal" size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{t.who}</span>
                  <span style={{ fontSize: 11.5, color: "var(--color-text-subtle)", flexShrink: 0 }}>{t.time}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 3 }}>
                  <span style={{ fontSize: 13, color: t.unread ? "var(--color-text-strong)" : "var(--color-text-muted)", fontWeight: t.unread ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.last}</span>
                  {t.unread > 0 && <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 999, background: "var(--aminy-teal-600)", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{t.unread}</span>}
                </div>
              </div>
            </button>
          ))}
        </Card>
      </div>
    );
  }

  window.ProviderScreens = { Clients, EVV, Supervision, Review, Schedule, Messages };
})();