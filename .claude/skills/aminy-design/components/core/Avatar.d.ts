import * as React from "react";

/** A soft gradient identity circle with initials, or a photo via src. */
export interface AvatarProps {
  /** Full name — initials are derived from it. */
  name?: string;
  /** Optional image URL; overrides the gradient + initials. */
  src?: string | null;
  /** Diameter in px. @default 40 */
  size?: number;
  /** Gradient family. @default "teal" */
  tone?: "teal" | "child" | "navy" | "care";
  style?: React.CSSProperties;
}

export function Avatar(props: AvatarProps): JSX.Element;
