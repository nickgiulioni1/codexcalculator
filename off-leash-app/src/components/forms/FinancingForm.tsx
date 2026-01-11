"use client";

import { Field } from "../ui/Field";
import type { LoanInputs } from "@/lib/calculator/types";
import styles from "./FormSection.module.css";

export type FinancingFormProps = {
  loan: LoanInputs;
  onUpdateLoan: <K extends keyof LoanInputs>(key: K, value: LoanInputs[K]) => void;
  errors?: Record<string, string>;
};

/**
 * Form section for financing/loan details.
 */
export function FinancingForm({
  loan,
  onUpdateLoan,
  errors = {},
}: FinancingFormProps) {
  const numberValue = (v: number | undefined) => (Number.isFinite(v) ? v : "") as number;

  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>
        <h4>Financing</h4>
        <span className={styles.badge}>Long-term loan</span>
      </legend>

      <div className={styles.fieldGrid}>
        <Field
          label="Down payment %"
          value={numberValue(loan.downPaymentPercent)}
          onChange={(v) => onUpdateLoan("downPaymentPercent", v)}
          suffix="%"
          tooltip="Percentage of purchase price as down payment."
          min={0}
          max={100}
          error={errors["loan.downPaymentPercent"]}
        />

        <Field
          label="Interest rate %"
          value={numberValue(loan.interestRateAnnualPercent)}
          onChange={(v) => onUpdateLoan("interestRateAnnualPercent", v)}
          suffix="%"
          tooltip="Annual interest rate on the mortgage."
          min={0}
          max={25}
          error={errors["loan.interestRateAnnualPercent"]}
        />

        <Field
          label="Term (years)"
          value={numberValue(loan.termYears)}
          onChange={(v) => onUpdateLoan("termYears", Math.max(1, Math.round(v)))}
          tooltip="Loan amortization period in years."
          min={1}
          max={40}
          error={errors["loan.termYears"]}
        />

        <Field
          label="Closing costs %"
          value={numberValue(loan.closingCostsPercent)}
          onChange={(v) => onUpdateLoan("closingCostsPercent", v)}
          suffix="%"
          tooltip="Percentage of loan for closing costs."
          min={0}
          max={10}
          error={errors["loan.closingCostsPercent"]}
        />

        <Field
          label="Lender points %"
          value={numberValue(loan.lenderPointsPercent)}
          onChange={(v) => onUpdateLoan("lenderPointsPercent", v)}
          suffix="%"
          tooltip="Points paid to lender at closing."
          min={0}
          max={10}
          error={errors["loan.lenderPointsPercent"]}
        />
      </div>
    </fieldset>
  );
}

export default FinancingForm;
