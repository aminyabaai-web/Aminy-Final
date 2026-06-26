/* Parent AI surfaces ported from the real app:
   - InsightsScreen  ← AnalyticsCharts.tsx (progress trends, patterns, mood, time-of-day)
   - CheckinsScreen  ← ActionItems.tsx (OneMedical-style conversational AI check-ins)
   - RemindersScreen ← AdaptiveReminders.tsx (AI-suggested times, tone, live preview)
   - ReportsScreen   ← AIReportGenerator.tsx (IEP / Progress / BCBA notes / Insurance letter)
   Exports: window.InsightsScreen, CheckinsScreen, RemindersScreen, ReportsScreen */
(function () {
  const { AIcon } = window;
  const R = React;
  const haptic = (k) => { try { window.aminyHaptic && window.aminyHaptic[k] && window.aminyHaptic[k](); } catch (e) {} };
  const toast = (msg, sub) => { try { window.aminyToast ? window.aminyToast(msg, sub) : null; } catch (e) {} };

  /* ---------- shared chrome ---------- */
  function Header({ title, sub, onBack, right }) {
    return (
      <div style={{ flexShrink: 0, padding: "8px 16px 12px", borderBottom: "1px solid var(--color-border)", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => { haptic("light"); onBack && onBack(); }} aria-label="Back" style={{ width: 38, height: 38, borderRadius: 11, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)", flexShrink: 0 }}><AIcon name="chevron" size={18} style={{ transform: "rotate(180deg)" }} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="aminy-h2" style={{ fontSize: 19, lineHeight: 1.15 }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>{sub}</div>}
          </div>
          {right}
        </div>
      </div>
    );
  }
  function Card({ children, style }) {
    return <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 15, boxShadow: "var(--shadow-sm)", ...style }}>{children}</div>;
  }
  function SectionLabel({ icon, color, children }) {
    return <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>{icon && <AIcon name={icon} size={17} style={{ color: color || "var(--aminy-teal-600)" }} />}<span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text-strong)" }}>{children}</span></div>;
  }

  /* ============================================================
     1. INSIGHTS  (AnalyticsCharts)
     ============================================================ */
  const PROGRESS = [52, 49, 55, 58, 54, 61, 59, 64, 62, 68, 66, 71, 69, 74];
  const PATTERNS = [
    { label: "Morning transitions", v: 85, trend: "up" },
    { label: "Mealtime cooperation", v: 68, trend: "stable" },
    { label: "Bedtime routine", v: 52, trend: "up" },
    { label: "Task completion", v: 72, trend: "up" },
    { label: "Emotional regulation", v: 58, trend: "stable" },
  ];
  const MOODS = [
    { label: "Happy", pct: 45, c: "var(--aminy-grow-500)" },
    { label: "Calm", pct: 30, c: "var(--aminy-teal-500)" },
    { label: "Frustrated", pct: 15, c: "var(--aminy-win-500)" },
    { label: "Overwhelmed", pct: 10, c: "#e0796b" },
  ];
  const TOD = [5, 9, 15, 12, 8, 10, 14, 18, 11, 4];

  function LineChart({ data }) {
    const W = 320, H = 120, pad = 8;
    const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
    const pts = data.map((v, i) => [pad + (i / (data.length - 1)) * (W - pad * 2), pad + (H - pad * 2) * (1 - (v - min) / range)]);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H - pad} L${pts[0][0].toFixed(1)} ${H - pad} Z`;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs><linearGradient id="insArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--aminy-teal-500)" stopOpacity="0.22" /><stop offset="100%" stopColor="var(--aminy-teal-500)" stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((t) => <line key={t} x1={pad} y1={pad + (H - pad * 2) * t} x2={W - pad} y2={pad + (H - pad * 2) * t} stroke="var(--color-border)" strokeDasharray="3 4" />)}
        <path d={area} fill="url(#insArea)" />
        <path d={line} fill="none" stroke="var(--aminy-teal-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.filter((_, i) => i === pts.length - 1).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke="var(--aminy-teal-600)" strokeWidth="2.5" />)}
      </svg>
    );
  }
  function Donut({ data }) {
    const size = 92, r = 38, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
    let off = 0;
    return (
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0, transform: "rotate(-90deg)" }}>
        {data.map((d, i) => { const len = (d.pct / 100) * C; const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.c} strokeWidth="12" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />; off += len; return el; })}
      </svg>
    );
  }

  function InsightsScreen({ onBack }) {
    const [range, setRange] = R.useState("month");
    const RANGES = [["week", "Week"], ["month", "Month"], ["quarter", "3 mo"]];
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Header title="Insights" sub="Kai's gentle progress" onBack={onBack} />
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 22px", display: "flex", flexDirection: "column", gap: 13 }}>
          {/* range pills */}
          <div style={{ display: "flex", gap: 7 }}>
            {RANGES.map(([id, lb]) => (
              <button key={id} onClick={() => { haptic("light"); setRange(id); }} style={{ flex: 1, padding: "8px 0", borderRadius: 11, border: range === id ? "1.5px solid var(--aminy-teal-500)" : "1px solid var(--color-border)", background: range === id ? "var(--aminy-teal-50)" : "#fff", color: range === id ? "var(--aminy-teal-700)" : "var(--color-text-muted)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{lb}</button>
            ))}
          </div>
          {/* progress */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <SectionLabel icon="trending" color="var(--aminy-teal-600)">Progress over time</SectionLabel>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--aminy-grow-600)", background: "var(--aminy-grow-50)", padding: "3px 9px", borderRadius: 999 }}><AIcon name="trending" size={12} />+18%</span>
            </div>
            <LineChart data={PROGRESS} />
          </Card>
          {/* mood + patterns */}
          <Card>
            <SectionLabel icon="heart" color="#e0796b">Mood distribution</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Donut data={MOODS} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                {MOODS.map((m) => (
                  <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: m.c, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: "var(--color-text-muted)", flex: 1 }}>{m.label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text-strong)" }}>{m.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <SectionLabel icon="barChart" color="var(--jr-primary)">Behavior patterns</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {PATTERNS.map((p) => (
                <div key={p.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: "var(--color-text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: 8 }}>{p.label}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--color-text-muted)", fontWeight: 600 }}>{p.v}%<AIcon name="trending" size={12} style={{ color: p.trend === "up" ? "var(--aminy-grow-600)" : "var(--color-text-subtle)", transform: p.trend === "stable" ? "rotate(0deg)" : "none", opacity: p.trend === "stable" ? 0.4 : 1 }} /></span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: "var(--aminy-mist-deep)", overflow: "hidden" }}><div style={{ height: "100%", width: p.v + "%", borderRadius: 999, background: "linear-gradient(90deg,var(--aminy-teal-400),var(--aminy-teal-600))" }} /></div>
                </div>
              ))}
            </div>
          </Card>
          {/* time of day */}
          <Card>
            <SectionLabel icon="clock" color="var(--aminy-navy-600)">Activity by time of day</SectionLabel>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 70 }}>
              {TOD.map((v, i) => <div key={i} title={v + " activities"} style={{ flex: 1, height: Math.max(8, (v / Math.max(...TOD)) * 100) + "%", borderRadius: "5px 5px 0 0", background: `rgba(42,125,153,${0.25 + 0.6 * (v / Math.max(...TOD))})` }} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10.5, color: "var(--color-text-subtle)" }}><span>6a</span><span>12p</span><span>6p</span><span>10p</span></div>
          </Card>
          {/* AI insight */}
          <div style={{ borderRadius: 16, padding: 15, background: "linear-gradient(135deg,var(--aminy-teal-50),var(--aminy-mist))", border: "1px solid var(--aminy-teal-200)" }}>
            <SectionLabel icon="sparkles" color="var(--aminy-teal-700)">What Aminy noticed</SectionLabel>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7 }}>
              <li style={{ fontSize: 13, color: "var(--aminy-teal-800)", lineHeight: 1.45 }}>Peak focus is <strong>4–8pm</strong> — a good window for harder practice.</li>
              <li style={{ fontSize: 13, color: "var(--aminy-teal-800)", lineHeight: 1.45 }}>Morning transitions improved <strong>15%</strong> over two weeks.</li>
              <li style={{ fontSize: 13, color: "var(--aminy-teal-800)", lineHeight: 1.45 }}>Keep the bedtime visual schedule — it's working.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     2. CHECK-INS  (ActionItems — conversational AI)
     ============================================================ */
  const CHECKINS = [
    { id: "energy", icon: "heart", title: "Daily energy check", desc: "Quick check-in on how you're doing today", pri: "high", min: 2, color: "var(--aminy-win-600)", bg: "var(--aminy-win-50)",
      greet: "Hi Maya — before we talk about Kai, how are you doing today? On a scale of running-on-empty to fully-charged, where are you?",
      replies: ["Honestly pretty drained", "Doing okay today", "Actually a good day"],
      followup: "Thank you for being honest — drained days are real, especially this week. One small thing: could you steal ten quiet minutes after Kai's asleep tonight, just for you? I've got the rest. 💛",
    },
    { id: "stress", icon: "brain", title: "Caregiver stress check", desc: "Understanding your stress to support you better", pri: "medium", min: 5, color: "var(--jr-primary)", bg: "var(--jr-purple-50)",
      greet: "I'd love to understand your week a little better so I can help more. When you think about time for yourself versus everything caregiving asks of you — how's that balance feeling lately?",
      replies: ["There's no time for me", "It comes and goes", "Managing alright"],
      followup: "That's one of the heaviest parts and you're carrying it well. You named it, which matters. I'll keep surfacing the small wins so the load feels lighter — and remember Ask-a-BCBA is there for the bigger questions.",
    },
    { id: "sensory", icon: "sparkles", title: "Sensory preferences", desc: "Help me understand Kai's sensory world", pri: "medium", min: 5, color: "var(--aminy-teal-700)", bg: "var(--aminy-teal-50)",
      greet: "Let's get to know how Kai experiences the world. When things get loud or busy — a store, a party — what do you usually see from him?",
      replies: ["He covers his ears", "He gets really active", "He shuts down"],
      followup: "That tells me a lot — sounds like Kai is sensory-sensitive to noise. I'll factor that into the activities I suggest and the calming tools in Ease. Noise-reducing headphones in busy places can be a small game-changer.",
    },
    { id: "comm", icon: "users", title: "Communication style", desc: "Learn how Kai expresses himself", pri: "high", min: 4, color: "var(--aminy-navy-700)", bg: "var(--aminy-navy-50)",
      greet: "How does Kai usually let you know what he wants — words, pointing, taking your hand, something else?",
      replies: ["A few words", "Mostly pointing", "He pulls me to it"],
      followup: "Great — emerging words plus gestures is a real foundation to build on. I'll keep my tips at the right level and celebrate every new word with you. Narrating what he points to ('You want the cup!') is a lovely next step.",
    },
    { id: "sleep", icon: "moon", title: "Sleep patterns", desc: "How has sleep been going lately?", pri: "low", min: 3, color: "var(--aminy-navy-600)", bg: "var(--aminy-navy-50)",
      greet: "Quick one on sleep — what does a typical bedtime look like right now, and how long does it usually take Kai to settle?",
      replies: ["It's a long battle", "Pretty smooth lately", "Lots of night wakings"],
      followup: "Thanks — that helps me tailor advice. A predictable 3-step wind-down (bath → book → lights low) at the same time each night is the single biggest lever. Want me to add it to your plan?",
    },
    { id: "eating", icon: "target", title: "Eating & mealtimes", desc: "Quick check on how meals are going", pri: "low", min: 3, color: "var(--aminy-grow-600)", bg: "var(--aminy-grow-50)",
      greet: "How are mealtimes feeling these days — roughly how many foods is Kai comfortable eating right now?",
      replies: ["A very short list", "It varies a lot", "He's pretty flexible"],
      followup: "Feeding challenges are exhausting and you're not alone in this. We never pressure — just gentle exposure. Putting one new food *near* a safe food, no expectation to eat it, is a kind first step.",
    },
  ];

  function CheckinChat({ item, onClose, onDone }) {
    const [msgs, setMsgs] = R.useState([{ who: "ai", text: item.greet }]);
    const [stage, setStage] = R.useState(0); // 0 = awaiting reply, 1 = done
    const endRef = R.useRef(null);
    R.useEffect(() => { if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight; }, [msgs]);
    function pick(r) {
      haptic("light");
      setMsgs((m) => [...m, { who: "me", text: r }]);
      setTimeout(() => { setMsgs((m) => [...m, { who: "ai", text: item.followup }]); setStage(1); }, 650);
    }
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", background: "var(--aminy-mist)" }}>
        <div style={{ flexShrink: 0, padding: "10px 14px", borderBottom: "1px solid var(--color-border)", background: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: item.bg, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name={item.icon} size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text-strong)" }}>{item.title}</div><div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>~{item.min} min · with Aminy</div></div>
          <button onClick={() => { haptic("light"); onClose(); }} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 17 }}>✕</button>
        </div>
        <div ref={endRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.who === "me" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7 }}>
              {m.who === "ai" && <div style={{ width: 26, height: 26, borderRadius: 999, background: "linear-gradient(135deg,var(--aminy-teal-500),var(--aminy-teal-700))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name="sparkles" size={13} style={{ color: "#fff" }} /></div>}
              <div style={{ maxWidth: "78%", padding: "10px 13px", borderRadius: 16, borderBottomLeftRadius: m.who === "ai" ? 5 : 16, borderBottomRightRadius: m.who === "me" ? 5 : 16, background: m.who === "me" ? "var(--aminy-teal-600)" : "#fff", color: m.who === "me" ? "#fff" : "var(--color-text)", border: m.who === "me" ? "none" : "1px solid var(--color-border)", fontSize: 13.5, lineHeight: 1.5, boxShadow: "var(--shadow-sm)" }}>{m.text}</div>
            </div>
          ))}
        </div>
        <div style={{ flexShrink: 0, padding: "12px 14px", borderTop: "1px solid var(--color-border)", background: "#fff" }}>
          {stage === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {item.replies.map((r) => <button key={r} onClick={() => pick(r)} style={{ width: "100%", textAlign: "left", padding: "11px 14px", borderRadius: 12, border: "1px solid var(--aminy-teal-200)", background: "var(--aminy-teal-50)", color: "var(--aminy-teal-800)", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>{r}</button>)}
            </div>
          ) : (
            <button onClick={() => { haptic("success"); onDone(item.id); }} style={{ width: "100%", padding: "13px", borderRadius: 13, border: "none", background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "var(--shadow-cta)" }}><AIcon name="check" size={17} />Done — thanks for checking in</button>
          )}
        </div>
      </div>
    );
  }

  function CheckinsScreen({ onBack }) {
    const [done, setDone] = R.useState(() => { try { return JSON.parse(localStorage.getItem("aminy-checkins") || "{}"); } catch (e) { return {}; } });
    const [active, setActive] = R.useState(null);
    function complete(id) { const next = { ...done, [id]: true }; setDone(next); localStorage.setItem("aminy-checkins", JSON.stringify(next)); setActive(null); toast("Check-in saved", "Aminy will remember this"); }
    const items = [...CHECKINS].sort((a, b) => (done[a.id] ? 1 : 0) - (done[b.id] ? 1 : 0));
    const left = CHECKINS.filter((c) => !done[c.id]).length;
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
        <Header title="Check-ins" sub="Quick chats help Aminy help you" onBack={onBack} right={left > 0 ? <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", background: "var(--aminy-teal-600)", padding: "4px 10px", borderRadius: 999 }}>{left} new</span> : null} />
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ borderRadius: 14, padding: "12px 14px", background: "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-200)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AIcon name="sparkles" size={17} style={{ color: "var(--aminy-teal-700)", marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: "var(--aminy-teal-800)", lineHeight: 1.45 }}>No forms. Just a short conversation — Aminy quietly turns it into a better profile for Kai and you.</div>
          </div>
          {items.map((it) => {
            const isDone = !!done[it.id];
            return (
              <button key={it.id} disabled={isDone} onClick={() => { if (!isDone) { haptic("light"); setActive(it); } }} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 13, padding: "14px 15px", borderRadius: 16, border: "1px solid var(--color-border)", background: isDone ? "var(--aminy-mist)" : "#fff", cursor: isDone ? "default" : "pointer", boxShadow: isDone ? "none" : "var(--shadow-sm)", opacity: isDone ? 0.72 : 1 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDone ? "var(--aminy-grow-50)" : it.bg, color: isDone ? "var(--aminy-grow-600)" : it.color }}><AIcon name={isDone ? "check" : it.icon} size={20} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: isDone ? "var(--color-text-muted)" : "var(--color-text-strong)" }}>{it.title}</span>
                    {!isDone && it.pri === "high" && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--aminy-win-600)", background: "var(--aminy-win-50)", padding: "2px 7px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em" }}>Suggested</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{isDone ? "Completed — Aminy remembers this" : it.desc}</div>
                </div>
                {!isDone && <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-text-subtle)", flexShrink: 0 }}><AIcon name="clock" size={14} /><span style={{ fontSize: 12, fontWeight: 600 }}>{it.min}m</span></div>}
              </button>
            );
          })}
        </div>
        {active && <CheckinChat item={active} onClose={() => setActive(null)} onDone={complete} />}
      </div>
    );
  }

  /* ============================================================
     3. REMINDERS  (AdaptiveReminders)
     ============================================================ */
  const TONES = [["gentle", "Gentle"], ["encouraging", "Encouraging"], ["playful", "Playful"]];
  const REM_MSG = {
    gentle: "Gentle reminder: it's time for Kai's morning routine 🌅",
    encouraging: "You've got this — time for Kai's morning routine 💪",
    playful: "Rise and shine! Let's start the day with Kai 🎉",
  };
  function RoutineRow({ label, desc, time, rec, onChange }) {
    const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
    const sel = { padding: "7px 8px", borderRadius: 9, border: "1px solid var(--color-border)", background: "#fff", color: "var(--color-text)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, cursor: "pointer" };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{label}</div><div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 1 }}>{desc}</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <select value={time.h} onChange={(e) => onChange({ ...time, h: +e.target.value })} style={sel}>{HOURS.map((h) => <option key={h} value={h}>{h}</option>)}</select>
            <span style={{ color: "var(--color-text-muted)" }}>:</span>
            <select value={time.m} onChange={(e) => onChange({ ...time, m: +e.target.value })} style={sel}>{[0, 15, 30, 45].map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}</select>
            <select value={time.p} onChange={(e) => onChange({ ...time, p: e.target.value })} style={sel}><option>AM</option><option>PM</option></select>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 10, background: "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-200)" }}>
          <AIcon name="lightbulb" size={14} style={{ color: "var(--aminy-teal-700)", flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--aminy-teal-800)" }}>{rec}</span>
        </div>
      </div>
    );
  }
  function RemindersScreen({ onBack }) {
    const [on, setOn] = R.useState(true);
    const [tone, setTone] = R.useState("gentle");
    const [morning, setMorning] = R.useState({ h: 7, m: 30, p: "AM" });
    const [aft, setAft] = R.useState({ h: 3, m: 0, p: "PM" });
    const [eve, setEve] = R.useState({ h: 7, m: 30, p: "PM" });
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Header title="Reminders" sub="Aminy nudges, on your schedule" onBack={onBack} />
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 22px", display: "flex", flexDirection: "column", gap: 13 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <AIcon name="bell" size={20} style={{ color: on ? "var(--aminy-teal-600)" : "var(--color-text-subtle)" }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text-strong)" }}>Send me reminders</div><div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>For routines, practice & wind-down</div></div>
              <button onClick={() => { haptic("light"); setOn((v) => !v); }} aria-label="Toggle reminders" style={{ width: 46, height: 28, borderRadius: 999, border: "none", background: on ? "var(--aminy-teal-600)" : "var(--aminy-mist-deep)", position: "relative", cursor: "pointer", transition: "background var(--dur-fast)", flexShrink: 0 }}><span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 999, background: "#fff", boxShadow: "var(--shadow-sm)", transition: "left var(--dur-fast)" }} /></button>
            </div>
          </Card>
          {on && (
            <>
              <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <RoutineRow label="Morning routine" desc="Start the day with structure" time={morning} rec="Aminy suggests 7:15 AM from your patterns" onChange={setMorning} />
                <div style={{ height: 1, background: "var(--color-border)" }} />
                <RoutineRow label="Afternoon practice" desc="After-school learning" time={aft} rec="Aminy suggests 3:15 PM from your patterns" onChange={setAft} />
                <div style={{ height: 1, background: "var(--color-border)" }} />
                <RoutineRow label="Evening wind-down" desc="Calming before bed" time={eve} rec="Aminy suggests 7:15 PM from your patterns" onChange={setEve} />
              </Card>
              <Card>
                <SectionLabel icon="heart" color="#e0796b">Reminder tone</SectionLabel>
                <div style={{ display: "flex", gap: 7 }}>
                  {TONES.map(([id, lb]) => <button key={id} onClick={() => { haptic("light"); setTone(id); }} style={{ flex: 1, padding: "10px 0", borderRadius: 11, border: tone === id ? "1.5px solid var(--aminy-teal-500)" : "1px solid var(--color-border)", background: tone === id ? "var(--aminy-teal-50)" : "#fff", color: tone === id ? "var(--aminy-teal-700)" : "var(--color-text-muted)", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{lb}</button>)}
                </div>
                <div style={{ marginTop: 12, padding: "12px 13px", borderRadius: 12, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: "#fff", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name="bell" size={15} style={{ color: "var(--aminy-teal-600)" }} /></div>
                  <div><div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--color-text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview</div><div style={{ fontSize: 13, color: "var(--color-text)", marginTop: 2, lineHeight: 1.4 }}>{REM_MSG[tone]}</div></div>
                </div>
              </Card>
              <button onClick={() => { haptic("success"); toast("Reminder settings saved", "Your preferences are updated"); }} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "var(--shadow-cta)" }}>Save settings</button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ============================================================
     4. REPORTS  (AIReportGenerator)
     ============================================================ */
  const REPORTS = [
    { id: "progress", title: "Progress report", desc: "Goal tracking & data summary, school-ready", tier: "Core", body: "SUMMARY\nKai has shown steady, encouraging gains this period. Morning-transition independence rose from 45% to 78% of days. Expressive language expanded from ~12 to ~20 functional words.\n\nGOALS\n• Independent morning routine — On track (78%)\n• Two-word requests — Emerging (progressing)\n• Tolerating transitions — Met\n\nRECOMMENDATIONS\nContinue the visual schedule and 4–8pm practice window where focus peaks." },
    { id: "iep", title: "IEP document", desc: "SMART goals & accommodations for school", tier: "Plus", body: "PRESENT LEVELS\nKai is a curious, affectionate 7-year-old who communicates with emerging words and gestures...\n\nSMART GOALS\n1. By [date], Kai will independently complete a 4-step morning routine on 8/10 days.\n2. By [date], Kai will use two-word requests in 70% of opportunities across settings.\n\nACCOMMODATIONS\n• Visual schedule • Noise-reducing headphones in loud settings • Movement breaks every 30 min." },
    { id: "bcba", title: "BCBA session notes", desc: "Professional documentation for sessions", tier: "Plus", body: "SESSION NOTE\nDate: [auto] · Duration: 60 min · Setting: Home\n\nTARGETS ADDRESSED\n• Manding (requesting) — 14 trials, 79% independent\n• Transition tolerance — 6 transitions, 5 successful\n\nDATA & CLINICAL IMPRESSION\nKai responded well to first-then visuals. Recommend fading prompts on manding next session." },
    { id: "coverage", title: "Insurance letter", desc: "Medical-necessity letter for authorization", tier: "Plus", body: "RE: Medical Necessity — ABA Services for Kai [last name]\n\nTo Whom It May Concern,\nThis letter supports the medical necessity of continued ABA therapy. Kai carries a diagnosis of Autism Spectrum Disorder and demonstrates needs in communication, adaptive transitions, and self-regulation...\n\nRequested: 20 hrs/week direct ABA + 2 hrs BCBA supervision." },
  ];
  function ReportsScreen({ onBack }) {
    const [gen, setGen] = R.useState({});      // id -> 'loading' | 'done'
    const [open, setOpen] = R.useState(null);
    function generate(id) { haptic("light"); setGen((g) => ({ ...g, [id]: "loading" })); setTimeout(() => { setGen((g) => ({ ...g, [id]: "done" })); haptic("success"); }, 1400); }
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
        <Header title="AI reports" sub="Clinical documents from Kai's data" onBack={onBack} />
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 22px", display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ borderRadius: 14, padding: "12px 14px", background: "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-200)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AIcon name="sparkles" size={17} style={{ color: "var(--aminy-teal-700)", marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: "var(--aminy-teal-800)", lineHeight: 1.45 }}>Each report uses Kai's real goals, activities & progress — ready for schools, therapists, and insurers. A BCBA reviews clinical docs before they're signed.</div>
          </div>
          {REPORTS.map((rp) => {
            const st = gen[rp.id];
            return (
              <Card key={rp.id} style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 12, padding: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--aminy-navy-50)", color: "var(--aminy-navy-700)" }}><AIcon name="file" size={20} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text-strong)" }}>{rp.title}</span>
                      {st === "done" && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, color: "var(--aminy-grow-600)", background: "var(--aminy-grow-50)", padding: "2px 7px", borderRadius: 999 }}><AIcon name="check" size={11} />Ready</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{rp.desc}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                      <button onClick={() => st === "done" ? setOpen(rp) : generate(rp.id)} disabled={st === "loading"} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 10, border: "none", background: st === "done" ? "var(--aminy-navy-700)" : "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, cursor: st === "loading" ? "default" : "pointer", opacity: st === "loading" ? 0.7 : 1 }}>
                        {st === "loading" ? <><span className="aminy-spin" style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: 999, display: "inline-block" }} />Generating…</> : st === "done" ? <><AIcon name="file" size={13} />View</> : <><AIcon name="sparkles" size={13} />Generate</>}
                      </button>
                      {st === "done" && <button onClick={() => { haptic("light"); toast("Downloaded", rp.title + ".pdf"); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 10, border: "1px solid var(--color-border)", background: "#fff", color: "var(--color-text)", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}><AIcon name="download" size={13} />PDF</button>}
                    </div>
                  </div>
                </div>
                {st === "done" && <div style={{ borderTop: "1px solid var(--color-border)", padding: "11px 14px", background: "var(--aminy-mist)", maxHeight: 92, overflow: "hidden", fontSize: 11.5, color: "var(--color-text-muted)", whiteSpace: "pre-wrap", lineHeight: 1.5, position: "relative" }}>{rp.body.slice(0, 220)}…<div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 32, background: "linear-gradient(transparent,var(--aminy-mist))" }} /></div>}
              </Card>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 4px", color: "var(--color-text-subtle)", fontSize: 11, lineHeight: 1.4 }}><AIcon name="shield" size={14} style={{ flexShrink: 0 }} />Documents contain PHI. Stored securely and shared only with your consent.</div>
        </div>
        {open && (
          <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", background: "#fff" }}>
            <div style={{ flexShrink: 0, padding: "10px 14px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setOpen(null)} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 17 }}>✕</button>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text-strong)" }}>{open.title}</div><div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Kai · {new Date().toLocaleDateString()}</div></div>
              <button onClick={() => { haptic("light"); toast("Downloaded", open.title + ".pdf"); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: "none", background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}><AIcon name="download" size={13} />PDF</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><img src="../../assets/aminy_logo.png" alt="aminy" style={{ height: 26, width: "auto" }} /><span style={{ fontSize: 12, color: "var(--color-text-subtle)", marginLeft: "auto" }}>Reviewed by Dr. A. Morales, BCBA-D</span></div>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--aminy-win-50)", border: "1px solid var(--aminy-win-200)", fontSize: 11, color: "var(--aminy-win-700)", marginBottom: 16 }}>CONFIDENTIAL — contains protected health information (PHI). Handle per HIPAA.</div>
              <pre style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--color-text)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{open.body}</pre>
            </div>
          </div>
        )}
        <style>{`@keyframes aminySpin{to{transform:rotate(360deg)}} .aminy-spin{animation:aminySpin .7s linear infinite}`}</style>
      </div>
    );
  }

  Object.assign(window, { InsightsScreen, CheckinsScreen, RemindersScreen, ReportsScreen });
})();
