import { z } from "zod";
import { Strategy, RehabClass } from "../calculator/types";

/**
 * Validation schemas for real estate calculator inputs.
 * Uses Zod for runtime validation with TypeScript type inference.
 */

// Custom error messages
const messages = {
  positive: "Must be a positive number",
  nonNegative: "Cannot be negative",
  percentage: "Must be between 0 and 100",
  minOne: "Must be at least 1",
};

// Base numeric validators
const positiveNumber = z.number().positive(messages.positive);
const nonNegativeNumber = z.number().min(0, messages.nonNegative);
const percentageNumber = z.number().min(0).max(100, messages.percentage);

/**
 * Loan input validation schema
 */
export const loanInputsSchema = z.object({
  purchasePrice: positiveNumber,
  downPaymentPercent: percentageNumber,
  interestRateAnnualPercent: nonNegativeNumber.max(50, "Interest rate seems too high"),
  termYears: z.number().int().min(1).max(50, "Term must be 1-50 years"),
  closingCostsPercent: percentageNumber.optional(),
  lenderPointsPercent: percentageNumber.optional(),
});

/**
 * Operating expenses validation schema
 */
export const operatingInputsSchema = z.object({
  taxesAnnual: nonNegativeNumber,
  insuranceAnnual: nonNegativeNumber,
  repairsPercent: percentageNumber,
  capexPercent: percentageNumber,
  managementPercent: percentageNumber,
  vacancyPercent: percentageNumber,
  otherMonthlyExpenses: nonNegativeNumber.optional(),
  utilitiesMonthly: nonNegativeNumber.optional(),
});

/**
 * Rent timeline validation schema
 */
export const rentTimelineInputsSchema = z
  .object({
    modelCurrentVsFuture: z.boolean(),
    isOccupied: z.boolean(),
    currentMonthlyRent: nonNegativeNumber,
    monthsUntilTenantLeaves: z.number().int().min(0),
    targetMonthlyRent: positiveNumber,
    annualRentGrowthPercent: z.number().min(-10).max(20).optional(),
    rehabPlanned: z.boolean(),
    rehabTiming: z.enum(["IMMEDIATE", "AFTER_TENANT"]),
    rehabLengthMonths: z.number().int().min(0).max(36),
    asIsValue: positiveNumber.optional(),
  })
  .refine(
    (data) => {
      // If occupied, current rent should be set
      if (data.isOccupied && data.modelCurrentVsFuture && data.currentMonthlyRent <= 0) {
        return false;
      }
      return true;
    },
    {
      message: "Current rent is required when property is occupied",
      path: ["currentMonthlyRent"],
    }
  )
  .refine(
    (data) => {
      // Rehab length required if rehab is planned
      if (data.rehabPlanned && data.rehabLengthMonths < 1) {
        return false;
      }
      return true;
    },
    {
      message: "Rehab length must be at least 1 month when rehab is planned",
      path: ["rehabLengthMonths"],
    }
  );

/**
 * Bridge loan validation schema
 */
export const bridgeInputsSchema = z.object({
  interestRateAnnualPercent: nonNegativeNumber.max(30, "Bridge rate seems too high"),
  pointsPercent: percentageNumber.optional(),
  closingCostsPercent: percentageNumber.optional(),
  ltvPercent: percentageNumber.optional(),
  includeRehabInBridge: z.boolean().optional(),
});

/**
 * Rehab selection validation schema
 */
export const rehabSelectionSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(0).optional(),
  customRetailPrice: positiveNumber.optional(),
  customUnitPrice: positiveNumber.optional(),
  enabled: z.boolean().optional(),
});

/**
 * Buy & Hold inputs validation schema
 */
export const buyHoldInputsSchema = z.object({
  rent: rentTimelineInputsSchema,
  loan: loanInputsSchema,
  operating: operatingInputsSchema,
  arv: positiveNumber,
  purchasePrice: positiveNumber,
  annualAppreciationPercent: z.number().min(-10).max(20),
  months: z.number().int().min(1).max(600, "Maximum 50 years simulation"),
  rehabTotal: nonNegativeNumber.optional(),
});

