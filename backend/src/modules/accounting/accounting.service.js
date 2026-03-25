const JournalEntry = require('./accounting.model');
const ChartOfAccounts = require('../chartOfAccounts/coa.model');
const mongoose = require('mongoose');

class AccountingService {
  static async createJournalEntry(entryData) {
    // Validate double-entry
    this.validateDoubleEntry(entryData.bookEntries);

    // Validate accounts are leaf nodes
    const accountErrors = await this.validateAccounts(entryData.bookEntries);
    if (accountErrors.length > 0) {
      throw new Error(`Invalid accounts: ${accountErrors.join(', ')}`);
    }

    // Use atomic transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const entry = new JournalEntry(entryData);
      await entry.save({ session });

      // Mark accounts as having transactions
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

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(
        `Double-entry validation failed. Debits: ${totalDebits}, Credits: ${totalCredits}`
      );
    }
  }

  // Validate accounts are leaf nodes
  static async validateAccounts(bookEntries) {
    const errors = [];

    for (const entry of bookEntries) {
      const account = await ChartOfAccounts.findById(entry.account);

      if (!account) {
        errors.push(`Account ${entry.account} not found`);
        continue;
      }

      if (account.hasChildren) {
        errors.push(`Account ${account.accountCode} is a parent account and cannot be used`);
      }

      if (account.status !== 'active') {
        errors.push(`Account ${account.accountCode} is not active`);
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

  static async deleteEntry(entryId) {
    const entry = await JournalEntry.findById(entryId);
    if (!entry) throw new Error('Entry not found');

    // Cannot delete posted entries
    if (entry.status === 'posted') {
      throw new Error('Cannot delete a posted journal entry');
    }

    return await JournalEntry.findByIdAndDelete(entryId);
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
      .populate('bookEntries.account', 'accountName')
      .sort({ voucherDate: 1 });
  }

  // Calculate account balance from journal entries
  static async calculateAccountBalance(accountId) {
    const entries = await JournalEntry.find({
      'bookEntries.account': accountId,
      status: 'posted',
    });

    let balance = 0;
    for (const entry of entries) {
      for (const bookEntry of entry.bookEntries) {
        if (bookEntry.account.toString() === accountId.toString()) {
          balance += (bookEntry.debit || 0) - (bookEntry.credit || 0);
        }
      }
    }

    return balance;
  }

  // Get trial balance
  static async getTrialBalance() {
    const entries = await JournalEntry.find({ status: 'posted' }).populate(
      'bookEntries.account'
    );

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
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }
}

module.exports = AccountingService;
