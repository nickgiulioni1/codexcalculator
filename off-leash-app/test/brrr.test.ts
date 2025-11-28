import { describe, expect, it } from "vitest";
import { calculateBRRRR, type BRRRRInputs, RehabClass, rehabCatalog, calculateRehabTotal } from "@/lib/calculator";

const baseRent = {
  modelCurrentVsFuture: true,
  isOccupied: false,
  currentMonthlyRent: 0,
  monthsUntilTenantLeaves: 0,
  targetMonthlyRent: 2000,
  rehabPlanned: true,
  rehabTiming: "IMMEDIATE" as const,
  rehabLengthMonths: 2,
  asIsValue: 200000,
};

const baseOp = {
  vacancyPercent: 5,
  repairsPercent: 5,
  capexPercent: 5,
  managementPercent: 8,
  taxesAnnual: 3600,
  insuranceAnnual: 1200,
  utilitiesMonthly: 0,
  otherMonthlyExpenses: 100,
};

const rehabTotal = calculateRehabTotal(
  rehabCatalog.map((item) => ({ itemId: item.id, quantity: item.defaultQuantity ?? 0, enabled: true })),
  RehabClass.RENTAL,
).total;

const baseInput: BRRRRInputs = {
  rent: baseRent,
  operating: baseOp,
  longTermLoan: {
    purchasePrice: 250000,
    downPaymentPercent: 25,
    interestRateAnnualPercent: 6.5,
    termYears: 30,
  },
  bridge: {
    interestRateAnnualPercent: 9,
    pointsPercent: 1,
    closingCostsPercent: 2,
  },
  refinanceLtvPercent: 75,
  purchasePrice: 250000,
  arv: 320000,
  rehabTotal,
  annualAppreciationPercent: 3,
  months: 24,
};

describe("calculateBRRRR", () => {
  it("computes refi month off rehab length and tenant timeline", () => {
    const result = calculateBRRRR(baseInput);
    expect(result.refinanceMonth).toBe(baseRent.rehabLengthMonths + 1);
  });

  it("includes rehab in cash required and bridge costs", () => {
    const result = calculateBRRRR(baseInput);
    expect(result.metrics.cashRequired).toBeGreaterThan(baseInput.rehabTotal);
    expect(result.metrics.cashRequiredBreakdown.rehab).toBe(baseInput.rehabTotal);
  });

  it("accrues bridge interest until refi month", () => {
    const result = calculateBRRRR(baseInput);
    expect(result.bridgeInterest).toBeGreaterThan(0);
  });

  it("produces positive cash out only if refi exceeds payoff", () => {
    const conservative = calculateBRRRR({ ...baseInput, arv: 200000 });
    expect(conservative.cashOut).toBe(0);
    const aggressive = calculateBRRRR({ ...baseInput, arv: 400000 });
    expect(aggressive.cashOut).toBeGreaterThan(0);
  });

  it("handles zero rehab / no-bridge-cost scenarios", () => {
    const noRehab = calculateBRRRR({
      ...baseInput,
      rent: { ...baseRent, rehabPlanned: false, rehabLengthMonths: 0 },
      rehabTotal: 0,
      bridge: { interestRateAnnualPercent: 0, pointsPercent: 0, closingCostsPercent: 0 },
    });
    expect(noRehab.bridgeInterest).toBe(0);
    expect(noRehab.metrics.cashRequiredBreakdown.rehab).toBe(0);
    expect(noRehab.refinanceMonth).toBeGreaterThanOrEqual(1);
  });
});
