/* Ask a BCBA — async question → instant AI draft → BCBA-reviewed & signed.
   Ported from the real AskABCBA.tsx flow (status: pending→ai_drafted→awaiting_bcba→completed).
   Rebuilt in the Aminy system (mist + teal). window.BcbaScreen */
(function () {
  const { AIcon } = window;
  const R = React;

  const CATEGORIES = [
    { id: "behavior", label: "Behavior", em: "🎯" }, { id: "sleep", label: "Sleep", em: "😴" },
    { id: "feeding", label: "Feeding", em: "🍴" }, { id: "transitions", label: "Transitions", em: "🔄" },
    { id: "sensory", label: "Sensory", em: "✨" }, { id: "communication", label: "Communication", em: "💬" },
    { id: "school", label: "School", em: "🏫" }, { id: "social", label: "Social", em: "👥" },
    { id: "self-care", label: "Self-care", em: "🧼" }, { id: "other", label: "Other", em: "💭" },
  ];

  const SEED = [{
    id: "t1", question: "Kai bolts from the dinner table after two bites every night. How do we build tolerance without making meals a battle?",
    category: "feeding", status: "completed", rating: 5,
    ai_draft: "This is really common, and the fact that he's coming to the table at all is a win. Start with \"first two bites, then a break\" — let him leave, then return. Keep portions tiny and predictable. Build sitting time by 30 seconds a week, not all at once.",
    bcba_response: "Great instinct to avoid the battle. I'd add: pair the table with something regulating — a weighted lap pad or a fidget he only gets at meals. Use a visual timer set low (2 min) and celebrate when it beeps, not when the plate's clean. We're shaping duration, not intake. Try it for a week and log how long he stays — we'll adjust at our next session.",
    bcba_name: "Dr. Ana Morales", bcba_credentials: "BCBA-D", created: "2d",
  }];

  function StatusPill({ status }) {
    const map = {
      pending: { bg: "var(--aminy-win-50)", fg: "var(--aminy-win-600)", label: "Drafting…", icon: "sparkles" },
      ai_drafted: { bg: "var(--aminy-teal-50)", fg: "var(--aminy-teal-700)", label: "AI ready", icon: "sparkles" },
      awaiting_bcba: { bg: "var(--aminy-win-50)", fg: "var(--aminy-win-600)", label: "BCBA queue", icon: "clock" },
      completed: { bg: "var(--aminy-grow-50)", fg: "var(--aminy-grow-600)", label: "Reviewed", icon: "check" },
    }[status] || {};
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: map.bg, color: map.fg, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
        <AIcon name={map.icon} size={11} /> {map.label}
      </span>
    );
  }

  function Detail({ thread, onBack }) {
    return (
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "6px 16px 12px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--color-border)" }}>
          <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 10, background: "#fff", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)" }}><AIcon name="back" size={16} /></button>
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 17, color: "var(--color-text-strong)" }}>Question detail</span>
        </div>
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 6 }}>Your question</div>
            <div style={{ fontSize: 14, color: "var(--color-text-strong)", lineHeight: 1.5 }}>{thread.question}</div>
          </div>
          {thread.ai_draft && (
            <div style={{ background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)", border: "1px solid var(--aminy-teal-100)", borderRadius: 16, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <AIcon name="sparkles" size={15} style={{ color: "var(--aminy-teal-700)" }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--aminy-teal-700)" }}>AI draft · instant</span>
              </div>
              <div style={{ fontSize: 14, color: "var(--color-text)", lineHeight: 1.55 }}>{thread.ai_draft}</div>
            </div>
          )}
          {thread.bcba_response ? (
            <div style={{ background: "#fff", border: "2px solid var(--aminy-teal-600)", borderRadius: 16, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <AIcon name="shield" size={15} style={{ color: "var(--aminy-teal-700)" }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--aminy-teal-700)" }}>BCBA reviewed &amp; signed</span>
              </div>
              <div style={{ fontSize: 14, color: "var(--color-text-strong)", lineHeight: 1.55, marginBottom: 10 }}>{thread.bcba_response}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>— {thread.bcba_name}, {thread.bcba_credentials}</div>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <AIcon name="clock" size={20} style={{ color: "var(--aminy-win-600)" }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>Awaiting BCBA review</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>A licensed BCBA edits &amp; signs — typically within 24 hours.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  window.BcbaScreen = function BcbaScreen({ onBack }) {
    const { Button } = window.AminyKit;
    const [threads, setThreads] = R.useState(SEED);
    const [composing, setComposing] = R.useState(false);
    const [q, setQ] = R.useState("");
    const [cat, setCat] = R.useState(null);
    const [active, setActive] = R.useState(null);
    const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

    function submit() {
      if (!q.trim()) return;
      buzz(10);
      const id = "t" + Date.now();
      const t = { id, question: q.trim(), category: cat, status: "pending", ai_draft: null, bcba_response: null, created: "just now" };
      setThreads((arr) => [t, ...arr]);
      setQ(""); setCat(null); setComposing(false);
      // Instant AI draft after a beat
      setTimeout(() => setThreads((arr) => arr.map((x) => x.id === id ? { ...x, status: "awaiting_bcba", ai_draft: "Here's an instant starting point while a BCBA reviews: name the pattern out loud, keep the demand small, and reinforce the moment it goes right — not the whole task. Full plan once your BCBA signs off." } : x)), 1400);
    }

    if (active) return <Detail thread={active} onBack={() => setActive(null)} />;

    return (
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "6px 16px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 10, background: "#fff", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)" }}><AIcon name="back" size={16} /></button>}
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 17, color: "var(--color-text-strong)" }}>Ask a BCBA</div>
            <div style={{ fontSize: 11, color: "var(--aminy-teal-700)", fontWeight: 500 }}>AI draft instantly · signed review within 24h</div>
          </div>
        </div>

        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {!composing && (
            <>
              <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,var(--aminy-teal-500),var(--aminy-teal-700))", display: "flex", alignItems: "center", justifyContent: "center" }}><AIcon name="shield" size={17} style={{ color: "#fff" }} /></div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-strong)" }}>BCBA expertise, on demand</div>
                    <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>Included with Pro+ Family</div>
                  </div>
                </div>
                {[["sparkles", "Instant AI draft", "informed by your family's context"], ["shield", "BCBA-reviewed", "a licensed BCBA edits & signs, within 24h"]].map(([ic, t, d], i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginTop: 7 }}>
                    <AIcon name={ic} size={15} style={{ color: "var(--aminy-teal-600)", marginTop: 1, flexShrink: 0 }} />
                    <div style={{ fontSize: 12.5, color: "var(--color-text)" }}><b>{t}</b> — {d}</div>
                  </div>
                ))}
              </div>
              <Button variant="primary" fullWidth icon={<AIcon name="plus" size={18} />} onClick={() => setComposing(true)}>Ask a question</Button>
            </>
          )}

          {composing && (
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={4} placeholder="What's happening with Kai? Be specific — when, where, what triggers it…"
                style={{ width: "100%", boxSizing: "border-box", fontSize: 14, fontFamily: "var(--font-ui)", color: "var(--color-text)", border: "1px solid var(--color-border-strong)", borderRadius: 12, padding: "10px 12px", resize: "none", outline: "none", lineHeight: 1.5 }} />
              <div>
                <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginBottom: 7 }}>Category — helps route to the right BCBA</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {CATEGORIES.map((c) => {
                    const on = cat === c.id;
                    return <button key={c.id} onClick={() => setCat(on ? null : c.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, padding: "6px 10px", borderRadius: 999, cursor: "pointer", border: `1px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`, background: on ? "var(--aminy-teal-50)" : "#fff", color: on ? "var(--aminy-teal-700)" : "var(--color-text-muted)", fontWeight: on ? 600 : 500 }}><span>{c.em}</span>{c.label}</button>;
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="ghost" onClick={() => { setComposing(false); setQ(""); }}>Cancel</Button>
                <Button variant="primary" fullWidth disabled={!q.trim()} icon={<AIcon name="sparkles" size={16} />} onClick={submit}>Send to BCBA</Button>
              </div>
            </div>
          )}

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: 4 }}>Your questions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {threads.map((t) => (
              <button key={t.id} onClick={() => setActive(t)} style={{ textAlign: "left", background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 12, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 13.5, color: "var(--color-text-strong)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.question}</div>
                  <StatusPill status={t.status} />
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--color-text-subtle)", alignItems: "center" }}>
                  <span>{t.created}</span>
                  {t.category && <span style={{ textTransform: "capitalize" }}>· {t.category}</span>}
                  {t.rating && <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>· <AIcon name="award" size={11} style={{ color: "var(--aminy-win-500)" }} />{t.rating}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };
})();
