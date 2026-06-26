/* Ease — kid-facing kit. Soft, rounded, big emoji. Single-purpose screens.
   Play tab = 6 equal activities, each a real interactive mini-game. */
(function () {
  const R = React;
  const INK = "#312e81", PRI = "#7c3aed", SUB = "#6366f1";
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  function Status() {
    return (
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 26px 0", fontSize: 13, fontWeight: 700, color: INK, flexShrink: 0, fontFamily: "var(--font-jr)" }}>
        <span>9:41</span>
        <svg width="22" height="12" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1"><rect x="1" y="1" width="20" height="10" rx="2.5"/><rect x="3" y="3" width="15" height="6" rx="1" fill="currentColor"/></svg>
      </div>
    );
  }

  const StarToken = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="url(#jrStar)" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round">
      <defs><linearGradient id="jrStar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde68a"/><stop offset="1" stopColor="#fbbf24"/></linearGradient></defs>
      <path d="M12 2.6l2.6 5.7 6.2.7-4.6 4.2 1.2 6.1L12 20l-5.6 3 1.2-6.1L3 12.7l6.2-.7z"/>
    </svg>
  );

  function TopBar({ stars = 12 }) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 22px 10px" }}>
        <div style={{ background: "#fff", borderRadius: 999, padding: "6px 14px 6px 6px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 8px rgba(76,29,149,0.1)" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#fbcfe8,#f472b6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🦊</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: INK, fontFamily: "var(--font-jr)" }}>Kai</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", borderRadius: 999, padding: "6px 13px", boxShadow: "0 2px 8px rgba(76,29,149,0.1)" }}>
          <StarToken size={17} /><span style={{ fontSize: 14, fontWeight: 700, color: PRI, fontFamily: "var(--font-jr)" }}>{stars}</span>
        </div>
      </div>
    );
  }

  const FEELINGS = [
    { em: "😊", lb: "Happy", bg: "#fef3c7" }, { em: "😌", lb: "Calm", bg: "#dbeafe" },
    { em: "😢", lb: "Sad", bg: "#fce7f3" }, { em: "🤩", lb: "Excited", bg: "#dcfce7" },
    { em: "😠", lb: "Mad", bg: "#e0e7ff" }, { em: "😴", lb: "Tired", bg: "#fed7aa" },
  ];

  function Checkin({ onNext }) {
    const [sel, setSel] = R.useState(1);
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "4px 22px 0", minHeight: 0 }}>
        <h2 style={{ fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 26, lineHeight: 1.1, color: INK, textAlign: "center", margin: "0 0 6px", letterSpacing: "-0.02em" }}>How's your body<br/>right <span style={{ color: PRI }}>now?</span></h2>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, textAlign: "center", color: SUB, margin: 0, fontWeight: 600 }}>Pick any one. There's no wrong answer.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 16 }}>
          {FEELINGS.map((f, i) => (
            <button key={i} onClick={() => { buzz(6); setSel(i); }} style={{ aspectRatio: "1/1.05", borderRadius: 28, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, border: 0, cursor: "pointer", background: f.bg, outline: sel === i ? `4px solid ${PRI}` : "none", outlineOffset: 3, transform: sel === i ? "scale(1.04)" : "scale(1)", transition: "transform .2s var(--ease-calm)" }}>
              <span style={{ fontSize: 42, lineHeight: 1 }}>{f.em}</span>
              <span style={{ fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 13, color: INK }}>{f.lb}</span>
            </button>
          ))}
        </div>
        <button onClick={onNext} style={{ marginTop: 28, marginBottom: 24, height: 58, borderRadius: 22, background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#fff", fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 17, border: 0, boxShadow: "0 8px 20px rgba(124,58,237,0.35)", cursor: "pointer" }}>That's me right now →</button>
      </div>
    );
  }

  // ---- 6 equal activities ----
  const ACTS = [
    { id: "pop", em: "🫧", lb: "Bubble pop", tag: "Pop them all", bg: "linear-gradient(135deg,#dbeafe,#bfdbfe)" },
    { id: "story", em: "🦄", lb: "Silly story", tag: "You choose!", star: true, bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)" },
    { id: "stretch", em: "🌱", lb: "Stretch & grow", tag: "4 poses", bg: "linear-gradient(135deg,#dcfce7,#bbf7d0)" },
    { id: "doodle", em: "🎨", lb: "Doodle time", tag: "Draw + stickers", star: true, bg: "linear-gradient(135deg,#fef3c7,#fde68a)" },
    { id: "sound", em: "🎧", lb: "Sound bath", tag: "Listen", bg: "linear-gradient(135deg,#cffafe,#a5f3fc)" },
    { id: "glitter", em: "✨", lb: "Glitter jar", tag: "Shake & settle", bg: "linear-gradient(135deg,#ede9fe,#ddd6fe)" },
  ];

  function Activities({ onPick }) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "10px 22px 0" }}>
          <div style={{ fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 26, color: INK, lineHeight: 1.1, letterSpacing: "-0.02em" }}>Pick one <span style={{ color: PRI }}>thing</span> 💛</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: SUB, marginTop: 4, fontWeight: 600 }}>Whatever feels good. Tiny is great.</div>
        </div>
        <div style={{ padding: "16px 22px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13, flex: 1, alignContent: "start", overflowY: "auto" }}>
          {ACTS.map((a) => (
            <button key={a.id} onClick={() => { buzz(8); onPick(a.id); }} style={{ aspectRatio: "1/1.08", borderRadius: 26, padding: "14px 14px 13px", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start", boxShadow: "0 6px 14px rgba(76,29,149,0.1)", position: "relative", overflow: "hidden", background: a.bg, border: 0, cursor: "pointer", textAlign: "left" }}>
              {a.star && <span style={{ position: "absolute", top: 11, right: 13, fontSize: 15, opacity: 0.85 }}>⭐</span>}
              <span style={{ fontSize: 40, lineHeight: 1 }}>{a.em}</span>
              <div style={{ width: "100%" }}>
                <div style={{ fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 16, color: INK, lineHeight: 1.05, whiteSpace: "nowrap" }}>{a.lb}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "rgba(49,46,129,0.55)", marginTop: 4 }}>{a.tag}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function PlayFrame({ title, onBack, children }) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 18px 8px" }}>
          <button onClick={onBack} aria-label="Back" style={{ width: 40, height: 40, borderRadius: 999, background: "#fff", border: "1px solid #e9d5ff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: INK, boxShadow: "0 2px 8px rgba(76,29,149,0.08)" }}>←</button>
          <span style={{ fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 19, color: INK, letterSpacing: "-0.01em" }}>{title}</span>
        </div>
        {children}
      </div>
    );
  }

  const FinishBtn = ({ onClick, children }) => (
    <button onClick={onClick} style={{ height: 58, borderRadius: 22, background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#fff", fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 16, border: 0, cursor: "pointer", boxShadow: "0 8px 20px rgba(124,58,237,0.35)", width: "100%" }}>{children}</button>
  );

  // 1) Bubble POP — tap every bubble; each pops with a buzz
  function BubblePop({ onBack, onDone }) {
    const [grid, setGrid] = R.useState(() => Array.from({ length: 12 }, () => true));
    const left = grid.filter(Boolean).length;
    return (
      <PlayFrame title="Bubble pop" onBack={onBack}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 22px 20px", minHeight: 0 }}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: SUB, fontWeight: 600, textAlign: "center", margin: "2px 0 14px" }}>{left > 0 ? `Pop them all! ${left} left 🫧` : "POP POP POP! You got them all! 🎉"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, width: "100%", flex: 1, alignContent: "center" }}>
            {grid.map((up, i) => (
              <button key={i} onClick={() => { if (!up) return; buzz(14); setGrid((g) => g.map((v, k) => k === i ? false : v)); }} aria-label="bubble"
                style={{ aspectRatio: "1", borderRadius: "50%", border: 0, cursor: up ? "pointer" : "default",
                  background: up ? "radial-gradient(circle at 32% 28%, #fff, #bae6fd 55%, #38bdf8)" : "rgba(56,189,248,0.1)",
                  boxShadow: up ? "0 5px 12px rgba(56,189,248,0.35), inset 0 2px 8px rgba(255,255,255,0.7)" : "inset 0 2px 6px rgba(56,189,248,0.2)",
                  transform: up ? "scale(1)" : "scale(0.7)", transition: "transform .14s var(--ease-calm), background .2s, box-shadow .2s" }} />
            ))}
          </div>
          <div style={{ width: "100%", marginTop: 16 }}>
            {left === 0
              ? <FinishBtn onClick={onDone}>Yay, all done! ✨</FinishBtn>
              : <button onClick={() => setGrid(Array.from({ length: 12 }, () => true))} style={{ width: "100%", height: 52, borderRadius: 20, border: "2px solid #e9d5ff", background: "#fff", color: PRI, fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Fill them up again</button>}
          </div>
        </div>
      </PlayFrame>
    );
  }

  // 2) Silly story — branching, kid picks the path
  const STORY = {
    start: { text: "A sleepy fox named Pip wakes up and finds a door that wasn't there yesterday! 🚪", choices: [["Open it!", "moon"], ["Knock first", "knock"]] },
    knock: { text: "Knock knock! A tiny voice giggles, \"Come iiin!\" Pip opens the door and…", choices: [["Step through", "moon"], ["Peek inside", "moon"]] },
    moon: { text: "WHOOSH! Pip floats up to the MOON, made entirely of… 🤔", choices: [["Purple pancakes 🥞", "pancake"], ["Bouncy jelly 🟣", "jelly"]] },
    pancake: { text: "Pip takes a giant bite. It tastes like bubblegum clouds! A moon-bunny asks Pip to dance. 🐰", choices: [["Dance!", "end"], ["Take a nap", "end"]] },
    jelly: { text: "BOING! Pip bounces so high they touch a star. The star winks and grants one silly wish. ⭐", choices: [["Wish for wings", "end"], ["Wish for snacks", "end"]] },
    end: { text: "Full, happy, and a little bit magic, Pip floats home and snuggles in. The end. 💛", choices: null },
  };
  function SillyStory({ onBack, onDone }) {
    const [node, setNode] = R.useState("start");
    const [path, setPath] = R.useState(["start"]);
    const cur = STORY[node];
    return (
      <PlayFrame title="Silly story" onBack={onBack}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "6px 24px 22px", minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 26, padding: "22px 22px", boxShadow: "0 6px 16px rgba(76,29,149,0.12)", fontFamily: "var(--font-jr)", fontWeight: 600, fontSize: 20, color: INK, lineHeight: 1.35, textWrap: "pretty" }}>{cur.text}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 5 }}>{path.map((_, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: 999, background: "#c4b5fd" }} />)}</div>
          </div>
          {cur.choices ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {cur.choices.map(([label, next], i) => (
                <button key={i} onClick={() => { buzz(8); setNode(next); setPath((p) => [...p, next]); }} style={{ height: 56, borderRadius: 20, background: i % 2 ? "linear-gradient(135deg,#fbcfe8,#f9a8d4)" : "linear-gradient(135deg,#ddd6fe,#c4b5fd)", color: INK, fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 16, border: 0, cursor: "pointer", boxShadow: "0 5px 12px rgba(76,29,149,0.14)" }}>{label}</button>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 14 }}><FinishBtn onClick={onDone}>What a story! ✨</FinishBtn></div>
          )}
        </div>
      </PlayFrame>
    );
  }

  // 3) Stretch & grow — timed poses with a countdown ring
  const POSES = [
    { em: "🙌", t: "Reach for the sky!", d: "Stretch both arms up high.", secs: 12 },
    { em: "🌳", t: "Be a tall tree", d: "Stand still, sway gently.", secs: 15 },
    { em: "🦅", t: "Flap like a bird", d: "Big slow wing flaps.", secs: 12 },
    { em: "🐢", t: "Tiny turtle", d: "Curl up small and cozy.", secs: 18 },
  ];
  function Stretch({ onBack, onDone }) {
    const [i, setI] = R.useState(0);
    const [left, setLeft] = R.useState(POSES[0].secs);
    const [running, setRunning] = R.useState(true);
    const p = POSES[i]; const last = i >= POSES.length - 1;
    R.useEffect(() => {
      if (!running) return;
      if (left <= 0) { buzz(12); return; }
      const id = setTimeout(() => setLeft((l) => l - 1), 1000);
      return () => clearTimeout(id);
    }, [left, running]);
    const pct = 1 - left / p.secs;
    const C = 2 * Math.PI * 52;
    function next() { if (last) { onDone(); return; } const ni = i + 1; setI(ni); setLeft(POSES[ni].secs); setRunning(true); }
    return (
      <PlayFrame title="Stretch & grow" onBack={onBack}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "0 24px 22px", textAlign: "center" }}>
          <div style={{ position: "relative", width: 150, height: 150 }}>
            <svg width="150" height="150" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="75" cy="75" r="52" fill="none" stroke="#dcfce7" strokeWidth="10" />
              <circle cx="75" cy="75" r="52" fill="none" stroke="#22c55e" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 62 }}>{p.em}</div>
          </div>
          <div><div style={{ fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 25, color: INK, letterSpacing: "-0.01em" }}>{p.t}</div><div style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: SUB, fontWeight: 600, marginTop: 4 }}>{p.d}</div></div>
          <div style={{ fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 17, color: left > 0 ? PRI : "#22c55e" }}>{left > 0 ? `Hold for ${left}…` : "Great job! 🎉"}</div>
          <div style={{ display: "flex", gap: 6 }}>{POSES.map((_, k) => <div key={k} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 999, background: k <= i ? PRI : "#ddd6fe", transition: "all .3s" }} />)}</div>
          <div style={{ width: "100%" }}>
            {left > 0
              ? <button onClick={() => setRunning((r) => !r)} style={{ width: "100%", height: 52, borderRadius: 20, border: "2px solid #e9d5ff", background: "#fff", color: PRI, fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>{running ? "Pause" : "Keep going"}</button>
              : <FinishBtn onClick={next}>{last ? "All stretched! ✨" : "Next pose →"}</FinishBtn>}
          </div>
        </div>
      </PlayFrame>
    );
  }

  // 4) Doodle — real drawing (drag) + sticker mode + colors + save/send
  const COLORS = ["#f472b6", "#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#1f2937"];
  const STICKERS = ["⭐", "💛", "🌈", "✨", "🌸", "🦄", "🐱", "🚀"];
  function Doodle({ onBack, onDone }) {
    const [mode, setMode] = R.useState("draw"); // draw | sticker
    const [color, setColor] = R.useState(COLORS[1]);
    const [sticker, setSticker] = R.useState(STICKERS[0]);
    const [strokes, setStrokes] = R.useState([]); // {color, pts:[[x,y]]}
    const [stamps, setStamps] = R.useState([]); // {x,y,s}
    const [sent, setSent] = R.useState(false);
    const drawing = R.useRef(false);
    const areaRef = R.useRef(null);
    function pos(e) { const r = areaRef.current.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [((t.clientX - r.left) / r.width) * 100, ((t.clientY - r.top) / r.height) * 100]; }
    function down(e) { if (mode === "sticker") { const [x, y] = pos(e); buzz(6); setStamps((s) => [...s, { x, y, s: sticker }]); return; } drawing.current = true; setStrokes((s) => [...s, { color, pts: [pos(e)] }]); }
    function move(e) { if (mode !== "draw" || !drawing.current) return; e.preventDefault(); setStrokes((s) => { const c = s.slice(); c[c.length - 1] = { ...c[c.length - 1], pts: [...c[c.length - 1].pts, pos(e)] }; return c; }); }
    function up() { drawing.current = false; }
    function clear() { setStrokes([]); setStamps([]); }
    return (
      <PlayFrame title="Doodle time" onBack={onBack}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2px 16px 16px", minHeight: 0 }}>
          {/* mode toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {[["draw", "✏️ Draw"], ["sticker", "⭐ Stickers"]].map(([m, lb]) => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, height: 40, borderRadius: 14, border: 0, cursor: "pointer", fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 14, background: mode === m ? PRI : "#fff", color: mode === m ? "#fff" : INK, boxShadow: mode === m ? "none" : "inset 0 0 0 2px #e9d5ff" }}>{lb}</button>
            ))}
          </div>
          {/* canvas */}
          <div ref={areaRef} onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} onTouchStart={down} onTouchMove={move} onTouchEnd={up}
            style={{ flex: 1, borderRadius: 24, background: "#fff", border: "3px dashed #e9d5ff", position: "relative", overflow: "hidden", cursor: "crosshair", touchAction: "none", marginBottom: 10 }}>
            {strokes.length === 0 && stamps.length === 0 && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ui)", fontSize: 14, color: "#c4b5fd", fontWeight: 600, pointerEvents: "none" }}>{mode === "draw" ? "Drag to draw ✏️" : "Tap to place stickers ⭐"}</div>}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {strokes.map((st, i) => <polyline key={i} points={st.pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={st.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 5 }} />)}
            </svg>
            {stamps.map((m, i) => <span key={i} style={{ position: "absolute", left: m.x + "%", top: m.y + "%", transform: "translate(-50%,-50%)", fontSize: 30, pointerEvents: "none" }}>{m.s}</span>)}
          </div>
          {/* palette / stickers */}
          {mode === "draw" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} aria-label="color" style={{ width: 34, height: 34, borderRadius: "50%", background: c, border: color === c ? "3px solid #312e81" : "3px solid #fff", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }} />)}
              <button onClick={clear} style={{ marginLeft: "auto", height: 34, padding: "0 12px", borderRadius: 12, border: "2px solid #e9d5ff", background: "#fff", color: SUB, fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Clear</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {STICKERS.map((s) => <button key={s} onClick={() => setSticker(s)} style={{ width: 38, height: 38, borderRadius: 12, fontSize: 20, cursor: "pointer", background: sticker === s ? "#ede9fe" : "#fff", border: sticker === s ? "2px solid #7c3aed" : "2px solid #f1f5f9" }}>{s}</button>)}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { buzz(10); setSent(true); window.aminyToast && window.aminyToast("Sent to your grown-ups! 💛"); }} style={{ flex: 1, height: 52, borderRadius: 20, border: "2px solid #e9d5ff", background: "#fff", color: PRI, fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{sent ? "Sent! 💛" : "Send to mom & dad"}</button>
            <button onClick={onDone} style={{ flex: 1, height: 52, borderRadius: 20, background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#fff", fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 14, border: 0, cursor: "pointer", boxShadow: "0 6px 16px rgba(124,58,237,0.3)" }}>I'm done ✨</button>
          </div>
        </div>
      </PlayFrame>
    );
  }

  // 5) Sound bath
  const SCAPES = [{ em: "🌧️", lb: "Rain", c: "#bfdbfe" }, { em: "🌊", lb: "Waves", c: "#a5f3fc" }, { em: "🌲", lb: "Forest", c: "#bbf7d0" }, { em: "🌙", lb: "Night", c: "#ddd6fe" }];
  function SoundBath({ onBack, onDone }) {
    const [play, setPlay] = R.useState(null);
    return (
      <PlayFrame title="Sound bath" onBack={onBack}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "6px 22px 20px", minHeight: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            {SCAPES.map((s) => { const on = play === s.lb; return (
              <button key={s.lb} onClick={() => { buzz(8); setPlay(on ? null : s.lb); }} style={{ aspectRatio: "1/0.92", borderRadius: 26, border: on ? "3px solid #7c3aed" : "3px solid transparent", background: s.c, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", boxShadow: "0 6px 14px rgba(76,29,149,0.12)" }}>
                <span style={{ fontSize: 44 }}>{s.em}</span>
                <span style={{ fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 15, color: INK }}>{s.lb}</span>
                {on && <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 16, marginTop: 2 }}>{[0,1,2,3].map((b) => <span key={b} style={{ width: 3, borderRadius: 2, background: PRI, height: 16, animation: `eqj .7s ease-in-out ${b*0.13}s infinite alternate` }} />)}</div>}
              </button>
            ); })}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: SUB, fontWeight: 600, textAlign: "center", marginBottom: "auto" }}>{play ? `Playing ${play}… close your eyes 💛` : "Tap a sound to begin"}</div>
          <FinishBtn onClick={onDone}>All calm now ✨</FinishBtn>
          <style>{`@keyframes eqj{from{height:4px}to{height:16px}}`}</style>
        </div>
      </PlayFrame>
    );
  }

  // 6) Glitter jar — shake to swirl, DRAG to tilt (glitter stays level like real water)
  function GlitterJar({ onBack, onDone }) {
    const [shakeKey, setShakeKey] = R.useState(0);
    const [settled, setSettled] = R.useState(true);
    const [rot, setRot] = R.useState(0);
    const [dragging, setDragging] = R.useState(false);
    const drag = R.useRef(null);
    const bits = R.useMemo(() => Array.from({ length: 36 }, (_, i) => ({ x: 12 + (i * 37) % 76, c: ["#f472b6", "#a78bfa", "#60a5fa", "#fbbf24", "#34d399"][i % 5], d: (i % 10) * 0.18, dur: 2.6 + (i % 6) * 0.4 })), []);
    function shake() { buzz(20); setSettled(false); setShakeKey((k) => k + 1); setTimeout(() => setSettled(true), 4200); }
    const cx = (e) => (e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0));
    function down(e) { setDragging(true); drag.current = { x: cx(e), r: rot }; }
    function move(e) {
      if (!dragging || !drag.current) return;
      const nr = Math.max(-55, Math.min(55, drag.current.r + (cx(e) - drag.current.x) / 2.2));
      if (Math.abs(nr - rot) > 7) buzz(4);
      setRot(nr);
    }
    function up() { if (!dragging) return; setDragging(false); drag.current = null; buzz(8); setRot(0); }
    return (
      <PlayFrame title="Glitter jar" onBack={onBack}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "0 24px 22px" }}>
          <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onTouchStart={down} onTouchMove={move} onTouchEnd={up}
            key={shakeKey}
            style={{ width: 170, height: 230, borderRadius: "40px 40px 30px 30px", background: "linear-gradient(180deg, rgba(196,181,253,0.25), rgba(167,139,250,0.4))", border: "4px solid #c4b5fd", position: "relative", overflow: "hidden", boxShadow: "inset 0 4px 16px rgba(255,255,255,0.5), 0 10px 30px rgba(124,58,237,0.2)", cursor: "grab", touchAction: "none", transform: `rotate(${rot}deg)`, transition: dragging ? "none" : "transform .8s var(--ease-breath)" }}>
            <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 70, height: 22, background: "#a78bfa", borderRadius: 8, zIndex: 2 }} />
            {/* world-gravity layer: counter-rotates so glitter + pile stay level */}
            <div style={{ position: "absolute", inset: "-35%", transform: `rotate(${-rot}deg)`, transition: dragging ? "none" : "transform .8s var(--ease-breath)" }}>
              {bits.map((b, i) => (
                <span key={i} style={{ position: "absolute", left: (28 + b.x * 0.44) + "%", top: "30%", width: 7, height: 7, borderRadius: "50%", background: b.c, boxShadow: `0 0 4px ${b.c}`, animation: settled ? "none" : `fall ${b.dur}s cubic-bezier(.3,0,.5,1) ${b.d}s forwards` }} />
              ))}
              <div style={{ position: "absolute", bottom: "22%", left: "18%", right: "18%", height: settled ? 26 : 5, background: "linear-gradient(180deg, rgba(167,139,250,0.45), rgba(124,58,237,0.55))", borderRadius: 6, transition: "height 1.2s ease 2.6s" }} />
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 19, color: INK, textAlign: "center", letterSpacing: "-0.01em" }}>
            {dragging ? "Tilt it sloooowly… 💧" : settled ? "Shake it — or grab & tilt the jar 💜" : "Breathe slooowly while it falls…"}
          </div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={shake} style={{ height: 56, borderRadius: 20, border: "2px solid #c4b5fd", background: "#fff", color: PRI, fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>✨ Shake the jar</button>
            <FinishBtn onClick={onDone}>I feel calmer ✨</FinishBtn>
          </div>
          <style>{`@keyframes fall{0%{transform:translateY(0)}100%{transform:translateY(190px)}}`}</style>
        </div>
      </PlayFrame>
    );
  }

  const PLAYERS = { pop: BubblePop, story: SillyStory, stretch: Stretch, doodle: Doodle, sound: SoundBath, glitter: GlitterJar };

  function Reward({ onAgain }) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 30px", textAlign: "center", gap: 18, position: "relative", overflow: "hidden", background: "radial-gradient(circle at 50% 30%,rgba(251,207,232,.6) 0%,transparent 60%),radial-gradient(circle at 80% 70%,rgba(167,139,250,.4) 0%,transparent 50%),linear-gradient(180deg,#eef2ff,#faf5ff 60%)" }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} style={{ position: "absolute", left: (8 + i * 9) + "%", top: "34%", fontSize: 13 + (i % 3) * 8, animation: `jburst 1.9s ease-out ${i * 0.16}s infinite`, opacity: 0, pointerEvents: "none" }}>{["✨", "⭐", "💛"][i % 3]}</span>
        ))}
        <div style={{ width: 170, height: 170, borderRadius: "42% 58% 54% 46% / 52% 44% 56% 48%", background: "radial-gradient(circle at 32% 26%,#ddd6fe,#a78bfa 60%,#7c3aed)", boxShadow: "0 16px 40px rgba(124,58,237,0.32),inset 0 4px 12px rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pop 2.6s var(--ease-breath) infinite" }}>
          <StarToken size={88} />
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: PRI, fontWeight: 700 }}>You earned a calm star</div>
        <h2 style={{ fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 32, lineHeight: 1.1, color: INK, letterSpacing: "-0.02em", margin: 0, textWrap: "balance" }}>You took a moment. That counts.</h2>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, lineHeight: 1.55, color: SUB, margin: 0, maxWidth: 260, fontWeight: 500 }}>That's 13 stars. Want to do one more, or rest? Both are good.</p>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          <button onClick={onAgain} style={{ height: 58, borderRadius: 22, fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 16, border: 0, background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#fff", boxShadow: "0 8px 20px rgba(124,58,237,0.35)", cursor: "pointer" }}>One more thing</button>
          <button onClick={onAgain} style={{ height: 58, borderRadius: 22, fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 16, border: "2px solid #e9d5ff", background: "#fff", color: PRI, cursor: "pointer" }}>I'm gonna rest 💤</button>
        </div>
        <style>{`@keyframes pop{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.05) rotate(2deg)}}@keyframes jburst{0%{transform:translateY(0) scale(.6);opacity:0}25%{opacity:1}100%{transform:translateY(-110px) scale(1.2);opacity:0}}`}</style>
      </div>
    );
  }

  const TABS = [{ id: "home", em: "🏡", lb: "Home" }, { id: "play", em: "🎮", lb: "Play" }, { id: "coins", em: "⭐", lb: "Stars" }];
  function JrNav({ active, onNav }) {
    return (
      <div style={{ background: "#fff", padding: "10px 8px 14px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", flexShrink: 0, borderTop: "1px solid #e9d5ff" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => onNav(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 8, background: "none", border: 0, cursor: "pointer", color: active === t.id ? PRI : "rgba(49,46,129,0.5)", fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 11 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{t.em}</span>{t.lb}
          </button>
        ))}
        <div style={{ gridColumn: "1 / -1", height: 5, width: 120, margin: "8px auto 0", background: "rgba(49,46,129,0.3)", borderRadius: 999 }} />
      </div>
    );
  }

  // ---- RESCUE MODE — the whole point of Ease. A dysregulated kid can't read
  // or choose, so the app opens ALREADY calming: breathing orb, slow phase text,
  // rhythmic haptics. Nothing to tap. A gentle exit appears after two cycles. ----
  function Rescue({ onDone }) {
    const [phase, setPhase] = R.useState(0);
    const [ready, setReady] = R.useState(false);
    R.useEffect(() => {
      buzz(14);
      const id = setInterval(() => { setPhase((p) => (p + 1) % 2); buzz(10); }, 4000);
      const t = setTimeout(() => setReady(true), 9000);
      return () => { clearInterval(id); clearTimeout(t); };
    }, []);
    return (
      <div onClick={() => ready && onDone()} style={{ position: "absolute", inset: 0, zIndex: 30, background: "linear-gradient(180deg,#c7d2fe,#bfdbfe 50%,#a5f3fc)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34, cursor: ready ? "pointer" : "default" }}>
        <div style={{ width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle at 34% 28%,#fff,#bae6fd 52%,#60a5fa)", boxShadow: "0 24px 60px rgba(59,130,246,0.35), inset 0 6px 20px rgba(255,255,255,0.75)", animation: "ebr 8s var(--ease-breath) infinite" }} />
        <div style={{ fontFamily: "var(--font-jr)", fontWeight: 700, fontSize: 26, color: "#1e3a8a", letterSpacing: "-0.01em", textAlign: "center" }}>{phase === 0 ? "Breathe in…" : "And let it gooo…"}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, color: "rgba(30,58,138,0.55)", opacity: ready ? 1 : 0, transition: "opacity .8s var(--ease-calm)", textAlign: "center" }}>Tap anywhere when you feel ready 💛</div>
        <style>{`@keyframes ebr{0%,100%{transform:scale(.7)}50%{transform:scale(1.05)}}`}</style>
      </div>
    );
  }

  function App() {
    const [tab, setTab] = R.useState("home");
    const [activity, setActivity] = R.useState(null);
    const [rescue, setRescue] = R.useState(true);
    let screen;
    if (tab === "home") screen = <Checkin onNext={() => setTab("play")} />;
    else if (tab === "play") {
      if (activity) {
        const Player = PLAYERS[activity];
        screen = <Player onBack={() => setActivity(null)} onDone={() => { setActivity(null); setTab("coins"); }} />;
      } else screen = <Activities onPick={(id) => setActivity(id)} />;
    } else screen = <Reward onAgain={() => { setActivity(null); setTab("play"); }} />;
    return (
      <div style={{ width: 390, flexShrink: 0, background: "#fff", borderRadius: 44, padding: 14, boxShadow: "0 24px 60px rgba(76,29,149,0.2), 0 4px 12px rgba(76,29,149,0.08)", border: "1px solid #e9d5ff", position: "relative" }}>
        <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", width: 110, height: 28, background: "#1e1b4b", borderRadius: 999, zIndex: 5 }} />
        <div style={{ width: "100%", height: 788, borderRadius: 32, overflow: "hidden", background: "linear-gradient(180deg,#eef2ff,#faf5ff 55%,#dbeafe)", position: "relative", display: "flex", flexDirection: "column", WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale", textRendering: "optimizeLegibility" }}>
          <Status />
          <TopBar />
          {screen}
          <JrNav active={tab} onNav={(t) => { setActivity(null); setTab(t); }} />
          {rescue && <Rescue onDone={() => { buzz(8); setRescue(false); }} />}
        </div>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
