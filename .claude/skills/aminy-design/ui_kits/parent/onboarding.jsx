/* Onboarding — conversational, Bevel-style. Ported from the real AIOnboarding.tsx.
   Aminy asks one question at a time, builds the child's profile live as chips,
   then generates a tailored first suggestion. Rebuilt in the Aminy system. window.Onboarding */
(function () {
  const { AIcon } = window;
  const R = React;

  // Faithful to AIOnboarding.tsx: 5 questions, profile extraction, tailored suggestion.
  const QUESTIONS = [
    { key: "childName", q: (p) => `Hi${p ? ` ${p}` : ""} — I'm Aminy, and I'm here to support your family. What's your child's name?`,
      chips: null,
      extract: (t) => { const c = t.trim().replace(/[.!?,]/g, ""); const w = c.split(/\s+/); if (w.length <= 3) return c; const m = c.match(/(?:name is|called|it's|he's|she's|they're)\s+(\w+)/i); return m ? m[1] : w[0]; } },
    { key: "childAge", q: (n) => `Great name. How old is ${n}?`,
      chips: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13+"],
      extract: (t) => { const m = t.match(/(\d{1,2})/); return m ? m[1] : t.trim(); } },
    { key: "concerns", q: (n) => `What are the biggest challenges you and ${n} are facing right now? Don't hold back — I've heard it all.`,
      chips: ["Mornings & transitions", "Sleep & bedtime", "Big feelings / meltdowns", "Talking & communication"],
      extract: (t) => t.trim() },
    { key: "diagnoses", q: (n) => `Does ${n} have any diagnoses? Totally fine if not — many families start here before a formal one. Pick all that apply.`,
      chips: ["Autism", "ADHD", "Speech delay", "Sensory (SPD)", "Anxiety", "Not yet"], multi: true,
      extract: (t) => t.trim() },
    { key: "services", q: (n) => `Is ${n} getting any therapy or services right now? Pick all that apply — if none yet, that's what we're here for.`,
      chips: ["ABA", "Speech", "OT", "PT", "Feeding", "Not yet"], multi: true,
      extract: (t) => t.trim() },
  ];

  function suggestion(profile, w) {
    const n = profile.childName || "your child";
    const c = (profile.concerns || "").toLowerCase();
    if (/meltdown|tantrum|outburst|anger|feeling|aggress/i.test(c))
      return `Build a "calm-down kit" ${w}: put 3 things ${n} finds soothing (a soft toy, a fidget, headphones) in a small bag. Next time things escalate, hand it over — "Here's your calm kit." No other words needed. Kids self-regulate faster with tools than instructions.`;
    if (/sleep|bedtime|night/i.test(c))
      return `Set up a "bedtime runway" for tonight: 30 min before bed, dim the lights, screens off, same 3 things in the same order (teeth, story, song). ${n}'s brain needs predictability to wind down. Even one consistent night helps.`;
    if (/transition|morning|change|switch/i.test(c))
      return `Try "first-then" the next time a transition comes up: say "First we [now], then we [next]." Show it visually if you can, with a 5- and 1-minute warning. ${n}'s brain just needs advance notice.`;
    if (/speech|language|talk|communicat|word/i.test(c))
      return `At the next meal, try gentle "sabotage": put ${n}'s favorite food in a container they can't open alone. Wait — don't prompt. When they gesture or vocalize, model the word once ("open!") and help right away. Natural motivation to communicate.`;
    return `Sometime ${w}, spend 5 uninterrupted minutes with ${n} doing whatever THEY choose. No agenda, no teaching, no correcting — just follow their lead. That connection is the foundation everything else builds on.`;
  }

  const FIELD_LABELS = { childName: "Name", childAge: "Age", concerns: "Challenges", diagnoses: "Diagnosis", services: "Services" };

  // Time-aware framing so "first step" matches when the parent is actually here.
  function whenPhrase() {
    const h = new Date().getHours();
    if (h < 11) return "this morning";
    if (h < 16) return "today";
    return "tonight";
  }

  window.Onboarding = function Onboarding({ onDone, parentName = "" }) {
    const { Button } = window.AminyKit;
    const [msgs, setMsgs] = R.useState([]);
    const [input, setInput] = R.useState("");
    const [step, setStep] = R.useState(0);
    const [profile, setProfile] = R.useState({});
    const [typing, setTyping] = R.useState(false);
    const [done, setDone] = R.useState(false);
    const [primeNotif, setPrimeNotif] = R.useState(false);
    const [picks, setPicks] = R.useState([]); // multi-select staging
    const scrollRef = R.useRef(null);
    const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

    R.useEffect(() => { const t = setTimeout(() => setMsgs([{ role: "ai", text: QUESTIONS[0].q(parentName) }]), 600); return () => clearTimeout(t); }, [parentName]);
    R.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, typing]);

    function submitMulti() {
      if (!picks.length) return;
      send(picks.join(", "));
      setPicks([]);
    }

    function send(val) {
      const text = (val != null ? val : input).trim();
      if (!text || typing || done) return;
      setInput("");
      setMsgs((m) => [...m, { role: "parent", text }]);
      const cur = QUESTIONS[step];
      const ex = cur.extract(text);
      const up = { ...profile };
      if (cur.key === "childName") up.childName = ex;
      else if (cur.key === "childAge") up.childAge = ex;
      else if (cur.key === "concerns") up.concerns = text;
      else if (cur.key === "diagnoses") up.diagnoses = /no|none|not yet/i.test(text) ? "None yet" : ex;
      else if (cur.key === "services") up.services = /no|none|not yet/i.test(text) ? "None yet" : ex;
      setProfile(up);
      buzz(6);
      const next = step + 1;
      setTyping(true);
      setTimeout(() => {
        if (next < QUESTIONS.length) {
          setMsgs((m) => [...m, { role: "ai", text: QUESTIONS[next].q(up.childName || "your child") }]);
          setStep(next);
        } else {
          const w = whenPhrase();
          setMsgs((m) => [...m, { role: "ai", suggestion: true, when: w, text: `I already know enough to help. Here's a first step you can try ${w}:`, tip: suggestion(up, w) }]);
          setDone(true);
        }
        setTyping(false);
      }, 1100);
    }

    const filled = Object.keys(FIELD_LABELS).filter((k) => profile[k]);
    const cur = QUESTIONS[step];
    const showChips = !done && !typing && cur && cur.chips && msgs.length > 0 && msgs[msgs.length - 1].role === "ai";

    // Final beat: gentle notification priming (iOS best practice the code lacks), then "Let's go"
    if (primeNotif) {
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 18, padding: "0 28px" }}>
            <div style={{ width: 92, height: 92, borderRadius: 28, background: "linear-gradient(135deg,#fff,var(--aminy-teal-50))", border: "1px solid var(--aminy-teal-100)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-md)" }}><AIcon name="bell" size={38} style={{ color: "var(--aminy-teal-600)" }} /></div>
            <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 600, fontSize: 23, lineHeight: 1.2, color: "var(--color-text-strong)", margin: 0, maxWidth: 290, letterSpacing: "-0.01em", WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}>A gentle nudge, only when it helps.</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--color-text-muted)", margin: 0, maxWidth: 290 }}>A calm reminder before a rough moment, a note when {profile.childName || "your child"} hits a milestone. Never noise — you choose what comes through.</p>
          </div>
          <div style={{ padding: "12px 22px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            <Button variant="primary" size="lg" fullWidth onClick={onDone}>Turn on reminders</Button>
            <button onClick={onDone} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-ui)", padding: 8 }}>Maybe later</button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* Header + progress dots */}
        <div style={{ padding: "4px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,var(--aminy-teal-500),var(--aminy-teal-700))", display: "flex", alignItems: "center", justifyContent: "center" }}><AIcon name="sparkles" size={15} style={{ color: "#fff" }} /></div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-strong)", fontFamily: "var(--font-ui)", letterSpacing: "-0.01em" }}>Setting up your profile</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Step {Math.min(step + 1, QUESTIONS.length)} of {QUESTIONS.length}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {QUESTIONS.map((_, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: 999, background: i <= step ? "var(--aminy-teal-600)" : "var(--aminy-navy-100)" }} />)}
          </div>
        </div>

        {/* Profile chips */}
        {filled.length > 0 && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-border)", background: "rgba(255,255,255,0.5)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 7 }}>Building {profile.childName || "your child"}'s profile</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {filled.map((k) => (
                <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--aminy-teal-50)", color: "var(--aminy-teal-800)", border: "1px solid var(--aminy-teal-100)", padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600 }}>
                  <AIcon name="check" size={11} />{FIELD_LABELS[k]}: {String(profile[k]).slice(0, 22)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "parent" ? "flex-end" : "flex-start", maxWidth: "86%", animation: "aminy-fade-up var(--dur-slow) var(--ease-lift) both" }}>
              <div style={{
                padding: "10px 13px", borderRadius: 16, fontSize: 14, lineHeight: 1.5,
                background: m.role === "parent" ? "var(--aminy-teal-600)" : "#fff",
                color: m.role === "parent" ? "#fff" : "var(--color-text)",
                border: m.role === "parent" ? "0" : "1px solid var(--color-border)",
                borderBottomRightRadius: m.role === "parent" ? 5 : 16,
                borderBottomLeftRadius: m.role === "parent" ? 16 : 5,
              }}>{m.text}</div>
              {m.suggestion && (
                <div style={{ marginTop: 8, padding: "12px 14px", borderRadius: 16, background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)", border: "1px solid var(--aminy-teal-100)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}><AIcon name="sparkles" size={14} style={{ color: "var(--aminy-teal-700)" }} /><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--aminy-teal-700)" }}>{(m.when || "your").replace(/^./, (x) => x.toUpperCase())} first step</span></div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--color-text-strong)" }}>{m.tip}</div>
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div style={{ alignSelf: "flex-start", background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, borderBottomLeftRadius: 5, padding: "12px 14px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map((d) => <span key={d} style={{ width: 7, height: 7, borderRadius: 999, background: "var(--aminy-navy-300)", animation: `ob 1s ease-in-out ${d * 0.2}s infinite` }} />)}
            </div>
          )}
        </div>

        {/* Quick chips + input / finish */}
        <div style={{ padding: "8px 14px 14px", borderTop: "1px solid var(--color-border)" }}>
          {showChips && (
            cur.multi ? (
              <div style={{ marginBottom: 9 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: picks.length ? 9 : 0 }}>
                  {cur.chips.map((c) => {
                    const on = picks.includes(c);
                    const none = /not yet|none/i.test(c);
                    return <button key={c} onClick={() => { buzz(4); setPicks((p) => { if (none) return on ? [] : [c]; const cleaned = p.filter((x) => !/not yet|none/i.test(x)); return on ? cleaned.filter((x) => x !== c) : [...cleaned, c]; }); }} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", background: on ? "var(--aminy-teal-600)" : "#fff", border: `1px solid ${on ? "var(--aminy-teal-600)" : "var(--aminy-teal-200)"}`, color: on ? "#fff" : "var(--aminy-teal-700)", borderRadius: 999, fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-ui)", cursor: "pointer" }}>{on && <AIcon name="check" size={12} />}{c}</button>;
                  })}
                </div>
                {picks.length > 0 && <Button variant="primary" fullWidth size="sm" iconRight={<AIcon name="chevron" size={16} />} onClick={submitMulti}>Continue with {picks.length} selected</Button>}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
                {cur.chips.map((c) => <button key={c} onClick={() => send(c)} style={{ padding: "7px 12px", background: "#fff", border: "1px solid var(--aminy-teal-200)", color: "var(--aminy-teal-700)", borderRadius: 999, fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-ui)", cursor: "pointer" }}>{c}</button>)}
              </div>
            )
          )}
          {done ? (
            <Button variant="primary" size="lg" fullWidth iconRight={<AIcon name="chevron" size={18} />} onClick={() => setPrimeNotif(true)}>Let's go</Button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type your answer…" disabled={typing}
                style={{ flex: 1, height: 46, border: "1px solid var(--color-border-strong)", borderRadius: 14, padding: "0 14px", fontSize: 14, fontFamily: "var(--font-ui)", color: "var(--color-text)", outline: "none", background: "#fff", minWidth: 0 }} />
              <button onClick={() => send()} disabled={!input.trim() || typing} aria-label="Send" style={{ width: 46, height: 46, borderRadius: 14, background: "var(--aminy-teal-600)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: 0, cursor: "pointer", opacity: input.trim() && !typing ? 1 : 0.4, flexShrink: 0, boxShadow: "var(--shadow-glow-teal)" }}><AIcon name="send" size={17} /></button>
            </div>
          )}
        </div>
        <style>{`@keyframes ob{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}`}</style>
      </div>
    );
  };
})();
