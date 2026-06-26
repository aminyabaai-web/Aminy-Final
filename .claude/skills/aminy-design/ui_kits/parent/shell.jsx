/* Phone shell, status bar, sticky bottom nav. Attaches window.PhoneShell + window.BottomNav. */
(function () {
  const { AIcon } = window;

  function StatusBar() {
    return (
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 26px 0", fontSize: 13, fontWeight: 600, color: "var(--color-text-strong)", flexShrink: 0 }}>
        <span>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h2v-4H2zM7 20h2v-8H7zM12 20h2v-12h-2zM17 20h2V4h-2z"/></svg>
          <svg width="22" height="12" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1"><rect x="1" y="1" width="20" height="10" rx="2.5"/><rect x="3" y="3" width="15" height="6" rx="1" fill="currentColor"/></svg>
        </div>
      </div>
    );
  }

  window.PhoneShell = function PhoneShell({ children, bg = "linear-gradient(180deg,var(--aminy-mist),var(--aminy-mist-deep))" }) {
    return (
      <div style={{ width: 390, flexShrink: 0, background: "#fff", borderRadius: 44, padding: 14, boxShadow: "0 24px 60px rgba(15,23,42,0.16), 0 4px 12px rgba(15,23,42,0.06)", border: "1px solid #e5e7eb", position: "relative" }}>
        <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", width: 110, height: 28, background: "#0D1B2A", borderRadius: 999, zIndex: 5 }} />
        <div style={{ width: "100%", height: 788, borderRadius: 32, overflow: "hidden", background: bg, position: "relative", display: "flex", flexDirection: "column" }}>
          <StatusBar />
          {children}
        </div>
      </div>
    );
  };

  const TABS = [
    { id: "home", label: "Home", icon: "home" },
    { id: "plan", label: "My Plan", icon: "heart" },
    { id: "aminy", label: "Aminy", icon: "sparkles" },
    { id: "calm", label: "Exhale", icon: "wind" },
    { id: "more", label: "More", icon: "more" },
  ];

  window.BottomNav = function BottomNav({ active = "home", onNav }) {
    return (
      <div style={{ background: "#fff", borderTop: "1px solid var(--color-border)", padding: "8px 8px 12px", display: "grid", gridTemplateColumns: "repeat(5,1fr)", flexShrink: 0 }}>
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button key={t.id} onClick={() => { window.aminyHaptic && window.aminyHaptic.light(); onNav && onNav(t.id); }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px", background: "none", border: 0, cursor: "pointer", color: on ? "var(--aminy-teal-700)" : "var(--color-text-muted)", fontSize: 10, fontWeight: 600, fontFamily: "var(--font-ui)", borderRadius: 10, transition: "color var(--dur-base) var(--ease-calm), transform var(--dur-fast) var(--ease-calm)", transform: on ? "translateY(-1px)" : "none" }}>
              <AIcon name={t.icon} size={22} stroke={on ? 2.4 : 2} />
              {t.label}
            </button>
          );
        })}
        <div style={{ gridColumn: "1 / -1", height: 5, width: 120, margin: "8px auto 0", background: "var(--aminy-navy-300)", borderRadius: 999, opacity: 0.6 }} />
      </div>
    );
  };
})();
