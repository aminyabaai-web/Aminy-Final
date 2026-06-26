import * as React from "react";

/** A calm text field. 16px floor (no iOS zoom), 3px teal focus ring. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Sentence-case label rendered above the field. */
  label?: string;
  /** Gentle helper text below the field. */
  hint?: string;
}

export function Input(props: InputProps): JSX.Element;
