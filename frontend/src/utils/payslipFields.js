// Mirror of backend/src/utils/payslipFields.js. The on-screen payslip preview
// and the downloadable PDF/Word files must agree line for line, so the same
// three rules are implemented here rather than each caller improvising.
//
// Keep the two files in step — payslipFields.test.jsx asserts the behaviour
// this side, and the cases mirror the backend's.

/**
 * The two named earnings lines, resolving records written before House Rent
 * and Conveyance Allowance were split out of the generic `allowances` and
 * `bonus` fields. The fallback fires only when NEITHER named field is set, so
 * a deliberate zero on a current record is never overwritten by a stale
 * legacy value.
 */
export const resolveEarnings = (payroll = {}) => {
  const houseRent = Number(payroll?.houseRent || 0);
  const conveyanceAllowance = Number(payroll?.conveyanceAllowance || 0);

  if (houseRent === 0 && conveyanceAllowance === 0) {
    return {
      houseRent: Number(payroll?.allowances || 0),
      conveyanceAllowance: Number(payroll?.bonus || 0),
    };
  }

  return { houseRent, conveyanceAllowance };
};

const pad = (n) => String(n).padStart(2, "0");

/** DD-MM-YYYY, matching the period format printed on the payslip. */
export const formatDayMonthYear = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";

  // UTC getters: dates are stored as UTC midnight, and local getters would
  // shift the calendar day either side of the date line.
  return `${pad(date.getUTCDate())}-${pad(date.getUTCMonth() + 1)}-${date.getUTCFullYear()}`;
};

/**
 * "01-07-2024 to 12-08-2026" — the employee's service period, joining date to
 * today. Returns "" with no joining date, letting callers fall back to the
 * organisation-wide Settings label.
 */
export const formatServicePeriod = (dateOfJoining, asOf = new Date()) => {
  const from = formatDayMonthYear(dateOfJoining);
  if (!from) return "";

  return `${from} to ${formatDayMonthYear(asOf)}`;
};

/**
 * Leave entitlement and days taken. The employee record wins over the
 * organisation-wide Settings figure — that is the point of managing leave per
 * employee — with `payroll.leavesTaken` kept as the fallback for "taken" so
 * historical payslips reprint unchanged.
 */
export const resolveLeave = (employee = {}, payroll = {}, orgInfo = {}) => {
  const pick = (...values) =>
    Number(values.find((value) => value !== undefined && value !== null) || 0);

  return {
    annualTotal: pick(employee?.annualLeaveDays, orgInfo?.annualLeaveDays),
    annualTaken: pick(employee?.annualLeaveTaken, payroll?.leavesTaken),
    sickTotal: pick(employee?.sickLeaveDays, orgInfo?.sickLeaveDays),
    sickTaken: pick(employee?.sickLeaveTaken, payroll?.sickLeavesTaken),
  };
};
