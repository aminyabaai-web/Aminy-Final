import React from "react";

/**
 * Aminy Badge (chip) — a soft-filled, pill-shaped identity marker.
 * Tones map to the earned-state palette; use to carry meaning,
 * never as decoration.
 */
export function Badge({ tone = "teal", icon = null, children, style = {}, ...rest }) {
  const tones = {
    teal: { bg: "var(--aminy-teal-50)", fg: "var(--aminy-teal-800)", bd: "var(--aminy-teal-100)" },
    navy: { bg: "var(--aminy-navy-50)", fg: "var(--aminy-navy-700)", bd: "var(--aminy-navy-100)" },
    win:  { bg: "var(--aminy-win-50)",  fg: "var(--aminy-win-600)",  bd: "var(--aminy-win-100)" },
    grow: { bg: "var(--aminy-grow-50)", fg: "var(--aminy-grow-600)", bd: "var(--aminy-grow-100)" },
    care: { bg: "var(--aminy-care-50)", fg: "var(--aminy-care-600)", bd: "var(--aminy-care-100)" },
  };
  const t = tones[tone] || tones.teal;
  return (
    <span
      style={{
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
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
