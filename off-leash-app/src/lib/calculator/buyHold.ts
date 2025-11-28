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

const pct = (value: number) => value / 100;

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
