import { deriveTimeline } from "./timeline";
import type {
  PropertyValueInputs,
  PropertyValueResult,
} from "./types";

const monthlyFromAnnual = (annualPercent: number) =>
  Math.pow(1 + annualPercent / 100, 1 / 12) - 1;

/**
 * Build property value schedule using PRD 6.X rules.
 *
 * - Up to rehabEndMonth: as-is value appreciates monthly.
 * - At rehabEndMonth + 1: value = ARV.
 * - Beyond: ARV appreciates monthly using same rate.
 * - If no rehab is planned, property simply appreciates from as-is/purchase.
 */
export function buildPropertyValueSchedule(
  inputs: PropertyValueInputs,
  months: number,
): PropertyValueResult {
  const phases = deriveTimeline(inputs);
  const monthlyRate = monthlyFromAnnual(inputs.annualAppreciationPercent);
  const asIsValue = inputs.asIsValue ?? inputs.purchasePrice;
  const values: PropertyValueResult["values"] = [];

  for (let month = 1; month <= months; month++) {
    let value: number;

    if (inputs.rehabPlanned && phases.rehabEndMonth > 0) {
      if (month <= phases.rehabEndMonth) {
        value = asIsValue * Math.pow(1 + monthlyRate, month);
      } else if (month === phases.rehabEndMonth + 1) {
        value = inputs.arv;
      } else {
        const monthsPostArv = month - (phases.rehabEndMonth + 1);
        value = inputs.arv * Math.pow(1 + monthlyRate, monthsPostArv);
      }
    } else {
      // No rehab: appreciate from as-is/purchase without ARV step.
      value = asIsValue * Math.pow(1 + monthlyRate, month);
    }

    values.push({ month, value });
  }

  return { values, monthlyAppreciationRate: monthlyRate };
}
