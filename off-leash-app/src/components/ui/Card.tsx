"use client";

import type { ReactNode } from "react";
import styles from "./Card.module.css";

export type CardProps = {
  children: ReactNode;
  title?: string;
  badge?: string;
  className?: string;
};

/**
 * Card component with optional title and badge.
 */
export function Card({ children, title, badge, className = "" }: CardProps) {
  return (
    <div className={`${styles.card} ${className}`}>
      {(title || badge) && (
        <div className={styles.header}>
          {title && <h4 className={styles.title}>{title}</h4>}
          {badge && <span className={styles.badge}>{badge}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
