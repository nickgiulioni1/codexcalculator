/**
 * @module buyHold
 * Buy & Hold investment strategy calculator.
 * Generates monthly cash flows, annual summaries, and key metrics
 * for long-term rental property investments.
 */

import {
  buildAmortization,
  buildPropertyValueSchedule,
  buildRentSchedule,
} from "./";
import type {
  AnnualSummary,
  BuyHoldInputs,
  BuyHoldOutputs,
  MonthlyResult,
} from "./types";

/**
 * Converts a percentage to a decimal.
 * @param value - Percentage value (e.g., 25 for 25%)
 * @returns Decimal value (e.g., 0.25)
 */
const pct = (value: number) => value / 100;

/**
 * Calculates comprehensive Buy & Hold investment analysis.
 *
 * This function performs a complete rental property analysis including:
 * - Cash required calculation (down payment, closing costs, points, rehab)
 * - Monthly cash flow projections with phase-aware rent scheduling
 * - Property appreciation and equity building
 * - Annual summaries with key performance metrics (DSCR, Cap Rate, CoC)
 *
 * @param inputs - Complete input parameters for the analysis
 * @returns Object containing monthly results, annual summaries, and key metrics
 *
 * @example
 * const result = calculateBuyHold({
 *   rent: {
 *     modelCurrentVsFuture: false,
 *     isOccupied: false,
 *     currentMonthlyRent: 0,
 *     monthsUntilTenantLeaves: 0,
 *     targetMonthlyRent: 2500,
 *     rehabPlanned: false,
 *     rehabTiming: "IMMEDIATE",
 *     rehabLengthMonths: 0,
 *   },
 *   loan: {
 *     purchasePrice: 300000,
 *     downPaymentPercent: 25,
 *     interestRateAnnualPercent: 6.5,
 *     termYears: 30,
 *     closingCostsPercent: 2.5,
 *     lenderPointsPercent: 1,
 *   },
 *   operating: {
 *     taxesAnnual: 4000,
 *     insuranceAnnual: 1200,
 *     repairsPercent: 5,
 *     capexPercent: 5,
 *     managementPercent: 10,
 *     vacancyPercent: 5,
 *   },
 *   arv: 300000,
 *   purchasePrice: 300000,
 *   annualAppreciationPercent: 3,
 *   months: 60,
 * });
 *
 * console.log(result.metrics.cashRequired); // Total cash needed
 * console.log(result.annual[0].cashOnCash); // Year 1 CoC return
 */
export function calculateBuyHold(inputs: BuyHoldInputs): BuyHoldOutputs {
  const loanAmount =
    inputs.purchasePrice * (1 - pct(inputs.loan.downPaymentPercent));
  const closingCosts =
    (inputs.loan.closingCostsPercent ?? 0) * inputs.purchasePrice / 100;
  const lenderPoints =
    (inputs.loan.lenderPointsPercent ?? 0) * loanAmount / 100;
  const baseCashRequired = inputs.purchasePrice - loanAmount + closingCosts + lenderPoints;
  const cashRequiredBreakdown = {
    downPayment: inputs.purchasePrice - loanAmount,
    closingCosts,
    lenderPoints,
    rehab: inputs.rehabTotal,
  };
  const cashRequired = baseCashRequired + (inputs.rehabTotal ?? 0);

  const amortization = buildAmortization({
    principal: loanAmount,
    annualRatePercent: inputs.loan.interestRateAnnualPercent,
    termMonths: inputs.loan.termYears * 12,
  });

  const rentResult = buildRentSchedule(inputs.rent, { months: inputs.months });
  const propertyValues = buildPropertyValueSchedule(
    {
      ...inputs.rent,
      arv: inputs.arv,
      purchasePrice: inputs.purchasePrice,
      annualAppreciationPercent: inputs.annualAppreciationPercent,
    },
    inputs.months,
  );

  const monthly: MonthlyResult[] = [];

  for (let i = 0; i < inputs.months; i++) {
    const month = i + 1;
    const rent = rentResult.schedule[i]?.rent ?? 0;

    const vacancy = rent * pct(inputs.operating.vacancyPercent);
    const repairs = rent * pct(inputs.operating.repairsPercent);
    const capex = rent * pct(inputs.operating.capexPercent);
    const management = rent * pct(inputs.operating.managementPercent);
    const taxes = inputs.operating.taxesAnnual / 12;
    const insurance = inputs.operating.insuranceAnnual / 12;
    const utilities = inputs.operating.utilitiesMonthly ?? 0;
    const other = inputs.operating.otherMonthlyExpenses ?? 0;

    const mortgage = amortization.schedule[i] ?? amortization.schedule[amortization.schedule.length - 1];

    const noi = rent - (vacancy + repairs + capex + management + utilities + other + taxes + insurance);
    const cashFlow = noi - mortgage.payment;
    const cumulativeCashFlow = (monthly[i - 1]?.cumulativeCashFlow ?? 0) + cashFlow;

    const propertyValue = propertyValues.values[i]?.value ?? inputs.purchasePrice;
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

  const annual: AnnualSummary[] = [];

  const monthsPerYear = 12;
  const totalYears = Math.ceil(inputs.months / monthsPerYear);

  for (let year = 1; year <= totalYears; year++) {
    const start = (year - 1) * monthsPerYear;
    const slice = monthly.slice(start, start + monthsPerYear);
    if (slice.length === 0) break;

    const rentSum = slice.reduce((sum, m) => sum + m.rent, 0);
    const opSum = slice.reduce(
      (sum, m) =>
        sum +
        m.expenses.vacancy +
        m.expenses.repairs +
        m.expenses.capex +
        m.expenses.management +
        m.expenses.taxes +
        m.expenses.insurance +
        m.expenses.utilities +
        m.expenses.other,
      0,
    );
    const noi = rentSum - opSum;
    const debtService = slice.reduce((sum, m) => sum + m.mortgage.payment, 0);
    const principalPaid = slice.reduce((sum, m) => sum + m.mortgage.principal, 0);
    const appreciation = Math.max(
      0,
      slice[slice.length - 1]?.propertyValue - slice[0]?.propertyValue || 0,
    );
    const cashFlow = slice.reduce((sum, m) => sum + m.cashFlow, 0);
    const endingEquity = slice[slice.length - 1]?.equity ?? 0;

    annual.push({
      year,
      noi,
      cashFlow,
      debtService,
      principalPaid,
      appreciation,
      endingEquity,
      cashOnCash: cashRequired ? cashFlow / cashRequired : 0,
      capRate: inputs.purchasePrice ? noi / inputs.purchasePrice : 0,
      dscr: debtService ? noi / debtService : 0,
    });
  }

  const metrics = {
    cashRequired,
    cashRequiredWithRehab: cashRequired,
    cashRequiredBreakdown,
    totalReturn:
      (monthly[monthly.length - 1]?.cumulativeCashFlow ?? 0) +
      (monthly[monthly.length - 1]?.equity ?? 0),
    dscr: annual[0]?.dscr,
    coc: annual[0]?.cashOnCash,
  };

  return { monthly, annual, metrics };
}
