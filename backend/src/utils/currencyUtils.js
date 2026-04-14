/**
 * Currency utilities for consistent handling of monetary values
 * Backend stores amounts as integers (cents), API returns decimals
 */

const CURRENCY_CONFIG = {
  symbol: '৳',
  code: 'BDT',
  decimalPlaces: 2,
  decimalSeparator: '.',
  thousandsSeparator: ',',
};

/**
 * Convert cents (integer) to decimal (float)
 * @param {number} cents - Amount in cents (integer)
 * @returns {number} Amount in decimal format
 */
const centsToDecimal = (cents) => {
  if (cents === null || cents === undefined) return 0;
  return cents / 100;
};

/**
 * Convert decimal (float) to cents (integer)
 * @param {number} decimal - Amount in decimal format
 * @returns {number} Amount in cents (integer)
 */
const decimalToCents = (decimal) => {
  if (decimal === null || decimal === undefined) return 0;
  return Math.round(decimal * 100);
};

/**
 * Format amount for API response (decimal format)
 * @param {number} cents - Amount in cents (integer)
 * @returns {number} Amount in decimal format
 */
const formatForAPI = (cents) => {
  return centsToDecimal(cents);
};

/**
 * Format amount for display (with currency symbol)
 * @param {number} cents - Amount in cents (integer)
 * @returns {string} Formatted amount string
 */
const formatForDisplay = (cents) => {
  if (cents === null || cents === undefined) {
    return `${CURRENCY_CONFIG.symbol}0.00`;
  }

  const decimal = centsToDecimal(cents);
  const formatted = decimal.toLocaleString('en-IN', {
    minimumFractionDigits: CURRENCY_CONFIG.decimalPlaces,
    maximumFractionDigits: CURRENCY_CONFIG.decimalPlaces,
  });

  return `${CURRENCY_CONFIG.symbol}${formatted}`;
};

module.exports = {
  centsToDecimal,
  decimalToCents,
  formatForAPI,
  formatForDisplay,
  CURRENCY_CONFIG,
};
