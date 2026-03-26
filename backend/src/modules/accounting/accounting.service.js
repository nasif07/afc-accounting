const JournalEntry = require('./accounting.model');
const ChartOfAccounts = require('../chartOfAccounts/coa.model');
const mongoose = require('mongoose');

class AccountingService {
  static async createJournalEntry(entryData) {
    // Validate double-entry
    this.validateDoubleEntry(entryData.bookEntries);

    // ✅ FIX #4 & #5: Validate accounts are leaf nodes (fixed field name from accountId → account)
    const accountErrors = await this.validateAccounts(entryData.bookEntries);
    if (accountErrors.length > 0) {
      throw new Error(`Invalid accounts: ${accountErrors.join(', ')}`);
    }

    // ✅ FIX #7: Use atomic transaction for all operations
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const entry = new JournalEntry(entryData);
      await entry.save({ session });

      // Mark accounts as having transactions (within transaction scope)
      for (const bookEntry of entryData.bookEntries) {
        await ChartOfAccounts.findByIdAndUpdate(
          bookEntry.account,
          { hasTransactions: true },
          { session }
        );
      }

      await session.commitTransaction();
      return entry.populate('createdBy', 'name email').populate('bookEntries.account');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static validateDoubleEntry(bookEntries) {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of bookEntries) {
      totalDebits += entry.debit || 0;
      totalCredits += entry.credit || 0;
    }

    // ✅ FIX #12: Use 1 cent tolerance when working with cents (not 0.01)
    if (Math.abs(totalDebits - totalCredits) > 1) {
      throw new Error(
        `Double-entry validation failed. Debits: ${totalDebits / 100}, Credits: ${totalCredits / 100}`
      );
    }
  }

  // ✅ FIX #4 & #5: Validate accounts are leaf nodes (fixed field name)
  static async validateAccounts(bookEntries) {
    const errors = [];

    for (const entry of bookEntries) {
      // ✅ FIX #5: Handle both 'account' and 'accountId' field names for compatibility
      const accountId = entry.account || entry.accountId;
      if (!accountId) {
        errors.push('Account ID is required for each line item');
        continue;
      }

      const account = await ChartOfAccounts.findById(accountId);

      if (!account) {
        errors.push(`Account ${accountId} not found`);
        continue;
      }

      // ✅ FIX #4: Validate that account is a leaf node (no children)
      if (account.hasChildren) {
        errors.push(`Account ${account.accountCode} (${account.accountName}) is a parent account and cannot be used in transactions`);
      }

      if (account.status !== 'active') {
        errors.push(`Account ${account.accountCode} is not active`);
      }

      // ✅ FIX #13: Validate account type consistency (basic check)
      if (!account.accountType) {
        errors.push(`Account ${account.accountCode} has no type defined`);
      }
    }

    return errors;
  }

  static async getAllEntries(filters = {}) {
    const query = {};
    if (filters.transactionType) query.transactionType = filters.transactionType;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
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
      .lean();
  }

  static async getEntryById(entryId) {
    return await JournalEntry.findById(entryId)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('bookEntries.account');
  }

  static async updateEntry(entryId, updateData) {
    // Check if entry is locked
    const entry = await JournalEntry.findById(entryId);
    if (entry && entry.isLocked) {
      throw new Error("Cannot edit a locked journal entry");
    }

    // If book entries are being updated, validate double-entry
    if (updateData.bookEntries) {
      this.validateDoubleEntry(updateData.bookEntries);
      const errors = await this.validateAccounts(updateData.bookEntries);
      if (errors.length > 0) {
        throw new Error(`Invalid accounts: ${errors.join(', ')}`);
      }
    }

    return await JournalEntry.findByIdAndUpdate(entryId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'name email')
      .populate('bookEntries.account');
  }

  // ✅ FIX #14: Implement soft-delete for journal entries
  static async deleteEntry(entryId, userId) {
    const entry = await JournalEntry.findById(entryId);
    if (!entry) throw new Error('Entry not found');

    // Cannot delete posted entries
    if (entry.status === 'posted') {
      throw new Error('Cannot delete a posted journal entry');
    }

    // Soft delete instead of hard delete
    return await JournalEntry.findByIdAndUpdate(
      entryId,
      {
        status: 'deleted',
        deletedAt: new Date(),
        deletedBy: userId,
      },
      { new: true }
    );
  }

  static async approveEntry(entryId, approvedBy) {
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

  static async rejectEntry(entryId, approvedBy, rejectionReason) {
    const entry = await JournalEntry.findById(entryId);
    if (!entry) throw new Error('Entry not found');

    // Cannot reject posted entries
    if (entry.status === 'posted') {
      throw new Error('Cannot reject a posted journal entry');
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

  static async getEntriesByAccount(accountId) {
    return await JournalEntry.find({
      'bookEntries.account': accountId,
      approvalStatus: 'approved',
    })
      .populate('bookEntries.account')
      .sort({ voucherDate: -1 });
  }

  static async getPendingApprovals() {
    return await JournalEntry.find({ approvalStatus: 'pending' })
      .populate('createdBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode')
      .sort({ voucherDate: 1 });
  }

  // ✅ FIX #6: Calculate account balance from journal entries (not stored value)
  static async calculateAccountBalance(accountId) {
    const account = await ChartOfAccounts.findById(accountId);
    if (!account) throw new Error('Account not found');

    // Start with opening balance
    let balance = account.openingBalance || 0;

    // Get all posted journal entries for this account
    const entries = await JournalEntry.find({
      'bookEntries.account': accountId,
      status: 'posted'
    }).lean();

    // Calculate balance from journal entries
    for (const entry of entries) {
      for (const line of entry.bookEntries) {
        if (line.account.toString() === accountId) {
          balance += (line.debit || 0);
          balance -= (line.credit || 0);
        }
      }
    }

    return balance;
  }

  // ✅ FIX #6: Get trial balance with calculated balances
  static async getTrialBalance() {
    const entries = await JournalEntry.find({ status: 'posted' }).populate(
      'bookEntries.account'
    ).lean();

    const balances = {};
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of entries) {
      for (const bookEntry of entry.bookEntries) {
        const accountId = bookEntry.account._id.toString();
        if (!balances[accountId]) {
          balances[accountId] = {
            account: bookEntry.account,
            debit: 0,
            credit: 0,
          };
        }

        balances[accountId].debit += bookEntry.debit || 0;
        balances[accountId].credit += bookEntry.credit || 0;
        totalDebits += bookEntry.debit || 0;
        totalCredits += bookEntry.credit || 0;
      }
    }

    return {
      balances: Object.values(balances),
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 1, // 1 cent tolerance
    };
  }
}

module.exports = AccountingService;
