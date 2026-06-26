import * as React from "react";

/**
 * The primary action control. One teal Button per view — it is the pointer.
 * @startingPoint section="Core" subtitle="Primary / secondary / ghost, 3 sizes" viewport="700x260"
 */
export interface ButtonProps {
  /** Visual register. @default "primary" */
  variant?: "primary" | "secondary" | "ghost";
  /** Tap-target height: sm 40 · md 48 · lg 56. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Leading icon node (e.g. a Lucide SVG). */
  icon?: React.ReactNode;
  /** Trailing icon node. */
  iconRight?: React.ReactNode;
  /** Stretch to container width. @default false */
  fullWidth?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
