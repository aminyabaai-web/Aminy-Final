/* More destinations — Vault · Coverage · Community · Weekly report.
   Structure sourced from the real codebase: Vault categories (Evaluations/IEPs/
   Progress Reports/BCBA Notes) + AI document analysis; Coverage = insured "check
   your benefits" model; Community read/participate; caregiver weekly report.
   window.VaultScreen / CoverageScreen / CommunityScreen / ReportScreen */
(function () {
  const { AIcon } = window;
  const R = React;

  function Header({ title, sub, onBack }) {
    return (
      <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 11, borderBottom: "1px solid var(--color-border)", background: "#fff" }}>
        {onBack && <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)", flexShrink: 0 }}><AIcon name="back" size={16} /></button>}
        <div><div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: "var(--color-text-strong)" }}>{title}</div>{sub && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>{sub}</div>}</div>
      </div>
    );
  }

  // ---------- VAULT ----------
  const VAULT = [
    { cat: "Evaluations", icon: "doc", tint: "var(--aminy-care-50)", fg: "var(--aminy-care-600)", files: [["Autism Diagnostic Eval", "Dr. Reyes · Mar 2026", true]] },
    { cat: "IEPs", icon: "doc", tint: "var(--aminy-teal-50)", fg: "var(--aminy-teal-700)", files: [["IEP 2025–2026", "Lincoln Elementary · Sep 2025", true]] },
    { cat: "Progress reports", icon: "trending", tint: "var(--aminy-grow-50)", fg: "var(--aminy-grow-600)", files: [["Q1 ABA Progress", "Rise Pediatric Therapies · Apr 2026", false]] },
    { cat: "BCBA notes", icon: "shield", tint: "var(--aminy-win-50)", fg: "var(--aminy-win-600)", files: [["Session notes · May", "Dr. Morales · 6 notes", false]] },
  ];
  window.VaultScreen = function VaultScreen({ onBack }) {
    return (
      <div style={{ flex: 1, overflowY: "auto", background: "var(--aminy-mist)", display: "flex", flexDirection: "column" }}>
        <Header title="Document vault" sub="Reports, IEPs & assessments — all in one place" onBack={onBack} />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)", border: "1px solid var(--aminy-teal-100)", borderRadius: 16, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--aminy-teal-100)", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name="sparkles" size={19} /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-strong)" }}>Aminy reads your documents</div><div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>Upload an IEP or eval — Aminy pulls out goals automatically.</div></div>
          </div>
          {VAULT.map((g) => (
            <div key={g.cat}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "2px 4px 8px" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text-strong)" }}>{g.cat}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{g.files.length}</span>
              </div>
              {g.files.map(([name, meta, analyzed], i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: g.tint, color: g.fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name={g.icon} size={18} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)" }}>{name}</div><div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>{meta}</div></div>
                  {analyzed ? <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--aminy-teal-700)", background: "var(--aminy-teal-50)", borderRadius: 999, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}><AIcon name="sparkles" size={11} /> Analyzed</span> : <AIcon name="chevron" size={16} style={{ color: "var(--color-text-subtle)" }} />}
                </div>
              ))}
            </div>
          ))}
          <button onClick={() => window.aminyToast("Choose a document to upload…")} style={{ height: 48, borderRadius: 14, border: "1.5px dashed var(--aminy-teal-300)", background: "var(--aminy-teal-50)", color: "var(--aminy-teal-700)", cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><AIcon name="plus" size={18} /> Upload a document</button>
        </div>
      </div>
    );
  };

  // ---------- COVERAGE ----------
  window.CoverageScreen = function CoverageScreen({ onBack }) {
    const { Button } = window.AminyKit;
    const [checked, setChecked] = R.useState(false);
    return (
      <div style={{ flex: 1, overflowY: "auto", background: "var(--aminy-mist)", display: "flex", flexDirection: "column" }}>
        <Header title="Coverage" sub="Insurance & authorizations" onBack={onBack} />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 10 }}>Your plan</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name="shield" size={21} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-strong)" }}>Blue Cross Blue Shield AZ</div><div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Member #XJK••••218 · PPO</div></div>
            </div>
          </div>
          {!checked ? (
            <div style={{ background: "linear-gradient(135deg,#eff6ff,#fff)", border: "1px solid #bfdbfe", borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-strong)", marginBottom: 6 }}>Check what's covered for Kai</div>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.55, margin: "0 0 14px" }}>Your plan may cover ABA, therapy, and assessments. Coverage varies — we'll help you find out. No guarantees, just clarity.</p>
              <Button variant="primary" fullWidth style={{ background: "#2563eb" }} onClick={() => setChecked(true)} icon={<AIcon name="shield" size={16} />}>Check my benefits</Button>
              <div style={{ textAlign: "center", fontSize: 11, color: "var(--color-text-subtle)", marginTop: 9 }}>Checking is free · takes about 30 seconds</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["ABA therapy", "Likely covered", "var(--aminy-grow-600)", "var(--aminy-grow-50)", "Prior auth required · we can help"], ["Autism evaluation", "Likely covered", "var(--aminy-grow-600)", "var(--aminy-grow-50)", "In-network evaluators available"], ["Speech & OT", "Check deductible", "var(--aminy-win-600)", "var(--aminy-win-50)", "$500 remaining on deductible"]].map(([svc, status, fg, bg, note], i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{svc}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: fg, background: bg, borderRadius: 999, padding: "3px 9px" }}>{status}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>{note}</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 9, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 12 }}>
                <AIcon name="sparkles" size={15} style={{ color: "var(--aminy-teal-700)", flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: "var(--color-text)", lineHeight: 1.5 }}>This is an estimate from your plan details — not a guarantee. Aminy can help you file for prior authorization.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------- COMMUNITY ----------
  const POSTS = [
    { who: "Maya R.", tag: "Mornings", time: "2h", body: "The 'first-then' board Aminy suggested actually worked this week. Three calm school drop-offs in a row 😭 Anyone else?", likes: 34, replies: 12 },
    { who: "James T.", tag: "Newly diagnosed", time: "5h", body: "Just got our 4yo's autism diagnosis. Feeling a lot of things. This group has already helped me feel less alone.", likes: 88, replies: 41 },
    { who: "Dr. Morales", tag: "BCBA · Verified", time: "1d", body: "Reminder for the weekend: progress isn't linear. A hard day doesn't erase a good week. Be gentle with yourselves. 💛", likes: 156, replies: 23, verified: true },
  ];
  window.CommunityScreen = function CommunityScreen({ onBack }) {
    const [liked, setLiked] = R.useState({});
    return (
      <div style={{ flex: 1, overflowY: "auto", background: "var(--aminy-mist)", display: "flex", flexDirection: "column" }}>
        <Header title="Community" sub="Parents who get it" onBack={onBack} />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
            {["All", "Mornings", "Sleep", "Newly diagnosed", "IEP & school", "Wins"].map((c, i) => (
              <span key={c} style={{ flexShrink: 0, padding: "7px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-ui)", background: i === 0 ? "var(--aminy-teal-600)" : "#fff", color: i === 0 ? "#fff" : "var(--color-text-muted)", border: i === 0 ? "0" : "1px solid var(--color-border-strong)" }}>{c}</span>
            ))}
          </div>
          {POSTS.map((p, i) => {
            const on = liked[i];
            const initials = p.who.split(" ").map((w) => w[0]).join("").slice(0, 2);
            return (
              <div key={i} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 14, boxShadow: "var(--shadow-sm)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.verified ? "linear-gradient(135deg,var(--aminy-teal-400),var(--aminy-teal-700))" : "linear-gradient(135deg,#fbcfe8,#f472b6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, fontFamily: "var(--font-ui)" }}>{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-strong)" }}>{p.who}</span>{p.verified && <AIcon name="shield" size={12} style={{ color: "var(--aminy-teal-600)" }} />}</div>
                    <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}><span style={{ color: "var(--aminy-teal-700)", fontWeight: 600 }}>{p.tag}</span> · {p.time}</div>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: "var(--color-text)", lineHeight: 1.55, margin: "0 0 12px" }}>{p.body}</p>
                <div style={{ display: "flex", gap: 18 }}>
                  <button onClick={() => setLiked((l) => ({ ...l, [i]: !l[i] }))} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: on ? "var(--aminy-care-600)" : "var(--color-text-muted)" }}><AIcon name="heart" size={15} /> {p.likes + (on ? 1 : 0)}</button>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--color-text-muted)" }}><AIcon name="msgsq" size={15} /> {p.replies}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---------- WEEKLY REPORT ----------
  window.ReportScreen = function ReportScreen({ onBack }) {
    const { Button, Stat } = window.AminyKit;
    return (
      <div style={{ flex: 1, overflowY: "auto", background: "var(--aminy-mist)", display: "flex", flexDirection: "column" }}>
        <Header title="Weekly report" sub="Kai's gentle progress · this week" onBack={onBack} />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "linear-gradient(135deg,var(--aminy-win-50),#fff)", border: "1px solid var(--aminy-win-100)", borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 24 }}>🌱</div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 19, color: "var(--color-text-strong)", lineHeight: 1.25, letterSpacing: "-0.01em", margin: "8px 0 0", WebkitFontSmoothing: "antialiased" }}>Kai had more calm mornings this week than last. That's real progress.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9 }}>
            <Stat label="Routine days" value="5" unit="/7" caption="+2 vs last week" accent />
            <Stat label="Calm streak" value="3" unit="days" caption="Longest yet" />
            <Stat label="Goals progressing" value="2" unit="/3" caption="On track" />
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-strong)", marginBottom: 10 }}>What went well</div>
            {["Independent tooth-brushing 5 of 7 days", "Named \"frustrated\" twice without prompting", "Calmer transitions to school"].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 9, fontSize: 13, color: "var(--color-text)", lineHeight: 1.4, marginBottom: i < 2 ? 8 : 0 }}><AIcon name="check" size={15} style={{ color: "var(--aminy-grow-600)", flexShrink: 0, marginTop: 1 }} />{t}</div>
            ))}
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--aminy-teal-50)", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name="send" size={17} /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)" }}>Auto-send weekly</div><div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>To Alex &amp; Dr. Morales · every Sunday</div></div>
            <div style={{ width: 44, height: 26, borderRadius: 999, background: "var(--aminy-teal-600)", position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff" }} /></div>
          </div>
          <Button variant="secondary" fullWidth icon={<AIcon name="doc" size={16} />} onClick={() => window.aminyToast("Generating PDF… we'll save it to your vault.")}>Export as PDF</Button>
        </div>
      </div>
    );
  };
})();
