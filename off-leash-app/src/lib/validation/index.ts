/**
 * Validation utilities for calculator inputs.
 * Provides runtime validation with helpful error messages.
 */

import { z } from "zod";
import {
  formStateSchema,
  buyHoldInputsSchema,
  brrrrInputsSchema,
  flipInputsSchema,
  type FormStateValidated,
  type BuyHoldInputsValidated,
  type BRRRRInputsValidated,
  type FlipInputsValidated,
} from "./schemas";

export * from "./schemas";

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult<T> =
  | { success: true; data: T; errors: [] }
  | { success: false; data: null; errors: ValidationError[] };

/**
 * Transforms Zod errors into a flat array of field/message pairs.
 */
function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

/**
 * Validates form state and returns typed result.
 */
export function validateFormState(data: unknown): ValidationResult<FormStateValidated> {
  const result = formStateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  return { success: false, data: null, errors: formatZodErrors(result.error) };
}

/**
 * Validates Buy & Hold calculator inputs.
 */
export function validateBuyHoldInputs(data: unknown): ValidationResult<BuyHoldInputsValidated> {
  const result = buyHoldInputsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  return { success: false, data: null, errors: formatZodErrors(result.error) };
}

/**
 * Validates BRRRR calculator inputs.
 */
export function validateBRRRRInputs(data: unknown): ValidationResult<BRRRRInputsValidated> {
  const result = brrrrInputsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  return { success: false, data: null, errors: formatZodErrors(result.error) };
}

/**
 * Validates Flip calculator inputs.
 */
export function validateFlipInputs(data: unknown): ValidationResult<FlipInputsValidated> {
  const result = flipInputsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  return { success: false, data: null, errors: formatZodErrors(result.error) };
}

/**
 * Quick validation check - returns true if valid, false otherwise.
 */
export function isValidFormState(data: unknown): data is FormStateValidated {
  return formStateSchema.safeParse(data).success;
}

/**
 * Get validation errors for a specific field.
 */
export function getFieldErrors(
  errors: ValidationError[],
  fieldPath: string
): string[] {
  return errors
    .filter((e) => e.field === fieldPath || e.field.startsWith(`${fieldPath}.`))
    .map((e) => e.message);
}

/**
 * Check if a specific field has errors.
 */
export function hasFieldError(errors: ValidationError[], fieldPath: string): boolean {
  return getFieldErrors(errors, fieldPath).length > 0;
}

/**
 * Business logic validation warnings (not blocking).
 * These are recommendations, not hard errors.
 */
export type ValidationWarning = {
  field: string;
  message: string;
  severity: "info" | "warning";
};

export function getBusinessWarnings(data: FormStateValidated): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // ARV check
  const arv = data.arv ?? data.purchasePrice;
  if (arv < data.purchasePrice) {
    warnings.push({
      field: "arv",
      message: "ARV is less than purchase price - verify this is intentional",
      severity: "warning",
    });
  }

  // Rent-to-price ratio check (1% rule)
  const rentRatio = (data.targetMonthlyRent / data.purchasePrice) * 100;
  if (rentRatio < 0.8) {
    warnings.push({
      field: "targetMonthlyRent",
      message: `Rent is ${rentRatio.toFixed(2)}% of purchase price (below 0.8% rule)`,
      severity: "info",
    });
  }

  // High vacancy warning
  if (data.operating.vacancyPercent > 10) {
    warnings.push({
      field: "operating.vacancyPercent",
      message: "Vacancy rate above 10% is unusual for most markets",
      severity: "info",
    });
  }

  // High management fee
  if (data.operating.managementPercent > 12) {
    warnings.push({
      field: "operating.managementPercent",
      message: "Management fee above 12% is higher than typical",
      severity: "info",
    });
  }

  // BRRRR refinance LTV warning
  if (data.refinanceLtvPercent > 80) {
    warnings.push({
      field: "refinanceLtvPercent",
      message: "Refinance LTV above 80% may require PMI",
      severity: "info",
    });
  }

  // High bridge rate
  if (data.bridgeRate > 12) {
    warnings.push({
      field: "bridgeRate",
      message: "Bridge rate above 12% is expensive - shop around",
      severity: "warning",
    });
  }

  return warnings;
}
