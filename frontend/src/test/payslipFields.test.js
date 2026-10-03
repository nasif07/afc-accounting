import { describe, expect, it } from "vitest";
import {
  resolveEarnings,
  formatDayMonthYear,
  formatServicePeriod,
  resolveLeave,
} from "../utils/payslipFields";

// These rules are implemented twice — here and in
// backend/src/utils/payslipFields.js — because the on-screen preview and the
// generated PDF/Word files must print identical figures. The cases below
// mirror the backend's behaviour exactly.

describe("resolveEarnings", () => {
  it("uses the named fields when they are set", () => {
    expect(resolveEarnings({ houseRent: 15843, conveyanceAllowance: 3961 })).toEqual({
      houseRent: 15843,
      conveyanceAllowance: 3961,
    });
  });

  it("falls back to allowances/bonus for records written before the split", () => {
    // This is what every existing record looks like: allowances carries the
    // house rent, bonus is 0. The payslip already printed them this way.
    expect(resolveEarnings({ allowances: 10000, bonus: 0 })).toEqual({
      houseRent: 10000,
      conveyanceAllowance: 0,
    });
  });

  it("does not mix a named field with a legacy one", () => {
    // houseRent is set, so the stale allowances value must be ignored
    // entirely rather than added on top.
    expect(resolveEarnings({ houseRent: 500, allowances: 9999, bonus: 8888 })).toEqual({
      houseRent: 500,
      conveyanceAllowance: 0,
    });
  });

  it("treats a record with only conveyance set as current, not legacy", () => {
    expect(resolveEarnings({ conveyanceAllowance: 250, allowances: 7777 })).toEqual({
      houseRent: 0,
      conveyanceAllowance: 250,
    });
  });

  it("returns zeros for an empty or missing payroll", () => {
    expect(resolveEarnings({})).toEqual({ houseRent: 0, conveyanceAllowance: 0 });
    expect(resolveEarnings()).toEqual({ houseRent: 0, conveyanceAllowance: 0 });
  });

  it("keeps legacy totals identical to what was printed before", () => {
    const legacy = { baseSalary: 20000, allowances: 10000, bonus: 0 };
    const { houseRent, conveyanceAllowance } = resolveEarnings(legacy);
    const before = legacy.baseSalary + legacy.allowances + legacy.bonus;
    expect(legacy.baseSalary + houseRent + conveyanceAllowance).toBe(before);
  });
});

describe("formatServicePeriod", () => {
  it("runs from the joining date to the given date", () => {
    expect(formatServicePeriod("2024-07-01T00:00:00.000Z", new Date("2026-08-12T00:00:00.000Z")))
      .toBe("01-07-2024 to 12-08-2026");
  });

  it("returns empty when there is no joining date, so callers can fall back", () => {
    expect(formatServicePeriod(null)).toBe("");
    expect(formatServicePeriod(undefined)).toBe("");
    expect(formatServicePeriod("not-a-date")).toBe("");
  });

  it("reads the stored UTC calendar day, not the local one", () => {
    // Stored as UTC midnight. Local getters would report the previous day for
    // any timezone behind UTC.
    expect(formatDayMonthYear("2026-08-11T00:00:00.000Z")).toBe("11-08-2026");
  });
});

describe("resolveLeave", () => {
  const settings = { annualLeaveDays: 10, sickLeaveDays: 5 };

  it("prefers the employee's own entitlement over the org-wide setting", () => {
    const result = resolveLeave({ annualLeaveDays: 22, sickLeaveDays: 14 }, {}, settings);
    expect(result.annualTotal).toBe(22);
    expect(result.sickTotal).toBe(14);
  });

  it("falls back to Settings for an employee nobody configured", () => {
    const result = resolveLeave({}, {}, settings);
    expect(result.annualTotal).toBe(10);
    expect(result.sickTotal).toBe(5);
  });

  it("takes days-taken from the employee record", () => {
    const result = resolveLeave({ annualLeaveTaken: 3, sickLeaveTaken: 1 }, {}, settings);
    expect(result.annualTaken).toBe(3);
    expect(result.sickTaken).toBe(1);
  });

  it("falls back to the payroll run's leavesTaken so old payslips reprint the same", () => {
    const result = resolveLeave({}, { leavesTaken: 4 }, settings);
    expect(result.annualTaken).toBe(4);
  });

  it("honours an explicit zero rather than falling through to the payroll value", () => {
    const result = resolveLeave({ annualLeaveTaken: 0 }, { leavesTaken: 7 }, settings);
    expect(result.annualTaken).toBe(0);
  });

  it("defaults everything to 0 with no data anywhere", () => {
    expect(resolveLeave({}, {}, {})).toEqual({
      annualTotal: 0,
      annualTaken: 0,
      sickTotal: 0,
      sickTaken: 0,
    });
  });
});
