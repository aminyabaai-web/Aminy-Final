/* "Why Aminy" — animated intro/explainer that plays before onboarding.
   Motion does the teaching: each value reveals in sequence, building the story of
   what Aminy is and why a parent needs it. window.WhyAminy({ onStart }) */
(function () {
  const { AIcon } = window;
  const R = React;
  const reduce = window.AminyMotion && window.AminyMotion.reduce;

  // The story beats — each is a "scene" that animates in.
  const SCENES = [
    {
      key: "alone",
      glyph: "🌙",
      head: "Raising a child with autism\ncan feel lonely at 2am.",
      sub: "The questions don't keep office hours. Neither do the hard moments.",
      bg: "linear-gradient(180deg,#0C2230,#16323f)", fg: "#E2EFF3", accent: "#8EC0CE",
    },
    {
      key: "coach",
      glyph: "compass",
      head: "Aminy is a calm coach\nin your pocket.",
      sub: "Ask anything, any hour. Real guidance — never judgment, never a score.",
      bg: "linear-gradient(180deg,#F6FBFB,#E2EFF3)", fg: "#0C2230", accent: "#2A7D99",
    },
    {
      key: "knows",
      glyph: "✦",
      head: "It learns your child,\nand gets wiser every day.",
      sub: "Aminy reads your IEPs, remembers what works, and adapts the plan to them.",
      bg: "linear-gradient(180deg,#F1F8FA,#FFFFFF)", fg: "#0C2230", accent: "#2A7D99",
    },
    {
      key: "team",
      glyph: "🤝",
      head: "And a real care team\nis one tap away.",
      sub: "Book TeleABA, message your BCBA, get answers a licensed clinician signs off on.",
      bg: "linear-gradient(180deg,#F1F6F8,#E2EDF1)", fg: "#0C2230", accent: "#2A7D99",
    },
    {
      key: "progress",
      glyph: "🌱",
      head: "So the hard days get\na little softer.",
      sub: "Gentle guidance. Meaningful progress. You don't have to hold it all alone.",
      bg: "linear-gradient(180deg,#FFFBEB,#F6FBFB)", fg: "#0C2230", accent: "#D97706",
    },
  ];

  function Glyph({ g, accent }) {
    if (g === "compass") return <img src="../../assets/aminy_compass.png" alt="" style={{ width: 88, height: 88, display: "block" }} />;
    if (g === "✦") return <AIcon name="sparkles" size={72} style={{ color: accent }} />;
    return <span style={{ fontSize: 76, lineHeight: 1 }}>{g}</span>;
  }

  window.WhyAminy = function WhyAminy({ onStart }) {
    const [i, setI] = R.useState(0);
    const [shown, setShown] = R.useState(reduce);
    const s = SCENES[i];
    const last = i === SCENES.length - 1;
    const timer = R.useRef(null);

    R.useEffect(() => {
      if (reduce) return;
      setShown(false);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(r);
    }, [i]);

    // Auto-advance scenes (paused on reduced motion — user taps through).
    R.useEffect(() => {
      if (reduce) return;
      if (last) return;
      timer.current = setTimeout(() => setI((v) => v + 1), 3800);
      return () => clearTimeout(timer.current);
    }, [i, last]);

    function next() {
      clearTimeout(timer.current);
      if (last) { onStart && onStart(); return; }
      setI((v) => v + 1);
    }
    function skip() { clearTimeout(timer.current); onStart && onStart(); }
    const enter = (delay) => reduce ? {} : { transform: shown ? "none" : "translateY(12px)", transition: `transform var(--dur-slow) var(--ease-lift) ${delay}ms` };

    return (
      <div onClick={next} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: s.bg, transition: "background var(--dur-slow) var(--ease-calm)", cursor: "pointer", position: "relative", overflow: "hidden" }}>
        {/* soft drifting aura */}
        <div style={{ position: "absolute", top: "18%", left: "50%", width: 320, height: 320, marginLeft: -160, borderRadius: "50%", background: s.accent, opacity: 0.12, filter: "blur(40px)", animation: reduce ? "none" : "aminy-breath 6s var(--ease-breath) infinite", pointerEvents: "none" }} />

        {/* skip */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 18px 0", position: "relative", zIndex: 2 }}>
          {!last && <button onClick={(e) => { e.stopPropagation(); skip(); }} style={{ border: 0, background: "none", cursor: "pointer", color: s.fg, opacity: 0.6, fontSize: 13, fontWeight: 600, fontFamily: "var(--font-ui)", padding: 6 }}>Skip</button>}
        </div>

        {/* scene */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 32px", gap: 22, position: "relative", zIndex: 2 }}>
          <div style={{ ...enter(0), transform: reduce ? "none" : (shown ? "scale(1)" : "scale(0.86)") }}><Glyph g={s.glyph} accent={s.accent} /></div>
          <h1 style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 26, lineHeight: 1.22, letterSpacing: "-0.025em", color: s.fg, margin: 0, whiteSpace: "pre-line", WebkitFontSmoothing: "antialiased", ...enter(110) }}>{s.head}</h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, lineHeight: 1.6, color: s.fg, opacity: 0.82, margin: 0, maxWidth: 300, transition: reduce ? "none" : `transform var(--dur-slow) var(--ease-lift) 230ms`, transform: shown || reduce ? "none" : "translateY(12px)" }}>{s.sub}</p>
        </div>

        {/* progress dots + CTA */}
        <div style={{ padding: "0 26px 28px", display: "flex", flexDirection: "column", gap: 18, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {SCENES.map((_, n) => (
              <div key={n} style={{ width: n === i ? 22 : 7, height: 7, borderRadius: 999, background: s.accent, opacity: n === i ? 1 : 0.3, transition: "all var(--dur-base) var(--ease-calm)" }} />
            ))}
          </div>
          {last ? (
            <button onClick={(e) => { e.stopPropagation(); skip(); }} style={{ width: "100%", height: 56, borderRadius: 18, border: 0, cursor: "pointer", background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", boxShadow: "var(--shadow-cta)", animation: reduce ? "none" : "aminy-rise 500ms var(--ease-lift) 360ms both" }}>Let's set up Aminy</button>
          ) : (
            <div style={{ fontSize: 12.5, color: s.fg, opacity: 0.5, fontWeight: 500 }}>Tap to continue</div>
          )}
        </div>
      </div>
    );
  };
})();
