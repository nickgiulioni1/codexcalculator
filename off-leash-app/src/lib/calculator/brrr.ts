import { buildAmortization, buildPropertyValueSchedule, buildRentSchedule } from ".";
import type { AnnualSummary, BRRRRInputs, BRRRRResult } from "./types";

const pct = (v: number) => v / 100;

export function calculateBRRRR(inputs: BRRRRInputs): BRRRRResult {
  const rentSchedule = buildRentSchedule(inputs.rent, { months: inputs.months });
  const phases = rentSchedule.phases;
  const refinanceMonth = phases.refinanceMonth ?? phases.stabilizedMonth ?? 1;

  const op = inputs.operating ?? {
    vacancyPercent: 0,
    repairsPercent: 0,
    capexPercent: 0,
    managementPercent: 0,
    taxesAnnual: 0,
    insuranceAnnual: 0,
    utilitiesMonthly: 0,
    otherMonthlyExpenses: 0,
  };

  const bridgeBase = inputs.purchasePrice + (inputs.bridge.includeRehabInBridge ?? true ? inputs.rehabTotal : 0);
  const bridgePrincipal = bridgeBase * (inputs.bridge.ltvPercent ?? 100) / 100;
  const bridgePoints = (inputs.bridge.pointsPercent ?? 0) * bridgePrincipal / 100;
  const bridgeClosing = (inputs.bridge.closingCostsPercent ?? 0) * inputs.purchasePrice / 100;
  const monthlyBridgeRate = pct(inputs.bridge.interestRateAnnualPercent) / 12;

  const propertyValues = buildPropertyValueSchedule(
    {
      ...inputs.rent,
      arv: inputs.arv,
      purchasePrice: inputs.purchasePrice,
      annualAppreciationPercent: inputs.annualAppreciationPercent,
    },
    inputs.months,
  );

  let bridgeInterest = 0;
  for (let m = 1; m < refinanceMonth; m++) {
    bridgeInterest += bridgePrincipal * monthlyBridgeRate;
  }
  const monthlyCarry =
    op.taxesAnnual / 12 +
    op.insuranceAnnual / 12 +
    (op.utilitiesMonthly ?? 0) +
    (op.otherMonthlyExpenses ?? 0);
  const carryingCosts = monthlyCarry * Math.max(refinanceMonth - 1, 0);

  const valueAtRefi = propertyValues.values.find((v) => v.month === refinanceMonth)?.value ?? inputs.arv;
  const refinanceAmount = valueAtRefi * pct(inputs.refinanceLtvPercent);
  const payoffBridge = bridgePrincipal + bridgeInterest;
  const cashOut = Math.max(refinanceAmount - payoffBridge, 0);

  const longTermLoanAmount = refinanceAmount;
  const amort = buildAmortization({
    principal: longTermLoanAmount,
    annualRatePercent: inputs.longTermLoan.interestRateAnnualPercent,
    termMonths: inputs.longTermLoan.termYears * 12,
  });

  const monthly: BRRRRResult["monthly"] = [];
  let cumulativeCashFlow = 0;
  let cumulativeCashFlowPostRefi = 0;

  for (let i = 0; i < inputs.months; i++) {
    const month = i + 1;
    const rent = rentSchedule.schedule[i]?.rent ?? 0;

    const vacancy = rent * pct(op.vacancyPercent);
    const repairs = rent * pct(op.repairsPercent);
    const capex = rent * pct(op.capexPercent);
    const management = rent * pct(op.managementPercent);
    const taxes = op.taxesAnnual / 12;
    const insurance = op.insuranceAnnual / 12;
    const utilities = op.utilitiesMonthly ?? 0;
    const other = op.otherMonthlyExpenses ?? 0;

    const mortgage =
      month >= refinanceMonth
        ? amort.schedule[Math.min(month - refinanceMonth, amort.schedule.length - 1)]
        : {
            month,
            payment: bridgePrincipal * monthlyBridgeRate,
            principal: 0,
            interest: bridgePrincipal * monthlyBridgeRate,
            balance: bridgePrincipal,
          };

    const expensesSum =
      vacancy + repairs + capex + management + taxes + insurance + utilities + other;

    const cashFlow = rent - expensesSum - mortgage.payment;
    cumulativeCashFlow += cashFlow;
    if (month >= refinanceMonth) {
      cumulativeCashFlowPostRefi += cashFlow;
    }
    const propertyValue = propertyValues.values[i]?.value ?? valueAtRefi;
    const equity = propertyValue - mortgage.balance;

    monthly.push({
      month,
      rent,
      expenses: {
        vacancy,
        repairs,
        capex,
        management,
        taxes,
        insurance,
        utilities,
        other,
      },
      mortgage,
      cashFlow,
      cumulativeCashFlow,
      propertyValue,
      equity,
    });
  }

  // Annual summary (simple aggregation)
  const annual: AnnualSummary[] = [];
  const monthsPerYear = 12;
  const totalYears = Math.ceil(inputs.months / monthsPerYear);
  for (let year = 1; year <= totalYears; year++) {
    const slice = monthly.slice((year - 1) * monthsPerYear, year * monthsPerYear);
    if (!slice.length) break;
    const noi = slice.reduce((sum, m) => sum + (m.rent - (m.expenses.vacancy + m.expenses.repairs + m.expenses.capex + m.expenses.management + m.expenses.utilities + m.expenses.other + m.expenses.taxes + m.expenses.insurance)), 0);
    const debtService = slice.reduce((sum, m) => sum + m.mortgage.payment, 0);
    const principalPaid = slice.reduce((sum, m) => sum + m.mortgage.principal, 0);
    const cashFlow = slice.reduce((sum, m) => sum + m.cashFlow, 0);
    const appreciation = Math.max(0, slice[slice.length - 1].propertyValue - slice[0].propertyValue);
    const endingEquity = slice[slice.length - 1].equity;
    annual.push({
      year,
      noi,
      cashFlow,
      debtService,
      principalPaid,
      appreciation,
      endingEquity,
      cashOnCash: 0,
      capRate: 0,
      dscr: debtService ? noi / debtService : 0,
    });
  }

  const cashRequired = bridgeClosing + bridgePoints + inputs.rehabTotal;
  const totalCashRequired = cashRequired + bridgeInterest + carryingCosts;
  const coc = cashRequired ? cumulativeCashFlowPostRefi / cashRequired : 0;

  return {
    monthly,
    annual,
    metrics: {
      cashRequired: totalCashRequired,
      cashRequiredBreakdown: {
        downPayment: 0,
        closingCosts: bridgeClosing,
        lenderPoints: bridgePoints,
        rehab: inputs.rehabTotal,
        carrying: carryingCosts + bridgeInterest,
      },
      totalReturn: (monthly[monthly.length - 1]?.equity ?? 0) + (monthly[monthly.length - 1]?.cumulativeCashFlow ?? 0),
      dscr: annual[0]?.dscr,
      coc,
    },
    refinanceMonth,
    bridgeInterest,
    cashOut,
    valueAtRefi,
    refinanceAmount,
    payoffBridge,
    carryingCosts: carryingCosts + bridgeInterest,
  };
}
