import * as React from "react";

/** A soft-filled pill that carries identity or an earned state. Never decoration. */
export interface BadgeProps {
  /** Maps to the palette. @default "teal" */
  tone?: "teal" | "navy" | "win" | "grow" | "care";
  /** Optional leading icon/emoji node. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
