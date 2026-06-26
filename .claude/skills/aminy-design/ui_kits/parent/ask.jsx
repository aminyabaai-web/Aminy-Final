/* Ask Aminy — AI coach chat. Validate first, then offer. window.AskScreen
   Composer mirrors ChatGPT/Claude: attach (camera/photo/file) + voice + send.
   Header offers a calm escalation to a human BCBA. */
(function () {
  const { AIcon } = window;
  const SEED = [
    { who: "bot", affirm: true, brain: true, lead: "Aminy", text: "Mornings have been hard this week. That makes sense — Kai's been off his sleep schedule. You're doing the right thing by noticing." },
    { who: "me", text: "He melted down during teeth again today. I lost my patience." },
    { who: "bot", brain: true, text: "That sounds really hard. Both of you were doing your best with what the morning gave you. Want to try something different tomorrow, or just vent for a minute?" },
  ];
  const REPLIES = ["Try something different", "Just vent", "Loop in our BCBA"];
  // What the unified AI brain knows about this child (mirrors buildAIContext)
  const BRAIN = [
    { icon: "heart", label: "Kai, age 7 · sensory-sensitive" },
    { icon: "file", label: "3 vault documents (IEP, eval, report)" },
    { icon: "target", label: "4 of today's plan activities" },
    { icon: "clock", label: "12 past conversations remembered" },
  ];
  const QUICK = [
    "Kai had a meltdown today. How can I help?",
    "Help me build a better morning routine",
    "How is Kai doing overall?",
  ];

  const ATTACH = [
    { id: "camera", label: "Camera", emoji: "📷", note: "Capture a moment or behavior" },
    { id: "photo", label: "Photo library", emoji: "🖼️", note: "Share a picture or video" },
    { id: "file", label: "File", emoji: "📄", note: "Report, IEP, assessment" },
  ];

  window.AskScreen = function AskScreen() {
    const DS = window.DesignSystem_39fb2b;
    const [msgs, setMsgs] = React.useState(SEED);
    const [text, setText] = React.useState("");
    const [attachOpen, setAttachOpen] = React.useState(false);
    const [recording, setRecording] = React.useState(false);
    const [thinking, setThinking] = React.useState(false);
    const [showBrain, setShowBrain] = React.useState(false);
    const endRef = React.useRef(null);
    const Thinking = window.AminyMotion && window.AminyMotion.Thinking;
    const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

    React.useEffect(() => { if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight; }, [msgs, thinking]);

    function send(t) {
      const body = (t || text).trim();
      if (!body) return;
      setText(""); setAttachOpen(false);
      const toBcba = /bcba|dr\.?\s|morales|therapist/i.test(body);
      setMsgs((m) => [...m, { who: "me", text: body }]);
      setThinking(true);
      setTimeout(() => {
        setThinking(false);
        setMsgs((m) => [...m, toBcba
          ? { who: "bot", lead: "Sent to Dr. Morales", bcba: true, text: "I've shared this thread with Kai's BCBA. She'll reply here — usually within a day. You can keep talking to me in the meantime." }
          : { who: "bot", brain: true, lead: "One small swap", text: "Move teeth to after breakfast for three days. Full belly + no rushing = less resistance — and since Kai's sensory-sensitive, a softer brush may help too. If it doesn't, we'll try another angle." }]);
      }, 1400);
    }
    function attach(item) { buzz(8); setAttachOpen(false); setMsgs((m) => [...m, { who: "me", chip: item.emoji + " " + item.label, text: "" }]); }

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
        <div style={{ padding: "6px 16px 8px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fff", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text)" }}><AIcon name="back" size={16} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-strong)", fontFamily: "var(--font-ui)", letterSpacing: "-0.01em" }}>Ask Aminy</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--aminy-teal-700)", letterSpacing: ".04em" }}>Coach · always here</div>
          </div>
          <button onClick={() => { buzz(6); setShowBrain((v) => !v); }} aria-label="What Aminy knows" style={{ display: "flex", alignItems: "center", gap: 5, height: 34, padding: "0 11px", borderRadius: 999, background: showBrain ? "var(--aminy-teal-600)" : "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-200)", color: showBrain ? "#fff" : "var(--aminy-teal-700)", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <AIcon name="brain" size={14} /> Knows Kai
          </button>
          <button onClick={() => send("Loop in our BCBA")} style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 999, background: "var(--aminy-care-50)", border: "1px solid var(--aminy-care-100)", color: "var(--aminy-care-600)", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <AIcon name="shield" size={14} /> Your BCBA
          </button>
        </div>

        {showBrain && (
          <div style={{ padding: "12px 16px", background: "linear-gradient(180deg,var(--aminy-teal-50),#fff)", borderBottom: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
              <AIcon name="sparkles" size={14} style={{ color: "var(--aminy-teal-700)" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--aminy-teal-800)" }}>Context loaded · Aminy knows</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {BRAIN.map((b) => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", background: "#fff", border: "1px solid var(--aminy-teal-200)", borderRadius: 11 }}>
                  <AIcon name={b.icon} size={14} style={{ color: "var(--aminy-teal-600)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--aminy-teal-800)", lineHeight: 1.25 }}>{b.label}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 9, lineHeight: 1.4 }}>Every answer is personalized to Kai — never generic. Your data stays private.</div>
          </div>
        )}

        <div ref={endRef} style={{ flex: 1, overflowY: "auto", padding: "8px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{
              maxWidth: "82%", padding: "10px 13px", borderRadius: 16, fontSize: 13.5, lineHeight: 1.45,
              alignSelf: m.who === "me" ? "flex-end" : "flex-start",
              background: m.who === "me" ? "var(--aminy-teal-600)" : (m.affirm ? "linear-gradient(180deg,#fff,var(--aminy-teal-50))" : "#fff"),
              color: m.who === "me" ? "#fff" : "var(--color-text)",
              border: m.who === "me" ? "0" : "1px solid var(--color-border)",
              borderTopRightRadius: m.who === "me" ? 6 : 16,
              borderTopLeftRadius: m.who === "me" ? 16 : 6,
              fontFamily: m.affirm ? "var(--font-ui)" : "var(--font-ui)",
              fontStyle: "normal",
              fontWeight: m.affirm ? 600 : 400,
            }}>
              {m.brain && m.who === "bot" && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "var(--aminy-teal-700)", opacity: 0.85, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em" }}><AIcon name="brain" size={11} />Context-aware</span>}
              {m.lead && <span style={{ display: "block", fontFamily: "var(--font-ui)", fontStyle: "normal", fontWeight: 700, fontSize: 12, letterSpacing: ".04em", marginBottom: 3, color: m.bcba ? "var(--aminy-care-600)" : (m.affirm ? "var(--aminy-teal-700)" : "var(--color-text-strong)") }}>{m.lead}</span>}
              {m.chip
                ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 13 }}>{m.chip}</span>
                : m.text}
            </div>
          ))}
          {thinking && Thinking && (
            <div style={{ alignSelf: "flex-start", background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, borderTopLeftRadius: 6, padding: "12px 14px" }}>
              <Thinking />
            </div>
          )}
          {msgs.length === SEED.length && !thinking && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {REPLIES.map((r) => (
                <button key={r} onClick={() => send(r)} style={{ padding: "7px 12px", background: "#fff", border: "1px solid var(--aminy-teal-200)", color: "var(--aminy-teal-700)", borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-ui)", cursor: "pointer" }}>{r}</button>
              ))}
            </div>
          )}
          {msgs.length === SEED.length && !thinking && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-subtle)", marginBottom: 6 }}>Aminy can help with…</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)} style={{ textAlign: "left", padding: "9px 12px", background: "var(--aminy-mist)", border: "1px solid var(--color-border)", color: "var(--color-text)", borderRadius: 12, fontSize: 12.5, fontWeight: 500, fontFamily: "var(--font-ui)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><AIcon name="sparkles" size={13} style={{ color: "var(--aminy-teal-600)", flexShrink: 0 }} />{q}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {attachOpen && (
          <div onClick={() => setAttachOpen(false)} style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(15,23,42,0.12)", display: "flex", flexDirection: "column", justifyContent: "flex-end", animation: "aminy-fade-in var(--dur-base) var(--ease-calm) both" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: "10px 14px 18px", boxShadow: "0 -8px 24px rgba(15,23,42,0.12)", animation: "aminy-sheet-up 320ms var(--ease-lift) both" }}>
              <div style={{ width: 36, height: 4, borderRadius: 999, background: "var(--aminy-navy-200)", margin: "0 auto 12px" }} />
              {ATTACH.map((a) => (
                <button key={a.id} onClick={() => attach(a)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "12px 8px", background: "none", border: 0, borderBottom: "1px solid var(--color-border)", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--aminy-teal-50)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{a.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--color-text-strong)" }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>{a.note}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "8px 12px 12px" }}>
          {recording ? (
            <div style={{ background: "#fff", border: "1px solid var(--aminy-teal-200)", borderRadius: 22, padding: "8px 8px 8px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--aminy-alert-600)", animation: "rec 1s ease-in-out infinite" }} />
              <div style={{ display: "flex", gap: 3, alignItems: "center", flex: 1, height: 22 }}>
                {Array.from({ length: 22 }).map((_, b) => <span key={b} style={{ width: 3, borderRadius: 2, background: "var(--aminy-teal-500)", height: `${6 + Math.abs(Math.sin(b * 0.9)) * 16}px` }} />)}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>0:04</span>
              <button onClick={() => { buzz(8); setRecording(false); send("(voice note · 4s)"); }} style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--aminy-teal-600)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: 0, cursor: "pointer" }}><AIcon name="check" size={16} /></button>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 22, padding: "4px 4px 4px 6px", display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => { buzz(6); setAttachOpen(true); }} aria-label="Add attachment" style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--aminy-teal-50)", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center", border: 0, cursor: "pointer", flexShrink: 0 }}><AIcon name="plus" size={19} /></button>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Talk to Aminy…"
                style={{ flex: 1, border: 0, outline: 0, fontSize: 14, padding: "10px 4px", color: "var(--color-text)", background: "transparent", fontFamily: "var(--font-ui)", minWidth: 0 }} />
              {text.trim()
                ? <button onClick={() => send()} aria-label="Send" style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--aminy-teal-600)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: 0, boxShadow: "var(--shadow-glow-teal)", cursor: "pointer", flexShrink: 0 }}><AIcon name="send" size={16} /></button>
                : <button onClick={() => { buzz(10); setRecording(true); }} aria-label="Voice" style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--aminy-teal-50)", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center", border: 0, cursor: "pointer", flexShrink: 0 }}><AIcon name="mic" size={18} /></button>}
            </div>
          )}
          <div style={{ textAlign: "center", fontSize: 10.5, color: "var(--color-text-subtle)", marginTop: 7 }}>Aminy is a coach, not a crisis line. In an emergency, call 988 or 911.</div>
        </div>
        <style>{`@keyframes rec{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      </div>
    );
  };
})();
