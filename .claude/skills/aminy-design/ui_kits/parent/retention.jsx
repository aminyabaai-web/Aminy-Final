/* Retention & growth — Cancel-save flow · Delete-account flow · Referral.
   Best-practice subscription retention (recap → pause/discount/downgrade →
   survey → graceful exit), no dark patterns: easy to leave, easy to return.
   window → #root */
(function () {
  const { AIcon, PhoneShell } = window;
  const { Button, Stat } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || { light(){}, medium(){}, success(){} };
  const toast = (m) => window.aminyToast && window.aminyToast(m);

  const Head = ({ title, sub }) => (
    <div style={{ padding: "8px 18px 12px", borderBottom: "1px solid var(--color-border)", background: "#fff" }}>
      <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: "var(--color-text-strong)" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>{sub}</div>}
    </div>
  );
  const Body = ({ children }) => <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>;

  /* ============ CANCEL-SAVE FLOW ============ */
  function CancelFlow() {
    const [step, setStep] = R.useState(0);
    const [saved, setSaved] = R.useState(null); // 'pause' | 'deal'
    const [reason, setReason] = R.useState(null);

    if (saved) return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 30px", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--aminy-teal-600)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-glow-teal)" }}><AIcon name="heart" size={32} style={{ color: "#fff" }} /></div>
        <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.025em", color: "var(--color-text-strong)", margin: 0, textWrap: "balance" }}>{saved === "pause" ? "Paused until September." : "Done — 50% off your next 3 months."}</h2>
        <p style={{ fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.6, margin: 0, maxWidth: 280 }}>{saved === "pause" ? "Kai's profile and everything Aminy has learned are frozen safe. We'll check in gently before it resumes — no surprise charges." : "Same plan, half the price, starting today. Thanks for staying — we'll keep earning it."}</p>
        <Button variant="secondary" onClick={() => { setSaved(null); setStep(0); }}>Back to settings</Button>
      </div>
    );

    if (step === 0) return (
      <>
        <Head title="Manage plan" sub="Core · $129/yr · renews Aug 12" />
        <Body>
          <div style={{ background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)", border: "1px solid var(--aminy-teal-100)", borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--aminy-teal-700)", marginBottom: 8 }}>Before anything — look how far you've come</div>
            <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.015em", color: "var(--color-text-strong)", lineHeight: 1.4, marginBottom: 12 }}>Six months ago, mornings were the hard part. Last week, Kai had five calm ones.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <Stat label="Calm wins" value="47" caption="Logged together" accent />
              <Stat label="Aminy knows" value="1.2k" caption="Things that work" />
              <Stat label="Signed answers" value="12" caption="From your BCBA" />
            </div>
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={() => { haptic.success(); toast("Glad you're staying 💛"); }}>Keep my plan</Button>
          <button onClick={() => { haptic.light(); setStep(1); }} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-ui)", padding: 8 }}>I still want to make a change</button>
        </Body>
      </>
    );

    if (step === 1) return (
      <>
        <Head title="A better fit, maybe" sub="Most families pick one of these instead" />
        <Body>
          <div style={{ background: "#fff", border: "2px solid var(--aminy-teal-600)", borderRadius: 16, padding: 15, position: "relative" }}>
            <span style={{ position: "absolute", top: -10, left: 16, background: "var(--aminy-teal-600)", color: "#fff", fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", borderRadius: 999, padding: "3px 10px" }}>MOST CHOSEN</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-strong)", margin: "4px 0 4px" }}>Stay for half price</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5, marginBottom: 12 }}>50% off the next 3 months. Everything stays — the plan, the memory, your BCBA thread.</div>
            <Button variant="primary" fullWidth onClick={() => { haptic.success(); setSaved("deal"); }}>Take 50% off</Button>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 15 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-strong)", marginBottom: 4 }}>Pause instead — $0</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5, marginBottom: 12 }}>Life gets loud. Freeze your plan up to 3 months; Kai's data stays safe and nothing bills.</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["1 mo", "2 mo", "3 mo"].map((m) => <button key={m} onClick={() => { haptic.success(); setSaved("pause"); }} style={{ flex: 1, height: 44, borderRadius: 12, border: "1.5px solid var(--aminy-teal-300)", background: "var(--aminy-teal-50)", color: "var(--aminy-teal-800)", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{m}</button>)}
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 15 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-strong)", marginBottom: 4 }}>Switch to Free</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5, marginBottom: 12 }}>Keep booking visits and 3 daily Aminy messages. AI memory and practice plans go dormant.</div>
            <Button variant="secondary" fullWidth onClick={() => { haptic.medium(); toast("Switched to Free at period end — easy to come back"); }}>Downgrade to Free</Button>
          </div>
          <button onClick={() => { haptic.light(); setStep(2); }} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--color-text-subtle)", fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-ui)", padding: 8 }}>Continue to cancel</button>
        </Body>
      </>
    );

    if (step === 2) return (
      <>
        <Head title="Help us understand" sub="30 seconds — it genuinely shapes what we build" />
        <Body>
          {["Too expensive right now", "Not using it enough", "Found another solution", "We just need a break", "Something else"].map((r) => (
            <button key={r} onClick={() => { haptic.light(); setReason(r); }} style={{ textAlign: "left", padding: "13px 16px", borderRadius: 14, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 600, border: `1.5px solid ${reason === r ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`, background: reason === r ? "var(--aminy-teal-50)" : "#fff", color: reason === r ? "var(--aminy-teal-800)" : "var(--color-text-strong)" }}>{r}</button>
          ))}
          <Button variant="primary" size="lg" fullWidth disabled={!reason} style={{ background: "var(--aminy-alert-600)", boxShadow: "none" }} onClick={() => { haptic.medium(); setStep(3); }}>Cancel my subscription</Button>
        </Body>
      </>
    );

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 28px", textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>💛</div>
        <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.025em", color: "var(--color-text-strong)", margin: 0, textWrap: "balance" }}>Done — and no hard feelings.</h2>
        <p style={{ fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.6, margin: 0, maxWidth: 290 }}>You keep full access until <b>August 12</b>. Kai's profile and everything Aminy learned stay safe for <b>90 days</b> — restart in one tap, anytime.</p>
        <Button variant="secondary" onClick={() => toast("Preparing your data export…")}>Export my data first</Button>
        <button onClick={() => { haptic.success(); setStep(0); toast("Welcome back 💛 Plan restored."); }} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--aminy-teal-700)", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-ui)", padding: 6 }}>Changed your mind? Restart now</button>
      </div>
    );
  }

  /* ============ DELETE ACCOUNT ============ */
  function DeleteFlow() {
    const [txt, setTxt] = R.useState("");
    const [gone, setGone] = R.useState(false);
    if (gone) return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 30px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.025em", color: "var(--color-text-strong)", margin: 0 }}>Deletion scheduled.</h2>
        <p style={{ fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.6, margin: 0, maxWidth: 290 }}>Your account and all data will be permanently deleted in <b>14 days</b>. Sign back in before then and everything is restored, exactly as you left it.</p>
        <Button variant="secondary" onClick={() => { setGone(false); setTxt(""); toast("Deletion cancelled — welcome back"); }}>Cancel deletion</Button>
      </div>
    );
    return (
      <>
        <Head title="Delete account" sub="Permanent — so let's be careful together" />
        <Body>
          <div style={{ background: "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-100)", borderRadius: 16, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--aminy-teal-800)", marginBottom: 4 }}>First: take your data with you</div>
            <div style={{ fontSize: 12.5, color: "var(--aminy-teal-800)", lineHeight: 1.5, marginBottom: 10 }}>Reports, vault documents, progress history — yours, in one file.</div>
            <Button size="sm" variant="secondary" onClick={() => toast("Export started — we'll email a secure link")}>Export everything</Button>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 15 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-strong)", marginBottom: 8 }}>Deleting permanently removes</div>
            {["Everything Aminy has learned about Kai (1,284 facts)", "All vault documents & reports", "Your BCBA threads & signed answers", "6 months of progress history"].map((x) => (
              <div key={x} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--color-text-muted)", lineHeight: 1.5, marginBottom: 6 }}><span style={{ color: "var(--aminy-alert-600)", fontWeight: 800 }}>×</span>{x}</div>
            ))}
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 15, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-strong)" }}>Just need space? Pause instead</div><div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>$0 · everything kept safe</div></div>
            <Button size="sm" variant="primary" onClick={() => toast("Paused — nothing bills, nothing is lost")}>Pause</Button>
          </div>
          <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder='Type DELETE to confirm' style={{ height: 48, borderRadius: 12, border: "1.5px solid var(--color-border-strong)", padding: "0 14px", fontSize: 15, fontFamily: "var(--font-ui)", outline: "none", textAlign: "center", letterSpacing: ".04em" }} />
          <Button variant="primary" fullWidth disabled={txt !== "DELETE"} style={{ background: "var(--aminy-alert-600)", boxShadow: "none" }} onClick={() => { haptic.medium(); setGone(true); }}>Permanently delete my account</Button>
        </Body>
      </>
    );
  }

  /* ============ REFERRAL / SHARE ============ */
  function Referral() {
    return (
      <>
        <Head title="Share Aminy" sub="Every family you help, helps yours" />
        <Body>
          <div style={{ background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)", border: "1px solid var(--aminy-teal-100)", borderRadius: 18, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>💛</div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", color: "var(--color-text-strong)", marginBottom: 4 }}>Give a month. Get a month.</div>
            <div style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.55, marginBottom: 14 }}>A family you know gets their first month of Core free — and so do you, every time.</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#fff", border: "1.5px dashed var(--aminy-teal-300)", borderRadius: 12, padding: "10px 12px" }}>
              <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--aminy-teal-800)", textAlign: "left" }}>aminy.ai/f/sarah-k7</span>
              <Button size="sm" variant="primary" onClick={() => { haptic.success(); toast("Link copied — send it with love"); }}>Copy</Button>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", margin: "4px 4px 0" }}>Or share a win</div>
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 15 }}>
            <div style={{ background: "linear-gradient(135deg,var(--aminy-win-50),#fff)", border: "1px solid var(--aminy-win-100)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--aminy-win-600)", marginBottom: 5 }}>This week's win</div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-text-strong)", lineHeight: 1.35 }}>Kai named his feelings three times this week — without being asked. 💛</div>
              <div style={{ fontSize: 11, color: "var(--color-text-subtle)", marginTop: 8 }}>aminy.ai · gentle guidance, meaningful progress</div>
            </div>
            <Button variant="secondary" fullWidth icon={<AIcon name="send" size={15} />} onClick={() => { haptic.light(); toast("Share sheet → Messages, Instagram, anywhere"); }}>Share this win</Button>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-subtle)", textAlign: "center", lineHeight: 1.55, padding: "0 12px" }}>Wins are shared only when you choose — never automatically, never with data you didn't pick.</div>
        </Body>
      </>
    );
  }

  const SCREENS = [["cancel", "Cancel-save flow", CancelFlow], ["delete", "Delete account", DeleteFlow], ["refer", "Referral", Referral]];
  function App() {
    const [s, setS] = R.useState("cancel");
    const Cur = SCREENS.find((x) => x[0] === s)[2];
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", gap: 6, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 999, padding: 5, boxShadow: "var(--shadow-sm)" }}>
          {SCREENS.map(([id, lb]) => (
            <button key={id} onClick={() => { haptic.light(); setS(id); }} style={{ padding: "8px 16px", borderRadius: 999, border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, background: s === id ? "var(--aminy-teal-600)" : "transparent", color: s === id ? "#fff" : "var(--color-text-muted)" }}>{lb}</button>
          ))}
        </div>
        <PhoneShell bg="linear-gradient(180deg,var(--aminy-mist),var(--aminy-mist-deep))">
          <div key={s} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}><Cur /></div>
        </PhoneShell>
      </div>
    );
  }

  function mount() {
    if (!window.PhoneShell || !window.AminyKit) { setTimeout(mount, 60); return; }
    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  }
  mount();
})();
