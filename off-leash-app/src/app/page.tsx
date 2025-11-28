import Link from "next/link";
import styles from "./page.module.css";

const highlights = [
  {
    title: "Deterministic math",
    desc: "Spreadsheet-true calculations for Buy & Hold, BRRRR, and flips.",
  },
  {
    title: "Timeline aware",
    desc: "Model current tenants, rehab windows, and stabilized rents cleanly.",
  },
  {
    title: "Beautiful outputs",
    desc: "Hospitality-inspired UI with concise KPIs and readable tables.",
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={`${styles.hero} card`}>
        <div className={styles.heroCopy}>
          <div className="pill">
            <span role="img" aria-label="sparkles">
              ✨
            </span>{" "}
            Built for operators who hate messy models
          </div>
          <h1 className={styles.heroTitle}>
            Off Leash Deal Analyzer
            <span className={styles.gradientText}>
              {" "}
              clear, confident decisions.
            </span>
          </h1>
          <p className={styles.heroSubtitle}>
            A web-based real estate investment calculator that keeps the math
            deterministic, the UI delightful, and the assumptions explicit.
            Tune current vs future rents, rehab timing, and financing without
            losing the plot.
          </p>
          <div className={styles.ctaRow}>
            <Link className="btn btn-primary" href="/analyze">
              Start analyzing a deal
            </Link>
            <Link className="btn btn-ghost" href="/analyze">
              Try the timeline controls
            </Link>
          </div>
          <div className={styles.heroChips}>
            <div className="chip badge-accent">Buy & Hold</div>
            <div className="chip badge-accent">BRRRR</div>
            <div className="chip badge-accent">Flip</div>
            <div className="chip">Spreadsheet parity</div>
          </div>
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.panelLabel}>Live scenario</div>
              <div className={styles.panelTitle}>Stabilized after rehab</div>
            </div>
            <div className="pill-ghost">Projected</div>
          </div>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Cash required</div>
              <div className={styles.metricValue}>$82,400</div>
              <div className={styles.metricDelta}>vs. template +$1.2k</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Year 1 cash flow</div>
              <div className={styles.metricValue}>$9,180</div>
              <div className={styles.metricDelta}>$765 / month</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Stabilized rent</div>
              <div className={styles.metricValue}>$2,750</div>
              <div className={styles.metricDelta}>After month 4</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Refi month</div>
              <div className={styles.metricValue}>5</div>
              <div className={styles.metricDelta}>Linked to rehab end</div>
            </div>
          </div>
          <div className={styles.timeline}>
            <div className={styles.timelineTrack}>
              <div className={styles.timelinePhase} style={{ flex: 2 }}>
                <span>Current</span>
                <strong>Month 1-2</strong>
              </div>
              <div className={styles.timelinePhase} style={{ flex: 1 }}>
                <span>Rehab</span>
                <strong>Month 3-4</strong>
              </div>
              <div className={styles.timelinePhase} style={{ flex: 4 }}>
                <span>Stabilized</span>
                <strong>Month 5+</strong>
              </div>
            </div>
            <div className={styles.timelineNote}>
              Rent paused during rehab; refinance keyed to ARV at month 5.
            </div>
          </div>
        </div>
      </section>

      <section className={styles.gridSection}>
        {highlights.map((item) => (
          <div key={item.title} className={`${styles.featureCard} card`}>
            <div className="pill-ghost">{item.title}</div>
            <p>{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
