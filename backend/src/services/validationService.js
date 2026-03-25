// ✅ NEW: Validation Service
// Reusable validation functions for accounting operations
// Can be used by Payroll, Expenses, Receipts, and other modules

const ChartOfAccounts = require('../modules/chartOfAccounts/coa.model');

class ValidationService {
  /**
   * ✅ Validate journal entry structure and balance
   * @param {Object} entryData - Journal entry data with bookEntries
   * @returns {Object} { isValid, errors, totalDebits, totalCredits }
   */
  static validateJournalEntry(entryData) {
    const errors = [];
    
    // ✅ Check: Minimum 2 lines required (double-entry principle)
    if (!entryData.bookEntries || entryData.bookEntries.length < 2) {
      errors.push("Journal entry must have at least 2 line items (double-entry principle)");
    }
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    // ✅ Validate each line item
    for (let i = 0; i < (entryData.bookEntries || []).length; i++) {
      const entry = entryData.bookEntries[i];
      
      // Check: Account is required
      if (!entry.account) {
        errors.push(`Line ${i + 1}: Account is required`);
        continue;
      }
      
      // Check: Amount is required
      if (entry.debit === undefined && entry.credit === undefined) {
        errors.push(`Line ${i + 1}: Either debit or credit amount is required`);
      }
      
      // Check: Cannot have both debit and credit
      if ((entry.debit || 0) > 0 && (entry.credit || 0) > 0) {
        errors.push(`Line ${i + 1}: Cannot have both debit and credit amounts`);
      }
      
      // Check: Cannot have zero amounts
      if ((entry.debit || 0) === 0 && (entry.credit || 0) === 0) {
        errors.push(`Line ${i + 1}: Amount cannot be zero`);
      }
      
      // Check: Cannot have negative amounts
      if ((entry.debit || 0) < 0 || (entry.credit || 0) < 0) {
        errors.push(`Line ${i + 1}: Amounts cannot be negative`);
      }
      
      totalDebits += entry.debit || 0;
      totalCredits += entry.credit || 0;
    }
    
    // ✅ Check: Golden Rule - Debits must equal Credits
    // Using integer comparison (values stored in cents)
    if (totalDebits !== totalCredits) {
      errors.push(
        `Journal entry is not balanced. Debits: ${(totalDebits / 100).toFixed(2)}, Credits: ${(totalCredits / 100).toFixed(2)}`
      );
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      totalDebits: totalDebits / 100,
      totalCredits: totalCredits / 100,
      isBalanced: totalDebits === totalCredits,
    };
  }
  
  /**
   * ✅ Validate accounts for use in transactions
   * @param {Array} bookEntries - Array of book entries with account IDs
   * @returns {Promise<Object>} { isValid, errors, validAccounts }
   */
  static async validateAccounts(bookEntries) {
    const errors = [];
    const validAccounts = [];
    
    for (let i = 0; i < bookEntries.length; i++) {
      const entry = bookEntries[i];
      
      // Fetch account
      const account = await ChartOfAccounts.findById(entry.account).lean();
      
      if (!account) {
        errors.push(`Line ${i + 1}: Account does not exist`);
        continue;
      }
      
      // ✅ Check: Only leaf nodes can be used (no children)
      if (account.hasChildren) {
        errors.push(
          `Line ${i + 1}: Account "${account.accountName}" is a parent account and cannot be used in transactions`
        );
      }
      
      // ✅ Check: Only active accounts can be used
      if (account.status !== 'active') {
        errors.push(
          `Line ${i + 1}: Account "${account.accountName}" is not active`
        );
      }
      
      if (!account.hasChildren && account.status === 'active') {
        validAccounts.push(account);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validAccounts,
    };
  }
  
  /**
   * ✅ Validate a single account for transaction use
   * @param {String} accountId - Account ID
   * @returns {Promise<Object>} { isValid, errors, account }
   */
  static async validateAccount(accountId) {
    const errors = [];
    
    const account = await ChartOfAccounts.findById(accountId).lean();
    
    if (!account) {
      errors.push('Account does not exist');
      return { isValid: false, errors };
    }
    
    if (account.hasChildren) {
      errors.push(`Account "${account.accountName}" is a parent account and cannot be used in transactions`);
    }
    
    if (account.status !== 'active') {
      errors.push(`Account "${account.accountName}" is not active`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      account: errors.length === 0 ? account : null,
    };
  }
  
  /**
   * ✅ Validate account type hierarchy
   * @param {String} accountId - Account ID
   * @param {String} expectedType - Expected account type
   * @returns {Promise<Object>} { isValid, errors }
   */
  static async validateAccountType(accountId, expectedType) {
    const errors = [];
    
    const account = await ChartOfAccounts.findById(accountId).lean();
    
    if (!account) {
      errors.push('Account does not exist');
      return { isValid: false, errors };
    }
    
    if (account.accountType !== expectedType) {
      errors.push(
        `Account "${account.accountName}" is of type ${account.accountType}, expected ${expectedType}`
      );
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * ✅ Validate amount format (must be positive number)
   * @param {Number} amount - Amount to validate
   * @param {String} fieldName - Field name for error message
   * @returns {Object} { isValid, error }
   */
  static validateAmount(amount, fieldName = 'Amount') {
    if (amount === undefined || amount === null) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { isValid: false, error: `${fieldName} must be a valid number` };
    }
    
    if (amount < 0) {
      return { isValid: false, error: `${fieldName} cannot be negative` };
    }
    
    if (amount === 0) {
      return { isValid: false, error: `${fieldName} cannot be zero` };
    }
    
    // ✅ Check: Maximum 2 decimal places
    if (amount * 100 !== Math.round(amount * 100)) {
      return { isValid: false, error: `${fieldName} can have maximum 2 decimal places` };
    }
    
    return { isValid: true };
  }
  
  /**
   * ✅ Validate date format
   * @param {Date|String} date - Date to validate
   * @param {String} fieldName - Field name for error message
   * @returns {Object} { isValid, error, date }
   */
  static validateDate(date, fieldName = 'Date') {
    if (!date) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return { isValid: false, error: `${fieldName} is not a valid date` };
    }
    
    return { isValid: true, date: dateObj };
  }
  
  /**
   * ✅ Validate date range
   * @param {Date|String} dateFrom - Start date
   * @param {Date|String} dateTo - End date
   * @returns {Object} { isValid, errors }
   */
  static validateDateRange(dateFrom, dateTo) {
    const errors = [];
    
    const fromValidation = this.validateDate(dateFrom, 'From date');
    if (!fromValidation.isValid) {
      errors.push(fromValidation.error);
    }
    
    const toValidation = this.validateDate(dateTo, 'To date');
    if (!toValidation.isValid) {
      errors.push(toValidation.error);
    }
    
    if (fromValidation.isValid && toValidation.isValid) {
      if (fromValidation.date > toValidation.date) {
        errors.push('From date cannot be after To date');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * ✅ Validate required fields
   * @param {Object} data - Data object
   * @param {Array} requiredFields - Array of required field names
   * @returns {Object} { isValid, errors }
   */
  static validateRequiredFields(data, requiredFields) {
    const errors = [];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = ValidationService;
