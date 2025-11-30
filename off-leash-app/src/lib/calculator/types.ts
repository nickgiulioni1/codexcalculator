export enum Strategy {
  BUY_HOLD = "BUY_HOLD",
  BRRRR = "BRRRR",
  FLIP = "FLIP",
}

export type RehabTiming = "IMMEDIATE" | "AFTER_TENANT";

export type RentTimelineInputs = {
  /** Opt-in advanced timeline (PRD 6.X). If false, behave like legacy stabilized-from-month-1. */
  modelCurrentVsFuture: boolean;
  /** Current occupancy status in the current-condition phase. */
  isOccupied: boolean;
  /** Rent during the current-condition phase. Ignored if vacant. */
  currentMonthlyRent: number;
  /** Months until current tenant leaves; 0 if vacant or unknown. */
  monthsUntilTenantLeaves: number;
  /** Target stabilized rent after rehab / turnover. */
  targetMonthlyRent: number;
  /** Annual rent growth rate (e.g., 3 for 3%); defaults to 0 when omitted. */
  annualRentGrowthPercent?: number;
  /** Whether a rehab is part of the analysis. */
  rehabPlanned: boolean;
  /** When rehab begins relative to purchase and tenancy. */
  rehabTiming: RehabTiming;
  /** Rehab duration in months. */
  rehabLengthMonths: number;
  /** Optional as-is value; defaults to purchase price when omitted. */
  asIsValue?: number;
};

export type PropertyValueInputs = RentTimelineInputs & {
  arv: number;
  purchasePrice: number;
  /** Annual appreciation rate in percent (e.g., 3 for 3%). */
  annualAppreciationPercent: number;
};

export type LoanInputs = {
  purchasePrice: number;
  downPaymentPercent: number;
  interestRateAnnualPercent: number;
  termYears: number;
  closingCostsPercent?: number;
  lenderPointsPercent?: number;
};

export type OperatingInputs = {
  taxesAnnual: number;
  insuranceAnnual: number;
  repairsPercent: number;
  capexPercent: number;
  managementPercent: number;
  vacancyPercent: number;
  otherMonthlyExpenses?: number;
  utilitiesMonthly?: number;
};

export type CalculatorInputs = {
  strategy: Strategy;
  rent: RentTimelineInputs;
  loan: LoanInputs;
  operating: OperatingInputs;
  arv: number;
  purchasePrice: number;
};

export type MortgagePayment = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

export type MonthlyResult = {
  month: number;
  rent: number;
  expenses: {
    vacancy: number;
    repairs: number;
    capex: number;
    management: number;
    taxes: number;
    insurance: number;
    utilities: number;
    other: number;
  };
  mortgage: MortgagePayment;
  cashFlow: number;
  cumulativeCashFlow: number;
  propertyValue: number;
  equity: number;
  notes?: string;
};

export type AnnualSummary = {
  year: number;
  noi: number;
  cashFlow: number;
  debtService: number;
  principalPaid: number;
  appreciation: number;
  endingEquity: number;
  cashOnCash: number;
  capRate: number;
  dscr: number;
};

export type BuyHoldMetrics = {
  cashRequired: number;
  cashRequiredWithRehab?: number;
  cashRequiredBreakdown: {
    downPayment: number;
    closingCosts: number;
    lenderPoints: number;
    rehab?: number;
    carrying?: number;
  };
  totalReturn: number;
  irr?: number;
  coc?: number;
  dscr?: number;
};

export type BuyHoldOutputs = {
  monthly: MonthlyResult[];
  annual: AnnualSummary[];
  metrics: BuyHoldMetrics;
};

export type BuyHoldInputs = {
  rent: RentTimelineInputs;
  loan: LoanInputs;
  operating: OperatingInputs;
  arv: number;
  purchasePrice: number;
  annualAppreciationPercent: number;
  months: number;
  rehabTotal?: number;
};

export type BRRRRInputs = {
  rent: RentTimelineInputs;
  longTermLoan: LoanInputs;
  operating: OperatingInputs;
  bridge: {
    interestRateAnnualPercent: number;
    pointsPercent?: number;
    closingCostsPercent?: number;
    ltvPercent?: number;
    includeRehabInBridge?: boolean;
  };
  refinanceLtvPercent: number;
  purchasePrice: number;
  arv: number;
  rehabTotal: number;
  annualAppreciationPercent: number;
  months: number;
};

export type BRRRRResult = BuyHoldOutputs & {
  refinanceMonth: number;
  bridgeInterest: number;
  cashOut: number;
  valueAtRefi: number;
  refinanceAmount: number;
  payoffBridge: number;
  carryingCosts: number;
};

export type FlipInputs = {
  rent: RentTimelineInputs;
  purchasePrice: number;
  arv: number;
  rehabTotal: number;
  rehabMonths: number;
  holdMonths: number;
  bridge: {
    interestRateAnnualPercent: number;
    pointsPercent?: number;
    closingCostsPercent?: number;
    ltvPercent?: number;
    includeRehabInBridge?: boolean;
  };
  sellingCostsPercent: number;
  agentFeePercent: number;
  taxesMonthly: number;
  insuranceMonthly: number;
  /** Marginal tax rate applied to flip profit (if positive). */
  marginalTaxRatePercent?: number;
};

export type FlipResult = {
  saleMonth: number;
  salePrice: number;
  totalCosts: number;
  netProfit: number;
  roi: number;
  profitAfterTax: number;
  taxOnProfit: number;
  roiAfterTax: number;
};

export type RehabPhase = {
  tenantMonths: number;
  rehabStartMonth: number;
  rehabEndMonth: number;
  stabilizedMonth: number;
  refinanceMonth?: number;
};

export type PropertyValueEntry = {
  month: number;
  value: number;
};

export type PropertyValueResult = {
  values: PropertyValueEntry[];
  monthlyAppreciationRate: number;
};

export enum RehabClass {
  RENTAL = "RENTAL",
  FLIP = "FLIP",
  RETAIL = "RETAIL",
}

export type UnitType =
  | "PER_SQFT"
  | "PER_KITCHEN"
  | "PER_BATH"
  | "PER_PROJECT"
  | "PER_WINDOW"
  | "PER_DOOR"
  | "PER_SET"
  | "PER_UNIT"
  | "PER_CUSTOM";

export type RehabItem = {
  id: string;
  label: string;
  category:
    | "Flooring"
    | "Kitchen"
    | "Bathrooms"
    | "General"
    | "Infrastructure"
    | "Contingency";
  unitType: UnitType;
  rentalPrice: number;
  flipPrice: number;
  retailMultiplier?: number; // defaults to 1.5x flip
  defaultQuantity?: number;
  notes?: string;
};

export type RehabSelection = {
  itemId: string;
  quantity?: number;
  customRetailPrice?: number;
  customUnitPrice?: number;
  enabled?: boolean;
};
