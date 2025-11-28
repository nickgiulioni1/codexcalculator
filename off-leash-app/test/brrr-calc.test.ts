import { describe, expect, it } from "vitest";
import { calculateBRRRR, type BRRRRInputs, RehabClass, calculateRehabTotal, rehabCatalog } from "@/lib/calculator";

const rehabTotal = calculateRehabTotal(
  rehabCatalog.map((item) => ({ itemId: item.id, quantity: item.defaultQuantity ?? 0, enabled: true })),
  RehabClass.RENTAL,
).total;

const base: BRRRRInputs = {
  rent: {
    modelCurrentVsFuture: true,
    isOccupied: true,
    currentMonthlyRent: 900,
    monthsUntilTenantLeaves: 2,
    targetMonthlyRent: 1600,
    rehabPlanned: true,
    rehabTiming: "AFTER_TENANT",
    rehabLengthMonths: 2,
    asIsValue: 200000,
  },
  operating: {
    vacancyPercent: 5,
    repairsPercent: 5,
    capexPercent: 5,
    managementPercent: 8,
    taxesAnnual: 3600,
    insuranceAnnual: 1200,
    utilitiesMonthly: 0,
    otherMonthlyExpenses: 100,
  },
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

describe("BRRRR engine", () => {
  it("computes coc post-refi based on cash required", () => {
    const result = calculateBRRRR(base);
    expect(result.metrics.coc).toBeDefined();
    expect(typeof result.metrics.coc).toBe("number");
    expect(result.metrics.cashRequired).toBeGreaterThan(0);
  });

  it("tracks value and refi amounts", () => {
    const result = calculateBRRRR(base);
    expect(result.valueAtRefi).toBeGreaterThan(0);
    expect(result.refinanceAmount).toBeGreaterThan(0);
    expect(result.payoffBridge).toBeGreaterThan(0);
  });

  it("rehab timeline moves refi month when delayed", () => {
    const delayed = calculateBRRRR({
      ...base,
      rent: { ...base.rent, monthsUntilTenantLeaves: 4, rehabTiming: "AFTER_TENANT" },
    });
    expect(delayed.refinanceMonth).toBeGreaterThan(base.rent.rehabLengthMonths + 1);
  });

  it("handles zero-interest bridge and yields carry as taxes/insurance only", () => {
    const zeroBridge = calculateBRRRR({
      ...base,
      bridge: { interestRateAnnualPercent: 0, pointsPercent: 0, closingCostsPercent: 0 },
    });
    expect(zeroBridge.bridgeInterest).toBe(0);
    expect(zeroBridge.metrics.cashRequiredBreakdown.carrying).toBeGreaterThan(0);
  });
});
