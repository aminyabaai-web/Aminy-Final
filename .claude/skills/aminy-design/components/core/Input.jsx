import React from "react";

/**
 * Aminy Input — 16px font floor (no iOS zoom), 3px teal focus ring,
 * sentence-case calm labels. Pass a hint for gentle helper text.
 */
export function Input({ label, hint, id, style = {}, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const autoId = React.useId();
  const fieldId = id || autoId;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label htmlFor={fieldId} style={{
          fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)",
          fontWeight: "var(--fw-medium)", color: "var(--color-text)",
        }}>{label}</label>
      )}
      <input
        id={fieldId}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
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
          ...style,
        }}
        {...rest}
      />
      {hint && (
        <span style={{
          fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)",
          color: "var(--color-text-muted)",
        }}>{hint}</span>
      )}
    </div>
  );
}
