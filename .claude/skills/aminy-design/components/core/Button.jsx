import React from "react";

/**
 * Aminy Button — calm, confident, one teal pointer per view.
 * Primary carries the teal CTA glow; secondary is a quiet white pill;
 * ghost is the "not now / skip" register. 48px default tap target.
 */
export function Button({
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

  const heights = { sm: 40, md: 48, lg: 56 };
  const pads = { sm: "0 14px", md: "0 20px", lg: "0 26px" };
  const fonts = { sm: "var(--text-sm)", md: "var(--text-md)", lg: "var(--text-lg)" };

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
    whiteSpace: "nowrap",
  };

  const variants = {
    primary: {
      background: hover && !disabled ? "var(--aminy-teal-700)" : "var(--aminy-teal-600)",
      color: "#fff",
      boxShadow: "var(--shadow-cta)",
    },
    secondary: {
      background: "#fff",
      color: "var(--aminy-navy-700)",
      borderColor: "var(--color-border-strong)",
      boxShadow: hover && !disabled ? "var(--shadow-sm)" : "none",
    },
    ghost: {
      background: hover && !disabled ? "var(--aminy-teal-50)" : "transparent",
      color: "var(--aminy-teal-700)",
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{ ...base, ...variants[variant], ...style }}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}
