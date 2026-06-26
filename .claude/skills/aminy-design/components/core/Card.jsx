import React from "react";

/**
 * Aminy Card — the elevated white surface that floats on the mist
 * background. Soft 16px radius, hairline border, resting shadow that
 * lifts on hover when interactive.
 */
export function Card({
  as: Tag = "div",
  interactive = false,
  padding = 22,
  radius = "var(--radius-lg)",
  style = {},
  children,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <Tag
      onMouseEnter={interactive ? () => setHover(true) : undefined}
      onMouseLeave={interactive ? () => setHover(false) : undefined}
      style={{
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: radius,
        padding: typeof padding === "number" ? `${padding}px` : padding,
        boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        transition: "box-shadow var(--dur-base) var(--ease-lift), transform var(--dur-base) var(--ease-lift)",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
