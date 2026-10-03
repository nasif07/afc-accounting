/**
 * Derivations shared by the payroll service and both payslip renderers (PDF
 * and DOCX). Kept standalone so payslipModel doesn't have to require a module
 * service, and so the earnings rule can't drift between where totals are
 * calculated and where they're printed.
 */

/**
 * The two named earnings lines, resolving records written before House Rent
 * and Conveyance Allowance were split out of the generic `allowances` and
 * `bonus` fields.
 *
 * The fallback fires only when NEITHER named field is set, so a deliberate
 * zero on a current record is never overwritten by a stale legacy value. For
 * a legacy record this returns exactly allowances/bonus — the same figures
 * the payslip already printed, so no total moves.
 */
const resolveEarnings = (payroll = {}) => {
  const houseRent = Number(payroll.houseRent || 0);
  const conveyanceAllowance = Number(payroll.conveyanceAllowance || 0);

  if (houseRent === 0 && conveyanceAllowance === 0) {
    return {
      houseRent: Number(payroll.allowances || 0),
      conveyanceAllowance: Number(payroll.bonus || 0),
    };
  }

  return { houseRent, conveyanceAllowance };
};

const pad = (n) => String(n).padStart(2, "0");

/** DD-MM-YYYY, matching the period format already printed on the payslip. */
const formatDayMonthYear = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";

  // UTC getters: dates are stored as UTC midnight, and local getters would
  // shift the calendar day either side of the date line.
  return `${pad(date.getUTCDate())}-${pad(date.getUTCMonth() + 1)}-${date.getUTCFullYear()}`;
};

/**
 * "01-07-2024 to 12-08-2026" — the employee's service period, from their
 * joining date to today. The Life Fund / Retirement Benefit and Health Fund
 * balances accrue over service, so their headings are per-employee rather
 * than the single organisation-wide label they used to share.
 *
 * Returns "" when the employee has no joining date, letting callers fall back
 * to the Settings label.
 */
const formatServicePeriod = (dateOfJoining, asOf = new Date()) => {
  const from = formatDayMonthYear(dateOfJoining);
  if (!from) return "";

  return `${from} to ${formatDayMonthYear(asOf)}`;
};

/**
 * Leave entitlement and days taken for the payslip's Leave Status block.
 *
 * The employee record wins over the organisation-wide Settings figure — that
 * is the point of managing leave per employee. Settings remains the default
 * for anyone not configured individually, and `payroll.leavesTaken` remains
 * the fallback for "taken" so historical payslips keep reprinting unchanged.
 */
const resolveLeave = (employee = {}, payroll = {}, orgInfo = {}) => {
  const pick = (...values) =>
    Number(values.find((value) => value !== undefined && value !== null) || 0);

  return {
    annualTotal: pick(employee.annualLeaveDays, orgInfo.annualLeaveDays),
    annualTaken: pick(employee.annualLeaveTaken, payroll.leavesTaken),
    sickTotal: pick(employee.sickLeaveDays, orgInfo.sickLeaveDays),
    sickTaken: pick(employee.sickLeaveTaken, payroll.sickLeavesTaken),
  };
};

module.exports = {
  resolveEarnings,
  formatDayMonthYear,
  formatServicePeriod,
  resolveLeave,
};
