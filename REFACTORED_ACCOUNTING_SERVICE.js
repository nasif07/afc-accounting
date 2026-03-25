// ✅ REFACTORED: Accounting Service
// Includes: Atomic transactions, immutability, proper validation, balance calculation

const mongoose = require('mongoose');
const JournalEntry = require('./accounting.model');
const ChartOfAccounts = require('../chartOfAccounts/coa.model');

class AccountingService {
  /**
   * ✅ NEW: Reusable validation function for journal entries
   * Can be called by Payroll, Expenses, and other modules
   */
  static validateJournalEntry(entryData) {
    const errors = [];
    
    // ✅ Check: Minimum 2 lines
    if (!entryData.bookEntries || entryData.bookEntries.length < 2) {
      errors.push("Journal entry must have at least 2 line items");
    }
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    // ✅ Check: Each line item
    for (let i = 0; i < (entryData.bookEntries || []).length; i++) {
      const entry = entryData.bookEntries[i];
      
      // ✅ Check: Account exists and is valid
      if (!entry.account) {
        errors.push(`Line ${i + 1}: Account is required`);
        continue;
      }
      
      // ✅ Check: Amount validation
      if (entry.debit === undefined && entry.credit === undefined) {
        errors.push(`Line ${i + 1}: Either debit or credit amount is required`);
      }
      
      // ✅ Check: Not both debit and credit
      if ((entry.debit || 0) > 0 && (entry.credit || 0) > 0) {
        errors.push(`Line ${i + 1}: Cannot have both debit and credit amounts`);
      }
      
      // ✅ Check: Not zero amounts
      if ((entry.debit || 0) === 0 && (entry.credit || 0) === 0) {
        errors.push(`Line ${i + 1}: Amount cannot be zero`);
      }
      
      // ✅ Check: Negative amounts
      if ((entry.debit || 0) < 0 || (entry.credit || 0) < 0) {
        errors.push(`Line ${i + 1}: Amounts cannot be negative`);
      }
      
      totalDebits += entry.debit || 0;
      totalCredits += entry.credit || 0;
    }
    
    // ✅ Check: Golden Rule - Debits must equal Credits
    // Using integer comparison (values in cents)
    if (totalDebits !== totalCredits) {
      errors.push(
        `Journal entry is not balanced. Debits: ${totalDebits / 100}, Credits: ${totalCredits / 100}`
      );
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      totalDebits: totalDebits / 100,
      totalCredits: totalCredits / 100,
    };
  }
  
  /**
   * ✅ NEW: Validate accounts before creating entry
   */
  static async validateAccounts(bookEntries) {
    const errors = [];
    
    for (let i = 0; i < bookEntries.length; i++) {
      const entry = bookEntries[i];
      
      // Fetch account with lean() for performance
      const account = await ChartOfAccounts.findById(entry.account).lean();
      
      if (!account) {
        errors.push(`Line ${i + 1}: Account not found`);
        continue;
      }
      
      // ✅ NEW: Check if account is a parent account (has children)
      if (account.hasChildren) {
        errors.push(
          `Line ${i + 1}: Account "${account.accountName}" is a parent account and cannot be used in transactions`
        );
      }
      
      // ✅ NEW: Check if account is active
      if (account.status !== 'active') {
        errors.push(
          `Line ${i + 1}: Account "${account.accountName}" is not active`
        );
      }
    }
    
    return errors;
  }
  
