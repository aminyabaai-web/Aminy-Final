/* Find Your Guide — provider marketplace. Ported from ProviderMarketplace.tsx.
   Your designated guide pinned up top (Book again = cash-pay same provider),
   category filter, verified provider cards, profile + session pricing, member discount.
   Real session prices from the source. window.MarketScreen */
(function () {
  const { AIcon } = window;
  const R = React;

  const TYPE = {
    bcba: { icon: "cap", title: "Board Certified Behavior Analyst", tint: "var(--aminy-teal-50)", fg: "var(--aminy-teal-700)" },
    rbt:  { icon: "users", title: "Registered Behavior Technician", tint: "var(--aminy-teal-50)", fg: "var(--aminy-teal-700)" },
    slp:  { icon: "msgsq", title: "Speech-Language Pathologist", tint: "var(--aminy-care-50)", fg: "var(--aminy-care-600)" },
    ot:   { icon: "hand", title: "Occupational Therapist", tint: "#fff7ed", fg: "#c2410c" },
  };

  const PROVIDERS = [
    { id: "morales", name: "Ana Morales", cred: "BCBA-D", type: "bcba", rating: 4.9, reviews: 214, years: 12, rate: 149, designated: true,
      specialties: ["Early Intervention", "Parent Training", "Transitions"], insurance: ["AHCCCS", "BCBS", "Self-Pay"], langs: ["English", "Spanish"], next: "Tomorrow",
      bio: "Kai's BCBA. Warm, structured, deeply practical — she builds plans families can actually run at home.", verified: true },
    { id: "chen", name: "David Chen", cred: "BCBA", type: "bcba", rating: 4.8, reviews: 156, years: 8, rate: 139, designated: false,
      specialties: ["Feeding", "Daily Routines", "Sleep"], insurance: ["Aetna", "Cigna", "Self-Pay"], langs: ["English", "Mandarin"], next: "Thu", bio: "Specializes in mealtime and bedtime battles. Calm, data-driven, and very responsive between sessions.", verified: true },
    { id: "okafor", name: "Grace Okafor", cred: "M.S., CCC-SLP", type: "slp", rating: 5.0, reviews: 98, years: 10, rate: 139, designated: false,
      specialties: ["AAC", "Social Communication", "Speech Delay"], insurance: ["BCBS", "UnitedHealthcare", "Self-Pay"], langs: ["English"], next: "Fri", bio: "AAC and early-language specialist who makes communication playful and pressure-free.", verified: true },
    { id: "patel", name: "Riya Patel", cred: "OTR/L", type: "ot", rating: 4.9, reviews: 132, years: 9, rate: 139, designated: false,
      specialties: ["Sensory Processing", "Fine Motor", "Self-Care"], insurance: ["AHCCCS", "Aetna", "Self-Pay"], langs: ["English", "Hindi"], next: "Today", bio: "Sensory and motor-skills OT. Turns regulation work into games kids ask to do again.", verified: true },
  ];

  const SESSIONS = [
    { group: "Behavioral", color: "var(--aminy-teal-700)", bg: "var(--aminy-teal-50)", items: [
      ["ABA Specialist Consultation", "Up to 60 min with a BCBA", 149],
      ["ABA Assessment", "Up to 90 min comprehensive review", 269],
      ["ABA Coaching Session", "Up to 30 min skill-building", 49],
    ]},
    { group: "Therapy & Wellness", color: "var(--aminy-care-600)", bg: "var(--aminy-care-50)", items: [
      ["Family Therapy", "Up to 45 min, licensed therapist", 129],
      ["Speech Therapy", "Up to 45 min communication support", 139],
      ["Occupational Therapy", "Up to 45 min sensory & motor", 139],
    ]},
    { group: "Diagnostic Evaluations", color: "#c2410c", bg: "#fff7ed", note: "Skip the 12-month waitlist. Answers in days.", items: [
      ["ADHD Evaluation", "Up to 60 min", 299],
      ["Autism Evaluation", "Up to 90 min", 799],
      ["Combined Evaluation", "Up to 120 min", 999],
    ]},
  ];

  const CATS = [["all", "All"], ["bcba", "Behavioral"], ["therapy", "Therapy"], ["eval", "Evaluations"]];
  const MEMBER_DISCOUNT = 10; // Core tier

  function Stars({ r }) {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><AIcon name="star" size={13} style={{ color: "var(--aminy-win-500)" }} /><b style={{ fontSize: 12.5, color: "var(--color-text-strong)" }}>{r}</b></span>;
  }

  function ProviderCard({ p, onOpen }) {
    const t = TYPE[p.type];
    return (
      <button onClick={() => onOpen(p)} style={{ textAlign: "left", width: "100%", cursor: "pointer", background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 14, boxShadow: "var(--shadow-sm)", display: "flex", gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: t.tint, color: t.fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name={t.icon} size={24} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}, {p.cred}</span>
              {p.verified && <AIcon name="shield" size={13} style={{ color: "var(--aminy-teal-600)", flexShrink: 0 }} />}
            </div>
            <Stars r={p.rating} />
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>{t.title}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
            {p.specialties.slice(0, 3).map((s) => <span key={s} style={{ fontSize: 10.5, fontWeight: 600, color: "var(--color-text-muted)", border: "1px solid var(--color-border)", borderRadius: 999, padding: "2px 8px" }}>{s}</span>)}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--aminy-grow-600)", fontWeight: 600 }}><AIcon name="calendar" size={13} /> Next: {p.next}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--aminy-teal-700)", background: "var(--aminy-teal-50)", padding: "3px 9px", borderRadius: 999 }}>From ${p.rate}</span>
          </div>
        </div>
      </button>
    );
  }

  function Detail({ p, onBack, onBook }) {
    const t = TYPE[p.type];
    const discounted = Math.round(p.rate * (1 - MEMBER_DISCOUNT / 100));
    return (
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", background: "#fff" }}>
        <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 11, borderBottom: "1px solid var(--color-border)" }}>
          <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)" }}><AIcon name="back" size={16} /></button>
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 16, color: "var(--color-text-strong)", letterSpacing: "-0.01em" }}>Provider profile</span>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 66, height: 66, borderRadius: 18, background: t.tint, color: t.fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AIcon name={t.icon} size={30} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-strong)", letterSpacing: "-0.01em" }}>{p.name}, {p.cred}</span>{p.verified && <AIcon name="shield" size={15} style={{ color: "var(--aminy-teal-600)" }} />}</div>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>{t.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}><Stars r={p.rating} /><span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{p.reviews} reviews · {p.years}y exp</span></div>
            </div>
          </div>
          {p.designated && <div style={{ display: "inline-flex", alignItems: "center", gap: 7, alignSelf: "flex-start", background: "var(--aminy-teal-50)", border: "1px solid var(--aminy-teal-100)", color: "var(--aminy-teal-800)", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}><AIcon name="heart" size={13} /> Your designated guide</div>}
          <p style={{ fontSize: 14, color: "var(--color-text)", lineHeight: 1.55, margin: 0 }}>{p.bio}</p>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>Specialties</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{p.specialties.map((s) => <span key={s} style={{ fontSize: 12, fontWeight: 600, color: "var(--aminy-teal-700)", background: "var(--aminy-teal-50)", borderRadius: 999, padding: "5px 11px" }}>{s}</span>)}</div>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 5 }}>Languages</div><div style={{ fontSize: 13, color: "var(--color-text)" }}>{p.langs.join(", ")}</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 5 }}>Insurance</div><div style={{ fontSize: 13, color: "var(--color-text)" }}>{p.insurance.join(" · ")}</div></div>
          </div>
          {/* Cash-pay with member discount */}
          <div style={{ background: "var(--aminy-mist)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)" }}>60-min session</span>
              <span><span style={{ fontSize: 13, color: "var(--color-text-subtle)", textDecoration: "line-through", marginRight: 6 }}>${p.rate}</span><span style={{ fontSize: 19, fontWeight: 700, color: "var(--aminy-teal-700)" }}>${discounted}</span></span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--aminy-teal-700)", marginTop: 4 }}>Core member price · {MEMBER_DISCOUNT}% off · HSA/FSA eligible</div>
          </div>
        </div>
        <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid var(--color-border)", display: "flex", gap: 10 }}>
          <button onClick={onBack} style={{ width: 48, flexShrink: 0, borderRadius: 12, border: "1px solid var(--color-border-strong)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--aminy-teal-700)" }}><AIcon name="msgsq" size={18} /></button>
          <button onClick={onBook} style={{ flex: 1, height: 50, borderRadius: 12, border: 0, cursor: "pointer", background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 16, boxShadow: "var(--shadow-cta)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><AIcon name="calendar" size={18} /> Book with {p.name.split(" ")[0]}</button>
        </div>
      </div>
    );
  }

  window.MarketScreen = function MarketScreen({ onBack, onBook }) {
    const [cat, setCat] = R.useState("all");
    const [active, setActive] = R.useState(null);
    const designated = PROVIDERS.find((p) => p.designated);
    const filtered = PROVIDERS.filter((p) => cat === "all" ? true : cat === "bcba" ? (p.type === "bcba" || p.type === "rbt") : cat === "therapy" ? (p.type === "slp" || p.type === "ot") : false);

    if (active) return <Detail p={active} onBack={() => setActive(null)} onBook={() => onBook && onBook(active)} />;

    return (
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", background: "var(--aminy-mist)" }}>
        <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 11, borderBottom: "1px solid var(--color-border)", background: "#fff" }}>
          {onBack && <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)" }}><AIcon name="back" size={16} /></button>}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: "var(--color-text-strong)" }}>Find your guide</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>Verified providers for Kai's journey</div>
          </div>
        </div>

        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Designated guide — pinned, with Book again (cash-pay same provider) */}
          {designated && (
            <div style={{ background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)", border: "1px solid var(--aminy-teal-200)", borderRadius: 18, padding: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--aminy-teal-700)", marginBottom: 10 }}>Your guide</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "#fff", color: "var(--aminy-teal-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--aminy-teal-100)" }}><AIcon name="cap" size={22} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text-strong)" }}>{designated.name}, {designated.cred}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Kai's BCBA · <Stars r={designated.rating} /> {designated.reviews}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => onBook && onBook(designated)} style={{ flex: 1, height: 42, borderRadius: 11, border: 0, cursor: "pointer", background: "var(--aminy-teal-600)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 13.5, boxShadow: "var(--shadow-cta)" }}>Book again</button>
                <button onClick={() => setActive(designated)} style={{ flex: 1, height: 42, borderRadius: 11, border: "1px solid var(--color-border-strong)", cursor: "pointer", background: "#fff", color: "var(--color-text)", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 13.5 }}>View profile</button>
              </div>
            </div>
          )}

          {/* Live & upcoming open sessions — providers advertise free Q&As families can drop into */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-strong)" }}>Live &amp; upcoming</div>
              <span style={{ fontSize: 12, color: "var(--aminy-teal-700)", fontWeight: 600 }}>Free to join</span>
            </div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {[
                { live: true, host: "Dr. Ana Morales", cred: "BCBA-D", topic: "Morning meltdowns: a live Q&A", watching: 38 },
                { live: false, host: "Grace Okafor", cred: "CCC-SLP", topic: "First words & AAC basics", when: "Today 7:00 PM" },
                { live: false, host: "Riya Patel", cred: "OTR/L", topic: "Calming a sensory-overload moment", when: "Thu 12:00 PM" },
              ].map((s, i) => (
                <div key={i} style={{ flexShrink: 0, width: 230, background: "#fff", border: `1px solid ${s.live ? "var(--aminy-teal-300)" : "var(--color-border)"}`, borderRadius: 16, padding: 13, boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    {s.live
                      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", color: "#fff", background: "var(--aminy-alert-600)", padding: "3px 8px", borderRadius: 999 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: "#fff", animation: "lvpulse 1.2s ease-in-out infinite" }} />LIVE</span>
                      : <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "var(--aminy-teal-700)", background: "var(--aminy-teal-50)", padding: "3px 8px", borderRadius: 999 }}>{s.when}</span>}
                    {s.live && <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{s.watching} watching</span>}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-strong)", lineHeight: 1.3, marginBottom: 6, minHeight: 35 }}>{s.topic}</div>
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginBottom: 10 }}>{s.host}, {s.cred}</div>
                  <button onClick={() => { window.aminyHaptic && window.aminyHaptic.medium(); window.aminyToast && window.aminyToast(s.live ? "Joining " + s.host + "'s live session…" : "Reminder set — we'll ping you"); }} style={{ width: "100%", height: 38, borderRadius: 11, border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 13, background: s.live ? "var(--aminy-teal-600)" : "#fff", color: s.live ? "#fff" : "var(--aminy-teal-700)", boxShadow: s.live ? "var(--shadow-cta)" : "inset 0 0 0 1px var(--aminy-teal-200)" }}>{s.live ? "Join now" : "Remind me"}</button>
                </div>
              ))}
            </div>
            <style>{`@keyframes lvpulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          </div>

          {/* Category filter */}
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
            {CATS.map(([id, label]) => {
              const on = cat === id;
              return <button key={id} onClick={() => setCat(id)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, cursor: "pointer", border: `1px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`, background: on ? "var(--aminy-teal-600)" : "#fff", color: on ? "#fff" : "var(--color-text)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600 }}>{label}</button>;
            })}
          </div>

          {/* Provider list or evaluations menu */}
          {cat === "eval" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SESSIONS.find((s) => s.group === "Diagnostic Evaluations").items.map(([name, desc, price]) => (
                <div key={name} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 14, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div><div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-strong)" }}>{name}</div><div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>{desc}</div></div>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#c2410c" }}>${price}</span>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", padding: "2px 10px", lineHeight: 1.5 }}>Skip the 12-month waitlist — verified evaluators, answers in days.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((p) => <ProviderCard key={p.id} p={p} onOpen={setActive} />)}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", fontSize: 11.5, color: "var(--color-text-muted)", padding: "4px 10px", textAlign: "center", lineHeight: 1.5 }}>
            <AIcon name="shield" size={13} /> Every session includes a video visit, written summary &amp; follow-up.
          </div>
        </div>
      </div>
    );
  };
})();
