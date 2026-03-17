import { CURRENCY } from '../constants/enums';

/**
 * Format currency values with rupee symbol
 */
export const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  return `${CURRENCY.SYMBOL}${parseFloat(value).toFixed(CURRENCY.DECIMAL_PLACES)}`;
};

/**
 * Format date to readable format
 */
export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date and time
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

/**
 * Format percentage
 */
export const formatPercentage = (value) => {
  if (!value && value !== 0) return '-';
  return `${parseFloat(value).toFixed(2)}%`;
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text, length = 50) => {
  if (!text) return '-';
  if (text.length <= length) return text;
  return `${text.substring(0, length)}...`;
};

/**
 * Convert string to title case
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Convert enum value to display label
 */
export const getEnumLabel = (value, labelMap) => {
  return labelMap[value] || toTitleCase(value?.replace(/-/g, ' '));
};

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
};

/**
 * Format large numbers with K, M, B suffix
 */
export const formatLargeNumber = (num) => {
  if (!num && num !== 0) return '-';
  const absNum = Math.abs(num);
  if (absNum >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (absNum >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (absNum >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone format
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

/**
 * Generate unique ID
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};
