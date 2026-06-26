import * as React from "react";

/**
 * The signature proactive card — a warm rounded (Fredoka) tip from Aminy with a teal
 * left-stripe. Validate first, then offer.
 * @startingPoint section="Core" subtitle="Proactive rounded-voice nudge card" viewport="700x200"
 */
export interface NudgeProps {
  /** Uppercase eyebrow. @default "From Aminy" */
  eyebrow?: string;
  /** The tip — rendered in the rounded brand font (Fredoka). */
  children?: React.ReactNode;
  /** Action row (e.g. two Buttons). */
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Nudge(props: NudgeProps): JSX.Element;
