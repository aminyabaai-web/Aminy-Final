/* @ds-bundle: {"format":3,"namespace":"DesignSystem_39fb2b","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Nudge","sourcePath":"components/core/Nudge.jsx"},{"name":"Stat","sourcePath":"components/core/Stat.jsx"}],"sourceHashes":{"assets/aminy_mark.js":"98ecc7330167","components/core/Avatar.jsx":"30b4ddc2e8bd","components/core/Badge.jsx":"b075e701b79b","components/core/Button.jsx":"387ce958f081","components/core/Card.jsx":"93acf3d86c37","components/core/Input.jsx":"4691f2f9785f","components/core/Nudge.jsx":"8164f3e9b650","components/core/Stat.jsx":"28f879cccfae","ui_kits/ease/app.jsx":"49a42a9e36a3","ui_kits/lib.jsx":"b43d7d11a4be","ui_kits/motion.jsx":"6d62a5cf7ea6","ui_kits/parent/aifeatures.jsx":"7b957b670593","ui_kits/parent/app.jsx":"4e0462efd048","ui_kits/parent/ask.jsx":"90cc8adb215a","ui_kits/parent/auth.jsx":"fd6d05b4a048","ui_kits/parent/bcba.jsx":"884eac875f96","ui_kits/parent/calm.jsx":"7a97e63c85f8","ui_kits/parent/destinations.jsx":"a0ef07a6f60f","ui_kits/parent/home.jsx":"c7930b8255e4","ui_kits/parent/icons.jsx":"33dbbe08cef8","ui_kits/parent/marketplace.jsx":"2917e355c4e5","ui_kits/parent/onboarding.jsx":"059739b296a2","ui_kits/parent/plan.jsx":"5ecd28712c67","ui_kits/parent/plans.jsx":"b99cddabd53d","ui_kits/parent/retention.jsx":"9ef23f01ff7d","ui_kits/parent/session.jsx":"1661caae96c6","ui_kits/parent/settings.jsx":"bd16d9f01441","ui_kits/parent/shell.jsx":"a9115b9f8023","ui_kits/parent/telehealth.jsx":"421f6a8feb27","ui_kits/parent/utility.jsx":"7a32ea604728","ui_kits/parent/why.jsx":"231cbdc88d58","ui_kits/provider/app.jsx":"c29eb629c3f1","ui_kits/provider/extras.jsx":"c65c7502115a","ui_kits/provider/payer.jsx":"96c5bdc210d0","ui_kits/provider/screens.jsx":"e61454f220b7","ui_kits/provider/tools.jsx":"2c96268fd9de"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DesignSystem_39fb2b = window.DesignSystem_39fb2b || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// assets/aminy_mark.js
try { (() => {
/* Aminy mark hydrator — converts <span class="aminy-mark">…</span>
   and <span class="aminy-compass"></span> placeholders into the
   full compass + wordmark lockup. Drop this script on any page.

   Usage:
     <span class="aminy-mark"></span>                  (compass + "aminy")
     <span class="aminy-mark size-xl"></span>
     <span class="aminy-mark size-lg reversed"></span>
     <span class="aminy-compass"></span>              (compass only)
     <span class="aminy-compass size-lg reversed"></span>
     <span class="aminy-lockup">
       <span class="aminy-mark"></span>
       <span class="tagline">Gentle guidance · Meaningful progress</span>
     </span>
*/
(function () {
  const COMPASS_SVG = `
<svg class="compass" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="27" fill="none" stroke="var(--aminy-mark-navy,#0D1B2A)" stroke-width="4.8"/>
  <path d="M32 32 L28.5 34 L32 7 L35.5 34 Z" fill="var(--aminy-mark-navy,#0D1B2A)"/>
  <path d="M32 32 L28.5 30 L32 57 L35.5 30 Z" fill="var(--aminy-mark-teal,#4E93A8)"/>
  <circle cx="32" cy="32" r="2.1" fill="#ffffff"/>
</svg>`.trim();
  function hydrateMark(el) {
    if (el.dataset.aminyHydrated) return;
    el.dataset.aminyHydrated = "1";
    // If author supplied children (e.g. a custom tagline), respect compass-only hydration
    if (!el.querySelector('.compass')) {
      el.insertAdjacentHTML('afterbegin', COMPASS_SVG);
    }
    if (!el.querySelector('.wm')) {
      const wm = document.createElement('span');
      wm.className = 'wm';
      wm.textContent = 'aminy';
      el.appendChild(wm);
    }
  }
  function hydrateCompass(el) {
    if (el.dataset.aminyHydrated) return;
    el.dataset.aminyHydrated = "1";
    if (!el.querySelector('svg')) {
      el.innerHTML = COMPASS_SVG.replace('class="compass"', 'class="compass" style="width:100%;height:100%"');
    }
  }
  function run() {
    document.querySelectorAll('.aminy-mark').forEach(hydrateMark);
    document.querySelectorAll('.aminy-compass').forEach(hydrateCompass);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  // Re-run for dynamically added marks
  window.hydrateAminyMarks = run;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "assets/aminy_mark.js", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
/**
 * Aminy Avatar — a soft gradient identity circle with initials, or a
 * photo when src is provided. Warm child gradients, teal for adults.
 */
function Avatar({
  name = "",
  src = null,
  size = 40,
  tone = "teal",
  style = {}
}) {
  const initials = name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const tones = {
    teal: {
      bg: "linear-gradient(135deg, var(--aminy-teal-400), var(--aminy-teal-700))",
      fg: "#fff"
    },
    child: {
      bg: "linear-gradient(135deg, #fde68a, var(--aminy-win-500))",
      fg: "#78350f"
    },
    navy: {
      bg: "linear-gradient(135deg, var(--aminy-navy-400), var(--aminy-navy-800))",
      fg: "#fff"
    },
    care: {
      bg: "linear-gradient(135deg, #c4b5fd, var(--aminy-care-600))",
      fg: "#fff"
    }
  };
  const t = tones[tone] || tones.teal;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: "var(--radius-full)",
      background: src ? `center/cover no-repeat url(${src})` : t.bg,
      color: t.fg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-ui)",
      fontWeight: "var(--fw-bold)",
      fontSize: Math.round(size * 0.38),
      boxShadow: "var(--shadow-sm)",
      ...style
    }
  }, !src && initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Aminy Badge (chip) — a soft-filled, pill-shaped identity marker.
 * Tones map to the earned-state palette; use to carry meaning,
 * never as decoration.
 */
function Badge({
  tone = "teal",
  icon = null,
  children,
  style = {},
  ...rest
}) {
  const tones = {
    teal: {
      bg: "var(--aminy-teal-50)",
      fg: "var(--aminy-teal-800)",
      bd: "var(--aminy-teal-100)"
    },
    navy: {
      bg: "var(--aminy-navy-50)",
      fg: "var(--aminy-navy-700)",
      bd: "var(--aminy-navy-100)"
    },
    win: {
      bg: "var(--aminy-win-50)",
      fg: "var(--aminy-win-600)",
      bd: "var(--aminy-win-100)"
    },
    grow: {
      bg: "var(--aminy-grow-50)",
      fg: "var(--aminy-grow-600)",
      bd: "var(--aminy-grow-100)"
    },
    care: {
      bg: "var(--aminy-care-50)",
      fg: "var(--aminy-care-600)",
      bd: "var(--aminy-care-100)"
    }
  };
  const t = tones[tone] || tones.teal;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      height: "28px",
      padding: "0 11px",
      borderRadius: "var(--radius-full)",
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.bd}`,
      fontFamily: "var(--font-ui)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--fw-semibold)",
      letterSpacing: "0.01em",
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Aminy Button — calm, confident, one teal pointer per view.
 * Primary carries the teal CTA glow; secondary is a quiet white pill;
 * ghost is the "not now / skip" register. 48px default tap target.
 */
function Button({
  variant = "primary",
  size = "md",
  icon = null,
  iconRight = null,
  fullWidth = false,
  disabled = false,
  type = "button",
  onClick,
  children,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const heights = {
    sm: 40,
    md: 48,
    lg: 56
  };
  const pads = {
    sm: "0 14px",
    md: "0 20px",
    lg: "0 26px"
  };
  const fonts = {
    sm: "var(--text-sm)",
    md: "var(--text-md)",
    lg: "var(--text-lg)"
  };
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    height: heights[size],
    minWidth: size === "sm" ? 0 : 44,
    padding: pads[size],
    width: fullWidth ? "100%" : "auto",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-ui)",
    fontWeight: "var(--fw-semibold)",
    fontSize: fonts[size],
    lineHeight: 1,
    border: "1px solid transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background var(--dur-base) var(--ease-calm), box-shadow var(--dur-base) var(--ease-calm), transform var(--dur-fast) var(--ease-calm)",
    transform: press && !disabled ? "scale(0.98)" : "scale(1)",
    textDecoration: "none",
    whiteSpace: "nowrap"
  };
  const variants = {
    primary: {
      background: hover && !disabled ? "var(--aminy-teal-700)" : "var(--aminy-teal-600)",
      color: "#fff",
      boxShadow: "var(--shadow-cta)"
    },
    secondary: {
      background: "#fff",
      color: "var(--aminy-navy-700)",
      borderColor: "var(--color-border-strong)",
      boxShadow: hover && !disabled ? "var(--shadow-sm)" : "none"
    },
    ghost: {
      background: hover && !disabled ? "var(--aminy-teal-50)" : "transparent",
      color: "var(--aminy-teal-700)"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      ...base,
      ...variants[variant],
      ...style
    }
  }, rest), icon, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Aminy Card — the elevated white surface that floats on the mist
 * background. Soft 16px radius, hairline border, resting shadow that
 * lifts on hover when interactive.
 */
function Card({
  as: Tag = "div",
  interactive = false,
  padding = 22,
  radius = "var(--radius-lg)",
  style = {},
  children,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement(Tag, _extends({
    onMouseEnter: interactive ? () => setHover(true) : undefined,
    onMouseLeave: interactive ? () => setHover(false) : undefined,
    style: {
      background: "var(--color-bg-elevated)",
      border: "1px solid var(--color-border)",
      borderRadius: radius,
      padding: typeof padding === "number" ? `${padding}px` : padding,
      boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
      transform: hover ? "translateY(-1px)" : "translateY(0)",
      transition: "box-shadow var(--dur-base) var(--ease-lift), transform var(--dur-base) var(--ease-lift)",
      cursor: interactive ? "pointer" : "default",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Aminy Input — 16px font floor (no iOS zoom), 3px teal focus ring,
 * sentence-case calm labels. Pass a hint for gentle helper text.
 */
function Input({
  label,
  hint,
  id,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const autoId = React.useId();
  const fieldId = id || autoId;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--fw-medium)",
      color: "var(--color-text)"
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      height: "48px",
      padding: "0 14px",
      borderRadius: "var(--radius-sm)",
      border: `1px solid ${focus ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`,
      background: "#fff",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--text-base)",
      color: "var(--color-text)",
      outline: "none",
      boxShadow: focus ? "0 0 0 3px rgba(42,125,153,0.18)" : "none",
      transition: "border var(--dur-base) var(--ease-calm), box-shadow var(--dur-base) var(--ease-calm)",
      ...style
    }
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--text-xs)",
      color: "var(--color-text-muted)"
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Nudge.jsx
try { (() => {
/**
 * Aminy Nudge — the signature proactive card. A warm rounded (Fredoka) tip from
 * Aminy with a teal left-stripe and gentle actions. Validate first,
 * then offer. Never stack stock icons inside the body.
 */
function Nudge({
  eyebrow = "From Aminy",
  children,
  actions = null,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(180deg, #fff, var(--aminy-teal-50))",
      border: "1px solid var(--aminy-teal-100)",
      borderRadius: "var(--radius-xl)",
      padding: "16px 18px 16px 20px",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      top: 16,
      bottom: 16,
      width: 3,
      background: "var(--aminy-teal-600)",
      borderRadius: "0 2px 2px 0"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--text-xs)",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--aminy-teal-700)",
      fontWeight: "var(--fw-bold)",
      marginBottom: "6px"
    }
  }, eyebrow), /*#__PURE__*/React.createElement("p", {
    className: "aminy-nudge-tip",
    style: {
      margin: 0,
      fontFamily: "var(--font-ui)",
      fontWeight: 600,
      fontSize: "var(--text-lg)",
      lineHeight: "var(--lh-snug)",
      letterSpacing: "-0.01em",
      color: "var(--color-text-strong)",
      textWrap: "pretty"
    }
  }, children), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "8px",
      marginTop: "12px"
    }
  }, actions));
}
Object.assign(__ds_scope, { Nudge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Nudge.jsx", error: String((e && e.message) || e) }); }

// components/core/Stat.jsx
try { (() => {
/**
 * Aminy Stat — a quiet metric tile. Celebrates consistency, not
 * perfection: pair a value with a warm caption ("One left · no rush"),
 * never a punitive one. accent=true tints the value teal.
 */
function Stat({
  label,
  value,
  unit = null,
  caption = null,
  accent = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--color-bg-elevated)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)",
      padding: "12px 14px",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--text-xs)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--color-text-muted)",
      fontWeight: "var(--fw-bold)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      fontWeight: "var(--fw-bold)",
      fontSize: "var(--text-2xl)",
      letterSpacing: "var(--ls-tight)",
      lineHeight: 1,
      marginTop: "6px",
      color: accent ? "var(--aminy-teal-700)" : "var(--color-text-strong)"
    }
  }, value, unit && /*#__PURE__*/React.createElement("small", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--color-text-muted)",
      fontWeight: "var(--fw-medium)",
      marginLeft: "2px"
    }
  }, unit)), caption && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--text-xs)",
      color: "var(--color-text-muted)",
      marginTop: "4px",
      lineHeight: 1.3
    }
  }, caption));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Stat.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ease/app.jsx
try { (() => {
/* Ease — kid-facing kit. Soft, rounded, big emoji. Single-purpose screens.
   Play tab = 6 equal activities, each a real interactive mini-game. */
(function () {
  const R = React;
  const INK = "#312e81",
    PRI = "#7c3aed",
    SUB = "#6366f1";
  const buzz = ms => {
    try {
      navigator.vibrate && navigator.vibrate(ms);
    } catch (e) {}
  };
  function Status() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 26px 0",
        fontSize: 13,
        fontWeight: 700,
        color: INK,
        flexShrink: 0,
        fontFamily: "var(--font-jr)"
      }
    }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("svg", {
      width: "22",
      height: "12",
      viewBox: "0 0 24 12",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1"
    }, /*#__PURE__*/React.createElement("rect", {
      x: "1",
      y: "1",
      width: "20",
      height: "10",
      rx: "2.5"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "15",
      height: "6",
      rx: "1",
      fill: "currentColor"
    })));
  }
  const StarToken = ({
    size = 18
  }) => /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "url(#jrStar)",
    stroke: "#f59e0b",
    strokeWidth: "1.2",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "jrStar",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#fde68a"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#fbbf24"
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M12 2.6l2.6 5.7 6.2.7-4.6 4.2 1.2 6.1L12 20l-5.6 3 1.2-6.1L3 12.7l6.2-.7z"
  }));
  function TopBar({
    stars = 12
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 22px 10px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 999,
        padding: "6px 14px 6px 6px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 2px 8px rgba(76,29,149,0.1)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#fbcfe8,#f472b6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16
      }
    }, "\uD83E\uDD8A"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: INK,
        fontFamily: "var(--font-jr)"
      }
    }, "Kai")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "#fff",
        borderRadius: 999,
        padding: "6px 13px",
        boxShadow: "0 2px 8px rgba(76,29,149,0.1)"
      }
    }, /*#__PURE__*/React.createElement(StarToken, {
      size: 17
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: PRI,
        fontFamily: "var(--font-jr)"
      }
    }, stars)));
  }
  const FEELINGS = [{
    em: "😊",
    lb: "Happy",
    bg: "#fef3c7"
  }, {
    em: "😌",
    lb: "Calm",
    bg: "#dbeafe"
  }, {
    em: "😢",
    lb: "Sad",
    bg: "#fce7f3"
  }, {
    em: "🤩",
    lb: "Excited",
    bg: "#dcfce7"
  }, {
    em: "😠",
    lb: "Mad",
    bg: "#e0e7ff"
  }, {
    em: "😴",
    lb: "Tired",
    bg: "#fed7aa"
  }];
  function Checkin({
    onNext
  }) {
    const [sel, setSel] = R.useState(1);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4px 22px 0",
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 26,
        lineHeight: 1.1,
        color: INK,
        textAlign: "center",
        margin: "0 0 6px",
        letterSpacing: "-0.02em"
      }
    }, "How's your body", /*#__PURE__*/React.createElement("br", null), "right ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: PRI
      }
    }, "now?")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: 14,
        textAlign: "center",
        color: SUB,
        margin: 0,
        fontWeight: 600
      }
    }, "Pick any one. There's no wrong answer."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 12,
        marginTop: 16
      }
    }, FEELINGS.map((f, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => {
        buzz(6);
        setSel(i);
      },
      style: {
        aspectRatio: "1/1.05",
        borderRadius: 28,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: 10,
        border: 0,
        cursor: "pointer",
        background: f.bg,
        outline: sel === i ? `4px solid ${PRI}` : "none",
        outlineOffset: 3,
        transform: sel === i ? "scale(1.04)" : "scale(1)",
        transition: "transform .2s var(--ease-calm)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 42,
        lineHeight: 1
      }
    }, f.em), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 13,
        color: INK
      }
    }, f.lb)))), /*#__PURE__*/React.createElement("button", {
      onClick: onNext,
      style: {
        marginTop: 28,
        marginBottom: 24,
        height: 58,
        borderRadius: 22,
        background: "linear-gradient(135deg,#7c3aed,#6366f1)",
        color: "#fff",
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 17,
        border: 0,
        boxShadow: "0 8px 20px rgba(124,58,237,0.35)",
        cursor: "pointer"
      }
    }, "That's me right now \u2192"));
  }

  // ---- 6 equal activities ----
  const ACTS = [{
    id: "pop",
    em: "🫧",
    lb: "Bubble pop",
    tag: "Pop them all",
    bg: "linear-gradient(135deg,#dbeafe,#bfdbfe)"
  }, {
    id: "story",
    em: "🦄",
    lb: "Silly story",
    tag: "You choose!",
    star: true,
    bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)"
  }, {
    id: "stretch",
    em: "🌱",
    lb: "Stretch & grow",
    tag: "4 poses",
    bg: "linear-gradient(135deg,#dcfce7,#bbf7d0)"
  }, {
    id: "doodle",
    em: "🎨",
    lb: "Doodle time",
    tag: "Draw + stickers",
    star: true,
    bg: "linear-gradient(135deg,#fef3c7,#fde68a)"
  }, {
    id: "sound",
    em: "🎧",
    lb: "Sound bath",
    tag: "Listen",
    bg: "linear-gradient(135deg,#cffafe,#a5f3fc)"
  }, {
    id: "glitter",
    em: "✨",
    lb: "Glitter jar",
    tag: "Shake & settle",
    bg: "linear-gradient(135deg,#ede9fe,#ddd6fe)"
  }];
  function Activities({
    onPick
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "10px 22px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 26,
        color: INK,
        lineHeight: 1.1,
        letterSpacing: "-0.02em"
      }
    }, "Pick one ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: PRI
      }
    }, "thing"), " \uD83D\uDC9B"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: 14,
        color: SUB,
        marginTop: 4,
        fontWeight: 600
      }
    }, "Whatever feels good. Tiny is great.")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "16px 22px 20px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 13,
        flex: 1,
        alignContent: "start",
        overflowY: "auto"
      }
    }, ACTS.map(a => /*#__PURE__*/React.createElement("button", {
      key: a.id,
      onClick: () => {
        buzz(8);
        onPick(a.id);
      },
      style: {
        aspectRatio: "1/1.08",
        borderRadius: 26,
        padding: "14px 14px 13px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "flex-start",
        boxShadow: "0 6px 14px rgba(76,29,149,0.1)",
        position: "relative",
        overflow: "hidden",
        background: a.bg,
        border: 0,
        cursor: "pointer",
        textAlign: "left"
      }
    }, a.star && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: 11,
        right: 13,
        fontSize: 15,
        opacity: 0.85
      }
    }, "\u2B50"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 40,
        lineHeight: 1
      }
    }, a.em), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 16,
        color: INK,
        lineHeight: 1.05,
        whiteSpace: "nowrap"
      }
    }, a.lb), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: ".07em",
        textTransform: "uppercase",
        color: "rgba(49,46,129,0.55)",
        marginTop: 4
      }
    }, a.tag))))));
  }
  function PlayFrame({
    title,
    onBack,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "4px 18px 8px"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      "aria-label": "Back",
      style: {
        width: 40,
        height: 40,
        borderRadius: 999,
        background: "#fff",
        border: "1px solid #e9d5ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 18,
        color: INK,
        boxShadow: "0 2px 8px rgba(76,29,149,0.08)"
      }
    }, "\u2190"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 19,
        color: INK,
        letterSpacing: "-0.01em"
      }
    }, title)), children);
  }
  const FinishBtn = ({
    onClick,
    children
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      height: 58,
      borderRadius: 22,
      background: "linear-gradient(135deg,#7c3aed,#6366f1)",
      color: "#fff",
      fontFamily: "var(--font-jr)",
      fontWeight: 700,
      fontSize: 16,
      border: 0,
      cursor: "pointer",
      boxShadow: "0 8px 20px rgba(124,58,237,0.35)",
      width: "100%"
    }
  }, children);

  // 1) Bubble POP — tap every bubble; each pops with a buzz
  function BubblePop({
    onBack,
    onDone
  }) {
    const [grid, setGrid] = R.useState(() => Array.from({
      length: 12
    }, () => true));
    const left = grid.filter(Boolean).length;
    return /*#__PURE__*/React.createElement(PlayFrame, {
      title: "Bubble pop",
      onBack: onBack
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "6px 22px 20px",
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: 14,
        color: SUB,
        fontWeight: 600,
        textAlign: "center",
        margin: "2px 0 14px"
      }
    }, left > 0 ? `Pop them all! ${left} left 🫧` : "POP POP POP! You got them all! 🎉"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 14,
        width: "100%",
        flex: 1,
        alignContent: "center"
      }
    }, grid.map((up, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => {
        if (!up) return;
        buzz(14);
        setGrid(g => g.map((v, k) => k === i ? false : v));
      },
      "aria-label": "bubble",
      style: {
        aspectRatio: "1",
        borderRadius: "50%",
        border: 0,
        cursor: up ? "pointer" : "default",
        background: up ? "radial-gradient(circle at 32% 28%, #fff, #bae6fd 55%, #38bdf8)" : "rgba(56,189,248,0.1)",
        boxShadow: up ? "0 5px 12px rgba(56,189,248,0.35), inset 0 2px 8px rgba(255,255,255,0.7)" : "inset 0 2px 6px rgba(56,189,248,0.2)",
        transform: up ? "scale(1)" : "scale(0.7)",
        transition: "transform .14s var(--ease-calm), background .2s, box-shadow .2s"
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        marginTop: 16
      }
    }, left === 0 ? /*#__PURE__*/React.createElement(FinishBtn, {
      onClick: onDone
    }, "Yay, all done! \u2728") : /*#__PURE__*/React.createElement("button", {
      onClick: () => setGrid(Array.from({
        length: 12
      }, () => true)),
      style: {
        width: "100%",
        height: 52,
        borderRadius: 20,
        border: "2px solid #e9d5ff",
        background: "#fff",
        color: PRI,
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 15,
        cursor: "pointer"
      }
    }, "Fill them up again"))));
  }

  // 2) Silly story — branching, kid picks the path
  const STORY = {
    start: {
      text: "A sleepy fox named Pip wakes up and finds a door that wasn't there yesterday! 🚪",
      choices: [["Open it!", "moon"], ["Knock first", "knock"]]
    },
    knock: {
      text: "Knock knock! A tiny voice giggles, \"Come iiin!\" Pip opens the door and…",
      choices: [["Step through", "moon"], ["Peek inside", "moon"]]
    },
    moon: {
      text: "WHOOSH! Pip floats up to the MOON, made entirely of… 🤔",
      choices: [["Purple pancakes 🥞", "pancake"], ["Bouncy jelly 🟣", "jelly"]]
    },
    pancake: {
      text: "Pip takes a giant bite. It tastes like bubblegum clouds! A moon-bunny asks Pip to dance. 🐰",
      choices: [["Dance!", "end"], ["Take a nap", "end"]]
    },
    jelly: {
      text: "BOING! Pip bounces so high they touch a star. The star winks and grants one silly wish. ⭐",
      choices: [["Wish for wings", "end"], ["Wish for snacks", "end"]]
    },
    end: {
      text: "Full, happy, and a little bit magic, Pip floats home and snuggles in. The end. 💛",
      choices: null
    }
  };
  function SillyStory({
    onBack,
    onDone
  }) {
    const [node, setNode] = R.useState("start");
    const [path, setPath] = R.useState(["start"]);
    const cur = STORY[node];
    return /*#__PURE__*/React.createElement(PlayFrame, {
      title: "Silly story",
      onBack: onBack
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "6px 24px 22px",
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 26,
        padding: "22px 22px",
        boxShadow: "0 6px 16px rgba(76,29,149,0.12)",
        fontFamily: "var(--font-jr)",
        fontWeight: 600,
        fontSize: 20,
        color: INK,
        lineHeight: 1.35,
        textWrap: "pretty"
      }
    }, cur.text), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        gap: 5
      }
    }, path.map((_, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        width: 7,
        height: 7,
        borderRadius: 999,
        background: "#c4b5fd"
      }
    })))), cur.choices ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginTop: 14
      }
    }, cur.choices.map(([label, next], i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => {
        buzz(8);
        setNode(next);
        setPath(p => [...p, next]);
      },
      style: {
        height: 56,
        borderRadius: 20,
        background: i % 2 ? "linear-gradient(135deg,#fbcfe8,#f9a8d4)" : "linear-gradient(135deg,#ddd6fe,#c4b5fd)",
        color: INK,
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 16,
        border: 0,
        cursor: "pointer",
        boxShadow: "0 5px 12px rgba(76,29,149,0.14)"
      }
    }, label))) : /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 14
      }
    }, /*#__PURE__*/React.createElement(FinishBtn, {
      onClick: onDone
    }, "What a story! \u2728"))));
  }

  // 3) Stretch & grow — timed poses with a countdown ring
  const POSES = [{
    em: "🙌",
    t: "Reach for the sky!",
    d: "Stretch both arms up high.",
    secs: 12
  }, {
    em: "🌳",
    t: "Be a tall tree",
    d: "Stand still, sway gently.",
    secs: 15
  }, {
    em: "🦅",
    t: "Flap like a bird",
    d: "Big slow wing flaps.",
    secs: 12
  }, {
    em: "🐢",
    t: "Tiny turtle",
    d: "Curl up small and cozy.",
    secs: 18
  }];
  function Stretch({
    onBack,
    onDone
  }) {
    const [i, setI] = R.useState(0);
    const [left, setLeft] = R.useState(POSES[0].secs);
    const [running, setRunning] = R.useState(true);
    const p = POSES[i];
    const last = i >= POSES.length - 1;
    R.useEffect(() => {
      if (!running) return;
      if (left <= 0) {
        buzz(12);
        return;
      }
      const id = setTimeout(() => setLeft(l => l - 1), 1000);
      return () => clearTimeout(id);
    }, [left, running]);
    const pct = 1 - left / p.secs;
    const C = 2 * Math.PI * 52;
    function next() {
      if (last) {
        onDone();
        return;
      }
      const ni = i + 1;
      setI(ni);
      setLeft(POSES[ni].secs);
      setRunning(true);
    }
    return /*#__PURE__*/React.createElement(PlayFrame, {
      title: "Stretch & grow",
      onBack: onBack
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "0 24px 22px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        width: 150,
        height: 150
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "150",
      height: "150",
      style: {
        transform: "rotate(-90deg)"
      }
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "75",
      cy: "75",
      r: "52",
      fill: "none",
      stroke: "#dcfce7",
      strokeWidth: "10"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "75",
      cy: "75",
      r: "52",
      fill: "none",
      stroke: "#22c55e",
      strokeWidth: "10",
      strokeLinecap: "round",
      strokeDasharray: C,
      strokeDashoffset: C * (1 - pct),
      style: {
        transition: "stroke-dashoffset 1s linear"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 62
      }
    }, p.em)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 25,
        color: INK,
        letterSpacing: "-0.01em"
      }
    }, p.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: 15,
        color: SUB,
        fontWeight: 600,
        marginTop: 4
      }
    }, p.d)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 17,
        color: left > 0 ? PRI : "#22c55e"
      }
    }, left > 0 ? `Hold for ${left}…` : "Great job! 🎉"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, POSES.map((_, k) => /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        width: k === i ? 22 : 8,
        height: 8,
        borderRadius: 999,
        background: k <= i ? PRI : "#ddd6fe",
        transition: "all .3s"
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%"
      }
    }, left > 0 ? /*#__PURE__*/React.createElement("button", {
      onClick: () => setRunning(r => !r),
      style: {
        width: "100%",
        height: 52,
        borderRadius: 20,
        border: "2px solid #e9d5ff",
        background: "#fff",
        color: PRI,
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 15,
        cursor: "pointer"
      }
    }, running ? "Pause" : "Keep going") : /*#__PURE__*/React.createElement(FinishBtn, {
      onClick: next
    }, last ? "All stretched! ✨" : "Next pose →"))));
  }

  // 4) Doodle — real drawing (drag) + sticker mode + colors + save/send
  const COLORS = ["#f472b6", "#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#1f2937"];
  const STICKERS = ["⭐", "💛", "🌈", "✨", "🌸", "🦄", "🐱", "🚀"];
  function Doodle({
    onBack,
    onDone
  }) {
    const [mode, setMode] = R.useState("draw"); // draw | sticker
    const [color, setColor] = R.useState(COLORS[1]);
    const [sticker, setSticker] = R.useState(STICKERS[0]);
    const [strokes, setStrokes] = R.useState([]); // {color, pts:[[x,y]]}
    const [stamps, setStamps] = R.useState([]); // {x,y,s}
    const [sent, setSent] = R.useState(false);
    const drawing = R.useRef(false);
    const areaRef = R.useRef(null);
    function pos(e) {
      const r = areaRef.current.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return [(t.clientX - r.left) / r.width * 100, (t.clientY - r.top) / r.height * 100];
    }
    function down(e) {
      if (mode === "sticker") {
        const [x, y] = pos(e);
        buzz(6);
        setStamps(s => [...s, {
          x,
          y,
          s: sticker
        }]);
        return;
      }
      drawing.current = true;
      setStrokes(s => [...s, {
        color,
        pts: [pos(e)]
      }]);
    }
    function move(e) {
      if (mode !== "draw" || !drawing.current) return;
      e.preventDefault();
      setStrokes(s => {
        const c = s.slice();
        c[c.length - 1] = {
          ...c[c.length - 1],
          pts: [...c[c.length - 1].pts, pos(e)]
        };
        return c;
      });
    }
    function up() {
      drawing.current = false;
    }
    function clear() {
      setStrokes([]);
      setStamps([]);
    }
    return /*#__PURE__*/React.createElement(PlayFrame, {
      title: "Doodle time",
      onBack: onBack
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "2px 16px 16px",
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginBottom: 10
      }
    }, [["draw", "✏️ Draw"], ["sticker", "⭐ Stickers"]].map(([m, lb]) => /*#__PURE__*/React.createElement("button", {
      key: m,
      onClick: () => setMode(m),
      style: {
        flex: 1,
        height: 40,
        borderRadius: 14,
        border: 0,
        cursor: "pointer",
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 14,
        background: mode === m ? PRI : "#fff",
        color: mode === m ? "#fff" : INK,
        boxShadow: mode === m ? "none" : "inset 0 0 0 2px #e9d5ff"
      }
    }, lb))), /*#__PURE__*/React.createElement("div", {
      ref: areaRef,
      onMouseDown: down,
      onMouseMove: move,
      onMouseUp: up,
      onMouseLeave: up,
      onTouchStart: down,
      onTouchMove: move,
      onTouchEnd: up,
      style: {
        flex: 1,
        borderRadius: 24,
        background: "#fff",
        border: "3px dashed #e9d5ff",
        position: "relative",
        overflow: "hidden",
        cursor: "crosshair",
        touchAction: "none",
        marginBottom: 10
      }
    }, strokes.length === 0 && stamps.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-ui)",
        fontSize: 14,
        color: "#c4b5fd",
        fontWeight: 600,
        pointerEvents: "none"
      }
    }, mode === "draw" ? "Drag to draw ✏️" : "Tap to place stickers ⭐"), /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 100 100",
      preserveAspectRatio: "none",
      style: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none"
      }
    }, strokes.map((st, i) => /*#__PURE__*/React.createElement("polyline", {
      key: i,
      points: st.pts.map(p => p.join(",")).join(" "),
      fill: "none",
      stroke: st.color,
      strokeWidth: "2.4",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      vectorEffect: "non-scaling-stroke",
      style: {
        strokeWidth: 5
      }
    }))), stamps.map((m, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        position: "absolute",
        left: m.x + "%",
        top: m.y + "%",
        transform: "translate(-50%,-50%)",
        fontSize: 30,
        pointerEvents: "none"
      }
    }, m.s))), mode === "draw" ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        marginBottom: 10
      }
    }, COLORS.map(c => /*#__PURE__*/React.createElement("button", {
      key: c,
      onClick: () => setColor(c),
      "aria-label": "color",
      style: {
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: c,
        border: color === c ? "3px solid #312e81" : "3px solid #fff",
        cursor: "pointer",
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)"
      }
    })), /*#__PURE__*/React.createElement("button", {
      onClick: clear,
      style: {
        marginLeft: "auto",
        height: 34,
        padding: "0 12px",
        borderRadius: 12,
        border: "2px solid #e9d5ff",
        background: "#fff",
        color: SUB,
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer"
      }
    }, "Clear")) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 10
      }
    }, STICKERS.map(s => /*#__PURE__*/React.createElement("button", {
      key: s,
      onClick: () => setSticker(s),
      style: {
        width: 38,
        height: 38,
        borderRadius: 12,
        fontSize: 20,
        cursor: "pointer",
        background: sticker === s ? "#ede9fe" : "#fff",
        border: sticker === s ? "2px solid #7c3aed" : "2px solid #f1f5f9"
      }
    }, s))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        buzz(10);
        setSent(true);
        window.aminyToast && window.aminyToast("Sent to your grown-ups! 💛");
      },
      style: {
        flex: 1,
        height: 52,
        borderRadius: 20,
        border: "2px solid #e9d5ff",
        background: "#fff",
        color: PRI,
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer"
      }
    }, sent ? "Sent! 💛" : "Send to mom & dad"), /*#__PURE__*/React.createElement("button", {
      onClick: onDone,
      style: {
        flex: 1,
        height: 52,
        borderRadius: 20,
        background: "linear-gradient(135deg,#7c3aed,#6366f1)",
        color: "#fff",
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 14,
        border: 0,
        cursor: "pointer",
        boxShadow: "0 6px 16px rgba(124,58,237,0.3)"
      }
    }, "I'm done \u2728"))));
  }

  // 5) Sound bath
  const SCAPES = [{
    em: "🌧️",
    lb: "Rain",
    c: "#bfdbfe"
  }, {
    em: "🌊",
    lb: "Waves",
    c: "#a5f3fc"
  }, {
    em: "🌲",
    lb: "Forest",
    c: "#bbf7d0"
  }, {
    em: "🌙",
    lb: "Night",
    c: "#ddd6fe"
  }];
  function SoundBath({
    onBack,
    onDone
  }) {
    const [play, setPlay] = R.useState(null);
    return /*#__PURE__*/React.createElement(PlayFrame, {
      title: "Sound bath",
      onBack: onBack
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "6px 22px 20px",
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        marginBottom: 16
      }
    }, SCAPES.map(s => {
      const on = play === s.lb;
      return /*#__PURE__*/React.createElement("button", {
        key: s.lb,
        onClick: () => {
          buzz(8);
          setPlay(on ? null : s.lb);
        },
        style: {
          aspectRatio: "1/0.92",
          borderRadius: 26,
          border: on ? "3px solid #7c3aed" : "3px solid transparent",
          background: s.c,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: "pointer",
          boxShadow: "0 6px 14px rgba(76,29,149,0.12)"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 44
        }
      }, s.em), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: "var(--font-jr)",
          fontWeight: 700,
          fontSize: 15,
          color: INK
        }
      }, s.lb), on && /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 3,
          alignItems: "flex-end",
          height: 16,
          marginTop: 2
        }
      }, [0, 1, 2, 3].map(b => /*#__PURE__*/React.createElement("span", {
        key: b,
        style: {
          width: 3,
          borderRadius: 2,
          background: PRI,
          height: 16,
          animation: `eqj .7s ease-in-out ${b * 0.13}s infinite alternate`
        }
      }))));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: 13.5,
        color: SUB,
        fontWeight: 600,
        textAlign: "center",
        marginBottom: "auto"
      }
    }, play ? `Playing ${play}… close your eyes 💛` : "Tap a sound to begin"), /*#__PURE__*/React.createElement(FinishBtn, {
      onClick: onDone
    }, "All calm now \u2728"), /*#__PURE__*/React.createElement("style", null, `@keyframes eqj{from{height:4px}to{height:16px}}`)));
  }

  // 6) Glitter jar — shake to swirl, DRAG to tilt (glitter stays level like real water)
  function GlitterJar({
    onBack,
    onDone
  }) {
    const [shakeKey, setShakeKey] = R.useState(0);
    const [settled, setSettled] = R.useState(true);
    const [rot, setRot] = R.useState(0);
    const [dragging, setDragging] = R.useState(false);
    const drag = R.useRef(null);
    const bits = R.useMemo(() => Array.from({
      length: 36
    }, (_, i) => ({
      x: 12 + i * 37 % 76,
      c: ["#f472b6", "#a78bfa", "#60a5fa", "#fbbf24", "#34d399"][i % 5],
      d: i % 10 * 0.18,
      dur: 2.6 + i % 6 * 0.4
    })), []);
    function shake() {
      buzz(20);
      setSettled(false);
      setShakeKey(k => k + 1);
      setTimeout(() => setSettled(true), 4200);
    }
    const cx = e => e.clientX != null ? e.clientX : e.touches && e.touches[0] ? e.touches[0].clientX : 0;
    function down(e) {
      setDragging(true);
      drag.current = {
        x: cx(e),
        r: rot
      };
    }
    function move(e) {
      if (!dragging || !drag.current) return;
      const nr = Math.max(-55, Math.min(55, drag.current.r + (cx(e) - drag.current.x) / 2.2));
      if (Math.abs(nr - rot) > 7) buzz(4);
      setRot(nr);
    }
    function up() {
      if (!dragging) return;
      setDragging(false);
      drag.current = null;
      buzz(8);
      setRot(0);
    }
    return /*#__PURE__*/React.createElement(PlayFrame, {
      title: "Glitter jar",
      onBack: onBack
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "0 24px 22px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      onPointerDown: down,
      onPointerMove: move,
      onPointerUp: up,
      onPointerLeave: up,
      onTouchStart: down,
      onTouchMove: move,
      onTouchEnd: up,
      key: shakeKey,
      style: {
        width: 170,
        height: 230,
        borderRadius: "40px 40px 30px 30px",
        background: "linear-gradient(180deg, rgba(196,181,253,0.25), rgba(167,139,250,0.4))",
        border: "4px solid #c4b5fd",
        position: "relative",
        overflow: "hidden",
        boxShadow: "inset 0 4px 16px rgba(255,255,255,0.5), 0 10px 30px rgba(124,58,237,0.2)",
        cursor: "grab",
        touchAction: "none",
        transform: `rotate(${rot}deg)`,
        transition: dragging ? "none" : "transform .8s var(--ease-breath)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: -10,
        left: "50%",
        transform: "translateX(-50%)",
        width: 70,
        height: 22,
        background: "#a78bfa",
        borderRadius: 8,
        zIndex: 2
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: "-35%",
        transform: `rotate(${-rot}deg)`,
        transition: dragging ? "none" : "transform .8s var(--ease-breath)"
      }
    }, bits.map((b, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        position: "absolute",
        left: 28 + b.x * 0.44 + "%",
        top: "30%",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: b.c,
        boxShadow: `0 0 4px ${b.c}`,
        animation: settled ? "none" : `fall ${b.dur}s cubic-bezier(.3,0,.5,1) ${b.d}s forwards`
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: "22%",
        left: "18%",
        right: "18%",
        height: settled ? 26 : 5,
        background: "linear-gradient(180deg, rgba(167,139,250,0.45), rgba(124,58,237,0.55))",
        borderRadius: 6,
        transition: "height 1.2s ease 2.6s"
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 19,
        color: INK,
        textAlign: "center",
        letterSpacing: "-0.01em"
      }
    }, dragging ? "Tilt it sloooowly… 💧" : settled ? "Shake it — or grab & tilt the jar 💜" : "Breathe slooowly while it falls…"), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: shake,
      style: {
        height: 56,
        borderRadius: 20,
        border: "2px solid #c4b5fd",
        background: "#fff",
        color: PRI,
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 16,
        cursor: "pointer"
      }
    }, "\u2728 Shake the jar"), /*#__PURE__*/React.createElement(FinishBtn, {
      onClick: onDone
    }, "I feel calmer \u2728")), /*#__PURE__*/React.createElement("style", null, `@keyframes fall{0%{transform:translateY(0)}100%{transform:translateY(190px)}}`)));
  }
  const PLAYERS = {
    pop: BubblePop,
    story: SillyStory,
    stretch: Stretch,
    doodle: Doodle,
    sound: SoundBath,
    glitter: GlitterJar
  };
  function Reward({
    onAgain
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 30px",
        textAlign: "center",
        gap: 18,
        position: "relative",
        overflow: "hidden",
        background: "radial-gradient(circle at 50% 30%,rgba(251,207,232,.6) 0%,transparent 60%),radial-gradient(circle at 80% 70%,rgba(167,139,250,.4) 0%,transparent 50%),linear-gradient(180deg,#eef2ff,#faf5ff 60%)"
      }
    }, Array.from({
      length: 10
    }).map((_, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        position: "absolute",
        left: 8 + i * 9 + "%",
        top: "34%",
        fontSize: 13 + i % 3 * 8,
        animation: `jburst 1.9s ease-out ${i * 0.16}s infinite`,
        opacity: 0,
        pointerEvents: "none"
      }
    }, ["✨", "⭐", "💛"][i % 3])), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 170,
        height: 170,
        borderRadius: "42% 58% 54% 46% / 52% 44% 56% 48%",
        background: "radial-gradient(circle at 32% 26%,#ddd6fe,#a78bfa 60%,#7c3aed)",
        boxShadow: "0 16px 40px rgba(124,58,237,0.32),inset 0 4px 12px rgba(255,255,255,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "pop 2.6s var(--ease-breath) infinite"
      }
    }, /*#__PURE__*/React.createElement(StarToken, {
      size: 88
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        letterSpacing: ".16em",
        textTransform: "uppercase",
        color: PRI,
        fontWeight: 700
      }
    }, "You earned a calm star"), /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 32,
        lineHeight: 1.1,
        color: INK,
        letterSpacing: "-0.02em",
        margin: 0,
        textWrap: "balance"
      }
    }, "You took a moment. That counts."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: 15,
        lineHeight: 1.55,
        color: SUB,
        margin: 0,
        maxWidth: 260,
        fontWeight: 500
      }
    }, "That's 13 stars. Want to do one more, or rest? Both are good."), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onAgain,
      style: {
        height: 58,
        borderRadius: 22,
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 16,
        border: 0,
        background: "linear-gradient(135deg,#7c3aed,#6366f1)",
        color: "#fff",
        boxShadow: "0 8px 20px rgba(124,58,237,0.35)",
        cursor: "pointer"
      }
    }, "One more thing"), /*#__PURE__*/React.createElement("button", {
      onClick: onAgain,
      style: {
        height: 58,
        borderRadius: 22,
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 16,
        border: "2px solid #e9d5ff",
        background: "#fff",
        color: PRI,
        cursor: "pointer"
      }
    }, "I'm gonna rest \uD83D\uDCA4")), /*#__PURE__*/React.createElement("style", null, `@keyframes pop{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.05) rotate(2deg)}}@keyframes jburst{0%{transform:translateY(0) scale(.6);opacity:0}25%{opacity:1}100%{transform:translateY(-110px) scale(1.2);opacity:0}}`));
  }
  const TABS = [{
    id: "home",
    em: "🏡",
    lb: "Home"
  }, {
    id: "play",
    em: "🎮",
    lb: "Play"
  }, {
    id: "coins",
    em: "⭐",
    lb: "Stars"
  }];
  function JrNav({
    active,
    onNav
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        padding: "10px 8px 14px",
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        flexShrink: 0,
        borderTop: "1px solid #e9d5ff"
      }
    }, TABS.map(t => /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => onNav(t.id),
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        padding: 8,
        background: "none",
        border: 0,
        cursor: "pointer",
        color: active === t.id ? PRI : "rgba(49,46,129,0.5)",
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 22,
        lineHeight: 1
      }
    }, t.em), t.lb)), /*#__PURE__*/React.createElement("div", {
      style: {
        gridColumn: "1 / -1",
        height: 5,
        width: 120,
        margin: "8px auto 0",
        background: "rgba(49,46,129,0.3)",
        borderRadius: 999
      }
    }));
  }

  // ---- RESCUE MODE — the whole point of Ease. A dysregulated kid can't read
  // or choose, so the app opens ALREADY calming: breathing orb, slow phase text,
  // rhythmic haptics. Nothing to tap. A gentle exit appears after two cycles. ----
  function Rescue({
    onDone
  }) {
    const [phase, setPhase] = R.useState(0);
    const [ready, setReady] = R.useState(false);
    R.useEffect(() => {
      buzz(14);
      const id = setInterval(() => {
        setPhase(p => (p + 1) % 2);
        buzz(10);
      }, 4000);
      const t = setTimeout(() => setReady(true), 9000);
      return () => {
        clearInterval(id);
        clearTimeout(t);
      };
    }, []);
    return /*#__PURE__*/React.createElement("div", {
      onClick: () => ready && onDone(),
      style: {
        position: "absolute",
        inset: 0,
        zIndex: 30,
        background: "linear-gradient(180deg,#c7d2fe,#bfdbfe 50%,#a5f3fc)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 34,
        cursor: ready ? "pointer" : "default"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 220,
        height: 220,
        borderRadius: "50%",
        background: "radial-gradient(circle at 34% 28%,#fff,#bae6fd 52%,#60a5fa)",
        boxShadow: "0 24px 60px rgba(59,130,246,0.35), inset 0 6px 20px rgba(255,255,255,0.75)",
        animation: "ebr 8s var(--ease-breath) infinite"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-jr)",
        fontWeight: 700,
        fontSize: 26,
        color: "#1e3a8a",
        letterSpacing: "-0.01em",
        textAlign: "center"
      }
    }, phase === 0 ? "Breathe in…" : "And let it gooo…"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: 13.5,
        fontWeight: 600,
        color: "rgba(30,58,138,0.55)",
        opacity: ready ? 1 : 0,
        transition: "opacity .8s var(--ease-calm)",
        textAlign: "center"
      }
    }, "Tap anywhere when you feel ready \uD83D\uDC9B"), /*#__PURE__*/React.createElement("style", null, `@keyframes ebr{0%,100%{transform:scale(.7)}50%{transform:scale(1.05)}}`));
  }
  function App() {
    const [tab, setTab] = R.useState("home");
    const [activity, setActivity] = R.useState(null);
    const [rescue, setRescue] = R.useState(true);
    let screen;
    if (tab === "home") screen = /*#__PURE__*/React.createElement(Checkin, {
      onNext: () => setTab("play")
    });else if (tab === "play") {
      if (activity) {
        const Player = PLAYERS[activity];
        screen = /*#__PURE__*/React.createElement(Player, {
          onBack: () => setActivity(null),
          onDone: () => {
            setActivity(null);
            setTab("coins");
          }
        });
      } else screen = /*#__PURE__*/React.createElement(Activities, {
        onPick: id => setActivity(id)
      });
    } else screen = /*#__PURE__*/React.createElement(Reward, {
      onAgain: () => {
        setActivity(null);
        setTab("play");
      }
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: 390,
        flexShrink: 0,
        background: "#fff",
        borderRadius: 44,
        padding: 14,
        boxShadow: "0 24px 60px rgba(76,29,149,0.2), 0 4px 12px rgba(76,29,149,0.08)",
        border: "1px solid #e9d5ff",
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        width: 110,
        height: 28,
        background: "#1e1b4b",
        borderRadius: 999,
        zIndex: 5
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        height: 788,
        borderRadius: 32,
        overflow: "hidden",
        background: "linear-gradient(180deg,#eef2ff,#faf5ff 55%,#dbeafe)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility"
      }
    }, /*#__PURE__*/React.createElement(Status, null), /*#__PURE__*/React.createElement(TopBar, null), screen, /*#__PURE__*/React.createElement(JrNav, {
      active: tab,
      onNav: t => {
        setActivity(null);
        setTab(t);
      }
    }), rescue && /*#__PURE__*/React.createElement(Rescue, {
      onDone: () => {
        buzz(8);
        setRescue(false);
      }
    })));
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ease/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lib.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Aminy kit primitives — standalone mirror of components/core/* so UI kits render
   reliably without waiting on the compiled _ds_bundle.js. Canonical source of truth
   for consumers remains components/core/<Name>.jsx + <Name>.d.ts. */
(function () {
  const R = React;

  // Motion guard — components check window.AminyMotion.reduce to honor prefers-reduced-motion
  if (!window.AminyMotion) {
    const mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    window.AminyMotion = {
      reduce: !!(mq && mq.matches)
    };
    if (mq && mq.addEventListener) mq.addEventListener("change", e => {
      window.AminyMotion.reduce = e.matches;
    });
  }

  // ---- Centralized tiered haptics — consistent "feel" across the whole app ----
  // light: selection/tap · medium: commit/toggle · heavy: open/close · success: celebratory
  if (!window.aminyHaptic) {
    const fire = p => {
      try {
        navigator.vibrate && navigator.vibrate(p);
      } catch (e) {}
    };
    window.aminyHaptic = {
      light: () => fire(5),
      medium: () => fire(10),
      heavy: () => fire(16),
      success: () => fire([12, 40, 18]),
      warn: () => fire([20, 60, 20])
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
      requestAnimationFrame(() => {
        t.style.opacity = "1";
        t.style.transform = "translateY(0)";
      });
      try {
        navigator.vibrate && navigator.vibrate(6);
      } catch (e) {}
      setTimeout(() => {
        t.style.opacity = "0";
        t.style.transform = "translateY(8px)";
        setTimeout(() => t.remove(), 300);
      }, 2100);
    };
  }
  function Button({
    variant = "primary",
    size = "md",
    icon = null,
    iconRight = null,
    fullWidth = false,
    disabled = false,
    type = "button",
    onClick,
    children,
    style = {},
    ...rest
  }) {
    const [hover, setHover] = R.useState(false);
    const [press, setPress] = R.useState(false);
    const heights = {
      sm: 40,
      md: 48,
      lg: 56
    };
    const pads = {
      sm: "0 14px",
      md: "0 20px",
      lg: "0 26px"
    };
    const fonts = {
      sm: "var(--text-sm)",
      md: "var(--text-md)",
      lg: "var(--text-lg)"
    };
    const base = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: heights[size],
      minWidth: size === "sm" ? 0 : 44,
      padding: pads[size],
      width: fullWidth ? "100%" : "auto",
      borderRadius: "var(--radius-md)",
      fontFamily: "var(--font-ui)",
      fontWeight: "var(--fw-semibold)",
      fontSize: fonts[size],
      lineHeight: 1,
      border: "1px solid transparent",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "background var(--dur-base) var(--ease-calm), box-shadow var(--dur-base) var(--ease-calm), transform var(--dur-fast) var(--ease-calm)",
      transform: press && !disabled ? "scale(0.98)" : "scale(1)",
      whiteSpace: "nowrap"
    };
    const variants = {
      primary: {
        background: hover && !disabled ? "var(--aminy-teal-700)" : "var(--aminy-teal-600)",
        color: "#fff",
        boxShadow: "var(--shadow-cta)"
      },
      secondary: {
        background: "#fff",
        color: "var(--aminy-navy-700)",
        borderColor: "var(--color-border-strong)",
        boxShadow: hover && !disabled ? "var(--shadow-sm)" : "none"
      },
      ghost: {
        background: hover && !disabled ? "var(--aminy-teal-50)" : "transparent",
        color: "var(--aminy-teal-700)"
      }
    };
    return /*#__PURE__*/React.createElement("button", _extends({
      type: type,
      disabled: disabled,
      onClick: onClick,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => {
        setHover(false);
        setPress(false);
      },
      onMouseDown: () => setPress(true),
      onMouseUp: () => setPress(false),
      style: {
        ...base,
        ...variants[variant],
        ...style
      }
    }, rest), icon, children, iconRight);
  }
  function Badge({
    tone = "teal",
    icon = null,
    children,
    style = {},
    ...rest
  }) {
    const tones = {
      teal: {
        bg: "var(--aminy-teal-50)",
        fg: "var(--aminy-teal-800)",
        bd: "var(--aminy-teal-100)"
      },
      navy: {
        bg: "var(--aminy-navy-50)",
        fg: "var(--aminy-navy-700)",
        bd: "var(--aminy-navy-100)"
      },
      win: {
        bg: "var(--aminy-win-50)",
        fg: "var(--aminy-win-600)",
        bd: "var(--aminy-win-100)"
      },
      grow: {
        bg: "var(--aminy-grow-50)",
        fg: "var(--aminy-grow-600)",
        bd: "var(--aminy-grow-100)"
      },
      care: {
        bg: "var(--aminy-care-50)",
        fg: "var(--aminy-care-600)",
        bd: "var(--aminy-care-100)"
      }
    };
    const t = tones[tone] || tones.teal;
    return /*#__PURE__*/React.createElement("span", _extends({
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 28,
        padding: "0 11px",
        borderRadius: "var(--radius-full)",
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--fw-semibold)",
        whiteSpace: "nowrap",
        ...style
      }
    }, rest), icon, children);
  }
  function Input({
    label,
    hint,
    id,
    style = {},
    ...rest
  }) {
    const [focus, setFocus] = R.useState(false);
    const autoId = R.useId();
    const fieldId = id || autoId;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6
      }
    }, label && /*#__PURE__*/React.createElement("label", {
      htmlFor: fieldId,
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--fw-medium)",
        color: "var(--color-text)"
      }
    }, label), /*#__PURE__*/React.createElement("input", _extends({
      id: fieldId,
      onFocus: () => setFocus(true),
      onBlur: () => setFocus(false),
      style: {
        height: 48,
        padding: "0 14px",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${focus ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`,
        background: "#fff",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-base)",
        color: "var(--color-text)",
        outline: "none",
        boxShadow: focus ? "0 0 0 3px rgba(42,125,153,0.18)" : "none",
        transition: "border var(--dur-base) var(--ease-calm), box-shadow var(--dur-base) var(--ease-calm)",
        ...style
      }
    }, rest)), hint && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-xs)",
        color: "var(--color-text-muted)"
      }
    }, hint));
  }
  function Card({
    as: Tag = "div",
    interactive = false,
    padding = 22,
    radius = "var(--radius-lg)",
    style = {},
    children,
    ...rest
  }) {
    const [hover, setHover] = R.useState(false);
    return /*#__PURE__*/React.createElement(Tag, _extends({
      onMouseEnter: interactive ? () => setHover(true) : undefined,
      onMouseLeave: interactive ? () => setHover(false) : undefined,
      style: {
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: radius,
        padding: typeof padding === "number" ? padding + "px" : padding,
        boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        transition: "box-shadow var(--dur-base) var(--ease-lift), transform var(--dur-base) var(--ease-lift)",
        cursor: interactive ? "pointer" : "default",
        ...style
      }
    }, rest), children);
  }
  function Nudge({
    eyebrow = "From Aminy",
    children,
    actions = null,
    style = {}
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, #fff, var(--aminy-teal-50))",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: "var(--radius-xl)",
        padding: "16px 18px 16px 20px",
        ...style
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        left: 0,
        top: 16,
        bottom: 16,
        width: 3,
        background: "var(--aminy-teal-600)",
        borderRadius: "0 2px 2px 0"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-xs)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--aminy-teal-700)",
        fontWeight: "var(--fw-bold)",
        marginBottom: 6
      }
    }, eyebrow), /*#__PURE__*/React.createElement("p", {
      className: "aminy-nudge-tip",
      style: {
        margin: 0,
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: "var(--text-lg)",
        lineHeight: "var(--lh-snug)",
        letterSpacing: "-0.01em",
        color: "var(--color-text-strong)",
        textWrap: "pretty"
      }
    }, children), actions && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 12
      }
    }, actions));
  }
  function Stat({
    label,
    value,
    unit = null,
    caption = null,
    accent = false,
    style = {}
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "12px 14px",
        ...style
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-xs)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        fontWeight: "var(--fw-bold)"
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: "var(--fw-bold)",
        fontSize: "var(--text-2xl)",
        letterSpacing: "var(--ls-tight)",
        lineHeight: 1,
        marginTop: 6,
        color: accent ? "var(--aminy-teal-700)" : "var(--color-text-strong)"
      }
    }, value, unit && /*#__PURE__*/React.createElement("small", {
      style: {
        fontSize: "var(--text-sm)",
        color: "var(--color-text-muted)",
        fontWeight: "var(--fw-medium)",
        marginLeft: 2
      }
    }, unit)), caption && /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-xs)",
        color: "var(--color-text-muted)",
        marginTop: 4,
        lineHeight: 1.3
      }
    }, caption));
  }
  function Avatar({
    name = "",
    src = null,
    size = 40,
    tone = "teal",
    style = {}
  }) {
    const initials = name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
    const tones = {
      teal: {
        bg: "linear-gradient(135deg, var(--aminy-teal-400), var(--aminy-teal-700))",
        fg: "#fff"
      },
      child: {
        bg: "linear-gradient(135deg, #fde68a, var(--aminy-win-500))",
        fg: "#78350f"
      },
      navy: {
        bg: "linear-gradient(135deg, var(--aminy-navy-400), var(--aminy-navy-800))",
        fg: "#fff"
      },
      care: {
        bg: "linear-gradient(135deg, #c4b5fd, var(--aminy-care-600))",
        fg: "#fff"
      }
    };
    const t = tones[tone] || tones.teal;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "var(--radius-full)",
        background: src ? `center/cover no-repeat url(${src})` : t.bg,
        color: t.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-ui)",
        fontWeight: "var(--fw-bold)",
        fontSize: Math.round(size * 0.38),
        boxShadow: "var(--shadow-sm)",
        ...style
      }
    }, !src && initials);
  }
  const kit = {
    Button,
    Badge,
    Input,
    Card,
    Nudge,
    Stat,
    Avatar
  };
  window.AminyKit = kit;
  // Fill any primitives the compiled bundle hasn't exposed yet (without clobbering real ones),
  // so cards/kits render whether or not _ds_bundle.js is fresh.
  const ns = window.DesignSystem_39fb2b = window.DesignSystem_39fb2b || {};
  for (const k in kit) if (!ns[k]) ns[k] = kit[k];
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lib.jsx", error: String((e && e.message) || e) }); }

// ui_kits/motion.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Aminy motion helpers — shared across UI kits. Honors prefers-reduced-motion.
   Attaches window.AminyMotion: { useCountUp, Reveal, Thinking, useInView }. */
(function () {
  const R = React;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Animate a number from 0 → target once it mounts (or when `play` flips true).
  function useCountUp(target, {
    duration = 900,
    play = true,
    decimals = 0
  } = {}) {
    const [val, setVal] = R.useState(reduce ? target : 0);
    R.useEffect(() => {
      if (!play) return;
      if (reduce) {
        setVal(target);
        return;
      }
      let raf, start;
      const tick = t => {
        if (start == null) start = t;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        setVal(target * eased);
        if (p < 1) raf = requestAnimationFrame(tick);else setVal(target);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [target, play, duration]);
    return decimals ? Number(val).toFixed(decimals) : Math.round(val);
  }

  // Fade/rise a block in on mount, with optional stagger delay.
  function Reveal({
    children,
    delay = 0,
    y = 8,
    style = {},
    as = "div",
    ...rest
  }) {
    const Tag = as;
    const base = reduce ? {} : {
      animation: `aminy-rise var(--dur-slow) var(--ease-lift) both`,
      animationDelay: `${delay}ms`
    };
    return /*#__PURE__*/React.createElement(Tag, _extends({
      style: {
        ...base,
        ...style
      }
    }, rest), children);
  }

  // The "Aminy is thinking" dot pulse — calm, not a spinner.
  function Thinking({
    color = "var(--aminy-teal-500)",
    label = "Aminy is thinking"
  }) {
    return /*#__PURE__*/React.createElement("div", {
      role: "status",
      "aria-label": label,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5
      }
    }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        width: 7,
        height: 7,
        borderRadius: 999,
        background: color,
        animation: reduce ? "none" : `aminy-think 1s ease-in-out ${i * 0.18}s infinite`,
        opacity: reduce ? 0.6 : undefined
      }
    })));
  }

  // Fire `onEnter` once the node scrolls into view (for count-ups in scroll regions).
  function useInView(opts) {
    const ref = R.useRef(null);
    const [seen, setSeen] = R.useState(false);
    R.useEffect(() => {
      if (reduce || !ref.current || !("IntersectionObserver" in window)) {
        setSeen(true);
        return;
      }
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      }, opts || {
        threshold: 0.4
      });
      io.observe(ref.current);
      return () => io.disconnect();
    }, []);
    return [ref, seen];
  }
  window.AminyMotion = {
    useCountUp,
    Reveal,
    Thinking,
    useInView,
    reduce
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/motion.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/aifeatures.jsx
try { (() => {
/* Parent AI surfaces ported from the real app:
   - InsightsScreen  ← AnalyticsCharts.tsx (progress trends, patterns, mood, time-of-day)
   - CheckinsScreen  ← ActionItems.tsx (OneMedical-style conversational AI check-ins)
   - RemindersScreen ← AdaptiveReminders.tsx (AI-suggested times, tone, live preview)
   - ReportsScreen   ← AIReportGenerator.tsx (IEP / Progress / BCBA notes / Insurance letter)
   Exports: window.InsightsScreen, CheckinsScreen, RemindersScreen, ReportsScreen */
(function () {
  const {
    AIcon
  } = window;
  const R = React;
  const haptic = k => {
    try {
      window.aminyHaptic && window.aminyHaptic[k] && window.aminyHaptic[k]();
    } catch (e) {}
  };
  const toast = (msg, sub) => {
    try {
      window.aminyToast ? window.aminyToast(msg, sub) : null;
    } catch (e) {}
  };

  /* ---------- shared chrome ---------- */
  function Header({
    title,
    sub,
    onBack,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flexShrink: 0,
        padding: "8px 16px 12px",
        borderBottom: "1px solid var(--color-border)",
        background: "#fff"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic("light");
        onBack && onBack();
      },
      "aria-label": "Back",
      style: {
        width: 38,
        height: 38,
        borderRadius: 11,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "chevron",
      size: 18,
      style: {
        transform: "rotate(180deg)"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h2",
      style: {
        fontSize: 19,
        lineHeight: 1.15
      }
    }, title), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, sub)), right));
  }
  function Card({
    children,
    style
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 15,
        boxShadow: "var(--shadow-sm)",
        ...style
      }
    }, children);
  }
  function SectionLabel({
    icon,
    color,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 11
      }
    }, icon && /*#__PURE__*/React.createElement(AIcon, {
      name: icon,
      size: 17,
      style: {
        color: color || "var(--aminy-teal-600)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, children));
  }

  /* ============================================================
     1. INSIGHTS  (AnalyticsCharts)
     ============================================================ */
  const PROGRESS = [52, 49, 55, 58, 54, 61, 59, 64, 62, 68, 66, 71, 69, 74];
  const PATTERNS = [{
    label: "Morning transitions",
    v: 85,
    trend: "up"
  }, {
    label: "Mealtime cooperation",
    v: 68,
    trend: "stable"
  }, {
    label: "Bedtime routine",
    v: 52,
    trend: "up"
  }, {
    label: "Task completion",
    v: 72,
    trend: "up"
  }, {
    label: "Emotional regulation",
    v: 58,
    trend: "stable"
  }];
  const MOODS = [{
    label: "Happy",
    pct: 45,
    c: "var(--aminy-grow-500)"
  }, {
    label: "Calm",
    pct: 30,
    c: "var(--aminy-teal-500)"
  }, {
    label: "Frustrated",
    pct: 15,
    c: "var(--aminy-win-500)"
  }, {
    label: "Overwhelmed",
    pct: 10,
    c: "#e0796b"
  }];
  const TOD = [5, 9, 15, 12, 8, 10, 14, 18, 11, 4];
  function LineChart({
    data
  }) {
    const W = 320,
      H = 120,
      pad = 8;
    const max = Math.max(...data),
      min = Math.min(...data),
      range = max - min || 1;
    const pts = data.map((v, i) => [pad + i / (data.length - 1) * (W - pad * 2), pad + (H - pad * 2) * (1 - (v - min) / range)]);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H - pad} L${pts[0][0].toFixed(1)} ${H - pad} Z`;
    return /*#__PURE__*/React.createElement("svg", {
      viewBox: `0 0 ${W} ${H}`,
      style: {
        width: "100%",
        height: "auto",
        display: "block"
      }
    }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
      id: "insArea",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: "var(--aminy-teal-500)",
      stopOpacity: "0.22"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: "var(--aminy-teal-500)",
      stopOpacity: "0"
    }))), [0.25, 0.5, 0.75].map(t => /*#__PURE__*/React.createElement("line", {
      key: t,
      x1: pad,
      y1: pad + (H - pad * 2) * t,
      x2: W - pad,
      y2: pad + (H - pad * 2) * t,
      stroke: "var(--color-border)",
      strokeDasharray: "3 4"
    })), /*#__PURE__*/React.createElement("path", {
      d: area,
      fill: "url(#insArea)"
    }), /*#__PURE__*/React.createElement("path", {
      d: line,
      fill: "none",
      stroke: "var(--aminy-teal-600)",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }), pts.filter((_, i) => i === pts.length - 1).map((p, i) => /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: p[0],
      cy: p[1],
      r: "4",
      fill: "#fff",
      stroke: "var(--aminy-teal-600)",
      strokeWidth: "2.5"
    })));
  }
  function Donut({
    data
  }) {
    const size = 92,
      r = 38,
      cx = size / 2,
      cy = size / 2,
      C = 2 * Math.PI * r;
    let off = 0;
    return /*#__PURE__*/React.createElement("svg", {
      viewBox: `0 0 ${size} ${size}`,
      style: {
        width: size,
        height: size,
        flexShrink: 0,
        transform: "rotate(-90deg)"
      }
    }, data.map((d, i) => {
      const len = d.pct / 100 * C;
      const el = /*#__PURE__*/React.createElement("circle", {
        key: i,
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        stroke: d.c,
        strokeWidth: "12",
        strokeDasharray: `${len} ${C - len}`,
        strokeDashoffset: -off
      });
      off += len;
      return el;
    }));
  }
  function InsightsScreen({
    onBack
  }) {
    const [range, setRange] = R.useState("month");
    const RANGES = [["week", "Week"], ["month", "Month"], ["quarter", "3 mo"]];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement(Header, {
      title: "Insights",
      sub: "Kai's gentle progress",
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "14px 16px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 13
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7
      }
    }, RANGES.map(([id, lb]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => {
        haptic("light");
        setRange(id);
      },
      style: {
        flex: 1,
        padding: "8px 0",
        borderRadius: 11,
        border: range === id ? "1.5px solid var(--aminy-teal-500)" : "1px solid var(--color-border)",
        background: range === id ? "var(--aminy-teal-50)" : "#fff",
        color: range === id ? "var(--aminy-teal-700)" : "var(--color-text-muted)",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer"
      }
    }, lb))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement(SectionLabel, {
      icon: "trending",
      color: "var(--aminy-teal-600)"
    }, "Progress over time"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: "var(--aminy-grow-600)",
        background: "var(--aminy-grow-50)",
        padding: "3px 9px",
        borderRadius: 999
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "trending",
      size: 12
    }), "+18%")), /*#__PURE__*/React.createElement(LineChart, {
      data: PROGRESS
    })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SectionLabel, {
      icon: "heart",
      color: "#e0796b"
    }, "Mood distribution"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Donut, {
      data: MOODS
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 7
      }
    }, MOODS.map(m => /*#__PURE__*/React.createElement("div", {
      key: m.label,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: 3,
        background: m.c,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-muted)",
        flex: 1
      }
    }, m.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, m.pct, "%")))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SectionLabel, {
      icon: "barChart",
      color: "var(--jr-primary)"
    }, "Behavior patterns"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, PATTERNS.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.label
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: "var(--color-text)",
        fontWeight: 500,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        marginRight: 8
      }
    }, p.label), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12.5,
        color: "var(--color-text-muted)",
        fontWeight: 600
      }
    }, p.v, "%", /*#__PURE__*/React.createElement(AIcon, {
      name: "trending",
      size: 12,
      style: {
        color: p.trend === "up" ? "var(--aminy-grow-600)" : "var(--color-text-subtle)",
        transform: p.trend === "stable" ? "rotate(0deg)" : "none",
        opacity: p.trend === "stable" ? 0.4 : 1
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 7,
        borderRadius: 999,
        background: "var(--aminy-mist-deep)",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: "100%",
        width: p.v + "%",
        borderRadius: 999,
        background: "linear-gradient(90deg,var(--aminy-teal-400),var(--aminy-teal-600))"
      }
    })))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SectionLabel, {
      icon: "clock",
      color: "var(--aminy-navy-600)"
    }, "Activity by time of day"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-end",
        gap: 4,
        height: 70
      }
    }, TOD.map((v, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      title: v + " activities",
      style: {
        flex: 1,
        height: Math.max(8, v / Math.max(...TOD) * 100) + "%",
        borderRadius: "5px 5px 0 0",
        background: `rgba(42,125,153,${0.25 + 0.6 * (v / Math.max(...TOD))})`
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: 6,
        fontSize: 10.5,
        color: "var(--color-text-subtle)"
      }
    }, /*#__PURE__*/React.createElement("span", null, "6a"), /*#__PURE__*/React.createElement("span", null, "12p"), /*#__PURE__*/React.createElement("span", null, "6p"), /*#__PURE__*/React.createElement("span", null, "10p"))), /*#__PURE__*/React.createElement("div", {
      style: {
        borderRadius: 16,
        padding: 15,
        background: "linear-gradient(135deg,var(--aminy-teal-50),var(--aminy-mist))",
        border: "1px solid var(--aminy-teal-200)"
      }
    }, /*#__PURE__*/React.createElement(SectionLabel, {
      icon: "sparkles",
      color: "var(--aminy-teal-700)"
    }, "What Aminy noticed"), /*#__PURE__*/React.createElement("ul", {
      style: {
        margin: 0,
        paddingLeft: 18,
        display: "flex",
        flexDirection: "column",
        gap: 7
      }
    }, /*#__PURE__*/React.createElement("li", {
      style: {
        fontSize: 13,
        color: "var(--aminy-teal-800)",
        lineHeight: 1.45
      }
    }, "Peak focus is ", /*#__PURE__*/React.createElement("strong", null, "4\u20138pm"), " \u2014 a good window for harder practice."), /*#__PURE__*/React.createElement("li", {
      style: {
        fontSize: 13,
        color: "var(--aminy-teal-800)",
        lineHeight: 1.45
      }
    }, "Morning transitions improved ", /*#__PURE__*/React.createElement("strong", null, "15%"), " over two weeks."), /*#__PURE__*/React.createElement("li", {
      style: {
        fontSize: 13,
        color: "var(--aminy-teal-800)",
        lineHeight: 1.45
      }
    }, "Keep the bedtime visual schedule \u2014 it's working.")))));
  }

  /* ============================================================
     2. CHECK-INS  (ActionItems — conversational AI)
     ============================================================ */
  const CHECKINS = [{
    id: "energy",
    icon: "heart",
    title: "Daily energy check",
    desc: "Quick check-in on how you're doing today",
    pri: "high",
    min: 2,
    color: "var(--aminy-win-600)",
    bg: "var(--aminy-win-50)",
    greet: "Hi Maya — before we talk about Kai, how are you doing today? On a scale of running-on-empty to fully-charged, where are you?",
    replies: ["Honestly pretty drained", "Doing okay today", "Actually a good day"],
    followup: "Thank you for being honest — drained days are real, especially this week. One small thing: could you steal ten quiet minutes after Kai's asleep tonight, just for you? I've got the rest. 💛"
  }, {
    id: "stress",
    icon: "brain",
    title: "Caregiver stress check",
    desc: "Understanding your stress to support you better",
    pri: "medium",
    min: 5,
    color: "var(--jr-primary)",
    bg: "var(--jr-purple-50)",
    greet: "I'd love to understand your week a little better so I can help more. When you think about time for yourself versus everything caregiving asks of you — how's that balance feeling lately?",
    replies: ["There's no time for me", "It comes and goes", "Managing alright"],
    followup: "That's one of the heaviest parts and you're carrying it well. You named it, which matters. I'll keep surfacing the small wins so the load feels lighter — and remember Ask-a-BCBA is there for the bigger questions."
  }, {
    id: "sensory",
    icon: "sparkles",
    title: "Sensory preferences",
    desc: "Help me understand Kai's sensory world",
    pri: "medium",
    min: 5,
    color: "var(--aminy-teal-700)",
    bg: "var(--aminy-teal-50)",
    greet: "Let's get to know how Kai experiences the world. When things get loud or busy — a store, a party — what do you usually see from him?",
    replies: ["He covers his ears", "He gets really active", "He shuts down"],
    followup: "That tells me a lot — sounds like Kai is sensory-sensitive to noise. I'll factor that into the activities I suggest and the calming tools in Ease. Noise-reducing headphones in busy places can be a small game-changer."
  }, {
    id: "comm",
    icon: "users",
    title: "Communication style",
    desc: "Learn how Kai expresses himself",
    pri: "high",
    min: 4,
    color: "var(--aminy-navy-700)",
    bg: "var(--aminy-navy-50)",
    greet: "How does Kai usually let you know what he wants — words, pointing, taking your hand, something else?",
    replies: ["A few words", "Mostly pointing", "He pulls me to it"],
    followup: "Great — emerging words plus gestures is a real foundation to build on. I'll keep my tips at the right level and celebrate every new word with you. Narrating what he points to ('You want the cup!') is a lovely next step."
  }, {
    id: "sleep",
    icon: "moon",
    title: "Sleep patterns",
    desc: "How has sleep been going lately?",
    pri: "low",
    min: 3,
    color: "var(--aminy-navy-600)",
    bg: "var(--aminy-navy-50)",
    greet: "Quick one on sleep — what does a typical bedtime look like right now, and how long does it usually take Kai to settle?",
    replies: ["It's a long battle", "Pretty smooth lately", "Lots of night wakings"],
    followup: "Thanks — that helps me tailor advice. A predictable 3-step wind-down (bath → book → lights low) at the same time each night is the single biggest lever. Want me to add it to your plan?"
  }, {
    id: "eating",
    icon: "target",
    title: "Eating & mealtimes",
    desc: "Quick check on how meals are going",
    pri: "low",
    min: 3,
    color: "var(--aminy-grow-600)",
    bg: "var(--aminy-grow-50)",
    greet: "How are mealtimes feeling these days — roughly how many foods is Kai comfortable eating right now?",
    replies: ["A very short list", "It varies a lot", "He's pretty flexible"],
    followup: "Feeding challenges are exhausting and you're not alone in this. We never pressure — just gentle exposure. Putting one new food *near* a safe food, no expectation to eat it, is a kind first step."
  }];
  function CheckinChat({
    item,
    onClose,
    onDone
  }) {
    const [msgs, setMsgs] = R.useState([{
      who: "ai",
      text: item.greet
    }]);
    const [stage, setStage] = R.useState(0); // 0 = awaiting reply, 1 = done
    const endRef = R.useRef(null);
    R.useEffect(() => {
      if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
    }, [msgs]);
    function pick(r) {
      haptic("light");
      setMsgs(m => [...m, {
        who: "me",
        text: r
      }]);
      setTimeout(() => {
        setMsgs(m => [...m, {
          who: "ai",
          text: item.followup
        }]);
        setStage(1);
      }, 650);
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        background: "var(--aminy-mist)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flexShrink: 0,
        padding: "10px 14px",
        borderBottom: "1px solid var(--color-border)",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 11,
        background: item.bg,
        color: item.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: item.icon,
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, item.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)"
      }
    }, "~", item.min, " min \xB7 with Aminy")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic("light");
        onClose();
      },
      "aria-label": "Close",
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        cursor: "pointer",
        color: "var(--color-text-muted)",
        fontSize: 17
      }
    }, "\u2715")), /*#__PURE__*/React.createElement("div", {
      ref: endRef,
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, msgs.map((m, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        justifyContent: m.who === "me" ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 7
      }
    }, m.who === "ai" && /*#__PURE__*/React.createElement("div", {
      style: {
        width: 26,
        height: 26,
        borderRadius: 999,
        background: "linear-gradient(135deg,var(--aminy-teal-500),var(--aminy-teal-700))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 13,
      style: {
        color: "#fff"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "78%",
        padding: "10px 13px",
        borderRadius: 16,
        borderBottomLeftRadius: m.who === "ai" ? 5 : 16,
        borderBottomRightRadius: m.who === "me" ? 5 : 16,
        background: m.who === "me" ? "var(--aminy-teal-600)" : "#fff",
        color: m.who === "me" ? "#fff" : "var(--color-text)",
        border: m.who === "me" ? "none" : "1px solid var(--color-border)",
        fontSize: 13.5,
        lineHeight: 1.5,
        boxShadow: "var(--shadow-sm)"
      }
    }, m.text)))), /*#__PURE__*/React.createElement("div", {
      style: {
        flexShrink: 0,
        padding: "12px 14px",
        borderTop: "1px solid var(--color-border)",
        background: "#fff"
      }
    }, stage === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, item.replies.map(r => /*#__PURE__*/React.createElement("button", {
      key: r,
      onClick: () => pick(r),
      style: {
        width: "100%",
        textAlign: "left",
        padding: "11px 14px",
        borderRadius: 12,
        border: "1px solid var(--aminy-teal-200)",
        background: "var(--aminy-teal-50)",
        color: "var(--aminy-teal-800)",
        fontFamily: "var(--font-ui)",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: "pointer"
      }
    }, r))) : /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic("success");
        onDone(item.id);
      },
      style: {
        width: "100%",
        padding: "13px",
        borderRadius: 13,
        border: "none",
        background: "var(--aminy-teal-600)",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontSize: 14.5,
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        boxShadow: "var(--shadow-cta)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "check",
      size: 17
    }), "Done \u2014 thanks for checking in")));
  }
  function CheckinsScreen({
    onBack
  }) {
    const [done, setDone] = R.useState(() => {
      try {
        return JSON.parse(localStorage.getItem("aminy-checkins") || "{}");
      } catch (e) {
        return {};
      }
    });
    const [active, setActive] = R.useState(null);
    function complete(id) {
      const next = {
        ...done,
        [id]: true
      };
      setDone(next);
      localStorage.setItem("aminy-checkins", JSON.stringify(next));
      setActive(null);
      toast("Check-in saved", "Aminy will remember this");
    }
    const items = [...CHECKINS].sort((a, b) => (done[a.id] ? 1 : 0) - (done[b.id] ? 1 : 0));
    const left = CHECKINS.filter(c => !done[c.id]).length;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement(Header, {
      title: "Check-ins",
      sub: "Quick chats help Aminy help you",
      onBack: onBack,
      right: left > 0 ? /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12.5,
          fontWeight: 700,
          color: "#fff",
          background: "var(--aminy-teal-600)",
          padding: "4px 10px",
          borderRadius: 999
        }
      }, left, " new") : null
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "14px 16px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        borderRadius: 14,
        padding: "12px 14px",
        background: "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-200)",
        display: "flex",
        gap: 10,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 17,
      style: {
        color: "var(--aminy-teal-700)",
        marginTop: 1,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--aminy-teal-800)",
        lineHeight: 1.45
      }
    }, "No forms. Just a short conversation \u2014 Aminy quietly turns it into a better profile for Kai and you.")), items.map(it => {
      const isDone = !!done[it.id];
      return /*#__PURE__*/React.createElement("button", {
        key: it.id,
        disabled: isDone,
        onClick: () => {
          if (!isDone) {
            haptic("light");
            setActive(it);
          }
        },
        style: {
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "14px 15px",
          borderRadius: 16,
          border: "1px solid var(--color-border)",
          background: isDone ? "var(--aminy-mist)" : "#fff",
          cursor: isDone ? "default" : "pointer",
          boxShadow: isDone ? "none" : "var(--shadow-sm)",
          opacity: isDone ? 0.72 : 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 42,
          height: 42,
          borderRadius: 13,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDone ? "var(--aminy-grow-50)" : it.bg,
          color: isDone ? "var(--aminy-grow-600)" : it.color
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: isDone ? "check" : it.icon,
        size: 20
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 7
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14.5,
          fontWeight: 700,
          color: isDone ? "var(--color-text-muted)" : "var(--color-text-strong)"
        }
      }, it.title), !isDone && it.pri === "high" && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: "var(--aminy-win-600)",
          background: "var(--aminy-win-50)",
          padding: "2px 7px",
          borderRadius: 999,
          textTransform: "uppercase",
          letterSpacing: "0.04em"
        }
      }, "Suggested")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--color-text-muted)",
          marginTop: 2
        }
      }, isDone ? "Completed — Aminy remembers this" : it.desc)), !isDone && /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: "var(--color-text-subtle)",
          flexShrink: 0
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: "clock",
        size: 14
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          fontWeight: 600
        }
      }, it.min, "m")));
    })), active && /*#__PURE__*/React.createElement(CheckinChat, {
      item: active,
      onClose: () => setActive(null),
      onDone: complete
    }));
  }

  /* ============================================================
     3. REMINDERS  (AdaptiveReminders)
     ============================================================ */
  const TONES = [["gentle", "Gentle"], ["encouraging", "Encouraging"], ["playful", "Playful"]];
  const REM_MSG = {
    gentle: "Gentle reminder: it's time for Kai's morning routine 🌅",
    encouraging: "You've got this — time for Kai's morning routine 💪",
    playful: "Rise and shine! Let's start the day with Kai 🎉"
  };
  function RoutineRow({
    label,
    desc,
    time,
    rec,
    onChange
  }) {
    const HOURS = Array.from({
      length: 12
    }, (_, i) => i + 1);
    const sel = {
      padding: "7px 8px",
      borderRadius: 9,
      border: "1px solid var(--color-border)",
      background: "#fff",
      color: "var(--color-text)",
      fontFamily: "var(--font-ui)",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, desc)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("select", {
      value: time.h,
      onChange: e => onChange({
        ...time,
        h: +e.target.value
      }),
      style: sel
    }, HOURS.map(h => /*#__PURE__*/React.createElement("option", {
      key: h,
      value: h
    }, h))), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)"
      }
    }, ":"), /*#__PURE__*/React.createElement("select", {
      value: time.m,
      onChange: e => onChange({
        ...time,
        m: +e.target.value
      }),
      style: sel
    }, [0, 15, 30, 45].map(m => /*#__PURE__*/React.createElement("option", {
      key: m,
      value: m
    }, String(m).padStart(2, "0")))), /*#__PURE__*/React.createElement("select", {
      value: time.p,
      onChange: e => onChange({
        ...time,
        p: e.target.value
      }),
      style: sel
    }, /*#__PURE__*/React.createElement("option", null, "AM"), /*#__PURE__*/React.createElement("option", null, "PM")))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 10px",
        borderRadius: 10,
        background: "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-200)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "lightbulb",
      size: 14,
      style: {
        color: "var(--aminy-teal-700)",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        fontWeight: 600,
        color: "var(--aminy-teal-800)"
      }
    }, rec)));
  }
  function RemindersScreen({
    onBack
  }) {
    const [on, setOn] = R.useState(true);
    const [tone, setTone] = R.useState("gentle");
    const [morning, setMorning] = R.useState({
      h: 7,
      m: 30,
      p: "AM"
    });
    const [aft, setAft] = R.useState({
      h: 3,
      m: 0,
      p: "PM"
    });
    const [eve, setEve] = R.useState({
      h: 7,
      m: 30,
      p: "PM"
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement(Header, {
      title: "Reminders",
      sub: "Aminy nudges, on your schedule",
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "14px 16px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 13
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "bell",
      size: 20,
      style: {
        color: on ? "var(--aminy-teal-600)" : "var(--color-text-subtle)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "Send me reminders"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, "For routines, practice & wind-down")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic("light");
        setOn(v => !v);
      },
      "aria-label": "Toggle reminders",
      style: {
        width: 46,
        height: 28,
        borderRadius: 999,
        border: "none",
        background: on ? "var(--aminy-teal-600)" : "var(--aminy-mist-deep)",
        position: "relative",
        cursor: "pointer",
        transition: "background var(--dur-fast)",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: 3,
        left: on ? 21 : 3,
        width: 22,
        height: 22,
        borderRadius: 999,
        background: "#fff",
        boxShadow: "var(--shadow-sm)",
        transition: "left var(--dur-fast)"
      }
    })))), on && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Card, {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(RoutineRow, {
      label: "Morning routine",
      desc: "Start the day with structure",
      time: morning,
      rec: "Aminy suggests 7:15 AM from your patterns",
      onChange: setMorning
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: "var(--color-border)"
      }
    }), /*#__PURE__*/React.createElement(RoutineRow, {
      label: "Afternoon practice",
      desc: "After-school learning",
      time: aft,
      rec: "Aminy suggests 3:15 PM from your patterns",
      onChange: setAft
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: "var(--color-border)"
      }
    }), /*#__PURE__*/React.createElement(RoutineRow, {
      label: "Evening wind-down",
      desc: "Calming before bed",
      time: eve,
      rec: "Aminy suggests 7:15 PM from your patterns",
      onChange: setEve
    })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SectionLabel, {
      icon: "heart",
      color: "#e0796b"
    }, "Reminder tone"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7
      }
    }, TONES.map(([id, lb]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => {
        haptic("light");
        setTone(id);
      },
      style: {
        flex: 1,
        padding: "10px 0",
        borderRadius: 11,
        border: tone === id ? "1.5px solid var(--aminy-teal-500)" : "1px solid var(--color-border)",
        background: tone === id ? "var(--aminy-teal-50)" : "#fff",
        color: tone === id ? "var(--aminy-teal-700)" : "var(--color-text-muted)",
        fontFamily: "var(--font-ui)",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer"
      }
    }, lb))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        padding: "12px 13px",
        borderRadius: 12,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        display: "flex",
        gap: 10,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 30,
        height: 30,
        borderRadius: 9,
        background: "#fff",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "bell",
      size: 15,
      style: {
        color: "var(--aminy-teal-600)"
      }
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        color: "var(--color-text-subtle)",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }
    }, "Preview"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text)",
        marginTop: 2,
        lineHeight: 1.4
      }
    }, REM_MSG[tone])))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic("success");
        toast("Reminder settings saved", "Your preferences are updated");
      },
      style: {
        width: "100%",
        padding: "14px",
        borderRadius: 14,
        border: "none",
        background: "var(--aminy-teal-600)",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "var(--shadow-cta)"
      }
    }, "Save settings"))));
  }

  /* ============================================================
     4. REPORTS  (AIReportGenerator)
     ============================================================ */
  const REPORTS = [{
    id: "progress",
    title: "Progress report",
    desc: "Goal tracking & data summary, school-ready",
    tier: "Core",
    body: "SUMMARY\nKai has shown steady, encouraging gains this period. Morning-transition independence rose from 45% to 78% of days. Expressive language expanded from ~12 to ~20 functional words.\n\nGOALS\n• Independent morning routine — On track (78%)\n• Two-word requests — Emerging (progressing)\n• Tolerating transitions — Met\n\nRECOMMENDATIONS\nContinue the visual schedule and 4–8pm practice window where focus peaks."
  }, {
    id: "iep",
    title: "IEP document",
    desc: "SMART goals & accommodations for school",
    tier: "Plus",
    body: "PRESENT LEVELS\nKai is a curious, affectionate 7-year-old who communicates with emerging words and gestures...\n\nSMART GOALS\n1. By [date], Kai will independently complete a 4-step morning routine on 8/10 days.\n2. By [date], Kai will use two-word requests in 70% of opportunities across settings.\n\nACCOMMODATIONS\n• Visual schedule • Noise-reducing headphones in loud settings • Movement breaks every 30 min."
  }, {
    id: "bcba",
    title: "BCBA session notes",
    desc: "Professional documentation for sessions",
    tier: "Plus",
    body: "SESSION NOTE\nDate: [auto] · Duration: 60 min · Setting: Home\n\nTARGETS ADDRESSED\n• Manding (requesting) — 14 trials, 79% independent\n• Transition tolerance — 6 transitions, 5 successful\n\nDATA & CLINICAL IMPRESSION\nKai responded well to first-then visuals. Recommend fading prompts on manding next session."
  }, {
    id: "coverage",
    title: "Insurance letter",
    desc: "Medical-necessity letter for authorization",
    tier: "Plus",
    body: "RE: Medical Necessity — ABA Services for Kai [last name]\n\nTo Whom It May Concern,\nThis letter supports the medical necessity of continued ABA therapy. Kai carries a diagnosis of Autism Spectrum Disorder and demonstrates needs in communication, adaptive transitions, and self-regulation...\n\nRequested: 20 hrs/week direct ABA + 2 hrs BCBA supervision."
  }];
  function ReportsScreen({
    onBack
  }) {
    const [gen, setGen] = R.useState({}); // id -> 'loading' | 'done'
    const [open, setOpen] = R.useState(null);
    function generate(id) {
      haptic("light");
      setGen(g => ({
        ...g,
        [id]: "loading"
      }));
      setTimeout(() => {
        setGen(g => ({
          ...g,
          [id]: "done"
        }));
        haptic("success");
      }, 1400);
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement(Header, {
      title: "AI reports",
      sub: "Clinical documents from Kai's data",
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "14px 16px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        borderRadius: 14,
        padding: "12px 14px",
        background: "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-200)",
        display: "flex",
        gap: 10,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 17,
      style: {
        color: "var(--aminy-teal-700)",
        marginTop: 1,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--aminy-teal-800)",
        lineHeight: 1.45
      }
    }, "Each report uses Kai's real goals, activities & progress \u2014 ready for schools, therapists, and insurers. A BCBA reviews clinical docs before they're signed.")), REPORTS.map(rp => {
      const st = gen[rp.id];
      return /*#__PURE__*/React.createElement(Card, {
        key: rp.id,
        style: {
          padding: 0,
          overflow: "hidden"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 12,
          padding: 14
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 42,
          height: 42,
          borderRadius: 12,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--aminy-navy-50)",
          color: "var(--aminy-navy-700)"
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: "file",
        size: 20
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 7
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14.5,
          fontWeight: 700,
          color: "var(--color-text-strong)"
        }
      }, rp.title), st === "done" && /*#__PURE__*/React.createElement("span", {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          fontSize: 10.5,
          fontWeight: 700,
          color: "var(--aminy-grow-600)",
          background: "var(--aminy-grow-50)",
          padding: "2px 7px",
          borderRadius: 999
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: "check",
        size: 11
      }), "Ready")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--color-text-muted)",
          marginTop: 2
        }
      }, rp.desc), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 8,
          marginTop: 11
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => st === "done" ? setOpen(rp) : generate(rp.id),
        disabled: st === "loading",
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 13px",
          borderRadius: 10,
          border: "none",
          background: st === "done" ? "var(--aminy-navy-700)" : "var(--aminy-teal-600)",
          color: "#fff",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          fontWeight: 700,
          cursor: st === "loading" ? "default" : "pointer",
          opacity: st === "loading" ? 0.7 : 1
        }
      }, st === "loading" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
        className: "aminy-spin",
        style: {
          width: 12,
          height: 12,
          border: "2px solid rgba(255,255,255,0.4)",
          borderTopColor: "#fff",
          borderRadius: 999,
          display: "inline-block"
        }
      }), "Generating\u2026") : st === "done" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AIcon, {
        name: "file",
        size: 13
      }), "View") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AIcon, {
        name: "sparkles",
        size: 13
      }), "Generate")), st === "done" && /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          haptic("light");
          toast("Downloaded", rp.title + ".pdf");
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 13px",
          borderRadius: 10,
          border: "1px solid var(--color-border)",
          background: "#fff",
          color: "var(--color-text)",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          fontWeight: 700,
          cursor: "pointer"
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: "download",
        size: 13
      }), "PDF")))), st === "done" && /*#__PURE__*/React.createElement("div", {
        style: {
          borderTop: "1px solid var(--color-border)",
          padding: "11px 14px",
          background: "var(--aminy-mist)",
          maxHeight: 92,
          overflow: "hidden",
          fontSize: 11.5,
          color: "var(--color-text-muted)",
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
          position: "relative"
        }
      }, rp.body.slice(0, 220), "\u2026", /*#__PURE__*/React.createElement("div", {
        style: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 32,
          background: "linear-gradient(transparent,var(--aminy-mist))"
        }
      })));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 4px",
        color: "var(--color-text-subtle)",
        fontSize: 11,
        lineHeight: 1.4
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "shield",
      size: 14,
      style: {
        flexShrink: 0
      }
    }), "Documents contain PHI. Stored securely and shared only with your consent.")), open && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        background: "#fff"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flexShrink: 0,
        padding: "10px 14px",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(null),
      "aria-label": "Close",
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        cursor: "pointer",
        color: "var(--color-text-muted)",
        fontSize: 17
      }
    }, "\u2715"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, open.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-muted)"
      }
    }, "Kai \xB7 ", new Date().toLocaleDateString())), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic("light");
        toast("Downloaded", open.title + ".pdf");
      },
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 10,
        border: "none",
        background: "var(--aminy-teal-600)",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "download",
      size: 13
    }), "PDF")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "18px 18px 28px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/aminy_logo.png",
      alt: "aminy",
      style: {
        height: 26,
        width: "auto"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--color-text-subtle)",
        marginLeft: "auto"
      }
    }, "Reviewed by Dr. A. Morales, BCBA-D")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "10px 12px",
        borderRadius: 10,
        background: "var(--aminy-win-50)",
        border: "1px solid var(--aminy-win-200)",
        fontSize: 11,
        color: "var(--aminy-win-700)",
        marginBottom: 16
      }
    }, "CONFIDENTIAL \u2014 contains protected health information (PHI). Handle per HIPAA."), /*#__PURE__*/React.createElement("pre", {
      style: {
        margin: 0,
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        color: "var(--color-text)",
        whiteSpace: "pre-wrap",
        lineHeight: 1.6
      }
    }, open.body))), /*#__PURE__*/React.createElement("style", null, `@keyframes aminySpin{to{transform:rotate(360deg)}} .aminy-spin{animation:aminySpin .7s linear infinite}`));
  }
  Object.assign(window, {
    InsightsScreen,
    CheckinsScreen,
    RemindersScreen,
    ReportsScreen
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/aifeatures.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/app.jsx
try { (() => {
/* Parent app router. Mounts the phone, switches screens, persists tab. window → #root */
(function () {
  const {
    AIcon,
    PhoneShell,
    BottomNav,
    HomeScreen,
    AskScreen,
    CalmScreen,
    PlanScreen,
    Onboarding,
    BcbaScreen,
    TeleScreen,
    PlansScreen,
    MarketScreen,
    SessionScreen,
    SettingsScreen,
    VaultScreen,
    CoverageScreen,
    CommunityScreen,
    ReportScreen,
    InsightsScreen,
    CheckinsScreen,
    RemindersScreen,
    ReportsScreen
  } = window;
  const MORE_ITEMS = [{
    icon: "users",
    label: "Find your guide",
    note: "Browse & book BCBAs, SLPs, OTs",
    tone: "var(--aminy-teal-700)",
    bg: "var(--aminy-teal-50)"
  }, {
    icon: "video",
    label: "TeleABA visits",
    note: "Book a session, see your team",
    tone: "var(--aminy-teal-700)",
    bg: "var(--aminy-teal-50)"
  }, {
    icon: "sparkles",
    label: "Ease",
    note: "Hand the phone over — it calms with them",
    tone: "var(--jr-primary)",
    bg: "var(--jr-purple-50)"
  }, {
    icon: "shield",
    label: "Message your BCBA",
    note: "Dr. Morales · usually replies in a day",
    tone: "var(--aminy-teal-700)",
    bg: "var(--aminy-teal-50)"
  }, {
    icon: "file",
    label: "Document vault",
    note: "Reports, IEPs, assessments",
    tone: "var(--aminy-navy-700)",
    bg: "var(--aminy-navy-50)"
  }, {
    icon: "shield",
    label: "Coverage",
    note: "Insurance & authorizations",
    tone: "var(--aminy-navy-700)",
    bg: "var(--aminy-navy-50)"
  }, {
    icon: "users",
    label: "Community",
    note: "Parents who get it",
    tone: "var(--aminy-grow-600)",
    bg: "var(--aminy-grow-50)"
  }, {
    icon: "trending",
    label: "Insights",
    note: "Kai's progress, patterns & mood",
    tone: "var(--aminy-teal-700)",
    bg: "var(--aminy-teal-50)"
  }, {
    icon: "heart",
    label: "Check-ins",
    note: "Quick AI chats that tune your support",
    tone: "var(--aminy-win-600)",
    bg: "var(--aminy-win-50)"
  }, {
    icon: "file",
    label: "AI reports",
    note: "IEP, progress & insurance letters",
    tone: "var(--aminy-navy-700)",
    bg: "var(--aminy-navy-50)"
  }, {
    icon: "bell",
    label: "Reminders",
    note: "Gentle nudges on your schedule",
    tone: "var(--aminy-grow-600)",
    bg: "var(--aminy-grow-50)"
  }, {
    icon: "trending",
    label: "Weekly report",
    note: "Kai's gentle progress",
    tone: "var(--aminy-win-600)",
    bg: "var(--aminy-win-50)"
  }];
  function MoreScreen({
    onRestart,
    onNav
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "8px 18px 18px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        margin: "2px 0 14px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h2",
      style: {
        fontSize: 22
      }
    }, "More"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onNav && onNav("settings"),
      "aria-label": "Settings",
      style: {
        width: 38,
        height: 38,
        borderRadius: 11,
        background: "#fff",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)",
        boxShadow: "var(--shadow-sm)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "settings",
      size: 19
    }))), /*#__PURE__*/React.createElement("button", {
      onClick: () => onNav && onNav("plans"),
      style: {
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        border: "1px solid var(--aminy-teal-200)",
        background: "linear-gradient(135deg,var(--aminy-teal-600),var(--aminy-teal-800))",
        borderRadius: 18,
        padding: "15px 16px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 13,
        boxShadow: "var(--shadow-cta)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: 12,
        background: "rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 20,
      style: {
        color: "#fff"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: "#fff"
      }
    }, "4 days left in your Core trial"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "rgba(255,255,255,0.85)",
        marginTop: 1
      }
    }, "Keep unlimited AI, IEP reading & more")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--aminy-teal-700)",
        background: "#fff",
        padding: "7px 12px",
        borderRadius: 999,
        whiteSpace: "nowrap"
      }
    }, "See plans")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, MORE_ITEMS.map((m, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => {
        if (m.label === "Ease") {
          window.aminyHaptic && window.aminyHaptic.medium();
          window.location.href = "../ease/index.html";
          return;
        }
        const map = {
          "Find your guide": "market",
          "TeleABA visits": "tele",
          "Message your BCBA": "bcba",
          "Document vault": "vault",
          "Coverage": "coverage",
          "Community": "community",
          "Weekly report": "report",
          "Insights": "insights",
          "Check-ins": "checkins",
          "AI reports": "reports",
          "Reminders": "reminders"
        };
        if (map[m.label] && onNav) onNav(map[m.label]);
      },
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        boxShadow: "var(--shadow-sm)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: 12,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: m.bg,
        color: m.tone
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: m.icon,
      size: 20
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, m.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, m.note)), /*#__PURE__*/React.createElement(AIcon, {
      name: "chevron",
      size: 18,
      style: {
        color: "var(--color-text-subtle)"
      }
    })))), /*#__PURE__*/React.createElement("button", {
      onClick: onRestart,
      style: {
        marginTop: 16,
        width: "100%",
        padding: "12px",
        borderRadius: 12,
        border: "1px dashed var(--color-border-strong)",
        background: "transparent",
        color: "var(--color-text-muted)",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer"
      }
    }, "\u21BA Replay onboarding (demo)"));
  }
  function App() {
    const [intro, setIntro] = React.useState(() => localStorage.getItem("aminy-onboarded") !== "1" && localStorage.getItem("aminy-intro-seen") !== "1");
    const [onboarded, setOnboarded] = React.useState(() => localStorage.getItem("aminy-onboarded") === "1");
    const [tab, setTab] = React.useState(() => localStorage.getItem("aminy-parent-tab") || "home");
    const [inSession, setInSession] = React.useState(false);
    React.useEffect(() => {
      localStorage.setItem("aminy-parent-tab", tab);
    }, [tab]);
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
      home: /*#__PURE__*/React.createElement(HomeScreen, {
        onNav: setTab,
        onJoin: () => setInSession(true)
      }),
      plan: /*#__PURE__*/React.createElement(PlanScreen, null),
      aminy: /*#__PURE__*/React.createElement(AskScreen, null),
      calm: /*#__PURE__*/React.createElement(CalmScreen, null),
      more: /*#__PURE__*/React.createElement(MoreScreen, {
        onRestart: restartOnboarding,
        onNav: setTab
      }),
      bcba: /*#__PURE__*/React.createElement(BcbaScreen, {
        onBack: () => setTab("more")
      }),
      tele: /*#__PURE__*/React.createElement(TeleScreen, {
        onBack: () => setTab("more"),
        onJoin: () => setInSession(true)
      }),
      plans: /*#__PURE__*/React.createElement(PlansScreen, {
        onBack: () => setTab("more")
      }),
      market: /*#__PURE__*/React.createElement(MarketScreen, {
        onBack: () => setTab("more"),
        onBook: () => setTab("tele")
      }),
      settings: /*#__PURE__*/React.createElement(SettingsScreen, {
        onBack: () => setTab("more"),
        onNav: setTab
      }),
      vault: /*#__PURE__*/React.createElement(VaultScreen, {
        onBack: () => setTab("more")
      }),
      coverage: /*#__PURE__*/React.createElement(CoverageScreen, {
        onBack: () => setTab("more")
      }),
      community: /*#__PURE__*/React.createElement(CommunityScreen, {
        onBack: () => setTab("more")
      }),
      report: /*#__PURE__*/React.createElement(ReportScreen, {
        onBack: () => setTab("more")
      }),
      insights: /*#__PURE__*/React.createElement(InsightsScreen, {
        onBack: () => setTab("more")
      }),
      checkins: /*#__PURE__*/React.createElement(CheckinsScreen, {
        onBack: () => setTab("more")
      }),
      reminders: /*#__PURE__*/React.createElement(RemindersScreen, {
        onBack: () => setTab("more")
      }),
      reports: /*#__PURE__*/React.createElement(ReportsScreen, {
        onBack: () => setTab("more")
      })
    };
    const calmBg = "radial-gradient(circle at 50% 25%, #cffafe 0%, var(--aminy-mist) 50%, var(--aminy-mist-deep) 100%)";
    const appBg = "linear-gradient(180deg,var(--aminy-mist),var(--aminy-mist-deep))";
    if (intro && window.WhyAminy) {
      if (!splashDone) {
        return /*#__PURE__*/React.createElement(PhoneShell, {
          bg: "#fff"
        }, /*#__PURE__*/React.createElement("div", {
          onClick: () => setSplashDone(true),
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            cursor: "pointer"
          }
        }, /*#__PURE__*/React.createElement("img", {
          src: "../../assets/aminy_logo.png",
          alt: "aminy",
          style: {
            width: 200,
            height: "auto",
            animation: "aminy-pop 700ms var(--ease-lift) both"
          }
        }), /*#__PURE__*/React.createElement("div", {
          style: {
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--aminy-navy-500)",
            animation: "aminy-fade-up 600ms var(--ease-calm) 500ms both"
          }
        }, "Gentle guidance \xB7 Meaningful progress"), /*#__PURE__*/React.createElement("div", {
          style: {
            position: "absolute",
            bottom: 56,
            display: "flex",
            gap: 5
          }
        }, [0, 1, 2].map(d => /*#__PURE__*/React.createElement("span", {
          key: d,
          style: {
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--aminy-teal-400)",
            animation: `aminy-think 1.1s ease-in-out ${d * 0.18}s infinite`
          }
        })))));
      }
      return /*#__PURE__*/React.createElement(PhoneShell, {
        bg: appBg
      }, /*#__PURE__*/React.createElement(window.WhyAminy, {
        onStart: finishIntro
      }));
    }
    if (!onboarded) {
      return /*#__PURE__*/React.createElement(PhoneShell, {
        bg: appBg
      }, /*#__PURE__*/React.createElement(Onboarding, {
        onDone: finishOnboarding
      }));
    }
    return /*#__PURE__*/React.createElement(PhoneShell, {
      bg: tab === "calm" ? calmBg : appBg
    }, inSession && /*#__PURE__*/React.createElement(SessionScreen, {
      onExit: () => {
        setInSession(false);
        setTab("home");
      }
    }), /*#__PURE__*/React.createElement("div", {
      key: tab,
      style: {
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        animation: "aminyScreenIn var(--dur-base) var(--ease-calm)"
      }
    }, screens[tab]), /*#__PURE__*/React.createElement(BottomNav, {
      active: tab,
      onNav: setTab
    }), /*#__PURE__*/React.createElement("style", null, `@keyframes aminyScreenIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`));
    // (bcba is reachable from More; bottom nav stays for quick return)
  }
  function mount() {
    const DS = window.DesignSystem_39fb2b;
    if (!DS || !DS.Button) {
      setTimeout(mount, 60);
      return;
    }
    ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
  }
  mount();
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/ask.jsx
try { (() => {
/* Ask Aminy — AI coach chat. Validate first, then offer. window.AskScreen
   Composer mirrors ChatGPT/Claude: attach (camera/photo/file) + voice + send.
   Header offers a calm escalation to a human BCBA. */
(function () {
  const {
    AIcon
  } = window;
  const SEED = [{
    who: "bot",
    affirm: true,
    brain: true,
    lead: "Aminy",
    text: "Mornings have been hard this week. That makes sense — Kai's been off his sleep schedule. You're doing the right thing by noticing."
  }, {
    who: "me",
    text: "He melted down during teeth again today. I lost my patience."
  }, {
    who: "bot",
    brain: true,
    text: "That sounds really hard. Both of you were doing your best with what the morning gave you. Want to try something different tomorrow, or just vent for a minute?"
  }];
  const REPLIES = ["Try something different", "Just vent", "Loop in our BCBA"];
  // What the unified AI brain knows about this child (mirrors buildAIContext)
  const BRAIN = [{
    icon: "heart",
    label: "Kai, age 7 · sensory-sensitive"
  }, {
    icon: "file",
    label: "3 vault documents (IEP, eval, report)"
  }, {
    icon: "target",
    label: "4 of today's plan activities"
  }, {
    icon: "clock",
    label: "12 past conversations remembered"
  }];
  const QUICK = ["Kai had a meltdown today. How can I help?", "Help me build a better morning routine", "How is Kai doing overall?"];
  const ATTACH = [{
    id: "camera",
    label: "Camera",
    emoji: "📷",
    note: "Capture a moment or behavior"
  }, {
    id: "photo",
    label: "Photo library",
    emoji: "🖼️",
    note: "Share a picture or video"
  }, {
    id: "file",
    label: "File",
    emoji: "📄",
    note: "Report, IEP, assessment"
  }];
  window.AskScreen = function AskScreen() {
    const DS = window.DesignSystem_39fb2b;
    const [msgs, setMsgs] = React.useState(SEED);
    const [text, setText] = React.useState("");
    const [attachOpen, setAttachOpen] = React.useState(false);
    const [recording, setRecording] = React.useState(false);
    const [thinking, setThinking] = React.useState(false);
    const [showBrain, setShowBrain] = React.useState(false);
    const endRef = React.useRef(null);
    const Thinking = window.AminyMotion && window.AminyMotion.Thinking;
    const buzz = ms => {
      try {
        navigator.vibrate && navigator.vibrate(ms);
      } catch (e) {}
    };
    React.useEffect(() => {
      if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
    }, [msgs, thinking]);
    function send(t) {
      const body = (t || text).trim();
      if (!body) return;
      setText("");
      setAttachOpen(false);
      const toBcba = /bcba|dr\.?\s|morales|therapist/i.test(body);
      setMsgs(m => [...m, {
        who: "me",
        text: body
      }]);
      setThinking(true);
      setTimeout(() => {
        setThinking(false);
        setMsgs(m => [...m, toBcba ? {
          who: "bot",
          lead: "Sent to Dr. Morales",
          bcba: true,
          text: "I've shared this thread with Kai's BCBA. She'll reply here — usually within a day. You can keep talking to me in the meantime."
        } : {
          who: "bot",
          brain: true,
          lead: "One small swap",
          text: "Move teeth to after breakfast for three days. Full belly + no rushing = less resistance — and since Kai's sensory-sensitive, a softer brush may help too. If it doesn't, we'll try another angle."
        }]);
      }, 1400);
    }
    function attach(item) {
      buzz(8);
      setAttachOpen(false);
      setMsgs(m => [...m, {
        who: "me",
        chip: item.emoji + " " + item.label,
        text: ""
      }]);
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "6px 16px 8px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderBottom: "1px solid var(--color-border)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 10,
        background: "#fff",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "back",
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--color-text-strong)",
        fontFamily: "var(--font-ui)",
        letterSpacing: "-0.01em"
      }
    }, "Ask Aminy"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 500,
        color: "var(--aminy-teal-700)",
        letterSpacing: ".04em"
      }
    }, "Coach \xB7 always here")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        buzz(6);
        setShowBrain(v => !v);
      },
      "aria-label": "What Aminy knows",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        height: 34,
        padding: "0 11px",
        borderRadius: 999,
        background: showBrain ? "var(--aminy-teal-600)" : "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-200)",
        color: showBrain ? "#fff" : "var(--aminy-teal-700)",
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "brain",
      size: 14
    }), " Knows Kai"), /*#__PURE__*/React.createElement("button", {
      onClick: () => send("Loop in our BCBA"),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 34,
        padding: "0 12px",
        borderRadius: 999,
        background: "var(--aminy-care-50)",
        border: "1px solid var(--aminy-care-100)",
        color: "var(--aminy-care-600)",
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "shield",
      size: 14
    }), " Your BCBA")), showBrain && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "12px 16px",
        background: "linear-gradient(180deg,var(--aminy-teal-50),#fff)",
        borderBottom: "1px solid var(--color-border)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 9
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 14,
      style: {
        color: "var(--aminy-teal-700)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--aminy-teal-800)"
      }
    }, "Context loaded \xB7 Aminy knows")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8
      }
    }, BRAIN.map(b => /*#__PURE__*/React.createElement("div", {
      key: b.label,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 10px",
        background: "#fff",
        border: "1px solid var(--aminy-teal-200)",
        borderRadius: 11
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: b.icon,
      size: 14,
      style: {
        color: "var(--aminy-teal-600)",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        fontWeight: 600,
        color: "var(--aminy-teal-800)",
        lineHeight: 1.25
      }
    }, b.label)))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        color: "var(--color-text-muted)",
        marginTop: 9,
        lineHeight: 1.4
      }
    }, "Every answer is personalized to Kai \u2014 never generic. Your data stays private.")), /*#__PURE__*/React.createElement("div", {
      ref: endRef,
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "8px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, msgs.map((m, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        maxWidth: "82%",
        padding: "10px 13px",
        borderRadius: 16,
        fontSize: 13.5,
        lineHeight: 1.45,
        alignSelf: m.who === "me" ? "flex-end" : "flex-start",
        background: m.who === "me" ? "var(--aminy-teal-600)" : m.affirm ? "linear-gradient(180deg,#fff,var(--aminy-teal-50))" : "#fff",
        color: m.who === "me" ? "#fff" : "var(--color-text)",
        border: m.who === "me" ? "0" : "1px solid var(--color-border)",
        borderTopRightRadius: m.who === "me" ? 6 : 16,
        borderTopLeftRadius: m.who === "me" ? 16 : 6,
        fontFamily: m.affirm ? "var(--font-ui)" : "var(--font-ui)",
        fontStyle: "normal",
        fontWeight: m.affirm ? 600 : 400
      }
    }, m.brain && m.who === "bot" && /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        color: "var(--aminy-teal-700)",
        opacity: 0.85,
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: ".04em"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "brain",
      size: 11
    }), "Context-aware"), m.lead && /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontFamily: "var(--font-ui)",
        fontStyle: "normal",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: ".04em",
        marginBottom: 3,
        color: m.bcba ? "var(--aminy-care-600)" : m.affirm ? "var(--aminy-teal-700)" : "var(--color-text-strong)"
      }
    }, m.lead), m.chip ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 13
      }
    }, m.chip) : m.text)), thinking && Thinking && /*#__PURE__*/React.createElement("div", {
      style: {
        alignSelf: "flex-start",
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        borderTopLeftRadius: 6,
        padding: "12px 14px"
      }
    }, /*#__PURE__*/React.createElement(Thinking, null)), msgs.length === SEED.length && !thinking && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        flexWrap: "wrap"
      }
    }, REPLIES.map(r => /*#__PURE__*/React.createElement("button", {
      key: r,
      onClick: () => send(r),
      style: {
        padding: "7px 12px",
        background: "#fff",
        border: "1px solid var(--aminy-teal-200)",
        color: "var(--aminy-teal-700)",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
        cursor: "pointer"
      }
    }, r))), msgs.length === SEED.length && !thinking && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: "var(--color-text-subtle)",
        marginBottom: 6
      }
    }, "Aminy can help with\u2026"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6
      }
    }, QUICK.map(q => /*#__PURE__*/React.createElement("button", {
      key: q,
      onClick: () => send(q),
      style: {
        textAlign: "left",
        padding: "9px 12px",
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text)",
        borderRadius: 12,
        fontSize: 12.5,
        fontWeight: 500,
        fontFamily: "var(--font-ui)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 13,
      style: {
        color: "var(--aminy-teal-600)",
        flexShrink: 0
      }
    }), q))))), attachOpen && /*#__PURE__*/React.createElement("div", {
      onClick: () => setAttachOpen(false),
      style: {
        position: "absolute",
        inset: 0,
        zIndex: 5,
        background: "rgba(15,23,42,0.12)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        animation: "aminy-fade-in var(--dur-base) var(--ease-calm) both"
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        background: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: "10px 14px 18px",
        boxShadow: "0 -8px 24px rgba(15,23,42,0.12)",
        animation: "aminy-sheet-up 320ms var(--ease-lift) both"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 4,
        borderRadius: 999,
        background: "var(--aminy-navy-200)",
        margin: "0 auto 12px"
      }
    }), ATTACH.map(a => /*#__PURE__*/React.createElement("button", {
      key: a.id,
      onClick: () => attach(a),
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 8px",
        background: "none",
        border: 0,
        borderBottom: "1px solid var(--color-border)",
        cursor: "pointer",
        textAlign: "left"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 42,
        height: 42,
        borderRadius: 12,
        background: "var(--aminy-teal-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20
      }
    }, a.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, a.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, a.note)))))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 12px 12px"
      }
    }, recording ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--aminy-teal-200)",
        borderRadius: 22,
        padding: "8px 8px 8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: "var(--aminy-alert-600)",
        animation: "rec 1s ease-in-out infinite"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 3,
        alignItems: "center",
        flex: 1,
        height: 22
      }
    }, Array.from({
      length: 22
    }).map((_, b) => /*#__PURE__*/React.createElement("span", {
      key: b,
      style: {
        width: 3,
        borderRadius: 2,
        background: "var(--aminy-teal-500)",
        height: `${6 + Math.abs(Math.sin(b * 0.9)) * 16}px`
      }
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-text-muted)",
        fontVariantNumeric: "tabular-nums"
      }
    }, "0:04"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        buzz(8);
        setRecording(false);
        send("(voice note · 4s)");
      },
      style: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "var(--aminy-teal-600)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: 0,
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "check",
      size: 16
    }))) : /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 22,
        padding: "4px 4px 4px 6px",
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        buzz(6);
        setAttachOpen(true);
      },
      "aria-label": "Add attachment",
      style: {
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: "var(--aminy-teal-50)",
        color: "var(--aminy-teal-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: 0,
        cursor: "pointer",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "plus",
      size: 19
    })), /*#__PURE__*/React.createElement("input", {
      value: text,
      onChange: e => setText(e.target.value),
      onKeyDown: e => e.key === "Enter" && send(),
      placeholder: "Talk to Aminy\u2026",
      style: {
        flex: 1,
        border: 0,
        outline: 0,
        fontSize: 14,
        padding: "10px 4px",
        color: "var(--color-text)",
        background: "transparent",
        fontFamily: "var(--font-ui)",
        minWidth: 0
      }
    }), text.trim() ? /*#__PURE__*/React.createElement("button", {
      onClick: () => send(),
      "aria-label": "Send",
      style: {
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: "var(--aminy-teal-600)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: 0,
        boxShadow: "var(--shadow-glow-teal)",
        cursor: "pointer",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "send",
      size: 16
    })) : /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        buzz(10);
        setRecording(true);
      },
      "aria-label": "Voice",
      style: {
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: "var(--aminy-teal-50)",
        color: "var(--aminy-teal-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: 0,
        cursor: "pointer",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "mic",
      size: 18
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        fontSize: 10.5,
        color: "var(--color-text-subtle)",
        marginTop: 7
      }
    }, "Aminy is a coach, not a crisis line. In an emergency, call 988 or 911.")), /*#__PURE__*/React.createElement("style", null, `@keyframes rec{0%,100%{opacity:1}50%{opacity:.3}}`));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/ask.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/auth.jsx
try { (() => {
/* Auth + free screening — welcome · create account · sign in · forgot · M-CHAT-style screening.
   Standalone flow kit (the real app runs this between splash/why and onboarding). window → #root */
(function () {
  const {
    AIcon,
    PhoneShell
  } = window;
  const {
    Button,
    Input
  } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || {
    light() {},
    medium() {},
    success() {}
  };
  const H = ({
    children,
    sub
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 26px 0"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-ui)",
      fontWeight: 800,
      fontSize: 26,
      lineHeight: 1.12,
      letterSpacing: "-0.03em",
      color: "var(--color-text-strong)",
      margin: "0 0 8px",
      textWrap: "balance"
    }
  }, children), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14.5,
      lineHeight: 1.55,
      color: "var(--color-text-muted)",
      margin: 0
    }
  }, sub));
  const Back = ({
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      margin: "4px 0 0 18px",
      width: 36,
      height: 36,
      borderRadius: 11,
      background: "#fff",
      border: "1px solid var(--color-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: "var(--color-text)"
    }
  }, /*#__PURE__*/React.createElement(AIcon, {
    name: "back",
    size: 16
  }));
  const Foot = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 24px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, children);
  const SocialBtn = ({
    label,
    mark
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      haptic.light();
      window.aminyToast && window.aminyToast(label + " — connecting…");
    },
    style: {
      height: 52,
      borderRadius: 14,
      border: "1px solid var(--color-border-strong)",
      background: "#fff",
      fontFamily: "var(--font-ui)",
      fontWeight: 600,
      fontSize: 15,
      color: "var(--color-text-strong)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17,
      fontWeight: 800
    }
  }, mark), " ", label);

  // ---- M-CHAT-style free screening (worded gently; NOT diagnostic) ----
  const QS = ["If you point at something across the room, does your child look at it?", "Does your child play pretend — like feeding a stuffed animal?", "Does your child respond when you call their name?", "When something new happens, does your child look at your face to see how you feel?", "Does your child get very upset by everyday sounds, textures, or changes in routine?"];
  const OPTS = ["Often", "Sometimes", "Rarely"];
  function App() {
    const [view, setView] = R.useState("welcome"); // welcome create signin forgot sintro squiz sresult
    const [qi, setQi] = R.useState(0);
    const [answers, setAnswers] = R.useState([]);
    const [sent, setSent] = R.useState(false);
    const go = v => {
      haptic.light();
      setView(v);
    };
    function answer(o) {
      haptic.light();
      const next = [...answers, o];
      setAnswers(next);
      if (qi < QS.length - 1) setQi(qi + 1);else {
        haptic.success();
        setView("sresult");
      }
    }
    let body = null;
    if (view === "welcome") body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "0 26px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/aminy_logo.png",
      alt: "aminy",
      style: {
        width: 170,
        height: "auto",
        animation: "aminy-pop 600ms var(--ease-lift) both"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 800,
        fontSize: 24,
        letterSpacing: "-0.025em",
        color: "var(--color-text-strong)",
        lineHeight: 1.15,
        textWrap: "balance",
        animation: "aminy-fade-up 500ms var(--ease-calm) 200ms both"
      }
    }, "The calm center of your child's care."), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--color-text-muted)",
        lineHeight: 1.5,
        animation: "aminy-fade-up 500ms var(--ease-calm) 350ms both"
      }
    }, "14-day free trial \xB7 no card required")), /*#__PURE__*/React.createElement(Foot, null, /*#__PURE__*/React.createElement(SocialBtn, {
      label: "Continue with Apple",
      mark: ""
    }), /*#__PURE__*/React.createElement(SocialBtn, {
      label: "Continue with Google",
      mark: "G"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => go("create")
    }, "Continue with email"), /*#__PURE__*/React.createElement("button", {
      onClick: () => go("signin"),
      style: {
        border: 0,
        background: "none",
        cursor: "pointer",
        color: "var(--color-text-muted)",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
        padding: 6
      }
    }, "Already have an account? ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--aminy-teal-700)"
      }
    }, "Sign in"))));
    if (view === "create") body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Back, {
      onClick: () => go("welcome")
    }), /*#__PURE__*/React.createElement(H, {
      sub: "One account for your whole care team \u2014 you can invite caregivers later."
    }, "Create your account"), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "20px 26px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Input, {
      label: "Your name",
      placeholder: "e.g. Sarah Chen"
    }), /*#__PURE__*/React.createElement(Input, {
      label: "Email",
      type: "email",
      placeholder: "you@email.com"
    }), /*#__PURE__*/React.createElement(Input, {
      label: "Password",
      type: "password",
      placeholder: "8+ characters",
      hint: "We'll never share your data. HIPAA-conscious by design."
    })), /*#__PURE__*/React.createElement(Foot, null, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => go("sintro")
    }, "Create account"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-subtle)",
        textAlign: "center",
        lineHeight: 1.5
      }
    }, "By continuing you agree to the Terms of Service and acknowledge the Notice of Privacy Practices.")));
    if (view === "signin") body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Back, {
      onClick: () => go("welcome")
    }), /*#__PURE__*/React.createElement(H, {
      sub: "Good to see you again."
    }, "Sign in"), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "20px 26px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Input, {
      label: "Email",
      type: "email",
      placeholder: "you@email.com"
    }), /*#__PURE__*/React.createElement(Input, {
      label: "Password",
      type: "password",
      placeholder: "Your password"
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => go("forgot"),
      style: {
        alignSelf: "flex-start",
        border: 0,
        background: "none",
        cursor: "pointer",
        color: "var(--aminy-teal-700)",
        fontSize: 13.5,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
        padding: 0
      }
    }, "Forgot password?")), /*#__PURE__*/React.createElement(Foot, null, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => {
        haptic.success();
        window.aminyToast && window.aminyToast("Welcome back, Sarah 💛");
      }
    }, "Sign in")));
    if (view === "forgot") body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Back, {
      onClick: () => go("signin")
    }), /*#__PURE__*/React.createElement(H, {
      sub: sent ? undefined : "No stress — it happens to all of us."
    }, sent ? "Check your email" : "Reset your password"), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "20px 26px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        flex: 1
      }
    }, sent ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        lineHeight: 1.55,
        color: "var(--aminy-teal-800)",
        animation: "aminy-fade-up 400ms var(--ease-calm) both"
      }
    }, "We sent a reset link to your email. It's good for 30 minutes \u2014 take your time.") : /*#__PURE__*/React.createElement(Input, {
      label: "Email",
      type: "email",
      placeholder: "you@email.com"
    })), /*#__PURE__*/React.createElement(Foot, null, sent ? /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      fullWidth: true,
      onClick: () => {
        setSent(false);
        go("signin");
      }
    }, "Back to sign in") : /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => {
        haptic.medium();
        setSent(true);
      }
    }, "Send reset link")));
    if (view === "sintro") body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "0 28px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 96,
        height: 96,
        borderRadius: 30,
        background: "linear-gradient(135deg,#fff,var(--aminy-teal-50))",
        border: "1px solid var(--aminy-teal-100)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--shadow-md)"
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/aminy_compass.png",
      alt: "",
      style: {
        width: 48,
        height: 48
      }
    })), /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 800,
        fontSize: 24,
        lineHeight: 1.15,
        letterSpacing: "-0.025em",
        color: "var(--color-text-strong)",
        margin: 0,
        textWrap: "balance"
      }
    }, "Wondering where to start? Start here."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14.5,
        lineHeight: 1.6,
        color: "var(--color-text-muted)",
        margin: 0,
        maxWidth: 290
      }
    }, "A free 2-minute check-in about your child \u2014 five gentle questions. Not a diagnosis, just a clearer next step.")), /*#__PURE__*/React.createElement(Foot, null, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => go("squiz")
    }, "Start the free check-in"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.light();
        window.aminyToast && window.aminyToast("Skipping to setup — you can screen anytime.");
      },
      style: {
        border: 0,
        background: "none",
        cursor: "pointer",
        color: "var(--color-text-muted)",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
        padding: 6
      }
    }, "Skip for now")));
    if (view === "squiz") body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 26px 0",
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 6,
        background: "var(--aminy-navy-100)",
        borderRadius: 3,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${qi / QS.length * 100}%`,
        height: "100%",
        background: "var(--aminy-teal-500)",
        borderRadius: 3,
        transition: "width .4s var(--ease-lift)"
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--color-text-muted)"
      }
    }, qi + 1, "/", QS.length)), /*#__PURE__*/React.createElement("div", {
      key: qi,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 28px",
        animation: "aminy-fade-up 350ms var(--ease-lift) both"
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 22,
        lineHeight: 1.3,
        letterSpacing: "-0.02em",
        color: "var(--color-text-strong)",
        margin: "0 0 26px",
        textWrap: "pretty"
      }
    }, QS[qi]), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, OPTS.map(o => /*#__PURE__*/React.createElement("button", {
      key: o,
      onClick: () => answer(o),
      style: {
        height: 54,
        borderRadius: 14,
        border: "1.5px solid var(--color-border-strong)",
        background: "#fff",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 15.5,
        color: "var(--color-text-strong)",
        cursor: "pointer",
        textAlign: "left",
        padding: "0 18px",
        transition: "border-color var(--dur-fast) var(--ease-calm), background var(--dur-fast) var(--ease-calm)"
      },
      onMouseEnter: e => {
        e.currentTarget.style.borderColor = "var(--aminy-teal-500)";
        e.currentTarget.style.background = "var(--aminy-teal-50)";
      },
      onMouseLeave: e => {
        e.currentTarget.style.borderColor = "var(--color-border-strong)";
        e.currentTarget.style.background = "#fff";
      }
    }, o)))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "0 26px 22px",
        fontSize: 11.5,
        color: "var(--color-text-subtle)",
        textAlign: "center"
      }
    }, "There are no wrong answers. Answer for how things usually are."));
    if (view === "sresult") body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "0 28px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 76,
        height: 76,
        borderRadius: "50%",
        background: "var(--aminy-teal-600)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--shadow-glow-teal)",
        animation: "aminy-pop 500ms var(--ease-lift) both"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "check",
      size: 34,
      style: {
        color: "#fff"
      }
    })), /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 800,
        fontSize: 24,
        lineHeight: 1.18,
        letterSpacing: "-0.025em",
        color: "var(--color-text-strong)",
        margin: 0,
        maxWidth: 300,
        textWrap: "balance"
      }
    }, "Thanks for sharing. Here's what we noticed."), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 18,
        padding: "16px 18px",
        textAlign: "left",
        boxShadow: "var(--shadow-sm)",
        animation: "aminy-fade-up 450ms var(--ease-calm) 150ms both"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--aminy-teal-700)",
        marginBottom: 7
      }
    }, "Your check-in suggests"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        lineHeight: 1.6,
        color: "var(--color-text)"
      }
    }, "A few of your answers are worth a closer look with a professional \u2014 especially around responding to name and big reactions to sensory changes. That's exactly what an evaluation is for, and catching it early is a gift.")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-subtle)",
        lineHeight: 1.5,
        maxWidth: 290
      }
    }, "This is a screening conversation-starter, not a diagnosis. Only a licensed clinician can evaluate your child.")), /*#__PURE__*/React.createElement(Foot, null, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => {
        haptic.success();
        window.aminyToast && window.aminyToast("Next: Kai's profile → personalized plan");
      }
    }, "Build my child's plan"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      fullWidth: true,
      onClick: () => {
        haptic.light();
        window.aminyToast && window.aminyToast("Booking a free evaluation consult…");
      }
    }, "Talk to an evaluator")));
    return /*#__PURE__*/React.createElement(PhoneShell, {
      bg: "linear-gradient(180deg,#ffffff,var(--aminy-mist) 55%,var(--aminy-mist-deep))"
    }, body);
  }
  function mount() {
    if (!window.PhoneShell || !window.AminyKit) {
      setTimeout(mount, 60);
      return;
    }
    ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
  }
  mount();
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/auth.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/bcba.jsx
try { (() => {
/* Ask a BCBA — async question → instant AI draft → BCBA-reviewed & signed.
   Ported from the real AskABCBA.tsx flow (status: pending→ai_drafted→awaiting_bcba→completed).
   Rebuilt in the Aminy system (mist + teal). window.BcbaScreen */
(function () {
  const {
    AIcon
  } = window;
  const R = React;
  const CATEGORIES = [{
    id: "behavior",
    label: "Behavior",
    em: "🎯"
  }, {
    id: "sleep",
    label: "Sleep",
    em: "😴"
  }, {
    id: "feeding",
    label: "Feeding",
    em: "🍴"
  }, {
    id: "transitions",
    label: "Transitions",
    em: "🔄"
  }, {
    id: "sensory",
    label: "Sensory",
    em: "✨"
  }, {
    id: "communication",
    label: "Communication",
    em: "💬"
  }, {
    id: "school",
    label: "School",
    em: "🏫"
  }, {
    id: "social",
    label: "Social",
    em: "👥"
  }, {
    id: "self-care",
    label: "Self-care",
    em: "🧼"
  }, {
    id: "other",
    label: "Other",
    em: "💭"
  }];
  const SEED = [{
    id: "t1",
    question: "Kai bolts from the dinner table after two bites every night. How do we build tolerance without making meals a battle?",
    category: "feeding",
    status: "completed",
    rating: 5,
    ai_draft: "This is really common, and the fact that he's coming to the table at all is a win. Start with \"first two bites, then a break\" — let him leave, then return. Keep portions tiny and predictable. Build sitting time by 30 seconds a week, not all at once.",
    bcba_response: "Great instinct to avoid the battle. I'd add: pair the table with something regulating — a weighted lap pad or a fidget he only gets at meals. Use a visual timer set low (2 min) and celebrate when it beeps, not when the plate's clean. We're shaping duration, not intake. Try it for a week and log how long he stays — we'll adjust at our next session.",
    bcba_name: "Dr. Ana Morales",
    bcba_credentials: "BCBA-D",
    created: "2d"
  }];
  function StatusPill({
    status
  }) {
    const map = {
      pending: {
        bg: "var(--aminy-win-50)",
        fg: "var(--aminy-win-600)",
        label: "Drafting…",
        icon: "sparkles"
      },
      ai_drafted: {
        bg: "var(--aminy-teal-50)",
        fg: "var(--aminy-teal-700)",
        label: "AI ready",
        icon: "sparkles"
      },
      awaiting_bcba: {
        bg: "var(--aminy-win-50)",
        fg: "var(--aminy-win-600)",
        label: "BCBA queue",
        icon: "clock"
      },
      completed: {
        bg: "var(--aminy-grow-50)",
        fg: "var(--aminy-grow-600)",
        label: "Reviewed",
        icon: "check"
      }
    }[status] || {};
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: map.bg,
        color: map.fg,
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: map.icon,
      size: 11
    }), " ", map.label);
  }
  function Detail({
    thread,
    onBack
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "6px 16px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderBottom: "1px solid var(--color-border)"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        width: 32,
        height: 32,
        borderRadius: 10,
        background: "#fff",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "back",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 17,
        color: "var(--color-text-strong)"
      }
    }, "Question detail")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 6
      }
    }, "Your question"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--color-text-strong)",
        lineHeight: 1.5
      }
    }, thread.question)), thread.ai_draft && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 16,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 15,
      style: {
        color: "var(--aminy-teal-700)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--aminy-teal-700)"
      }
    }, "AI draft \xB7 instant")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--color-text)",
        lineHeight: 1.55
      }
    }, thread.ai_draft)), thread.bcba_response ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "2px solid var(--aminy-teal-600)",
        borderRadius: 16,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "shield",
      size: 15,
      style: {
        color: "var(--aminy-teal-700)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--aminy-teal-700)"
      }
    }, "BCBA reviewed & signed")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--color-text-strong)",
        lineHeight: 1.55,
        marginBottom: 10
      }
    }, thread.bcba_response), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        fontWeight: 600
      }
    }, "\u2014 ", thread.bcba_name, ", ", thread.bcba_credentials)) : /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "clock",
      size: 20,
      style: {
        color: "var(--aminy-win-600)"
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "Awaiting BCBA review"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, "A licensed BCBA edits & signs \u2014 typically within 24 hours.")))));
  }
  window.BcbaScreen = function BcbaScreen({
    onBack
  }) {
    const {
      Button
    } = window.AminyKit;
    const [threads, setThreads] = R.useState(SEED);
    const [composing, setComposing] = R.useState(false);
    const [q, setQ] = R.useState("");
    const [cat, setCat] = R.useState(null);
    const [active, setActive] = R.useState(null);
    const buzz = ms => {
      try {
        navigator.vibrate && navigator.vibrate(ms);
      } catch (e) {}
    };
    function submit() {
      if (!q.trim()) return;
      buzz(10);
      const id = "t" + Date.now();
      const t = {
        id,
        question: q.trim(),
        category: cat,
        status: "pending",
        ai_draft: null,
        bcba_response: null,
        created: "just now"
      };
      setThreads(arr => [t, ...arr]);
      setQ("");
      setCat(null);
      setComposing(false);
      // Instant AI draft after a beat
      setTimeout(() => setThreads(arr => arr.map(x => x.id === id ? {
        ...x,
        status: "awaiting_bcba",
        ai_draft: "Here's an instant starting point while a BCBA reviews: name the pattern out loud, keep the demand small, and reinforce the moment it goes right — not the whole task. Full plan once your BCBA signs off."
      } : x)), 1400);
    }
    if (active) return /*#__PURE__*/React.createElement(Detail, {
      thread: active,
      onBack: () => setActive(null)
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "6px 16px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, onBack && /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        width: 32,
        height: 32,
        borderRadius: 10,
        background: "#fff",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "back",
      size: 16
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 17,
        color: "var(--color-text-strong)"
      }
    }, "Ask a BCBA"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--aminy-teal-700)",
        fontWeight: 500
      }
    }, "AI draft instantly \xB7 signed review within 24h"))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "0 16px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, !composing && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "linear-gradient(135deg,var(--aminy-teal-500),var(--aminy-teal-700))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "shield",
      size: 17,
      style: {
        color: "#fff"
      }
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "BCBA expertise, on demand"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)"
      }
    }, "Included with Pro+ Family"))), [["sparkles", "Instant AI draft", "informed by your family's context"], ["shield", "BCBA-reviewed", "a licensed BCBA edits & signs, within 24h"]].map(([ic, t, d], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 8,
        marginTop: 7
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: ic,
      size: 15,
      style: {
        color: "var(--aminy-teal-600)",
        marginTop: 1,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text)"
      }
    }, /*#__PURE__*/React.createElement("b", null, t), " \u2014 ", d)))), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      fullWidth: true,
      icon: /*#__PURE__*/React.createElement(AIcon, {
        name: "plus",
        size: 18
      }),
      onClick: () => setComposing(true)
    }, "Ask a question")), composing && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("textarea", {
      value: q,
      onChange: e => setQ(e.target.value),
      rows: 4,
      placeholder: "What's happening with Kai? Be specific \u2014 when, where, what triggers it\u2026",
      style: {
        width: "100%",
        boxSizing: "border-box",
        fontSize: 14,
        fontFamily: "var(--font-ui)",
        color: "var(--color-text)",
        border: "1px solid var(--color-border-strong)",
        borderRadius: 12,
        padding: "10px 12px",
        resize: "none",
        outline: "none",
        lineHeight: 1.5
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)",
        marginBottom: 7
      }
    }, "Category \u2014 helps route to the right BCBA"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6
      }
    }, CATEGORIES.map(c => {
      const on = cat === c.id;
      return /*#__PURE__*/React.createElement("button", {
        key: c.id,
        onClick: () => setCat(on ? null : c.id),
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 999,
          cursor: "pointer",
          border: `1px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`,
          background: on ? "var(--aminy-teal-50)" : "#fff",
          color: on ? "var(--aminy-teal-700)" : "var(--color-text-muted)",
          fontWeight: on ? 600 : 500
        }
      }, /*#__PURE__*/React.createElement("span", null, c.em), c.label);
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: () => {
        setComposing(false);
        setQ("");
      }
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      fullWidth: true,
      disabled: !q.trim(),
      icon: /*#__PURE__*/React.createElement(AIcon, {
        name: "sparkles",
        size: 16
      }),
      onClick: submit
    }, "Send to BCBA"))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginTop: 4
      }
    }, "Your questions"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, threads.map(t => /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setActive(t),
      style: {
        textAlign: "left",
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 12,
        cursor: "pointer",
        boxShadow: "var(--shadow-sm)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: "var(--color-text-strong)",
        lineHeight: 1.4,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden"
      }
    }, t.question), /*#__PURE__*/React.createElement(StatusPill, {
      status: t.status
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        fontSize: 11,
        color: "var(--color-text-subtle)",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", null, t.created), t.category && /*#__PURE__*/React.createElement("span", {
      style: {
        textTransform: "capitalize"
      }
    }, "\xB7 ", t.category), t.rating && /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 2
      }
    }, "\xB7 ", /*#__PURE__*/React.createElement(AIcon, {
      name: "award",
      size: 11,
      style: {
        color: "var(--aminy-win-500)"
      }
    }), t.rating)))))));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/bcba.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/calm.jsx
try { (() => {
/* Exhale — a hub of grounding tools, not just breathing. window.CalmScreen
   Tools: Breathing · 5-4-3-2-1 grounding · Tactile bubbles (haptic) · Soundscapes.
   The one surface where gradients are welcome. Tactile bubbles call navigator.vibrate. */
(function () {
  const R = React;
  const TEAL = "var(--aminy-teal-600)";
  const G = {
    wind: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9.6 4.6A2 2 0 1 1 11 8H2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12.6 19.4A2 2 0 1 0 14 16H2"
    })),
    eye: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    })),
    hand: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M18 11V6a2 2 0 0 0-4 0v5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 10V4a2 2 0 0 0-4 0v6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 10.5V6a2 2 0 0 0-4 0v8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13"
    })),
    music: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M9 18V5l12-2v13"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "18",
      r: "3"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "18",
      cy: "16",
      r: "3"
    })),
    back: /*#__PURE__*/React.createElement("path", {
      d: "m15 18-6-6 6-6"
    }),
    play: /*#__PURE__*/React.createElement("path", {
      d: "M6 4v16l14-8z",
      fill: "currentColor",
      stroke: "none"
    }),
    pause: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "6",
      y: "5",
      width: "4",
      height: "14",
      rx: "1",
      fill: "currentColor",
      stroke: "none"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "5",
      width: "4",
      height: "14",
      rx: "1",
      fill: "currentColor",
      stroke: "none"
    })),
    check: /*#__PURE__*/React.createElement("path", {
      d: "M20 6 9 17l-5-5"
    })
  };
  const Ico = ({
    n,
    s = 22,
    w = 1.8,
    style
  }) => /*#__PURE__*/React.createElement("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: w,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, G[n]);
  const buzz = ms => {
    try {
      navigator.vibrate && navigator.vibrate(ms);
    } catch (e) {}
  };
  const TOOLS = [{
    id: "breathe",
    icon: "wind",
    title: "Breathe",
    note: "Box · 4-7-8 · long exhale",
    bg: "linear-gradient(135deg,#cffafe,#a5f3fc)",
    fg: "#0e7490"
  }, {
    id: "ground",
    icon: "eye",
    title: "5-4-3-2-1",
    note: "Come back to the room",
    bg: "linear-gradient(135deg,#e0e7ff,#c7d2fe)",
    fg: "#4338ca"
  }, {
    id: "bubbles",
    icon: "hand",
    title: "Pop bubbles",
    note: "Something for your hands",
    bg: "linear-gradient(135deg,#fae8ff,#f5d0fe)",
    fg: "#a21caf"
  }, {
    id: "sounds",
    icon: "music",
    title: "Soundscapes",
    note: "Rain · waves · hush",
    bg: "linear-gradient(135deg,#dcfce7,#bbf7d0)",
    fg: "#15803d"
  }];
  function Hub({
    onOpen
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "8px 22px 22px",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aminy-eyebrow",
      style: {
        marginBottom: 4
      }
    }, "Exhale"), /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 24,
        lineHeight: 1.15,
        color: "var(--color-text-strong)",
        margin: "0 0 6px",
        letterSpacing: "-0.01em",
        maxWidth: 300,
        textWrap: "balance"
      }
    }, "A minute for you, whenever it gets loud."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13.5,
        color: "var(--color-text-muted)",
        lineHeight: 1.55,
        margin: "0 0 18px",
        maxWidth: 300
      }
    }, "No counting, no scoring. Pick whatever helps right now."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12
      }
    }, TOOLS.map(t => /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => {
        buzz(8);
        onOpen(t.id);
      },
      style: {
        textAlign: "left",
        border: "1px solid rgba(255,255,255,0.6)",
        borderRadius: 22,
        padding: "16px 16px 18px",
        background: t.bg,
        cursor: "pointer",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 132
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 42,
        height: 42,
        borderRadius: 14,
        background: "rgba(255,255,255,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: t.fg
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: t.icon,
      s: 22
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: "auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 17,
        color: "#0f172a",
        letterSpacing: "-0.01em"
      }
    }, t.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "rgba(15,23,42,0.6)",
        marginTop: 2
      }
    }, t.note))))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        background: "rgba(255,255,255,0.7)",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: "13px 15px",
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22
      }
    }, "\uD83C\uDF19"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "Wind-down for two"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, "A bedtime routine you and Kai can do together.")), /*#__PURE__*/React.createElement(Ico, {
      n: "play",
      s: 16,
      style: {
        color: TEAL
      }
    })));
  }
  function Breathe() {
    const [mode, setMode] = R.useState("Box");
    const [phase, setPhase] = R.useState("Breathe in");
    R.useEffect(() => {
      const seq = ["Breathe in", "Hold", "Breathe out", "Hold"];
      let i = 0;
      const id = setInterval(() => {
        i = (i + 1) % seq.length;
        setPhase(seq[i]);
        buzz(6);
      }, 4000);
      return () => clearInterval(id);
    }, []);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        padding: "0 24px 24px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        width: 230,
        height: 230
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        border: "2px solid var(--aminy-teal-400)",
        animation: "br 4s var(--ease-breath) infinite"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 24,
        borderRadius: "50%",
        border: "2px solid var(--aminy-teal-300)",
        animation: "br 4s var(--ease-breath) infinite",
        animationDelay: "-1s"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 48,
        borderRadius: "50%",
        background: "linear-gradient(135deg,var(--aminy-teal-300),var(--aminy-teal-600))",
        boxShadow: "var(--shadow-glow-teal)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff"
      }
    }, /*#__PURE__*/React.createElement("small", {
      style: {
        fontSize: 11,
        fontWeight: 500,
        opacity: 0.9,
        letterSpacing: ".14em",
        textTransform: "uppercase"
      }
    }, phase), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 16,
        letterSpacing: ".06em",
        marginTop: 2
      }
    }, "4s"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, ["Box", "4-7-8", "Long exhale"].map(m => /*#__PURE__*/React.createElement("button", {
      key: m,
      onClick: () => setMode(m),
      style: {
        padding: "8px 14px",
        background: m === mode ? "var(--color-text-strong)" : "rgba(255,255,255,0.8)",
        color: m === mode ? "#fff" : "var(--color-text)",
        border: `1px solid ${m === mode ? "transparent" : "var(--color-border)"}`,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
        cursor: "pointer"
      }
    }, m))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        textAlign: "center",
        maxWidth: 250
      }
    }, "Follow the ring. The phone buzzes softly on each turn."));
  }
  const STEPS = [{
    n: 5,
    sense: "see",
    prompt: "Name 5 things you can see.",
    color: "#4338ca"
  }, {
    n: 4,
    sense: "feel",
    prompt: "Notice 4 things you can feel.",
    color: "#0e7490"
  }, {
    n: 3,
    sense: "hear",
    prompt: "Listen for 3 things you can hear.",
    color: "#15803d"
  }, {
    n: 2,
    sense: "smell",
    prompt: "Find 2 things you can smell.",
    color: "#a16207"
  }, {
    n: 1,
    sense: "breath",
    prompt: "Take 1 slow breath. You're here.",
    color: "#a21caf"
  }];
  function Ground() {
    const [i, setI] = R.useState(0);
    const s = STEPS[i];
    const done = i >= STEPS.length - 1;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        padding: "0 30px 30px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: "#fff",
        border: `3px solid ${s.color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--shadow-md)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 56,
        color: s.color
      }
    }, s.n)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        letterSpacing: ".16em",
        textTransform: "uppercase",
        color: s.color,
        fontWeight: 700
      }
    }, s.sense), /*#__PURE__*/React.createElement("h3", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 22,
        lineHeight: 1.25,
        color: "var(--color-text-strong)",
        margin: 0,
        maxWidth: 280,
        letterSpacing: "-0.01em"
      }
    }, s.prompt), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, STEPS.map((_, k) => /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        width: k === i ? 22 : 7,
        height: 7,
        borderRadius: 999,
        background: k <= i ? s.color : "var(--aminy-navy-200)",
        transition: "all .3s"
      }
    }))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        buzz(8);
        setI(done ? 0 : i + 1);
      },
      style: {
        marginTop: 4,
        height: 50,
        padding: "0 28px",
        borderRadius: 14,
        border: 0,
        background: s.color,
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 16,
        cursor: "pointer",
        boxShadow: "var(--shadow-sm)"
      }
    }, done ? "Start over" : "Next"));
  }
  function Bubbles() {
    const [grid, setGrid] = R.useState(() => Array.from({
      length: 24
    }, () => true));
    const left = grid.filter(Boolean).length;
    function pop(idx) {
      if (!grid[idx]) return;
      buzz(12);
      setGrid(g => g.map((v, k) => k === idx ? false : v));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "10px 26px 26px"
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13.5,
        color: "var(--color-text-muted)",
        textAlign: "center",
        margin: "4px 0 0",
        maxWidth: 260
      }
    }, "Pop them all. Each one gives a tiny buzz. Reset and do it again \u2014 there's no finish line."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 12,
        width: "100%",
        maxWidth: 280
      }
    }, grid.map((up, idx) => /*#__PURE__*/React.createElement("button", {
      key: idx,
      onClick: () => pop(idx),
      "aria-label": "bubble",
      style: {
        aspectRatio: "1",
        borderRadius: "50%",
        cursor: up ? "pointer" : "default",
        border: 0,
        background: up ? "radial-gradient(circle at 32% 28%, #fff, #f0abfc 55%, #c026d3)" : "rgba(192,38,211,0.12)",
        boxShadow: up ? "0 4px 10px rgba(192,38,211,0.3), inset 0 2px 6px rgba(255,255,255,0.6)" : "inset 0 2px 5px rgba(192,38,211,0.25)",
        transform: up ? "scale(1)" : "scale(0.86)",
        transition: "transform .12s var(--ease-calm), background .2s, box-shadow .2s"
      }
    }))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        buzz(8);
        setGrid(Array.from({
          length: 24
        }, () => true));
      },
      disabled: left > 0,
      style: {
        marginTop: "auto",
        height: 48,
        padding: "0 24px",
        borderRadius: 14,
        border: "1px solid var(--color-border)",
        background: left > 0 ? "rgba(255,255,255,0.5)" : "#fff",
        color: left > 0 ? "var(--color-text-subtle)" : "var(--aminy-teal-700)",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 15,
        cursor: left > 0 ? "default" : "pointer"
      }
    }, left > 0 ? `${left} to go` : "Fill them up again"));
  }
  const SOUNDS = [{
    id: "rain",
    label: "Soft rain",
    emoji: "🌧️",
    tint: "#dbeafe"
  }, {
    id: "waves",
    label: "Ocean waves",
    emoji: "🌊",
    tint: "#cffafe"
  }, {
    id: "hush",
    label: "White hush",
    emoji: "💨",
    tint: "#f1f5f9"
  }, {
    id: "forest",
    label: "Forest morning",
    emoji: "🌲",
    tint: "#dcfce7"
  }, {
    id: "night",
    label: "Quiet night",
    emoji: "🌙",
    tint: "#e0e7ff"
  }];
  function Sounds() {
    const [playing, setPlaying] = R.useState(null);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "10px 22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13.5,
        color: "var(--color-text-muted)",
        margin: "2px 0 6px"
      }
    }, "Tap one to play. Mix with breathing if you like."), SOUNDS.map(s => {
      const on = playing === s.id;
      return /*#__PURE__*/React.createElement("button", {
        key: s.id,
        onClick: () => {
          buzz(8);
          setPlaying(on ? null : s.id);
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 14px",
          borderRadius: 16,
          cursor: "pointer",
          background: on ? s.tint : "rgba(255,255,255,0.8)",
          border: `1px solid ${on ? "transparent" : "var(--color-border)"}`,
          textAlign: "left"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "rgba(255,255,255,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20
        }
      }, s.emoji), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1,
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: 14.5,
          color: "var(--color-text-strong)"
        }
      }, s.label), /*#__PURE__*/React.createElement("div", {
        style: {
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: on ? "var(--aminy-teal-600)" : "#fff",
          border: on ? "0" : "1px solid var(--color-border)",
          color: on ? "#fff" : "var(--color-text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        n: on ? "pause" : "play",
        s: 15
      })), on && /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 2,
          alignItems: "flex-end",
          height: 18
        }
      }, [0, 1, 2].map(b => /*#__PURE__*/React.createElement("span", {
        key: b,
        style: {
          width: 3,
          background: "var(--aminy-teal-600)",
          borderRadius: 2,
          height: 18,
          animation: `eq .8s ease-in-out ${b * 0.15}s infinite alternate`
        }
      }))));
    }));
  }
  const VIEWS = {
    breathe: {
      c: Breathe,
      t: "Breathe"
    },
    ground: {
      c: Ground,
      t: "5-4-3-2-1"
    },
    bubbles: {
      c: Bubbles,
      t: "Pop bubbles"
    },
    sounds: {
      c: Sounds,
      t: "Soundscapes"
    }
  };
  window.CalmScreen = function CalmScreen() {
    const [view, setView] = R.useState(null);
    const V = view && VIEWS[view];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "radial-gradient(circle at 50% 18%, #e0f7fa 0%, var(--aminy-mist) 46%, var(--aminy-mist-deep) 100%)"
      }
    }, V && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 18px 6px"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setView(null),
      style: {
        width: 34,
        height: 34,
        borderRadius: 11,
        background: "rgba(255,255,255,0.85)",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "back",
      s: 17
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 18,
        color: "var(--color-text-strong)"
      }
    }, V.t)), V ? /*#__PURE__*/React.createElement(V.c, null) : /*#__PURE__*/React.createElement(Hub, {
      onOpen: setView
    }), /*#__PURE__*/React.createElement("style", null, `@keyframes br{0%,100%{transform:scale(.86);opacity:.45}50%{transform:scale(1.06);opacity:1}}@keyframes eq{from{height:5px}to{height:18px}}`));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/calm.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/destinations.jsx
try { (() => {
/* More destinations — Vault · Coverage · Community · Weekly report.
   Structure sourced from the real codebase: Vault categories (Evaluations/IEPs/
   Progress Reports/BCBA Notes) + AI document analysis; Coverage = insured "check
   your benefits" model; Community read/participate; caregiver weekly report.
   window.VaultScreen / CoverageScreen / CommunityScreen / ReportScreen */
(function () {
  const {
    AIcon
  } = window;
  const R = React;
  function Header({
    title,
    sub,
    onBack
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 16px 12px",
        display: "flex",
        alignItems: "center",
        gap: 11,
        borderBottom: "1px solid var(--color-border)",
        background: "#fff"
      }
    }, onBack && /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "back",
      size: 16
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: "-0.02em",
        color: "var(--color-text-strong)"
      }
    }, title), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, sub)));
  }

  // ---------- VAULT ----------
  const VAULT = [{
    cat: "Evaluations",
    icon: "doc",
    tint: "var(--aminy-care-50)",
    fg: "var(--aminy-care-600)",
    files: [["Autism Diagnostic Eval", "Dr. Reyes · Mar 2026", true]]
  }, {
    cat: "IEPs",
    icon: "doc",
    tint: "var(--aminy-teal-50)",
    fg: "var(--aminy-teal-700)",
    files: [["IEP 2025–2026", "Lincoln Elementary · Sep 2025", true]]
  }, {
    cat: "Progress reports",
    icon: "trending",
    tint: "var(--aminy-grow-50)",
    fg: "var(--aminy-grow-600)",
    files: [["Q1 ABA Progress", "Rise Pediatric Therapies · Apr 2026", false]]
  }, {
    cat: "BCBA notes",
    icon: "shield",
    tint: "var(--aminy-win-50)",
    fg: "var(--aminy-win-600)",
    files: [["Session notes · May", "Dr. Morales · 6 notes", false]]
  }];
  window.VaultScreen = function VaultScreen({
    onBack
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        background: "var(--aminy-mist)",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement(Header, {
      title: "Document vault",
      sub: "Reports, IEPs & assessments \u2014 all in one place",
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 16,
        padding: 14,
        display: "flex",
        gap: 12,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 38,
        height: 38,
        borderRadius: 11,
        background: "var(--aminy-teal-100)",
        color: "var(--aminy-teal-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 19
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "Aminy reads your documents"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, "Upload an IEP or eval \u2014 Aminy pulls out goals automatically."))), VAULT.map(g => /*#__PURE__*/React.createElement("div", {
      key: g.cat
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        margin: "2px 4px 8px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, g.cat), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--color-text-muted)"
      }
    }, g.files.length)), g.files.map(([name, meta, analyzed], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "var(--shadow-sm)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 38,
        height: 38,
        borderRadius: 10,
        background: g.tint,
        color: g.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: g.icon,
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, meta)), analyzed ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        color: "var(--aminy-teal-700)",
        background: "var(--aminy-teal-50)",
        borderRadius: 999,
        padding: "3px 8px",
        display: "inline-flex",
        alignItems: "center",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 11
    }), " Analyzed") : /*#__PURE__*/React.createElement(AIcon, {
      name: "chevron",
      size: 16,
      style: {
        color: "var(--color-text-subtle)"
      }
    }))))), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.aminyToast("Choose a document to upload…"),
      style: {
        height: 48,
        borderRadius: 14,
        border: "1.5px dashed var(--aminy-teal-300)",
        background: "var(--aminy-teal-50)",
        color: "var(--aminy-teal-700)",
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "plus",
      size: 18
    }), " Upload a document")));
  };

  // ---------- COVERAGE ----------
  window.CoverageScreen = function CoverageScreen({
    onBack
  }) {
    const {
      Button
    } = window.AminyKit;
    const [checked, setChecked] = R.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        background: "var(--aminy-mist)",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement(Header, {
      title: "Coverage",
      sub: "Insurance & authorizations",
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 10
      }
    }, "Your plan"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        borderRadius: 11,
        background: "#eff6ff",
        color: "#2563eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "shield",
      size: 21
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "Blue Cross Blue Shield AZ"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-muted)"
      }
    }, "Member #XJK\u2022\u2022\u2022\u2022218 \xB7 PPO")))), !checked ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,#eff6ff,#fff)",
        border: "1px solid #bfdbfe",
        borderRadius: 16,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--color-text-strong)",
        marginBottom: 6
      }
    }, "Check what's covered for Kai"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        lineHeight: 1.55,
        margin: "0 0 14px"
      }
    }, "Your plan may cover ABA, therapy, and assessments. Coverage varies \u2014 we'll help you find out. No guarantees, just clarity."), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      fullWidth: true,
      style: {
        background: "#2563eb"
      },
      onClick: () => setChecked(true),
      icon: /*#__PURE__*/React.createElement(AIcon, {
        name: "shield",
        size: 16
      })
    }, "Check my benefits"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        fontSize: 11,
        color: "var(--color-text-subtle)",
        marginTop: 9
      }
    }, "Checking is free \xB7 takes about 30 seconds")) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, [["ABA therapy", "Likely covered", "var(--aminy-grow-600)", "var(--aminy-grow-50)", "Prior auth required · we can help"], ["Autism evaluation", "Likely covered", "var(--aminy-grow-600)", "var(--aminy-grow-50)", "In-network evaluators available"], ["Speech & OT", "Check deductible", "var(--aminy-win-600)", "var(--aminy-win-50)", "$500 remaining on deductible"]].map(([svc, status, fg, bg, note], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, svc), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: fg,
        background: bg,
        borderRadius: 999,
        padding: "3px 9px"
      }
    }, status)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-muted)"
      }
    }, note))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 9,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: 12
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 15,
      style: {
        color: "var(--aminy-teal-700)",
        flexShrink: 0,
        marginTop: 1
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text)",
        lineHeight: 1.5
      }
    }, "This is an estimate from your plan details \u2014 not a guarantee. Aminy can help you file for prior authorization.")))));
  };

  // ---------- COMMUNITY ----------
  const POSTS = [{
    who: "Maya R.",
    tag: "Mornings",
    time: "2h",
    body: "The 'first-then' board Aminy suggested actually worked this week. Three calm school drop-offs in a row 😭 Anyone else?",
    likes: 34,
    replies: 12
  }, {
    who: "James T.",
    tag: "Newly diagnosed",
    time: "5h",
    body: "Just got our 4yo's autism diagnosis. Feeling a lot of things. This group has already helped me feel less alone.",
    likes: 88,
    replies: 41
  }, {
    who: "Dr. Morales",
    tag: "BCBA · Verified",
    time: "1d",
    body: "Reminder for the weekend: progress isn't linear. A hard day doesn't erase a good week. Be gentle with yourselves. 💛",
    likes: 156,
    replies: 23,
    verified: true
  }];
  window.CommunityScreen = function CommunityScreen({
    onBack
  }) {
    const [liked, setLiked] = R.useState({});
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        background: "var(--aminy-mist)",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement(Header, {
      title: "Community",
      sub: "Parents who get it",
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        overflowX: "auto",
        paddingBottom: 2
      }
    }, ["All", "Mornings", "Sleep", "Newly diagnosed", "IEP & school", "Wins"].map((c, i) => /*#__PURE__*/React.createElement("span", {
      key: c,
      style: {
        flexShrink: 0,
        padding: "7px 13px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
        background: i === 0 ? "var(--aminy-teal-600)" : "#fff",
        color: i === 0 ? "#fff" : "var(--color-text-muted)",
        border: i === 0 ? "0" : "1px solid var(--color-border-strong)"
      }
    }, c))), POSTS.map((p, i) => {
      const on = liked[i];
      const initials = p.who.split(" ").map(w => w[0]).join("").slice(0, 2);
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          background: "#fff",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: 14,
          boxShadow: "var(--shadow-sm)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: p.verified ? "linear-gradient(135deg,var(--aminy-teal-400),var(--aminy-teal-700))" : "linear-gradient(135deg,#fbcfe8,#f472b6)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
          fontFamily: "var(--font-ui)"
        }
      }, initials), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 5
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13.5,
          fontWeight: 700,
          color: "var(--color-text-strong)"
        }
      }, p.who), p.verified && /*#__PURE__*/React.createElement(AIcon, {
        name: "shield",
        size: 12,
        style: {
          color: "var(--aminy-teal-600)"
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11.5,
          color: "var(--color-text-muted)"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--aminy-teal-700)",
          fontWeight: 600
        }
      }, p.tag), " \xB7 ", p.time))), /*#__PURE__*/React.createElement("p", {
        style: {
          fontSize: 14,
          color: "var(--color-text)",
          lineHeight: 1.55,
          margin: "0 0 12px"
        }
      }, p.body), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 18
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setLiked(l => ({
          ...l,
          [i]: !l[i]
        })),
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: 0,
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          fontWeight: 600,
          color: on ? "var(--aminy-care-600)" : "var(--color-text-muted)"
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: "heart",
        size: 15
      }), " ", p.likes + (on ? 1 : 0)), /*#__PURE__*/React.createElement("span", {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--color-text-muted)"
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: "msgsq",
        size: 15
      }), " ", p.replies)));
    })));
  };

  // ---------- WEEKLY REPORT ----------
  window.ReportScreen = function ReportScreen({
    onBack
  }) {
    const {
      Button,
      Stat
    } = window.AminyKit;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        background: "var(--aminy-mist)",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement(Header, {
      title: "Weekly report",
      sub: "Kai's gentle progress \xB7 this week",
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,var(--aminy-win-50),#fff)",
        border: "1px solid var(--aminy-win-100)",
        borderRadius: 18,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24
      }
    }, "\uD83C\uDF31"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 19,
        color: "var(--color-text-strong)",
        lineHeight: 1.25,
        letterSpacing: "-0.01em",
        margin: "8px 0 0",
        WebkitFontSmoothing: "antialiased"
      }
    }, "Kai had more calm mornings this week than last. That's real progress.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 9
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Routine days",
      value: "5",
      unit: "/7",
      caption: "+2 vs last week",
      accent: true
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Calm streak",
      value: "3",
      unit: "days",
      caption: "Longest yet"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Goals progressing",
      value: "2",
      unit: "/3",
      caption: "On track"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "var(--color-text-strong)",
        marginBottom: 10
      }
    }, "What went well"), ["Independent tooth-brushing 5 of 7 days", "Named \"frustrated\" twice without prompting", "Calmer transitions to school"].map((t, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 9,
        fontSize: 13,
        color: "var(--color-text)",
        lineHeight: 1.4,
        marginBottom: i < 2 ? 8 : 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "check",
      size: 15,
      style: {
        color: "var(--aminy-grow-600)",
        flexShrink: 0,
        marginTop: 1
      }
    }), t))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: "13px 15px",
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 38,
        height: 38,
        borderRadius: 10,
        background: "var(--aminy-teal-50)",
        color: "var(--aminy-teal-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "send",
      size: 17
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "Auto-send weekly"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)"
      }
    }, "To Alex & Dr. Morales \xB7 every Sunday")), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 44,
        height: 26,
        borderRadius: 999,
        background: "var(--aminy-teal-600)",
        position: "relative",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: 3,
        right: 3,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#fff"
      }
    }))), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      fullWidth: true,
      icon: /*#__PURE__*/React.createElement(AIcon, {
        name: "doc",
        size: 16
      }),
      onClick: () => window.aminyToast("Generating PDF… we'll save it to your vault.")
    }, "Export as PDF")));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/destinations.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/home.jsx
try { (() => {
/* Home — the default parent screen. Validate first, then inform. window.HomeScreen */
(function () {
  const {
    AIcon
  } = window;
  const ROUTINES = {
    "☀️": [{
      em: "☀️",
      t: "Wake & stretch",
      d: "Curtains, 5 deep breaths together.",
      time: "7:15",
      done: true
    }, {
      em: "🦷",
      t: "Teeth",
      d: "Two-minute song — Kai picks.",
      time: "7:30",
      done: true
    }, {
      em: "👟",
      t: "Get dressed",
      d: "Clothes laid out last night.",
      time: "7:45",
      done: false
    }, {
      em: "🥣",
      t: "Breakfast",
      d: "Same bowl, same spot.",
      time: "8:00",
      done: false
    }],
    "🌤️": [{
      em: "🎒",
      t: "Pack & go",
      d: "Backpack by the door.",
      time: "8:20",
      done: false
    }, {
      em: "🧩",
      t: "After-school reset",
      d: "20 quiet minutes, no questions.",
      time: "3:30",
      done: false
    }],
    "🌙": [{
      em: "🛁",
      t: "Bath",
      d: "Warm, low light.",
      time: "7:00",
      done: false
    }, {
      em: "📖",
      t: "Two books",
      d: "Kai chooses both.",
      time: "7:30",
      done: false
    }],
    "⭐": [{
      em: "💬",
      t: "High & low",
      d: "One good thing, one hard thing.",
      time: "8:00",
      done: false
    }]
  };

  // Context-aware affirmations — Aminy adapts the message to time of day + what's
  // happening with Kai this week (here: a rotating set; in-app this is AI-generated
  // from the child's recent patterns, wins, and logged concerns).
  const AFFIRMATIONS = {
    morning: ["Mornings have been the hard part lately. Showing up for this one already counts.", "You don't have to be perfect. You just have to be present. And you are.", "Kai's calmest mornings have followed your steady ones. He's watching you, not the clock."],
    afternoon: ["Whatever this morning was, it's behind you both now. Fresh start, any minute you choose.", "Three steady afternoons this week. The reset routine is working — keep going."],
    evening: ["You made it through today. That's not small. Rest is part of the plan too.", "Three calm bedtimes in a row. Whatever you're doing at night, it's landing."]
  };
  const partOfDay = () => {
    const h = new Date().getHours();
    return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  };
  window.HomeScreen = function HomeScreen({
    onNav,
    onJoin
  }) {
    const DS = window.DesignSystem_39fb2b;
    const {
      Avatar,
      Badge,
      Nudge,
      Stat,
      Button
    } = DS;
    const [tab, setTab] = React.useState("☀️");
    const [checks, setChecks] = React.useState({
      "☀️-0": true,
      "☀️-1": true
    });
    const [nudge, setNudge] = React.useState(true);
    const pod = partOfDay();
    const pool = AFFIRMATIONS[pod];
    const [affIdx, setAffIdx] = React.useState(0);
    const rows = ROUTINES[tab];
    const key = i => `${tab}-${i}`;
    const isDone = i => checks[key(i)] ?? rows[i].done;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "6px 20px 18px",
        background: "linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0))"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h2",
      style: {
        fontSize: 22
      }
    }, "Hi Sarah."), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "Here's Kai's calm start today.")), /*#__PURE__*/React.createElement(Avatar, {
      name: "Sarah",
      tone: "teal",
      size: 40
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        margin: "0 0 16px",
        maxWidth: 330
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "aminy-affirm",
      style: {
        fontSize: 16.5,
        margin: 0,
        flex: 1
      }
    }, pool[affIdx % pool.length]), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        window.aminyHaptic && window.aminyHaptic.light();
        setAffIdx(i => i + 1);
      },
      "aria-label": "Another thought",
      title: "Another thought from Aminy",
      style: {
        flexShrink: 0,
        width: 28,
        height: 28,
        borderRadius: 999,
        border: "1px solid var(--color-border)",
        background: "#fff",
        color: "var(--aminy-teal-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        marginTop: 2,
        transition: "transform var(--dur-base) var(--ease-lift)"
      },
      onPointerDown: e => e.currentTarget.style.transform = "rotate(60deg)",
      onPointerUp: e => e.currentTarget.style.transform = "none",
      onPointerLeave: e => e.currentTarget.style.transform = "none"
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 13
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 20,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--color-border)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: "Kai",
      tone: "child",
      size: 52
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.aminyToast("Add a photo of Kai"),
      "aria-label": "Add photo",
      style: {
        position: "absolute",
        right: -2,
        bottom: -2,
        width: 20,
        height: 20,
        borderRadius: 999,
        background: "var(--aminy-teal-600)",
        border: "2px solid #fff",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "plus",
      size: 11
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "Kai \xB7 7"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 3
      }
    }, "Focus this week: morning transitions"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: "teal"
    }, "Mornings"), /*#__PURE__*/React.createElement(Badge, {
      tone: "navy"
    }, "Transitions"))))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "0 18px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--aminy-teal-200)",
        borderRadius: 16,
        padding: "13px 15px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "var(--shadow-sm)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 42,
        height: 42,
        borderRadius: 12,
        background: "var(--aminy-teal-50)",
        color: "var(--aminy-teal-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "video",
      size: 20
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "OT with Dr. Patel"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--aminy-teal-700)",
        marginTop: 1,
        fontWeight: 600
      }
    }, "Starts now \xB7 TeleABA")), /*#__PURE__*/React.createElement("button", {
      onClick: () => onJoin && onJoin(),
      style: {
        height: 38,
        padding: "0 18px",
        borderRadius: 11,
        border: 0,
        cursor: "pointer",
        background: "var(--aminy-teal-600)",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 13.5,
        boxShadow: "var(--shadow-glow-teal)"
      }
    }, "Join")), /*#__PURE__*/React.createElement("button", {
      onClick: () => onNav && onNav("tele"),
      style: {
        textAlign: "left",
        cursor: "pointer",
        border: "1px solid var(--aminy-teal-200)",
        background: "linear-gradient(120deg,var(--aminy-teal-50),#fff)",
        borderRadius: 18,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 13,
        boxShadow: "var(--shadow-sm)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        borderRadius: 13,
        background: "var(--aminy-teal-600)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "var(--shadow-glow-teal)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "video",
      size: 22,
      style: {
        color: "#fff"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "Book a TeleABA visit"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, "Same-week openings \xB7 10% member savings")), /*#__PURE__*/React.createElement(AIcon, {
      name: "chevron",
      size: 18,
      style: {
        color: "var(--aminy-teal-700)"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 2
      }
    }, [{
      t: "Today · 3pm",
      l: "OT with Dr. Patel",
      m: "TeleABA · 30 min"
    }, {
      t: "Thu",
      l: "Weekly review",
      m: "Dr. Morales (BCBA)"
    }, {
      t: "Sat",
      l: "Park playdate",
      m: ""
    }].map((u, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flexShrink: 0,
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        padding: "10px 12px",
        minWidth: 144
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "var(--aminy-teal-700)",
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase"
      }
    }, u.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-text-strong)",
        marginTop: 4,
        lineHeight: 1.3
      }
    }, u.l), u.m && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, u.m)))), nudge && /*#__PURE__*/React.createElement(Nudge, {
      actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        onClick: () => setNudge(false)
      }, "Try it today"), /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "ghost",
        onClick: () => setNudge(false)
      }, "Not this one"))
    }, "Mornings are rough \u2014 you already know. Try teeth ", /*#__PURE__*/React.createElement("em", null, "before"), " dressed this week. Small change, big difference."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "This week",
      value: "5",
      unit: "/7",
      caption: "Routine days",
      accent: true
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Calm streak",
      value: "3",
      unit: "days",
      caption: "Longest this month"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Goals met",
      value: "2",
      unit: "/3",
      caption: "One left \xB7 no rush"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h3",
      style: {
        fontSize: 15
      }
    }, "Today's routine"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        background: "#fff",
        padding: 3,
        borderRadius: 999,
        border: "1px solid var(--color-border)"
      }
    }, Object.keys(ROUTINES).map(e => /*#__PURE__*/React.createElement("button", {
      key: e,
      onClick: () => setTab(e),
      style: {
        width: 30,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        fontSize: 14,
        cursor: "pointer",
        border: 0,
        background: e === tab ? "var(--aminy-teal-600)" : "transparent",
        filter: e === tab ? "none" : "grayscale(0.2)"
      }
    }, e)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6
      }
    }, rows.map((r, i) => {
      const done = isDone(i);
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        onClick: () => {
          const willDo = !done;
          if (window.aminyHaptic) willDo ? window.aminyHaptic.success() : window.aminyHaptic.light();
          setChecks(c => ({
            ...c,
            [key(i)]: !done
          }));
        },
        style: {
          background: "#fff",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          padding: "10px 12px",
          display: "grid",
          gridTemplateColumns: "32px 1fr auto 24px",
          gap: 10,
          alignItems: "center",
          cursor: "pointer",
          transition: "transform var(--dur-fast) var(--ease-calm), box-shadow var(--dur-base) var(--ease-calm)"
        },
        onPointerDown: e => e.currentTarget.style.transform = "scale(0.985)",
        onPointerUp: e => e.currentTarget.style.transform = "none",
        onPointerLeave: e => e.currentTarget.style.transform = "none"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 18,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--aminy-mist)",
          borderRadius: 8
        }
      }, r.em), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-strong)",
          lineHeight: 1.2
        }
      }, r.t), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "var(--color-text-muted)",
          marginTop: 2
        }
      }, r.d)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: "var(--color-text-muted)",
          fontWeight: 600
        }
      }, r.time), /*#__PURE__*/React.createElement("div", {
        style: {
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: `2px solid ${done ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`,
          background: done ? "var(--aminy-teal-600)" : "transparent",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, done && /*#__PURE__*/React.createElement(AIcon, {
        name: "check",
        size: 13,
        stroke: 3
      })));
    }))));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/home.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/icons.jsx
try { (() => {
/* Aminy parent app — Lucide icon set (stroke 2, round caps).
   Attaches window.AIcon: a tiny lookup-by-name SVG component. */
(function () {
  const P = {
    home: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    })),
    heart: /*#__PURE__*/React.createElement("path", {
      d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
    }),
    sparkles: /*#__PURE__*/React.createElement("path", {
      d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
    }),
    video: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "2",
      y: "7",
      width: "15",
      height: "14",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m22 12-5-3v8l5-3Z"
    })),
    wind: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9.6 4.6A2 2 0 1 1 11 8H2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12.6 19.4A2 2 0 1 0 14 16H2"
    })),
    more: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "1"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "19",
      cy: "12",
      r: "1"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "5",
      cy: "12",
      r: "1"
    })),
    check: /*#__PURE__*/React.createElement("path", {
      d: "M20 6 9 17l-5-5"
    }),
    send: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m22 2-7 20-4-9-9-4z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M22 2 11 13"
    })),
    mic: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M19 10v2a7 7 0 0 1-14 0v-2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 19v3"
    })),
    clock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 6v6l4 2"
    })),
    calendar: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "18",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 2v4M8 2v4M3 10h18"
    })),
    sunset: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 10V2M4.93 10.93l1.41 1.41M2 18h2M20 18h2M17.66 12.34l1.41-1.41M22 22H2M16 18a4 4 0 0 0-8 0M8 6l4 4 4-4"
    })),
    star: /*#__PURE__*/React.createElement("path", {
      d: "M11.5 2.3 14 8l5.7.5-4.3 3.7 1.3 5.5L11.5 20 6.3 17.7l1.3-5.5L3.3 8.5 9 8z"
    }),
    cap: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M22 10v6M2 10l10-5 10 5-10 5z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 12v5c3 3 9 3 12 0v-5"
    })),
    msgsq: /*#__PURE__*/React.createElement("path", {
      d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
    }),
    hand: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M18 11V6a2 2 0 0 0-4 0v5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 10V4a2 2 0 0 0-4 0v6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 10.5V6a2 2 0 0 0-4 0v8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13"
    })),
    sliders: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
      x1: "4",
      y1: "21",
      x2: "4",
      y2: "14"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "4",
      y1: "10",
      x2: "4",
      y2: "3"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "21",
      x2: "12",
      y2: "12"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "8",
      x2: "12",
      y2: "3"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "20",
      y1: "21",
      x2: "20",
      y2: "16"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "20",
      y1: "12",
      x2: "20",
      y2: "3"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "1",
      y1: "14",
      x2: "7",
      y2: "14"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "9",
      y1: "8",
      x2: "15",
      y2: "8"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "17",
      y1: "16",
      x2: "23",
      y2: "16"
    })),
    micOff: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
      x1: "2",
      y1: "2",
      x2: "22",
      y2: "22"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18.89 13.23A7.12 7.12 0 0 0 19 12v-2M5 10v2a7 7 0 0 0 12 5M15 9.34V5a3 3 0 0 0-5.68-1.33M9 9v3a3 3 0 0 0 5.12 2.12"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "19",
      x2: "12",
      y2: "22"
    })),
    videoOff: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m16 16-1.5-1.5M10 6h2a2 2 0 0 1 2 2v2m0 4v.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h.5M22 8l-6 4 6 4V8Z"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "2",
      y1: "2",
      x2: "22",
      y2: "22"
    })),
    phoneOff: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67M5 5a2 2 0 0 0-2 2v0a2 2 0 0 1-2 2 0M2 2l20 20"
    })),
    brain: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 5a3 3 0 1 0-5.997.142 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 5a3 3 0 1 1 5.997.142 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"
    })),
    lock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "11",
      width: "18",
      height: "11",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M7 11V7a5 5 0 0 1 10 0v4"
    })),
    doc: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 2v4a2 2 0 0 0 2 2h4"
    })),
    help: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 17h.01"
    })),
    logout: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m16 17 5-5-5-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M21 12H9"
    })),
    eye: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    })),
    settings: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
    })),
    back: /*#__PURE__*/React.createElement("path", {
      d: "m15 18-6-6 6-6"
    }),
    award: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "8",
      r: "6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"
    })),
    shield: /*#__PURE__*/React.createElement("path", {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }),
    chevron: /*#__PURE__*/React.createElement("path", {
      d: "m9 18 6-6-6-6"
    }),
    plus: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M5 12h14"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 5v14"
    })),
    bell: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M10.268 21a2 2 0 0 0 3.464 0"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
    })),
    moon: /*#__PURE__*/React.createElement("path", {
      d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
    }),
    sun: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
    })),
    users: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "7",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
    })),
    file: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 2v4a2 2 0 0 0 2 2h4"
    })),
    trending: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M16 7h6v6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m22 7-8.5 8.5-5-5L2 17"
    })),
    download: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M7 10l5 5 5-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 15V3"
    })),
    lightbulb: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 18h6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 22h4"
    })),
    barChart: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "20",
      x2: "12",
      y2: "10"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "18",
      y1: "20",
      x2: "18",
      y2: "4"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "6",
      y1: "20",
      x2: "6",
      y2: "16"
    })),
    refresh: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M21 3v5h-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M3 21v-5h5"
    })),
    target: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "6"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "2"
    })),
    brain: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 5a3 3 0 0 0-5.9-.6A2.5 2.5 0 0 0 3.5 7a2.5 2.5 0 0 0 .5 4.5A2.5 2.5 0 0 0 6 16a3 3 0 0 0 6 0V5Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 5a3 3 0 0 1 5.9-.6A2.5 2.5 0 0 1 20.5 7a2.5 2.5 0 0 1-.5 4.5A2.5 2.5 0 0 1 18 16a3 3 0 0 1-6 0V5Z"
    }))
  };
  window.AIcon = function AIcon({
    name,
    size = 20,
    stroke = 2,
    style
  }) {
    return /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: stroke,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: style,
      "aria-hidden": "true"
    }, P[name] || null);
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/marketplace.jsx
try { (() => {
/* Find Your Guide — provider marketplace. Ported from ProviderMarketplace.tsx.
   Your designated guide pinned up top (Book again = cash-pay same provider),
   category filter, verified provider cards, profile + session pricing, member discount.
   Real session prices from the source. window.MarketScreen */
(function () {
  const {
    AIcon
  } = window;
  const R = React;
  const TYPE = {
    bcba: {
      icon: "cap",
      title: "Board Certified Behavior Analyst",
      tint: "var(--aminy-teal-50)",
      fg: "var(--aminy-teal-700)"
    },
    rbt: {
      icon: "users",
      title: "Registered Behavior Technician",
      tint: "var(--aminy-teal-50)",
      fg: "var(--aminy-teal-700)"
    },
    slp: {
      icon: "msgsq",
      title: "Speech-Language Pathologist",
      tint: "var(--aminy-care-50)",
      fg: "var(--aminy-care-600)"
    },
    ot: {
      icon: "hand",
      title: "Occupational Therapist",
      tint: "#fff7ed",
      fg: "#c2410c"
    }
  };
  const PROVIDERS = [{
    id: "morales",
    name: "Ana Morales",
    cred: "BCBA-D",
    type: "bcba",
    rating: 4.9,
    reviews: 214,
    years: 12,
    rate: 149,
    designated: true,
    specialties: ["Early Intervention", "Parent Training", "Transitions"],
    insurance: ["AHCCCS", "BCBS", "Self-Pay"],
    langs: ["English", "Spanish"],
    next: "Tomorrow",
    bio: "Kai's BCBA. Warm, structured, deeply practical — she builds plans families can actually run at home.",
    verified: true
  }, {
    id: "chen",
    name: "David Chen",
    cred: "BCBA",
    type: "bcba",
    rating: 4.8,
    reviews: 156,
    years: 8,
    rate: 139,
    designated: false,
    specialties: ["Feeding", "Daily Routines", "Sleep"],
    insurance: ["Aetna", "Cigna", "Self-Pay"],
    langs: ["English", "Mandarin"],
    next: "Thu",
    bio: "Specializes in mealtime and bedtime battles. Calm, data-driven, and very responsive between sessions.",
    verified: true
  }, {
    id: "okafor",
    name: "Grace Okafor",
    cred: "M.S., CCC-SLP",
    type: "slp",
    rating: 5.0,
    reviews: 98,
    years: 10,
    rate: 139,
    designated: false,
    specialties: ["AAC", "Social Communication", "Speech Delay"],
    insurance: ["BCBS", "UnitedHealthcare", "Self-Pay"],
    langs: ["English"],
    next: "Fri",
    bio: "AAC and early-language specialist who makes communication playful and pressure-free.",
    verified: true
  }, {
    id: "patel",
    name: "Riya Patel",
    cred: "OTR/L",
    type: "ot",
    rating: 4.9,
    reviews: 132,
    years: 9,
    rate: 139,
    designated: false,
    specialties: ["Sensory Processing", "Fine Motor", "Self-Care"],
    insurance: ["AHCCCS", "Aetna", "Self-Pay"],
    langs: ["English", "Hindi"],
    next: "Today",
    bio: "Sensory and motor-skills OT. Turns regulation work into games kids ask to do again.",
    verified: true
  }];
  const SESSIONS = [{
    group: "Behavioral",
    color: "var(--aminy-teal-700)",
    bg: "var(--aminy-teal-50)",
    items: [["ABA Specialist Consultation", "Up to 60 min with a BCBA", 149], ["ABA Assessment", "Up to 90 min comprehensive review", 269], ["ABA Coaching Session", "Up to 30 min skill-building", 49]]
  }, {
    group: "Therapy & Wellness",
    color: "var(--aminy-care-600)",
    bg: "var(--aminy-care-50)",
    items: [["Family Therapy", "Up to 45 min, licensed therapist", 129], ["Speech Therapy", "Up to 45 min communication support", 139], ["Occupational Therapy", "Up to 45 min sensory & motor", 139]]
  }, {
    group: "Diagnostic Evaluations",
    color: "#c2410c",
    bg: "#fff7ed",
    note: "Skip the 12-month waitlist. Answers in days.",
    items: [["ADHD Evaluation", "Up to 60 min", 299], ["Autism Evaluation", "Up to 90 min", 799], ["Combined Evaluation", "Up to 120 min", 999]]
  }];
  const CATS = [["all", "All"], ["bcba", "Behavioral"], ["therapy", "Therapy"], ["eval", "Evaluations"]];
  const MEMBER_DISCOUNT = 10; // Core tier

  function Stars({
    r
  }) {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 3
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "star",
      size: 13,
      style: {
        color: "var(--aminy-win-500)"
      }
    }), /*#__PURE__*/React.createElement("b", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-strong)"
      }
    }, r));
  }
  function ProviderCard({
    p,
    onOpen
  }) {
    const t = TYPE[p.type];
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => onOpen(p),
      style: {
        textAlign: "left",
        width: "100%",
        cursor: "pointer",
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 14,
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 52,
        height: 52,
        borderRadius: 14,
        background: t.tint,
        color: t.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: t.icon,
      size: 24
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: "var(--color-text-strong)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, p.name, ", ", p.cred), p.verified && /*#__PURE__*/React.createElement(AIcon, {
      name: "shield",
      size: 13,
      style: {
        color: "var(--aminy-teal-600)",
        flexShrink: 0
      }
    })), /*#__PURE__*/React.createElement(Stars, {
      r: p.rating
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, t.title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 5,
        marginTop: 8
      }
    }, p.specialties.slice(0, 3).map(s => /*#__PURE__*/React.createElement("span", {
      key: s,
      style: {
        fontSize: 10.5,
        fontWeight: 600,
        color: "var(--color-text-muted)",
        border: "1px solid var(--color-border)",
        borderRadius: 999,
        padding: "2px 8px"
      }
    }, s))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        color: "var(--aminy-grow-600)",
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "calendar",
      size: 13
    }), " Next: ", p.next), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--aminy-teal-700)",
        background: "var(--aminy-teal-50)",
        padding: "3px 9px",
        borderRadius: 999
      }
    }, "From $", p.rate))));
  }
  function Detail({
    p,
    onBack,
    onBook
  }) {
    const t = TYPE[p.type];
    const discounted = Math.round(p.rate * (1 - MEMBER_DISCOUNT / 100));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        background: "#fff"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 16px 12px",
        display: "flex",
        alignItems: "center",
        gap: 11,
        borderBottom: "1px solid var(--color-border)"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "back",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 16,
        color: "var(--color-text-strong)",
        letterSpacing: "-0.01em"
      }
    }, "Provider profile")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 14,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 66,
        height: 66,
        borderRadius: 18,
        background: t.tint,
        color: t.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: t.icon,
      size: 30
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18,
        fontWeight: 700,
        color: "var(--color-text-strong)",
        letterSpacing: "-0.01em"
      }
    }, p.name, ", ", p.cred), p.verified && /*#__PURE__*/React.createElement(AIcon, {
      name: "shield",
      size: 15,
      style: {
        color: "var(--aminy-teal-600)"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, t.title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement(Stars, {
      r: p.rating
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)"
      }
    }, p.reviews, " reviews \xB7 ", p.years, "y exp")))), p.designated && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        alignSelf: "flex-start",
        background: "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-100)",
        color: "var(--aminy-teal-800)",
        borderRadius: 999,
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "heart",
      size: 13
    }), " Your designated guide"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14,
        color: "var(--color-text)",
        lineHeight: 1.55,
        margin: 0
      }
    }, p.bio), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 8
      }
    }, "Specialties"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6
      }
    }, p.specialties.map(s => /*#__PURE__*/React.createElement("span", {
      key: s,
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--aminy-teal-700)",
        background: "var(--aminy-teal-50)",
        borderRadius: 999,
        padding: "5px 11px"
      }
    }, s)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 18
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 5
      }
    }, "Languages"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text)"
      }
    }, p.langs.join(", "))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 5
      }
    }, "Insurance"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text)"
      }
    }, p.insurance.join(" · ")))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "60-min session"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: "var(--color-text-subtle)",
        textDecoration: "line-through",
        marginRight: 6
      }
    }, "$", p.rate), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 19,
        fontWeight: 700,
        color: "var(--aminy-teal-700)"
      }
    }, "$", discounted))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--aminy-teal-700)",
        marginTop: 4
      }
    }, "Core member price \xB7 ", MEMBER_DISCOUNT, "% off \xB7 HSA/FSA eligible"))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: "auto",
        padding: "12px 16px",
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        width: 48,
        flexShrink: 0,
        borderRadius: 12,
        border: "1px solid var(--color-border-strong)",
        background: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--aminy-teal-700)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "msgsq",
      size: 18
    })), /*#__PURE__*/React.createElement("button", {
      onClick: onBook,
      style: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        border: 0,
        cursor: "pointer",
        background: "var(--aminy-teal-600)",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 16,
        boxShadow: "var(--shadow-cta)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "calendar",
      size: 18
    }), " Book with ", p.name.split(" ")[0])));
  }
  window.MarketScreen = function MarketScreen({
    onBack,
    onBook
  }) {
    const [cat, setCat] = R.useState("all");
    const [active, setActive] = R.useState(null);
    const designated = PROVIDERS.find(p => p.designated);
    const filtered = PROVIDERS.filter(p => cat === "all" ? true : cat === "bcba" ? p.type === "bcba" || p.type === "rbt" : cat === "therapy" ? p.type === "slp" || p.type === "ot" : false);
    if (active) return /*#__PURE__*/React.createElement(Detail, {
      p: active,
      onBack: () => setActive(null),
      onBook: () => onBook && onBook(active)
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        background: "var(--aminy-mist)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 16px 12px",
        display: "flex",
        alignItems: "center",
        gap: 11,
        borderBottom: "1px solid var(--color-border)",
        background: "#fff"
      }
    }, onBack && /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "back",
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: "-0.02em",
        color: "var(--color-text-strong)"
      }
    }, "Find your guide"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, "Verified providers for Kai's journey"))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, designated && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)",
        border: "1px solid var(--aminy-teal-200)",
        borderRadius: 18,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--aminy-teal-700)",
        marginBottom: 10
      }
    }, "Your guide"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 48,
        height: 48,
        borderRadius: 14,
        background: "#fff",
        color: "var(--aminy-teal-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        border: "1px solid var(--aminy-teal-100)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "cap",
      size: 22
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, designated.name, ", ", designated.cred), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)"
      }
    }, "Kai's BCBA \xB7 ", /*#__PURE__*/React.createElement(Stars, {
      r: designated.rating
    }), " ", designated.reviews))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onBook && onBook(designated),
      style: {
        flex: 1,
        height: 42,
        borderRadius: 11,
        border: 0,
        cursor: "pointer",
        background: "var(--aminy-teal-600)",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 13.5,
        boxShadow: "var(--shadow-cta)"
      }
    }, "Book again"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setActive(designated),
      style: {
        flex: 1,
        height: 42,
        borderRadius: 11,
        border: "1px solid var(--color-border-strong)",
        cursor: "pointer",
        background: "#fff",
        color: "var(--color-text)",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 13.5
      }
    }, "View profile"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "Live & upcoming"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--aminy-teal-700)",
        fontWeight: 600
      }
    }, "Free to join")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        overflowX: "auto",
        paddingBottom: 4
      }
    }, [{
      live: true,
      host: "Dr. Ana Morales",
      cred: "BCBA-D",
      topic: "Morning meltdowns: a live Q&A",
      watching: 38
    }, {
      live: false,
      host: "Grace Okafor",
      cred: "CCC-SLP",
      topic: "First words & AAC basics",
      when: "Today 7:00 PM"
    }, {
      live: false,
      host: "Riya Patel",
      cred: "OTR/L",
      topic: "Calming a sensory-overload moment",
      when: "Thu 12:00 PM"
    }].map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flexShrink: 0,
        width: 230,
        background: "#fff",
        border: `1px solid ${s.live ? "var(--aminy-teal-300)" : "var(--color-border)"}`,
        borderRadius: 16,
        padding: 13,
        boxShadow: "var(--shadow-sm)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 8
      }
    }, s.live ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: ".06em",
        color: "#fff",
        background: "var(--aminy-alert-600)",
        padding: "3px 8px",
        borderRadius: 999
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: 999,
        background: "#fff",
        animation: "lvpulse 1.2s ease-in-out infinite"
      }
    }), "LIVE") : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: ".06em",
        color: "var(--aminy-teal-700)",
        background: "var(--aminy-teal-50)",
        padding: "3px 8px",
        borderRadius: 999
      }
    }, s.when), s.live && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--color-text-muted)"
      }
    }, s.watching, " watching")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: "var(--color-text-strong)",
        lineHeight: 1.3,
        marginBottom: 6,
        minHeight: 35
      }
    }, s.topic), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)",
        marginBottom: 10
      }
    }, s.host, ", ", s.cred), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        window.aminyHaptic && window.aminyHaptic.medium();
        window.aminyToast && window.aminyToast(s.live ? "Joining " + s.host + "'s live session…" : "Reminder set — we'll ping you");
      },
      style: {
        width: "100%",
        height: 38,
        borderRadius: 11,
        border: 0,
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 13,
        background: s.live ? "var(--aminy-teal-600)" : "#fff",
        color: s.live ? "#fff" : "var(--aminy-teal-700)",
        boxShadow: s.live ? "var(--shadow-cta)" : "inset 0 0 0 1px var(--aminy-teal-200)"
      }
    }, s.live ? "Join now" : "Remind me")))), /*#__PURE__*/React.createElement("style", null, `@keyframes lvpulse{0%,100%{opacity:1}50%{opacity:.3}}`)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        overflowX: "auto",
        paddingBottom: 2
      }
    }, CATS.map(([id, label]) => {
      const on = cat === id;
      return /*#__PURE__*/React.createElement("button", {
        key: id,
        onClick: () => setCat(id),
        style: {
          flexShrink: 0,
          padding: "8px 14px",
          borderRadius: 999,
          cursor: "pointer",
          border: `1px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`,
          background: on ? "var(--aminy-teal-600)" : "#fff",
          color: on ? "#fff" : "var(--color-text)",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          fontWeight: 600
        }
      }, label);
    })), cat === "eval" ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, SESSIONS.find(s => s.group === "Diagnostic Evaluations").items.map(([name, desc, price]) => /*#__PURE__*/React.createElement("div", {
      key: name,
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        padding: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, desc)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 17,
        fontWeight: 700,
        color: "#c2410c"
      }
    }, "$", price))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        textAlign: "center",
        padding: "2px 10px",
        lineHeight: 1.5
      }
    }, "Skip the 12-month waitlist \u2014 verified evaluators, answers in days.")) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, filtered.map(p => /*#__PURE__*/React.createElement(ProviderCard, {
      key: p.id,
      p: p,
      onOpen: setActive
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        justifyContent: "center",
        fontSize: 11.5,
        color: "var(--color-text-muted)",
        padding: "4px 10px",
        textAlign: "center",
        lineHeight: 1.5
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "shield",
      size: 13
    }), " Every session includes a video visit, written summary & follow-up.")));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/marketplace.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/onboarding.jsx
try { (() => {
/* Onboarding — conversational, Bevel-style. Ported from the real AIOnboarding.tsx.
   Aminy asks one question at a time, builds the child's profile live as chips,
   then generates a tailored first suggestion. Rebuilt in the Aminy system. window.Onboarding */
(function () {
  const {
    AIcon
  } = window;
  const R = React;

  // Faithful to AIOnboarding.tsx: 5 questions, profile extraction, tailored suggestion.
  const QUESTIONS = [{
    key: "childName",
    q: p => `Hi${p ? ` ${p}` : ""} — I'm Aminy, and I'm here to support your family. What's your child's name?`,
    chips: null,
    extract: t => {
      const c = t.trim().replace(/[.!?,]/g, "");
      const w = c.split(/\s+/);
      if (w.length <= 3) return c;
      const m = c.match(/(?:name is|called|it's|he's|she's|they're)\s+(\w+)/i);
      return m ? m[1] : w[0];
    }
  }, {
    key: "childAge",
    q: n => `Great name. How old is ${n}?`,
    chips: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13+"],
    extract: t => {
      const m = t.match(/(\d{1,2})/);
      return m ? m[1] : t.trim();
    }
  }, {
    key: "concerns",
    q: n => `What are the biggest challenges you and ${n} are facing right now? Don't hold back — I've heard it all.`,
    chips: ["Mornings & transitions", "Sleep & bedtime", "Big feelings / meltdowns", "Talking & communication"],
    extract: t => t.trim()
  }, {
    key: "diagnoses",
    q: n => `Does ${n} have any diagnoses? Totally fine if not — many families start here before a formal one. Pick all that apply.`,
    chips: ["Autism", "ADHD", "Speech delay", "Sensory (SPD)", "Anxiety", "Not yet"],
    multi: true,
    extract: t => t.trim()
  }, {
    key: "services",
    q: n => `Is ${n} getting any therapy or services right now? Pick all that apply — if none yet, that's what we're here for.`,
    chips: ["ABA", "Speech", "OT", "PT", "Feeding", "Not yet"],
    multi: true,
    extract: t => t.trim()
  }];
  function suggestion(profile, w) {
    const n = profile.childName || "your child";
    const c = (profile.concerns || "").toLowerCase();
    if (/meltdown|tantrum|outburst|anger|feeling|aggress/i.test(c)) return `Build a "calm-down kit" ${w}: put 3 things ${n} finds soothing (a soft toy, a fidget, headphones) in a small bag. Next time things escalate, hand it over — "Here's your calm kit." No other words needed. Kids self-regulate faster with tools than instructions.`;
    if (/sleep|bedtime|night/i.test(c)) return `Set up a "bedtime runway" for tonight: 30 min before bed, dim the lights, screens off, same 3 things in the same order (teeth, story, song). ${n}'s brain needs predictability to wind down. Even one consistent night helps.`;
    if (/transition|morning|change|switch/i.test(c)) return `Try "first-then" the next time a transition comes up: say "First we [now], then we [next]." Show it visually if you can, with a 5- and 1-minute warning. ${n}'s brain just needs advance notice.`;
    if (/speech|language|talk|communicat|word/i.test(c)) return `At the next meal, try gentle "sabotage": put ${n}'s favorite food in a container they can't open alone. Wait — don't prompt. When they gesture or vocalize, model the word once ("open!") and help right away. Natural motivation to communicate.`;
    return `Sometime ${w}, spend 5 uninterrupted minutes with ${n} doing whatever THEY choose. No agenda, no teaching, no correcting — just follow their lead. That connection is the foundation everything else builds on.`;
  }
  const FIELD_LABELS = {
    childName: "Name",
    childAge: "Age",
    concerns: "Challenges",
    diagnoses: "Diagnosis",
    services: "Services"
  };

  // Time-aware framing so "first step" matches when the parent is actually here.
  function whenPhrase() {
    const h = new Date().getHours();
    if (h < 11) return "this morning";
    if (h < 16) return "today";
    return "tonight";
  }
  window.Onboarding = function Onboarding({
    onDone,
    parentName = ""
  }) {
    const {
      Button
    } = window.AminyKit;
    const [msgs, setMsgs] = R.useState([]);
    const [input, setInput] = R.useState("");
    const [step, setStep] = R.useState(0);
    const [profile, setProfile] = R.useState({});
    const [typing, setTyping] = R.useState(false);
    const [done, setDone] = R.useState(false);
    const [primeNotif, setPrimeNotif] = R.useState(false);
    const [picks, setPicks] = R.useState([]); // multi-select staging
    const scrollRef = R.useRef(null);
    const buzz = ms => {
      try {
        navigator.vibrate && navigator.vibrate(ms);
      } catch (e) {}
    };
    R.useEffect(() => {
      const t = setTimeout(() => setMsgs([{
        role: "ai",
        text: QUESTIONS[0].q(parentName)
      }]), 600);
      return () => clearTimeout(t);
    }, [parentName]);
    R.useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [msgs, typing]);
    function submitMulti() {
      if (!picks.length) return;
      send(picks.join(", "));
      setPicks([]);
    }
    function send(val) {
      const text = (val != null ? val : input).trim();
      if (!text || typing || done) return;
      setInput("");
      setMsgs(m => [...m, {
        role: "parent",
        text
      }]);
      const cur = QUESTIONS[step];
      const ex = cur.extract(text);
      const up = {
        ...profile
      };
      if (cur.key === "childName") up.childName = ex;else if (cur.key === "childAge") up.childAge = ex;else if (cur.key === "concerns") up.concerns = text;else if (cur.key === "diagnoses") up.diagnoses = /no|none|not yet/i.test(text) ? "None yet" : ex;else if (cur.key === "services") up.services = /no|none|not yet/i.test(text) ? "None yet" : ex;
      setProfile(up);
      buzz(6);
      const next = step + 1;
      setTyping(true);
      setTimeout(() => {
        if (next < QUESTIONS.length) {
          setMsgs(m => [...m, {
            role: "ai",
            text: QUESTIONS[next].q(up.childName || "your child")
          }]);
          setStep(next);
        } else {
          const w = whenPhrase();
          setMsgs(m => [...m, {
            role: "ai",
            suggestion: true,
            when: w,
            text: `I already know enough to help. Here's a first step you can try ${w}:`,
            tip: suggestion(up, w)
          }]);
          setDone(true);
        }
        setTyping(false);
      }, 1100);
    }
    const filled = Object.keys(FIELD_LABELS).filter(k => profile[k]);
    const cur = QUESTIONS[step];
    const showChips = !done && !typing && cur && cur.chips && msgs.length > 0 && msgs[msgs.length - 1].role === "ai";

    // Final beat: gentle notification priming (iOS best practice the code lacks), then "Let's go"
    if (primeNotif) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 18,
          padding: "0 28px"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 92,
          height: 92,
          borderRadius: 28,
          background: "linear-gradient(135deg,#fff,var(--aminy-teal-50))",
          border: "1px solid var(--aminy-teal-100)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-md)"
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: "bell",
        size: 38,
        style: {
          color: "var(--aminy-teal-600)"
        }
      })), /*#__PURE__*/React.createElement("h2", {
        style: {
          fontFamily: "var(--font-brand)",
          fontWeight: 600,
          fontSize: 23,
          lineHeight: 1.2,
          color: "var(--color-text-strong)",
          margin: 0,
          maxWidth: 290,
          letterSpacing: "-0.01em",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale"
        }
      }, "A gentle nudge, only when it helps."), /*#__PURE__*/React.createElement("p", {
        style: {
          fontSize: 14.5,
          lineHeight: 1.55,
          color: "var(--color-text-muted)",
          margin: 0,
          maxWidth: 290
        }
      }, "A calm reminder before a rough moment, a note when ", profile.childName || "your child", " hits a milestone. Never noise \u2014 you choose what comes through.")), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "12px 22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12
        }
      }, /*#__PURE__*/React.createElement(Button, {
        variant: "primary",
        size: "lg",
        fullWidth: true,
        onClick: onDone
      }, "Turn on reminders"), /*#__PURE__*/React.createElement("button", {
        onClick: onDone,
        style: {
          border: 0,
          background: "none",
          cursor: "pointer",
          color: "var(--color-text-muted)",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "var(--font-ui)",
          padding: 8
        }
      }, "Maybe later")));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "4px 18px 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--color-border)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: "linear-gradient(135deg,var(--aminy-teal-500),var(--aminy-teal-700))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 15,
      style: {
        color: "#fff"
      }
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--color-text-strong)",
        fontFamily: "var(--font-ui)",
        letterSpacing: "-0.01em"
      }
    }, "Setting up your profile"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-muted)"
      }
    }, "Step ", Math.min(step + 1, QUESTIONS.length), " of ", QUESTIONS.length))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4
      }
    }, QUESTIONS.map((_, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        width: 7,
        height: 7,
        borderRadius: 999,
        background: i <= step ? "var(--aminy-teal-600)" : "var(--aminy-navy-100)"
      }
    })))), filled.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "10px 16px",
        borderBottom: "1px solid var(--color-border)",
        background: "rgba(255,255,255,0.5)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 7
      }
    }, "Building ", profile.childName || "your child", "'s profile"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6
      }
    }, filled.map(k => /*#__PURE__*/React.createElement("span", {
      key: k,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "var(--aminy-teal-50)",
        color: "var(--aminy-teal-800)",
        border: "1px solid var(--aminy-teal-100)",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "check",
      size: 11
    }), FIELD_LABELS[k], ": ", String(profile[k]).slice(0, 22))))), /*#__PURE__*/React.createElement("div", {
      ref: scrollRef,
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, msgs.map((m, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        alignSelf: m.role === "parent" ? "flex-end" : "flex-start",
        maxWidth: "86%",
        animation: "aminy-fade-up var(--dur-slow) var(--ease-lift) both"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "10px 13px",
        borderRadius: 16,
        fontSize: 14,
        lineHeight: 1.5,
        background: m.role === "parent" ? "var(--aminy-teal-600)" : "#fff",
        color: m.role === "parent" ? "#fff" : "var(--color-text)",
        border: m.role === "parent" ? "0" : "1px solid var(--color-border)",
        borderBottomRightRadius: m.role === "parent" ? 5 : 16,
        borderBottomLeftRadius: m.role === "parent" ? 16 : 5
      }
    }, m.text), m.suggestion && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: "12px 14px",
        borderRadius: 16,
        background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)",
        border: "1px solid var(--aminy-teal-100)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 14,
      style: {
        color: "var(--aminy-teal-700)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--aminy-teal-700)"
      }
    }, (m.when || "your").replace(/^./, x => x.toUpperCase()), " first step")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        lineHeight: 1.55,
        color: "var(--color-text-strong)"
      }
    }, m.tip)))), typing && /*#__PURE__*/React.createElement("div", {
      style: {
        alignSelf: "flex-start",
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        borderBottomLeftRadius: 5,
        padding: "12px 14px",
        display: "flex",
        gap: 4
      }
    }, [0, 1, 2].map(d => /*#__PURE__*/React.createElement("span", {
      key: d,
      style: {
        width: 7,
        height: 7,
        borderRadius: 999,
        background: "var(--aminy-navy-300)",
        animation: `ob 1s ease-in-out ${d * 0.2}s infinite`
      }
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 14px 14px",
        borderTop: "1px solid var(--color-border)"
      }
    }, showChips && (cur.multi ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 9
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        marginBottom: picks.length ? 9 : 0
      }
    }, cur.chips.map(c => {
      const on = picks.includes(c);
      const none = /not yet|none/i.test(c);
      return /*#__PURE__*/React.createElement("button", {
        key: c,
        onClick: () => {
          buzz(4);
          setPicks(p => {
            if (none) return on ? [] : [c];
            const cleaned = p.filter(x => !/not yet|none/i.test(x));
            return on ? cleaned.filter(x => x !== c) : [...cleaned, c];
          });
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "7px 12px",
          background: on ? "var(--aminy-teal-600)" : "#fff",
          border: `1px solid ${on ? "var(--aminy-teal-600)" : "var(--aminy-teal-200)"}`,
          color: on ? "#fff" : "var(--aminy-teal-700)",
          borderRadius: 999,
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: "var(--font-ui)",
          cursor: "pointer"
        }
      }, on && /*#__PURE__*/React.createElement(AIcon, {
        name: "check",
        size: 12
      }), c);
    })), picks.length > 0 && /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      fullWidth: true,
      size: "sm",
      iconRight: /*#__PURE__*/React.createElement(AIcon, {
        name: "chevron",
        size: 16
      }),
      onClick: submitMulti
    }, "Continue with ", picks.length, " selected")) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        marginBottom: 9
      }
    }, cur.chips.map(c => /*#__PURE__*/React.createElement("button", {
      key: c,
      onClick: () => send(c),
      style: {
        padding: "7px 12px",
        background: "#fff",
        border: "1px solid var(--aminy-teal-200)",
        color: "var(--aminy-teal-700)",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
        cursor: "pointer"
      }
    }, c)))), done ? /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      iconRight: /*#__PURE__*/React.createElement(AIcon, {
        name: "chevron",
        size: 18
      }),
      onClick: () => setPrimeNotif(true)
    }, "Let's go") : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("input", {
      value: input,
      onChange: e => setInput(e.target.value),
      onKeyDown: e => e.key === "Enter" && send(),
      placeholder: "Type your answer\u2026",
      disabled: typing,
      style: {
        flex: 1,
        height: 46,
        border: "1px solid var(--color-border-strong)",
        borderRadius: 14,
        padding: "0 14px",
        fontSize: 14,
        fontFamily: "var(--font-ui)",
        color: "var(--color-text)",
        outline: "none",
        background: "#fff",
        minWidth: 0
      }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => send(),
      disabled: !input.trim() || typing,
      "aria-label": "Send",
      style: {
        width: 46,
        height: 46,
        borderRadius: 14,
        background: "var(--aminy-teal-600)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: 0,
        cursor: "pointer",
        opacity: input.trim() && !typing ? 1 : 0.4,
        flexShrink: 0,
        boxShadow: "var(--shadow-glow-teal)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "send",
      size: 17
    })))), /*#__PURE__*/React.createElement("style", null, `@keyframes ob{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}`));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/onboarding.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/plan.jsx
try { (() => {
/* My Plan — care plan goals, a win, AI 2-week home practice plan, provider review.
   Practice plan ported from AIHomePracticePlan.tsx. window.PlanScreen */
(function () {
  const {
    AIcon
  } = window;
  const GOALS = [{
    title: "Smoother morning transitions",
    tone: "teal",
    pct: 70,
    note: "5 of 7 mornings calm this week",
    icon: "sun"
  }, {
    title: "Independent tooth-brushing",
    tone: "grow",
    pct: 100,
    note: "Met — Kai's leading it himself",
    icon: "check",
    met: true
  }, {
    title: "Name big feelings out loud",
    tone: "teal",
    pct: 40,
    note: "Started naming \"frustrated\" this week",
    icon: "heart"
  }];

  // 2-week home practice plan (shape ported from AIHomePracticePlan.tsx)
  const PRACTICE = {
    target: "Smoother morning transitions",
    goal: "Kai moves through the morning routine with one calm prompt instead of five.",
    schedule: [{
      label: "Days 1–2",
      activities: [{
        time: "Morning",
        title: "First-then board",
        mins: 10,
        steps: ["Show two pictures: teeth, then breakfast.", "Say \"First teeth, then breakfast.\"", "Give a 5- and 1-minute warning."],
        reinforce: "\"You moved on the first ask — that's huge.\""
      }]
    }, {
      label: "Days 3–5",
      activities: [{
        time: "Morning",
        title: "Visual timer",
        mins: 8,
        steps: ["Set a 2-minute timer for teeth.", "Let Kai start it himself.", "Celebrate when it beeps, not when he's done."],
        reinforce: "High-five + \"You beat the timer.\""
      }]
    }, {
      label: "Days 6–7",
      activities: [{
        time: "Morning",
        title: "Fade the prompt",
        mins: 6,
        steps: ["Show the board, but stay quiet.", "Wait 10 seconds before any prompt.", "Only step in if he's stuck."],
        reinforce: "\"You remembered all by yourself.\""
      }]
    }],
    tips: ["Same order, every day — predictability is the whole point.", "Warmth over speed. A calm 10 minutes beats a rushed 4.", "If a morning falls apart, just reset tomorrow. No streak to break."],
    fading: "Across two weeks, move from full picture + verbal prompts to just the board, then to Kai leading it himself."
  };
  function PracticePlan() {
    const {
      Button
    } = window.DesignSystem_39fb2b;
    const [gen, setGen] = React.useState(false);
    const [open, setOpen] = React.useState(0);
    const buzz = ms => {
      try {
        navigator.vibrate && navigator.vibrate(ms);
      } catch (e) {}
    };
    if (!gen) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)",
          border: "1px solid var(--aminy-teal-100)",
          borderRadius: "var(--radius-xl)",
          padding: "16px 18px"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: "sparkles",
        size: 16,
        style: {
          color: "var(--aminy-teal-700)"
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--aminy-teal-700)"
        }
      }, "From your care plan")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 16,
          color: "var(--color-text-strong)",
          letterSpacing: "-0.01em",
          marginBottom: 4,
          WebkitFontSmoothing: "antialiased"
        }
      }, "A 2-week practice plan, built for Kai"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          color: "var(--color-text-muted)",
          lineHeight: 1.5,
          marginBottom: 12
        }
      }, "Aminy turns his treatment targets into small, daily steps you can actually do at home."), /*#__PURE__*/React.createElement(Button, {
        variant: "primary",
        fullWidth: true,
        icon: /*#__PURE__*/React.createElement(AIcon, {
          name: "sparkles",
          size: 16
        }),
        onClick: () => {
          buzz(10);
          setGen(true);
        }
      }, "Generate home practice plan"));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "\u2726 2-week practice plan"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "Target: ", PRACTICE.target)), /*#__PURE__*/React.createElement("button", {
      onClick: () => setGen(false),
      style: {
        fontSize: 12,
        color: "var(--aminy-teal-700)",
        fontWeight: 600,
        background: "none",
        border: 0,
        cursor: "pointer",
        fontFamily: "var(--font-ui)"
      }
    }, "Redo")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 14,
        color: "var(--aminy-teal-800)",
        marginTop: 8,
        lineHeight: 1.45
      }
    }, PRACTICE.goal)), PRACTICE.schedule.map((day, di) => {
      const isOpen = open === di;
      return /*#__PURE__*/React.createElement("div", {
        key: di,
        style: {
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          background: "#fff"
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setOpen(isOpen ? -1 : di),
        style: {
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          background: "none",
          border: 0,
          cursor: "pointer",
          textAlign: "left"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: "var(--aminy-teal-700)",
          background: "var(--aminy-teal-50)",
          padding: "3px 9px",
          borderRadius: 999
        }
      }, day.label), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12.5,
          color: "var(--color-text-muted)"
        }
      }, day.activities.map(a => a.title).join(" · "))), /*#__PURE__*/React.createElement(AIcon, {
        name: "chevron",
        size: 16,
        style: {
          color: "var(--color-text-subtle)",
          transform: isOpen ? "rotate(90deg)" : "none",
          transition: "transform .2s"
        }
      })), isOpen && /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "0 14px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10
        }
      }, day.activities.map((a, ai) => /*#__PURE__*/React.createElement("div", {
        key: ai,
        style: {
          background: "var(--aminy-mist)",
          borderRadius: 12,
          padding: 12
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13.5,
          fontWeight: 600,
          color: "var(--color-text-strong)"
        }
      }, a.title), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          color: "var(--color-text-muted)"
        }
      }, a.time, " \xB7 ", a.mins, "m")), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 6
        }
      }, a.steps.map((s, si) => /*#__PURE__*/React.createElement("div", {
        key: si,
        style: {
          display: "flex",
          gap: 8,
          fontSize: 12.5,
          color: "var(--color-text)",
          lineHeight: 1.4
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 17,
          height: 17,
          borderRadius: 999,
          background: "var(--aminy-teal-100)",
          color: "var(--aminy-teal-800)",
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1
        }
      }, si + 1), s))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--aminy-teal-800)",
          background: "var(--aminy-teal-50)",
          borderRadius: 9,
          padding: "7px 10px",
          marginTop: 9
        }
      }, "\u2726 Reinforce: ", a.reinforce)))));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--aminy-win-50)",
        border: "1px solid var(--aminy-win-100)",
        borderRadius: "var(--radius-lg)",
        padding: "12px 14px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--aminy-win-600)",
        marginBottom: 5
      }
    }, "Parent tips"), PRACTICE.tips.map((t, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 12.5,
        color: "var(--aminy-win-600)",
        lineHeight: 1.5,
        marginTop: 2
      }
    }, "\u2022 ", t))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        textAlign: "center",
        lineHeight: 1.5,
        padding: "0 10px"
      }
    }, PRACTICE.fading));
  }
  window.PlanScreen = function PlanScreen() {
    const DS = window.DesignSystem_39fb2b;
    const {
      Card,
      Badge,
      Button
    } = DS;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "8px 18px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "2px 2px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aminy-eyebrow"
    }, "Kai's plan"), /*#__PURE__*/React.createElement("div", {
      className: "aminy-h2",
      style: {
        fontSize: 22,
        marginTop: 2
      }
    }, "This season's goals")), /*#__PURE__*/React.createElement("div", {
      className: window.AminyMotion && !window.AminyMotion.reduce ? "aminy-pop" : "",
      style: {
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg,var(--aminy-win-50),#fff)",
        border: "1px solid var(--aminy-win-100)",
        borderRadius: "var(--radius-xl)",
        padding: "18px 20px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: window.AminyMotion && !window.AminyMotion.reduce ? "aminy-shimmer" : "",
      style: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24
      }
    }, "\u2B50"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--aminy-win-600)",
        fontWeight: 700,
        margin: "8px 0 4px"
      }
    }, "This week's win"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 20,
        color: "var(--color-text-strong)",
        lineHeight: 1.2,
        letterSpacing: "-0.025em",
        textWrap: "pretty",
        marginBottom: 14,
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale"
      }
    }, "Three evenings, three calm bedtimes. That's a lot."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      onClick: () => window.aminyToast("Shared with Alex ✨")
    }, "Share with Alex"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      onClick: () => window.aminyToast("Saved to this week's report")
    }, "Save to report"))), GOALS.map((g, i) => /*#__PURE__*/React.createElement(Card, {
      key: i,
      padding: 16
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 10,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: g.met ? "var(--aminy-grow-50)" : "var(--aminy-teal-50)",
        color: g.met ? "var(--aminy-grow-600)" : "var(--aminy-teal-700)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: g.icon,
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)",
        lineHeight: 1.25
      }
    }, g.title), g.met && /*#__PURE__*/React.createElement(Badge, {
      tone: "grow"
    }, "Met")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 4
      }
    }, g.note), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        background: "var(--aminy-navy-50)",
        borderRadius: 3,
        marginTop: 10,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${g.pct}%`,
        height: "100%",
        borderRadius: 3,
        background: g.met ? "var(--aminy-grow-500)" : "var(--aminy-teal-500)",
        animation: window.AminyMotion && !window.AminyMotion.reduce ? `aminy-fill-${i} 1s var(--ease-lift) both` : "none"
      }
    })), /*#__PURE__*/React.createElement("style", null, `@keyframes aminy-fill-${i}{from{width:0}to{width:${g.pct}%}}`))))), /*#__PURE__*/React.createElement(PracticePlan, null), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: "var(--radius-xl)",
        padding: "16px 18px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 10,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
        color: "var(--aminy-teal-700)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "shield",
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--aminy-teal-700)",
        fontWeight: 700
      }
    }, "Pending review"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)",
        margin: "3px 0 10px",
        lineHeight: 1.35
      }
    }, "Dr. Morales added two notes to Kai's plan. Read when you have a minute \u2014 no rush."), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => window.aminyToast("Opening Dr. Morales's notes…")
    }, "Open review"))));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/plan.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/plans.jsx
try { (() => {
/* Plans & membership — ported from tier-utils.ts + AIPaywallMessage.tsx.
   Real tiers/pricing: Free $0 · Core $14.99 · Pro $29.99 · Family $49.99.
   14-day Core trial, no card. Marketplace discount 0/10/20/30%. HSA/FSA eligible.
   window.PlansScreen + window.PaywallCard */
(function () {
  const {
    AIcon
  } = window;
  const R = React;
  const TIERS = [{
    id: "free",
    name: "Free",
    tagline: "Book care + try the AI",
    mo: 0,
    yr: 0,
    features: ["Book & attend TeleABA + marketplace visits (pay per session)", "1 child profile", "3 Ask Aminy messages per day", "Exhale basics (breathe, bubbles)", "— no document storage, AI memory, or adaptive plans"]
  }, {
    id: "core",
    name: "Core",
    tagline: "Most popular",
    mo: 14.99,
    yr: 129,
    save: 51,
    rec: true,
    features: ["Everything in Free, plus:", "Unlimited Ask Aminy (text & voice)", "AI reads your IEPs & medical records", "AI memory: 5,000 facts — smarter every day", "Adaptive home practice plans that learn", "10% off every marketplace session", "Up to 2 children · HSA/FSA eligible"]
  }, {
    id: "pro",
    name: "Pro",
    tagline: "For serious progress",
    mo: 29.99,
    yr: 279,
    save: 81,
    features: ["Everything in Core, plus:", "AI memory: 15,000 facts", "Up to 3 children", "Clinical progress reports (IEP-ready)", "Provider sharing portal", "20% off marketplace · priority booking"]
  }, {
    id: "family",
    name: "Family Plan",
    tagline: "Perfect for families",
    mo: 49.99,
    yr: 479,
    save: 121,
    features: ["Everything in Pro, plus:", "Ask a BCBA included (AI draft + signed review)", "AI memory: unlimited", "Unlimited children", "30% off marketplace sessions", "Care coordinator · 4 caregiver accounts"]
  }];
  window.PlansScreen = function PlansScreen({
    onBack,
    initial = "core"
  }) {
    const {
      Button
    } = window.AminyKit;
    const [annual, setAnnual] = R.useState(true);
    const [sel, setSel] = R.useState(initial);
    const buzz = ms => {
      try {
        navigator.vibrate && navigator.vibrate(ms);
      } catch (e) {}
    };
    const chosen = TIERS.find(t => t.id === sel);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "#fff"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 16px 12px",
        display: "flex",
        alignItems: "center",
        gap: 11,
        borderBottom: "1px solid var(--color-border)"
      }
    }, onBack && /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "back",
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: "-0.02em",
        color: "var(--color-text-strong)"
      }
    }, "Plans & membership"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, "14-day Core trial \xB7 no card required"))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "16px 16px 16px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        background: "var(--aminy-mist)",
        borderRadius: 999,
        padding: 4,
        marginBottom: 16,
        position: "relative"
      }
    }, [["mo", "Monthly"], ["yr", "Yearly"]].map(([k, label]) => {
      const on = k === "yr" === annual;
      return /*#__PURE__*/React.createElement("button", {
        key: k,
        onClick: () => setAnnual(k === "yr"),
        style: {
          flex: 1,
          height: 38,
          borderRadius: 999,
          border: 0,
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          fontWeight: 600,
          background: on ? "#fff" : "transparent",
          color: on ? "var(--color-text-strong)" : "var(--color-text-muted)",
          boxShadow: on ? "var(--shadow-sm)" : "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6
        }
      }, label, k === "yr" && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10.5,
          fontWeight: 700,
          color: "var(--aminy-grow-600)",
          background: "var(--aminy-grow-50)",
          padding: "2px 6px",
          borderRadius: 999
        }
      }, "Save"));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 11
      }
    }, TIERS.map(t => {
      const on = sel === t.id;
      const price = annual ? t.yr : t.mo;
      return /*#__PURE__*/React.createElement("button", {
        key: t.id,
        onClick: () => {
          buzz(6);
          setSel(t.id);
        },
        style: {
          textAlign: "left",
          cursor: "pointer",
          borderRadius: 18,
          padding: "15px 16px",
          background: on ? "linear-gradient(135deg,var(--aminy-teal-50),#fff)" : "#fff",
          border: `2px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border)"}`,
          boxShadow: on ? "var(--shadow-md)" : "var(--shadow-sm)",
          position: "relative",
          transition: "all var(--dur-fast) var(--ease-calm)"
        }
      }, t.rec && /*#__PURE__*/React.createElement("span", {
        style: {
          position: "absolute",
          top: -9,
          right: 14,
          background: "var(--aminy-teal-600)",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          padding: "3px 10px",
          borderRadius: 999
        }
      }, "Most popular"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 9
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `2px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`,
          background: on ? "var(--aminy-teal-600)" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }
      }, on && /*#__PURE__*/React.createElement(AIcon, {
        name: "check",
        size: 12,
        style: {
          color: "#fff"
        }
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 16,
          color: "var(--color-text-strong)",
          letterSpacing: "-0.01em"
        }
      }, t.name)), /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: "right"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 19,
          fontWeight: 700,
          color: "var(--color-text-strong)",
          letterSpacing: "-0.02em"
        }
      }, price === 0 ? "Free" : `$${price}`), price > 0 && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          color: "var(--color-text-muted)"
        }
      }, "/", annual ? "yr" : "mo"))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11.5,
          color: t.rec ? "var(--aminy-teal-700)" : "var(--color-text-muted)",
          fontWeight: t.rec ? 600 : 500,
          marginLeft: 29,
          marginBottom: on ? 10 : 0
        }
      }, t.tagline, annual && t.save ? ` · save $${t.save}/yr` : ""), on && /*#__PURE__*/React.createElement("div", {
        style: {
          marginLeft: 29,
          display: "flex",
          flexDirection: "column",
          gap: 6
        }
      }, t.features.map((f, i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: "flex",
          gap: 7,
          fontSize: 12.5,
          color: f.endsWith("plus:") ? "var(--color-text-strong)" : "var(--color-text)",
          fontWeight: f.endsWith("plus:") ? 600 : 400,
          lineHeight: 1.4
        }
      }, !f.endsWith("plus:") && /*#__PURE__*/React.createElement(AIcon, {
        name: "check",
        size: 13,
        style: {
          color: "var(--aminy-teal-600)",
          flexShrink: 0,
          marginTop: 1
        }
      }), f))));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        justifyContent: "center",
        marginTop: 14,
        fontSize: 11.5,
        color: "var(--color-text-muted)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "shield",
      size: 13
    }), " HSA/FSA eligible \xB7 cancel anytime")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "12px 16px",
        borderTop: "1px solid var(--color-border)",
        background: "#fff"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => buzz(12)
    }, sel === "free" ? "Continue with Free" : chosen.id === "core" ? "Start 14-day free trial" : `Choose ${chosen.name}`), sel !== "free" && /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        fontSize: 11,
        color: "var(--color-text-subtle)",
        marginTop: 8
      }
    }, sel === "core" ? "Free for 14 days, then " : "", "$", annual ? chosen.yr : chosen.mo, "/", annual ? "yr" : "mo", " \xB7 no card to start")));
  };

  // Contextual paywall card (insured softens to coverage-first). For the Ask Aminy chat.
  window.PaywallCard = function PaywallCard({
    childName = "Kai",
    insured = false,
    onViewPlans,
    onCheckCoverage,
    onDismiss
  }) {
    const {
      Button
    } = window.AminyKit;
    if (insured) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          background: "linear-gradient(135deg,#eff6ff,#fff)",
          border: "1px solid #bfdbfe",
          borderRadius: 18,
          padding: 16,
          maxWidth: 320
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#60a5fa,#2563eb)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: "sparkles",
        size: 14,
        style: {
          color: "#fff"
        }
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          fontWeight: 700,
          color: "#1e3a8a"
        }
      }, "Aminy"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: "#1d4ed8",
          background: "#dbeafe",
          padding: "2px 7px",
          borderRadius: 999
        }
      }, "Coverage tip")), /*#__PURE__*/React.createElement("p", {
        style: {
          fontSize: 13,
          color: "var(--color-text)",
          lineHeight: 1.5,
          margin: "0 0 12px"
        }
      }, "I'd love to go deeper for ", childName, ". Before you pay out of pocket \u2014 your plan may cover therapy and assessments. Worth checking your benefits first."), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "primary",
        style: {
          background: "#2563eb",
          flex: 1
        },
        onClick: onCheckCoverage
      }, "Check your coverage"), onDismiss && /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "ghost",
        onClick: onDismiss
      }, "Not now")), /*#__PURE__*/React.createElement("button", {
        onClick: onViewPlans,
        style: {
          width: "100%",
          marginTop: 8,
          background: "none",
          border: 0,
          fontSize: 11.5,
          color: "var(--color-text-muted)",
          textDecoration: "underline",
          cursor: "pointer",
          fontFamily: "var(--font-ui)"
        }
      }, "Or subscribe to Aminy instead"));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 18,
        padding: 16,
        maxWidth: 320
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "linear-gradient(135deg,var(--aminy-teal-500),var(--aminy-teal-700))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 14,
      style: {
        color: "#fff"
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "Aminy"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "var(--aminy-teal-700)",
        background: "var(--aminy-teal-50)",
        padding: "2px 7px",
        borderRadius: 999
      }
    }, "Upgrade")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        color: "var(--color-text)",
        lineHeight: 1.5,
        margin: "0 0 12px"
      }
    }, "I have deeper insights about ", childName, " I'd love to share \u2014 that level of analysis is in Core. Unlimited chat means I can go much further."), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "rgba(255,255,255,0.8)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 12,
        padding: "9px 11px",
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--aminy-teal-700)"
      }
    }, "Core \xB7 $14.99/mo"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, "Unlimited AI chat with deeper reasoning")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 5,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        fontSize: 11.5,
        color: "var(--color-text-muted)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "check",
      size: 12,
      style: {
        color: "var(--aminy-grow-600)"
      }
    }), " 14-day free trial, no card required"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        fontSize: 11.5,
        color: "var(--color-text-muted)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "check",
      size: 12,
      style: {
        color: "var(--aminy-grow-600)"
      }
    }), " Cancel anytime")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      style: {
        flex: 1
      },
      onClick: onViewPlans
    }, "View plans"), onDismiss && /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      onClick: onDismiss
    }, "Not now")));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/plans.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/retention.jsx
try { (() => {
/* Retention & growth — Cancel-save flow · Delete-account flow · Referral.
   Best-practice subscription retention (recap → pause/discount/downgrade →
   survey → graceful exit), no dark patterns: easy to leave, easy to return.
   window → #root */
(function () {
  const {
    AIcon,
    PhoneShell
  } = window;
  const {
    Button,
    Stat
  } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || {
    light() {},
    medium() {},
    success() {}
  };
  const toast = m => window.aminyToast && window.aminyToast(m);
  const Head = ({
    title,
    sub
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 18px 12px",
      borderBottom: "1px solid var(--color-border)",
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      fontWeight: 700,
      fontSize: 17,
      letterSpacing: "-0.02em",
      color: "var(--color-text-strong)"
    }
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-text-muted)",
      marginTop: 1
    }
  }, sub));
  const Body = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, children);

  /* ============ CANCEL-SAVE FLOW ============ */
  function CancelFlow() {
    const [step, setStep] = R.useState(0);
    const [saved, setSaved] = R.useState(null); // 'pause' | 'deal'
    const [reason, setReason] = R.useState(null);
    if (saved) return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "0 30px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: "var(--aminy-teal-600)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--shadow-glow-teal)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "heart",
      size: 32,
      style: {
        color: "#fff"
      }
    })), /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: "-0.025em",
        color: "var(--color-text-strong)",
        margin: 0,
        textWrap: "balance"
      }
    }, saved === "pause" ? "Paused until September." : "Done — 50% off your next 3 months."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14.5,
        color: "var(--color-text-muted)",
        lineHeight: 1.6,
        margin: 0,
        maxWidth: 280
      }
    }, saved === "pause" ? "Kai's profile and everything Aminy has learned are frozen safe. We'll check in gently before it resumes — no surprise charges." : "Same plan, half the price, starting today. Thanks for staying — we'll keep earning it."), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => {
        setSaved(null);
        setStep(0);
      }
    }, "Back to settings"));
    if (step === 0) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Head, {
      title: "Manage plan",
      sub: "Core \xB7 $129/yr \xB7 renews Aug 12"
    }), /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 18,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--aminy-teal-700)",
        marginBottom: 8
      }
    }, "Before anything \u2014 look how far you've come"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15.5,
        fontWeight: 700,
        letterSpacing: "-0.015em",
        color: "var(--color-text-strong)",
        lineHeight: 1.4,
        marginBottom: 12
      }
    }, "Six months ago, mornings were the hard part. Last week, Kai had five calm ones."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Calm wins",
      value: "47",
      caption: "Logged together",
      accent: true
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Aminy knows",
      value: "1.2k",
      caption: "Things that work"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Signed answers",
      value: "12",
      caption: "From your BCBA"
    }))), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => {
        haptic.success();
        toast("Glad you're staying 💛");
      }
    }, "Keep my plan"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.light();
        setStep(1);
      },
      style: {
        border: 0,
        background: "none",
        cursor: "pointer",
        color: "var(--color-text-muted)",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
        padding: 8
      }
    }, "I still want to make a change")));
    if (step === 1) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Head, {
      title: "A better fit, maybe",
      sub: "Most families pick one of these instead"
    }), /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "2px solid var(--aminy-teal-600)",
        borderRadius: 16,
        padding: 15,
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: -10,
        left: 16,
        background: "var(--aminy-teal-600)",
        color: "#fff",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: ".06em",
        borderRadius: 999,
        padding: "3px 10px"
      }
    }, "MOST CHOSEN"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--color-text-strong)",
        margin: "4px 0 4px"
      }
    }, "Stay for half price"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        lineHeight: 1.5,
        marginBottom: 12
      }
    }, "50% off the next 3 months. Everything stays \u2014 the plan, the memory, your BCBA thread."), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      fullWidth: true,
      onClick: () => {
        haptic.success();
        setSaved("deal");
      }
    }, "Take 50% off")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 15
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--color-text-strong)",
        marginBottom: 4
      }
    }, "Pause instead \u2014 $0"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        lineHeight: 1.5,
        marginBottom: 12
      }
    }, "Life gets loud. Freeze your plan up to 3 months; Kai's data stays safe and nothing bills."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, ["1 mo", "2 mo", "3 mo"].map(m => /*#__PURE__*/React.createElement("button", {
      key: m,
      onClick: () => {
        haptic.success();
        setSaved("pause");
      },
      style: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        border: "1.5px solid var(--aminy-teal-300)",
        background: "var(--aminy-teal-50)",
        color: "var(--aminy-teal-800)",
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer"
      }
    }, m)))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 15
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--color-text-strong)",
        marginBottom: 4
      }
    }, "Switch to Free"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        lineHeight: 1.5,
        marginBottom: 12
      }
    }, "Keep booking visits and 3 daily Aminy messages. AI memory and practice plans go dormant."), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      fullWidth: true,
      onClick: () => {
        haptic.medium();
        toast("Switched to Free at period end — easy to come back");
      }
    }, "Downgrade to Free")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.light();
        setStep(2);
      },
      style: {
        border: 0,
        background: "none",
        cursor: "pointer",
        color: "var(--color-text-subtle)",
        fontSize: 13.5,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
        padding: 8
      }
    }, "Continue to cancel")));
    if (step === 2) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Head, {
      title: "Help us understand",
      sub: "30 seconds \u2014 it genuinely shapes what we build"
    }), /*#__PURE__*/React.createElement(Body, null, ["Too expensive right now", "Not using it enough", "Found another solution", "We just need a break", "Something else"].map(r => /*#__PURE__*/React.createElement("button", {
      key: r,
      onClick: () => {
        haptic.light();
        setReason(r);
      },
      style: {
        textAlign: "left",
        padding: "13px 16px",
        borderRadius: 14,
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontSize: 14.5,
        fontWeight: 600,
        border: `1.5px solid ${reason === r ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`,
        background: reason === r ? "var(--aminy-teal-50)" : "#fff",
        color: reason === r ? "var(--aminy-teal-800)" : "var(--color-text-strong)"
      }
    }, r)), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      disabled: !reason,
      style: {
        background: "var(--aminy-alert-600)",
        boxShadow: "none"
      },
      onClick: () => {
        haptic.medium();
        setStep(3);
      }
    }, "Cancel my subscription")));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "0 28px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 40
      }
    }, "\uD83D\uDC9B"), /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: "-0.025em",
        color: "var(--color-text-strong)",
        margin: 0,
        textWrap: "balance"
      }
    }, "Done \u2014 and no hard feelings."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14.5,
        color: "var(--color-text-muted)",
        lineHeight: 1.6,
        margin: 0,
        maxWidth: 290
      }
    }, "You keep full access until ", /*#__PURE__*/React.createElement("b", null, "August 12"), ". Kai's profile and everything Aminy learned stay safe for ", /*#__PURE__*/React.createElement("b", null, "90 days"), " \u2014 restart in one tap, anytime."), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => toast("Preparing your data export…")
    }, "Export my data first"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.success();
        setStep(0);
        toast("Welcome back 💛 Plan restored.");
      },
      style: {
        border: 0,
        background: "none",
        cursor: "pointer",
        color: "var(--aminy-teal-700)",
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "var(--font-ui)",
        padding: 6
      }
    }, "Changed your mind? Restart now"));
  }

  /* ============ DELETE ACCOUNT ============ */
  function DeleteFlow() {
    const [txt, setTxt] = R.useState("");
    const [gone, setGone] = R.useState(false);
    if (gone) return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "0 30px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: "-0.025em",
        color: "var(--color-text-strong)",
        margin: 0
      }
    }, "Deletion scheduled."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14.5,
        color: "var(--color-text-muted)",
        lineHeight: 1.6,
        margin: 0,
        maxWidth: 290
      }
    }, "Your account and all data will be permanently deleted in ", /*#__PURE__*/React.createElement("b", null, "14 days"), ". Sign back in before then and everything is restored, exactly as you left it."), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => {
        setGone(false);
        setTxt("");
        toast("Deletion cancelled — welcome back");
      }
    }, "Cancel deletion"));
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Head, {
      title: "Delete account",
      sub: "Permanent \u2014 so let's be careful together"
    }), /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 16,
        padding: 15
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "var(--aminy-teal-800)",
        marginBottom: 4
      }
    }, "First: take your data with you"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--aminy-teal-800)",
        lineHeight: 1.5,
        marginBottom: 10
      }
    }, "Reports, vault documents, progress history \u2014 yours, in one file."), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      onClick: () => toast("Export started — we'll email a secure link")
    }, "Export everything")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 15
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "var(--color-text-strong)",
        marginBottom: 8
      }
    }, "Deleting permanently removes"), ["Everything Aminy has learned about Kai (1,284 facts)", "All vault documents & reports", "Your BCBA threads & signed answers", "6 months of progress history"].map(x => /*#__PURE__*/React.createElement("div", {
      key: x,
      style: {
        display: "flex",
        gap: 8,
        fontSize: 12.5,
        color: "var(--color-text-muted)",
        lineHeight: 1.5,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--aminy-alert-600)",
        fontWeight: 800
      }
    }, "\xD7"), x))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 15,
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "Just need space? Pause instead"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)"
      }
    }, "$0 \xB7 everything kept safe")), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => toast("Paused — nothing bills, nothing is lost")
    }, "Pause")), /*#__PURE__*/React.createElement("input", {
      value: txt,
      onChange: e => setTxt(e.target.value),
      placeholder: "Type DELETE to confirm",
      style: {
        height: 48,
        borderRadius: 12,
        border: "1.5px solid var(--color-border-strong)",
        padding: "0 14px",
        fontSize: 15,
        fontFamily: "var(--font-ui)",
        outline: "none",
        textAlign: "center",
        letterSpacing: ".04em"
      }
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      fullWidth: true,
      disabled: txt !== "DELETE",
      style: {
        background: "var(--aminy-alert-600)",
        boxShadow: "none"
      },
      onClick: () => {
        haptic.medium();
        setGone(true);
      }
    }, "Permanently delete my account")));
  }

  /* ============ REFERRAL / SHARE ============ */
  function Referral() {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Head, {
      title: "Share Aminy",
      sub: "Every family you help, helps yours"
    }), /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 18,
        padding: 16,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 30,
        marginBottom: 6
      }
    }, "\uD83D\uDC9B"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 800,
        fontSize: 20,
        letterSpacing: "-0.02em",
        color: "var(--color-text-strong)",
        marginBottom: 4
      }
    }, "Give a month. Get a month."), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: "var(--color-text-muted)",
        lineHeight: 1.55,
        marginBottom: 14
      }
    }, "A family you know gets their first month of Core free \u2014 and so do you, every time."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        background: "#fff",
        border: "1.5px dashed var(--aminy-teal-300)",
        borderRadius: 12,
        padding: "10px 12px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--aminy-teal-800)",
        textAlign: "left"
      }
    }, "aminy.ai/f/sarah-k7"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => {
        haptic.success();
        toast("Link copied — send it with love");
      }
    }, "Copy"))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        margin: "4px 4px 0"
      }
    }, "Or share a win"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 15
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,var(--aminy-win-50),#fff)",
        border: "1px solid var(--aminy-win-100)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--aminy-win-600)",
        marginBottom: 5
      }
    }, "This week's win"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        color: "var(--color-text-strong)",
        lineHeight: 1.35
      }
    }, "Kai named his feelings three times this week \u2014 without being asked. \uD83D\uDC9B"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-subtle)",
        marginTop: 8
      }
    }, "aminy.ai \xB7 gentle guidance, meaningful progress")), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      fullWidth: true,
      icon: /*#__PURE__*/React.createElement(AIcon, {
        name: "send",
        size: 15
      }),
      onClick: () => {
        haptic.light();
        toast("Share sheet → Messages, Instagram, anywhere");
      }
    }, "Share this win")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-subtle)",
        textAlign: "center",
        lineHeight: 1.55,
        padding: "0 12px"
      }
    }, "Wins are shared only when you choose \u2014 never automatically, never with data you didn't pick.")));
  }
  const SCREENS = [["cancel", "Cancel-save flow", CancelFlow], ["delete", "Delete account", DeleteFlow], ["refer", "Referral", Referral]];
  function App() {
    const [s, setS] = R.useState("cancel");
    const Cur = SCREENS.find(x => x[0] === s)[2];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 999,
        padding: 5,
        boxShadow: "var(--shadow-sm)"
      }
    }, SCREENS.map(([id, lb]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => {
        haptic.light();
        setS(id);
      },
      style: {
        padding: "8px 16px",
        borderRadius: 999,
        border: 0,
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 600,
        background: s === id ? "var(--aminy-teal-600)" : "transparent",
        color: s === id ? "#fff" : "var(--color-text-muted)"
      }
    }, lb))), /*#__PURE__*/React.createElement(PhoneShell, {
      bg: "linear-gradient(180deg,var(--aminy-mist),var(--aminy-mist-deep))"
    }, /*#__PURE__*/React.createElement("div", {
      key: s,
      style: {
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement(Cur, null))));
  }
  function mount() {
    if (!window.PhoneShell || !window.AminyKit) {
      setTimeout(mount, 60);
      return;
    }
    ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
  }
  mount();
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/retention.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/session.jsx
try { (() => {
/* TeleABA live session — ported from telehealth/WaitingRoom.tsx + VideoCallRoom flow.
   Waiting Room (calm dark gradient, self-preview, mic/cam, rotating prep tips,
   "provider will admit you" → "You're In!") → In-call → Ended. window.SessionScreen */
(function () {
  const {
    AIcon
  } = window;
  const R = React;
  const TIPS = [["Camera check", "Make sure your camera is on and your face is well-lit. Natural light from a window works great."], ["Find a quiet space", "Background noise can make it harder for your provider to hear you."], ["Have goals handy", "Have Kai's current goals or recent behavior notes ready to share."], ["Prepare questions", "Think about 1–2 specific things you'd like to discuss today."], ["Deep breaths", "Take a few slow breaths while you wait. Inhale 4, hold 4, exhale 4."], ["Privacy protected", "Your session is encrypted in transit and kept private."]];
  function SelfTile({
    camOn,
    small
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: small ? "auto 12px 92px auto" : 0,
        width: small ? 96 : "100%",
        height: small ? 132 : "100%",
        borderRadius: small ? 14 : 0,
        overflow: "hidden",
        background: "#0b1620",
        border: small ? "2px solid rgba(255,255,255,0.25)" : "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: small ? 3 : 1
      }
    }, camOn ? /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        height: "100%",
        background: "radial-gradient(circle at 50% 38%, #1d4a57, #16323d 60%, #0b1620)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: small ? 44 : 96,
        height: small ? 44 : 96,
        borderRadius: "50%",
        marginBottom: small ? 14 : 60,
        background: "linear-gradient(135deg,var(--aminy-teal-400),var(--aminy-teal-700))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: small ? 18 : 36,
        fontFamily: "var(--font-ui)"
      }
    }, "S")) : /*#__PURE__*/React.createElement("div", {
      style: {
        color: "rgba(255,255,255,0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "videoOff",
      size: small ? 18 : 28
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: small ? 9 : 12
      }
    }, "Camera off")), small && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        bottom: 4,
        left: 6,
        fontSize: 9,
        color: "rgba(255,255,255,0.7)",
        fontWeight: 600
      }
    }, "You"));
  }
  function Controls({
    micOn,
    camOn,
    setMic,
    setCam,
    onEnd,
    joined
  }) {
    const btn = (active, onClick, onIcon, offIcon, danger) => /*#__PURE__*/React.createElement("button", {
      onClick: onClick,
      style: {
        width: 50,
        height: 50,
        borderRadius: "50%",
        border: 0,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        background: danger ? "#dc2626" : active ? "rgba(255,255,255,0.18)" : "rgba(220,38,38,0.85)"
      }
    }, active ? onIcon : offIcon);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "16px 0 24px",
        display: "flex",
        gap: 14,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 4,
        background: joined ? "linear-gradient(0deg,rgba(0,0,0,0.5),transparent)" : "transparent"
      }
    }, btn(micOn, () => setMic(!micOn), /*#__PURE__*/React.createElement(AIcon, {
      name: "mic",
      size: 21
    }), /*#__PURE__*/React.createElement(AIcon, {
      name: "micOff",
      size: 21
    })), btn(camOn, () => setCam(!camOn), /*#__PURE__*/React.createElement(AIcon, {
      name: "video",
      size: 21
    }), /*#__PURE__*/React.createElement(AIcon, {
      name: "videoOff",
      size: 21
    })), joined && /*#__PURE__*/React.createElement("button", {
      onClick: onEnd,
      style: {
        width: 62,
        height: 50,
        borderRadius: 25,
        border: 0,
        cursor: "pointer",
        background: "#dc2626",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "phoneOff",
      size: 22
    })));
  }
  window.SessionScreen = function SessionScreen({
    onExit,
    provider = "Dr. Patel",
    title = "Occupational therapy · 30 min"
  }) {
    const [phase, setPhase] = R.useState("waiting"); // waiting · admitted · incall · ended
    const [micOn, setMic] = R.useState(true);
    const [camOn, setCam] = R.useState(true);
    const [secs, setSecs] = R.useState(0);
    const [tip, setTip] = R.useState(0);
    const [fade, setFade] = R.useState(false);
    const [callSecs, setCallSecs] = R.useState(0);
    const buzz = ms => {
      try {
        navigator.vibrate && navigator.vibrate(ms);
      } catch (e) {}
    };

    // wait timer + auto-admit after ~6s
    R.useEffect(() => {
      if (phase !== "waiting") return;
      const t = setInterval(() => setSecs(s => s + 1), 1000);
      const admit = setTimeout(() => {
        buzz(20);
        setPhase("admitted");
        setTimeout(() => setPhase("incall"), 1600);
      }, 6000);
      return () => {
        clearInterval(t);
        clearTimeout(admit);
      };
    }, [phase]);
    // tips rotate
    R.useEffect(() => {
      if (phase !== "waiting") return;
      const i = setInterval(() => {
        setFade(true);
        setTimeout(() => {
          setTip(x => (x + 1) % TIPS.length);
          setFade(false);
        }, 300);
      }, 4500);
      return () => clearInterval(i);
    }, [phase]);
    // call timer
    R.useEffect(() => {
      if (phase !== "incall") return;
      const t = setInterval(() => setCallSecs(s => s + 1), 1000);
      return () => clearInterval(t);
    }, [phase]);
    const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    const initials = provider.replace("Dr. ", "").split(" ").map(w => w[0]).join("").toUpperCase();
    if (phase === "ended") {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          position: "absolute",
          inset: 0,
          zIndex: 60,
          background: "linear-gradient(160deg,#0f2730,#0b1620)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "0 30px",
          textAlign: "center"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "var(--aminy-teal-600)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: "check",
        size: 34,
        style: {
          color: "#fff"
        }
      })), /*#__PURE__*/React.createElement("h2", {
        style: {
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 22,
          color: "#fff",
          margin: 0,
          letterSpacing: "-0.02em"
        }
      }, "Session complete"), /*#__PURE__*/React.createElement("p", {
        style: {
          fontSize: 14.5,
          color: "rgba(255,255,255,0.7)",
          lineHeight: 1.55,
          margin: 0,
          maxWidth: 280
        }
      }, fmt(callSecs), " with ", provider, ". Aminy is drafting your visit summary and home-practice notes \u2014 they'll be in My Plan shortly."), /*#__PURE__*/React.createElement("button", {
        onClick: onExit,
        style: {
          marginTop: 8,
          height: 50,
          padding: "0 28px",
          borderRadius: 14,
          border: 0,
          cursor: "pointer",
          background: "var(--aminy-teal-600)",
          color: "#fff",
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: 16
        }
      }, "Back to home"));
    }
    const joined = phase === "incall";
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        zIndex: 60,
        background: "linear-gradient(160deg,#0f172a,#0f2e38 55%,#0c3a44)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "44px 16px 10px",
        zIndex: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        color: "rgba(255,255,255,0.6)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "shield",
      size: 13
    }), " Encrypted in transit"), /*#__PURE__*/React.createElement("button", {
      onClick: onExit,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "none",
        border: 0,
        cursor: "pointer",
        color: "rgba(255,255,255,0.6)",
        fontSize: 13,
        fontFamily: "var(--font-ui)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "back",
      size: 14
    }), " Leave")), joined ? /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: "radial-gradient(circle at 50% 40%, #15323d, #0c2027 70%, #081318)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 104,
        height: 104,
        borderRadius: "50%",
        background: "linear-gradient(135deg,var(--aminy-teal-400),var(--aminy-teal-800))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: 40,
        fontFamily: "var(--font-ui)",
        boxShadow: "0 0 0 6px rgba(45,212,191,0.15)"
      }
    }, initials), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 600,
        color: "#fff"
      }
    }, provider), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "rgba(255,255,255,0.55)",
        marginTop: 2,
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "#4ade80"
      }
    }), " ", fmt(callSecs)))), /*#__PURE__*/React.createElement(SelfTile, {
      camOn: camOn,
      small: true
    }), /*#__PURE__*/React.createElement(Controls, {
      micOn: micOn,
      camOn: camOn,
      setMic: setMic,
      setCam: setCam,
      onEnd: () => {
        buzz(16);
        setPhase("ended");
      },
      joined: true
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "0 18px",
        overflowY: "auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 13,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: 13,
        border: "1px solid rgba(255,255,255,0.1)",
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 50,
        height: 50,
        borderRadius: "50%",
        background: "rgba(45,212,191,0.25)",
        border: "2px solid rgba(45,212,191,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: 17
      }
    }, initials), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 600,
        color: "#fff"
      }
    }, provider), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "rgba(255,255,255,0.5)"
      }
    }, title))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        aspectRatio: "4/3",
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement(SelfTile, {
      camOn: camOn
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 10,
        left: 10,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(0,0,0,0.4)",
        borderRadius: 999,
        padding: "5px 10px",
        fontSize: 11,
        color: "#fff"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "#4ade80"
      }
    }), " Camera ready")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: 14
      }
    }, phase === "admitted" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 17,
        fontWeight: 700,
        color: "#fff",
        marginBottom: 4
      }
    }, "You're in!"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "rgba(255,255,255,0.6)"
      }
    }, "Joining your session now\u2026")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        justifyContent: "center",
        marginBottom: 8
      }
    }, [0, 1, 2].map(d => /*#__PURE__*/React.createElement("span", {
      key: d,
      style: {
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: "#2dd4bf",
        animation: `sb 1.2s ease-in-out ${d * 0.15}s infinite`
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 600,
        color: "#fff"
      }
    }, "Your provider will admit you shortly"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "rgba(255,255,255,0.55)",
        marginTop: 4
      }
    }, "Waiting for ", provider, " \xB7 ", fmt(secs)))), phase === "waiting" && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.1)",
        opacity: fade ? 0 : 1,
        transition: "opacity .3s"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "rgba(45,212,191,0.2)",
        color: "#5eead4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 16
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "#5eead4",
        marginBottom: 3
      }
    }, TIPS[tip][0]), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
        lineHeight: 1.5
      }
    }, TIPS[tip][1])))), /*#__PURE__*/React.createElement(Controls, {
      micOn: micOn,
      camOn: camOn,
      setMic: setMic,
      setCam: setCam,
      joined: false
    })), /*#__PURE__*/React.createElement("style", null, `@keyframes sb{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-6px);opacity:1}}`));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/session.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/settings.jsx
try { (() => {
/* Settings hub + AI Memory transparency. Memory viewer ported from AIContextViewer.tsx
   ("What Aminy Knows" — child, goals, vault, plan, conversation memory, Ease).
   Account · AI memory · Notifications · Privacy · Help · Legal · Sign out. window.SettingsScreen */
(function () {
  const {
    AIcon
  } = window;
  const R = React;

  // What Aminy's AI knows — sections with counts (memory transparency)
  const MEMORY = [{
    id: "child",
    icon: "eye",
    title: "Child profile",
    count: 6,
    rows: [["Name", "Kai"], ["Age", "7 years"], ["Concerns", "Mornings · Transitions · Big feelings"], ["Strengths", "Visual learner · Loves routine"], ["Communication", "Verbal, short phrases"]]
  }, {
    id: "goals",
    icon: "heart",
    title: "Current goals",
    count: 3,
    rows: [["Morning transitions", "70%"], ["Independent tooth-brushing", "Met"], ["Naming big feelings", "40%"]]
  }, {
    id: "vault",
    icon: "doc",
    title: "Vault documents",
    count: 4,
    rows: [["Evaluations", "1"], ["IEPs", "1"], ["Progress reports", "1"], ["BCBA notes", "1"]]
  }, {
    id: "memory",
    icon: "msgsq",
    title: "Conversation memory",
    count: 5000,
    rows: [["Facts remembered", "5,000 (Core)"], ["Successful strategies", "12"], ["Recent concern", "\"Teeth-brushing meltdowns\""]]
  }, {
    id: "ease",
    icon: "sparkles",
    title: "Ease activity",
    count: 8,
    rows: [["Sessions", "8"], ["Skills practiced", "Calm breathing · Naming feelings"]]
  }];
  function MemoryView({
    onBack
  }) {
    const [open, setOpen] = R.useState("child");
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        background: "var(--aminy-mist)",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 16px 12px",
        display: "flex",
        alignItems: "center",
        gap: 11,
        borderBottom: "1px solid var(--color-border)",
        background: "#fff"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "back",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 16,
        color: "var(--color-text-strong)",
        letterSpacing: "-0.01em"
      }
    }, "What Aminy knows")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 16,
        padding: 14,
        display: "flex",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: "var(--aminy-teal-100)",
        color: "var(--aminy-teal-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "brain",
      size: 19
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "The context Aminy uses for Kai"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-muted)",
        marginTop: 2,
        lineHeight: 1.45
      }
    }, "Everything here shapes the advice you get. You're always in control of it."))), MEMORY.map(s => {
      const on = open === s.id;
      return /*#__PURE__*/React.createElement("div", {
        key: s.id,
        style: {
          background: "#fff",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          overflow: "hidden"
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setOpen(on ? null : s.id),
        style: {
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "13px 14px",
          background: "none",
          border: 0,
          cursor: "pointer",
          textAlign: "left"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "var(--aminy-teal-50)",
          color: "var(--aminy-teal-700)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: s.icon,
        size: 17
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1,
          fontSize: 14,
          fontWeight: 600,
          color: "var(--color-text-strong)"
        }
      }, s.title), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: "var(--color-text-muted)",
          background: "var(--aminy-mist)",
          borderRadius: 999,
          padding: "2px 9px"
        }
      }, s.count >= 1000 ? s.count / 1000 + "k" : s.count), /*#__PURE__*/React.createElement(AIcon, {
        name: "chevron",
        size: 16,
        style: {
          color: "var(--color-text-subtle)",
          transform: on ? "rotate(90deg)" : "none",
          transition: "transform .2s"
        }
      })), on && /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "0 14px 12px",
          borderTop: "1px solid var(--color-border)"
        }
      }, s.rows.map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          padding: "9px 0",
          borderBottom: i < s.rows.length - 1 ? "1px solid var(--color-border)" : "0",
          fontSize: 13
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--color-text-muted)",
          flexShrink: 0
        }
      }, k), /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 600,
          color: "var(--color-text-strong)",
          textAlign: "right"
        }
      }, v)))));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.aminyToast("Preparing your data export… we'll email a secure link."),
      style: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        border: "1px solid var(--color-border-strong)",
        background: "#fff",
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 13.5,
        color: "var(--color-text)"
      }
    }, "Export my data"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.aminyToast("This would clear Aminy's memory of Kai."),
      style: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        border: "1px solid #fecaca",
        background: "#fff",
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 13.5,
        color: "var(--aminy-alert-600)"
      }
    }, "Clear memory")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 9,
        background: "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 12,
        padding: 12,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "lock",
      size: 15,
      style: {
        color: "var(--aminy-teal-700)",
        flexShrink: 0,
        marginTop: 1
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--aminy-teal-800)",
        lineHeight: 1.5
      }
    }, "Encrypted & stored securely. Used only to personalize Kai's care \u2014 never sold or shared with third parties."))));
  }
  const GROUPS = [{
    label: "Account",
    items: [{
      id: "profile",
      icon: "users",
      title: "Profile & children",
      note: "Sarah · Kai (7)"
    }, {
      id: "plan",
      icon: "sparkles",
      title: "Plan & billing",
      note: "Core trial · 4 days left",
      to: "plans"
    }, {
      id: "caregivers",
      icon: "heart",
      title: "Caregivers",
      note: "Invite Alex & others"
    }]
  }, {
    label: "Aminy AI",
    items: [{
      id: "memory",
      icon: "brain",
      title: "What Aminy knows",
      note: "Review & manage AI memory",
      mem: true
    }, {
      id: "notifications",
      icon: "bell",
      title: "Notifications",
      note: "Gentle reminders & milestones"
    }]
  }, {
    label: "Privacy & support",
    items: [{
      id: "privacy",
      icon: "lock",
      title: "Privacy & data",
      note: "HIPAA, export, delete account"
    }, {
      id: "help",
      icon: "help",
      title: "Help & contact",
      note: "We usually reply same day"
    }, {
      id: "legal",
      icon: "doc",
      title: "Terms & policies",
      note: "Terms of Service · Privacy Policy"
    }]
  }];
  window.SettingsScreen = function SettingsScreen({
    onBack,
    onNav
  }) {
    const [view, setView] = R.useState("hub");
    if (view === "memory") return /*#__PURE__*/React.createElement(MemoryView, {
      onBack: () => setView("hub")
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        background: "var(--aminy-mist)",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 16px 12px",
        display: "flex",
        alignItems: "center",
        gap: 11,
        borderBottom: "1px solid var(--color-border)",
        background: "#fff"
      }
    }, onBack && /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "back",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 17,
        color: "var(--color-text-strong)",
        letterSpacing: "-0.02em"
      }
    }, "Settings")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 13,
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 14,
        cursor: "pointer"
      },
      onClick: () => window.aminyToast("Edit profile — coming up")
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "linear-gradient(135deg,var(--aminy-teal-400),var(--aminy-teal-700))",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 20,
        fontFamily: "var(--font-ui)"
      }
    }, "S"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "Sarah Chen"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-muted)"
      }
    }, "sarah@email.com \xB7 Core trial")), /*#__PURE__*/React.createElement(AIcon, {
      name: "chevron",
      size: 18,
      style: {
        color: "var(--color-text-subtle)"
      }
    })), GROUPS.map(g => /*#__PURE__*/React.createElement("div", {
      key: g.label
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        margin: "0 4px 8px"
      }
    }, g.label), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        overflow: "hidden"
      }
    }, g.items.map((it, i) => /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => {
        if (it.mem) setView("memory");else if (it.to && onNav) onNav(it.to);else window.aminyToast(it.title + " — coming up");
      },
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "13px 15px",
        background: "none",
        border: 0,
        borderBottom: i < g.items.length - 1 ? "1px solid var(--color-border)" : "0",
        cursor: "pointer",
        textAlign: "left"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "var(--aminy-mist)",
        color: "var(--aminy-teal-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: it.icon,
      size: 17
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, it.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 1,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, it.note)), /*#__PURE__*/React.createElement(AIcon, {
      name: "chevron",
      size: 16,
      style: {
        color: "var(--color-text-subtle)"
      }
    })))))), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.aminyToast("Signed out (demo)"),
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 48,
        borderRadius: 14,
        border: "1px solid var(--color-border-strong)",
        background: "#fff",
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 14.5,
        color: "var(--color-text)"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "logout",
      size: 17
    }), " Sign out"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        fontSize: 11,
        color: "var(--color-text-subtle)",
        paddingBottom: 6
      }
    }, "Aminy v3.2.0 \xB7 Made with care for ABA families")));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/settings.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/shell.jsx
try { (() => {
/* Phone shell, status bar, sticky bottom nav. Attaches window.PhoneShell + window.BottomNav. */
(function () {
  const {
    AIcon
  } = window;
  function StatusBar() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 26px 0",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-text-strong)",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "12",
      viewBox: "0 0 24 24",
      fill: "currentColor"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M2 20h2v-4H2zM7 20h2v-8H7zM12 20h2v-12h-2zM17 20h2V4h-2z"
    })), /*#__PURE__*/React.createElement("svg", {
      width: "22",
      height: "12",
      viewBox: "0 0 24 12",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1"
    }, /*#__PURE__*/React.createElement("rect", {
      x: "1",
      y: "1",
      width: "20",
      height: "10",
      rx: "2.5"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "15",
      height: "6",
      rx: "1",
      fill: "currentColor"
    }))));
  }
  window.PhoneShell = function PhoneShell({
    children,
    bg = "linear-gradient(180deg,var(--aminy-mist),var(--aminy-mist-deep))"
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: 390,
        flexShrink: 0,
        background: "#fff",
        borderRadius: 44,
        padding: 14,
        boxShadow: "0 24px 60px rgba(15,23,42,0.16), 0 4px 12px rgba(15,23,42,0.06)",
        border: "1px solid #e5e7eb",
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        width: 110,
        height: 28,
        background: "#0D1B2A",
        borderRadius: 999,
        zIndex: 5
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        height: 788,
        borderRadius: 32,
        overflow: "hidden",
        background: bg,
        position: "relative",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement(StatusBar, null), children));
  };
  const TABS = [{
    id: "home",
    label: "Home",
    icon: "home"
  }, {
    id: "plan",
    label: "My Plan",
    icon: "heart"
  }, {
    id: "aminy",
    label: "Aminy",
    icon: "sparkles"
  }, {
    id: "calm",
    label: "Exhale",
    icon: "wind"
  }, {
    id: "more",
    label: "More",
    icon: "more"
  }];
  window.BottomNav = function BottomNav({
    active = "home",
    onNav
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderTop: "1px solid var(--color-border)",
        padding: "8px 8px 12px",
        display: "grid",
        gridTemplateColumns: "repeat(5,1fr)",
        flexShrink: 0
      }
    }, TABS.map(t => {
      const on = t.id === active;
      return /*#__PURE__*/React.createElement("button", {
        key: t.id,
        onClick: () => {
          window.aminyHaptic && window.aminyHaptic.light();
          onNav && onNav(t.id);
        },
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          padding: "6px 4px",
          background: "none",
          border: 0,
          cursor: "pointer",
          color: on ? "var(--aminy-teal-700)" : "var(--color-text-muted)",
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "var(--font-ui)",
          borderRadius: 10,
          transition: "color var(--dur-base) var(--ease-calm), transform var(--dur-fast) var(--ease-calm)",
          transform: on ? "translateY(-1px)" : "none"
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: t.icon,
        size: 22,
        stroke: on ? 2.4 : 2
      }), t.label);
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        gridColumn: "1 / -1",
        height: 5,
        width: 120,
        margin: "8px auto 0",
        background: "var(--aminy-navy-300)",
        borderRadius: 999,
        opacity: 0.6
      }
    }));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/telehealth.jsx
try { (() => {
/* TeleABA — telehealth booking. Ported from AvailabilityPicker.tsx (One Medical/Calendly style).
   Date pills with slot counts → Morning/Afternoon/Evening slots → confirm → booked. window.TeleScreen */
(function () {
  const {
    AIcon
  } = window;
  const R = React;
  const ALL = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "17:00", "17:30", "18:00"];
  const fmt = t => {
    const [h, m] = t.split(":").map(Number);
    const p = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${p}`;
  };
  const tod = t => {
    const h = +t.split(":")[0];
    return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  };

  // Build 10 days of pseudo-random-but-stable availability
  const DAYS = (() => {
    const out = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const slots = ALL.map((t, idx) => ({
        t,
        available: !weekend && (i * 7 + idx * 3) % 5 < 2
      }));
      out.push({
        date: d,
        slots
      });
    }
    return out;
  })();
  const dow = d => d.toLocaleDateString("en-US", {
    weekday: "short"
  });
  const isToday = d => d.toDateString() === new Date().toDateString();
  const isTmrw = d => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return d.toDateString() === t.toDateString();
  };
  const longDate = d => d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
  const PERIODS = [["morning", "Morning", "sun"], ["afternoon", "Afternoon", "sunset"], ["evening", "Evening", "moon"]];
  const fmtShort = t => {
    const [h, m] = t.split(":").map(Number);
    const p = h >= 12 ? "pm" : "am";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")}\u00A0${p}`;
  };
  window.TeleScreen = function TeleScreen({
    onBack,
    onJoin
  }) {
    const {
      Button,
      Avatar
    } = window.AminyKit;
    const firstAvail = DAYS.findIndex(d => d.slots.some(s => s.available));
    const [dayIdx, setDayIdx] = R.useState(firstAvail < 0 ? 0 : firstAvail);
    const [sel, setSel] = R.useState(null);
    const [booked, setBooked] = R.useState(false);
    const buzz = ms => {
      try {
        navigator.vibrate && navigator.vibrate(ms);
      } catch (e) {}
    };
    const day = DAYS[dayIdx];
    if (booked) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column"
        }
      }, /*#__PURE__*/React.createElement(Header, {
        onBack: onBack
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 16,
          padding: "0 30px"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 76,
          height: 76,
          borderRadius: "50%",
          background: "var(--aminy-teal-600)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-glow-teal)"
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: "check",
        size: 36,
        style: {
          color: "#fff"
        }
      })), /*#__PURE__*/React.createElement("h2", {
        style: {
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 22,
          color: "var(--color-text-strong)",
          margin: 0,
          letterSpacing: "-0.01em",
          WebkitFontSmoothing: "antialiased"
        }
      }, "You're booked."), /*#__PURE__*/React.createElement("p", {
        style: {
          fontSize: 14.5,
          color: "var(--color-text-muted)",
          lineHeight: 1.55,
          margin: 0,
          maxWidth: 280
        }
      }, longDate(day.date), " at ", fmt(sel), " with Dr. Patel. We'll send a calm reminder beforehand \u2014 and a link to join."), /*#__PURE__*/React.createElement(Button, {
        variant: "secondary",
        onClick: () => {
          setBooked(false);
          setSel(null);
        }
      }, "Book another")));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement(Header, {
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "16px 18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        background: "var(--aminy-mist)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: "Dr Patel",
      tone: "teal",
      size: 44
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "Dr. Patel, OTR/L"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, "30 min \xB7 Occupational therapy \xB7 Telehealth"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--color-text-muted)",
        letterSpacing: ".04em",
        textTransform: "uppercase",
        marginBottom: 10
      }
    }, day.date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 4
      }
    }, DAYS.map((d, i) => {
      const cnt = d.slots.filter(s => s.available).length;
      const on = i === dayIdx;
      const has = cnt > 0;
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        onClick: () => has && (setDayIdx(i), setSel(null)),
        disabled: !has,
        style: {
          flexShrink: 0,
          width: 58,
          padding: "8px 0 7px",
          borderRadius: 14,
          textAlign: "center",
          cursor: has ? "pointer" : "default",
          background: on ? "var(--aminy-teal-600)" : "#fff",
          border: `1.5px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`,
          boxShadow: on ? "var(--shadow-glow-teal)" : "none",
          opacity: has ? 1 : 0.45,
          transition: "all var(--dur-fast) var(--ease-calm)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: ".02em",
          color: on ? "rgba(255,255,255,0.9)" : "var(--color-text-muted)"
        }
      }, isToday(d.date) ? "Today" : isTmrw(d.date) ? "Tmrw" : dow(d.date)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 18,
          fontWeight: 700,
          color: on ? "#fff" : "var(--color-text-strong)",
          lineHeight: 1.2
        }
      }, d.date.getDate()), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9.5,
          fontWeight: 600,
          color: on ? "rgba(255,255,255,0.9)" : has ? "var(--aminy-teal-700)" : "transparent"
        }
      }, has ? `${cnt} open` : "\u2014"));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-text-strong)",
        paddingTop: 2
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "calendar",
      size: 15,
      style: {
        color: "var(--aminy-teal-700)"
      }
    }), " ", longDate(day.date)), PERIODS.map(([key, label, icon]) => {
      const slots = day.slots.filter(s => tod(s.t) === key);
      const avail = slots.filter(s => s.available).length;
      if (!slots.length) return null;
      return /*#__PURE__*/React.createElement("div", {
        key: key
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 10,
          color: "var(--color-text-strong)"
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: icon,
        size: 15,
        style: {
          color: "var(--color-text-muted)"
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 600
        }
      }, label), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11.5,
          color: "var(--color-text-subtle)",
          fontWeight: 500,
          whiteSpace: "nowrap"
        }
      }, "\xB7 ", avail, " open")), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8
        }
      }, slots.map(s => {
        const chosen = sel === s.t;
        if (!s.available) return /*#__PURE__*/React.createElement("span", {
          key: s.t,
          style: {
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            color: "var(--color-text-subtle)",
            background: "transparent",
            borderRadius: 12,
            whiteSpace: "nowrap",
            textDecoration: "line-through",
            textDecorationColor: "var(--aminy-navy-200)",
            opacity: 0.7
          }
        }, fmtShort(s.t));
        return /*#__PURE__*/React.createElement("button", {
          key: s.t,
          onClick: () => {
            buzz(8);
            setSel(s.t);
          },
          style: {
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13.5,
            fontWeight: 600,
            borderRadius: 12,
            cursor: "pointer",
            whiteSpace: "nowrap",
            background: chosen ? "var(--aminy-teal-600)" : "#fff",
            color: chosen ? "#fff" : "var(--aminy-teal-800)",
            border: `1.5px solid ${chosen ? "var(--aminy-teal-600)" : "var(--aminy-teal-400)"}`,
            boxShadow: chosen ? "var(--shadow-glow-teal)" : "0 1px 2px rgba(42,125,153,0.10)",
            transition: "all var(--dur-fast) var(--ease-calm)"
          }
        }, fmtShort(s.t));
      })));
    })), sel && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "12px 16px",
        borderTop: "1px solid var(--color-border)",
        background: "var(--aminy-teal-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "check",
      size: 18,
      style: {
        color: "var(--aminy-teal-700)",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--aminy-teal-800)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, isToday(day.date) ? "Today" : dow(day.date), " at ", fmt(sel)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--aminy-teal-700)"
      }
    }, "30 min \xB7 Dr. Patel"))), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "sm",
      onClick: () => {
        buzz(12);
        setBooked(true);
      }
    }, "Confirm")));
  };
  function Header({
    onBack
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 18px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: "1px solid var(--color-border)",
        background: "#fff"
      }
    }, onBack && /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "var(--aminy-mist)",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text)",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "back",
      size: 16
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: "-0.01em",
        color: "var(--color-text-strong)",
        WebkitFontSmoothing: "antialiased"
      }
    }, "Book a TeleABA visit"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        fontWeight: 500,
        marginTop: 1
      }
    }, "Pick a time that works \u2014 we'll handle the rest")));
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/telehealth.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/utility.jsx
try { (() => {
/* Parent utility screens — Checkout (Stripe) · Notifications · Medication tracker · Outcomes.
   Top pills switch screens; each is a full phone view in the system. window → #root */
(function () {
  const {
    AIcon,
    PhoneShell
  } = window;
  const {
    Button,
    Badge,
    Stat
  } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || {
    light() {},
    medium() {},
    success() {}
  };
  const Head = ({
    title,
    sub,
    right
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 18px 12px",
      display: "flex",
      alignItems: "center",
      gap: 11,
      borderBottom: "1px solid var(--color-border)",
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      fontWeight: 700,
      fontSize: 17,
      letterSpacing: "-0.02em",
      color: "var(--color-text-strong)"
    }
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-text-muted)",
      marginTop: 1
    }
  }, sub)), right);

  /* ============ 1) CHECKOUT (Stripe) ============ */
  function Checkout() {
    const [paid, setPaid] = R.useState(false);
    const F = ({
      label,
      placeholder,
      half
    }) => /*#__PURE__*/React.createElement("div", {
      style: {
        flex: half ? 1 : "none",
        width: half ? "auto" : "100%"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        fontWeight: 600,
        color: "var(--color-text)",
        marginBottom: 6
      }
    }, label), /*#__PURE__*/React.createElement("input", {
      placeholder: placeholder,
      style: {
        width: "100%",
        boxSizing: "border-box",
        height: 46,
        padding: "0 13px",
        borderRadius: 10,
        border: "1px solid var(--color-border-strong)",
        fontSize: 15,
        fontFamily: "var(--font-ui)",
        color: "var(--color-text)",
        outline: "none",
        background: "#fff"
      }
    }));
    if (paid) return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "0 30px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 76,
        height: 76,
        borderRadius: "50%",
        background: "var(--aminy-grow-500)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "check",
      size: 34,
      style: {
        color: "#fff"
      }
    })), /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 800,
        fontSize: 23,
        letterSpacing: "-0.025em",
        color: "var(--color-text-strong)",
        margin: 0
      }
    }, "Welcome to Core."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14.5,
        color: "var(--color-text-muted)",
        lineHeight: 1.55,
        margin: 0,
        maxWidth: 280
      }
    }, "Your trial starts now \u2014 first charge on June 24, and we'll remind you 3 days before. Receipt's in your email."), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setPaid(false)
    }, "Back"));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Checkout",
      sub: "Core \xB7 annual"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 16,
        padding: 15
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "Aminy Core \u2014 annual"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 19,
        fontWeight: 800,
        letterSpacing: "-0.02em",
        color: "var(--color-text-strong)"
      }
    }, "$129", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 500,
        color: "var(--color-text-muted)"
      }
    }, "/yr"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: 6,
        fontSize: 12.5,
        color: "var(--aminy-teal-800)"
      }
    }, /*#__PURE__*/React.createElement("span", null, "14-day free trial, then $129/yr"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: "var(--aminy-grow-600)"
      }
    }, "Save 28%"))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.medium();
        setPaid(true);
      },
      style: {
        height: 50,
        borderRadius: 12,
        border: 0,
        background: "#000",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 16,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7
      }
    }, " Pay"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "var(--color-text-subtle)",
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 1,
        background: "var(--color-border)"
      }
    }), "or pay with card", /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 1,
        background: "var(--color-border)"
      }
    })), /*#__PURE__*/React.createElement(F, {
      label: "Card number",
      placeholder: "1234 1234 1234 1234"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(F, {
      label: "Expiry",
      placeholder: "MM / YY",
      half: true
    }), /*#__PURE__*/React.createElement(F, {
      label: "CVC",
      placeholder: "123",
      half: true
    }), /*#__PURE__*/React.createElement(F, {
      label: "ZIP",
      placeholder: "85001",
      half: true
    })), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      fullWidth: true,
      onClick: () => {
        haptic.success();
        setPaid(true);
      }
    }, "Start free trial"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        fontSize: 11.5,
        color: "var(--color-text-subtle)",
        lineHeight: 1.55
      }
    }, "\uD83D\uDD12 Secured by Stripe \xB7 HSA/FSA eligible \xB7 cancel anytime in Settings.", /*#__PURE__*/React.createElement("br", null), "You won't be charged until June 24, 2026.")));
  }

  /* ============ 2) NOTIFICATIONS ============ */
  const NOTIFS = [{
    g: "Today",
    items: [{
      icon: "video",
      tint: "var(--aminy-teal-50)",
      fg: "var(--aminy-teal-700)",
      t: "OT with Dr. Patel at 3:00",
      m: "Starts in 40 min — join from Home.",
      cta: "Join",
      unread: true
    }, {
      icon: "shield",
      tint: "var(--aminy-care-50)",
      fg: "var(--aminy-care-600)",
      t: "Dr. Morales answered your question",
      m: "\"Dinner table bolting\" — signed review ready.",
      cta: "Read",
      unread: true
    }, {
      icon: "sparkles",
      tint: "var(--aminy-teal-50)",
      fg: "var(--aminy-teal-700)",
      t: "Gentle nudge for tonight",
      m: "Bedtime runway: dim lights at 7:30.",
      unread: false
    }]
  }, {
    g: "This week",
    items: [{
      icon: "award",
      tint: "var(--aminy-win-50)",
      fg: "var(--aminy-win-600)",
      t: "Kai hit a milestone 🎉",
      m: "Named \"frustrated\" without prompting — twice.",
      unread: false
    }, {
      icon: "file",
      tint: "var(--aminy-navy-50)",
      fg: "var(--aminy-navy-700)",
      t: "Claim update",
      m: "CLM-4821 appeal approved · $568 recovered.",
      unread: false
    }]
  }];
  function Notifications() {
    const [read, setRead] = R.useState({});
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Notifications",
      right: /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          haptic.light();
          setRead({
            all: true
          });
        },
        style: {
          border: 0,
          background: "none",
          cursor: "pointer",
          color: "var(--aminy-teal-700)",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "var(--font-ui)"
        }
      }, "Mark all read")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, NOTIFS.map(g => /*#__PURE__*/React.createElement("div", {
      key: g.g
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        margin: "0 4px 8px"
      }
    }, g.g), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, g.items.map((n, i) => {
      const unread = n.unread && !read.all;
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          background: "#fff",
          border: `1px solid ${unread ? "var(--aminy-teal-200)" : "var(--color-border)"}`,
          borderRadius: 16,
          padding: "13px 14px",
          display: "flex",
          gap: 12,
          boxShadow: "var(--shadow-sm)",
          position: "relative"
        }
      }, unread && /*#__PURE__*/React.createElement("span", {
        style: {
          position: "absolute",
          top: 14,
          right: 14,
          width: 8,
          height: 8,
          borderRadius: 999,
          background: "var(--aminy-teal-600)"
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          width: 38,
          height: 38,
          borderRadius: 11,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: n.tint,
          color: n.fg
        }
      }, /*#__PURE__*/React.createElement(AIcon, {
        name: n.icon,
        size: 18
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          fontWeight: 600,
          color: "var(--color-text-strong)",
          paddingRight: 14
        }
      }, n.t), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: "var(--color-text-muted)",
          marginTop: 2,
          lineHeight: 1.45
        }
      }, n.m), n.cta && /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          haptic.light();
          window.aminyToast && window.aminyToast(n.cta + " → opening…");
        },
        style: {
          marginTop: 8,
          height: 32,
          padding: "0 14px",
          borderRadius: 999,
          border: 0,
          background: "var(--aminy-teal-600)",
          color: "#fff",
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: 12.5,
          cursor: "pointer"
        }
      }, n.cta)));
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        fontSize: 12,
        color: "var(--color-text-subtle)"
      }
    }, "You choose what comes through \u2014 tune in Settings \u2192 Notifications.")));
  }

  /* ============ 3) MEDICATION TRACKER ============ */
  const MEDS = [{
    name: "Guanfacine",
    dose: "1 mg · morning",
    time: "7:30 AM",
    status: "taken",
    color: "var(--aminy-grow-500)"
  }, {
    name: "Melatonin",
    dose: "3 mg · bedtime",
    time: "8:00 PM",
    status: "due",
    color: "var(--aminy-teal-600)"
  }, {
    name: "Vitamin D",
    dose: "1000 IU · with breakfast",
    time: "7:30 AM",
    status: "taken",
    color: "var(--aminy-grow-500)"
  }];
  function Meds() {
    const [logged, setLogged] = R.useState({});
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Medications",
      sub: "Kai \xB7 today"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 9
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Today",
      value: String(2 + Object.keys(logged).length),
      unit: "/3",
      caption: "Doses logged",
      accent: true,
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Streak",
      value: "6",
      unit: "days",
      caption: "All doses on time",
      style: {
        flex: 1
      }
    })), MEDS.map((m, i) => {
      const done = m.status === "taken" || logged[i];
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          background: "#fff",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: "13px 15px",
          display: "flex",
          alignItems: "center",
          gap: 13,
          boxShadow: "var(--shadow-sm)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 10,
          height: 42,
          borderRadius: 5,
          background: done ? "var(--aminy-grow-500)" : m.color,
          flexShrink: 0,
          opacity: done ? 1 : 0.85
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14.5,
          fontWeight: 600,
          color: "var(--color-text-strong)"
        }
      }, m.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--color-text-muted)",
          marginTop: 1
        }
      }, m.dose, " \xB7 ", m.time)), done ? /*#__PURE__*/React.createElement(Badge, {
        tone: "grow",
        icon: /*#__PURE__*/React.createElement(AIcon, {
          name: "check",
          size: 13
        })
      }, "Taken") : /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "primary",
        onClick: () => {
          haptic.success();
          setLogged(l => ({
            ...l,
            [i]: true
          }));
        }
      }, "Log dose"));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--aminy-win-50)",
        border: "1px solid var(--aminy-win-100)",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        gap: 11,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement(AIcon, {
      name: "bell",
      size: 17,
      style: {
        color: "var(--aminy-win-600)",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 12.5,
        color: "var(--aminy-win-600)",
        lineHeight: 1.45
      }
    }, /*#__PURE__*/React.createElement("b", null, "Refill heads-up:"), " Guanfacine has ~6 days left. Your pharmacy has the renewal."), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.light();
        window.aminyToast && window.aminyToast("Refill request sent to CVS Phoenix");
      },
      style: {
        height: 32,
        padding: "0 12px",
        borderRadius: 999,
        border: "1px solid var(--aminy-win-100)",
        background: "#fff",
        color: "var(--aminy-win-600)",
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer",
        flexShrink: 0
      }
    }, "Refill")), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      fullWidth: true,
      icon: /*#__PURE__*/React.createElement(AIcon, {
        name: "send",
        size: 15
      }),
      onClick: () => {
        haptic.light();
        window.aminyToast && window.aminyToast("Med log shared with Dr. Morales");
      }
    }, "Share log with care team"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        fontSize: 11,
        color: "var(--color-text-subtle)",
        lineHeight: 1.5
      }
    }, "Always follow your prescriber's guidance. Aminy tracks \u2014 it never advises on dosing.")));
  }

  /* ============ 4) OUTCOMES ============ */
  const DOMAINS = [{
    name: "Communication",
    pct: 72,
    delta: "+9 this quarter",
    spark: [3, 4, 4, 5, 6, 7, 7]
  }, {
    name: "Daily living",
    pct: 58,
    delta: "+12 this quarter",
    spark: [2, 3, 3, 4, 4, 5, 6]
  }, {
    name: "Social connection",
    pct: 41,
    delta: "+5 this quarter",
    spark: [2, 2, 3, 3, 3, 4, 4]
  }];
  function Outcomes() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Outcomes",
      sub: "Kai \xB7 last 6 months",
      right: /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          haptic.light();
          window.aminyToast && window.aminyToast("Exporting outcomes PDF…");
        },
        style: {
          border: 0,
          background: "none",
          cursor: "pointer",
          color: "var(--aminy-teal-700)",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "var(--font-ui)"
        }
      }, "Export")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,var(--aminy-teal-50),#fff)",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: 18,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--aminy-teal-700)",
        marginBottom: 6
      }
    }, "The headline"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16.5,
        fontWeight: 700,
        letterSpacing: "-0.015em",
        color: "var(--color-text-strong)",
        lineHeight: 1.35
      }
    }, "Kai met 7 of 9 goals this period \u2014 and the hardest one (morning transitions) is trending up.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 9
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Goals met",
      value: "7",
      unit: "/9",
      caption: "This period",
      accent: true,
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Sessions",
      value: "46",
      caption: "Attendance 96%",
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Hours",
      value: "118",
      caption: "Direct therapy",
      style: {
        flex: 1
      }
    })), DOMAINS.map(d => /*#__PURE__*/React.createElement("div", {
      key: d.name,
      style: {
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: "14px 16px",
        boxShadow: "var(--shadow-sm)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 9
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, d.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        color: "var(--aminy-grow-600)"
      }
    }, d.delta)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 8,
        background: "var(--aminy-navy-50)",
        borderRadius: 4,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: d.pct + "%",
        height: "100%",
        borderRadius: 4,
        background: "var(--aminy-teal-500)"
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "var(--aminy-teal-700)",
        width: 36,
        textAlign: "right"
      }
    }, d.pct, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-end",
        gap: 4,
        height: 26,
        marginTop: 10
      }
    }, d.spark.map((v, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        flex: 1,
        height: v * 3.4,
        background: i === d.spark.length - 1 ? "var(--aminy-teal-600)" : "var(--aminy-teal-200)",
        borderRadius: 3
      }
    }))))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-subtle)",
        textAlign: "center",
        lineHeight: 1.55,
        padding: "0 12px"
      }
    }, "Progress isn't linear \u2014 a flat month doesn't erase a good quarter. Your BCBA reviews these trends with you each cycle.")));
  }
  const SCREENS = [["checkout", "Checkout", Checkout], ["notifs", "Notifications", Notifications], ["meds", "Meds", Meds], ["outcomes", "Outcomes", Outcomes]];
  function App() {
    const [s, setS] = R.useState("notifs");
    const Cur = SCREENS.find(x => x[0] === s)[2];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 999,
        padding: 5,
        boxShadow: "var(--shadow-sm)"
      }
    }, SCREENS.map(([id, lb]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => {
        haptic.light();
        setS(id);
      },
      style: {
        padding: "8px 16px",
        borderRadius: 999,
        border: 0,
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 600,
        background: s === id ? "var(--aminy-teal-600)" : "transparent",
        color: s === id ? "#fff" : "var(--color-text-muted)"
      }
    }, lb))), /*#__PURE__*/React.createElement(PhoneShell, {
      bg: "linear-gradient(180deg,var(--aminy-mist),var(--aminy-mist-deep))"
    }, /*#__PURE__*/React.createElement("div", {
      key: s,
      style: {
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement(Cur, null))));
  }
  function mount() {
    if (!window.PhoneShell || !window.AminyKit) {
      setTimeout(mount, 60);
      return;
    }
    ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
  }
  mount();
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/utility.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/why.jsx
try { (() => {
/* "Why Aminy" — animated intro/explainer that plays before onboarding.
   Motion does the teaching: each value reveals in sequence, building the story of
   what Aminy is and why a parent needs it. window.WhyAminy({ onStart }) */
(function () {
  const {
    AIcon
  } = window;
  const R = React;
  const reduce = window.AminyMotion && window.AminyMotion.reduce;

  // The story beats — each is a "scene" that animates in.
  const SCENES = [{
    key: "alone",
    glyph: "🌙",
    head: "Raising a child with autism\ncan feel lonely at 2am.",
    sub: "The questions don't keep office hours. Neither do the hard moments.",
    bg: "linear-gradient(180deg,#0C2230,#16323f)",
    fg: "#E2EFF3",
    accent: "#8EC0CE"
  }, {
    key: "coach",
    glyph: "compass",
    head: "Aminy is a calm coach\nin your pocket.",
    sub: "Ask anything, any hour. Real guidance — never judgment, never a score.",
    bg: "linear-gradient(180deg,#F6FBFB,#E2EFF3)",
    fg: "#0C2230",
    accent: "#2A7D99"
  }, {
    key: "knows",
    glyph: "✦",
    head: "It learns your child,\nand gets wiser every day.",
    sub: "Aminy reads your IEPs, remembers what works, and adapts the plan to them.",
    bg: "linear-gradient(180deg,#F1F8FA,#FFFFFF)",
    fg: "#0C2230",
    accent: "#2A7D99"
  }, {
    key: "team",
    glyph: "🤝",
    head: "And a real care team\nis one tap away.",
    sub: "Book TeleABA, message your BCBA, get answers a licensed clinician signs off on.",
    bg: "linear-gradient(180deg,#F1F6F8,#E2EDF1)",
    fg: "#0C2230",
    accent: "#2A7D99"
  }, {
    key: "progress",
    glyph: "🌱",
    head: "So the hard days get\na little softer.",
    sub: "Gentle guidance. Meaningful progress. You don't have to hold it all alone.",
    bg: "linear-gradient(180deg,#FFFBEB,#F6FBFB)",
    fg: "#0C2230",
    accent: "#D97706"
  }];
  function Glyph({
    g,
    accent
  }) {
    if (g === "compass") return /*#__PURE__*/React.createElement("img", {
      src: "../../assets/aminy_compass.png",
      alt: "",
      style: {
        width: 88,
        height: 88,
        display: "block"
      }
    });
    if (g === "✦") return /*#__PURE__*/React.createElement(AIcon, {
      name: "sparkles",
      size: 72,
      style: {
        color: accent
      }
    });
    return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 76,
        lineHeight: 1
      }
    }, g);
  }
  window.WhyAminy = function WhyAminy({
    onStart
  }) {
    const [i, setI] = R.useState(0);
    const [shown, setShown] = R.useState(reduce);
    const s = SCENES[i];
    const last = i === SCENES.length - 1;
    const timer = R.useRef(null);
    R.useEffect(() => {
      if (reduce) return;
      setShown(false);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(r);
    }, [i]);

    // Auto-advance scenes (paused on reduced motion — user taps through).
    R.useEffect(() => {
      if (reduce) return;
      if (last) return;
      timer.current = setTimeout(() => setI(v => v + 1), 3800);
      return () => clearTimeout(timer.current);
    }, [i, last]);
    function next() {
      clearTimeout(timer.current);
      if (last) {
        onStart && onStart();
        return;
      }
      setI(v => v + 1);
    }
    function skip() {
      clearTimeout(timer.current);
      onStart && onStart();
    }
    const enter = delay => reduce ? {} : {
      transform: shown ? "none" : "translateY(12px)",
      transition: `transform var(--dur-slow) var(--ease-lift) ${delay}ms`
    };
    return /*#__PURE__*/React.createElement("div", {
      onClick: next,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: s.bg,
        transition: "background var(--dur-slow) var(--ease-calm)",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: "18%",
        left: "50%",
        width: 320,
        height: 320,
        marginLeft: -160,
        borderRadius: "50%",
        background: s.accent,
        opacity: 0.12,
        filter: "blur(40px)",
        animation: reduce ? "none" : "aminy-breath 6s var(--ease-breath) infinite",
        pointerEvents: "none"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "flex-end",
        padding: "8px 18px 0",
        position: "relative",
        zIndex: 2
      }
    }, !last && /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        skip();
      },
      style: {
        border: 0,
        background: "none",
        cursor: "pointer",
        color: s.fg,
        opacity: 0.6,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "var(--font-ui)",
        padding: 6
      }
    }, "Skip")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 32px",
        gap: 22,
        position: "relative",
        zIndex: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...enter(0),
        transform: reduce ? "none" : shown ? "scale(1)" : "scale(0.86)"
      }
    }, /*#__PURE__*/React.createElement(Glyph, {
      g: s.glyph,
      accent: s.accent
    })), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 26,
        lineHeight: 1.22,
        letterSpacing: "-0.025em",
        color: s.fg,
        margin: 0,
        whiteSpace: "pre-line",
        WebkitFontSmoothing: "antialiased",
        ...enter(110)
      }
    }, s.head), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: 15,
        lineHeight: 1.6,
        color: s.fg,
        opacity: 0.82,
        margin: 0,
        maxWidth: 300,
        transition: reduce ? "none" : `transform var(--dur-slow) var(--ease-lift) 230ms`,
        transform: shown || reduce ? "none" : "translateY(12px)"
      }
    }, s.sub)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "0 26px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        alignItems: "center",
        position: "relative",
        zIndex: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, SCENES.map((_, n) => /*#__PURE__*/React.createElement("div", {
      key: n,
      style: {
        width: n === i ? 22 : 7,
        height: 7,
        borderRadius: 999,
        background: s.accent,
        opacity: n === i ? 1 : 0.3,
        transition: "all var(--dur-base) var(--ease-calm)"
      }
    }))), last ? /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        skip();
      },
      style: {
        width: "100%",
        height: 56,
        borderRadius: 18,
        border: 0,
        cursor: "pointer",
        background: "var(--aminy-teal-600)",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: "-0.01em",
        boxShadow: "var(--shadow-cta)",
        animation: reduce ? "none" : "aminy-rise 500ms var(--ease-lift) 360ms both"
      }
    }, "Let's set up Aminy") : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: s.fg,
        opacity: 0.5,
        fontWeight: 500
      }
    }, "Tap to continue")));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/why.jsx", error: String((e && e.message) || e) }); }

// ui_kits/provider/app.jsx
try { (() => {
/* Aminy Provider OS (B2B) — desktop practice app. Loads ../lib.jsx for primitives.
   Efficient, data-dense, same bones as the parent app — more signal. Violet = clinical accent. */
(function () {
  const R = React;
  const {
    Button,
    Badge,
    Card,
    Stat,
    Avatar,
    Input
  } = window.AminyKit;
  const I = {
    grid: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "3",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "14",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "14",
      width: "7",
      height: "7",
      rx: "1"
    })),
    users: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "7",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
    })),
    shield: /*#__PURE__*/React.createElement("path", {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }),
    notes: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 2v4a2 2 0 0 0 2 2h4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 13h8M8 17h5"
    })),
    billing: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "2",
      y: "5",
      width: "20",
      height: "14",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M2 10h20"
    })),
    calendar: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "18",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 2v4M8 2v4M3 10h18"
    })),
    settings: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
    })),
    sparkles: /*#__PURE__*/React.createElement("path", {
      d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
    }),
    search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m21 21-4.3-4.3"
    })),
    alert: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 9v4M12 17h.01"
    })),
    check: /*#__PURE__*/React.createElement("path", {
      d: "M20 6 9 17l-5-5"
    }),
    clock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 6v6l4 2"
    })),
    timer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M10 2h4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 14v-4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "14",
      r: "8"
    })),
    pin: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "10",
      r: "3"
    })),
    play: /*#__PURE__*/React.createElement("path", {
      d: "M6 4v16l14-8z",
      fill: "currentColor",
      stroke: "none"
    }),
    stop: /*#__PURE__*/React.createElement("rect", {
      x: "6",
      y: "6",
      width: "12",
      height: "12",
      rx: "2",
      fill: "currentColor",
      stroke: "none"
    }),
    chart: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 3v18h18"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "7",
      y: "11",
      width: "3",
      height: "6"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "12",
      y: "7",
      width: "3",
      height: "10"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "17",
      y: "13",
      width: "3",
      height: "4"
    })),
    grad: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M22 10 12 5 2 10l10 5 10-5Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5"
    }))
  };
  const Ico = ({
    n,
    s = 20,
    w = 2,
    style
  }) => /*#__PURE__*/React.createElement("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: w,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, I[n]);
  const NAV = [{
    id: "dashboard",
    label: "Dashboard",
    icon: "grid"
  }, {
    id: "clients",
    label: "Clients",
    icon: "users"
  }, {
    id: "credentialing",
    label: "Credentialing",
    icon: "shield"
  }, {
    id: "notes",
    label: "AI Notes",
    icon: "notes"
  }, {
    id: "review",
    label: "Sign-off",
    icon: "shield"
  }, {
    id: "messages",
    label: "Messages",
    icon: "inbox"
  }, {
    id: "billing",
    label: "Billing",
    icon: "billing"
  }, {
    id: "payer",
    label: "Payer Scorecard",
    icon: "chart"
  }, {
    id: "evv",
    label: "Visit Verify",
    icon: "clock"
  }, {
    id: "supervision",
    label: "Supervision",
    icon: "grad"
  }, {
    id: "schedule",
    label: "Schedule",
    icon: "calendar"
  }];
  function Sidebar({
    active,
    onNav
  }) {
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 248,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid var(--color-border)",
        color: "var(--color-text)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px 18px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "0 8px 4px"
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/aminy_logo.png",
      alt: "Aminy",
      style: {
        height: 26,
        width: "auto",
        display: "block"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "0 8px",
        marginBottom: 22
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--aminy-teal-700)"
      }
    }, "for Providers")), /*#__PURE__*/React.createElement("nav", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2
      }
    }, NAV.map(n => {
      const on = n.id === active;
      return /*#__PURE__*/React.createElement("button", {
        key: n.id,
        onClick: () => onNav(n.id),
        style: {
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "11px 13px",
          borderRadius: 11,
          border: 0,
          cursor: "pointer",
          background: on ? "var(--aminy-teal-50)" : "transparent",
          color: on ? "var(--aminy-teal-800)" : "var(--aminy-navy-500)",
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          fontWeight: on ? 600 : 500,
          textAlign: "left"
        }
      }, on && /*#__PURE__*/React.createElement("span", {
        style: {
          position: "absolute",
          left: 0,
          top: 9,
          bottom: 9,
          width: 3,
          borderRadius: "0 3px 3px 0",
          background: "var(--aminy-teal-600)"
        }
      }), /*#__PURE__*/React.createElement(Ico, {
        n: n.icon,
        s: 18,
        w: on ? 2.2 : 1.8
      }), " ", n.label);
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: "auto",
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "11px 10px",
        background: "var(--aminy-navy-50)",
        borderRadius: 13
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: "Ana Morales",
      tone: "teal",
      size: 36
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        lineHeight: 1.3,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "Dr. Morales"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-muted)"
      }
    }, "BCBA \xB7 Rise Pediatric Therapies")), /*#__PURE__*/React.createElement(Ico, {
      n: "settings",
      s: 16,
      style: {
        color: "var(--color-text-subtle)"
      }
    })));
  }
  function Topbar({
    title
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 72,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        borderBottom: "1px solid var(--color-border)",
        background: "rgba(255,255,255,0.8)",
        backdropFilter: "blur(8px)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 21,
        letterSpacing: "-0.025em",
        color: "var(--color-text-strong)",
        WebkitFontSmoothing: "antialiased"
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 40,
        padding: "0 15px",
        background: "#fff",
        border: "1px solid var(--color-border-strong)",
        borderRadius: 999,
        color: "var(--color-text-muted)",
        width: 248
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "search",
      s: 16
    }), " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13
      }
    }, "Search clients, claims\u2026")), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "sm",
      style: {
        background: "var(--aminy-teal-600)"
      },
      icon: /*#__PURE__*/React.createElement(Ico, {
        n: "sparkles",
        s: 16
      })
    }, "New note")));
  }
  function KPIs() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Billable this week",
      value: "26.5",
      unit: "hrs",
      caption: "Target 25 \xB7 on track",
      accent: true
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Active clients",
      value: "7",
      caption: "6\u20138 healthy caseload"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Clean claim rate",
      value: "96",
      unit: "%",
      caption: "+3 pts vs last month"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Supervision due",
      value: "2",
      unit: "RBTs",
      caption: "By Friday"
    }));
  }
  const ATTENTION = [{
    icon: "alert",
    tone: "var(--aminy-alert-600)",
    bg: "var(--aminy-alert-100)",
    t: "1 claim denied — 97153, Kai R.",
    m: "Payer: AHCCCS · code review needed",
    cta: "Resolve"
  }, {
    icon: "shield",
    tone: "var(--aminy-teal-600)",
    bg: "var(--aminy-teal-50)",
    t: "Centene credentialing: docs requested",
    m: "CAQH attestation due in 4 days",
    cta: "Upload"
  }, {
    icon: "clock",
    tone: "var(--aminy-win-600)",
    bg: "var(--aminy-win-50)",
    t: "RBT supervision: Jordan, Mia",
    m: "5% monthly hours — 2 visits left",
    cta: "Schedule"
  }];
  function Dashboard() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        overflowY: "auto"
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "aminy-affirm",
      style: {
        margin: 0,
        maxWidth: 560
      }
    }, "Good morning, Dr. Morales \u2014 seven families are a little steadier because of this week. Here's what needs you."), /*#__PURE__*/React.createElement(KPIs, null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "16px 18px",
        borderBottom: "1px solid var(--color-border)",
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "Needs attention"), ATTENTION.map((a, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderBottom: i < ATTENTION.length - 1 ? "1px solid var(--color-border)" : "0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 38,
        height: 38,
        borderRadius: 10,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: a.bg,
        color: a.tone
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: a.icon,
      s: 18
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, a.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, a.m)), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary"
    }, a.cta)))), /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "16px 18px",
        borderBottom: "1px solid var(--color-border)",
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "Today"), [{
      t: "9:00",
      l: "Kai R. — direct (97153)",
      m: "Telehealth · 2 hrs"
    }, {
      t: "11:30",
      l: "Mia T. — supervision (97155)",
      m: "In-clinic · 1 hr"
    }, {
      t: "2:00",
      l: "Parent training — the Okafors",
      m: "97156 · 45 min"
    }, {
      t: "3:30",
      l: "Note review + sign-off",
      m: "3 drafts pending"
    }].map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 12,
        padding: "12px 18px",
        borderBottom: i < 3 ? "1px solid var(--color-border)" : "0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--aminy-teal-600)",
        width: 44,
        flexShrink: 0
      }
    }, s.t), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, s.l), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, s.m)))))));
  }
  const PAYERS = [{
    payer: "AHCCCS (Medicaid)",
    stage: 4,
    status: "Active",
    tone: "grow"
  }, {
    payer: "Blue Cross AZ",
    stage: 4,
    status: "Active",
    tone: "grow"
  }, {
    payer: "Centene / Ambetter",
    stage: 2,
    status: "Docs requested",
    tone: "win"
  }, {
    payer: "UnitedHealthcare",
    stage: 3,
    status: "Under review",
    tone: "care"
  }, {
    payer: "Cigna",
    stage: 1,
    status: "Not started",
    tone: "navy"
  }];
  const STAGES = ["Submitted", "Review", "Approved", "Active"];
  function Credentialing() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28,
        overflowY: "auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h3"
    }, "Payer credentialing"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "Each panel is revenue you can bill. Lost time here is lost months.")), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "sm",
      style: {
        background: "var(--aminy-teal-600)"
      }
    }, "Add payer")), /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, PAYERS.map((p, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "grid",
        gridTemplateColumns: "1.1fr 2fr auto",
        gap: 18,
        alignItems: "center",
        padding: "16px 18px",
        borderBottom: i < PAYERS.length - 1 ? "1px solid var(--color-border)" : "0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, p.payer), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, STAGES.map((s, si) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: si
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        height: 5,
        borderRadius: 3,
        background: si < p.stage ? "var(--aminy-teal-600)" : "var(--aminy-navy-100)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        lineHeight: 1,
        whiteSpace: "nowrap",
        color: si < p.stage ? "var(--aminy-teal-700)" : "var(--color-text-subtle)",
        fontWeight: si < p.stage ? 600 : 500
      }
    }, s))))), /*#__PURE__*/React.createElement(Badge, {
      tone: p.tone
    }, p.status)))));
  }
  function AINotes() {
    const [signed, setSigned] = R.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h3"
    }, "AI session note \xB7 Kai R. \u2014 97153"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "Drafted from your session data. You review and sign \u2014 Aminy never bills without you.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 16,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        background: "var(--aminy-teal-50)",
        color: "var(--aminy-teal-600)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "sparkles",
      s: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--aminy-teal-600)"
      }
    }, "Aminy draft \xB7 SOAP")), [["S — Subjective", "Caregiver reports smoother morning transition; Kai used \"first-then\" board without prompt twice this week."], ["O — Objective", "90-min session, natural-environment teaching. Manding: 14 independent mands (↑ from 9). 2 brief protests at transition, recovered <60s with visual timer."], ["A — Assessment", "Progress toward Goal 1 (transition tolerance) is on trajectory; prompt-fading criteria met for tooth-brushing chain. No new interfering behaviors."], ["P — Plan", "Continue NET 25 hrs/wk. Introduce delayed reinforcement on mands. Parent training 97156 to generalize first-then to evening routine."]].map(([h, b], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "var(--aminy-navy-500)",
        letterSpacing: ".04em",
        marginBottom: 3
      }
    }, h), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        lineHeight: 1.55,
        color: "var(--color-text)"
      }
    }, b)))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 12
      }
    }, "Billing"), [["CPT code", "97153"], ["Units", "6 (15-min)"], ["Rate (HO)", "$94.76/hr"], ["Session total", "$568.56"], ["Payer", "AHCCCS"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "1px solid var(--color-border)",
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)"
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, v))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16
      }
    }, signed ? /*#__PURE__*/React.createElement(Badge, {
      tone: "grow",
      icon: /*#__PURE__*/React.createElement(Ico, {
        n: "check",
        s: 14
      })
    }, "Signed & queued to bill") : /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      fullWidth: true,
      style: {
        background: "var(--aminy-teal-600)"
      },
      onClick: () => setSigned(true)
    }, "Approve & sign"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-muted)",
        marginTop: 10,
        lineHeight: 1.5
      }
    }, "Your signature attests clinical accuracy. Aminy retains the note for 7 years per BACB 4.05.")))));
  }
  const CLAIMS = [{
    id: "CLM-4821",
    client: "Kai R.",
    code: "97153",
    amt: "$568.56",
    status: "Denied",
    tone: "win",
    note: "Modifier mismatch"
  }, {
    id: "CLM-4820",
    client: "Mia T.",
    code: "97155",
    amt: "$447.84",
    status: "Paid",
    tone: "grow",
    note: "—"
  }, {
    id: "CLM-4819",
    client: "Liam O.",
    code: "97151",
    amt: "$715.68",
    status: "Pending",
    tone: "care",
    note: "Submitted 2d ago"
  }, {
    id: "CLM-4818",
    client: "Ava P.",
    code: "97153",
    amt: "$568.56",
    status: "Paid",
    tone: "grow",
    note: "—"
  }, {
    id: "CLM-4817",
    client: "Noah K.",
    code: "97156",
    amt: "$150.84",
    status: "Pending",
    tone: "care",
    note: "Submitted 1d ago"
  }];
  function Billing() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Billed this month",
      value: "$48.2k",
      caption: "Across 7 clients",
      accent: true
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Collected",
      value: "$44.9k",
      caption: "93% collection rate"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "In denial review",
      value: "1",
      unit: "claim",
      caption: "$568 recoverable"
    })), /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 0.8fr 1fr 1fr 0.8fr",
        gap: 12,
        padding: "12px 18px",
        borderBottom: "1px solid var(--color-border)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)"
      }
    }, /*#__PURE__*/React.createElement("span", null, "Claim"), /*#__PURE__*/React.createElement("span", null, "Client"), /*#__PURE__*/React.createElement("span", null, "CPT"), /*#__PURE__*/React.createElement("span", null, "Amount"), /*#__PURE__*/React.createElement("span", null, "Status"), /*#__PURE__*/React.createElement("span", null)), CLAIMS.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 0.8fr 1fr 1fr 0.8fr",
        gap: 12,
        padding: "14px 18px",
        borderBottom: i < CLAIMS.length - 1 ? "1px solid var(--color-border)" : "0",
        alignItems: "center",
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--color-text-muted)"
      }
    }, c.id), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, c.client), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 12
      }
    }, c.code), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600
      }
    }, c.amt), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Badge, {
      tone: c.tone
    }, c.status)), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: "right"
      }
    }, c.status === "Denied" ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      style: {
        background: "var(--aminy-teal-600)"
      }
    }, "Appeal") : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--color-text-subtle)"
      }
    }, c.note))))));
  }
  function Placeholder({
    title
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "40px",
        textAlign: "center",
        color: "var(--color-text-muted)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 600,
        color: "var(--color-text-strong)",
        marginBottom: 6
      }
    }, title), "This surface is scaffolded in the kit \u2014 wire it to your data layer.")));
  }
  function App() {
    const [tab, setTab] = R.useState(() => localStorage.getItem("aminy-provider-tab") || "dashboard");
    R.useEffect(() => {
      localStorage.setItem("aminy-provider-tab", tab);
    }, [tab]);
    const titles = {
      dashboard: "Dashboard",
      clients: "Clients",
      credentialing: "Credentialing",
      notes: "AI Notes",
      review: "Needs your sign-off",
      messages: "Messages",
      billing: "Billing",
      payer: "Payer Scorecard",
      evv: "Visit Verification",
      supervision: "Supervision",
      schedule: "Schedule"
    };
    const PS = window.ProviderScreens || {};
    const screens = {
      dashboard: /*#__PURE__*/React.createElement(Dashboard, null),
      credentialing: /*#__PURE__*/React.createElement(Credentialing, null),
      notes: /*#__PURE__*/React.createElement(AINotes, null),
      billing: /*#__PURE__*/React.createElement(Billing, null),
      payer: PS.Payer ? /*#__PURE__*/React.createElement(PS.Payer, null) : /*#__PURE__*/React.createElement(Placeholder, {
        title: "Payer Scorecard"
      }),
      review: PS.Review ? /*#__PURE__*/React.createElement(PS.Review, null) : /*#__PURE__*/React.createElement(Placeholder, {
        title: "Sign-off queue"
      }),
      messages: PS.Messages ? /*#__PURE__*/React.createElement(PS.Messages, null) : /*#__PURE__*/React.createElement(Placeholder, {
        title: "Messages"
      }),
      clients: PS.Clients ? /*#__PURE__*/React.createElement(PS.Clients, null) : /*#__PURE__*/React.createElement(Placeholder, {
        title: "Client roster"
      }),
      evv: PS.EVV ? /*#__PURE__*/React.createElement(PS.EVV, null) : /*#__PURE__*/React.createElement(Placeholder, {
        title: "Visit verification"
      }),
      supervision: PS.Supervision ? /*#__PURE__*/React.createElement(PS.Supervision, null) : /*#__PURE__*/React.createElement(Placeholder, {
        title: "Supervision"
      }),
      schedule: PS.Schedule ? /*#__PURE__*/React.createElement(PS.Schedule, null) : /*#__PURE__*/React.createElement(Placeholder, {
        title: "Schedule"
      })
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        width: 1240,
        height: 800,
        background: "var(--aminy-mist)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "var(--shadow-xl)",
        border: "1px solid var(--color-border)"
      }
    }, /*#__PURE__*/React.createElement(Sidebar, {
      active: tab,
      onNav: setTab
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(Topbar, {
      title: titles[tab]
    }), /*#__PURE__*/React.createElement("div", {
      key: tab,
      style: {
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        animation: "aminy-fade-up var(--dur-base) var(--ease-calm) both"
      }
    }, screens[tab])));
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/provider/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/provider/extras.jsx
try { (() => {
/* Provider-side extras — Org/Admin portal · Payer outcomes (MCO view) · Provider application.
   Desktop views with a top switcher. window → #root */
(function () {
  const {
    Button,
    Badge,
    Card,
    Stat,
    Avatar
  } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || {
    light() {},
    medium() {},
    success() {}
  };
  const I = {
    users: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "7",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
    })),
    pin: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "10",
      r: "3"
    })),
    check: /*#__PURE__*/React.createElement("path", {
      d: "M20 6 9 17l-5-5"
    }),
    plus: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M5 12h14"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 5v14"
    })),
    chart: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 3v18h18"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "7",
      y: "11",
      width: "3",
      height: "6"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "12",
      y: "7",
      width: "3",
      height: "10"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "17",
      y: "13",
      width: "3",
      height: "4"
    })),
    shield: /*#__PURE__*/React.createElement("path", {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }),
    doc: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 2v4a2 2 0 0 0 2 2h4"
    })),
    up: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m17 8-5-5-5 5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 3v12"
    }))
  };
  const Ico = ({
    n,
    s = 18,
    style
  }) => /*#__PURE__*/React.createElement("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, I[n]);
  const Frame = ({
    title,
    sub,
    right,
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1240,
      minHeight: 800,
      background: "var(--aminy-mist)",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "var(--shadow-xl)",
      border: "1px solid var(--color-border)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 72,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 32px",
      borderBottom: "1px solid var(--color-border)",
      background: "rgba(255,255,255,0.8)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/aminy_logo.png",
    alt: "aminy",
    style: {
      height: 26
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 26,
      background: "var(--color-border-strong)"
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      fontWeight: 700,
      fontSize: 18,
      letterSpacing: "-0.02em",
      color: "var(--color-text-strong)"
    }
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-text-muted)"
    }
  }, sub))), right), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: 28,
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, children));

  /* ============ 1) ORG / ADMIN ============ */
  const STAFF = [{
    name: "Dr. Ana Morales",
    role: "BCBA-D · Clinical director",
    caseload: "7 clients",
    cred: "Active",
    tone: "grow"
  }, {
    name: "Dr. Sam Chen",
    role: "BCBA",
    caseload: "8 clients",
    cred: "Active",
    tone: "grow"
  }, {
    name: "Maria Garcia",
    role: "RBT",
    caseload: "4 clients",
    cred: "Renews Aug",
    tone: "win"
  }, {
    name: "Jordan Lee",
    role: "RBT",
    caseload: "3 clients",
    cred: "Active",
    tone: "grow"
  }, {
    name: "Priya Shah",
    role: "RBT-T",
    caseload: "2 clients",
    cred: "In supervision",
    tone: "care"
  }];
  function OrgAdmin() {
    return /*#__PURE__*/React.createElement(Frame, {
      title: "Rise Pediatric Therapies",
      sub: "Organization admin",
      right: /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "primary",
        icon: /*#__PURE__*/React.createElement(Ico, {
          n: "plus",
          s: 15
        }),
        onClick: () => {
          haptic.light();
          window.aminyToast && window.aminyToast("Invite sent — new seat added when accepted");
        }
      }, "Invite clinician")
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Clinicians",
      value: "12",
      caption: "9 billable this week",
      accent: true
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Active clients",
      value: "84",
      caption: "+6 this month"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Locations",
      value: "3",
      caption: "Phoenix \xB7 Mesa \xB7 Tele"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Utilization",
      value: "87",
      unit: "%",
      caption: "Target 85% \xB7 healthy"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1.5fr 1fr",
        gap: 16,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "14px 18px",
        borderBottom: "1px solid var(--color-border)",
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "Team"), STAFF.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "13px 18px",
        borderBottom: i < STAFF.length - 1 ? "1px solid var(--color-border)" : "0"
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: s.name,
      tone: "teal",
      size: 36
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, s.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)"
      }
    }, s.role)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-muted)",
        width: 90
      }
    }, s.caseload), /*#__PURE__*/React.createElement(Badge, {
      tone: s.tone
    }, s.cred)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 12
      }
    }, "Locations"), [["Phoenix Clinic", "1240 E Osborn Rd", "6 rooms"], ["Mesa Clinic", "455 W Main St", "4 rooms"], ["Telehealth", "Statewide AZ", "Daily.co"]].map(([n, a, m], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 10,
        padding: "9px 0",
        borderBottom: i < 2 ? "1px solid var(--color-border)" : "0",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "pin",
      s: 15,
      style: {
        color: "var(--aminy-teal-600)",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, n), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)"
      }
    }, a)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-subtle)"
      }
    }, m)))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 10
      }
    }, "Compliance"), [["Credential renewals due (90d)", "2"], ["Supervision on track", "2 of 3"], ["Open incident reports", "0"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: i < 2 ? "1px solid var(--color-border)" : "0",
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)"
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, v)))))));
  }

  /* ============ 2) PAYER OUTCOMES (MCO view) ============ */
  const PDOMAINS = [{
    name: "Communication",
    pct: 68
  }, {
    name: "Daily living skills",
    pct: 61
  }, {
    name: "Social connection",
    pct: 52
  }, {
    name: "Challenging behavior ↓",
    pct: 74
  }];
  function PayerOutcomes() {
    return /*#__PURE__*/React.createElement(Frame, {
      title: "Outcomes \u2014 AHCCCS cohort",
      sub: "Q2 2026 \xB7 312 members \xB7 de-identified aggregate",
      right: /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "secondary",
        icon: /*#__PURE__*/React.createElement(Ico, {
          n: "doc",
          s: 15
        }),
        onClick: () => {
          haptic.light();
          window.aminyToast && window.aminyToast("Exporting quarterly outcomes report…");
        }
      }, "Export report")
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Members served",
      value: "312",
      caption: "+38 vs Q1",
      accent: true
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Avg goal attainment",
      value: "71",
      unit: "%",
      caption: "+4 pts vs Q1"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Utilization vs auth",
      value: "92",
      unit: "%",
      caption: "Healthy band 85\u2013105%"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Clean claim rate",
      value: "95",
      unit: "%",
      caption: "Denials 3.1% \xB7 \u21930.6"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr",
        gap: 16,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 16
      }
    }, "Goal attainment by domain"), PDOMAINS.map(d => /*#__PURE__*/React.createElement("div", {
      key: d.name,
      style: {
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, d.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: "var(--aminy-teal-700)"
      }
    }, d.pct, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 9,
        background: "var(--aminy-navy-50)",
        borderRadius: 5,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: d.pct + "%",
        height: "100%",
        borderRadius: 5,
        background: "var(--aminy-teal-500)"
      }
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-subtle)",
        marginTop: 4
      }
    }, "Attainment = % of authorized treatment goals met or exceeded within the quarter.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 10
      }
    }, "Quarterly trend"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        height: 90
      }
    }, [52, 58, 63, 67, 71].map((v, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        height: v,
        background: i === 4 ? "var(--aminy-teal-600)" : "var(--aminy-teal-200)",
        borderRadius: 6
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "var(--color-text-subtle)"
      }
    }, ["Q2'25", "Q3", "Q4", "Q1", "Q2"][i]))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 10
      }
    }, "Engagement"), [["Family app weekly-active", "78%"], ["Home practice completion", "64%"], ["Visit attendance", "94%"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: i < 2 ? "1px solid var(--color-border)" : "0",
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)"
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, v)))))));
  }

  /* ============ 3) PROVIDER APPLICATION ============ */
  const STEPS = ["License & NPI", "Credentials", "Availability", "Review"];
  function Application() {
    const [step, setStep] = R.useState(0);
    const Field = ({
      label,
      placeholder,
      half
    }) => /*#__PURE__*/React.createElement("div", {
      style: {
        flex: half ? 1 : "none",
        width: half ? "auto" : "100%"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-text)",
        marginBottom: 6
      }
    }, label), /*#__PURE__*/React.createElement("input", {
      placeholder: placeholder,
      style: {
        width: "100%",
        boxSizing: "border-box",
        height: 46,
        padding: "0 13px",
        borderRadius: 10,
        border: "1px solid var(--color-border-strong)",
        fontSize: 14.5,
        fontFamily: "var(--font-ui)",
        color: "var(--color-text)",
        outline: "none",
        background: "#fff"
      }
    }));
    return /*#__PURE__*/React.createElement(Frame, {
      title: "Join Aminy as a provider",
      sub: "BCBA \xB7 SLP \xB7 OT \u2014 credential once, see families fast"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 720,
        width: "100%",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, STEPS.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: s,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 5,
        borderRadius: 3,
        background: i <= step ? "var(--aminy-teal-600)" : "var(--aminy-navy-100)",
        transition: "background .3s"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        fontWeight: i === step ? 700 : 500,
        color: i <= step ? "var(--aminy-teal-700)" : "var(--color-text-subtle)",
        whiteSpace: "nowrap"
      }
    }, s)))), /*#__PURE__*/React.createElement(Card, null, step === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Full name",
      placeholder: "Dr. Ana Morales",
      half: true
    }), /*#__PURE__*/React.createElement(Field, {
      label: "Credential",
      placeholder: "BCBA-D",
      half: true
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "License number",
      placeholder: "AZ-BACB-123456",
      half: true
    }), /*#__PURE__*/React.createElement(Field, {
      label: "Licensing state",
      placeholder: "Arizona",
      half: true
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "NPI",
      placeholder: "10-digit NPI",
      half: true
    }), /*#__PURE__*/React.createElement(Field, {
      label: "CAQH ID",
      placeholder: "Optional \u2014 speeds credentialing",
      half: true
    }))), step === 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, [["State license", true], ["Liability insurance (COI)", true], ["Resume / CV", false], ["BLS/CPR certificate", false]].map(([doc, done], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        border: `1.5px dashed ${done ? "var(--aminy-grow-500)" : "var(--color-border-strong)"}`,
        background: done ? "var(--aminy-grow-50)" : "#fff"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: done ? "check" : "up",
      s: 17,
      style: {
        color: done ? "var(--aminy-grow-600)" : "var(--aminy-teal-700)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, doc), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.light();
        window.aminyToast && window.aminyToast(done ? "Re-uploading " + doc : "Choose a file for " + doc);
      },
      style: {
        height: 34,
        padding: "0 14px",
        borderRadius: 999,
        border: "1px solid var(--color-border-strong)",
        background: "#fff",
        color: "var(--color-text)",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 12.5,
        cursor: "pointer"
      }
    }, done ? "Replace" : "Upload")))), step === 2 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--color-text-muted)",
        lineHeight: 1.5
      }
    }, "When can families book you? You control this completely \u2014 change it anytime."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(5,1fr)",
        gap: 8
      }
    }, ["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => /*#__PURE__*/React.createElement("button", {
      key: d,
      onClick: () => haptic.light(),
      style: {
        padding: "14px 0",
        borderRadius: 12,
        border: `1.5px solid ${i < 4 ? "var(--aminy-teal-600)" : "var(--color-border-strong)"}`,
        background: i < 4 ? "var(--aminy-teal-50)" : "#fff",
        color: i < 4 ? "var(--aminy-teal-800)" : "var(--color-text-muted)",
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer"
      }
    }, d))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Earliest start",
      placeholder: "8:00 AM",
      half: true
    }), /*#__PURE__*/React.createElement(Field, {
      label: "Latest end",
      placeholder: "6:00 PM",
      half: true
    }), /*#__PURE__*/React.createElement(Field, {
      label: "Session rate (cash-pay)",
      placeholder: "$150 / hr",
      half: true
    }))), step === 3 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14,
        textAlign: "center",
        alignItems: "center",
        padding: "10px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: "var(--aminy-teal-600)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--shadow-glow-teal)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "check",
      s: 28,
      style: {
        color: "#fff"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: "-0.02em",
        color: "var(--color-text-strong)"
      }
    }, "Application ready to submit"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--color-text-muted)",
        lineHeight: 1.6,
        maxWidth: 420
      }
    }, "We verify your license and documents within 2\u20133 business days, then start payer credentialing on your behalf. You can see cash-pay families as soon as verification clears."))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: () => {
        haptic.light();
        setStep(Math.max(0, step - 1));
      },
      disabled: step === 0
    }, "Back"), step < 3 ? /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      onClick: () => {
        haptic.light();
        setStep(step + 1);
      }
    }, "Continue") : /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: /*#__PURE__*/React.createElement(Ico, {
        n: "shield",
        s: 16
      }),
      onClick: () => {
        haptic.success();
        window.aminyToast && window.aminyToast("Submitted — we'll email you within 2–3 business days");
      }
    }, "Submit application"))));
  }

  /* ============ 0) OPERATOR DASHBOARD (pilot ops) ============ */
  function Operator() {
    const [tab, setTab] = R.useState("overview");
    const TABS = [["overview", "Overview"], ["engagement", "Engagement"], ["ai", "AI usage"], ["clinical", "Clinical"], ["marketplace", "Marketplace"]];
    const Mini = ({
      label,
      value,
      unit,
      caption,
      tone
    }) => /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".07em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)"
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 3,
        margin: "6px 0 2px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-ui)",
        fontWeight: 800,
        fontSize: 30,
        letterSpacing: "-0.02em",
        color: "var(--color-text-strong)"
      }
    }, value), unit && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--color-text-muted)"
      }
    }, unit)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: tone === "up" ? "var(--aminy-grow-600)" : "var(--color-text-subtle)",
        fontWeight: tone === "up" ? 600 : 400
      }
    }, caption));
    const Bars = ({
      data,
      fmt
    }) => /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        height: 96
      }
    }, data.map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        height: Math.max(6, d.v),
        background: i === data.length - 1 ? "var(--aminy-teal-600)" : "var(--aminy-teal-200)",
        borderRadius: 6
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "var(--color-text-subtle)"
      }
    }, d.l))));
    return /*#__PURE__*/React.createElement(Frame, {
      title: "Operator dashboard",
      sub: "AACT Arizona pilot \xB7 312 families \xB7 47 days left",
      right: /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 4,
          background: "var(--aminy-navy-50)",
          borderRadius: 999,
          padding: 4
        }
      }, ["7d", "30d", "All"].map((r, i) => /*#__PURE__*/React.createElement("button", {
        key: r,
        onClick: () => haptic.light(),
        style: {
          padding: "5px 12px",
          borderRadius: 999,
          border: 0,
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: 12,
          background: i === 1 ? "#fff" : "transparent",
          color: i === 1 ? "var(--color-text-strong)" : "var(--color-text-muted)",
          boxShadow: i === 1 ? "var(--shadow-sm)" : "none"
        }
      }, r))), /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "secondary",
        icon: /*#__PURE__*/React.createElement(Ico, {
          n: "doc",
          s: 15
        }),
        onClick: () => {
          haptic.light();
          window.aminyToast && window.aminyToast("Exporting pilot report (CSV)…");
        }
      }, "Export"))
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        borderBottom: "1px solid var(--color-border)",
        marginBottom: 2
      }
    }, TABS.map(([id, lb]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => {
        haptic.light();
        setTab(id);
      },
      style: {
        padding: "10px 16px",
        border: 0,
        borderBottom: `2px solid ${tab === id ? "var(--aminy-teal-600)" : "transparent"}`,
        background: "transparent",
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontWeight: tab === id ? 700 : 500,
        fontSize: 13.5,
        color: tab === id ? "var(--aminy-teal-700)" : "var(--color-text-muted)",
        marginBottom: -1
      }
    }, lb))), tab === "overview" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Mini, {
      label: "Active families",
      value: "312",
      caption: "+38 this month",
      tone: "up"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "Onboarding rate",
      value: "86",
      unit: "%",
      caption: "completed setup"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "7-day activation",
      value: "71",
      unit: "%",
      caption: "+5 pts vs last cohort",
      tone: "up"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "NPS",
      value: "62",
      caption: "34 promoters \xB7 4 detractors"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 14
      }
    }, "Tier distribution"), [["Free", 58, "var(--aminy-navy-300)"], ["Starter", 22, "var(--aminy-teal-300)"], ["Core", 14, "var(--aminy-teal-500)"], ["Pro", 6, "var(--aminy-teal-700)"]].map(([n, p, c], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 5,
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, n), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)"
      }
    }, p, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 9,
        background: "var(--aminy-navy-50)",
        borderRadius: 5,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: p + "%",
        height: "100%",
        background: c,
        borderRadius: 5
      }
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-subtle)",
        marginTop: 2
      }
    }, "Paid conversion 42% \xB7 target 35%")), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 14
      }
    }, "KPIs vs target"), [["Activation", "71%", "65%", true], ["Weekly retention", "78%", "70%", true], ["Paid conversion", "42%", "35%", true], ["Support load / family", "0.3", "0.5", true]].map(([k, v, t, ok], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 0",
        borderBottom: i < 3 ? "1px solid var(--color-border)" : "0"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 13,
        color: "var(--color-text-muted)"
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--color-text-strong)",
        width: 48,
        textAlign: "right"
      }
    }, v), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-subtle)",
        width: 70,
        textAlign: "right"
      }
    }, "target ", t), /*#__PURE__*/React.createElement(Ico, {
      n: "check",
      s: 15,
      style: {
        color: "var(--aminy-grow-600)"
      }
    })))))), tab === "engagement" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Mini, {
      label: "DAU / WAU",
      value: "0.52",
      caption: "sticky \xB7 target 0.40",
      tone: "up"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "Avg sessions / wk",
      value: "5.8",
      caption: "per active family"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "4-week retention",
      value: "68",
      unit: "%",
      caption: "+6 pts vs last cohort",
      tone: "up"
    })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 14
      }
    }, "Weekly active families"), /*#__PURE__*/React.createElement(Bars, {
      data: [{
        l: "W1",
        v: 40
      }, {
        l: "W2",
        v: 55
      }, {
        l: "W3",
        v: 62
      }, {
        l: "W4",
        v: 70
      }, {
        l: "W5",
        v: 78
      }, {
        l: "W6",
        v: 88
      }]
    })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 14
      }
    }, "Activation funnel"), [["Signed up", 100], ["Completed onboarding", 86], ["First AI conversation", 79], ["First plan generated", 64], ["Returned in week 2", 71]].map(([k, p], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        marginBottom: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 5,
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-strong)",
        fontWeight: 600
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)"
      }
    }, p, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 9,
        background: "var(--aminy-navy-50)",
        borderRadius: 5,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: p + "%",
        height: "100%",
        background: "var(--aminy-teal-500)",
        borderRadius: 5
      }
    })))))), tab === "ai" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Mini, {
      label: "Conversations",
      value: "4.2k",
      caption: "this month"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "Msgs / family / wk",
      value: "11",
      caption: "median"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "Satisfaction",
      value: "94",
      unit: "%",
      caption: "\uD83D\uDC4D of rated replies",
      tone: "up"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "Memory entries",
      value: "2.8k",
      caption: "facts remembered"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 14
      }
    }, "Top intents"), [["Behavior in the moment", 31], ["Routines & transitions", 24], ["Sleep & mealtime", 18], ["School / IEP", 15], ["Coverage & billing", 12]].map(([k, p], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        marginBottom: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 5,
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-strong)",
        fontWeight: 600
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)"
      }
    }, p, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 9,
        background: "var(--aminy-navy-50)",
        borderRadius: 5,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: p * 3 + "%",
        height: "100%",
        background: "var(--aminy-teal-500)",
        borderRadius: 5
      }
    }))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 10
      }
    }, "Safety & escalation"), [["Escalated to BCBA", "38"], ["Crisis resources shown", "6"], ["Flagged for review", "11"], ["Avg first-response", "instant"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "9px 0",
        borderBottom: i < 3 ? "1px solid var(--color-border)" : "0",
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)"
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, v)))))), tab === "clinical" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Mini, {
      label: "Goal attainment",
      value: "71",
      unit: "%",
      caption: "met or exceeded",
      tone: "up"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "Home practice done",
      value: "64",
      unit: "%",
      caption: "of assigned activities"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "Visit attendance",
      value: "94",
      unit: "%",
      caption: "kept appointments"
    })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 14
      }
    }, "Condition breakdown"), [["Autism (ASD)", 64], ["ADHD", 21], ["Speech / language", 9], ["Other", 6]].map(([k, p], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        marginBottom: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 5,
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-strong)",
        fontWeight: 600
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)"
      }
    }, p, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 9,
        background: "var(--aminy-navy-50)",
        borderRadius: 5,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: p + "%",
        height: "100%",
        background: "var(--aminy-teal-500)",
        borderRadius: 5
      }
    })))))), tab === "marketplace" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Mini, {
      label: "Bookings",
      value: "186",
      caption: "this month",
      tone: "up"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "GMV",
      value: "$48k",
      caption: "cash + insurance"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "Take rate",
      value: "12",
      unit: "%",
      caption: "platform fee"
    }), /*#__PURE__*/React.createElement(Mini, {
      label: "Active providers",
      value: "34",
      caption: "6 onboarding"
    })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 12
      }
    }, "Top providers"), [["Dr. Ana Morales", "BCBA-D", "28 sessions", "4.9★"], ["Dr. Sam Chen", "BCBA", "24 sessions", "4.8★"], ["Maria Garcia", "RBT", "19 sessions", "5.0★"]].map(([n, r, s, rt], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "11px 0",
        borderBottom: i < 2 ? "1px solid var(--color-border)" : "0"
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: n,
      tone: "teal",
      size: 34
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, n), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)"
      }
    }, r)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-muted)",
        width: 90
      }
    }, s), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: "var(--aminy-teal-700)"
      }
    }, rt))))));
  }
  const VIEWS = [["operator", "Operator", Operator], ["org", "Org admin", OrgAdmin], ["payer", "Payer outcomes", PayerOutcomes], ["apply", "Provider application", Application]];
  function App() {
    const [v, setV] = R.useState("operator");
    const Cur = VIEWS.find(x => x[0] === v)[2];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 999,
        padding: 5,
        boxShadow: "var(--shadow-sm)"
      }
    }, VIEWS.map(([id, lb]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => {
        haptic.light();
        setV(id);
      },
      style: {
        padding: "8px 18px",
        borderRadius: 999,
        border: 0,
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontSize: 13.5,
        fontWeight: 600,
        background: v === id ? "var(--aminy-teal-600)" : "transparent",
        color: v === id ? "#fff" : "var(--color-text-muted)"
      }
    }, lb))), /*#__PURE__*/React.createElement(Cur, {
      key: v
    }));
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/provider/extras.jsx", error: String((e && e.message) || e) }); }

// ui_kits/provider/payer.jsx
try { (() => {
/* AACT Payer Scorecard — ported from AACTPayerDashboard.tsx (sage → teal).
   Executive KPI scorecard payers evaluate in rate negotiations: Finance · Clinical · Operations.
   Each metric: value / target / R-Y-G status / editable. Summary bar + scorecard export.
   Merges into window.ProviderScreens.Payer (loaded after screens.jsx). */
(function () {
  const {
    Card
  } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || {
    light() {},
    medium() {},
    success() {}
  };
  const toast = window.aminyToast || function () {};
  const I = {
    dollar: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "1",
      x2: "12",
      y2: "23"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
    })),
    award: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "8",
      r: "6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"
    })),
    activity: /*#__PURE__*/React.createElement("path", {
      d: "M22 12h-4l-3 9L9 3l-3 9H2"
    }),
    edit: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"
    })),
    download: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M7 10l5 5 5-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 15V3"
    })),
    check: /*#__PURE__*/React.createElement("path", {
      d: "M20 6 9 17l-5-5"
    }),
    file: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 2v4a2 2 0 0 0 2 2h4"
    }))
  };
  const Ico = ({
    n,
    s = 16,
    style
  }) => /*#__PURE__*/React.createElement("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, I[n]);
  const FINANCE = [{
    id: "clean",
    label: "Clean Claim Rate",
    value: 96,
    target: 95,
    unit: "%",
    hib: true,
    note: "Below 90% is a contract-risk flag for MCOs.",
    pf: true
  }, {
    id: "denial",
    label: "Denial Rate",
    value: 4.2,
    target: 5,
    unit: "%",
    hib: false,
    note: "Tracked separately by payer.",
    pf: true
  }, {
    id: "dtp",
    label: "Days to Payment",
    value: 34,
    target: 30,
    unit: " days",
    hib: false,
    note: "Benchmark for negotiation leverage.",
    pf: true
  }, {
    id: "ar90",
    label: "AR Aging >90 Days",
    value: 8,
    target: 10,
    unit: "%",
    hib: false,
    pf: true
  }, {
    id: "tf",
    label: "Timely Filing Compliance",
    value: 100,
    target: 100,
    unit: "%",
    hib: true,
    note: "Payers are strict on this.",
    pf: true
  }, {
    id: "under",
    label: "Underpayment Rate",
    value: 2.1,
    target: 0,
    unit: "%",
    hib: false,
    note: "Received vs. contracted rate.",
    pf: true
  }, {
    id: "comm",
    label: "Commercial % of Revenue",
    value: 24,
    target: 30,
    unit: "%",
    hib: true,
    note: "Target >30% commercial mix.",
    pf: true
  }, {
    id: "rph",
    label: "Revenue per Billable Hour",
    value: 88,
    target: 85,
    unit: "$/hr",
    hib: true,
    pf: false
  }, {
    id: "conc",
    label: "Single-Payer Concentration",
    value: 52,
    target: 40,
    unit: "%",
    hib: false,
    note: "No single payer >40%.",
    pf: false
  }];
  const CLINICAL = [{
    id: "bhcoe-q",
    label: "BHCOE Staff Qualification",
    value: 92,
    target: 90,
    unit: "%",
    hib: true,
    note: "Top credential in every payer meeting.",
    pf: true
  }, {
    id: "bhcoe-sat",
    label: "BHCOE Family Satisfaction",
    value: 4.4,
    target: 4.2,
    unit: "/5.0",
    hib: true,
    pf: true
  }, {
    id: "bhcoe-sd",
    label: "BHCOE Service Delivery",
    value: 87,
    target: 85,
    unit: "%",
    hib: true,
    pf: true
  }, {
    id: "bhcoe-out",
    label: "BHCOE Clinical Outcomes",
    value: 71,
    target: 75,
    unit: "%",
    hib: true,
    note: "% meeting goals per cycle.",
    pf: true
  }, {
    id: "bcba-c",
    label: "BCBA Credential Compliance",
    value: 100,
    target: 100,
    unit: "%",
    hib: true,
    note: "100% BACB-licensed.",
    pf: true
  }, {
    id: "rbt-c",
    label: "RBT Registration Compliance",
    value: 100,
    target: 100,
    unit: "%",
    hib: true,
    pf: true
  }, {
    id: "goal",
    label: "Goal Attainment Rate",
    value: 78,
    target: 75,
    unit: "%",
    hib: true,
    note: "≥80% of plan goals per cycle.",
    pf: true
  }, {
    id: "behavior",
    label: "Problem Behavior Reduction",
    value: 64,
    target: 60,
    unit: "%",
    hib: true,
    note: "≥25% reduction in target freq.",
    pf: true
  }, {
    id: "nps",
    label: "Caregiver NPS",
    value: 58,
    target: 50,
    unit: " pts",
    hib: true,
    pf: true
  }, {
    id: "tx",
    label: "Tx Plan Update Compliance",
    value: 96,
    target: 100,
    unit: "%",
    hib: true,
    note: "MCOs audit this.",
    pf: true
  }, {
    id: "grad",
    label: "Client Graduation Rate",
    value: 28,
    target: 30,
    unit: "%",
    hib: true,
    note: "Planned discharges vs. attrition.",
    pf: true
  }, {
    id: "tele",
    label: "Telehealth Parent Training/mo",
    value: 3,
    target: 1,
    unit: "",
    hib: true,
    note: "Signals innovation to commercial payers.",
    pf: true
  }];
  const OPS = [{
    id: "util",
    label: "Authorization Utilization",
    value: 71,
    target: 65,
    unit: "%",
    hib: true,
    note: "<65% under-delivery · >98% over-utilization.",
    pf: true
  }, {
    id: "rta",
    label: "Days: Referral → 1st Appt",
    value: 12,
    target: 14,
    unit: " days",
    hib: false,
    note: "Under 14 days helps MCOs hit network adequacy.",
    pf: true
  }, {
    id: "caseload",
    label: "Active Client Caseload",
    value: 142,
    target: 100,
    unit: "",
    hib: true,
    note: "Validates network capacity.",
    pf: true
  }, {
    id: "rbthrs",
    label: "RBT Billable Hrs/Wk",
    value: 26,
    target: 25,
    unit: " hrs",
    hib: true,
    pf: false
  }, {
    id: "noshow",
    label: "No-Show / Cancellation",
    value: 9,
    target: 10,
    unit: "%",
    hib: false,
    note: "MCOs watch this closely.",
    pf: true
  }, {
    id: "openref",
    label: "Open Referrals >30d",
    value: 2,
    target: 0,
    unit: "",
    hib: false,
    note: "Target: zero.",
    pf: true
  }, {
    id: "prod",
    label: "Staff Productivity Ratio",
    value: 0.87,
    target: 0.85,
    unit: "",
    hib: true,
    note: "Billed hrs ÷ paid clinical hrs.",
    pf: false
  }, {
    id: "intake",
    label: "Intake Conversion Rate",
    value: 68,
    target: 70,
    unit: "%",
    hib: true,
    note: "Referrals → clients started.",
    pf: false
  }];
  const CATS = [{
    id: "finance",
    label: "Finance",
    icon: "dollar",
    metrics: FINANCE
  }, {
    id: "clinical",
    label: "Clinical Quality",
    icon: "award",
    metrics: CLINICAL
  }, {
    id: "operations",
    label: "Operations",
    icon: "activity",
    metrics: OPS
  }];
  function status(m) {
    if (m.value === null || m.value === undefined) return "info";
    const ratio = m.hib ? m.value / m.target : m.target / (m.value || 0.001);
    if (ratio >= 1) return "green";
    if (ratio >= 0.9) return "yellow";
    return "red";
  }
  const C = {
    green: {
      bd: "var(--aminy-grow-200)",
      bg: "var(--aminy-grow-50)",
      fg: "var(--aminy-grow-700)",
      dot: "var(--aminy-grow-500)"
    },
    yellow: {
      bd: "var(--aminy-win-200)",
      bg: "var(--aminy-win-50)",
      fg: "var(--aminy-win-700)",
      dot: "var(--aminy-win-500)"
    },
    red: {
      bd: "#f0c4bc",
      bg: "#fbeeeb",
      fg: "#b3402c",
      dot: "#d9583f"
    },
    info: {
      bd: "var(--color-border)",
      bg: "#fff",
      fg: "var(--color-text-subtle)",
      dot: "var(--color-text-subtle)"
    }
  };
  function fmt(m) {
    if (m.value === null || m.value === undefined) return "—";
    if (m.unit === "/5.0") return m.value.toFixed(1);
    if (m.id === "prod") return m.value.toFixed(2);
    if (m.unit === "$/hr") return "$" + m.value;
    return m.value % 1 === 0 ? String(m.value) : m.value.toFixed(1);
  }
  function KPICard({
    m,
    onEdit
  }) {
    const st = status(m),
      c = C[st];
    const [editing, setEditing] = R.useState(false);
    const [draft, setDraft] = R.useState(String(m.value ?? ""));
    function save() {
      const n = parseFloat(draft);
      if (!isNaN(n)) {
        onEdit(m.id, n);
        haptic.success();
      }
      setEditing(false);
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 14,
        borderRadius: 13,
        border: "1px solid " + c.bd,
        background: c.bg
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 999,
        background: c.dot,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: 600,
        color: "var(--color-text)",
        lineHeight: 1.2
      }
    }, m.label), m.pf && /*#__PURE__*/React.createElement("span", {
      title: "Payer-facing",
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: "var(--aminy-teal-700)",
        background: "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-200)",
        padding: "1px 5px",
        borderRadius: 999,
        flexShrink: 0
      }
    }, "PF")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 4,
        marginTop: 3
      }
    }, editing ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("input", {
      autoFocus: true,
      type: "number",
      value: draft,
      onChange: e => setDraft(e.target.value),
      onKeyDown: e => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") setEditing(false);
      },
      style: {
        width: 64,
        border: "1px solid var(--aminy-teal-500)",
        borderRadius: 7,
        padding: "3px 6px",
        fontSize: 15,
        fontWeight: 700,
        fontFamily: "var(--font-ui)",
        outline: "none"
      }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: save,
      "aria-label": "Save",
      style: {
        border: 0,
        background: "var(--aminy-teal-600)",
        color: "#fff",
        borderRadius: 7,
        width: 26,
        height: 26,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "check",
      s: 13
    }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 22,
        fontWeight: 800,
        color: c.fg,
        letterSpacing: "-0.02em"
      }
    }, fmt(m)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-muted)",
        fontWeight: 600
      }
    }, m.unit))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "Target ", m.hib ? "≥" : "≤", m.target, m.unit === "/5.0" ? "/5.0" : m.unit === "$/hr" ? "$/hr" : m.unit)), !editing && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setDraft(String(m.value ?? ""));
        setEditing(true);
        haptic.light();
      },
      "aria-label": "Edit " + m.label,
      style: {
        flexShrink: 0,
        border: 0,
        background: "transparent",
        color: "var(--color-text-subtle)",
        cursor: "pointer",
        padding: 2
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "edit",
      s: 14
    }))), m.note && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontStyle: "italic",
        color: "var(--color-text-subtle)",
        borderTop: "1px solid " + c.bd,
        marginTop: 9,
        paddingTop: 8,
        lineHeight: 1.4
      }
    }, m.note));
  }
  function SummaryBar({
    cats
  }) {
    const all = cats.flatMap(c => c.metrics);
    const g = all.filter(m => status(m) === "green").length;
    const y = all.filter(m => status(m) === "yellow").length;
    const r = all.filter(m => status(m) === "red").length;
    const total = all.length;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 18,
        borderRadius: 14,
        background: "linear-gradient(120deg,var(--aminy-navy-800),var(--aminy-navy-700) 60%,var(--aminy-teal-800))",
        color: "#fff"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        letterSpacing: ".12em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.55)"
      }
    }, "AACT Payer Scorecard"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 19,
        fontWeight: 800,
        marginTop: 3
      }
    }, total, " metrics tracked")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 22
      }
    }, [["On target", g, "var(--aminy-grow-300)"], ["At risk", y, "var(--aminy-win-300)"], ["Off target", r, "#f0a594"]].map(([l, v, col]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 800,
        color: col
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "rgba(255,255,255,0.6)"
      }
    }, l))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        height: 8,
        borderRadius: 999,
        overflow: "hidden",
        gap: 2,
        marginTop: 14
      }
    }, g > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        flex: g,
        background: "var(--aminy-grow-400)"
      }
    }), y > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        flex: y,
        background: "var(--aminy-win-400)"
      }
    }), r > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        flex: r,
        background: "#e07a63"
      }
    })));
  }
  function Payer() {
    const [tab, setTab] = R.useState("finance");
    const [cats, setCats] = R.useState(() => {
      try {
        const v = JSON.parse(localStorage.getItem("aminy-payer-kpis") || "{}");
        return CATS.map(c => ({
          ...c,
          metrics: c.metrics.map(m => v[m.id] !== undefined ? {
            ...m,
            value: v[m.id]
          } : m)
        }));
      } catch (e) {
        return CATS;
      }
    });
    function edit(id, value) {
      setCats(prev => {
        const next = prev.map(c => ({
          ...c,
          metrics: c.metrics.map(m => m.id === id ? {
            ...m,
            value
          } : m)
        }));
        const v = {};
        next.forEach(c => c.metrics.forEach(m => {
          if (m.value != null) v[m.id] = m.value;
        }));
        localStorage.setItem("aminy-payer-kpis", JSON.stringify(v));
        return next;
      });
    }
    const active = cats.find(c => c.id === tab);
    const BADGES = [{
      label: "BHCOE Accreditation",
      sub: "Renews Mar 2027",
      c: C.green
    }, {
      label: "CASP Membership",
      sub: "Active",
      c: {
        bd: "var(--aminy-teal-200)",
        bg: "var(--aminy-teal-50)",
        fg: "var(--aminy-teal-700)"
      }
    }, {
      label: "AACT AZ Contracts",
      sub: "AHCCCS + 9 commercial",
      c: C.green
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h3"
    }, "Payer scorecard ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--aminy-teal-700)",
        background: "var(--aminy-teal-50)",
        border: "1px solid var(--aminy-teal-200)",
        padding: "2px 9px",
        borderRadius: 999,
        verticalAlign: "middle",
        marginLeft: 6
      }
    }, "Arizona")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "The metrics MCOs and commercial payers evaluate in rate negotiations & network audits.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.light();
        toast("KPIs saved", "Snapshot stored for this period");
      },
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "9px 14px",
        borderRadius: 10,
        border: "1px solid var(--color-border-strong)",
        background: "#fff",
        color: "var(--color-text)",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "check",
      s: 15
    }), "Save"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.success();
        toast("Scorecard exported", "Payer-facing summary ready for rate letters");
      },
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "9px 14px",
        borderRadius: 10,
        border: 0,
        background: "var(--aminy-teal-600)",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "var(--shadow-cta)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "download",
      s: 15
    }), "Export scorecard"))), /*#__PURE__*/React.createElement(SummaryBar, {
      cats: cats
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12
      }
    }, BADGES.map(b => /*#__PURE__*/React.createElement("div", {
      key: b.label,
      style: {
        flex: 1,
        padding: "11px 14px",
        borderRadius: 12,
        border: "1px solid " + b.c.bd,
        background: b.c.bg
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: b.c.fg
      }
    }, b.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)",
        marginTop: 1
      }
    }, b.sub)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        background: "#fff",
        borderRadius: 13,
        padding: 5,
        border: "1px solid var(--color-border)"
      }
    }, cats.map(c => {
      const off = c.metrics.filter(m => status(m) === "red").length;
      return /*#__PURE__*/React.createElement("button", {
        key: c.id,
        onClick: () => {
          haptic.light();
          setTab(c.id);
        },
        style: {
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "10px 0",
          borderRadius: 9,
          border: 0,
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          fontWeight: 700,
          background: tab === c.id ? "var(--aminy-navy-800)" : "transparent",
          color: tab === c.id ? "#fff" : "var(--color-text-muted)"
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        n: c.icon,
        s: 16
      }), c.label, off > 0 && /*#__PURE__*/React.createElement("span", {
        style: {
          width: 18,
          height: 18,
          fontSize: 11,
          fontWeight: 700,
          background: "#d9583f",
          color: "#fff",
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, off));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, active.label, " \u2014 ", active.metrics.length, " metrics"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11.5,
        color: "var(--color-text-subtle)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "edit",
      s: 12
    }), "Tap pencil to enter values")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 12
      }
    }, active.metrics.map(m => /*#__PURE__*/React.createElement(KPICard, {
      key: m.id,
      m: m,
      onEdit: edit
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: 16,
        borderRadius: 12,
        background: "#fff",
        border: "1px solid var(--color-border)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "file",
      s: 17,
      style: {
        color: "var(--aminy-teal-600)",
        marginTop: 1,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, "Payer scorecard export"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-muted)",
        marginTop: 2,
        lineHeight: 1.5
      }
    }, "Export generates a payer-facing summary of all ", /*#__PURE__*/React.createElement("strong", null, "PF"), "-flagged metrics for rate letters, MCO renegotiations, and AHCCCS contract renewals \u2014 the subset payers actively evaluate."))));
  }
  window.ProviderScreens = window.ProviderScreens || {};
  window.ProviderScreens.Payer = Payer;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/provider/payer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/provider/screens.jsx
try { (() => {
/* Provider OS — deeper surfaces: Clients roster, EVV (clock/records/budget),
   RBT Supervision. Ported from EVVDashboard.tsx + supervision/roster structures.
   Rebuilt in the Aminy system (mist + teal). Attaches window.ProviderScreens. */
(function () {
  const R = React;
  const {
    Button,
    Badge,
    Card,
    Stat,
    Avatar
  } = window.AminyKit;
  const haptic = window.aminyHaptic || {
    light() {},
    medium() {},
    success() {}
  };
  const I = {
    timer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M10 2h4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 14v-4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "14",
      r: "8"
    })),
    pin: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "10",
      r: "3"
    })),
    play: /*#__PURE__*/React.createElement("path", {
      d: "M6 4v16l14-8z",
      fill: "currentColor",
      stroke: "none"
    }),
    stop: /*#__PURE__*/React.createElement("rect", {
      x: "6",
      y: "6",
      width: "12",
      height: "12",
      rx: "2",
      fill: "currentColor",
      stroke: "none"
    }),
    check: /*#__PURE__*/React.createElement("path", {
      d: "M20 6 9 17l-5-5"
    }),
    search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m21 21-4.3-4.3"
    })),
    chevron: /*#__PURE__*/React.createElement("path", {
      d: "m9 18 6-6-6-6"
    }),
    alert: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 9v4M12 17h.01"
    })),
    download: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M7 10l5 5 5-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 15V3"
    })),
    inbox: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M22 12h-6l-2 3h-4l-2-3H2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
    })),
    video: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m22 8-6 4 6 4V8Z"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "2",
      y: "6",
      width: "14",
      height: "12",
      rx: "2"
    })),
    calendar: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "18",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 2v4M8 2v4M3 10h18"
    })),
    plus: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M5 12h14"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 5v14"
    })),
    send: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m22 2-7 20-4-9-9-4z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M22 2 11 13"
    })),
    msg: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z"
    })),
    sparkles: /*#__PURE__*/React.createElement("path", {
      d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
    }),
    shield: /*#__PURE__*/React.createElement("path", {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }),
    notes: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 2v4a2 2 0 0 0 2 2h4"
    }))
  };
  const Ico = ({
    n,
    s = 18,
    w = 2,
    style
  }) => /*#__PURE__*/React.createElement("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: w,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, I[n]);

  // ============ CLIENTS ROSTER ============
  const CLIENTS = [{
    name: "Kai R.",
    age: 7,
    code: "97153",
    tone: "grow",
    status: "Active",
    hrs: "25/wk",
    auth: "284 units left",
    next: "Today 9:00",
    focus: "Morning transitions"
  }, {
    name: "Mia T.",
    age: 5,
    code: "97155",
    tone: "grow",
    status: "Active",
    hrs: "20/wk",
    auth: "192 units left",
    next: "Today 11:30",
    focus: "Communication"
  }, {
    name: "Liam O.",
    age: 9,
    code: "97151",
    tone: "win",
    status: "Assessment",
    hrs: "—",
    auth: "Pending auth",
    next: "Thu 2:00",
    focus: "Intake eval"
  }, {
    name: "Ava P.",
    age: 6,
    code: "97153",
    tone: "grow",
    status: "Active",
    hrs: "18/wk",
    auth: "96 units left",
    next: "Fri 10:00",
    focus: "Self-care"
  }, {
    name: "Noah K.",
    age: 8,
    code: "97156",
    tone: "care",
    status: "Parent training",
    hrs: "4/wk",
    auth: "48 units left",
    next: "Mon 3:30",
    focus: "Generalization"
  }];
  function Clients() {
    const [q, setQ] = R.useState("");
    const rows = CLIENTS.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h3"
    }, "Your caseload"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "5 active \xB7 a healthy load is 6\u20138. You have room for 2 more.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 38,
        padding: "0 14px",
        background: "#fff",
        border: "1px solid var(--color-border-strong)",
        borderRadius: 999,
        color: "var(--color-text-muted)",
        width: 220
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "search",
      s: 15
    }), /*#__PURE__*/React.createElement("input", {
      value: q,
      onChange: e => setQ(e.target.value),
      placeholder: "Search clients\u2026",
      style: {
        border: 0,
        outline: 0,
        background: "transparent",
        fontSize: 13,
        fontFamily: "var(--font-ui)",
        color: "var(--color-text)",
        width: "100%"
      }
    }))), /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1.4fr 0.8fr 1fr 1.1fr 1fr 0.6fr",
        gap: 12,
        padding: "12px 18px",
        borderBottom: "1px solid var(--color-border)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)"
      }
    }, /*#__PURE__*/React.createElement("span", null, "Client"), /*#__PURE__*/React.createElement("span", null, "CPT"), /*#__PURE__*/React.createElement("span", null, "Status"), /*#__PURE__*/React.createElement("span", null, "Authorization"), /*#__PURE__*/React.createElement("span", null, "Next visit"), /*#__PURE__*/React.createElement("span", null)), rows.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => haptic.light(),
      style: {
        display: "grid",
        gridTemplateColumns: "1.4fr 0.8fr 1fr 1.1fr 1fr 0.6fr",
        gap: 12,
        padding: "13px 18px",
        borderBottom: i < rows.length - 1 ? "1px solid var(--color-border)" : "0",
        alignItems: "center",
        fontSize: 13,
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: c.name,
      tone: c.tone === "care" ? "care" : "teal",
      size: 34
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, c.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-muted)"
      }
    }, c.age, " yrs \xB7 ", c.focus))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 12
      }
    }, c.code), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Badge, {
      tone: c.tone
    }, c.status)), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)",
        fontSize: 12
      }
    }, c.auth), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text)",
        fontSize: 12,
        fontWeight: 600
      }
    }, c.next), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: "right",
        color: "var(--color-text-subtle)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "chevron",
      s: 16
    }))))));
  }

  // ============ EVV (clock / records / budget) ============
  const AUTHS = [{
    id: "a1",
    name: "ABA Skills Training",
    code: "H2014",
    num: "AZ-2024-78543",
    used: 196,
    total: 480
  }, {
    id: "a2",
    name: "Adaptive Behavior Tx",
    code: "97153",
    num: "AZ-2024-78544",
    used: 128,
    total: 320
  }];
  const RECORDS = [{
    who: "Maria Garcia, RBT",
    date: "Feb 24",
    in: "9:00 AM",
    out: "12:15 PM",
    dur: "3h 15m",
    units: 13,
    code: "H2014",
    status: "verified",
    loc: "1234 Elm St, Phoenix"
  }, {
    who: "Maria Garcia, RBT",
    date: "Feb 22",
    in: "1:30 PM",
    out: "4:00 PM",
    dur: "2h 30m",
    units: 10,
    code: "H2014",
    status: "verified",
    loc: "1234 Elm St, Phoenix"
  }, {
    who: "Dr. Sarah Chen, BCBA",
    date: "Feb 21",
    in: "10:00 AM",
    out: "11:00 AM",
    dur: "1h 0m",
    units: 4,
    code: "97153",
    status: "submitted",
    loc: "Aminy Clinic, Phoenix"
  }, {
    who: "Maria Garcia, RBT",
    date: "Feb 20",
    in: "9:00 AM",
    out: "11:30 AM",
    dur: "2h 30m",
    units: 10,
    code: "H2014",
    status: "pending",
    loc: "Location mismatch"
  }];
  const RSTATUS = {
    verified: "grow",
    submitted: "care",
    pending: "win",
    rejected: "navy"
  };
  function EVV() {
    const [tab, setTab] = R.useState("clock");
    const [running, setRunning] = R.useState(false);
    const [secs, setSecs] = R.useState(0);
    const [auth, setAuth] = R.useState("a1");
    R.useEffect(() => {
      if (!running) return;
      const id = setInterval(() => setSecs(s => s + 1), 1000);
      return () => clearInterval(id);
    }, [running]);
    const fmt = s => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    const TABS = [["clock", "Clock In/Out"], ["records", "Records"], ["budget", "Budget"]];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h3",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, "Visit verification"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "Arizona DDD pilot \xB7 GPS-verified shadow EVV \xB7 clock, reconcile, export.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 9,
        background: "var(--aminy-win-50)",
        border: "1px solid var(--aminy-win-100)",
        borderRadius: 12,
        padding: "10px 14px"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "alert",
      s: 16,
      style: {
        color: "var(--aminy-win-600)",
        flexShrink: 0,
        marginTop: 1
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--aminy-win-600)",
        lineHeight: 1.5
      }
    }, "Shadow mode \u2014 confirm payroll-critical submissions in your primary EVV system until the pilot is validated.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: 4,
        width: "fit-content"
      }
    }, TABS.map(([id, lb]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => {
        haptic.light();
        setTab(id);
      },
      style: {
        padding: "8px 16px",
        borderRadius: 9,
        border: 0,
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 600,
        background: tab === id ? "var(--aminy-teal-600)" : "transparent",
        color: tab === id ? "#fff" : "var(--color-text-muted)"
      }
    }, lb))), tab === "clock" && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 12
      }
    }, "Service authorization"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, AUTHS.map(a => {
      const on = auth === a.id;
      return /*#__PURE__*/React.createElement("button", {
        key: a.id,
        onClick: () => {
          haptic.light();
          setAuth(a.id);
        },
        style: {
          textAlign: "left",
          padding: 12,
          borderRadius: 12,
          cursor: "pointer",
          border: `2px solid ${on ? "var(--aminy-teal-600)" : "var(--color-border)"}`,
          background: on ? "var(--aminy-teal-50)" : "#fff"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between"
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          fontWeight: 600,
          color: "var(--color-text-strong)"
        }
      }, a.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "var(--color-text-muted)",
          marginTop: 2
        }
      }, a.code, " \xB7 Auth #", a.num)), /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: "right"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          fontWeight: 700,
          color: "var(--aminy-teal-700)"
        }
      }, a.total - a.used), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: "var(--color-text-subtle)"
        }
      }, "of ", a.total))));
    }))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "8px 0"
      }
    }, running ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-muted)",
        textTransform: "uppercase",
        letterSpacing: ".08em",
        marginBottom: 6
      }
    }, "Session in progress"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 42,
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
        color: "var(--color-text-strong)",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.02em"
      }
    }, fmt(secs)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        margin: "6px 0 16px",
        display: "inline-flex",
        alignItems: "center",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "pin",
      s: 13
    }), " GPS verified \xB7 ", Math.ceil(secs / 900), " units"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.success();
        setRunning(false);
        setSecs(0);
      },
      style: {
        width: "100%",
        height: 52,
        borderRadius: 14,
        border: 0,
        cursor: "pointer",
        background: "var(--aminy-alert-600)",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "stop",
      s: 18
    }), " Clock Out")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 72,
        height: 72,
        margin: "4px auto 14px",
        borderRadius: "50%",
        background: "var(--aminy-teal-50)",
        color: "var(--aminy-teal-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "timer",
      s: 32
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginBottom: 16,
        lineHeight: 1.5
      }
    }, "Pick an authorization, then clock in to start tracking this visit."), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.success();
        setRunning(true);
      },
      style: {
        width: "100%",
        height: 52,
        borderRadius: 14,
        border: 0,
        cursor: "pointer",
        background: "var(--aminy-teal-600)",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        boxShadow: "var(--shadow-cta)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "play",
      s: 18
    }), " Clock In"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-subtle)",
        marginTop: 10,
        display: "inline-flex",
        alignItems: "center",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "pin",
      s: 12
    }), " GPS location recorded for EVV compliance"))))), tab === "records" && /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, RECORDS.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: "14px 18px",
        borderBottom: i < RECORDS.length - 1 ? "1px solid var(--color-border)" : "0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, r.who), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-muted)"
      }
    }, r.date)), /*#__PURE__*/React.createElement(Badge, {
      tone: RSTATUS[r.status]
    }, r.status)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: 12,
        fontSize: 12
      }
    }, [["In", r.in], ["Out", r.out], ["Duration", r.dur], ["Units", `${r.units} · ${r.code}`]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
      key: k
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--color-text-subtle)"
      }
    }, k), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        color: "var(--color-text)"
      }
    }, v)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        marginTop: 8,
        fontSize: 11,
        color: r.status === "pending" ? "var(--aminy-win-600)" : "var(--color-text-muted)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "pin",
      s: 12
    }), " ", r.loc)))), tab === "budget" && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, AUTHS.map(a => {
      const pct = Math.round(a.used / a.total * 100);
      const col = pct > 90 ? "var(--aminy-alert-600)" : pct > 70 ? "var(--aminy-win-500)" : "var(--aminy-teal-600)";
      return /*#__PURE__*/React.createElement(Card, {
        key: a.id
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 600,
          color: "var(--color-text-strong)"
        }
      }, a.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "var(--color-text-muted)"
        }
      }, "Auth #", a.num)), /*#__PURE__*/React.createElement(Badge, {
        tone: pct > 90 ? "win" : "grow"
      }, pct > 90 ? "Review usage" : "On track")), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--color-text-muted)",
          marginBottom: 5
        }
      }, /*#__PURE__*/React.createElement("span", null, a.used, " used"), /*#__PURE__*/React.createElement("span", null, a.total - a.used, " remaining")), /*#__PURE__*/React.createElement("div", {
        style: {
          height: 10,
          background: "var(--aminy-navy-50)",
          borderRadius: 5,
          overflow: "hidden"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: pct + "%",
          height: "100%",
          background: col,
          borderRadius: 5
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid var(--color-border)",
          textAlign: "center"
        }
      }, [["Days left", "68"], ["Units/wk", "32"], ["Projected end", "Apr 12"]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
        key: k
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 18,
          fontWeight: 700,
          color: "var(--color-text-strong)"
        }
      }, v), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "var(--color-text-subtle)"
        }
      }, k)))));
    })));
  }

  // ============ RBT SUPERVISION ============
  const RBTS = [{
    name: "Maria Garcia",
    role: "RBT",
    clients: 4,
    supHrs: 4.2,
    reqHrs: 5,
    pct: 84,
    next: "Fri 1:00",
    tone: "win"
  }, {
    name: "Jordan Lee",
    role: "RBT",
    clients: 3,
    supHrs: 5.1,
    reqHrs: 5,
    pct: 102,
    next: "Done this month",
    tone: "grow"
  }, {
    name: "Priya Shah",
    role: "RBT-T",
    clients: 2,
    supHrs: 2.0,
    reqHrs: 5,
    pct: 40,
    next: "Tue 10:00",
    tone: "care"
  }];
  function Supervision() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h3"
    }, "RBT supervision"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "BACB requires \u22655% of each RBT's monthly hours under your supervision. Aminy tracks it automatically.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "RBTs supervised",
      value: "3",
      caption: "2 on track \xB7 1 behind"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Supervision logged",
      value: "11.3",
      unit: "hrs",
      caption: "This month",
      accent: true
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Due this week",
      value: "2",
      unit: "sessions",
      caption: "Maria, Priya"
    })), /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "14px 18px",
        borderBottom: "1px solid var(--color-border)",
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "Your supervisees"), RBTS.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: "14px 18px",
        borderBottom: i < RBTS.length - 1 ? "1px solid var(--color-border)" : "0",
        display: "flex",
        alignItems: "center",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: r.name,
      tone: "teal",
      size: 40
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, r.name), /*#__PURE__*/React.createElement(Badge, {
      tone: "navy"
    }, r.role)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, r.clients, " clients \xB7 next: ", r.next)), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 160
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 11,
        color: "var(--color-text-muted)",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", null, r.supHrs, "/", r.reqHrs, " hrs"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: r.pct >= 100 ? "var(--aminy-grow-600)" : r.pct >= 80 ? "var(--aminy-win-600)" : "var(--aminy-care-600)"
      }
    }, r.pct, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 7,
        background: "var(--aminy-navy-50)",
        borderRadius: 4,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.min(100, r.pct) + "%",
        height: "100%",
        borderRadius: 4,
        background: r.pct >= 100 ? "var(--aminy-grow-500)" : r.pct >= 80 ? "var(--aminy-win-500)" : "var(--aminy-care-600)"
      }
    }))), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      onClick: () => haptic.light()
    }, "Log session")))));
  }

  // ============ REVIEW INBOX (sign-off queue) ============
  const QUEUE = [{
    id: "q1",
    kind: "Family question",
    who: "Sarah (Kai's mom)",
    topic: "Feeding",
    when: "2h ago",
    q: "Kai bolts from the dinner table after two bites every night. How do we build tolerance without making meals a battle?",
    ai: "Start with \"first two bites, then a break\" — let him leave, then return. Keep portions tiny and predictable. Build sitting time by 30 seconds a week. Pair the table with a regulating fidget he only gets at meals. We're shaping duration, not intake.",
    sum: "Mealtime escape behavior — wants tolerance-building without conflict."
  }, {
    id: "q2",
    kind: "Session note",
    who: "Kai R. · 97153",
    topic: "SOAP",
    when: "Today 12:15",
    q: "90-min NET session. 14 independent mands (↑ from 9), 2 brief transition protests recovered <60s.",
    ai: "S: Caregiver reports smoother mornings. O: 14 independent mands, prompt-fading criteria met for tooth-brushing. A: On trajectory for Goal 1. P: Continue NET 25h/wk; introduce delayed reinforcement.",
    sum: "Strong manding gains; ready to sign + bill 6 units."
  }, {
    id: "q3",
    kind: "Family question",
    who: "Alex (Kai's dad)",
    topic: "Sleep",
    when: "Yesterday",
    q: "Bedtime is taking 90 minutes. Is that normal and what can we try?",
    ai: "A 30-minute \"bedtime runway\" with dimmed lights, screens off, and the same 3 steps in order helps. Kai's nervous system needs predictability to wind down. One consistent night already helps.",
    sum: "Bedtime latency ~90min — wants a wind-down routine."
  }];
  function Review() {
    const [items, setItems] = R.useState(QUEUE);
    const [active, setActive] = R.useState(null);
    const [draft, setDraft] = R.useState("");
    const open = items.find(x => x.id === active);
    function openItem(it) {
      haptic.light();
      setActive(it.id);
      setDraft(it.ai);
    }
    function sign() {
      haptic.success();
      setItems(a => a.filter(x => x.id !== active));
      setActive(null);
      window.aminyToast && window.aminyToast("Signed & sent to the family ✓");
    }
    if (open) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          padding: 28,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 760
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setActive(null),
        style: {
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: 0,
          cursor: "pointer",
          color: "var(--aminy-teal-700)",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          fontWeight: 600
        }
      }, "\u2190 Back to queue"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(Badge, {
        tone: open.kind === "Session note" ? "care" : "teal"
      }, open.kind), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          color: "var(--color-text-muted)"
        }
      }, open.who, " \xB7 ", open.when)), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          marginBottom: 6
        }
      }, open.kind === "Session note" ? "Session data" : "Their question"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          color: "var(--color-text-strong)",
          lineHeight: 1.55
        }
      }, open.q)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        n: "sparkles",
        s: 15,
        style: {
          color: "var(--aminy-teal-700)"
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--aminy-teal-700)"
        }
      }, "Aminy draft \u2014 edit, then sign")), /*#__PURE__*/React.createElement("textarea", {
        value: draft,
        onChange: e => setDraft(e.target.value),
        rows: 7,
        style: {
          width: "100%",
          boxSizing: "border-box",
          fontSize: 14,
          fontFamily: "var(--font-ui)",
          color: "var(--color-text)",
          border: "1px solid var(--aminy-teal-200)",
          borderRadius: 14,
          padding: "14px 16px",
          resize: "none",
          outline: "none",
          lineHeight: 1.6,
          background: "var(--aminy-teal-50)"
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 10,
          alignItems: "center"
        }
      }, /*#__PURE__*/React.createElement(Button, {
        variant: "primary",
        icon: /*#__PURE__*/React.createElement(Ico, {
          n: "shield",
          s: 16
        }),
        onClick: sign
      }, "Sign & send"), /*#__PURE__*/React.createElement(Button, {
        variant: "ghost",
        onClick: () => setDraft(open.ai)
      }, "Reset to draft"), /*#__PURE__*/React.createElement("span", {
        style: {
          marginLeft: "auto",
          fontSize: 11,
          color: "var(--color-text-subtle)"
        }
      }, "Your signature attests clinical accuracy \xB7 retained 7 yrs (BACB 4.05)")));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h3"
    }, "Needs your sign-off"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "Aminy drafts every family answer and session note. You review, edit, and sign \u2014 nothing reaches a family unsigned.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Awaiting you",
      value: items.length,
      caption: "Questions + notes",
      accent: true
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Avg review time",
      value: "2",
      unit: "min",
      caption: "With AI drafts"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Signed this week",
      value: "18",
      caption: "On time"
    })), /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, items.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 40,
        textAlign: "center",
        color: "var(--color-text-muted)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "check",
      s: 28,
      style: {
        color: "var(--aminy-grow-500)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, "All caught up"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13
      }
    }, "Nothing waiting on your signature.")) : items.map((it, i) => /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => openItem(it),
      style: {
        width: "100%",
        textAlign: "left",
        display: "flex",
        gap: 14,
        padding: "16px 18px",
        borderBottom: i < items.length - 1 ? "1px solid var(--color-border)" : "0",
        background: "none",
        border: 0,
        borderBottomWidth: i < items.length - 1 ? 1 : 0,
        borderBottomStyle: "solid",
        borderBottomColor: "var(--color-border)",
        cursor: "pointer",
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 10,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: it.kind === "Session note" ? "var(--aminy-care-50)" : "var(--aminy-teal-50)",
        color: it.kind === "Session note" ? "var(--aminy-care-600)" : "var(--aminy-teal-700)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: it.kind === "Session note" ? "notes" : "inbox",
      s: 18
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: it.kind === "Session note" ? "care" : "teal"
    }, it.kind), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)"
      }
    }, it.who, " \xB7 ", it.when)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: "var(--color-text-strong)",
        lineHeight: 1.4,
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "sparkles",
      s: 13,
      style: {
        color: "var(--aminy-teal-600)",
        flexShrink: 0
      }
    }), " ", it.sum)), /*#__PURE__*/React.createElement(Ico, {
      n: "chevron",
      s: 16,
      style: {
        color: "var(--color-text-subtle)",
        marginTop: 8,
        flexShrink: 0
      }
    })))));
  }

  // ============ SCHEDULE (joinable visits + add-to-calendar) ============
  const TODAY_VISITS = [{
    time: "9:00",
    end: "11:00",
    client: "Kai R.",
    code: "97153",
    kind: "Direct · NET",
    joinable: true,
    soon: true
  }, {
    time: "11:30",
    end: "12:30",
    client: "Mia T.",
    code: "97155",
    kind: "Supervision",
    joinable: true,
    soon: false
  }, {
    time: "2:00",
    end: "2:45",
    client: "The Okafors",
    code: "97156",
    kind: "Parent training",
    joinable: true,
    soon: false
  }, {
    time: "3:30",
    end: "4:00",
    client: "Sign-off block",
    code: "—",
    kind: "Note review",
    joinable: false,
    soon: false
  }];
  function calLinks(v) {
    // Build real calendar URLs (Google explicit; Apple/Outlook via .ics download in production)
    const title = encodeURIComponent(`Aminy: ${v.client} (${v.code})`);
    return {
      google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${encodeURIComponent(v.kind)}`,
      outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${encodeURIComponent(v.kind)}`
    };
  }
  function Schedule() {
    const [joining, setJoining] = R.useState(null);
    const [calFor, setCalFor] = R.useState(null);
    if (joining) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          padding: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#0C1620",
          minHeight: 600
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          color: "#fff"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: "linear-gradient(135deg,var(--aminy-teal-500),var(--aminy-teal-700))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 34,
          fontFamily: "var(--font-ui)",
          animation: "aminy-breathe 4s var(--ease-breath) infinite"
        }
      }, joining.client.split(" ").map(w => w[0]).join("").slice(0, 2)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "var(--font-ui)",
          letterSpacing: "-0.02em"
        }
      }, "Telehealth \xB7 ", joining.client), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          color: "#8FA3B2"
        }
      }, "Secure room \xB7 ", joining.code, " \xB7 ", joining.kind), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 12,
          marginTop: 8
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          haptic.medium();
          setJoining(null);
        },
        style: {
          height: 48,
          padding: "0 22px",
          borderRadius: 14,
          border: "1px solid #2C4253",
          background: "transparent",
          color: "#D6E2EA",
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer"
        }
      }, "Leave"), /*#__PURE__*/React.createElement("button", {
        style: {
          height: 48,
          padding: "0 22px",
          borderRadius: 14,
          border: 0,
          background: "var(--aminy-teal-600)",
          color: "#fff",
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        n: "video",
        s: 18
      }), " In session")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#5E7488",
          marginTop: 4
        }
      }, "Powered by a HIPAA-conscious video room")));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h3"
    }, "Today \xB7 ", new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "4 visits \xB7 join directly, no separate link to hunt for.")), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      icon: /*#__PURE__*/React.createElement(Ico, {
        n: "plus",
        s: 15
      }),
      onClick: () => {
        haptic.light();
        window.aminyToast && window.aminyToast("New visit — pick a client & time");
      }
    }, "Add visit")), /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, TODAY_VISITS.map((v, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 18px",
        borderBottom: i < TODAY_VISITS.length - 1 ? "1px solid var(--color-border)" : "0",
        background: v.soon ? "var(--aminy-teal-50)" : "transparent"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 58,
        flexShrink: 0,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, v.time), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--color-text-subtle)"
      }
    }, v.end)), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 1,
        alignSelf: "stretch",
        background: "var(--color-border)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, v.client), v.soon && /*#__PURE__*/React.createElement(Badge, {
      tone: "teal"
    }, "Starts soon")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, v.kind, v.code !== "—" ? ` · ${v.code}` : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, v.joinable && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.light();
        setCalFor(calFor === i ? null : i);
      },
      "aria-label": "Add to calendar",
      style: {
        width: 40,
        height: 40,
        borderRadius: 11,
        border: "1px solid var(--color-border-strong)",
        background: "#fff",
        color: "var(--color-text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "calendar",
      s: 17
    })), v.joinable ? /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        haptic.success();
        setJoining(v);
      },
      style: {
        height: 40,
        padding: "0 16px",
        borderRadius: 11,
        border: 0,
        background: v.soon ? "var(--aminy-teal-600)" : "#fff",
        color: v.soon ? "#fff" : "var(--aminy-teal-700)",
        boxShadow: v.soon ? "var(--shadow-cta)" : "inset 0 0 0 1px var(--aminy-teal-200)",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 13.5,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "video",
      s: 16
    }), " Join") : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--color-text-subtle)",
        paddingRight: 6
      }
    }, "\u2014"), calFor === i && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 46,
        right: 0,
        zIndex: 5,
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        boxShadow: "var(--shadow-lg)",
        padding: 6,
        width: 168
      }
    }, [["Apple Calendar", "apple"], ["Google Calendar", "google"], ["Outlook", "outlook"]].map(([lb, k]) => /*#__PURE__*/React.createElement("a", {
      key: k,
      href: k === "apple" ? "#" : calLinks(v)[k],
      target: "_blank",
      rel: "noreferrer",
      onClick: () => {
        haptic.light();
        setCalFor(null);
        window.aminyToast && window.aminyToast("Added to " + lb);
      },
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 10px",
        borderRadius: 8,
        textDecoration: "none",
        color: "var(--color-text)",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 500
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "calendar",
      s: 14,
      style: {
        color: "var(--aminy-teal-700)"
      }
    }), " ", lb))))))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-subtle)",
        textAlign: "center"
      }
    }, "Visits auto-sync to your connected calendar \xB7 families get the same join link in their app."));
  }

  // ============ MESSAGES (provider ↔ family threads) ============
  const THREADS = [{
    id: "m1",
    who: "Sarah (Kai's mom)",
    child: "Kai R.",
    last: "Thank you — we'll try the timer tonight 💛",
    time: "9:32a",
    unread: 0,
    you: false,
    msgs: [["fam", "Quick one — Kai had a great morning! The first-then board worked."], ["me", "That's wonderful. Consistency is doing the heavy lifting. Keep the same order each day."], ["fam", "Thank you — we'll try the timer tonight 💛"]]
  }, {
    id: "m2",
    who: "Alex (Kai's dad)",
    child: "Kai R.",
    last: "Sounds good, see you Thursday",
    time: "Yest",
    unread: 2,
    you: false,
    msgs: [["fam", "Are we still on for Thursday's review?"], ["me", "Yes — 2pm telehealth. I'll bring the updated goals."], ["fam", "Sounds good, see you Thursday"]]
  }, {
    id: "m3",
    who: "Mia's parents",
    child: "Mia T.",
    last: "You: Shared this week's note",
    time: "Mon",
    unread: 0,
    you: true,
    msgs: [["me", "Shared this week's session note — Mia's manding is really taking off."]]
  }];
  function Messages() {
    const [active, setActive] = R.useState(null);
    const [text, setText] = R.useState("");
    const [extra, setExtra] = R.useState({});
    const open = THREADS.find(t => t.id === active);
    const endRef = R.useRef(null);
    R.useEffect(() => {
      if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
    }, [active, extra]);
    function send() {
      if (!text.trim()) return;
      haptic.light();
      setExtra(e => ({
        ...e,
        [active]: [...(e[active] || []), ["me", text.trim()]]
      }));
      setText("");
    }
    if (open) {
      const all = [...open.msgs, ...(extra[active] || [])];
      return /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          height: 728
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "16px 24px",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: 12
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setActive(null),
        style: {
          background: "none",
          border: 0,
          cursor: "pointer",
          color: "var(--aminy-teal-700)",
          fontSize: 18
        }
      }, "\u2190"), /*#__PURE__*/React.createElement(Avatar, {
        name: open.who,
        tone: "teal",
        size: 38
      }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14.5,
          fontWeight: 600,
          color: "var(--color-text-strong)"
        }
      }, open.who), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--color-text-muted)"
        }
      }, "Re: ", open.child))), /*#__PURE__*/React.createElement("div", {
        ref: endRef,
        style: {
          flex: 1,
          overflowY: "auto",
          padding: "18px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "var(--aminy-mist)"
        }
      }, all.map(([who, body], i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          maxWidth: "70%",
          alignSelf: who === "me" ? "flex-end" : "flex-start",
          padding: "10px 14px",
          borderRadius: 16,
          fontSize: 14,
          lineHeight: 1.45,
          background: who === "me" ? "var(--aminy-teal-600)" : "var(--color-bg-elevated)",
          color: who === "me" ? "#fff" : "var(--color-text)",
          border: who === "me" ? 0 : "1px solid var(--color-border)",
          borderBottomRightRadius: who === "me" ? 5 : 16,
          borderBottomLeftRadius: who === "me" ? 16 : 5
        }
      }, body))), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "12px 20px",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          gap: 10,
          alignItems: "center"
        }
      }, /*#__PURE__*/React.createElement("input", {
        value: text,
        onChange: e => setText(e.target.value),
        onKeyDown: e => e.key === "Enter" && send(),
        placeholder: "Message the family\u2026",
        style: {
          flex: 1,
          height: 44,
          border: "1px solid var(--color-border-strong)",
          borderRadius: 999,
          padding: "0 16px",
          fontSize: 14,
          fontFamily: "var(--font-ui)",
          color: "var(--color-text)",
          outline: "none",
          background: "var(--color-bg-elevated)"
        }
      }), /*#__PURE__*/React.createElement("button", {
        onClick: send,
        "aria-label": "Send",
        style: {
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "var(--aminy-teal-600)",
          color: "#fff",
          border: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-cta)"
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        n: "send",
        s: 17
      }))));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "aminy-h3"
    }, "Messages"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--color-text-muted)",
        marginTop: 2
      }
    }, "Direct, async threads with your families. Calm and on the record.")), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      icon: /*#__PURE__*/React.createElement(Ico, {
        n: "plus",
        s: 15
      }),
      onClick: () => {
        haptic.light();
        window.aminyToast && window.aminyToast("New message — pick a family");
      }
    }, "New message")), /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, THREADS.map((t, i) => /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => {
        haptic.light();
        setActive(t.id);
      },
      style: {
        width: "100%",
        textAlign: "left",
        display: "flex",
        gap: 14,
        padding: "15px 18px",
        borderBottom: i < THREADS.length - 1 ? "1px solid var(--color-border)" : "0",
        background: "none",
        border: 0,
        borderBottomWidth: i < THREADS.length - 1 ? 1 : 0,
        borderBottomStyle: "solid",
        borderBottomColor: "var(--color-border)",
        cursor: "pointer",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: t.who,
      tone: "teal",
      size: 42
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, t.who), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-subtle)",
        flexShrink: 0
      }
    }, t.time)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        marginTop: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: t.unread ? "var(--color-text-strong)" : "var(--color-text-muted)",
        fontWeight: t.unread ? 600 : 400,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, t.last), t.unread > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        flexShrink: 0,
        minWidth: 18,
        height: 18,
        borderRadius: 999,
        background: "var(--aminy-teal-600)",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 5px"
      }
    }, t.unread)))))));
  }
  window.ProviderScreens = {
    Clients,
    EVV,
    Supervision,
    Review,
    Schedule,
    Messages
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/provider/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/provider/tools.jsx
try { (() => {
/* Provider revenue tools — Denial Workbench + Payouts (Stripe Connect).
   Ported from DenialWorkbench.tsx + ProviderPayoutSetup.tsx; rebuilt in the
   Aminy system (mist + teal, real CARC codes, 90/10 split). window → #root */
(function () {
  const {
    Button,
    Badge,
    Card,
    Stat
  } = window.AminyKit;
  const R = React;
  const haptic = window.aminyHaptic || {
    light() {},
    medium() {},
    success() {}
  };
  const toast = m => window.aminyToast && window.aminyToast(m);
  const I = {
    alert: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 9v4M12 17h.01"
    })),
    inbox: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M22 12h-6l-2 3h-4l-2-3H2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
    })),
    chart: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 3v18h18"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "7",
      y: "11",
      width: "3",
      height: "6"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "12",
      y: "7",
      width: "3",
      height: "10"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "17",
      y: "13",
      width: "3",
      height: "4"
    })),
    refresh: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M21 3v5h-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 16H3v5"
    })),
    zap: /*#__PURE__*/React.createElement("path", {
      d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
    }),
    file: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 2v4a2 2 0 0 0 2 2h4"
    })),
    send: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m22 2-7 20-4-9-9-4z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M22 2 11 13"
    })),
    back: /*#__PURE__*/React.createElement("path", {
      d: "m15 18-6-6 6-6"
    }),
    copy: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "9",
      y: "9",
      width: "13",
      height: "13",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
    })),
    card: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "2",
      y: "5",
      width: "20",
      height: "14",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M2 10h20"
    })),
    check: /*#__PURE__*/React.createElement("path", {
      d: "M20 6 9 17l-5-5"
    }),
    shield: /*#__PURE__*/React.createElement("path", {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    })
  };
  const Ico = ({
    n,
    s = 18,
    style
  }) => /*#__PURE__*/React.createElement("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, I[n]);
  const Frame = ({
    title,
    sub,
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1240,
      minHeight: 800,
      background: "var(--aminy-mist)",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "var(--shadow-xl)",
      border: "1px solid var(--color-border)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 72,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "0 32px",
      borderBottom: "1px solid var(--color-border)",
      background: "rgba(255,255,255,0.8)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/aminy_logo.png",
    alt: "aminy",
    style: {
      height: 26
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 26,
      background: "var(--color-border-strong)"
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      fontWeight: 700,
      fontSize: 18,
      letterSpacing: "-0.02em",
      color: "var(--color-text-strong)"
    }
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-text-muted)"
    }
  }, sub))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: 28,
      display: "flex",
      flexDirection: "column",
      gap: 18,
      overflowY: "auto"
    }
  }, children));

  // ===== DENIAL WORKBENCH =====
  const CAT = {
    auth: {
      label: "Authorization",
      bg: "var(--aminy-care-50)",
      fg: "var(--aminy-care-600)"
    },
    "missing-info": {
      label: "Missing Info",
      bg: "#eff6ff",
      fg: "#2563eb"
    },
    coding: {
      label: "Coding Error",
      bg: "var(--aminy-win-50)",
      fg: "var(--aminy-win-600)"
    },
    "medical-necessity": {
      label: "Medical Necessity",
      bg: "var(--aminy-alert-100)",
      fg: "var(--aminy-alert-600)"
    },
    "timely-filing": {
      label: "Timely Filing",
      bg: "var(--aminy-navy-50)",
      fg: "var(--aminy-navy-700)"
    },
    duplicate: {
      label: "Duplicate",
      bg: "var(--aminy-navy-50)",
      fg: "var(--aminy-navy-500)"
    }
  };
  const DENIALS = [{
    id: "d5",
    claim: "CLM-2026-0830",
    who: "Riley C.",
    dos: "Feb 20",
    cpt: "90834",
    payer: "Cigna",
    amt: 150,
    carc: "CO-29",
    reason: "Claim submitted after filing deadline",
    cat: "timely-filing",
    days: 0,
    status: "new",
    action: "Locate clearinghouse submission receipt for proof"
  }, {
    id: "d3",
    claim: "CLM-2026-0862",
    who: "Sam R.",
    dos: "Mar 5",
    cpt: "97153",
    payer: "AHCCCS",
    amt: 240,
    carc: "CO-50",
    reason: "Service not considered medically necessary",
    cat: "medical-necessity",
    days: 4,
    status: "in-review",
    action: "Submit clinical appeal with treatment plan"
  }, {
    id: "d2",
    claim: "CLM-2026-0876",
    who: "Jordan K.",
    dos: "Mar 10",
    cpt: "90834",
    payer: "Aetna",
    amt: 150,
    carc: "CO-16",
    reason: "Subscriber ID does not match payer records",
    cat: "missing-info",
    days: 9,
    status: "new",
    action: "Verify subscriber ID and resubmit"
  }, {
    id: "d1",
    claim: "CLM-2026-0891",
    who: "Alex M.",
    dos: "Mar 15",
    cpt: "90837",
    payer: "BCBS Arizona",
    amt: 185,
    carc: "CO-197",
    reason: "Prior authorization not obtained before service date",
    cat: "auth",
    days: 14,
    status: "new",
    action: "Request retro-authorization from BCBS"
  }, {
    id: "d8",
    claim: "CLM-2026-0780",
    who: "Drew N.",
    dos: "Jan 30",
    cpt: "97153",
    payer: "AHCCCS",
    amt: 120,
    carc: "CO-97",
    reason: "Procedure bundled — partial payment applied",
    cat: "coding",
    days: 29,
    status: "recovered",
    action: "Partial recovery achieved via modifier 59"
  }];
  const SST = {
    new: ["New", "win"],
    "in-review": ["In Review", "care"],
    appealed: ["Appealed", "navy"],
    recovered: ["Recovered", "grow"]
  };
  function urgency(d) {
    return d <= 0 ? "var(--aminy-alert-600)" : d <= 7 ? "var(--aminy-alert-600)" : d <= 14 ? "var(--aminy-win-600)" : "var(--color-text-muted)";
  }
  function DenialWorkbench() {
    const [view, setView] = R.useState("inbox");
    const [sel, setSel] = R.useState(null);
    const [letter, setLetter] = R.useState(false);
    const atRisk = DENIALS.filter(d => !["recovered", "written-off"].includes(d.status)).reduce((s, d) => s + d.amt, 0);
    const urgent = DENIALS.filter(d => d.days <= 7 && !["recovered"].includes(d.status)).length;
    if (sel) {
      const c = CAT[sel.cat];
      return /*#__PURE__*/React.createElement(Frame, {
        title: "Denial Workbench",
        sub: `${urgent} urgent · $${atRisk.toLocaleString()} at risk`
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          setSel(null);
          setLetter(false);
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: 0,
          cursor: "pointer",
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          fontWeight: 600,
          alignSelf: "flex-start"
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        n: "back",
        s: 15
      }), " Back to inbox"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 16,
          alignItems: "start"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 14
        }
      }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 17,
          fontWeight: 700,
          color: "var(--color-text-strong)"
        }
      }, sel.who), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: "var(--color-text-muted)"
        }
      }, sel.claim, " \xB7 ", sel.dos)), /*#__PURE__*/React.createElement(Badge, {
        tone: SST[sel.status][1]
      }, SST[sel.status][0])), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          fontSize: 13
        }
      }, [["Payer", sel.payer], ["CPT", sel.cpt], ["Denied", "$" + sel.amt], ["Deadline", sel.days <= 0 ? "EXPIRED" : sel.days + " days"]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
        key: k
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          color: "var(--color-text-subtle)"
        }
      }, k), /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          color: k === "Denied" ? "var(--aminy-alert-600)" : k === "Deadline" ? urgency(sel.days) : "var(--color-text-strong)"
        }
      }, v))))), /*#__PURE__*/React.createElement("div", {
        style: {
          background: "var(--aminy-alert-100)",
          border: "1px solid #fecaca",
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        n: "alert",
        s: 17,
        style: {
          color: "var(--aminy-alert-600)",
          flexShrink: 0,
          marginTop: 1
        }
      }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 700,
          color: "#991b1b"
        }
      }, sel.carc, ": ", c.label), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: "#b91c1c",
          marginTop: 2,
          lineHeight: 1.5
        }
      }, sel.reason))), /*#__PURE__*/React.createElement("div", {
        style: {
          background: "var(--aminy-grow-50)",
          border: "1px solid var(--aminy-grow-100)",
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        n: "zap",
        s: 17,
        style: {
          color: "var(--aminy-grow-600)",
          flexShrink: 0,
          marginTop: 1
        }
      }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 700,
          color: "#166534"
        }
      }, "Suggested action"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: "#15803d",
          marginTop: 2,
          lineHeight: 1.5
        }
      }, sel.action)))), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(Button, {
        variant: "primary",
        fullWidth: true,
        icon: /*#__PURE__*/React.createElement(Ico, {
          n: "file",
          s: 15
        }),
        onClick: () => {
          haptic.light();
          setLetter(!letter);
        }
      }, letter ? "Hide" : "Generate", " appeal letter"), /*#__PURE__*/React.createElement(Button, {
        variant: "secondary",
        fullWidth: true,
        icon: /*#__PURE__*/React.createElement(Ico, {
          n: "send",
          s: 15
        }),
        onClick: () => toast("Claim resubmitted to " + sel.payer)
      }, "Resubmit claim"), /*#__PURE__*/React.createElement(Button, {
        variant: "ghost",
        fullWidth: true,
        onClick: () => toast("Marked for write-off")
      }, "Write off"), letter && /*#__PURE__*/React.createElement(Card, {
        padding: 0,
        style: {
          marginTop: 4
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 14px",
          borderBottom: "1px solid var(--color-border)"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          fontWeight: 700,
          color: "var(--aminy-care-600)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        n: "zap",
        s: 13
      }), " AI-drafted appeal"), /*#__PURE__*/React.createElement("button", {
        onClick: () => toast("Copied"),
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: 0,
          cursor: "pointer",
          color: "var(--color-text-muted)",
          fontSize: 12,
          fontWeight: 600
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        n: "copy",
        s: 12
      }), " Copy")), /*#__PURE__*/React.createElement("pre", {
        style: {
          margin: 0,
          padding: 14,
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          lineHeight: 1.55,
          color: "var(--color-text)",
          whiteSpace: "pre-wrap",
          maxHeight: 220,
          overflowY: "auto",
          background: "var(--aminy-mist)"
        }
      }, `RE: Appeal of Claim ${sel.claim}
Patient: ${sel.who} · DOS ${sel.dos}
CPT ${sel.cpt} · Denied $${sel.amt} · ${sel.carc}

Dear Appeals Committee,

I am appealing the denial of the above claim.
The service was medically necessary and
appropriate for the patient's condition.

Enclosed: treatment plan with measurable
goals, progress notes, and supporting
documentation.

I respectfully request reconsideration and
reprocessing for payment.

Sincerely,
Dr. Ana Morales, BCBA-D · NPI 1234567890`)))));
    }
    return /*#__PURE__*/React.createElement(Frame, {
      title: "Denial Workbench",
      sub: `${urgent} urgent · $${atRisk.toLocaleString()} at risk`
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: 4,
        width: "fit-content"
      }
    }, [["inbox", "Inbox", "inbox"], ["analytics", "Analytics", "chart"], ["rework", "Rework", "refresh"]].map(([id, lb, ic]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => {
        haptic.light();
        setView(id);
      },
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 15px",
        borderRadius: 9,
        border: 0,
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 600,
        background: view === id ? "var(--aminy-navy-950)" : "transparent",
        color: view === id ? "#fff" : "var(--color-text-muted)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: ic,
      s: 15
    }), " ", lb, id === "inbox" && /*#__PURE__*/React.createElement("span", {
      style: {
        background: view === id ? "#fff" : "var(--aminy-alert-600)",
        color: view === id ? "var(--aminy-navy-950)" : "#fff",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        width: 16,
        height: 16,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, "3")))), view === "inbox" && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 9
      }
    }, DENIALS.map(d => {
      const c = CAT[d.cat];
      return /*#__PURE__*/React.createElement("div", {
        key: d.id,
        onClick: () => {
          haptic.light();
          setSel(d);
        },
        style: {
          background: "#fff",
          border: `1px solid ${d.days <= 7 && d.status !== "recovered" ? "#fecaca" : "var(--color-border)"}`,
          borderRadius: 14,
          padding: "13px 16px",
          cursor: "pointer",
          boxShadow: "var(--shadow-sm)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 7
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement(Ico, {
        n: "alert",
        s: 15,
        style: {
          color: d.days <= 7 ? "var(--aminy-alert-600)" : "var(--aminy-win-600)"
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14,
          fontWeight: 600,
          color: "var(--color-text-strong)"
        }
      }, d.who)), /*#__PURE__*/React.createElement(Badge, {
        tone: SST[d.status][1]
      }, SST[d.status][0])), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 6
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: c.fg,
          background: c.bg,
          borderRadius: 999,
          padding: "2px 8px"
        }
      }, c.label), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12.5,
          color: "var(--color-text-muted)"
        }
      }, d.carc, " \xB7 ", d.payer, " \xB7 ", d.cpt)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: "var(--color-text-muted)",
          marginBottom: 8,
          lineHeight: 1.4
        }
      }, d.reason), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 700,
          color: "var(--color-text-strong)"
        }
      }, "$", d.amt), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: urgency(d.days)
        }
      }, d.days <= 0 ? "DEADLINE EXPIRED" : d.days + "d to appeal")));
    })), view === "analytics" && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Total denied",
      value: "$" + DENIALS.reduce((s, d) => s + d.amt, 0).toLocaleString(),
      caption: DENIALS.length + " claims"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Recovered",
      value: "$120",
      caption: "1 claim",
      accent: true
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Denial rate",
      value: "12",
      unit: "%",
      caption: "\u22122% vs last mo"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Recovery rate",
      value: "68",
      unit: "%",
      caption: "+5% vs last mo"
    })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 14
      }
    }, "Top denial reasons"), [["Authorization", 38], ["Medical necessity", 24], ["Coding error", 20], ["Missing info", 12], ["Timely filing", 6]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        marginBottom: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)"
      }
    }, v, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 8,
        background: "var(--aminy-navy-50)",
        borderRadius: 4,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: v + "%",
        height: "100%",
        background: "var(--aminy-care-600)",
        borderRadius: 4
      }
    }))))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "chart",
      s: 20,
      style: {
        color: "#2563eb",
        flexShrink: 0,
        marginTop: 1
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "#1d4ed8",
        lineHeight: 1.55
      }
    }, /*#__PURE__*/React.createElement("b", null, "Revenue impact:"), " at a 12% denial rate, ~$31k/yr is at risk. Cutting denials 3% recovers an estimated $8k per quarter \u2014 Aminy's auth checks target exactly that."))), view === "rework" && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 9
      }
    }, DENIALS.filter(d => ["new", "in-review"].includes(d.status)).map(d => /*#__PURE__*/React.createElement(Card, {
      key: d.id,
      padding: 14
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, d.who), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-subtle)"
      }
    }, d.claim)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: urgency(d.days)
      }
    }, d.days <= 0 ? "OVERDUE" : d.days + "d left")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--color-text-muted)",
        marginBottom: 10
      }
    }, d.action), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      onClick: () => toast("Opening correction…")
    }, "Fix"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => toast("Resubmitted")
    }, "Resubmit"))))));
  }

  // ===== PAYOUTS (Stripe Connect) =====
  const PAYOUTS = [{
    desc: "Direct therapy — Kai R.",
    date: "Jun 22, 2026",
    amt: "$511.70",
    status: ["Paid", "grow"]
  }, {
    desc: "Supervision — Mia T.",
    date: "Jun 21, 2026",
    amt: "$403.06",
    status: ["Paid", "grow"]
  }, {
    desc: "Parent training — Okafors",
    date: "Jun 20, 2026",
    amt: "$135.76",
    status: ["Pending", "win"]
  }, {
    desc: "Direct therapy — Ava P.",
    date: "Jun 18, 2026",
    amt: "$511.70",
    status: ["Paid", "grow"]
  }];
  function Payouts() {
    return /*#__PURE__*/React.createElement(Frame, {
      title: "Payout Setup",
      sub: "Receive payments for your sessions \xB7 Stripe Connect"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 560,
        width: "100%",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "var(--aminy-teal-50)",
        color: "var(--aminy-teal-700)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "card",
      s: 17
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "var(--color-text-strong)"
      }
    }, "Stripe Connect")), /*#__PURE__*/React.createElement(Badge, {
      tone: "grow",
      icon: /*#__PURE__*/React.createElement(Ico, {
        n: "check",
        s: 12
      })
    }, "Active")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--aminy-teal-50)",
        borderRadius: 14,
        padding: 14,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--aminy-teal-700)",
        fontWeight: 600,
        marginBottom: 4
      }
    }, "Available"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 800,
        color: "var(--aminy-teal-700)",
        letterSpacing: "-0.02em"
      }
    }, "$1,562")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--aminy-mist)",
        borderRadius: 14,
        padding: 14,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--color-text-muted)",
        fontWeight: 600,
        marginBottom: 4
      }
    }, "Pending"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 800,
        color: "var(--color-text-strong)",
        letterSpacing: "-0.02em"
      }
    }, "$136"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontSize: 12,
        color: "var(--color-text-subtle)"
      }
    }, /*#__PURE__*/React.createElement(Ico, {
      n: "shield",
      s: 13
    }), " Payouts processed securely via Stripe \xB7 2 business days")), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        marginBottom: 12
      }
    }, "Payout schedule"), [["Platform fee", "10%"], ["Your share", "90%"], ["Payout timing", "2 business days"], ["Minimum payout", "$0 (auto)"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "9px 0",
        borderBottom: i < 3 ? "1px solid var(--color-border)" : 0,
        fontSize: 13.5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--color-text-muted)"
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, v)))), /*#__PURE__*/React.createElement(Card, {
      padding: 0
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "14px 18px",
        borderBottom: "1px solid var(--color-border)",
        fontWeight: 700,
        fontSize: 14,
        color: "var(--color-text-strong)"
      }
    }, "Recent payouts"), PAYOUTS.map((p, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 18px",
        borderBottom: i < PAYOUTS.length - 1 ? "1px solid var(--color-border)" : 0
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: "var(--color-text-strong)"
      }
    }, p.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--color-text-subtle)"
      }
    }, p.date)), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "var(--color-text-strong)"
      }
    }, p.amt), /*#__PURE__*/React.createElement(Badge, {
      tone: p.status[1]
    }, p.status[0])))))));
  }
  const VIEWS = [["denials", "Denial Workbench", DenialWorkbench], ["payouts", "Payouts", Payouts]];
  function App() {
    const [v, setV] = R.useState("denials");
    const Cur = VIEWS.find(x => x[0] === v)[2];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 999,
        padding: 5,
        boxShadow: "var(--shadow-sm)"
      }
    }, VIEWS.map(([id, lb]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => {
        haptic.light();
        setV(id);
      },
      style: {
        padding: "8px 18px",
        borderRadius: 999,
        border: 0,
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontSize: 13.5,
        fontWeight: 600,
        background: v === id ? "var(--aminy-teal-600)" : "transparent",
        color: v === id ? "#fff" : "var(--color-text-muted)"
      }
    }, lb))), /*#__PURE__*/React.createElement(Cur, {
      key: v
    }));
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/provider/tools.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Nudge = __ds_scope.Nudge;

__ds_ns.Stat = __ds_scope.Stat;

})();
