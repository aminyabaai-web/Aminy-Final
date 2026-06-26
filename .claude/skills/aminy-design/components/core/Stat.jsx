import React from "react";

/**
 * Aminy Stat — a quiet metric tile. Celebrates consistency, not
 * perfection: pair a value with a warm caption ("One left · no rush"),
 * never a punitive one. accent=true tints the value teal.
 */
export function Stat({ label, value, unit = null, caption = null, accent = false, style = {} }) {
  return (
    <div style={{
      background: "var(--color-bg-elevated)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)",
      padding: "12px 14px",
      ...style,
    }}>
      <div style={{
        fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)",
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--color-text-muted)", fontWeight: "var(--fw-bold)",
      }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-ui)", fontWeight: "var(--fw-bold)",
        fontSize: "var(--text-2xl)", letterSpacing: "var(--ls-tight)",
        lineHeight: 1, marginTop: "6px",
        color: accent ? "var(--aminy-teal-700)" : "var(--color-text-strong)",
      }}>
        {value}
        {unit && <small style={{
          fontSize: "var(--text-sm)", color: "var(--color-text-muted)",
          fontWeight: "var(--fw-medium)", marginLeft: "2px",
        }}>{unit}</small>}
      </div>
      {caption && <div style={{
        fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)",
        color: "var(--color-text-muted)", marginTop: "4px", lineHeight: 1.3,
      }}>{caption}</div>}
    </div>
  );
}
