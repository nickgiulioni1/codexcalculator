import type { MortgagePayment } from "./types";

export const monthlyRate = (annualPercent: number) => (annualPercent / 100) / 12;

export const annualRateFromMonthly = (monthlyPercent: number) =>
  (monthlyPercent * 12);

/**
 * PMT equivalent. Returns a positive payment amount for convenience.
 */
export function pmt(
  ratePerPeriod: number,
  numberOfPayments: number,
  presentValue: number,
  futureValue = 0,
  type: 0 | 1 = 0,
): number {
  if (numberOfPayments <= 0) {
    throw new Error("numberOfPayments must be greater than zero");
  }

  if (ratePerPeriod === 0) {
    return Math.abs((presentValue + futureValue) / numberOfPayments);
  }

  const pvif = Math.pow(1 + ratePerPeriod, numberOfPayments);
  const payment =
    (ratePerPeriod * (presentValue * pvif + futureValue)) /
    ((1 + ratePerPeriod * type) * (pvif - 1));

  return Math.abs(payment);
}

/**
 * Interest portion for a given period (1-indexed).
 * Uses iterative balance reduction to stay numerically stable.
 */
export function ipmt(
  ratePerPeriod: number,
  period: number,
  numberOfPayments: number,
  presentValue: number,
  futureValue = 0,
  type: 0 | 1 = 0,
): number {
  if (period < 1 || period > numberOfPayments) {
    throw new Error("period must be within the payment schedule");
  }

  const payment = pmt(ratePerPeriod, numberOfPayments, presentValue, futureValue, type);
  let balance = presentValue;

  for (let i = 1; i < period; i++) {
    if (type === 1) {
      balance -= payment;
    }
    balance *= 1 + ratePerPeriod;
    if (type === 0) {
      balance -= payment;
    }
  }

  return balance * ratePerPeriod;
}

/**
 * Principal portion for a given period (1-indexed).
 */
export function ppmt(
  ratePerPeriod: number,
  period: number,
  numberOfPayments: number,
  presentValue: number,
  futureValue = 0,
  type: 0 | 1 = 0,
): number {
  const payment = pmt(ratePerPeriod, numberOfPayments, presentValue, futureValue, type);
  const interest = ipmt(ratePerPeriod, period, numberOfPayments, presentValue, futureValue, type);
  return payment - interest;
}

export type AmortizationInput = {
  principal: number;
  annualRatePercent: number;
  termMonths: number;
};

export type AmortizationResult = {
  payment: number;
  schedule: MortgagePayment[];
};

/**
 * Simple amortization schedule generator.
 */
export function buildAmortization({
  principal,
  annualRatePercent,
  termMonths,
}: AmortizationInput): AmortizationResult {
  const rate = monthlyRate(annualRatePercent);
  const payment = pmt(rate, termMonths, principal);
  let balance = principal;
  const schedule: MortgagePayment[] = [];

  for (let month = 1; month <= termMonths; month++) {
    const interest = balance * rate;
    const principalPaid = payment - interest;
    balance = Math.max(balance - principalPaid, 0);

    schedule.push({
      month,
      payment,
      principal: principalPaid,
      interest,
      balance,
    });
  }

  return { payment, schedule };
}
