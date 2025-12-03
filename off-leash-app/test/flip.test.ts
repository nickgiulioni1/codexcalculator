import { describe, expect, it } from "vitest";
import { calculateFlip, RehabClass, calculateRehabTotal, rehabCatalog } from "@/lib/calculator";

const rehabTotal = calculateRehabTotal(
  rehabCatalog.map((item) => ({ itemId: item.id, quantity: item.defaultQuantity ?? 0, enabled: true })),
  RehabClass.FLIP,
).total;

const baseRent = {
  modelCurrentVsFuture: true,
  isOccupied: true,
  currentMonthlyRent: 1200,
  monthsUntilTenantLeaves: 2,
  targetMonthlyRent: 2000,
  annualRentGrowthPercent: 0,
  rehabPlanned: true,
  rehabTiming: "AFTER_TENANT" as const,
  rehabLengthMonths: 2,
  asIsValue: 200000,
};

describe("calculateFlip", () => {
  it("extends financed months by tenant + rehab + hold", () => {
    const result = calculateFlip({
      rent: baseRent,
      purchasePrice: 250000,
      arv: 320000,
      rehabTotal,
      rehabMonths: baseRent.rehabLengthMonths,
      holdMonths: 2,
      bridge: {
        interestRateAnnualPercent: 9,
        pointsPercent: 1,
        closingCostsPercent: 2,
        ltvPercent: 100,
        includeRehabInBridge: true,
      },
      sellingCostsPercent: 2,
      agentFeePercent: 5,
      taxesMonthly: 300,
      insuranceMonthly: 100,
    });

    // months financed = tenant (2) + rehab (2) + hold (2) = 6
    expect(result.saleMonth).toBe(6);
  });

  it("yields ROI based on ARV and total costs", () => {
    const result = calculateFlip({
      rent: baseRent,
      purchasePrice: 200000,
      arv: 250000,
      rehabTotal: 20000,
      rehabMonths: 2,
      holdMonths: 1,
      bridge: {
        interestRateAnnualPercent: 10,
        pointsPercent: 1,
        closingCostsPercent: 2,
      },
      sellingCostsPercent: 2,
      agentFeePercent: 5,
      taxesMonthly: 250,
      insuranceMonthly: 90,
      marginalTaxRatePercent: 25,
    });
    expect(result.totalCosts).toBeGreaterThan(0);
    // Allow negative profit in unfavorable scenarios, but ROI math should match.
    expect(result.roi).toBeCloseTo(result.netProfit / result.totalCosts, 5);
    expect(result.cashOnCashRoi).toBeCloseTo(
      result.cashInvested ? result.netProfit / result.cashInvested : 0,
      5,
    );
    expect(result.taxOnProfit).toBeGreaterThanOrEqual(0);
    expect(result.roiAfterTax).toBeCloseTo(result.profitAfterTax / result.totalCosts, 5);
    // Profit after tax should reflect marginal rate on positive profit
    if (result.netProfit > 0) {
      expect(result.profitAfterTax).toBeCloseTo(result.netProfit * 0.75, 0);
    }
  });

  it("does not tax negative profit", () => {
    const result = calculateFlip({
      rent: baseRent,
      purchasePrice: 300000,
      arv: 310000,
      rehabTotal: 40000,
      rehabMonths: 2,
      holdMonths: 1,
      bridge: {
        interestRateAnnualPercent: 9,
        pointsPercent: 1,
        closingCostsPercent: 2,
      },
      sellingCostsPercent: 2,
      agentFeePercent: 5,
      taxesMonthly: 250,
      insuranceMonthly: 90,
      marginalTaxRatePercent: 30,
    });
    expect(result.netProfit).toBeLessThanOrEqual(0);
    expect(result.taxOnProfit).toBe(0);
    expect(result.profitAfterTax).toBe(result.netProfit);
  });

  it("includes full project cost even when rehab is not financed and ltv < 100%", () => {
    const result = calculateFlip({
      rent: { ...baseRent, isOccupied: false, monthsUntilTenantLeaves: 0 },
      purchasePrice: 200000,
      arv: 300000,
      rehabTotal: 50000,
      rehabMonths: 2,
      holdMonths: 1,
      bridge: {
        interestRateAnnualPercent: 12,
        pointsPercent: 1,
        closingCostsPercent: 2,
        ltvPercent: 80,
        includeRehabInBridge: false,
      },
      sellingCostsPercent: 2,
      agentFeePercent: 5,
      taxesMonthly: 0,
      insuranceMonthly: 0,
    });

    // Bridge finances 80% of purchase only (160k); rehab is paid in cash and rent offsets carry in month 3.
    expect(result.saleMonth).toBe(3);
    expect(result.bridgeInterest).toBeCloseTo(4800, 0);
    expect(result.carryingCosts).toBeLessThan(0); // stabilized rent offsets taxes/insurance
    expect(result.equityRequired).toBeCloseTo(90000, 0);
    expect(result.roi).toBeCloseTo(result.netProfit / result.totalCosts, 5);
    expect(result.cashOnCashRoi).toBeCloseTo(
      result.cashInvested ? result.netProfit / result.cashInvested : 0,
      5,
    );
  });
});
