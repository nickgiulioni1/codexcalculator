import { deriveTimeline } from "./timeline";
import type { FlipInputs } from "./types";
import { buildRentSchedule } from "./rent";

const pct = (v: number) => v / 100;

export type FlipDetailedResult = {
  monthsFinanced: number;
  bridgePrincipal: number;
  points: number;
  closing: number;
  interest: number;
  carrying: number;
  agentFee: number;
  sellingCosts: number;
  projectCost: number;
  equityRequired: number;
  cashInvested: number;
  totalCosts: number;
  netProfit: number;
  roi: number;
  cashOnCashRoi: number;
  taxOnProfit: number;
  profitAfterTax: number;
  roiAfterTax: number;
  saleMonth: number;
  salePrice: number;
};

export function calculateFlipDetailed(inputs: FlipInputs): FlipDetailedResult {
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
  const rehabDuration = phases.rehabEndMonth
    ? phases.rehabEndMonth - phases.rehabStartMonth + 1
    : inputs.rehabMonths;
  const monthsFinanced = rehabDuration + inputs.holdMonths + phases.tenantMonths;

  const ltv = pct(inputs.bridge.ltvPercent ?? 100);
  const financedPurchase = inputs.purchasePrice * ltv;
  const financedRehab = (inputs.bridge.includeRehabInBridge ?? true) ? inputs.rehabTotal * ltv : 0;
  const bridgePrincipal = financedPurchase + financedRehab;
  const points = (inputs.bridge.pointsPercent ?? 0) * bridgePrincipal / 100;
  const closing = (inputs.bridge.closingCostsPercent ?? 0) * inputs.purchasePrice / 100;
  const monthlyRate = pct(inputs.bridge.interestRateAnnualPercent) / 12;

  let outstanding = financedPurchase;
  const monthlyRehabDraw = rehabDuration > 0 ? financedRehab / rehabDuration : financedRehab;
  let interest = 0;

  for (let month = 1; month <= monthsFinanced; month++) {
    if (
      (inputs.bridge.includeRehabInBridge ?? true) &&
      rehabDuration > 0 &&
      month >= phases.rehabStartMonth &&
      month <= phases.rehabEndMonth
    ) {
      outstanding += monthlyRehabDraw;
    }

    interest += outstanding * monthlyRate;
  }

  const op = {
    vacancyPercent: 0,
    repairsPercent: 0,
    capexPercent: 0,
    managementPercent: 0,
    taxesAnnual: inputs.taxesMonthly * 12,
    insuranceAnnual: inputs.insuranceMonthly * 12,
    utilitiesMonthly: 0,
    otherMonthlyExpenses: 0,
    ...(inputs.operating ?? {}),
  };

  const rentSchedule = buildRentSchedule(rent, { months: monthsFinanced });
  let carrying = 0;

  for (let i = 0; i < monthsFinanced; i++) {
    const entry = rentSchedule.schedule[i];
    const taxes = op.taxesAnnual / 12;
    const insurance = op.insuranceAnnual / 12;
    const utilities = op.utilitiesMonthly ?? 0;
    const other = op.otherMonthlyExpenses ?? 0;
    const vacancy = entry?.rent ? entry.rent * pct(op.vacancyPercent) : 0;
    const repairs = entry?.rent ? entry.rent * pct(op.repairsPercent) : 0;
    const capex = entry?.rent ? entry.rent * pct(op.capexPercent) : 0;
    const management = entry?.rent ? entry.rent * pct(op.managementPercent) : 0;

    const expensesSum = taxes + insurance + utilities + other + vacancy + repairs + capex + management;
    const netCarry = expensesSum - (entry?.rent ?? 0);
    carrying += netCarry;
  }

  const agentFee = inputs.arv * pct(inputs.agentFeePercent);
  const sellingCosts = inputs.arv * pct(inputs.sellingCostsPercent);

  const projectCost = inputs.purchasePrice + inputs.rehabTotal;
  const equityRequired = Math.max(projectCost - bridgePrincipal, 0);
  const cashInvested = Math.max(equityRequired + points + closing + interest + carrying, 0);
  const totalCosts = projectCost + points + closing + interest + carrying + agentFee + sellingCosts;
  const netProfit = inputs.arv - totalCosts;
  const roi = totalCosts ? netProfit / totalCosts : 0;
  const cashOnCashRoi = cashInvested ? netProfit / cashInvested : 0;
  const taxRate = pct(inputs.marginalTaxRatePercent ?? 0);
  const taxOnProfit = netProfit > 0 ? netProfit * taxRate : 0;
  const profitAfterTax = netProfit - taxOnProfit;
  const roiAfterTax = totalCosts ? profitAfterTax / totalCosts : 0;

  return {
    monthsFinanced,
    bridgePrincipal,
    points,
    closing,
    interest,
    carrying,
    agentFee,
    sellingCosts,
    projectCost,
    equityRequired,
    cashInvested,
    totalCosts,
    netProfit,
    roi,
    cashOnCashRoi,
    taxOnProfit,
    profitAfterTax,
    roiAfterTax,
    saleMonth: monthsFinanced,
    salePrice: inputs.arv,
  };
}
