"use client";

import { useMemo } from "react";
import {
  buildRentSchedule,
  calculateBuyHold,
  calculateBRRRR,
  calculateFlip,
  calculateFlipDetailed,
  calculateRehabTotal,
  type RentTimelineInputs,
  type BuyHoldOutputs,
  type BRRRRResult,
  type FlipResult,
  Strategy,
} from "../calculator";
import type { RehabSelection, RehabClass } from "../calculator/types";

export type FormState = RentTimelineInputs & {
  purchasePrice: number;
  arv: number | undefined;
  annualAppreciationPercent: number;
  monthsToSimulate: number;
  loan: {
    purchasePrice: number;
    downPaymentPercent: number;
    interestRateAnnualPercent: number;
    termYears: number;
    closingCostsPercent?: number;
    lenderPointsPercent?: number;
  };
  operating: {
    taxesAnnual: number;
    insuranceAnnual: number;
    repairsPercent: number;
    capexPercent: number;
    managementPercent: number;
    vacancyPercent: number;
    otherMonthlyExpenses?: number;
    utilitiesMonthly?: number;
  };
  strategy: Strategy;
  rehabClass: RehabClass;
  rehabSelections: RehabSelection[];
  includeRehabInCashRequired: boolean;
  bridgeRate: number;
  bridgeLtvPercent: number;
  bridgePointsPercent: number;
  bridgeClosingCostsPercent: number;
  includeRehabInBridge: boolean;
  refinanceLtvPercent: number;
  flipHoldMonths: number;
  sellingCostsPercent: number;
  agentFeePercent: number;
  marginalTaxRatePercent: number;
};

export type CalculatorResults = {
  rentResult: ReturnType<typeof buildRentSchedule>;
  rehabResult: ReturnType<typeof calculateRehabTotal>;
  buyHoldResult: BuyHoldOutputs;
  brrrResult: BRRRRResult;
  flipResult: FlipResult;
  flipDetailed: ReturnType<typeof calculateFlipDetailed>;
  asIsFallback: number;
  arvFallback: number;
  rehabLength: number;
};

/**
 * Custom hook that computes all calculator results from form state.
 * Memoizes each calculation independently for optimal performance.
 */
