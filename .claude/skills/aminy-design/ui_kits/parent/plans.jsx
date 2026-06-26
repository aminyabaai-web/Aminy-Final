/* Plans & membership — ported from tier-utils.ts + AIPaywallMessage.tsx.
   Real tiers/pricing: Free $0 · Core $14.99 · Pro $29.99 · Family $49.99.
   14-day Core trial, no card. Marketplace discount 0/10/20/30%. HSA/FSA eligible.
   window.PlansScreen + window.PaywallCard */
(function () {
  const { AIcon } = window;
  const R = React;

  const TIERS = [
    { id: "free", name: "Free", tagline: "Book care + try the AI", mo: 0, yr: 0,
      features: ["Book & attend TeleABA + marketplace visits (pay per session)", "1 child profile", "3 Ask Aminy messages per day", "Exhale basics (breathe, bubbles)", "— no document storage, AI memory, or adaptive plans"] },
    { id: "core", name: "Core", tagline: "Most popular", mo: 14.99, yr: 129, save: 51, rec: true,
      features: ["Everything in Free, plus:", "Unlimited Ask Aminy (text & voice)", "AI reads your IEPs & medical records", "AI memory: 5,000 facts — smarter every day", "Adaptive home practice plans that learn", "10% off every marketplace session", "Up to 2 children · HSA/FSA eligible"] },
    { id: "pro", name: "Pro", tagline: "For serious progress", mo: 29.99, yr: 279, save: 81,
      features: ["Everything in Core, plus:", "AI memory: 15,000 facts", "Up to 3 children", "Clinical progress reports (IEP-ready)", "Provider sharing portal", "20% off marketplace · priority booking"] },
    { id: "family", name: "Family Plan", tagline: "Perfect for families", mo: 49.99, yr: 479, save: 121,
      features: ["Everything in Pro, plus:", "Ask a BCBA included (AI draft + signed review)", "AI memory: unlimited", "Unlimited children", "30% off marketplace sessions", "Care coordinator · 4 caregiver accounts"] },
  ];

  window.PlansScreen = function PlansScreen({ onBack, initial = "core" }) {
    const { Button } = window.AminyKit;
    const [annual, setAnnual] = R.useState(true);
    const [sel, setSel] = R.useState(initial);
    const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
    const chosen = TIERS.find((t) => t.id === sel);

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#fff" }}>
        <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 11, borderBottom: "1px solid var(--color-border)" }}>
          {onBack && <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)", flexShrink: 0 }}><AIcon name="back" size={16} /></button>}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: "var(--color-text-strong)" }}>Plans &amp; membership</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>14-day Core trial · no card required</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 16px" }}>
          {/* Billing toggle */}
          <div style={{ display: "flex", background: "var(--aminy-mist)", borderRadius: 999, padding: 4, marginBottom: 16, position: "relative" }}>
            {[["mo", "Monthly"], ["yr", "Yearly"]].map(([k, label]) => {
              const on = (k === "yr") === annual;
              return <button key={k} onClick={() => setAnnual(k === "yr")} style={{ flex: 1, height: 38, borderRadius: 999, border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, background: on ? "#fff" : "transparent", color: on ? "var(--color-text-strong)" : "var(--color-text-muted)", boxShadow: on ? "var(--shadow-sm)" : "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{label}{k === "yr" && <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--aminy-grow-600)", background: "var(--aminy-grow-50)", padding: "2px 6px", borderRadius: 999 }}>Save</span>}</button>;
            })}
          </div>

          {/* Tier cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {TIERS.map((t) => {
              const on = sel === t.id;
              const price = annual ? t.yr : t.mo;
              return (
                <button key={t.id} onClick={() => { buzz(6); setSel(t.id); }} style={{ textAlign: "left", cursor: "pointer", borderRadius: 18, padding: "15px 16px", background: on ? "linear-gradient(135deg,var(--aminy-teal-50),#fff)" : "#fff", border: `2px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border)"}`, boxShadow: on ? "var(--shadow-md)" : "var(--shadow-sm)", position: "relative", transition: "all var(--dur-fast) var(--ease-calm)" }}>
                  {t.rec && <span style={{ position: "absolute", top: -9, right: 14, background: "var(--aminy-teal-600)", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 999 }}>Most popular</span>}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`, background: on ? "var(--aminy-teal-600)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{on && <AIcon name="check" size={12} style={{ color: "#fff" }} />}</span>
                      <span style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 16, color: "var(--color-text-strong)", letterSpacing: "-0.01em" }}>{t.name}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 19, fontWeight: 700, color: "var(--color-text-strong)", letterSpacing: "-0.02em" }}>{price === 0 ? "Free" : `$${price}`}</span>
                      {price > 0 && <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>/{annual ? "yr" : "mo"}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: t.rec ? "var(--aminy-teal-700)" : "var(--color-text-muted)", fontWeight: t.rec ? 600 : 500, marginLeft: 29, marginBottom: on ? 10 : 0 }}>{t.tagline}{annual && t.save ? ` · save $${t.save}/yr` : ""}</div>
                  {on && (
                    <div style={{ marginLeft: 29, display: "flex", flexDirection: "column", gap: 6 }}>
                      {t.features.map((f, i) => (
                        <div key={i} style={{ display: "flex", gap: 7, fontSize: 12.5, color: f.endsWith("plus:") ? "var(--color-text-strong)" : "var(--color-text)", fontWeight: f.endsWith("plus:") ? 600 : 400, lineHeight: 1.4 }}>
                          {!f.endsWith("plus:") && <AIcon name="check" size={13} style={{ color: "var(--aminy-teal-600)", flexShrink: 0, marginTop: 1 }} />}{f}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 14, fontSize: 11.5, color: "var(--color-text-muted)" }}>
            <AIcon name="shield" size={13} /> HSA/FSA eligible · cancel anytime
          </div>
        </div>

        {/* Sticky CTA */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border)", background: "#fff" }}>
          <Button variant="primary" size="lg" fullWidth onClick={() => buzz(12)}>
            {sel === "free" ? "Continue with Free" : chosen.id === "core" ? "Start 14-day free trial" : `Choose ${chosen.name}`}
          </Button>
          {sel !== "free" && <div style={{ textAlign: "center", fontSize: 11, color: "var(--color-text-subtle)", marginTop: 8 }}>{sel === "core" ? "Free for 14 days, then " : ""}${annual ? chosen.yr : chosen.mo}/{annual ? "yr" : "mo"} · no card to start</div>}
        </div>
      </div>
    );
  };

  // Contextual paywall card (insured softens to coverage-first). For the Ask Aminy chat.
  window.PaywallCard = function PaywallCard({ childName = "Kai", insured = false, onViewPlans, onCheckCoverage, onDismiss }) {
    const { Button } = window.AminyKit;
    if (insured) {
      return (
        <div style={{ background: "linear-gradient(135deg,#eff6ff,#fff)", border: "1px solid #bfdbfe", borderRadius: 18, padding: 16, maxWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#60a5fa,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center" }}><AIcon name="sparkles" size={14} style={{ color: "#fff" }} /></div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a" }}>Aminy</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "2px 7px", borderRadius: 999 }}>Coverage tip</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.5, margin: "0 0 12px" }}>I'd love to go deeper for {childName}. Before you pay out of pocket — your plan may cover therapy and assessments. Worth checking your benefits first.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="primary" style={{ background: "#2563eb", flex: 1 }} onClick={onCheckCoverage}>Check your coverage</Button>
            {onDismiss && <Button size="sm" variant="ghost" onClick={onDismiss}>Not now</Button>}
          </div>
          <button onClick={onViewPlans} style={{ width: "100%", marginTop: 8, background: "none", border: 0, fontSize: 11.5, color: "var(--color-text-muted)", textDecoration: "underline", cursor: "pointer", fontFamily: "var(--font-ui)" }}>Or subscribe to Aminy instead</button>
        </div>
      );
    }
    return (
      <div style={{ background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)", border: "1px solid var(--aminy-teal-100)", borderRadius: 18, padding: 16, maxWidth: 320 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,var(--aminy-teal-500),var(--aminy-teal-700))", display: "flex", alignItems: "center", justifyContent: "center" }}><AIcon name="sparkles" size={14} style={{ color: "#fff" }} /></div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-strong)" }}>Aminy</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--aminy-teal-700)", background: "var(--aminy-teal-50)", padding: "2px 7px", borderRadius: 999 }}>Upgrade</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.5, margin: "0 0 12px" }}>I have deeper insights about {childName} I'd love to share — that level of analysis is in Core. Unlimited chat means I can go much further.</p>
        <div style={{ background: "rgba(255,255,255,0.8)", border: "1px solid var(--aminy-teal-100)", borderRadius: 12, padding: "9px 11px", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--aminy-teal-700)" }}>Core · $14.99/mo</div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 1 }}>Unlimited AI chat with deeper reasoning</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6, fontSize: 11.5, color: "var(--color-text-muted)" }}><AIcon name="check" size={12} style={{ color: "var(--aminy-grow-600)" }} /> 14-day free trial, no card required</div>
          <div style={{ display: "flex", gap: 6, fontSize: 11.5, color: "var(--color-text-muted)" }}><AIcon name="check" size={12} style={{ color: "var(--aminy-grow-600)" }} /> Cancel anytime</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="sm" variant="primary" style={{ flex: 1 }} onClick={onViewPlans}>View plans</Button>
          {onDismiss && <Button size="sm" variant="ghost" onClick={onDismiss}>Not now</Button>}
        </div>
      </div>
    );
  };
})();
