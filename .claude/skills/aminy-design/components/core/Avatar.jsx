import React from "react";

/**
 * Aminy Avatar — a soft gradient identity circle with initials, or a
 * photo when src is provided. Warm child gradients, teal for adults.
 */
export function Avatar({ name = "", src = null, size = 40, tone = "teal", style = {} }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const tones = {
    teal:  { bg: "linear-gradient(135deg, var(--aminy-teal-400), var(--aminy-teal-700))", fg: "#fff" },
    child: { bg: "linear-gradient(135deg, #fde68a, var(--aminy-win-500))", fg: "#78350f" },
    navy:  { bg: "linear-gradient(135deg, var(--aminy-navy-400), var(--aminy-navy-800))", fg: "#fff" },
    care:  { bg: "linear-gradient(135deg, #c4b5fd, var(--aminy-care-600))", fg: "#fff" },
  };
  const t = tones[tone] || tones.teal;

  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      borderRadius: "var(--radius-full)",
      background: src ? `center/cover no-repeat url(${src})` : t.bg,
      color: t.fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-ui)", fontWeight: "var(--fw-bold)",
      fontSize: Math.round(size * 0.38),
      boxShadow: "var(--shadow-sm)",
      ...style,
    }}>
      {!src && initials}
    </div>
  );
}
