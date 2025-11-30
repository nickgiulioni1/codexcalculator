import { describe, expect, it } from "vitest";
import { calculateBuyHold } from "@/lib/calculator";

const baseRent = {
  modelCurrentVsFuture: false,
  isOccupied: false,
  currentMonthlyRent: 0,
  monthsUntilTenantLeaves: 0,
  targetMonthlyRent: 1000,
  annualRentGrowthPercent: 0,
  rehabPlanned: false,
  rehabTiming: "IMMEDIATE" as const,
  rehabLengthMonths: 0,
  asIsValue: 100000,
};

const zeroOps = {
  vacancyPercent: 0,
  repairsPercent: 0,
  capexPercent: 0,
  managementPercent: 0,
  taxesAnnual: 0,
  insuranceAnnual: 0,
  utilitiesMonthly: 0,
  otherMonthlyExpenses: 0,
};

describe("calculateBuyHold", () => {
  it("matches baseline stabilized scenario", () => {
    const result = calculateBuyHold({
      rent: baseRent,
      loan: {
        purchasePrice: 100000,
        downPaymentPercent: 25,
        interestRateAnnualPercent: 6,
        termYears: 30,
      },
      operating: zeroOps,
      arv: 100000,
      purchasePrice: 100000,
      annualAppreciationPercent: 0,
      months: 12,
      rehabTotal: 0,
    });

    expect(result.metrics.cashRequired).toBeCloseTo(25000, 0);
    expect(result.monthly[0].mortgage.payment).toBeCloseTo(449.66, 2);
    expect(result.annual[0].cashFlow).toBeCloseTo(6604, 0);
    expect(result.annual[0].dscr).toBeGreaterThan(2);
    const last = result.monthly[11];
    expect(last.equity).toBeCloseTo(25921, 0);
    expect(result.metrics.totalReturn).toBeCloseTo(
      (last?.equity ?? 0) + (last?.cumulativeCashFlow ?? 0),
      4,
    );
  });

  it("includes rehab in cash required for high-rehab scenario", () => {
    const result = calculateBuyHold({
      rent: { ...baseRent, targetMonthlyRent: 2000 },
      loan: {
        purchasePrice: 200000,
        downPaymentPercent: 25,
        interestRateAnnualPercent: 6.5,
        termYears: 30,
      },
      operating: zeroOps,
      arv: 200000,
      purchasePrice: 200000,
      annualAppreciationPercent: 0,
      months: 12,
      rehabTotal: 50000,
    });

    expect(result.metrics.cashRequired).toBeCloseTo(100000, 0);
    expect(result.metrics.cashRequiredBreakdown.rehab).toBeCloseTo(50000, 0);
    expect(result.monthly[0].cashFlow).toBeGreaterThan(0);
  });

  it("shows lower cash required but tighter DSCR at high leverage", () => {
    const baseline = calculateBuyHold({
      rent: baseRent,
      loan: {
        purchasePrice: 100000,
        downPaymentPercent: 25,
        interestRateAnnualPercent: 6,
        termYears: 30,
      },
      operating: zeroOps,
      arv: 100000,
      purchasePrice: 100000,
      annualAppreciationPercent: 0,
      months: 12,
      rehabTotal: 0,
    });

    const highLeverage = calculateBuyHold({
      rent: baseRent,
      loan: {
        purchasePrice: 100000,
        downPaymentPercent: 5,
        interestRateAnnualPercent: 6,
        termYears: 30,
      },
      operating: zeroOps,
      arv: 100000,
      purchasePrice: 100000,
      annualAppreciationPercent: 0,
      months: 12,
      rehabTotal: 0,
    });

    expect(highLeverage.metrics.cashRequired).toBeLessThan(baseline.metrics.cashRequired);
    expect(highLeverage.annual[0].dscr).toBeLessThan(baseline.annual[0].dscr);
    expect(highLeverage.monthly[0].mortgage.payment).toBeGreaterThan(
      baseline.monthly[0].mortgage.payment,
    );
  });

  it("applies rent appreciation for inherited tenants and stabilized phases", () => {
    const annualGrowth = 12;
    const result = calculateBuyHold({
      rent: {
        ...baseRent,
        modelCurrentVsFuture: true,
        isOccupied: true,
        currentMonthlyRent: 1000,
        monthsUntilTenantLeaves: 2,
        targetMonthlyRent: 1500,
        annualRentGrowthPercent: annualGrowth,
      },
      loan: {
        purchasePrice: 200000,
        downPaymentPercent: 25,
        interestRateAnnualPercent: 6,
        termYears: 30,
      },
      operating: zeroOps,
      arv: 200000,
      purchasePrice: 200000,
      annualAppreciationPercent: 0,
      months: 6,
      rehabTotal: 0,
    });

    const rents = result.monthly.map((m) => m.rent);
    // Month 2 should reflect growth on the current tenant; month 4 keeps growing after stabilization.
    expect(rents[1]).toBeGreaterThan(rents[0]);
    expect(rents[3]).toBeGreaterThan(rents[2]);
  });
});
