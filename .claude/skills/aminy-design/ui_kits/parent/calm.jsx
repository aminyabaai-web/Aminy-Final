/* Exhale — a hub of grounding tools, not just breathing. window.CalmScreen
   Tools: Breathing · 5-4-3-2-1 grounding · Tactile bubbles (haptic) · Soundscapes.
   The one surface where gradients are welcome. Tactile bubbles call navigator.vibrate. */
(function () {
  const R = React;
  const TEAL = "var(--aminy-teal-600)";

  const G = {
    wind: <><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></>,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    hand: <><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13"/></>,
    music: <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    back: <path d="m15 18-6-6 6-6"/>,
    play: <path d="M6 4v16l14-8z" fill="currentColor" stroke="none"/>,
    pause: <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/></>,
    check: <path d="M20 6 9 17l-5-5"/>,
  };
  const Ico = ({ n, s = 22, w = 1.8, style }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={style}>{G[n]}</svg>;

  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  const TOOLS = [
    { id: "breathe", icon: "wind", title: "Breathe", note: "Box · 4-7-8 · long exhale", bg: "linear-gradient(135deg,#cffafe,#a5f3fc)", fg: "#0e7490" },
    { id: "ground", icon: "eye", title: "5-4-3-2-1", note: "Come back to the room", bg: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", fg: "#4338ca" },
    { id: "bubbles", icon: "hand", title: "Pop bubbles", note: "Something for your hands", bg: "linear-gradient(135deg,#fae8ff,#f5d0fe)", fg: "#a21caf" },
    { id: "sounds", icon: "music", title: "Soundscapes", note: "Rain · waves · hush", bg: "linear-gradient(135deg,#dcfce7,#bbf7d0)", fg: "#15803d" },
  ];

  function Hub({ onOpen }) {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 22px 22px", display: "flex", flexDirection: "column" }}>
        <div className="aminy-eyebrow" style={{ marginBottom: 4 }}>Exhale</div>
        <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 24, lineHeight: 1.15, color: "var(--color-text-strong)", margin: "0 0 6px", letterSpacing: "-0.01em", maxWidth: 300, textWrap: "balance" }}>
          A minute for you, whenever it gets loud.
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.55, margin: "0 0 18px", maxWidth: 300 }}>
          No counting, no scoring. Pick whatever helps right now.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => { buzz(8); onOpen(t.id); }} style={{
              textAlign: "left", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 22, padding: "16px 16px 18px",
              background: t.bg, cursor: "pointer", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 10, minHeight: 132,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center", color: t.fg }}><Ico n={t.icon} s={22} /></div>
              <div style={{ marginTop: "auto" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 17, color: "#0f172a", letterSpacing: "-0.01em" }}>{t.title}</div>
                <div style={{ fontSize: 11.5, color: "rgba(15,23,42,0.6)", marginTop: 2 }}>{t.note}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16, background: "rgba(255,255,255,0.7)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 22 }}>🌙</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-strong)" }}>Wind-down for two</div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 1 }}>A bedtime routine you and Kai can do together.</div>
          </div>
          <Ico n="play" s={16} style={{ color: TEAL }} />
        </div>
      </div>
    );
  }

  function Breathe() {
    const [mode, setMode] = R.useState("Box");
    const [phase, setPhase] = R.useState("Breathe in");
    R.useEffect(() => {
      const seq = ["Breathe in", "Hold", "Breathe out", "Hold"];
      let i = 0; const id = setInterval(() => { i = (i + 1) % seq.length; setPhase(seq[i]); buzz(6); }, 4000);
      return () => clearInterval(id);
    }, []);
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, padding: "0 24px 24px" }}>
        <div style={{ position: "relative", width: 230, height: 230 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid var(--aminy-teal-400)", animation: "br 4s var(--ease-breath) infinite" }} />
          <div style={{ position: "absolute", inset: 24, borderRadius: "50%", border: "2px solid var(--aminy-teal-300)", animation: "br 4s var(--ease-breath) infinite", animationDelay: "-1s" }} />
          <div style={{ position: "absolute", inset: 48, borderRadius: "50%", background: "linear-gradient(135deg,var(--aminy-teal-300),var(--aminy-teal-600))", boxShadow: "var(--shadow-glow-teal)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <small style={{ fontSize: 11, fontWeight: 500, opacity: 0.9, letterSpacing: ".14em", textTransform: "uppercase" }}>{phase}</small>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: ".06em", marginTop: 2 }}>4s</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Box", "4-7-8", "Long exhale"].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: "8px 14px", background: m === mode ? "var(--color-text-strong)" : "rgba(255,255,255,0.8)", color: m === mode ? "#fff" : "var(--color-text)", border: `1px solid ${m === mode ? "transparent" : "var(--color-border)"}`, borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-ui)", cursor: "pointer" }}>{m}</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", maxWidth: 250 }}>Follow the ring. The phone buzzes softly on each turn.</div>
      </div>
    );
  }

  const STEPS = [
    { n: 5, sense: "see", prompt: "Name 5 things you can see.", color: "#4338ca" },
    { n: 4, sense: "feel", prompt: "Notice 4 things you can feel.", color: "#0e7490" },
    { n: 3, sense: "hear", prompt: "Listen for 3 things you can hear.", color: "#15803d" },
    { n: 2, sense: "smell", prompt: "Find 2 things you can smell.", color: "#a16207" },
    { n: 1, sense: "breath", prompt: "Take 1 slow breath. You're here.", color: "#a21caf" },
  ];
  function Ground() {
    const [i, setI] = R.useState(0);
    const s = STEPS[i];
    const done = i >= STEPS.length - 1;
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: "0 30px 30px", textAlign: "center" }}>
        <div style={{ width: 120, height: 120, borderRadius: "50%", background: "#fff", border: `3px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-md)" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 56, color: s.color }}>{s.n}</span>
        </div>
        <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: s.color, fontWeight: 700 }}>{s.sense}</div>
        <h3 style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 22, lineHeight: 1.25, color: "var(--color-text-strong)", margin: 0, maxWidth: 280, letterSpacing: "-0.01em" }}>{s.prompt}</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {STEPS.map((_, k) => <div key={k} style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 999, background: k <= i ? s.color : "var(--aminy-navy-200)", transition: "all .3s" }} />)}
        </div>
        <button onClick={() => { buzz(8); setI(done ? 0 : i + 1); }} style={{ marginTop: 4, height: 50, padding: "0 28px", borderRadius: 14, border: 0, background: s.color, color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 16, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>{done ? "Start over" : "Next"}</button>
      </div>
    );
  }

  function Bubbles() {
    const [grid, setGrid] = R.useState(() => Array.from({ length: 24 }, () => true));
    const left = grid.filter(Boolean).length;
    function pop(idx) {
      if (!grid[idx]) return;
      buzz(12);
      setGrid((g) => g.map((v, k) => k === idx ? false : v));
    }
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "10px 26px 26px" }}>
        <p style={{ fontSize: 13.5, color: "var(--color-text-muted)", textAlign: "center", margin: "4px 0 0", maxWidth: 260 }}>Pop them all. Each one gives a tiny buzz. Reset and do it again — there's no finish line.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, width: "100%", maxWidth: 280 }}>
          {grid.map((up, idx) => (
            <button key={idx} onClick={() => pop(idx)} aria-label="bubble" style={{
              aspectRatio: "1", borderRadius: "50%", cursor: up ? "pointer" : "default", border: 0,
              background: up ? "radial-gradient(circle at 32% 28%, #fff, #f0abfc 55%, #c026d3)" : "rgba(192,38,211,0.12)",
              boxShadow: up ? "0 4px 10px rgba(192,38,211,0.3), inset 0 2px 6px rgba(255,255,255,0.6)" : "inset 0 2px 5px rgba(192,38,211,0.25)",
              transform: up ? "scale(1)" : "scale(0.86)", transition: "transform .12s var(--ease-calm), background .2s, box-shadow .2s",
            }} />
          ))}
        </div>
        <button onClick={() => { buzz(8); setGrid(Array.from({ length: 24 }, () => true)); }} disabled={left > 0} style={{ marginTop: "auto", height: 48, padding: "0 24px", borderRadius: 14, border: "1px solid var(--color-border)", background: left > 0 ? "rgba(255,255,255,0.5)" : "#fff", color: left > 0 ? "var(--color-text-subtle)" : "var(--aminy-teal-700)", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 15, cursor: left > 0 ? "default" : "pointer" }}>
          {left > 0 ? `${left} to go` : "Fill them up again"}
        </button>
      </div>
    );
  }

  const SOUNDS = [
    { id: "rain", label: "Soft rain", emoji: "🌧️", tint: "#dbeafe" },
    { id: "waves", label: "Ocean waves", emoji: "🌊", tint: "#cffafe" },
    { id: "hush", label: "White hush", emoji: "💨", tint: "#f1f5f9" },
    { id: "forest", label: "Forest morning", emoji: "🌲", tint: "#dcfce7" },
    { id: "night", label: "Quiet night", emoji: "🌙", tint: "#e0e7ff" },
  ];
  function Sounds() {
    const [playing, setPlaying] = R.useState(null);
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 22px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontSize: 13.5, color: "var(--color-text-muted)", margin: "2px 0 6px" }}>Tap one to play. Mix with breathing if you like.</p>
        {SOUNDS.map((s) => {
          const on = playing === s.id;
          return (
            <button key={s.id} onClick={() => { buzz(8); setPlaying(on ? null : s.id); }} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 16, cursor: "pointer",
              background: on ? s.tint : "rgba(255,255,255,0.8)", border: `1px solid ${on ? "transparent" : "var(--color-border)"}`, textAlign: "left",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{s.emoji}</div>
              <span style={{ flex: 1, fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14.5, color: "var(--color-text-strong)" }}>{s.label}</span>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: on ? "var(--aminy-teal-600)" : "#fff", border: on ? "0" : "1px solid var(--color-border)", color: on ? "#fff" : "var(--color-text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico n={on ? "pause" : "play"} s={15} />
              </div>
              {on && <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 18 }}>
                {[0, 1, 2].map((b) => <span key={b} style={{ width: 3, background: "var(--aminy-teal-600)", borderRadius: 2, height: 18, animation: `eq .8s ease-in-out ${b * 0.15}s infinite alternate` }} />)}
              </div>}
            </button>
          );
        })}
      </div>
    );
  }

  const VIEWS = { breathe: { c: Breathe, t: "Breathe" }, ground: { c: Ground, t: "5-4-3-2-1" }, bubbles: { c: Bubbles, t: "Pop bubbles" }, sounds: { c: Sounds, t: "Soundscapes" } };

  window.CalmScreen = function CalmScreen() {
    const [view, setView] = R.useState(null);
    const V = view && VIEWS[view];
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "radial-gradient(circle at 50% 18%, #e0f7fa 0%, var(--aminy-mist) 46%, var(--aminy-mist-deep) 100%)" }}>
        {V && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 18px 6px" }}>
            <button onClick={() => setView(null)} style={{ width: 34, height: 34, borderRadius: 11, background: "rgba(255,255,255,0.85)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)" }}><Ico n="back" s={17} /></button>
            <span style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 18, color: "var(--color-text-strong)" }}>{V.t}</span>
          </div>
        )}
        {V ? <V.c /> : <Hub onOpen={setView} />}
        <style>{`@keyframes br{0%,100%{transform:scale(.86);opacity:.45}50%{transform:scale(1.06);opacity:1}}@keyframes eq{from{height:5px}to{height:18px}}`}</style>
      </div>
    );
  };
})();
