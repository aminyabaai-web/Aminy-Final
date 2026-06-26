/* Aminy kit primitives — standalone mirror of components/core/* so UI kits render
   reliably without waiting on the compiled _ds_bundle.js. Canonical source of truth
   for consumers remains components/core/<Name>.jsx + <Name>.d.ts. */
(function () {
  const R = React;

  // Motion guard — components check window.AminyMotion.reduce to honor prefers-reduced-motion
  if (!window.AminyMotion) {
    const mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    window.AminyMotion = { reduce: !!(mq && mq.matches) };
    if (mq && mq.addEventListener) mq.addEventListener("change", (e) => { window.AminyMotion.reduce = e.matches; });
  }

  // ---- Centralized tiered haptics — consistent "feel" across the whole app ----
  // light: selection/tap · medium: commit/toggle · heavy: open/close · success: celebratory
  if (!window.aminyHaptic) {
    const fire = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
    window.aminyHaptic = {
      light: () => fire(5),
      medium: () => fire(10),
      heavy: () => fire(16),
      success: () => fire([12, 40, 18]),
      warn: () => fire([20, 60, 20]),
    };
  }
  const haptic = window.aminyHaptic;

  // ---- Global toast: every action gives feedback, nothing feels dead ----
  if (!window.aminyToast) {
    window.aminyToast = function (msg) {
      let host = document.getElementById("aminy-toast-host");
      if (!host) {
        host = document.createElement("div");
        host.id = "aminy-toast-host";
        host.style.cssText = "position:fixed;left:50%;bottom:104px;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;";
        document.body.appendChild(host);
      }
      const t = document.createElement("div");
      t.textContent = msg;
      t.style.cssText = "background:#0C2230;color:#fff;font-family:var(--font-ui);font-size:13px;font-weight:600;padding:11px 16px;border-radius:999px;box-shadow:0 8px 24px rgba(15,23,42,0.22);opacity:0;transform:translateY(8px);transition:all .26s cubic-bezier(.2,.8,.2,1);max-width:300px;text-align:center;";
      host.appendChild(t);
      requestAnimationFrame(() => { t.style.opacity = "1"; t.style.transform = "translateY(0)"; });
      try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
      setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(8px)"; setTimeout(() => t.remove(), 300); }, 2100);
    };
  }

  function Button({ variant = "primary", size = "md", icon = null, iconRight = null, fullWidth = false, disabled = false, type = "button", onClick, children, style = {}, ...rest }) {
    const [hover, setHover] = R.useState(false);
    const [press, setPress] = R.useState(false);
    const heights = { sm: 40, md: 48, lg: 56 };
    const pads = { sm: "0 14px", md: "0 20px", lg: "0 26px" };
    const fonts = { sm: "var(--text-sm)", md: "var(--text-md)", lg: "var(--text-lg)" };
    const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: heights[size], minWidth: size === "sm" ? 0 : 44, padding: pads[size], width: fullWidth ? "100%" : "auto", borderRadius: "var(--radius-md)", fontFamily: "var(--font-ui)", fontWeight: "var(--fw-semibold)", fontSize: fonts[size], lineHeight: 1, border: "1px solid transparent", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "background var(--dur-base) var(--ease-calm), box-shadow var(--dur-base) var(--ease-calm), transform var(--dur-fast) var(--ease-calm)", transform: press && !disabled ? "scale(0.98)" : "scale(1)", whiteSpace: "nowrap" };
    const variants = {
      primary: { background: hover && !disabled ? "var(--aminy-teal-700)" : "var(--aminy-teal-600)", color: "#fff", boxShadow: "var(--shadow-cta)" },
      secondary: { background: "#fff", color: "var(--aminy-navy-700)", borderColor: "var(--color-border-strong)", boxShadow: hover && !disabled ? "var(--shadow-sm)" : "none" },
      ghost: { background: hover && !disabled ? "var(--aminy-teal-50)" : "transparent", color: "var(--aminy-teal-700)" },
    };
    return <button type={type} disabled={disabled} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }} onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)} style={{ ...base, ...variants[variant], ...style }} {...rest}>{icon}{children}{iconRight}</button>;
  }

  function Badge({ tone = "teal", icon = null, children, style = {}, ...rest }) {
    const tones = {
      teal: { bg: "var(--aminy-teal-50)", fg: "var(--aminy-teal-800)", bd: "var(--aminy-teal-100)" },
      navy: { bg: "var(--aminy-navy-50)", fg: "var(--aminy-navy-700)", bd: "var(--aminy-navy-100)" },
      win: { bg: "var(--aminy-win-50)", fg: "var(--aminy-win-600)", bd: "var(--aminy-win-100)" },
      grow: { bg: "var(--aminy-grow-50)", fg: "var(--aminy-grow-600)", bd: "var(--aminy-grow-100)" },
      care: { bg: "var(--aminy-care-50)", fg: "var(--aminy-care-600)", bd: "var(--aminy-care-100)" },
    };
    const t = tones[tone] || tones.teal;
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 11px", borderRadius: "var(--radius-full)", background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: "var(--fw-semibold)", whiteSpace: "nowrap", ...style }} {...rest}>{icon}{children}</span>;
  }

  function Input({ label, hint, id, style = {}, ...rest }) {
    const [focus, setFocus] = R.useState(false);
    const autoId = R.useId();
    const fieldId = id || autoId;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {label && <label htmlFor={fieldId} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)", color: "var(--color-text)" }}>{label}</label>}
        <input id={fieldId} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={{ height: 48, padding: "0 14px", borderRadius: "var(--radius-sm)", border: `1px solid ${focus ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`, background: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--color-text)", outline: "none", boxShadow: focus ? "0 0 0 3px rgba(42,125,153,0.18)" : "none", transition: "border var(--dur-base) var(--ease-calm), box-shadow var(--dur-base) var(--ease-calm)", ...style }} {...rest} />
        {hint && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{hint}</span>}
      </div>
    );
  }

  function Card({ as: Tag = "div", interactive = false, padding = 22, radius = "var(--radius-lg)", style = {}, children, ...rest }) {
    const [hover, setHover] = R.useState(false);
    return <Tag onMouseEnter={interactive ? () => setHover(true) : undefined} onMouseLeave={interactive ? () => setHover(false) : undefined} style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: radius, padding: typeof padding === "number" ? padding + "px" : padding, boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)", transform: hover ? "translateY(-1px)" : "translateY(0)", transition: "box-shadow var(--dur-base) var(--ease-lift), transform var(--dur-base) var(--ease-lift)", cursor: interactive ? "pointer" : "default", ...style }} {...rest}>{children}</Tag>;
  }

  function Nudge({ eyebrow = "From Aminy", children, actions = null, style = {} }) {
    return (
      <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #fff, var(--aminy-teal-50))", border: "1px solid var(--aminy-teal-100)", borderRadius: "var(--radius-xl)", padding: "16px 18px 16px 20px", ...style }}>
        <span style={{ position: "absolute", left: 0, top: 16, bottom: 16, width: 3, background: "var(--aminy-teal-600)", borderRadius: "0 2px 2px 0" }} />
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--aminy-teal-700)", fontWeight: "var(--fw-bold)", marginBottom: 6 }}>{eyebrow}</div>
        <p className="aminy-nudge-tip" style={{ margin: 0, fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "var(--text-lg)", lineHeight: "var(--lh-snug)", letterSpacing: "-0.01em", color: "var(--color-text-strong)", textWrap: "pretty" }}>{children}</p>
        {actions && <div style={{ display: "flex", gap: 8, marginTop: 12 }}>{actions}</div>}
      </div>
    );
  }

  function Stat({ label, value, unit = null, caption = null, accent = false, style = {} }) {
    return (
      <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "12px 14px", ...style }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: "var(--fw-bold)" }}>{label}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontWeight: "var(--fw-bold)", fontSize: "var(--text-2xl)", letterSpacing: "var(--ls-tight)", lineHeight: 1, marginTop: 6, color: accent ? "var(--aminy-teal-700)" : "var(--color-text-strong)" }}>{value}{unit && <small style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", fontWeight: "var(--fw-medium)", marginLeft: 2 }}>{unit}</small>}</div>
        {caption && <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.3 }}>{caption}</div>}
      </div>
    );
  }

  function Avatar({ name = "", src = null, size = 40, tone = "teal", style = {} }) {
    const initials = name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
    const tones = {
      teal: { bg: "linear-gradient(135deg, var(--aminy-teal-400), var(--aminy-teal-700))", fg: "#fff" },
      child: { bg: "linear-gradient(135deg, #fde68a, var(--aminy-win-500))", fg: "#78350f" },
      navy: { bg: "linear-gradient(135deg, var(--aminy-navy-400), var(--aminy-navy-800))", fg: "#fff" },
      care: { bg: "linear-gradient(135deg, #c4b5fd, var(--aminy-care-600))", fg: "#fff" },
    };
    const t = tones[tone] || tones.teal;
    return <div style={{ width: size, height: size, flexShrink: 0, borderRadius: "var(--radius-full)", background: src ? `center/cover no-repeat url(${src})` : t.bg, color: t.fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-ui)", fontWeight: "var(--fw-bold)", fontSize: Math.round(size * 0.38), boxShadow: "var(--shadow-sm)", ...style }}>{!src && initials}</div>;
  }

  const kit = { Button, Badge, Input, Card, Nudge, Stat, Avatar };
  window.AminyKit = kit;
  // Fill any primitives the compiled bundle hasn't exposed yet (without clobbering real ones),
  // so cards/kits render whether or not _ds_bundle.js is fresh.
  const ns = (window.DesignSystem_39fb2b = window.DesignSystem_39fb2b || {});
  for (const k in kit) if (!ns[k]) ns[k] = kit[k];
})();
