import { deriveTimeline } from "./timeline";
import type { FlipInputs, FlipResult } from "./types";

const pct = (v: number) => v / 100;

export function calculateFlip(inputs: FlipInputs): FlipResult {
  const rent = inputs.rent ?? {
    modelCurrentVsFuture: false,
    isOccupied: false,
    currentMonthlyRent: 0,
    monthsUntilTenantLeaves: 0,
    targetMonthlyRent: 0,
    annualRentGrowthPercent: 0,
    rehabPlanned: true,
    rehabTiming: "IMMEDIATE",
    rehabLengthMonths: inputs.rehabMonths,
    asIsValue: inputs.purchasePrice,
  };

  const phases = deriveTimeline(rent);
  const rehabDuration = phases.rehabEndMonth ? phases.rehabEndMonth - phases.rehabStartMonth + 1 : inputs.rehabMonths;
  const monthsFinanced = rehabDuration + inputs.holdMonths + phases.tenantMonths;

  const bridgeBase = inputs.purchasePrice + (inputs.bridge.includeRehabInBridge ?? true ? inputs.rehabTotal : 0);
  const bridgePrincipal = bridgeBase * (inputs.bridge.ltvPercent ?? 100) / 100;
  const points = (inputs.bridge.pointsPercent ?? 0) * bridgePrincipal / 100;
  const closing = (inputs.bridge.closingCostsPercent ?? 0) * inputs.purchasePrice / 100;
  const monthlyRate = pct(inputs.bridge.interestRateAnnualPercent) / 12;
  const interest = bridgePrincipal * monthlyRate * monthsFinanced;

  const carrying = (inputs.taxesMonthly + inputs.insuranceMonthly) * monthsFinanced;

  const agentFee = inputs.arv * pct(inputs.agentFeePercent);
  const sellingCosts = inputs.arv * pct(inputs.sellingCostsPercent);

  // Total project cost should reflect the full spend (purchase + rehab),
  // regardless of how much is financed, plus all financing and selling costs.
  const projectCost = inputs.purchasePrice + inputs.rehabTotal;
  const totalCosts = projectCost + points + closing + interest + carrying + agentFee + sellingCosts;
  const netProfit = inputs.arv - totalCosts;
  const roi = totalCosts ? netProfit / totalCosts : 0;
  const taxRate = pct(inputs.marginalTaxRatePercent ?? 0);
  const taxOnProfit = netProfit > 0 ? netProfit * taxRate : 0;
  const profitAfterTax = netProfit - taxOnProfit;
  const roiAfterTax = totalCosts ? profitAfterTax / totalCosts : 0;

  return {
    saleMonth: monthsFinanced,
    salePrice: inputs.arv,
    totalCosts,
    netProfit,
    roi,
    profitAfterTax,
    taxOnProfit,
    roiAfterTax,
  };
}
