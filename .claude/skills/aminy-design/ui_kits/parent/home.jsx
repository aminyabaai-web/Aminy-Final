/* Home — the default parent screen. Validate first, then inform. window.HomeScreen */
(function () {
  const { AIcon } = window;

  const ROUTINES = {
    "☀️": [
      { em: "☀️", t: "Wake & stretch", d: "Curtains, 5 deep breaths together.", time: "7:15", done: true },
      { em: "🦷", t: "Teeth", d: "Two-minute song — Kai picks.", time: "7:30", done: true },
      { em: "👟", t: "Get dressed", d: "Clothes laid out last night.", time: "7:45", done: false },
      { em: "🥣", t: "Breakfast", d: "Same bowl, same spot.", time: "8:00", done: false },
    ],
    "🌤️": [
      { em: "🎒", t: "Pack & go", d: "Backpack by the door.", time: "8:20", done: false },
      { em: "🧩", t: "After-school reset", d: "20 quiet minutes, no questions.", time: "3:30", done: false },
    ],
    "🌙": [
      { em: "🛁", t: "Bath", d: "Warm, low light.", time: "7:00", done: false },
      { em: "📖", t: "Two books", d: "Kai chooses both.", time: "7:30", done: false },
    ],
    "⭐": [
      { em: "💬", t: "High & low", d: "One good thing, one hard thing.", time: "8:00", done: false },
    ],
  };

  // Context-aware affirmations — Aminy adapts the message to time of day + what's
  // happening with Kai this week (here: a rotating set; in-app this is AI-generated
  // from the child's recent patterns, wins, and logged concerns).
  const AFFIRMATIONS = {
    morning: [
      "Mornings have been the hard part lately. Showing up for this one already counts.",
      "You don't have to be perfect. You just have to be present. And you are.",
      "Kai's calmest mornings have followed your steady ones. He's watching you, not the clock.",
    ],
    afternoon: [
      "Whatever this morning was, it's behind you both now. Fresh start, any minute you choose.",
      "Three steady afternoons this week. The reset routine is working — keep going.",
    ],
    evening: [
      "You made it through today. That's not small. Rest is part of the plan too.",
      "Three calm bedtimes in a row. Whatever you're doing at night, it's landing.",
    ],
  };
  const partOfDay = () => { const h = new Date().getHours(); return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"; };

  window.HomeScreen = function HomeScreen({ onNav, onJoin }) {
    const DS = window.DesignSystem_39fb2b;
    const { Avatar, Badge, Nudge, Stat, Button } = DS;
    const [tab, setTab] = React.useState("☀️");
    const [checks, setChecks] = React.useState({ "☀️-0": true, "☀️-1": true });
    const [nudge, setNudge] = React.useState(true);
    const pod = partOfDay();
    const pool = AFFIRMATIONS[pod];
    const [affIdx, setAffIdx] = React.useState(0);

    const rows = ROUTINES[tab];
    const key = (i) => `${tab}-${i}`;
    const isDone = (i) => checks[key(i)] ?? rows[i].done;

    return (
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Sticky header */}
        <div style={{ padding: "6px 20px 18px", background: "linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0))" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div className="aminy-h2" style={{ fontSize: 22 }}>Hi Sarah.</div>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>Here's Kai's calm start today.</div>
            </div>
            <Avatar name="Sarah" tone="teal" size={40} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, margin: "0 0 16px", maxWidth: 330 }}>
            <p className="aminy-affirm" style={{ fontSize: 16.5, margin: 0, flex: 1 }}>
              {pool[affIdx % pool.length]}
            </p>
            <button onClick={() => { window.aminyHaptic && window.aminyHaptic.light(); setAffIdx((i) => i + 1); }} aria-label="Another thought" title="Another thought from Aminy" style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, border: "1px solid var(--color-border)", background: "#fff", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: 2, transition: "transform var(--dur-base) var(--ease-lift)" }} onPointerDown={(e) => e.currentTarget.style.transform = "rotate(60deg)"} onPointerUp={(e) => e.currentTarget.style.transform = "none"} onPointerLeave={(e) => e.currentTarget.style.transform = "none"}><AIcon name="sparkles" size={13} /></button>
          </div>
          {/* Child snapshot */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "var(--shadow-sm)", border: "1px solid var(--color-border)" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar name="Kai" tone="child" size={52} />
              <button onClick={() => window.aminyToast("Add a photo of Kai")} aria-label="Add photo" style={{ position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: 999, background: "var(--aminy-teal-600)", border: "2px solid #fff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}><AIcon name="plus" size={11} /></button>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-strong)" }}>Kai · 7</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3 }}>Focus this week: morning transitions</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Badge tone="teal">Mornings</Badge><Badge tone="navy">Transitions</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll body */}
        <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Today's visit — joinable */}
          <div style={{ background: "#fff", border: "1px solid var(--aminy-teal-200)", borderRadius: 16, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--aminy-teal-50)", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name="video" size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)" }}>OT with Dr. Patel</div>
              <div style={{ fontSize: 12, color: "var(--aminy-teal-700)", marginTop: 1, fontWeight: 600 }}>Starts now · TeleABA</div>
            </div>
            <button onClick={() => onJoin && onJoin()} style={{ height: 38, padding: "0 18px", borderRadius: 11, border: 0, cursor: "pointer", background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 13.5, boxShadow: "var(--shadow-glow-teal)" }}>Join</button>
          </div>
          {/* TeleABA revenue push — prominent, warm */}
          <button onClick={() => onNav && onNav("tele")} style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--aminy-teal-200)", background: "linear-gradient(120deg,var(--aminy-teal-50),#fff)", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 13, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "var(--aminy-teal-600)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "var(--shadow-glow-teal)" }}><AIcon name="video" size={22} style={{ color: "#fff" }} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text-strong)" }}>Book a TeleABA visit</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>Same-week openings · 10% member savings</div>
            </div>
            <AIcon name="chevron" size={18} style={{ color: "var(--aminy-teal-700)" }} />
          </button>
          {/* Upcoming */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {[
              { t: "Today · 3pm", l: "OT with Dr. Patel", m: "TeleABA · 30 min" },
              { t: "Thu", l: "Weekly review", m: "Dr. Morales (BCBA)" },
              { t: "Sat", l: "Park playdate", m: "" },
            ].map((u, i) => (
              <div key={i} style={{ flexShrink: 0, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 14, padding: "10px 12px", minWidth: 144 }}>
                <div style={{ fontSize: 10, color: "var(--aminy-teal-700)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{u.t}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-strong)", marginTop: 4, lineHeight: 1.3 }}>{u.l}</div>
                {u.m && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{u.m}</div>}
              </div>
            ))}
          </div>

          {nudge && (
            <Nudge actions={<>
              <Button size="sm" onClick={() => setNudge(false)}>Try it today</Button>
              <Button size="sm" variant="ghost" onClick={() => setNudge(false)}>Not this one</Button>
            </>}>
              Mornings are rough — you already know. Try teeth <em>before</em> dressed this week. Small change, big difference.
            </Nudge>
          )}

          {/* Stats trio */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            <Stat label="This week" value="5" unit="/7" caption="Routine days" accent />
            <Stat label="Calm streak" value="3" unit="days" caption="Longest this month" />
            <Stat label="Goals met" value="2" unit="/3" caption="One left · no rush" />
          </div>

          {/* Routine */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
            <div className="aminy-h3" style={{ fontSize: 15 }}>Today's routine</div>
            <div style={{ display: "flex", gap: 4, background: "#fff", padding: 3, borderRadius: 999, border: "1px solid var(--color-border)" }}>
              {Object.keys(ROUTINES).map((e) => (
                <button key={e} onClick={() => setTab(e)} style={{ width: 30, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, fontSize: 14, cursor: "pointer", border: 0, background: e === tab ? "var(--aminy-teal-600)" : "transparent", filter: e === tab ? "none" : "grayscale(0.2)" }}>{e}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((r, i) => {
              const done = isDone(i);
              return (
                <div key={i} onClick={() => { const willDo = !done; if (window.aminyHaptic) willDo ? window.aminyHaptic.success() : window.aminyHaptic.light(); setChecks((c) => ({ ...c, [key(i)]: !done })); }}
                  style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 14, padding: "10px 12px", display: "grid", gridTemplateColumns: "32px 1fr auto 24px", gap: 10, alignItems: "center", cursor: "pointer", transition: "transform var(--dur-fast) var(--ease-calm), box-shadow var(--dur-base) var(--ease-calm)" }} onPointerDown={(e) => e.currentTarget.style.transform = "scale(0.985)"} onPointerUp={(e) => e.currentTarget.style.transform = "none"} onPointerLeave={(e) => e.currentTarget.style.transform = "none"}>
                  <div style={{ fontSize: 18, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--aminy-mist)", borderRadius: 8 }}>{r.em}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-strong)", lineHeight: 1.2 }}>{r.t}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{r.d}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600 }}>{r.time}</div>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${done ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`, background: done ? "var(--aminy-teal-600)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {done && <AIcon name="check" size={13} stroke={3} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
})();
