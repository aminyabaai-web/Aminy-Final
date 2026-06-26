/* TeleABA live session — ported from telehealth/WaitingRoom.tsx + VideoCallRoom flow.
   Waiting Room (calm dark gradient, self-preview, mic/cam, rotating prep tips,
   "provider will admit you" → "You're In!") → In-call → Ended. window.SessionScreen */
(function () {
  const { AIcon } = window;
  const R = React;

  const TIPS = [
    ["Camera check", "Make sure your camera is on and your face is well-lit. Natural light from a window works great."],
    ["Find a quiet space", "Background noise can make it harder for your provider to hear you."],
    ["Have goals handy", "Have Kai's current goals or recent behavior notes ready to share."],
    ["Prepare questions", "Think about 1–2 specific things you'd like to discuss today."],
    ["Deep breaths", "Take a few slow breaths while you wait. Inhale 4, hold 4, exhale 4."],
    ["Privacy protected", "Your session is encrypted in transit and kept private."],
  ];

  function SelfTile({ camOn, small }) {
    return (
      <div style={{ position: "absolute", inset: small ? "auto 12px 92px auto" : 0, width: small ? 96 : "100%", height: small ? 132 : "100%", borderRadius: small ? 14 : 0, overflow: "hidden", background: "#0b1620", border: small ? "2px solid rgba(255,255,255,0.25)" : "0", display: "flex", alignItems: "center", justifyContent: "center", zIndex: small ? 3 : 1 }}>
        {camOn ? (
          <div style={{ width: "100%", height: "100%", background: "radial-gradient(circle at 50% 38%, #1d4a57, #16323d 60%, #0b1620)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ width: small ? 44 : 96, height: small ? 44 : 96, borderRadius: "50%", marginBottom: small ? 14 : 60, background: "linear-gradient(135deg,var(--aminy-teal-400),var(--aminy-teal-700))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: small ? 18 : 36, fontFamily: "var(--font-ui)" }}>S</div>
          </div>
        ) : (
          <div style={{ color: "rgba(255,255,255,0.4)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}><AIcon name="videoOff" size={small ? 18 : 28} /><span style={{ fontSize: small ? 9 : 12 }}>Camera off</span></div>
        )}
        {small && <span style={{ position: "absolute", bottom: 4, left: 6, fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>You</span>}
      </div>
    );
  }

  function Controls({ micOn, camOn, setMic, setCam, onEnd, joined }) {
    const btn = (active, onClick, onIcon, offIcon, danger) => (
      <button onClick={onClick} style={{ width: 50, height: 50, borderRadius: "50%", border: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", background: danger ? "#dc2626" : active ? "rgba(255,255,255,0.18)" : "rgba(220,38,38,0.85)" }}>
        {active ? onIcon : offIcon}
      </button>
    );
    return (
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 0 24px", display: "flex", gap: 14, alignItems: "center", justifyContent: "center", zIndex: 4, background: joined ? "linear-gradient(0deg,rgba(0,0,0,0.5),transparent)" : "transparent" }}>
        {btn(micOn, () => setMic(!micOn), <AIcon name="mic" size={21} />, <AIcon name="micOff" size={21} />)}
        {btn(camOn, () => setCam(!camOn), <AIcon name="video" size={21} />, <AIcon name="videoOff" size={21} />)}
        {joined && <button onClick={onEnd} style={{ width: 62, height: 50, borderRadius: 25, border: 0, cursor: "pointer", background: "#dc2626", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><AIcon name="phoneOff" size={22} /></button>}
      </div>
    );
  }

  window.SessionScreen = function SessionScreen({ onExit, provider = "Dr. Patel", title = "Occupational therapy · 30 min" }) {
    const [phase, setPhase] = R.useState("waiting"); // waiting · admitted · incall · ended
    const [micOn, setMic] = R.useState(true);
    const [camOn, setCam] = R.useState(true);
    const [secs, setSecs] = R.useState(0);
    const [tip, setTip] = R.useState(0);
    const [fade, setFade] = R.useState(false);
    const [callSecs, setCallSecs] = R.useState(0);
    const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

    // wait timer + auto-admit after ~6s
    R.useEffect(() => {
      if (phase !== "waiting") return;
      const t = setInterval(() => setSecs((s) => s + 1), 1000);
      const admit = setTimeout(() => { buzz(20); setPhase("admitted"); setTimeout(() => setPhase("incall"), 1600); }, 6000);
      return () => { clearInterval(t); clearTimeout(admit); };
    }, [phase]);
    // tips rotate
    R.useEffect(() => {
      if (phase !== "waiting") return;
      const i = setInterval(() => { setFade(true); setTimeout(() => { setTip((x) => (x + 1) % TIPS.length); setFade(false); }, 300); }, 4500);
      return () => clearInterval(i);
    }, [phase]);
    // call timer
    R.useEffect(() => { if (phase !== "incall") return; const t = setInterval(() => setCallSecs((s) => s + 1), 1000); return () => clearInterval(t); }, [phase]);

    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    const initials = provider.replace("Dr. ", "").split(" ").map((w) => w[0]).join("").toUpperCase();

    if (phase === "ended") {
      return (
        <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "linear-gradient(160deg,#0f2730,#0b1620)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 30px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--aminy-teal-600)", display: "flex", alignItems: "center", justifyContent: "center" }}><AIcon name="check" size={34} style={{ color: "#fff" }} /></div>
          <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 22, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Session complete</h2>
          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, margin: 0, maxWidth: 280 }}>{fmt(callSecs)} with {provider}. Aminy is drafting your visit summary and home-practice notes — they'll be in My Plan shortly.</p>
          <button onClick={onExit} style={{ marginTop: 8, height: 50, padding: "0 28px", borderRadius: 14, border: 0, cursor: "pointer", background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 16 }}>Back to home</button>
        </div>
      );
    }

    const joined = phase === "incall";
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "linear-gradient(160deg,#0f172a,#0f2e38 55%,#0c3a44)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "44px 16px 10px", zIndex: 5 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.6)" }}><AIcon name="shield" size={13} /> Encrypted in transit</span>
          <button onClick={onExit} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: 0, cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "var(--font-ui)" }}><AIcon name="back" size={14} /> Leave</button>
        </div>

        {joined ? (
          <div style={{ flex: 1, position: "relative" }}>
            {/* provider big tile */}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%, #15323d, #0c2027 70%, #081318)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={{ width: 104, height: 104, borderRadius: "50%", background: "linear-gradient(135deg,var(--aminy-teal-400),var(--aminy-teal-800))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 40, fontFamily: "var(--font-ui)", boxShadow: "0 0 0 6px rgba(45,212,191,0.15)" }}>{initials}</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{provider}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} /> {fmt(callSecs)}</div>
              </div>
            </div>
            <SelfTile camOn={camOn} small />
            <Controls micOn={micOn} camOn={camOn} setMic={setMic} setCam={setCam} onEnd={() => { buzz(16); setPhase("ended"); }} joined />
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 18px", overflowY: "auto" }}>
            {/* provider card */}
            <div style={{ display: "flex", alignItems: "center", gap: 13, background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 13, border: "1px solid rgba(255,255,255,0.1)", marginBottom: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(45,212,191,0.25)", border: "2px solid rgba(45,212,191,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 17 }}>{initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{provider}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{title}</div>
              </div>
            </div>
            {/* self preview */}
            <div style={{ position: "relative", aspectRatio: "4/3", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 14 }}>
              <SelfTile camOn={camOn} />
              <div style={{ position: "absolute", top: 10, left: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.4)", borderRadius: 999, padding: "5px 10px", fontSize: 11, color: "#fff" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} /> Camera ready</div>
            </div>
            {/* status */}
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              {phase === "admitted" ? (
                <>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 4 }}>You're in!</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Joining your session now…</div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 8 }}>{[0, 1, 2].map((d) => <span key={d} style={{ width: 9, height: 9, borderRadius: "50%", background: "#2dd4bf", animation: `sb 1.2s ease-in-out ${d * 0.15}s infinite` }} />)}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Your provider will admit you shortly</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>Waiting for {provider} · {fmt(secs)}</div>
                </>
              )}
            </div>
            {/* tip carousel */}
            {phase === "waiting" && (
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.1)", opacity: fade ? 0 : 1, transition: "opacity .3s" }}>
                <div style={{ display: "flex", gap: 11 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(45,212,191,0.2)", color: "#5eead4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name="sparkles" size={16} /></div>
                  <div><div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#5eead4", marginBottom: 3 }}>{TIPS[tip][0]}</div><div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{TIPS[tip][1]}</div></div>
                </div>
              </div>
            )}
            <Controls micOn={micOn} camOn={camOn} setMic={setMic} setCam={setCam} joined={false} />
          </div>
        )}
        <style>{`@keyframes sb{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-6px);opacity:1}}`}</style>
      </div>
    );
  };
})();
