/**
 * Currency formatting and conversion utilities
 * Backend stores amounts as integers (cents), frontend displays as decimals
 */

const CURRENCY_CONFIG = {
  symbol: '₹',
  code: 'INR',
  decimalPlaces: 2,
  decimalSeparator: '.',
  thousandsSeparator: ',',
};

/**
 * Convert cents (integer) to decimal (float)
 * @param {number} cents - Amount in cents (integer)
 * @returns {number} Amount in decimal format
 */
export const centsToDecimal = (cents) => {
  if (cents === null || cents === undefined) return 0;
  return cents / 100;
};

/**
 * Convert decimal (float) to cents (integer)
 * @param {number} decimal - Amount in decimal format
 * @returns {number} Amount in cents (integer)
 */
export const decimalToCents = (decimal) => {
  if (decimal === null || decimal === undefined) return 0;
  return Math.round(decimal * 100);
};

/**
 * Format amount for display
 * Converts cents to decimal and applies formatting
 * @param {number} cents - Amount in cents (integer)
 * @param {object} options - Formatting options
 * @returns {string} Formatted amount string
 */
export const formatCurrency = (cents, options = {}) => {
  const {
    symbol = CURRENCY_CONFIG.symbol,
    decimalPlaces = CURRENCY_CONFIG.decimalPlaces,
    showSymbol = true,
    showCode = false,
  } = options;

  if (cents === null || cents === undefined) {
    return `${symbol}0.00`;
  }

  const decimal = centsToDecimal(cents);
  const formatted = decimal.toLocaleString('en-IN', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  let result = formatted;
  if (showSymbol) {
    result = `${symbol}${formatted}`;
  }
  if (showCode) {
    result = `${result} ${CURRENCY_CONFIG.code}`;
  }

  return result;
};

/**
 * Format amount for input fields (decimal format)
 * @param {number} cents - Amount in cents (integer)
 * @returns {string} Decimal amount as string
 */
export const formatCurrencyForInput = (cents) => {
  if (cents === null || cents === undefined) return '';
  return centsToDecimal(cents).toFixed(CURRENCY_CONFIG.decimalPlaces);
};

/**
 * Parse input value to cents
 * @param {string|number} value - Input value
 * @returns {number} Amount in cents (integer)
 */
export const parseCurrencyInput = (value) => {
  if (!value) return 0;
  const decimal = parseFloat(value);
  if (isNaN(decimal)) return 0;
  return decimalToCents(decimal);
};

/**
 * Calculate total from array of amounts (in cents)
 * @param {array} amounts - Array of amounts in cents
 * @returns {number} Total in cents
 */
export const calculateTotal = (amounts = []) => {
  return amounts.reduce((sum, amount) => sum + (amount || 0), 0);
};

/**
 * Calculate percentage of an amount
 * @param {number} amount - Amount in cents
 * @param {number} percentage - Percentage value (0-100)
 * @returns {number} Calculated amount in cents
 */
export const calculatePercentage = (amount, percentage) => {
  if (!amount || !percentage) return 0;
  return Math.round((amount * percentage) / 100);
};

export default {
  centsToDecimal,
  decimalToCents,
  formatCurrency,
  formatCurrencyForInput,
  parseCurrencyInput,
  calculateTotal,
  calculatePercentage,
  CURRENCY_CONFIG,
};
