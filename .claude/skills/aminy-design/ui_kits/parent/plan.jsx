/* My Plan — care plan goals, a win, AI 2-week home practice plan, provider review.
   Practice plan ported from AIHomePracticePlan.tsx. window.PlanScreen */
(function () {
  const { AIcon } = window;
  const GOALS = [
    { title: "Smoother morning transitions", tone: "teal", pct: 70, note: "5 of 7 mornings calm this week", icon: "sun" },
    { title: "Independent tooth-brushing", tone: "grow", pct: 100, note: "Met — Kai's leading it himself", icon: "check", met: true },
    { title: "Name big feelings out loud", tone: "teal", pct: 40, note: "Started naming \"frustrated\" this week", icon: "heart" },
  ];

  // 2-week home practice plan (shape ported from AIHomePracticePlan.tsx)
  const PRACTICE = {
    target: "Smoother morning transitions",
    goal: "Kai moves through the morning routine with one calm prompt instead of five.",
    schedule: [
      { label: "Days 1–2", activities: [{ time: "Morning", title: "First-then board", mins: 10, steps: ["Show two pictures: teeth, then breakfast.", "Say \"First teeth, then breakfast.\"", "Give a 5- and 1-minute warning."], reinforce: "\"You moved on the first ask — that's huge.\"" }] },
      { label: "Days 3–5", activities: [{ time: "Morning", title: "Visual timer", mins: 8, steps: ["Set a 2-minute timer for teeth.", "Let Kai start it himself.", "Celebrate when it beeps, not when he's done."], reinforce: "High-five + \"You beat the timer.\"" }] },
      { label: "Days 6–7", activities: [{ time: "Morning", title: "Fade the prompt", mins: 6, steps: ["Show the board, but stay quiet.", "Wait 10 seconds before any prompt.", "Only step in if he's stuck."], reinforce: "\"You remembered all by yourself.\"" }] },
    ],
    tips: ["Same order, every day — predictability is the whole point.", "Warmth over speed. A calm 10 minutes beats a rushed 4.", "If a morning falls apart, just reset tomorrow. No streak to break."],
    fading: "Across two weeks, move from full picture + verbal prompts to just the board, then to Kai leading it himself.",
  };

  function PracticePlan() {
    const { Button } = window.DesignSystem_39fb2b;
    const [gen, setGen] = React.useState(false);
    const [open, setOpen] = React.useState(0);
    const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
    if (!gen) {
      return (
        <div style={{ background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)", border: "1px solid var(--aminy-teal-100)", borderRadius: "var(--radius-xl)", padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <AIcon name="sparkles" size={16} style={{ color: "var(--aminy-teal-700)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--aminy-teal-700)" }}>From your care plan</span>
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 16, color: "var(--color-text-strong)", letterSpacing: "-0.01em", marginBottom: 4, WebkitFontSmoothing: "antialiased" }}>A 2-week practice plan, built for Kai</div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5, marginBottom: 12 }}>Aminy turns his treatment targets into small, daily steps you can actually do at home.</div>
          <Button variant="primary" fullWidth icon={<AIcon name="sparkles" size={16} />} onClick={() => { buzz(10); setGen(true); }}>Generate home practice plan</Button>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)", border: "1px solid var(--aminy-teal-100)", borderRadius: "var(--radius-lg)", padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-strong)" }}>✦ 2-week practice plan</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>Target: {PRACTICE.target}</div>
            </div>
            <button onClick={() => setGen(false)} style={{ fontSize: 12, color: "var(--aminy-teal-700)", fontWeight: 600, background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)" }}>Redo</button>
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14, color: "var(--aminy-teal-800)", marginTop: 8, lineHeight: 1.45 }}>{PRACTICE.goal}</div>
        </div>
        {PRACTICE.schedule.map((day, di) => {
          const isOpen = open === di;
          return (
            <div key={di} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "#fff" }}>
              <button onClick={() => setOpen(isOpen ? -1 : di)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "none", border: 0, cursor: "pointer", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--aminy-teal-700)", background: "var(--aminy-teal-50)", padding: "3px 9px", borderRadius: 999 }}>{day.label}</span>
                  <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>{day.activities.map((a) => a.title).join(" · ")}</span>
                </div>
                <AIcon name="chevron" size={16} style={{ color: "var(--color-text-subtle)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
              </button>
              {isOpen && (
                <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {day.activities.map((a, ai) => (
                    <div key={ai} style={{ background: "var(--aminy-mist)", borderRadius: 12, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)" }}>{a.title}</span>
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{a.time} · {a.mins}m</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {a.steps.map((s, si) => (
                          <div key={si} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--color-text)", lineHeight: 1.4 }}>
                            <span style={{ width: 17, height: 17, borderRadius: 999, background: "var(--aminy-teal-100)", color: "var(--aminy-teal-800)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{si + 1}</span>
                            {s}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--aminy-teal-800)", background: "var(--aminy-teal-50)", borderRadius: 9, padding: "7px 10px", marginTop: 9 }}>✦ Reinforce: {a.reinforce}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ background: "var(--aminy-win-50)", border: "1px solid var(--aminy-win-100)", borderRadius: "var(--radius-lg)", padding: "12px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--aminy-win-600)", marginBottom: 5 }}>Parent tips</div>
          {PRACTICE.tips.map((t, i) => <div key={i} style={{ fontSize: 12.5, color: "var(--aminy-win-600)", lineHeight: 1.5, marginTop: 2 }}>• {t}</div>)}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.5, padding: "0 10px" }}>{PRACTICE.fading}</div>
      </div>
    );
  }

  window.PlanScreen = function PlanScreen() {
    const DS = window.DesignSystem_39fb2b;
    const { Card, Badge, Button } = DS;
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: "2px 2px 0" }}>
          <div className="aminy-eyebrow">Kai's plan</div>
          <div className="aminy-h2" style={{ fontSize: 22, marginTop: 2 }}>This season's goals</div>
        </div>

        {/* Win */}
        <div className={(window.AminyMotion && !window.AminyMotion.reduce) ? "aminy-pop" : ""} style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg,var(--aminy-win-50),#fff)", border: "1px solid var(--aminy-win-100)", borderRadius: "var(--radius-xl)", padding: "18px 20px" }}>
          <span className={(window.AminyMotion && !window.AminyMotion.reduce) ? "aminy-shimmer" : ""} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
          <div style={{ fontSize: 24 }}>⭐</div>
          <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--aminy-win-600)", fontWeight: 700, margin: "8px 0 4px" }}>This week's win</div>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 20, color: "var(--color-text-strong)", lineHeight: 1.2, letterSpacing: "-0.025em", textWrap: "pretty", marginBottom: 14, WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}>
            Three evenings, three calm bedtimes. That's a lot.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="secondary" onClick={() => window.aminyToast("Shared with Alex ✨")}>Share with Alex</Button>
            <Button size="sm" variant="ghost" onClick={() => window.aminyToast("Saved to this week's report")}>Save to report</Button>
          </div>
        </div>

        {/* Goals */}
        {GOALS.map((g, i) => (
          <Card key={i} padding={16}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: g.met ? "var(--aminy-grow-50)" : "var(--aminy-teal-50)", color: g.met ? "var(--aminy-grow-600)" : "var(--aminy-teal-700)" }}>
                <AIcon name={g.icon} size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)", lineHeight: 1.25 }}>{g.title}</div>
                  {g.met && <Badge tone="grow">Met</Badge>}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>{g.note}</div>
                <div style={{ height: 6, background: "var(--aminy-navy-50)", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
                  <div style={{ width: `${g.pct}%`, height: "100%", borderRadius: 3, background: g.met ? "var(--aminy-grow-500)" : "var(--aminy-teal-500)", animation: (window.AminyMotion && !window.AminyMotion.reduce) ? `aminy-fill-${i} 1s var(--ease-lift) both` : "none" }} />
                </div>
                <style>{`@keyframes aminy-fill-${i}{from{width:0}to{width:${g.pct}%}}`}</style>
              </div>
            </div>
          </Card>
        ))}

        {/* AI home practice plan */}
        <PracticePlan />

        {/* Provider review */}
        <div style={{ background: "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-100)", borderRadius: "var(--radius-xl)", padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", color: "var(--aminy-teal-700)" }}><AIcon name="shield" size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--aminy-teal-700)", fontWeight: 700 }}>Pending review</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)", margin: "3px 0 10px", lineHeight: 1.35 }}>Dr. Morales added two notes to Kai's plan. Read when you have a minute — no rush.</div>
            <Button size="sm" variant="primary" onClick={() => window.aminyToast("Opening Dr. Morales's notes…")}>Open review</Button>
          </div>
        </div>
      </div>
    );
  };
})();
