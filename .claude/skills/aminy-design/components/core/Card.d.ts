import * as React from "react";

/** The elevated white surface that floats on the mist background. */
export interface CardProps {
  /** Render element. @default "div" */
  as?: keyof JSX.IntrinsicElements;
  /** Lift + shadow on hover. @default false */
  interactive?: boolean;
  /** Inner padding in px or any CSS length. @default 22 */
  padding?: number | string;
  /** Corner radius. @default var(--radius-lg) */
  radius?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card(props: CardProps): JSX.Element;
