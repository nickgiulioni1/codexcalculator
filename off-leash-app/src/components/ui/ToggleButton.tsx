"use client";

import { useId } from "react";
import styles from "./ToggleButton.module.css";

export type ToggleButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
};

/**
 * Accessible toggle button component.
 * Uses aria-pressed for proper screen reader support.
 */
export function ToggleButton({
  label,
  active,
  onClick,
  disabled = false,
  ariaLabel,
}: ToggleButtonProps) {
  const id = useId();

  return (
    <button
      id={id}
      type="button"
      className={`${styles.toggle} ${active ? styles.active : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel || label}
    >
      {label}
    </button>
  );
}

export default ToggleButton;
