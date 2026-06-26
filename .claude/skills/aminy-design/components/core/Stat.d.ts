import * as React from "react";

/** A quiet metric tile. Celebrates consistency — pair with a warm caption. */
export interface StatProps {
  /** Uppercase kicker label. */
  label: string;
  /** The figure (string or number). */
  value: React.ReactNode;
  /** Small trailing unit, e.g. "/7" or "days". */
  unit?: React.ReactNode;
  /** Warm sub-caption, never punitive. */
  caption?: React.ReactNode;
  /** Tint the value teal. @default false */
  accent?: boolean;
  style?: React.CSSProperties;
}

export function Stat(props: StatProps): JSX.Element;
