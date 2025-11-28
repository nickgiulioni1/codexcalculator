import { RehabClass } from "./types";
import type { RehabItem, RehabSelection } from "./types";

const DEFAULT_RETAIL_MULTIPLIER = 1.5;

export const rehabCatalog: RehabItem[] = [
  // Flooring
  {
    id: "flooring-lvp",
    label: "LVP Flooring (per sq ft)",
    category: "Flooring",
    unitType: "PER_SQFT",
    rentalPrice: 4.5,
    flipPrice: 6.5,
    defaultQuantity: 1000,
  },
  {
    id: "flooring-carpet",
    label: "Carpeting (per sq ft)",
    category: "Flooring",
    unitType: "PER_SQFT",
    rentalPrice: 3,
    flipPrice: 4.5,
    defaultQuantity: 1000,
  },
  {
    id: "flooring-bath-tile",
    label: "Tile for Bathroom Floor",
    category: "Flooring",
    unitType: "PER_BATH",
    rentalPrice: 800,
    flipPrice: 1200,
  },
  // Kitchen
  {
    id: "kitchen-cabinets",
    label: "Kitchen Cabinets",
    category: "Kitchen",
    unitType: "PER_KITCHEN",
    rentalPrice: 5000,
    flipPrice: 8000,
  },
  {
    id: "kitchen-countertops",
    label: "Kitchen Countertops",
    category: "Kitchen",
    unitType: "PER_KITCHEN",
    rentalPrice: 3000,
    flipPrice: 5000,
  },
  {
    id: "kitchen-appliances",
    label: "Kitchen Appliance Package",
    category: "Kitchen",
    unitType: "PER_SET",
    rentalPrice: 2500,
    flipPrice: 4000,
  },
  {
    id: "kitchen-sink",
    label: "Kitchen Sink & Faucet",
    category: "Kitchen",
    unitType: "PER_UNIT",
    rentalPrice: 400,
    flipPrice: 700,
  },
  // Bathrooms
  {
    id: "bath-full-reno",
    label: "Full Bathroom Renovation",
    category: "Bathrooms",
    unitType: "PER_BATH",
    rentalPrice: 4500,
    flipPrice: 7500,
  },
  {
    id: "bath-vanity",
    label: "New Vanity with Sink",
    category: "Bathrooms",
    unitType: "PER_UNIT",
    rentalPrice: 600,
    flipPrice: 1200,
  },
  {
    id: "bath-toilet",
    label: "New Toilet",
    category: "Bathrooms",
    unitType: "PER_UNIT",
    rentalPrice: 300,
    flipPrice: 500,
  },
  {
    id: "bath-mirror-light",
    label: "Bathroom Mirror & Light",
    category: "Bathrooms",
    unitType: "PER_SET",
    rentalPrice: 200,
    flipPrice: 400,
  },
  // General
  {
    id: "general-interior-paint",
    label: "Interior Paint (per sq ft)",
    category: "General",
    unitType: "PER_SQFT",
    rentalPrice: 1.5,
    flipPrice: 2.5,
    defaultQuantity: 1000,
  },
  {
    id: "general-drywall-repair",
    label: "Drywall Repair (per sq ft)",
    category: "General",
    unitType: "PER_SQFT",
    rentalPrice: 0.5,
    flipPrice: 0.8,
    defaultQuantity: 1000,
  },
  {
    id: "general-wall-prep",
    label: "Wall Prep & Patching (per sq ft)",
    category: "General",
    unitType: "PER_SQFT",
    rentalPrice: 0.3,
    flipPrice: 0.5,
    defaultQuantity: 1000,
  },
  {
    id: "general-interior-doors",
    label: "New Interior Doors",
    category: "General",
    unitType: "PER_DOOR",
    rentalPrice: 250,
    flipPrice: 350,
    defaultQuantity: 6,
  },
  {
    id: "general-door-knobs",
    label: "Door Knobs and Hardware",
    category: "General",
    unitType: "PER_SET",
    rentalPrice: 35,
    flipPrice: 65,
    defaultQuantity: 6,
  },
  {
    id: "general-exterior-doors",
    label: "New Exterior Doors",
    category: "General",
    unitType: "PER_DOOR",
    rentalPrice: 500,
    flipPrice: 800,
    defaultQuantity: 2,
  },
  {
    id: "general-windows",
    label: "New Windows",
    category: "General",
    unitType: "PER_WINDOW",
    rentalPrice: 450,
    flipPrice: 650,
    defaultQuantity: 10,
  },
  {
    id: "general-blinds",
    label: "Window Blinds",
    category: "General",
    unitType: "PER_WINDOW",
    rentalPrice: 50,
    flipPrice: 80,
    defaultQuantity: 10,
  },
  {
    id: "general-smoke-co",
    label: "Smoke/CO Detectors",
    category: "General",
    unitType: "PER_UNIT",
    rentalPrice: 35,
    flipPrice: 35,
    defaultQuantity: 4,
  },
  // Infrastructure
  {
    id: "infra-exterior-paint",
    label: "Exterior Paint",
    category: "Infrastructure",
    unitType: "PER_PROJECT",
    rentalPrice: 4000,
    flipPrice: 6000,
  },
  {
    id: "infra-roof",
    label: "New Roof",
    category: "Infrastructure",
    unitType: "PER_PROJECT",
    rentalPrice: 8000,
    flipPrice: 10000,
  },
  {
    id: "infra-siding",
    label: "New Siding/Fascia",
    category: "Infrastructure",
    unitType: "PER_PROJECT",
    rentalPrice: 3500,
    flipPrice: 5000,
  },
  {
    id: "infra-electrical",
    label: "Electrical Update",
    category: "Infrastructure",
    unitType: "PER_PROJECT",
    rentalPrice: 4000,
    flipPrice: 6000,
  },
  {
    id: "infra-plumbing",
    label: "Plumbing Update",
    category: "Infrastructure",
    unitType: "PER_PROJECT",
    rentalPrice: 3500,
    flipPrice: 5000,
  },
  {
    id: "infra-water-heater",
    label: "Water Heater",
    category: "Infrastructure",
    unitType: "PER_UNIT",
    rentalPrice: 1200,
    flipPrice: 1800,
  },
  {
    id: "infra-ac",
    label: "New AC Unit",
    category: "Infrastructure",
    unitType: "PER_UNIT",
    rentalPrice: 5000,
    flipPrice: 6500,
  },
  {
    id: "infra-furnace",
    label: "New Furnace",
    category: "Infrastructure",
    unitType: "PER_UNIT",
    rentalPrice: 4500,
    flipPrice: 5500,
  },
  {
    id: "infra-landscaping",
    label: "Landscaping",
    category: "Infrastructure",
    unitType: "PER_PROJECT",
    rentalPrice: 2000,
    flipPrice: 3500,
  },
  {
    id: "infra-concrete",
    label: "Concrete/Porch Work",
    category: "Infrastructure",
    unitType: "PER_PROJECT",
    rentalPrice: 2500,
    flipPrice: 4000,
  },
  {
    id: "infra-waterproofing",
    label: "Basement Waterproofing",
    category: "Infrastructure",
    unitType: "PER_PROJECT",
    rentalPrice: 3000,
    flipPrice: 4000,
  },
  // Contingency / Custom
  {
    id: "contingency",
    label: "Contingency (per sq ft)",
    category: "Contingency",
    unitType: "PER_SQFT",
    rentalPrice: 2,
    flipPrice: 3,
    defaultQuantity: 1000,
  },
  {
    id: "custom-1",
    label: "Custom Item 1",
    category: "Contingency",
    unitType: "PER_CUSTOM",
    rentalPrice: 0,
    flipPrice: 0,
  },
];

