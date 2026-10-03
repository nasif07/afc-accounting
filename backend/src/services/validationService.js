const ChartOfAccounts = require('../modules/chartOfAccounts/coa.model');

class ValidationService {
  static validateJournalEntry(entryData) {
    const errors = [];

    if (!entryData.bookEntries || entryData.bookEntries.length < 2) {
      errors.push("Journal entry must have at least 2 line items (double-entry principle)");
    }

    let totalDebits = 0;
    let totalCredits = 0;

    for (let i = 0; i < (entryData.bookEntries || []).length; i++) {
      const entry = entryData.bookEntries[i];

      if (!entry.account) {
        errors.push(`Line ${i + 1}: Account is required`);
        continue;
      }

      if (entry.debit === undefined && entry.credit === undefined) {
        errors.push(`Line ${i + 1}: Either debit or credit amount is required`);
      }

      if ((entry.debit || 0) > 0 && (entry.credit || 0) > 0) {
        errors.push(`Line ${i + 1}: Cannot have both debit and credit amounts`);
      }

      if ((entry.debit || 0) === 0 && (entry.credit || 0) === 0) {
        errors.push(`Line ${i + 1}: Amount cannot be zero`);
      }

      if ((entry.debit || 0) < 0 || (entry.credit || 0) < 0) {
        errors.push(`Line ${i + 1}: Amounts cannot be negative`);
      }

      totalDebits += entry.debit || 0;
      totalCredits += entry.credit || 0;
    }

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

  static async validateAccounts(bookEntries) {
    const errors = [];
    const validAccounts = [];

    for (let i = 0; i < bookEntries.length; i++) {
      const entry = bookEntries[i];
      const account = await ChartOfAccounts.findById(entry.account).lean();

      if (!account) {
        errors.push(`Line ${i + 1}: Account does not exist`);
        continue;
      }

      if (account.hasChildren) {
        errors.push(
          `Line ${i + 1}: Account "${account.accountName}" is a parent account and cannot be used in transactions`
        );
      }

      if (account.status !== 'active') {
        errors.push(
          `Line ${i + 1}: Account "${account.accountName}" is not active`
        );
      }

      if (!account.hasChildren && account.status === 'active') {
        validAccounts.push(account);
      }
    }

    return { isValid: errors.length === 0, errors, validAccounts };
  }

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

    return { isValid: errors.length === 0, errors };
  }

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
    if (amount * 100 !== Math.round(amount * 100)) {
      return { isValid: false, error: `${fieldName} can have maximum 2 decimal places` };
    }
    return { isValid: true };
  }

  static validateDate(date, fieldName = 'Date') {
    if (!date) return { isValid: false, error: `${fieldName} is required` };
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return { isValid: false, error: `${fieldName} is not a valid date` };
    }
    return { isValid: true, date: dateObj };
  }

  static validateDateRange(dateFrom, dateTo) {
    const errors = [];
    const fromValidation = this.validateDate(dateFrom, 'From date');
    if (!fromValidation.isValid) errors.push(fromValidation.error);
    const toValidation = this.validateDate(dateTo, 'To date');
    if (!toValidation.isValid) errors.push(toValidation.error);
    if (fromValidation.isValid && toValidation.isValid) {
      if (fromValidation.date > toValidation.date) {
        errors.push('From date cannot be after To date');
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  static validateRequiredFields(data, requiredFields) {
    const errors = [];
    for (const field of requiredFields) {
      if (!data[field]) errors.push(`${field} is required`);
    }
    return { isValid: errors.length === 0, errors };
  }
}

module.exports = ValidationService;
