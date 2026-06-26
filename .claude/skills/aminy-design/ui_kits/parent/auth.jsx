/* Auth + free screening — welcome · create account · sign in · forgot · M-CHAT-style screening.
   Standalone flow kit (the real app runs this between splash/why and onboarding). window → #root */
(function () {
  const { AIcon, PhoneShell } = window;
  const { Button, Input } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || { light(){}, medium(){}, success(){} };

  const H = ({ children, sub }) => (
    <div style={{ padding: "10px 26px 0" }}>
      <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 26, lineHeight: 1.12, letterSpacing: "-0.03em", color: "var(--color-text-strong)", margin: "0 0 8px", textWrap: "balance" }}>{children}</h2>
      {sub && <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--color-text-muted)", margin: 0 }}>{sub}</p>}
    </div>
  );
  const Back = ({ onClick }) => (
    <button onClick={onClick} style={{ margin: "4px 0 0 18px", width: 36, height: 36, borderRadius: 11, background: "#fff", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)" }}><AIcon name="back" size={16} /></button>
  );
  const Foot = ({ children }) => <div style={{ padding: "14px 24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>;
  const SocialBtn = ({ label, mark }) => (
    <button onClick={() => { haptic.light(); window.aminyToast && window.aminyToast(label + " — connecting…"); }} style={{ height: 52, borderRadius: 14, border: "1px solid var(--color-border-strong)", background: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 15, color: "var(--color-text-strong)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <span style={{ fontSize: 17, fontWeight: 800 }}>{mark}</span> {label}
    </button>
  );

  // ---- M-CHAT-style free screening (worded gently; NOT diagnostic) ----
  const QS = [
    "If you point at something across the room, does your child look at it?",
    "Does your child play pretend — like feeding a stuffed animal?",
    "Does your child respond when you call their name?",
    "When something new happens, does your child look at your face to see how you feel?",
    "Does your child get very upset by everyday sounds, textures, or changes in routine?",
  ];
  const OPTS = ["Often", "Sometimes", "Rarely"];

  function App() {
    const [view, setView] = R.useState("welcome"); // welcome create signin forgot sintro squiz sresult
    const [qi, setQi] = R.useState(0);
    const [answers, setAnswers] = R.useState([]);
    const [sent, setSent] = R.useState(false);
    const go = (v) => { haptic.light(); setView(v); };

    function answer(o) {
      haptic.light();
      const next = [...answers, o];
      setAnswers(next);
      if (qi < QS.length - 1) setQi(qi + 1);
      else { haptic.success(); setView("sresult"); }
    }

    let body = null;
    if (view === "welcome") body = (
      <>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "0 26px", textAlign: "center" }}>
          <img src="../../assets/aminy_logo.png" alt="aminy" style={{ width: 170, height: "auto", animation: "aminy-pop 600ms var(--ease-lift) both" }} />
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 24, letterSpacing: "-0.025em", color: "var(--color-text-strong)", lineHeight: 1.15, textWrap: "balance", animation: "aminy-fade-up 500ms var(--ease-calm) 200ms both" }}>The calm center of your child's care.</div>
          <div style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5, animation: "aminy-fade-up 500ms var(--ease-calm) 350ms both" }}>14-day free trial · no card required</div>
        </div>
        <Foot>
          <SocialBtn label="Continue with Apple" mark="" />
          <SocialBtn label="Continue with Google" mark="G" />
          <Button variant="primary" size="lg" fullWidth onClick={() => go("create")}>Continue with email</Button>
          <button onClick={() => go("signin")} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-ui)", padding: 6 }}>Already have an account? <span style={{ color: "var(--aminy-teal-700)" }}>Sign in</span></button>
        </Foot>
      </>
    );
    if (view === "create") body = (
      <>
        <Back onClick={() => go("welcome")} />
        <H sub="One account for your whole care team — you can invite caregivers later.">Create your account</H>
        <div style={{ padding: "20px 26px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          <Input label="Your name" placeholder="e.g. Sarah Chen" />
          <Input label="Email" type="email" placeholder="you@email.com" />
          <Input label="Password" type="password" placeholder="8+ characters" hint="We'll never share your data. HIPAA-conscious by design." />
        </div>
        <Foot>
          <Button variant="primary" size="lg" fullWidth onClick={() => go("sintro")}>Create account</Button>
          <div style={{ fontSize: 11.5, color: "var(--color-text-subtle)", textAlign: "center", lineHeight: 1.5 }}>By continuing you agree to the Terms of Service and acknowledge the Notice of Privacy Practices.</div>
        </Foot>
      </>
    );
    if (view === "signin") body = (
      <>
        <Back onClick={() => go("welcome")} />
        <H sub="Good to see you again.">Sign in</H>
        <div style={{ padding: "20px 26px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          <Input label="Email" type="email" placeholder="you@email.com" />
          <Input label="Password" type="password" placeholder="Your password" />
          <button onClick={() => go("forgot")} style={{ alignSelf: "flex-start", border: 0, background: "none", cursor: "pointer", color: "var(--aminy-teal-700)", fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-ui)", padding: 0 }}>Forgot password?</button>
        </div>
        <Foot><Button variant="primary" size="lg" fullWidth onClick={() => { haptic.success(); window.aminyToast && window.aminyToast("Welcome back, Sarah 💛"); }}>Sign in</Button></Foot>
      </>
    );
    if (view === "forgot") body = (
      <>
        <Back onClick={() => go("signin")} />
        <H sub={sent ? undefined : "No stress — it happens to all of us."}>{sent ? "Check your email" : "Reset your password"}</H>
        <div style={{ padding: "20px 26px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          {sent ? (
            <div style={{ background: "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-100)", borderRadius: 16, padding: 16, fontSize: 14, lineHeight: 1.55, color: "var(--aminy-teal-800)", animation: "aminy-fade-up 400ms var(--ease-calm) both" }}>We sent a reset link to your email. It's good for 30 minutes — take your time.</div>
          ) : (
            <Input label="Email" type="email" placeholder="you@email.com" />
          )}
        </div>
        <Foot>
          {sent
            ? <Button variant="secondary" size="lg" fullWidth onClick={() => { setSent(false); go("signin"); }}>Back to sign in</Button>
            : <Button variant="primary" size="lg" fullWidth onClick={() => { haptic.medium(); setSent(true); }}>Send reset link</Button>}
        </Foot>
      </>
    );
    if (view === "sintro") body = (
      <>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "0 28px", textAlign: "center" }}>
          <div style={{ width: 96, height: 96, borderRadius: 30, background: "linear-gradient(135deg,#fff,var(--aminy-teal-50))", border: "1px solid var(--aminy-teal-100)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-md)" }}>
            <img src="../../assets/aminy_compass.png" alt="" style={{ width: 48, height: 48 }} />
          </div>
          <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 24, lineHeight: 1.15, letterSpacing: "-0.025em", color: "var(--color-text-strong)", margin: 0, textWrap: "balance" }}>Wondering where to start? Start here.</h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--color-text-muted)", margin: 0, maxWidth: 290 }}>A free 2-minute check-in about your child — five gentle questions. Not a diagnosis, just a clearer next step.</p>
        </div>
        <Foot>
          <Button variant="primary" size="lg" fullWidth onClick={() => go("squiz")}>Start the free check-in</Button>
          <button onClick={() => { haptic.light(); window.aminyToast && window.aminyToast("Skipping to setup — you can screen anytime."); }} style={{ border: 0, background: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-ui)", padding: 6 }}>Skip for now</button>
        </Foot>
      </>
    );
    if (view === "squiz") body = (
      <>
        <div style={{ padding: "8px 26px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 6, background: "var(--aminy-navy-100)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${((qi) / QS.length) * 100}%`, height: "100%", background: "var(--aminy-teal-500)", borderRadius: 3, transition: "width .4s var(--ease-lift)" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)" }}>{qi + 1}/{QS.length}</span>
        </div>
        <div key={qi} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px", animation: "aminy-fade-up 350ms var(--ease-lift) both" }}>
          <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 22, lineHeight: 1.3, letterSpacing: "-0.02em", color: "var(--color-text-strong)", margin: "0 0 26px", textWrap: "pretty" }}>{QS[qi]}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {OPTS.map((o) => (
              <button key={o} onClick={() => answer(o)} style={{ height: 54, borderRadius: 14, border: "1.5px solid var(--color-border-strong)", background: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 15.5, color: "var(--color-text-strong)", cursor: "pointer", textAlign: "left", padding: "0 18px", transition: "border-color var(--dur-fast) var(--ease-calm), background var(--dur-fast) var(--ease-calm)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--aminy-teal-500)"; e.currentTarget.style.background = "var(--aminy-teal-50)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.background = "#fff"; }}>{o}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: "0 26px 22px", fontSize: 11.5, color: "var(--color-text-subtle)", textAlign: "center" }}>There are no wrong answers. Answer for how things usually are.</div>
      </>
    );
    if (view === "sresult") body = (
      <>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 28px", textAlign: "center" }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--aminy-teal-600)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-glow-teal)", animation: "aminy-pop 500ms var(--ease-lift) both" }}><AIcon name="check" size={34} style={{ color: "#fff" }} /></div>
          <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 24, lineHeight: 1.18, letterSpacing: "-0.025em", color: "var(--color-text-strong)", margin: 0, maxWidth: 300, textWrap: "balance" }}>Thanks for sharing. Here's what we noticed.</h2>
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 18, padding: "16px 18px", textAlign: "left", boxShadow: "var(--shadow-sm)", animation: "aminy-fade-up 450ms var(--ease-calm) 150ms both" }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--aminy-teal-700)", marginBottom: 7 }}>Your check-in suggests</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--color-text)" }}>A few of your answers are worth a closer look with a professional — especially around responding to name and big reactions to sensory changes. That's exactly what an evaluation is for, and catching it early is a gift.</div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-subtle)", lineHeight: 1.5, maxWidth: 290 }}>This is a screening conversation-starter, not a diagnosis. Only a licensed clinician can evaluate your child.</div>
        </div>
        <Foot>
          <Button variant="primary" size="lg" fullWidth onClick={() => { haptic.success(); window.aminyToast && window.aminyToast("Next: Kai's profile → personalized plan"); }}>Build my child's plan</Button>
          <Button variant="secondary" fullWidth onClick={() => { haptic.light(); window.aminyToast && window.aminyToast("Booking a free evaluation consult…"); }}>Talk to an evaluator</Button>
        </Foot>
      </>
    );

    return <PhoneShell bg="linear-gradient(180deg,#ffffff,var(--aminy-mist) 55%,var(--aminy-mist-deep))">{body}</PhoneShell>;
  }

  function mount() {
    if (!window.PhoneShell || !window.AminyKit) { setTimeout(mount, 60); return; }
    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  }
  mount();
})();
