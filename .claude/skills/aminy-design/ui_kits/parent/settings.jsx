/* Settings hub + AI Memory transparency. Memory viewer ported from AIContextViewer.tsx
   ("What Aminy Knows" — child, goals, vault, plan, conversation memory, Ease).
   Account · AI memory · Notifications · Privacy · Help · Legal · Sign out. window.SettingsScreen */
(function () {
  const { AIcon } = window;
  const R = React;

  // What Aminy's AI knows — sections with counts (memory transparency)
  const MEMORY = [
    { id: "child", icon: "eye", title: "Child profile", count: 6, rows: [["Name", "Kai"], ["Age", "7 years"], ["Concerns", "Mornings · Transitions · Big feelings"], ["Strengths", "Visual learner · Loves routine"], ["Communication", "Verbal, short phrases"]] },
    { id: "goals", icon: "heart", title: "Current goals", count: 3, rows: [["Morning transitions", "70%"], ["Independent tooth-brushing", "Met"], ["Naming big feelings", "40%"]] },
    { id: "vault", icon: "doc", title: "Vault documents", count: 4, rows: [["Evaluations", "1"], ["IEPs", "1"], ["Progress reports", "1"], ["BCBA notes", "1"]] },
    { id: "memory", icon: "msgsq", title: "Conversation memory", count: 5000, rows: [["Facts remembered", "5,000 (Core)"], ["Successful strategies", "12"], ["Recent concern", "\"Teeth-brushing meltdowns\""]] },
    { id: "ease", icon: "sparkles", title: "Ease activity", count: 8, rows: [["Sessions", "8"], ["Skills practiced", "Calm breathing · Naming feelings"]] },
  ];

  function MemoryView({ onBack }) {
    const [open, setOpen] = R.useState("child");
    return (
      <div style={{ flex: 1, overflowY: "auto", background: "var(--aminy-mist)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 11, borderBottom: "1px solid var(--color-border)", background: "#fff" }}>
          <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)" }}><AIcon name="back" size={16} /></button>
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 16, color: "var(--color-text-strong)", letterSpacing: "-0.01em" }}>What Aminy knows</span>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)", border: "1px solid var(--aminy-teal-100)", borderRadius: 16, padding: 14, display: "flex", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--aminy-teal-100)", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name="brain" size={19} /></div>
            <div><div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-strong)" }}>The context Aminy uses for Kai</div><div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 2, lineHeight: 1.45 }}>Everything here shapes the advice you get. You're always in control of it.</div></div>
          </div>
          {MEMORY.map((s) => {
            const on = open === s.id;
            return (
              <div key={s.id} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
                <button onClick={() => setOpen(on ? null : s.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: "none", border: 0, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aminy-teal-50)", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name={s.icon} size={17} /></div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{s.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", background: "var(--aminy-mist)", borderRadius: 999, padding: "2px 9px" }}>{s.count >= 1000 ? (s.count / 1000) + "k" : s.count}</span>
                  <AIcon name="chevron" size={16} style={{ color: "var(--color-text-subtle)", transform: on ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
                </button>
                {on && (
                  <div style={{ padding: "0 14px 12px", borderTop: "1px solid var(--color-border)" }}>
                    {s.rows.map(([k, v], i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: i < s.rows.length - 1 ? "1px solid var(--color-border)" : "0", fontSize: 13 }}>
                        <span style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>{k}</span>
                        <span style={{ fontWeight: 600, color: "var(--color-text-strong)", textAlign: "right" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={() => window.aminyToast("Preparing your data export… we'll email a secure link.")} style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid var(--color-border-strong)", background: "#fff", cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 13.5, color: "var(--color-text)" }}>Export my data</button>
            <button onClick={() => window.aminyToast("This would clear Aminy's memory of Kai.")} style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid #fecaca", background: "#fff", cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 13.5, color: "var(--aminy-alert-600)" }}>Clear memory</button>
          </div>
          <div style={{ display: "flex", gap: 9, background: "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-100)", borderRadius: 12, padding: 12, marginTop: 4 }}>
            <AIcon name="lock" size={15} style={{ color: "var(--aminy-teal-700)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: "var(--aminy-teal-800)", lineHeight: 1.5 }}>Encrypted &amp; stored securely. Used only to personalize Kai's care — never sold or shared with third parties.</div>
          </div>
        </div>
      </div>
    );
  }

  const GROUPS = [
    { label: "Account", items: [
      { id: "profile", icon: "users", title: "Profile & children", note: "Sarah · Kai (7)" },
      { id: "plan", icon: "sparkles", title: "Plan & billing", note: "Core trial · 4 days left", to: "plans" },
      { id: "caregivers", icon: "heart", title: "Caregivers", note: "Invite Alex & others" },
    ]},
    { label: "Aminy AI", items: [
      { id: "memory", icon: "brain", title: "What Aminy knows", note: "Review & manage AI memory", mem: true },
      { id: "notifications", icon: "bell", title: "Notifications", note: "Gentle reminders & milestones" },
    ]},
    { label: "Privacy & support", items: [
      { id: "privacy", icon: "lock", title: "Privacy & data", note: "HIPAA, export, delete account" },
      { id: "help", icon: "help", title: "Help & contact", note: "We usually reply same day" },
      { id: "legal", icon: "doc", title: "Terms & policies", note: "Terms of Service · Privacy Policy" },
    ]},
  ];

  window.SettingsScreen = function SettingsScreen({ onBack, onNav }) {
    const [view, setView] = R.useState("hub");
    if (view === "memory") return <MemoryView onBack={() => setView("hub")} />;

    return (
      <div style={{ flex: 1, overflowY: "auto", background: "var(--aminy-mist)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 11, borderBottom: "1px solid var(--color-border)", background: "#fff" }}>
          {onBack && <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)" }}><AIcon name="back" size={16} /></button>}
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 17, color: "var(--color-text-strong)", letterSpacing: "-0.02em" }}>Settings</span>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Profile header */}
          <div style={{ display: "flex", alignItems: "center", gap: 13, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 14, cursor: "pointer" }} onClick={() => window.aminyToast("Edit profile — coming up")}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,var(--aminy-teal-400),var(--aminy-teal-700))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, fontFamily: "var(--font-ui)" }}>S</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-strong)" }}>Sarah Chen</div>
              <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>sarah@email.com · Core trial</div>
            </div>
            <AIcon name="chevron" size={18} style={{ color: "var(--color-text-subtle)" }} />
          </div>

          {GROUPS.map((g) => (
            <div key={g.label}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", margin: "0 4px 8px" }}>{g.label}</div>
              <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, overflow: "hidden" }}>
                {g.items.map((it, i) => (
                  <button key={it.id} onClick={() => { if (it.mem) setView("memory"); else if (it.to && onNav) onNav(it.to); else window.aminyToast(it.title + " — coming up"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "13px 15px", background: "none", border: 0, borderBottom: i < g.items.length - 1 ? "1px solid var(--color-border)" : "0", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aminy-mist)", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name={it.icon} size={17} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{it.title}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.note}</div>
                    </div>
                    <AIcon name="chevron" size={16} style={{ color: "var(--color-text-subtle)" }} />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button onClick={() => window.aminyToast("Signed out (demo)")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 14, border: "1px solid var(--color-border-strong)", background: "#fff", cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14.5, color: "var(--color-text)" }}><AIcon name="logout" size={17} /> Sign out</button>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--color-text-subtle)", paddingBottom: 6 }}>Aminy v3.2.0 · Made with care for ABA families</div>
        </div>
      </div>
    );
  };
})();
