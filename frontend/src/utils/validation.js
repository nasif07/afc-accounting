/**
 * Form Validation Utilities
 */

export const validators = {
  /**
   * Validate email format
   */
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Invalid email format';
  },

  /**
   * Validate phone number (Indian format)
   */
  phone: (value) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(value) ? null : 'Invalid phone number';
  },

  /**
   * Validate required field
   */
  required: (value) => {
    return value && value.trim() ? null : 'This field is required';
  },

  /**
   * Validate minimum length
   */
  minLength: (min) => (value) => {
    return value && value.length >= min ? null : `Minimum ${min} characters required`;
  },

  /**
   * Validate maximum length
   */
  maxLength: (max) => (value) => {
    return value && value.length <= max ? null : `Maximum ${max} characters allowed`;
  },

  /**
   * Validate number range
   */
  range: (min, max) => (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'Must be a number';
    return num >= min && num <= max ? null : `Value must be between ${min} and ${max}`;
  },

  /**
   * Validate amount (positive number)
   */
  amount: (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'Invalid amount';
    return num > 0 ? null : 'Amount must be greater than 0';
  },

  /**
   * Validate date format
   */
  date: (value) => {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date) ? null : 'Invalid date format';
  },

  /**
   * Validate URL format
   */
  url: (value) => {
    try {
      new URL(value);
      return null;
    } catch {
      return 'Invalid URL format';
    }
  },

  /**
   * Validate double-entry (debits equal credits)
   */
  doubleEntry: (debits, credits) => {
    const totalDebits = debits.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalCredits = credits.reduce((sum, item) => sum + (item.amount || 0), 0);
    return Math.abs(totalDebits - totalCredits) < 0.01 ? null : 'Debits must equal Credits';
  },

  /**
   * Validate pan number (Indian format)
   */
  pan: (value) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(value) ? null : 'Invalid PAN format';
  },

  /**
   * Validate aadhar number (Indian format)
   */
  aadhar: (value) => {
    const aadharRegex = /^[0-9]{12}$/;
    return aadharRegex.test(value) ? null : 'Invalid Aadhar format';
  },

  /**
   * Validate GST number (Indian format)
   */
  gst: (value) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(value) ? null : 'Invalid GST format';
  },
};

/**
 * Compose multiple validators
 */
export const composeValidators = (...validatorFunctions) => (value) => {
  for (const validator of validatorFunctions) {
    const error = validator(value);
    if (error) return error;
  }
  return null;
};

/**
 * Validate form data object
 */
export const validateFormData = (data, schema) => {
  const errors = {};

  Object.keys(schema).forEach((field) => {
    const validator = schema[field];
    const error = validator(data[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};

/**
 * Check if form has any errors
 */
export const hasErrors = (errors) => {
  return Object.keys(errors).length > 0;
};
