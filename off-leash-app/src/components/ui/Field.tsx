"use client";

import { useId, type InputHTMLAttributes } from "react";
import styles from "./Field.module.css";

export type FieldProps = {
  label: string;
  value: string | number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  helper?: string;
  tooltip?: string;
  error?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

/**
 * Accessible form field component with prefix/suffix support.
 * Includes proper ARIA labels and error handling.
 */
export function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
  helper,
  tooltip,
  error,
  disabled = false,
  min,
  max,
  step,
  ...rest
}: FieldProps) {
  const id = useId();
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  const describedBy = [
    helper ? helperId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`${styles.field} ${error ? styles.hasError : ""}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {tooltip && (
          <span
            className={styles.tooltip}
            role="tooltip"
            aria-label={tooltip}
            title={tooltip}
          >
            ?
          </span>
        )}
      </label>

      <div className={styles.inputWrapper}>
        {prefix && (
          <span className={styles.prefix} aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          className={`input ${styles.input} ${prefix ? styles.hasPrefix : ""} ${suffix ? styles.hasSuffix : ""}`}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          aria-describedby={describedBy || undefined}
          aria-invalid={!!error}
          {...rest}
        />
        {suffix && (
          <span className={styles.suffix} aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>

      {helper && !error && (
        <p id={helperId} className={styles.helper}>
          {helper}
        </p>
      )}

      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default Field;
