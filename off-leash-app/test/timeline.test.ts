import { describe, expect, it } from "vitest";
import { buildRentSchedule, deriveTimeline, RehabClass, calculateRehabTotal, rehabCatalog } from "@/lib/calculator";

describe("deriveTimeline", () => {
  it("sets rehab after tenant leaves when configured", () => {
    const phases = deriveTimeline({
      modelCurrentVsFuture: true,
      isOccupied: true,
      currentMonthlyRent: 1000,
      monthsUntilTenantLeaves: 3,
      targetMonthlyRent: 1500,
      rehabPlanned: true,
      rehabTiming: "AFTER_TENANT",
      rehabLengthMonths: 2,
      asIsValue: 200000,
    });

    expect(phases.rehabStartMonth).toBe(4);
    expect(phases.rehabEndMonth).toBe(5);
    expect(phases.stabilizedMonth).toBe(6);
  });

  it("defaults to immediate rehab when not delayed", () => {
    const phases = deriveTimeline({
      modelCurrentVsFuture: false,
      isOccupied: false,
      currentMonthlyRent: 0,
      monthsUntilTenantLeaves: 0,
      targetMonthlyRent: 1800,
      rehabPlanned: true,
      rehabTiming: "IMMEDIATE",
      rehabLengthMonths: 3,
      asIsValue: 180000,
    });

    expect(phases.rehabStartMonth).toBe(1);
    expect(phases.rehabEndMonth).toBe(3);
    expect(phases.stabilizedMonth).toBe(4);
  });

  it("forces rehab after tenant when occupied even if immediate is selected", () => {
    const phases = deriveTimeline({
      modelCurrentVsFuture: true,
      isOccupied: true,
      currentMonthlyRent: 1200,
      monthsUntilTenantLeaves: 2,
      targetMonthlyRent: 1800,
      rehabPlanned: true,
      rehabTiming: "IMMEDIATE",
      rehabLengthMonths: 2,
      asIsValue: 220000,
    });

    expect(phases.rehabStartMonth).toBe(3);
    expect(phases.rehabEndMonth).toBe(4);
    expect(phases.refinanceMonth).toBe(5);
  });

  it("anchors zero-length rehab when no rehab is planned", () => {
    const phases = deriveTimeline({
      modelCurrentVsFuture: true,
      isOccupied: false,
      currentMonthlyRent: 0,
      monthsUntilTenantLeaves: 3,
      targetMonthlyRent: 1500,
      rehabPlanned: false,
      rehabTiming: "AFTER_TENANT",
      rehabLengthMonths: 0,
      asIsValue: 180000,
    });

    expect(phases.rehabStartMonth).toBe(4);
    expect(phases.rehabEndMonth).toBe(3);
    expect(phases.stabilizedMonth).toBe(4);
    expect(phases.refinanceMonth).toBe(4);
  });
});

describe("buildRentSchedule", () => {
  it("yields zero rent during rehab and steps to target after", () => {
    const schedule = buildRentSchedule(
      {
        modelCurrentVsFuture: true,
        isOccupied: true,
        currentMonthlyRent: 900,
        monthsUntilTenantLeaves: 1,
        targetMonthlyRent: 1500,
        rehabPlanned: true,
        rehabTiming: "AFTER_TENANT",
        rehabLengthMonths: 2,
        asIsValue: 150000,
      },
      { months: 6 },
    );

    const rents = schedule.schedule.map((m) => m.rent);
    expect(rents[0]).toBeGreaterThan(0); // month 1 current rent
    expect(rents[1]).toBe(0); // rehab month 2
    expect(rents[2]).toBe(0); // rehab month 3
    expect(rents[3]).toBe(1500); // stabilized month 4
  });
});

describe("rehab retail multiplier", () => {
  it("applies retail = flip * 1.5 by default", () => {
    const lvp = rehabCatalog.find((i) => i.id === "flooring-lvp");
    expect(lvp).toBeDefined();
    const flipTotal = calculateRehabTotal([{ itemId: lvp!.id, quantity: 10, enabled: true }], RehabClass.FLIP);
    const retailTotal = calculateRehabTotal([{ itemId: lvp!.id, quantity: 10, enabled: true }], RehabClass.RETAIL);
    expect(retailTotal.total).toBeCloseTo(flipTotal.total * 1.5, 4);
  });

  it("sums multiple rental-grade items using default quantities", () => {
    const result = calculateRehabTotal(
      [
        { itemId: "flooring-lvp", enabled: true },
        { itemId: "flooring-carpet", enabled: true },
      ],
      RehabClass.RENTAL,
    );
    // 4.5 * 1000 + 3 * 1000 = 7,500
    expect(result.total).toBeCloseTo(7500, 0);
  });

  it("uses flip pricing when grade is FLIP", () => {
    const result = calculateRehabTotal(
      [{ itemId: "general-interior-doors", quantity: 2, enabled: true }],
      RehabClass.FLIP,
    );
    expect(result.total).toBeCloseTo(350 * 2, 0);
  });
});
