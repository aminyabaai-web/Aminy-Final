import React from "react";

/**
 * Aminy Nudge — the signature proactive card. A warm rounded (Fredoka) tip from
 * Aminy with a teal left-stripe and gentle actions. Validate first,
 * then offer. Never stack stock icons inside the body.
 */
export function Nudge({ eyebrow = "From Aminy", children, actions = null, style = {} }) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, #fff, var(--aminy-teal-50))",
        border: "1px solid var(--aminy-teal-100)",
        borderRadius: "var(--radius-xl)",
        padding: "16px 18px 16px 20px",
        ...style,
      }}
    >
      <span style={{
        position: "absolute", left: 0, top: 16, bottom: 16, width: 3,
        background: "var(--aminy-teal-600)", borderRadius: "0 2px 2px 0",
      }} />
      <div style={{
        fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)",
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: "var(--aminy-teal-700)", fontWeight: "var(--fw-bold)",
        marginBottom: "6px",
      }}>{eyebrow}</div>
      <p className="aminy-nudge-tip" style={{
        margin: 0,
        fontFamily: "var(--font-ui)", fontWeight: 600,
        fontSize: "var(--text-lg)", lineHeight: "var(--lh-snug)", letterSpacing: "-0.01em",
        color: "var(--color-text-strong)", textWrap: "pretty",
      }}>{children}</p>
      {actions && <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>{actions}</div>}
    </div>
  );
}