export type RehabTotalResult = {
  total: number;
  lineItems: { item: RehabItem; quantity: number; unitPrice: number; lineTotal: number }[];
};

export function getUnitPrice(item: RehabItem, grade: RehabClass): number {
  if (grade === "RENTAL") return item.rentalPrice;
  if (grade === "FLIP") return item.flipPrice;
  // Retail
  const multiplier = item.retailMultiplier ?? DEFAULT_RETAIL_MULTIPLIER;
  return (item.flipPrice || item.rentalPrice) * multiplier;
}

export function calculateRehabTotal(
  selections: RehabSelection[],
  grade: RehabClass = RehabClass.RENTAL,
  catalog: RehabItem[] = rehabCatalog,
): RehabTotalResult {
  const lineItems = selections
    .filter((selection) => selection.enabled ?? true)
    .map((selection) => {
      const item = catalog.find((c) => c.id === selection.itemId);
      if (!item) {
        throw new Error(`Unknown rehab item: ${selection.itemId}`);
      }
      const defaultUnit =
        grade === "RETAIL" && selection.customRetailPrice
          ? selection.customRetailPrice
          : getUnitPrice(item, grade);
      const unitPrice = selection.customUnitPrice ?? defaultUnit;
      const quantity = selection.quantity ?? item.defaultQuantity ?? 0;
      const lineTotal = unitPrice * quantity;
      return { item, quantity, unitPrice, lineTotal };
    });

  const total = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
  return { total, lineItems };
}
