import { deriveTimeline } from "./timeline";
import type { RehabPhase, RentTimelineInputs } from "./types";

export type RentPhase = "CURRENT" | "REHAB" | "STABILIZED";

export type RentEntry = {
  month: number;
  phase: RentPhase;
  rent: number;
};

export type RentScheduleResult = {
  schedule: RentEntry[];
  phases: RehabPhase;
  /** Total rent collected in the schedule window. */
  totalRent: number;
  /** Months where rent is zero (vacancy or rehab). */
  zeroMonths: number;
};

type RentScheduleOptions = {
  months?: number;
  /**
   * Optional growth factors per month for current and stabilized phases.
   * Defaults to 1 (flat) to avoid speculative inflation beyond the PRD snippet.
   */
  currentGrowth?: (month: number) => number;
  futureGrowth?: (month: number) => number;
};

/**
  * Build a rent schedule following PRD 6.X rules:
  * - Current phase: months 1..M_tenant, rent only if occupied.
  * - Rehab phase: rent forced to 0.
  * - Stabilized phase: target rent from month rehabEnd+1 (or tenantMonths+1 if no rehab).
  */
export function buildRentSchedule(
  inputs: RentTimelineInputs,
  options: RentScheduleOptions = {},
): RentScheduleResult {
  const months = options.months ?? 12;
  const currentGrowth = options.currentGrowth ?? (() => 1);
  const futureGrowth = options.futureGrowth ?? (() => 1);
  const phases = deriveTimeline(inputs);

  const schedule: RentEntry[] = [];

  for (let month = 1; month <= months; month++) {
    let phase: RentPhase = "STABILIZED";
    let rent = inputs.targetMonthlyRent * futureGrowth(month);

    if (inputs.modelCurrentVsFuture && month <= phases.tenantMonths) {
      phase = "CURRENT";
      rent = inputs.isOccupied ? inputs.currentMonthlyRent * currentGrowth(month) : 0;
    } else if (
      inputs.rehabPlanned &&
      phases.rehabStartMonth > 0 &&
      month >= phases.rehabStartMonth &&
      month <= phases.rehabEndMonth
    ) {
      phase = "REHAB";
      rent = 0;
    } else if (inputs.modelCurrentVsFuture === false && month === 1) {
      phase = "STABILIZED";
      rent = inputs.targetMonthlyRent;
    }

    schedule.push({ month, phase, rent });
  }

  const totalRent = schedule.reduce((sum, entry) => sum + entry.rent, 0);
  const zeroMonths = schedule.filter((entry) => entry.rent === 0).length;

  return { schedule, phases, totalRent, zeroMonths };
}