/**
 * BRRRR inputs validation schema
 */
export const brrrrInputsSchema = z
  .object({
    rent: rentTimelineInputsSchema,
    longTermLoan: loanInputsSchema,
    operating: operatingInputsSchema,
    bridge: bridgeInputsSchema,
    refinanceLtvPercent: percentageNumber,
    refinanceClosingCostsPercent: percentageNumber.optional(),
    refinancePointsPercent: percentageNumber.optional(),
    refinanceReserveMonths: z.number().int().min(0).max(12).optional(),
    purchasePrice: positiveNumber,
    arv: positiveNumber,
    rehabTotal: nonNegativeNumber,
    annualAppreciationPercent: z.number().min(-10).max(20),
    months: z.number().int().min(1).max(600),
  })
  .refine(
    (data) => data.arv >= data.purchasePrice * 0.5,
    {
      message: "ARV seems too low relative to purchase price",
      path: ["arv"],
    }
  );

/**
 * Flip inputs validation schema
 */
export const flipInputsSchema = z
  .object({
    rent: rentTimelineInputsSchema,
    purchasePrice: positiveNumber,
    arv: positiveNumber,
    rehabTotal: nonNegativeNumber,
    rehabMonths: z.number().int().min(1).max(24),
    holdMonths: z.number().int().min(0).max(24),
    bridge: bridgeInputsSchema,
    sellingCostsPercent: percentageNumber,
    agentFeePercent: percentageNumber,
    taxesMonthly: nonNegativeNumber,
    insuranceMonthly: nonNegativeNumber,
    marginalTaxRatePercent: percentageNumber.optional(),
  })
  .refine(
    (data) => data.arv > data.purchasePrice + data.rehabTotal,
    {
      message: "ARV should exceed purchase price plus rehab to be profitable",
      path: ["arv"],
    }
  );

/**
 * Full form state validation schema
 */
export const formStateSchema = z.object({
  purchasePrice: positiveNumber,
  arv: positiveNumber.optional(),
  asIsValue: positiveNumber.optional(),
  targetMonthlyRent: positiveNumber,
  annualRentGrowthPercent: z.number().min(-10).max(20).optional(),
  annualAppreciationPercent: z.number().min(-10).max(20),
  monthsToSimulate: z.number().int().min(1).max(600),
  modelCurrentVsFuture: z.boolean(),
  isOccupied: z.boolean(),
  currentMonthlyRent: nonNegativeNumber,
  monthsUntilTenantLeaves: z.number().int().min(0),
  rehabPlanned: z.boolean(),
  rehabTiming: z.enum(["IMMEDIATE", "AFTER_TENANT"]),
  rehabLengthMonths: z.number().int().min(0).max(36),
  loan: loanInputsSchema,
  operating: operatingInputsSchema,
  strategy: z.nativeEnum(Strategy),
  rehabClass: z.nativeEnum(RehabClass),
  rehabSelections: z.array(rehabSelectionSchema),
  includeRehabInCashRequired: z.boolean(),
  bridgeRate: nonNegativeNumber.max(30),
  bridgeLtvPercent: percentageNumber,
  bridgePointsPercent: percentageNumber,
  bridgeClosingCostsPercent: percentageNumber,
  includeRehabInBridge: z.boolean(),
  refinanceLtvPercent: percentageNumber,
  flipHoldMonths: z.number().int().min(0).max(24),
  sellingCostsPercent: percentageNumber,
  agentFeePercent: percentageNumber,
  marginalTaxRatePercent: percentageNumber,
});

// Export inferred types
export type LoanInputsValidated = z.infer<typeof loanInputsSchema>;
export type OperatingInputsValidated = z.infer<typeof operatingInputsSchema>;
export type RentTimelineInputsValidated = z.infer<typeof rentTimelineInputsSchema>;
export type BuyHoldInputsValidated = z.infer<typeof buyHoldInputsSchema>;
export type BRRRRInputsValidated = z.infer<typeof brrrrInputsSchema>;
export type FlipInputsValidated = z.infer<typeof flipInputsSchema>;
export type FormStateValidated = z.infer<typeof formStateSchema>;