  /**
   * ✅ FIXED: Create journal entry with atomic transaction
   */
  static async createJournalEntry(entryData) {
    // ✅ Step 1: Validate structure
    const validation = this.validateJournalEntry(entryData);
    if (!validation.isValid) {
      const error = new Error("Journal entry validation failed");
      error.validationErrors = validation.errors;
      throw error;
    }
    
    // ✅ Step 2: Validate accounts
    const accountErrors = await this.validateAccounts(entryData.bookEntries);
    if (accountErrors.length > 0) {
      const error = new Error("Account validation failed");
      error.validationErrors = accountErrors;
      throw error;
    }
    
    // ✅ Step 3: Use MongoDB transaction for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create journal entry
      const entry = new JournalEntry({
        ...entryData,
        status: 'draft',
        approvalStatus: 'pending',
        createdBy: entryData.createdBy,
      });
      
      await entry.save({ session });
      
      // ✅ NEW: Mark accounts as having transactions (prevent deletion)
      const accountIds = entryData.bookEntries.map(e => e.account);
      await ChartOfAccounts.updateMany(
        { _id: { $in: accountIds } },
        { hasTransactions: true },
        { session }
      );
      
      await session.commitTransaction();
      
      // Populate and return
      return await entry.populate('createdBy', 'name email').populate('bookEntries.account');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
  
  /**
   * ✅ FIXED: Update entry with immutability check
   */
  static async updateEntry(entryId, updateData) {
    // ✅ NEW: Check if entry is locked (posted)
    const entry = await JournalEntry.findById(entryId);
    if (!entry) {
      throw new Error('Journal entry not found');
    }
    
    // ✅ NEW: Prevent editing of posted entries
    if (entry.status === 'posted' || entry.isLocked) {
      throw new Error('Cannot edit a posted journal entry. Create a reversal entry instead.');
    }
    
    // ✅ NEW: Prevent editing of approved entries
    if (entry.approvalStatus === 'approved') {
      throw new Error('Cannot edit an approved journal entry');
    }
    
    // ✅ NEW: If updating book entries, validate them
    if (updateData.bookEntries) {
      const validation = this.validateJournalEntry({
        bookEntries: updateData.bookEntries,
      });
      if (!validation.isValid) {
        const error = new Error("Journal entry validation failed");
        error.validationErrors = validation.errors;
        throw error;
      }
      
      const accountErrors = await this.validateAccounts(updateData.bookEntries);
      if (accountErrors.length > 0) {
        const error = new Error("Account validation failed");
        error.validationErrors = accountErrors;
        throw error;
      }
    }
    
    return await JournalEntry.findByIdAndUpdate(
      entryId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email').populate('bookEntries.account');
  }
  
  /**
   * ✅ FIXED: Delete entry with immutability check
   */
  static async deleteEntry(entryId) {
    const entry = await JournalEntry.findById(entryId);
    if (!entry) {
      throw new Error('Journal entry not found');
    }
    
    // ✅ NEW: Prevent deletion of posted entries
    if (entry.status === 'posted' || entry.isLocked) {
      throw new Error('Cannot delete a posted journal entry. Create a reversal entry instead.');
    }
    
    // ✅ NEW: Prevent deletion of approved entries
    if (entry.approvalStatus === 'approved') {
      throw new Error('Cannot delete an approved journal entry');
    }
    
    // ✅ NEW: Use soft delete (mark as archived)
    return await JournalEntry.findByIdAndUpdate(
      entryId,
      { status: 'reversed', isLocked: true },
      { new: true }
    );
  }
  
  /**
   * ✅ NEW: Approve entry and lock it
   */
  static async approveEntry(entryId, approvedBy) {
    const entry = await JournalEntry.findById(entryId);
    if (!entry) {
      throw new Error('Journal entry not found');
    }
    
    // ✅ NEW: Can only approve draft entries
    if (entry.status !== 'draft') {
      throw new Error('Only draft entries can be approved');
    }
    
    return await JournalEntry.findByIdAndUpdate(
      entryId,
      {
        approvalStatus: 'approved',
        status: 'posted',
        isLocked: true,
        approvedBy,
        approvalDate: new Date(),
      },
      { new: true }
    ).populate('bookEntries.account');
  }
  
  /**
   * ✅ NEW: Reject entry and revert to draft
   */
  static async rejectEntry(entryId, approvedBy, rejectionReason) {
    const entry = await JournalEntry.findById(entryId);
    if (!entry) {
      throw new Error('Journal entry not found');
    }
    
    // ✅ NEW: Can only reject pending entries
    if (entry.approvalStatus !== 'pending') {
      throw new Error('Only pending entries can be rejected');
    }
    
    return await JournalEntry.findByIdAndUpdate(
      entryId,
      {
        approvalStatus: 'rejected',
        approvedBy,
        approvalDate: new Date(),
        rejectionReason,
      },
      { new: true }
    );
  }
  
  /**
   * ✅ FIXED: Get all entries with correct date field
   */
  static async getAllEntries(filters = {}) {
    const query = {};
    
    if (filters.transactionType) query.transactionType = filters.transactionType;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    if (filters.status) query.status = filters.status;
    
    // ✅ FIXED: Use voucherDate instead of date
    if (filters.dateFrom || filters.dateTo) {
      query.voucherDate = {};
      if (filters.dateFrom) query.voucherDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.voucherDate.$lte = new Date(filters.dateTo);
    }
    
    return await JournalEntry.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode')
      .sort({ voucherDate: -1 })
      .lean();  // ✅ NEW: Use lean() for performance
  }
  
  /**
   * ✅ FIXED: Get entries by date range with correct field
   */
  static async getEntriesByDateRange(dateFrom, dateTo) {
    return await JournalEntry.find({
      voucherDate: {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo),
      },
    })
      .populate('bookEntries.account', 'accountName accountCode')
      .sort({ voucherDate: 1 })
      .lean();
  }
  
  /**
   * ✅ FIXED: Get entries by account
   */
  static async getEntriesByAccount(accountId) {
    return await JournalEntry.find({
      'bookEntries.account': accountId,
      status: 'posted',
      approvalStatus: 'approved',
    })
      .populate('bookEntries.account')
      .sort({ voucherDate: -1 })
      .lean();
  }
  
  /**
   * ✅ NEW: Calculate account balance from journal entries (not stored)
   * This ensures balance is always accurate
   */
  static async calculateAccountBalance(accountId, asOfDate = null) {
    const query = {
      'bookEntries.account': accountId,
      status: 'posted',
      approvalStatus: 'approved',
    };
    
    if (asOfDate) {
      query.voucherDate = { $lte: new Date(asOfDate) };
    }
    
    const entries = await JournalEntry.find(query)
      .select('bookEntries')
      .lean();
    
    let balance = 0;
    
    for (const entry of entries) {
      for (const bookEntry of entry.bookEntries) {
        if (bookEntry.account.toString() === accountId.toString()) {
          balance += (bookEntry.debit || 0) - (bookEntry.credit || 0);
        }
      }
    }
    
    return balance / 100;  // Convert from cents to decimal
  }
  
  /**
   * ✅ NEW: Get pending approvals
   */
  static async getPendingApprovals() {
    return await JournalEntry.find({ approvalStatus: 'pending' })
      .populate('createdBy', 'name email')
      .populate('bookEntries.account', 'accountName')
      .sort({ voucherDate: 1 })
      .lean();
  }
}

module.exports = AccountingService;
