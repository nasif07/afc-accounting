/**
 * Currency formatting utilities
 * Frontend works with decimal values directly
 */

const CURRENCY_CONFIG = {
  symbol: "৳",
  code: "BDT",
  decimalPlaces: 2,
};

export const formatCurrency = (amount, options = {}) => {
  const {
    symbol = CURRENCY_CONFIG.symbol,
    decimalPlaces = CURRENCY_CONFIG.decimalPlaces,
    showSymbol = true,
    showCode = false,
  } = options;

  const numericAmount = Number(amount || 0);

  const formatted = numericAmount.toLocaleString("en-BD", {
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

export const formatCurrencyForInput = (amount) => {
  if (amount === null || amount === undefined) return "";
  return Number(amount).toFixed(CURRENCY_CONFIG.decimalPlaces);
};

export const parseCurrencyInput = (value) => {
  if (!value) return 0;
  const numericValue = parseFloat(value);
  return isNaN(numericValue) ? 0 : numericValue;
};

export const calculateTotal = (amounts = []) => {
  return amounts.reduce((sum, amount) => sum + Number(amount || 0), 0);
};

export const calculatePercentage = (amount, percentage) => {
  if (!amount || !percentage) return 0;
  return (Number(amount) * Number(percentage)) / 100;
};

export default {
  formatCurrency,
  formatCurrencyForInput,
  parseCurrencyInput,
  calculateTotal,
  calculatePercentage,
  CURRENCY_CONFIG,
};