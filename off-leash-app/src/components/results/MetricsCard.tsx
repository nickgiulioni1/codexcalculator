"use client";

import styles from "./MetricsCard.module.css";

export type Metric = {
  label: string;
  value: string | number;
  subValue?: string;
  highlight?: boolean;
  tooltip?: string;
};

export type MetricsCardProps = {
  title: string;
  metrics: Metric[];
  variant?: "default" | "success" | "warning" | "danger";
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Displays a card with key metrics.
 * Used for showing calculated results like cash required, ROI, etc.
 */
export function MetricsCard({
  title,
  metrics,
  variant = "default",
}: MetricsCardProps) {
  const formatValue = (value: string | number): string => {
    if (typeof value === "string") return value;
    if (Math.abs(value) >= 1000) return currency.format(value);
    if (Math.abs(value) < 1 && value !== 0) return percent.format(value);
    return value.toLocaleString();
  };

  return (
    <div
      className={`${styles.card} ${styles[variant]}`}
      role="region"
      aria-label={title}
    >
      <h4 className={styles.title}>{title}</h4>
      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`${styles.metric} ${metric.highlight ? styles.highlight : ""}`}
            title={metric.tooltip}
          >
            <span className={styles.label}>{metric.label}</span>
            <span className={styles.value}>{formatValue(metric.value)}</span>
            {metric.subValue && (
              <span className={styles.subValue}>{metric.subValue}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetricsCard;
