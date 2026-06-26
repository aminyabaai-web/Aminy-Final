/* TeleABA — telehealth booking. Ported from AvailabilityPicker.tsx (One Medical/Calendly style).
   Date pills with slot counts → Morning/Afternoon/Evening slots → confirm → booked. window.TeleScreen */
(function () {
  const { AIcon } = window;
  const R = React;

  const ALL = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "17:00", "17:30", "18:00"];
  const fmt = (t) => { const [h, m] = t.split(":").map(Number); const p = h >= 12 ? "PM" : "AM"; return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${p}`; };
  const tod = (t) => { const h = +t.split(":")[0]; return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"; };

  // Build 10 days of pseudo-random-but-stable availability
  const DAYS = (() => {
    const out = []; const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 10; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const slots = ALL.map((t, idx) => ({ t, available: !weekend && ((i * 7 + idx * 3) % 5 < 2) }));
      out.push({ date: d, slots });
    }
    return out;
  })();

  const dow = (d) => d.toLocaleDateString("en-US", { weekday: "short" });
  const isToday = (d) => d.toDateString() === new Date().toDateString();
  const isTmrw = (d) => { const t = new Date(); t.setDate(t.getDate() + 1); return d.toDateString() === t.toDateString(); };
  const longDate = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const PERIODS = [["morning", "Morning", "sun"], ["afternoon", "Afternoon", "sunset"], ["evening", "Evening", "moon"]];
  const fmtShort = (t) => { const [h, m] = t.split(":").map(Number); const p = h >= 12 ? "pm" : "am"; return `${h % 12 || 12}:${String(m).padStart(2, "0")}\u00A0${p}`; };

  window.TeleScreen = function TeleScreen({ onBack, onJoin }) {
    const { Button, Avatar } = window.AminyKit;
    const firstAvail = DAYS.findIndex((d) => d.slots.some((s) => s.available));
    const [dayIdx, setDayIdx] = R.useState(firstAvail < 0 ? 0 : firstAvail);
    const [sel, setSel] = R.useState(null);
    const [booked, setBooked] = R.useState(false);
    const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
    const day = DAYS[dayIdx];

    if (booked) {
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Header onBack={onBack} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16, padding: "0 30px" }}>
            <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--aminy-teal-600)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-glow-teal)" }}><AIcon name="check" size={36} style={{ color: "#fff" }} /></div>
            <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 22, color: "var(--color-text-strong)", margin: 0, letterSpacing: "-0.01em", WebkitFontSmoothing: "antialiased" }}>You're booked.</h2>
            <p style={{ fontSize: 14.5, color: "var(--color-text-muted)", lineHeight: 1.55, margin: 0, maxWidth: 280 }}>{longDate(day.date)} at {fmt(sel)} with Dr. Patel. We'll send a calm reminder beforehand — and a link to join.</p>
            <Button variant="secondary" onClick={() => { setBooked(false); setSel(null); }}>Book another</Button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Header onBack={onBack} />
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 16px", display: "flex", flexDirection: "column", gap: 18, background: "var(--aminy-mist)" }}>
          {/* Provider + visit type */}
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name="Dr Patel" tone="teal" size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--color-text-strong)" }}>Dr. Patel, OTR/L</div>
              <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 1 }}>30 min · Occupational therapy · Telehealth</div>
            </div>
          </div>

          {/* Date pills */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 10 }}>{day.date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {DAYS.map((d, i) => {
                const cnt = d.slots.filter((s) => s.available).length;
                const on = i === dayIdx;
                const has = cnt > 0;
                return (
                  <button key={i} onClick={() => has && (setDayIdx(i), setSel(null))} disabled={!has} style={{
                    flexShrink: 0, width: 58, padding: "8px 0 7px", borderRadius: 14, textAlign: "center", cursor: has ? "pointer" : "default",
                    background: on ? "var(--aminy-teal-600)" : "#fff",
                    border: `1.5px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`,
                    boxShadow: on ? "var(--shadow-glow-teal)" : "none", opacity: has ? 1 : 0.45,
                    transition: "all var(--dur-fast) var(--ease-calm)",
                  }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".02em", color: on ? "rgba(255,255,255,0.9)" : "var(--color-text-muted)" }}>{isToday(d.date) ? "Today" : isTmrw(d.date) ? "Tmrw" : dow(d.date)}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: on ? "#fff" : "var(--color-text-strong)", lineHeight: 1.2 }}>{d.date.getDate()}</div>
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: on ? "rgba(255,255,255,0.9)" : has ? "var(--aminy-teal-700)" : "transparent" }}>{has ? `${cnt} open` : "\u2014"}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time-of-day sections */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "var(--color-text-strong)", paddingTop: 2 }}>
            <AIcon name="calendar" size={15} style={{ color: "var(--aminy-teal-700)" }} /> {longDate(day.date)}
          </div>
          {PERIODS.map(([key, label, icon]) => {
            const slots = day.slots.filter((s) => tod(s.t) === key);
            const avail = slots.filter((s) => s.available).length;
            if (!slots.length) return null;
            return (
              <div key={key}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, color: "var(--color-text-strong)" }}>
                  <AIcon name={icon} size={15} style={{ color: "var(--color-text-muted)" }} /><span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span><span style={{ fontSize: 11.5, color: "var(--color-text-subtle)", fontWeight: 500, whiteSpace: "nowrap" }}>· {avail} open</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {slots.map((s) => {
                    const chosen = sel === s.t;
                    if (!s.available) return <span key={s.t} style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--color-text-subtle)", background: "transparent", borderRadius: 12, whiteSpace: "nowrap", textDecoration: "line-through", textDecorationColor: "var(--aminy-navy-200)", opacity: 0.7 }}>{fmtShort(s.t)}</span>;
                    return <button key={s.t} onClick={() => { buzz(8); setSel(s.t); }} style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, fontWeight: 600, borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap", background: chosen ? "var(--aminy-teal-600)" : "#fff", color: chosen ? "#fff" : "var(--aminy-teal-800)", border: `1.5px solid ${chosen ? "var(--aminy-teal-600)" : "var(--aminy-teal-400)"}`, boxShadow: chosen ? "var(--shadow-glow-teal)" : "0 1px 2px rgba(42,125,153,0.10)", transition: "all var(--dur-fast) var(--ease-calm)" }}>{fmtShort(s.t)}</button>;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirm bar */}
        {sel && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border)", background: "var(--aminy-teal-50)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <AIcon name="check" size={18} style={{ color: "var(--aminy-teal-700)", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--aminy-teal-800)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isToday(day.date) ? "Today" : dow(day.date)} at {fmt(sel)}</div>
                <div style={{ fontSize: 11.5, color: "var(--aminy-teal-700)" }}>30 min · Dr. Patel</div>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={() => { buzz(12); setBooked(true); }}>Confirm</Button>
          </div>
        )}
      </div>
    );
  };

  function Header({ onBack }) {
    return (
      <div style={{ padding: "8px 18px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--color-border)", background: "#fff" }}>
        {onBack && <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aminy-mist)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)", flexShrink: 0 }}><AIcon name="back" size={16} /></button>}
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", color: "var(--color-text-strong)", WebkitFontSmoothing: "antialiased" }}>Book a TeleABA visit</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 500, marginTop: 1 }}>Pick a time that works — we'll handle the rest</div>
        </div>
      </div>
    );
  }
})();
