"use client";

import { Field } from "../ui/Field";
import type { OperatingInputs } from "@/lib/calculator/types";
import styles from "./FormSection.module.css";

export type OperatingFormProps = {
  operating: OperatingInputs;
  onUpdateOperating: <K extends keyof OperatingInputs>(
    key: K,
    value: OperatingInputs[K]
  ) => void;
  errors?: Record<string, string>;
};

/**
 * Form section for operating expenses.
 */
export function OperatingForm({
  operating,
  onUpdateOperating,
  errors = {},
}: OperatingFormProps) {
  const numberValue = (v: number | undefined) => (Number.isFinite(v) ? v : "") as number;

  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>
        <h4>Operating Expenses</h4>
        <span className={styles.badge}>Monthly/Annual</span>
      </legend>

      <div className={styles.fieldGrid}>
        <Field
          label="Property taxes (annual)"
          value={numberValue(operating.taxesAnnual)}
          onChange={(v) => onUpdateOperating("taxesAnnual", v)}
          prefix="$"
          tooltip="Annual property tax amount."
          error={errors["operating.taxesAnnual"]}
        />

        <Field
          label="Insurance (annual)"
          value={numberValue(operating.insuranceAnnual)}
          onChange={(v) => onUpdateOperating("insuranceAnnual", v)}
          prefix="$"
          tooltip="Annual insurance premium."
          error={errors["operating.insuranceAnnual"]}
        />

        <Field
          label="Repairs %"
          value={numberValue(operating.repairsPercent)}
          onChange={(v) => onUpdateOperating("repairsPercent", v)}
          suffix="%"
          tooltip="Percentage of rent set aside for repairs."
          error={errors["operating.repairsPercent"]}
        />

        <Field
          label="CapEx %"
          value={numberValue(operating.capexPercent)}
          onChange={(v) => onUpdateOperating("capexPercent", v)}
          suffix="%"
          tooltip="Percentage of rent for capital expenditures."
          error={errors["operating.capexPercent"]}
        />

        <Field
          label="Management %"
          value={numberValue(operating.managementPercent)}
          onChange={(v) => onUpdateOperating("managementPercent", v)}
          suffix="%"
          tooltip="Property management fee as percentage of rent."
          error={errors["operating.managementPercent"]}
        />

        <Field
          label="Vacancy %"
          value={numberValue(operating.vacancyPercent)}
          onChange={(v) => onUpdateOperating("vacancyPercent", v)}
          suffix="%"
          tooltip="Expected vacancy rate."
          error={errors["operating.vacancyPercent"]}
        />

        <Field
          label="Other monthly expenses"
          value={numberValue(operating.otherMonthlyExpenses)}
          onChange={(v) => onUpdateOperating("otherMonthlyExpenses", v)}
          prefix="$"
          tooltip="Any additional monthly costs."
          error={errors["operating.otherMonthlyExpenses"]}
        />

        <Field
          label="Utilities (monthly)"
          value={numberValue(operating.utilitiesMonthly)}
          onChange={(v) => onUpdateOperating("utilitiesMonthly", v)}
          prefix="$"
          tooltip="Monthly utility costs if landlord-paid."
          error={errors["operating.utilitiesMonthly"]}
        />
      </div>
    </fieldset>
  );
}

export default OperatingForm;
