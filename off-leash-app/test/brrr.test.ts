import { describe, expect, it } from "vitest";
import { calculateBRRRR, type BRRRRInputs, RehabClass, rehabCatalog, calculateRehabTotal } from "@/lib/calculator";

const baseRent = {
  modelCurrentVsFuture: true,
  isOccupied: false,
  currentMonthlyRent: 0,
  monthsUntilTenantLeaves: 0,
  targetMonthlyRent: 2000,
  annualRentGrowthPercent: 0,
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
    ltvPercent: 100,
    includeRehabInBridge: true,
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

  it("captures bridge, carrying, and rehab cash requirements", () => {
    const result = calculateBRRRR(baseInput);
    const breakdown = result.metrics.cashRequiredBreakdown;
    const reconstructed =
      (breakdown.downPayment ?? 0) +
      (breakdown.closingCosts ?? 0) +
      (breakdown.lenderPoints ?? 0) +
      (breakdown.rehab ?? 0) +
      (breakdown.carrying ?? 0);
    expect(result.metrics.cashRequired).toBeCloseTo(reconstructed, 2);
    // Base scenario finances rehab in the bridge, so rehab cash should be zero.
    expect(result.metrics.cashRequiredBreakdown.rehab).toBe(0);
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

  it("includes equity gap when bridge ltv < 100% and rehab is financed", () => {
    const ltv80 = calculateBRRRR({
      ...baseInput,
      purchasePrice: 200000,
      arv: 260000,
      rehabTotal: 50000,
      bridge: {
        interestRateAnnualPercent: 12,
        pointsPercent: 0,
        closingCostsPercent: 0,
        ltvPercent: 80,
        includeRehabInBridge: true,
      },
      months: 12,
    });
    // Bridge finances 80% of purchase + rehab => principal 200k, equity gap 50k.
    expect(ltv80.metrics.cashRequiredBreakdown.downPayment).toBeCloseTo(50000, 0);
    expect(ltv80.metrics.cashRequiredBreakdown.rehab).toBe(0);
    // Interest for two months before refi (rehab length 2) at 1% monthly on 200k plus carrying.
    expect(ltv80.metrics.cashRequired).toBeCloseTo(55000, 0);
  });

  it("treats rehab as cash when not included in bridge base", () => {
    const rehabCash = calculateBRRRR({
      ...baseInput,
      purchasePrice: 200000,
      arv: 260000,
      rehabTotal: 50000,
      bridge: {
        interestRateAnnualPercent: 12,
        pointsPercent: 0,
        closingCostsPercent: 0,
        ltvPercent: 80,
        includeRehabInBridge: false,
      },
      months: 12,
    });
    // Bridge only finances purchase at 80% => principal 160k; rehab is cash.
    expect(rehabCash.metrics.cashRequiredBreakdown.downPayment).toBeCloseTo(40000, 0);
    expect(rehabCash.metrics.cashRequiredBreakdown.rehab).toBeCloseTo(50000, 0);
    // Cash required should reflect equity + rehab + interest (two months at 1% on 160k) + carrying.
    expect(rehabCash.metrics.cashRequired).toBeCloseTo(94200, 0);
  });

  it("applies rent appreciation before and after rehab/refi", () => {
    const annualGrowth = 10;
    const appreciating = calculateBRRRR({
      ...baseInput,
      rent: {
        ...baseRent,
        isOccupied: true,
        currentMonthlyRent: 1200,
        monthsUntilTenantLeaves: 2,
        annualRentGrowthPercent: annualGrowth,
      },
      months: 12,
    });

    const rents = appreciating.monthly.map((m) => m.rent);
    expect(rents[1]).toBeGreaterThan(rents[0]); // current tenant growth
    expect(rents[2]).toBe(0); // rehab pause
    expect(rents[3]).toBe(0); // rehab pause
    expect(rents[4]).toBeGreaterThan(0); // stabilized restart with appreciation applied
    expect(rents[5]).toBeGreaterThan(rents[4]); // growth continues post-rehab
  });
});
