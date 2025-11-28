import type { RehabPhase, RentTimelineInputs } from "./types";

/**
 * Derive the month boundaries for current, rehab, and stabilized phases.
 * Mirrors PRD 6.X semantics and stays deterministic for the calculator engine.
 */
export function deriveTimeline(inputs: RentTimelineInputs): RehabPhase {
  const tenantMonths = inputs.modelCurrentVsFuture
    ? Math.max(inputs.monthsUntilTenantLeaves, 0)
    : 0;

  const rehabTimingForcedAfterTenant =
    inputs.modelCurrentVsFuture && inputs.isOccupied;

  const rehabPlanned = inputs.rehabPlanned && inputs.rehabLengthMonths > 0;
  const rehabAfterTenant =
    rehabTimingForcedAfterTenant ||
    (inputs.modelCurrentVsFuture && inputs.rehabTiming === "AFTER_TENANT");

  const rehabStartMonth = rehabPlanned
    ? rehabAfterTenant
      ? tenantMonths + 1
      : 1
    : tenantMonths + 1;

  const rehabEndMonth = rehabPlanned
    ? rehabStartMonth + inputs.rehabLengthMonths - 1
    : tenantMonths;

  const stabilizedMonth = rehabPlanned
    ? rehabEndMonth + 1
    : tenantMonths + 1;

  return {
    tenantMonths,
    rehabStartMonth,
    rehabEndMonth,
    stabilizedMonth,
    refinanceMonth: rehabEndMonth + 1,
  };
}
