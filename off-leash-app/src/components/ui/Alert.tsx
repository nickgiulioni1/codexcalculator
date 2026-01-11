"use client";

import type { ReactNode } from "react";
import styles from "./Alert.module.css";

export type AlertVariant = "info" | "warning" | "error" | "success";

export type AlertProps = {
  children: ReactNode;
  variant?: AlertVariant;
  onDismiss?: () => void;
};

/**
 * Alert component for displaying messages.
 * Includes proper ARIA roles for accessibility.
 */
export function Alert({
  children,
  variant = "info",
  onDismiss,
}: AlertProps) {
  const role = variant === "error" ? "alert" : "status";

  return (
    <div
      className={`${styles.alert} ${styles[variant]}`}
      role={role}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <span className={styles.content}>{children}</span>
      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default Alert;
