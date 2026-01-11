import type { MortgagePayment } from "./types";

/**
 * @module finance
 * Core financial calculation functions for mortgage and loan analysis.
 * These are pure functions that implement standard financial formulas
 * equivalent to Excel's PMT, IPMT, and PPMT functions.
 */

/**
 * Converts an annual interest rate percentage to a monthly rate.
 * @param annualPercent - Annual interest rate as a percentage (e.g., 6.5 for 6.5%)
 * @returns Monthly interest rate as a decimal (e.g., 0.00542 for 6.5% annual)
 * @example
 * monthlyRate(6.5) // Returns 0.005417
 */
export const monthlyRate = (annualPercent: number) => (annualPercent / 100) / 12;

/**
 * Converts a monthly interest rate to an annual rate.
 * @param monthlyPercent - Monthly interest rate as a percentage
 * @returns Annual interest rate as a percentage
 */
export const annualRateFromMonthly = (monthlyPercent: number) =>
  (monthlyPercent * 12);

/**
 * Calculates the payment for a loan based on constant payments and a constant interest rate.
 * Equivalent to Excel's PMT function.
 *
 * @param ratePerPeriod - Interest rate per period as a decimal (not percentage)
 * @param numberOfPayments - Total number of payment periods
 * @param presentValue - Principal amount (loan amount)
 * @param futureValue - Target balance after all payments (default: 0)
 * @param type - When payments are due: 0 = end of period, 1 = beginning of period
 * @returns The payment amount per period (always positive)
 *
 * @example
 * // Calculate monthly payment for $300,000 loan at 6.5% for 30 years
 * const rate = monthlyRate(6.5);
 * const payment = pmt(rate, 360, 300000); // Returns ~$1,896
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
 * Calculates the interest portion of a payment for a specific period.
 * Uses iterative balance reduction to stay numerically stable.
 * Equivalent to Excel's IPMT function.
 *
 * @param ratePerPeriod - Interest rate per period as a decimal
 * @param period - The period for which to calculate interest (1-indexed)
 * @param numberOfPayments - Total number of payment periods
 * @param presentValue - Principal amount (loan amount)
 * @param futureValue - Target balance after all payments (default: 0)
 * @param type - When payments are due: 0 = end of period, 1 = beginning of period
 * @returns The interest portion of the payment for the specified period
 * @throws Error if period is outside valid range
 *
 * @example
 * // Get interest portion of 12th payment on a $300,000 loan
 * const rate = monthlyRate(6.5);
 * const interest = ipmt(rate, 12, 360, 300000);
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
 * Calculates the principal portion of a payment for a specific period.
 * Equivalent to Excel's PPMT function.
 *
 * @param ratePerPeriod - Interest rate per period as a decimal
 * @param period - The period for which to calculate principal (1-indexed)
 * @param numberOfPayments - Total number of payment periods
 * @param presentValue - Principal amount (loan amount)
 * @param futureValue - Target balance after all payments (default: 0)
 * @param type - When payments are due: 0 = end of period, 1 = beginning of period
 * @returns The principal portion of the payment for the specified period
 *
 * @example
 * // Get principal portion of 12th payment on a $300,000 loan
 * const rate = monthlyRate(6.5);
 * const principal = ppmt(rate, 12, 360, 300000);
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

/**
 * Input parameters for building an amortization schedule.
 */
export type AmortizationInput = {
  /** Principal loan amount */
  principal: number;
  /** Annual interest rate as a percentage (e.g., 6.5 for 6.5%) */
  annualRatePercent: number;
  /** Total number of monthly payments */
  termMonths: number;
};

/**
 * Result of amortization calculation.
 */
export type AmortizationResult = {
  /** Fixed monthly payment amount */
  payment: number;
  /** Month-by-month breakdown of principal, interest, and balance */
  schedule: MortgagePayment[];
};

/**
 * Generates a complete amortization schedule for a fixed-rate loan.
 * Creates a month-by-month breakdown showing payment allocation between
 * principal and interest, plus remaining balance.
 *
 * @param input - Loan parameters (principal, rate, term)
 * @returns Object containing fixed payment amount and full schedule
 *
 * @example
 * const result = buildAmortization({
 *   principal: 300000,
 *   annualRatePercent: 6.5,
 *   termMonths: 360
 * });
 * console.log(result.payment); // ~$1,896/month
 * console.log(result.schedule[0]); // First month breakdown
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
