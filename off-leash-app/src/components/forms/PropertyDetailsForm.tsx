"use client";

import { Field } from "../ui/Field";
import { Strategy } from "@/lib/calculator/types";
import styles from "./FormSection.module.css";

export type PropertyDetailsFormProps = {
  purchasePrice: number;
  arv: number | undefined;
  annualAppreciationPercent: number;
  asIsValue: number | undefined;
  targetMonthlyRent: number;
  annualRentGrowthPercent: number | undefined;
  monthsToSimulate: number;
  strategy: Strategy;
  bridgeRate: number;
  flipHoldMonths: number;
  sellingCostsPercent: number;
  agentFeePercent: number;
  marginalTaxRatePercent: number;
  onUpdate: <K extends keyof PropertyDetailsFormProps>(
    key: K,
    value: PropertyDetailsFormProps[K]
  ) => void;
  errors?: Record<string, string>;
};

/**
 * Form section for property details.
 * Handles purchase price, ARV, rent, and strategy-specific fields.
 */
export function PropertyDetailsForm({
  purchasePrice,
  arv,
  annualAppreciationPercent,
  asIsValue,
  targetMonthlyRent,
  annualRentGrowthPercent,
  monthsToSimulate,
  strategy,
  bridgeRate,
  flipHoldMonths,
  sellingCostsPercent,
  agentFeePercent,
  marginalTaxRatePercent,
  onUpdate,
  errors = {},
}: PropertyDetailsFormProps) {
  const numberValue = (v: number | undefined) => (Number.isFinite(v) ? v : "") as number;

  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>
        <h4>Property Snapshot</h4>
        <span className={styles.badge}>Strategy neutral</span>
      </legend>

      <div className={styles.fieldGrid}>
        <Field
          label="Purchase price"
          value={numberValue(purchasePrice)}
          onChange={(v) => onUpdate("purchasePrice", v)}
          prefix="$"
          tooltip="Contract price paid at closing."
          error={errors.purchasePrice}
        />

        <Field
          label="ARV"
          value={numberValue(arv)}
          onChange={(v) => onUpdate("arv", v)}
          prefix="$"
          tooltip="After-repair value for stabilized condition."
          error={errors.arv}
        />

        <Field
          label="Annual appreciation %"
          value={numberValue(annualAppreciationPercent)}
          onChange={(v) => onUpdate("annualAppreciationPercent", v)}
          suffix="%"
          tooltip="Assumed property value growth per year."
          error={errors.annualAppreciationPercent}
        />

        <Field
          label="As-is value (optional)"
          helper="Defaults to purchase price if left blank"
          value={numberValue(asIsValue)}
          onChange={(v) => onUpdate("asIsValue", v)}
          prefix="$"
          tooltip="Current market value before rehab/turnover."
          error={errors.asIsValue}
        />

        <Field
          label="Target monthly rent after rehab / turnover"
          value={numberValue(targetMonthlyRent)}
          onChange={(v) => onUpdate("targetMonthlyRent", v)}
          prefix="$"
          tooltip="Stabilized rent once rehab/turnover is complete."
          error={errors.targetMonthlyRent}
        />

        <Field
          label="Annual rent growth %"
          helper="Applies to current and stabilized rent (buy & hold / BRRRR)."
          value={numberValue(annualRentGrowthPercent)}
          onChange={(v) => onUpdate("annualRentGrowthPercent", v)}
          suffix="%"
          tooltip="Assumed annual rent appreciation; compounds monthly across phases."
          error={errors.annualRentGrowthPercent}
        />

        <Field
          label="Months to simulate"
          helper="Drives timeline preview, rent, and value tables."
          value={numberValue(monthsToSimulate)}
          onChange={(v) => onUpdate("monthsToSimulate", Math.max(1, Math.round(v)))}
          tooltip="How far out to run the monthly/annual schedules."
          min={1}
          max={600}
          error={errors.monthsToSimulate}
        />

        {strategy !== Strategy.BUY_HOLD && (
          <Field
            label="Bridge rate % (short-term)"
            value={numberValue(bridgeRate)}
            onChange={(v) => onUpdate("bridgeRate", v)}
            suffix="%"
            error={errors.bridgeRate}
          />
        )}

        {strategy === Strategy.FLIP && (
          <>
            <Field
              label="Flip hold months (post-rehab)"
              value={numberValue(flipHoldMonths)}
              onChange={(v) => onUpdate("flipHoldMonths", v)}
              min={0}
              max={24}
              error={errors.flipHoldMonths}
            />

            <Field
              label="Seller costs % (flip)"
              value={numberValue(sellingCostsPercent)}
              onChange={(v) => onUpdate("sellingCostsPercent", v)}
              suffix="%"
              error={errors.sellingCostsPercent}
            />

            <Field
              label="Agent fee % (flip)"
              value={numberValue(agentFeePercent)}
              onChange={(v) => onUpdate("agentFeePercent", v)}
              suffix="%"
              error={errors.agentFeePercent}
            />

            <Field
              label="Marginal tax rate % (flip)"
              value={numberValue(marginalTaxRatePercent)}
              onChange={(v) => onUpdate("marginalTaxRatePercent", v)}
              suffix="%"
              error={errors.marginalTaxRatePercent}
            />
          </>
        )}
      </div>
    </fieldset>
  );
}

export default PropertyDetailsForm;
