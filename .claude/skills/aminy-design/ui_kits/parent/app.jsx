/* Parent app router. Mounts the phone, switches screens, persists tab. window → #root */
(function () {
  const { AIcon, PhoneShell, BottomNav, HomeScreen, AskScreen, CalmScreen, PlanScreen, Onboarding, BcbaScreen, TeleScreen, PlansScreen, MarketScreen, SessionScreen, SettingsScreen, VaultScreen, CoverageScreen, CommunityScreen, ReportScreen, InsightsScreen, CheckinsScreen, RemindersScreen, ReportsScreen } = window;

  const MORE_ITEMS = [
    { icon: "users", label: "Find your guide", note: "Browse & book BCBAs, SLPs, OTs", tone: "var(--aminy-teal-700)", bg: "var(--aminy-teal-50)" },
    { icon: "video", label: "TeleABA visits", note: "Book a session, see your team", tone: "var(--aminy-teal-700)", bg: "var(--aminy-teal-50)" },
    { icon: "sparkles", label: "Ease", note: "Hand the phone over — it calms with them", tone: "var(--jr-primary)", bg: "var(--jr-purple-50)" },
    { icon: "shield", label: "Message your BCBA", note: "Dr. Morales · usually replies in a day", tone: "var(--aminy-teal-700)", bg: "var(--aminy-teal-50)" },
    { icon: "file", label: "Document vault", note: "Reports, IEPs, assessments", tone: "var(--aminy-navy-700)", bg: "var(--aminy-navy-50)" },
    { icon: "shield", label: "Coverage", note: "Insurance & authorizations", tone: "var(--aminy-navy-700)", bg: "var(--aminy-navy-50)" },
    { icon: "users", label: "Community", note: "Parents who get it", tone: "var(--aminy-grow-600)", bg: "var(--aminy-grow-50)" },
    { icon: "trending", label: "Insights", note: "Kai's progress, patterns & mood", tone: "var(--aminy-teal-700)", bg: "var(--aminy-teal-50)" },
    { icon: "heart", label: "Check-ins", note: "Quick AI chats that tune your support", tone: "var(--aminy-win-600)", bg: "var(--aminy-win-50)" },
    { icon: "file", label: "AI reports", note: "IEP, progress & insurance letters", tone: "var(--aminy-navy-700)", bg: "var(--aminy-navy-50)" },
    { icon: "bell", label: "Reminders", note: "Gentle nudges on your schedule", tone: "var(--aminy-grow-600)", bg: "var(--aminy-grow-50)" },
    { icon: "trending", label: "Weekly report", note: "Kai's gentle progress", tone: "var(--aminy-win-600)", bg: "var(--aminy-win-50)" },
  ];

  function MoreScreen({ onRestart, onNav }) {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "2px 0 14px" }}>
          <div className="aminy-h2" style={{ fontSize: 22 }}>More</div>
          <button onClick={() => onNav && onNav("settings")} aria-label="Settings" style={{ width: 38, height: 38, borderRadius: 11, background: "#fff", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)", boxShadow: "var(--shadow-sm)" }}><AIcon name="settings" size={19} /></button>
        </div>
        {/* Trial / membership banner */}
        <button onClick={() => onNav && onNav("plans")} style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "1px solid var(--aminy-teal-200)", background: "linear-gradient(135deg,var(--aminy-teal-600),var(--aminy-teal-800))", borderRadius: 18, padding: "15px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 13, boxShadow: "var(--shadow-cta)" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name="sparkles" size={20} style={{ color: "#fff" }} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>4 days left in your Core trial</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 1 }}>Keep unlimited AI, IEP reading &amp; more</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--aminy-teal-700)", background: "#fff", padding: "7px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>See plans</span>
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {MORE_ITEMS.map((m, i) => (
            <div key={i} onClick={() => { if (m.label === "Ease") { window.aminyHaptic && window.aminyHaptic.medium(); window.location.href = "../ease/index.html"; return; } const map = { "Find your guide": "market", "TeleABA visits": "tele", "Message your BCBA": "bcba", "Document vault": "vault", "Coverage": "coverage", "Community": "community", "Weekly report": "report", "Insights": "insights", "Check-ins": "checkins", "AI reports": "reports", "Reminders": "reminders" }; if (map[m.label] && onNav) onNav(map[m.label]); }} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: m.bg, color: m.tone }}><AIcon name={m.icon} size={20} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{m.label}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{m.note}</div>
              </div>
              <AIcon name="chevron" size={18} style={{ color: "var(--color-text-subtle)" }} />
            </div>
          ))}
        </div>
        <button onClick={onRestart} style={{ marginTop: 16, width: "100%", padding: "12px", borderRadius: 12, border: "1px dashed var(--color-border-strong)", background: "transparent", color: "var(--color-text-muted)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>↺ Replay onboarding (demo)</button>
      </div>
    );
  }

  function App() {
    const [intro, setIntro] = React.useState(() => localStorage.getItem("aminy-onboarded") !== "1" && localStorage.getItem("aminy-intro-seen") !== "1");
    const [onboarded, setOnboarded] = React.useState(() => localStorage.getItem("aminy-onboarded") === "1");
    const [tab, setTab] = React.useState(() => localStorage.getItem("aminy-parent-tab") || "home");
    const [inSession, setInSession] = React.useState(false);
    React.useEffect(() => { localStorage.setItem("aminy-parent-tab", tab); }, [tab]);

    function finishIntro() {
      localStorage.setItem("aminy-intro-seen", "1");
      setIntro(false);
    }
    const [splashDone, setSplashDone] = React.useState(false);
    React.useEffect(() => {
      if (!intro || splashDone) return;
      const t = setTimeout(() => setSplashDone(true), 2200);
      return () => clearTimeout(t);
    }, [intro, splashDone]);
    function finishOnboarding() {
      localStorage.setItem("aminy-onboarded", "1");
      setTab("home");
      setOnboarded(true);
    }
    function restartOnboarding() {
      localStorage.removeItem("aminy-onboarded");
      localStorage.removeItem("aminy-intro-seen");
      setIntro(true);
      setOnboarded(false);
    }

    const screens = {
      home: <HomeScreen onNav={setTab} onJoin={() => setInSession(true)} />,
      plan: <PlanScreen />,
      aminy: <AskScreen />,
      calm: <CalmScreen />,
      more: <MoreScreen onRestart={restartOnboarding} onNav={setTab} />,
      bcba: <BcbaScreen onBack={() => setTab("more")} />,
      tele: <TeleScreen onBack={() => setTab("more")} onJoin={() => setInSession(true)} />,
      plans: <PlansScreen onBack={() => setTab("more")} />,
      market: <MarketScreen onBack={() => setTab("more")} onBook={() => setTab("tele")} />,
      settings: <SettingsScreen onBack={() => setTab("more")} onNav={setTab} />,
      vault: <VaultScreen onBack={() => setTab("more")} />,
      coverage: <CoverageScreen onBack={() => setTab("more")} />,
      community: <CommunityScreen onBack={() => setTab("more")} />,
      report: <ReportScreen onBack={() => setTab("more")} />,
      insights: <InsightsScreen onBack={() => setTab("more")} />,
      checkins: <CheckinsScreen onBack={() => setTab("more")} />,
      reminders: <RemindersScreen onBack={() => setTab("more")} />,
      reports: <ReportsScreen onBack={() => setTab("more")} />,
    };
    const calmBg = "radial-gradient(circle at 50% 25%, #cffafe 0%, var(--aminy-mist) 50%, var(--aminy-mist-deep) 100%)";
    const appBg = "linear-gradient(180deg,var(--aminy-mist),var(--aminy-mist-deep))";

    if (intro && window.WhyAminy) {
      if (!splashDone) {
        return (
          <PhoneShell bg="#fff">
            <div onClick={() => setSplashDone(true)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, cursor: "pointer" }}>
              <img src="../../assets/aminy_logo.png" alt="aminy" style={{ width: 200, height: "auto", animation: "aminy-pop 700ms var(--ease-lift) both" }} />
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--aminy-navy-500)", animation: "aminy-fade-up 600ms var(--ease-calm) 500ms both" }}>Gentle guidance · Meaningful progress</div>
              <div style={{ position: "absolute", bottom: 56, display: "flex", gap: 5 }}>
                {[0, 1, 2].map((d) => <span key={d} style={{ width: 6, height: 6, borderRadius: 999, background: "var(--aminy-teal-400)", animation: `aminy-think 1.1s ease-in-out ${d * 0.18}s infinite` }} />)}
              </div>
            </div>
          </PhoneShell>
        );
      }
      return (
        <PhoneShell bg={appBg}>
          <window.WhyAminy onStart={finishIntro} />
        </PhoneShell>
      );
    }

    if (!onboarded) {
      return (
        <PhoneShell bg={appBg}>
          <Onboarding onDone={finishOnboarding} />
        </PhoneShell>
      );
    }

    return (
      <PhoneShell bg={tab === "calm" ? calmBg : appBg}>
        {inSession && <SessionScreen onExit={() => { setInSession(false); setTab("home"); }} />}
        <div key={tab} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", animation: "aminyScreenIn var(--dur-base) var(--ease-calm)" }}>
          {screens[tab]}
        </div>
        <BottomNav active={tab} onNav={setTab} />
        <style>{`@keyframes aminyScreenIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      </PhoneShell>
    );
    // (bcba is reachable from More; bottom nav stays for quick return)
  }

  function mount() {
    const DS = window.DesignSystem_39fb2b;
    if (!DS || !DS.Button) { setTimeout(mount, 60); return; }
    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  }
  mount();
})();