export function useCalculator(form: FormState): CalculatorResults {
  const asIsFallback = form.asIsValue ?? form.purchasePrice;
  const arvFallback = form.arv ?? form.purchasePrice;

  const rentResult = useMemo(() => {
    const rentInputs: RentTimelineInputs = {
      modelCurrentVsFuture: form.modelCurrentVsFuture,
      isOccupied: form.isOccupied,
      currentMonthlyRent: form.currentMonthlyRent,
      monthsUntilTenantLeaves: form.monthsUntilTenantLeaves,
      targetMonthlyRent: form.targetMonthlyRent,
      annualRentGrowthPercent: form.annualRentGrowthPercent,
      rehabPlanned: form.strategy === Strategy.FLIP ? true : form.rehabPlanned,
      rehabTiming: form.rehabTiming,
      rehabLengthMonths: form.rehabLengthMonths,
      asIsValue: form.asIsValue,
    };
    return buildRentSchedule(rentInputs, { months: form.monthsToSimulate });
  }, [
    form.modelCurrentVsFuture,
    form.isOccupied,
    form.currentMonthlyRent,
    form.monthsUntilTenantLeaves,
    form.targetMonthlyRent,
    form.annualRentGrowthPercent,
    form.strategy,
    form.rehabPlanned,
    form.rehabTiming,
    form.rehabLengthMonths,
    form.asIsValue,
    form.monthsToSimulate,
  ]);

  const phases = rentResult.phases;
  const rehabLength = phases.rehabEndMonth
    ? phases.rehabEndMonth - phases.rehabStartMonth + 1
    : 0;

  const rehabResult = useMemo(() => {
    return calculateRehabTotal(form.rehabSelections, form.rehabClass);
  }, [form.rehabClass, form.rehabSelections]);

  const buyHoldResult = useMemo(() => {
    return calculateBuyHold({
      rent: {
        modelCurrentVsFuture: form.modelCurrentVsFuture,
        isOccupied: form.isOccupied,
        currentMonthlyRent: form.currentMonthlyRent,
        monthsUntilTenantLeaves: form.monthsUntilTenantLeaves,
        targetMonthlyRent: form.targetMonthlyRent,
        annualRentGrowthPercent: form.annualRentGrowthPercent,
        rehabPlanned: form.strategy === Strategy.FLIP ? true : form.rehabPlanned,
        rehabTiming: form.rehabTiming,
        rehabLengthMonths: form.rehabLengthMonths,
        asIsValue: asIsFallback,
      },
      loan: { ...form.loan, purchasePrice: form.purchasePrice },
      operating: form.operating,
      arv: arvFallback,
      purchasePrice: form.purchasePrice,
      annualAppreciationPercent: form.annualAppreciationPercent,
      months: form.monthsToSimulate,
      rehabTotal: form.includeRehabInCashRequired ? rehabResult.total : 0,
    });
  }, [form, rehabResult.total, asIsFallback, arvFallback]);

  const brrrResult = useMemo(() => {
    return calculateBRRRR({
      rent: {
        modelCurrentVsFuture: form.modelCurrentVsFuture,
        isOccupied: form.isOccupied,
        currentMonthlyRent: form.currentMonthlyRent,
        monthsUntilTenantLeaves: form.monthsUntilTenantLeaves,
        targetMonthlyRent: form.targetMonthlyRent,
        annualRentGrowthPercent: form.annualRentGrowthPercent,
        rehabPlanned: form.strategy === Strategy.FLIP ? true : form.rehabPlanned,
        rehabTiming: form.rehabTiming,
        rehabLengthMonths: form.rehabLengthMonths,
        asIsValue: asIsFallback,
      },
      operating: form.operating,
      longTermLoan: { ...form.loan, purchasePrice: form.purchasePrice },
      bridge: {
        interestRateAnnualPercent: form.bridgeRate,
        pointsPercent: form.bridgePointsPercent,
        closingCostsPercent: form.bridgeClosingCostsPercent,
        ltvPercent: form.bridgeLtvPercent,
        includeRehabInBridge: form.includeRehabInBridge,
      },
      refinanceLtvPercent: form.refinanceLtvPercent,
      purchasePrice: form.purchasePrice,
      arv: arvFallback,
      rehabTotal: rehabResult.total,
      annualAppreciationPercent: form.annualAppreciationPercent,
      months: form.monthsToSimulate,
    });
  }, [form, rehabResult.total, asIsFallback, arvFallback]);

  const flipResult = useMemo(() => {
    return calculateFlip({
      rent: {
        modelCurrentVsFuture: form.modelCurrentVsFuture,
        isOccupied: form.isOccupied,
        currentMonthlyRent: form.currentMonthlyRent,
        monthsUntilTenantLeaves: form.monthsUntilTenantLeaves,
        targetMonthlyRent: form.targetMonthlyRent,
        annualRentGrowthPercent: form.annualRentGrowthPercent,
        rehabPlanned: true,
        rehabTiming: form.rehabTiming,
        rehabLengthMonths: form.rehabLengthMonths,
        asIsValue: asIsFallback,
      },
      purchasePrice: form.purchasePrice,
      arv: arvFallback,
      rehabTotal: rehabResult.total,
      rehabMonths: form.rehabLengthMonths,
      holdMonths: form.flipHoldMonths,
      bridge: {
        interestRateAnnualPercent: form.bridgeRate,
        pointsPercent: form.bridgePointsPercent,
        closingCostsPercent: form.bridgeClosingCostsPercent,
        ltvPercent: form.bridgeLtvPercent,
        includeRehabInBridge: form.includeRehabInBridge,
      },
      sellingCostsPercent: form.sellingCostsPercent,
      agentFeePercent: form.agentFeePercent,
      taxesMonthly: form.operating.taxesAnnual / 12,
      insuranceMonthly: form.operating.insuranceAnnual / 12,
      marginalTaxRatePercent: form.marginalTaxRatePercent,
    });
  }, [form, rehabResult.total, asIsFallback, arvFallback]);

  const flipDetailed = useMemo(() => {
    return calculateFlipDetailed({
      rent: {
        modelCurrentVsFuture: form.modelCurrentVsFuture,
        isOccupied: form.isOccupied,
        currentMonthlyRent: form.currentMonthlyRent,
        monthsUntilTenantLeaves: form.monthsUntilTenantLeaves,
        targetMonthlyRent: form.targetMonthlyRent,
        annualRentGrowthPercent: form.annualRentGrowthPercent,
        rehabPlanned: form.rehabPlanned,
        rehabTiming: form.rehabTiming,
        rehabLengthMonths: form.rehabLengthMonths,
        asIsValue: asIsFallback,
      },
      purchasePrice: form.purchasePrice,
      arv: arvFallback,
      rehabTotal: rehabResult.total,
      rehabMonths: form.rehabLengthMonths,
      holdMonths: form.flipHoldMonths,
      bridge: {
        interestRateAnnualPercent: form.bridgeRate,
        pointsPercent: form.bridgePointsPercent,
        closingCostsPercent: form.bridgeClosingCostsPercent,
        ltvPercent: form.bridgeLtvPercent,
        includeRehabInBridge: form.includeRehabInBridge,
      },
      sellingCostsPercent: form.sellingCostsPercent,
      agentFeePercent: form.agentFeePercent,
      taxesMonthly: form.operating.taxesAnnual / 12,
      insuranceMonthly: form.operating.insuranceAnnual / 12,
      marginalTaxRatePercent: form.marginalTaxRatePercent,
    });
  }, [form, rehabResult.total, asIsFallback, arvFallback]);

  return {
    rentResult,
    rehabResult,
    buyHoldResult,
    brrrResult,
    flipResult,
    flipDetailed,
    asIsFallback,
    arvFallback,
    rehabLength,
  };
}
