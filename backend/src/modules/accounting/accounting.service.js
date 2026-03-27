const JournalEntry = require('./accounting.model');
const ChartOfAccounts = require('../chartOfAccounts/coa.model');
const mongoose = require('mongoose');

class AccountingService {
  static async createJournalEntry(entryData) {
    if (!entryData?.bookEntries || !Array.isArray(entryData.bookEntries)) {
      throw new Error('Book entries are required');
    }

    this.validateDoubleEntry(entryData.bookEntries);

    const accountErrors = await this.validateAccounts(entryData.bookEntries);
    if (accountErrors.length > 0) {
      throw new Error(`Invalid accounts: ${accountErrors.join(', ')}`);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const [entry] = await JournalEntry.create([entryData], { session });

      const uniqueAccountIds = [
        ...new Set(
          entryData.bookEntries
            .map((e) => (e.account || e.accountId)?.toString())
            .filter(Boolean)
        ),
      ];

      if (uniqueAccountIds.length > 0) {
        await ChartOfAccounts.updateMany(
          { _id: { $in: uniqueAccountIds } },
          { $set: { hasTransactions: true } },
          { session }
        );
      }

      await session.commitTransaction();

      return await JournalEntry.findById(entry._id)
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('bookEntries.account', 'accountName accountCode accountType');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static validateDoubleEntry(bookEntries) {
    if (!Array.isArray(bookEntries) || bookEntries.length < 2) {
      throw new Error('Journal entry must have at least 2 line items');
    }

    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of bookEntries) {
      const debit = entry.debit || 0;
      const credit = entry.credit || 0;

      if (debit > 0 && credit > 0) {
        throw new Error('A line cannot contain both debit and credit');
      }

      if (debit === 0 && credit === 0) {
        throw new Error('Each line must contain either debit or credit');
      }

      totalDebits += debit;
      totalCredits += credit;
    }

    if (Math.abs(totalDebits - totalCredits) > 1) {
      throw new Error(
        `Double-entry validation failed. Debits: ${totalDebits / 100}, Credits: ${totalCredits / 100}`
      );
    }
  }

  static async validateAccounts(bookEntries) {
    const errors = [];

    const accountIds = [
      ...new Set(
        bookEntries
          .map((entry) => entry.account || entry.accountId)
          .filter(Boolean)
          .map((id) => id.toString())
      ),
    ];

    if (accountIds.length === 0) {
      return ['Account is required for each line item'];
    }

    const accounts = await ChartOfAccounts.find({
      _id: { $in: accountIds },
      deletedAt: null,
    }).lean();

    const accountMap = new Map(
      accounts.map((account) => [account._id.toString(), account])
    );

    const childRows = await ChartOfAccounts.aggregate([
      {
        $match: {
          parentAccount: { $in: accountIds.map((id) => new mongoose.Types.ObjectId(id)) },
          deletedAt: null,
          status: { $ne: 'archived' },
        },
      },
      {
        $group: {
          _id: '$parentAccount',
          count: { $sum: 1 },
        },
      },
    ]);

    const parentSet = new Set(childRows.map((row) => row._id.toString()));

    for (const entry of bookEntries) {
      const accountId = (entry.account || entry.accountId)?.toString();

      if (!accountId) {
        errors.push('Account ID is required for each line item');
        continue;
      }

      const account = accountMap.get(accountId);

      if (!account) {
        errors.push(`Account ${accountId} not found`);
        continue;
      }

      if (account.deletedAt) {
        errors.push(`Account ${account.accountCode} is deleted`);
      }

      if (!account.isActive || account.status !== 'active') {
        errors.push(`Account ${account.accountCode} is not active`);
      }

      if (!account.accountType) {
        errors.push(`Account ${account.accountCode} has no type defined`);
      }

      if (parentSet.has(accountId)) {
        errors.push(
          `Account ${account.accountCode} (${account.accountName}) is a parent account and cannot be used in transactions`
        );
      }
    }

    return [...new Set(errors)];
  }

  static buildListQuery(filters = {}) {
    const query = {
      deletedAt: null,
    };

    if (filters.transactionType) {
      query.transactionType = filters.transactionType;
    }

    if (filters.approvalStatus) {
      query.approvalStatus = filters.approvalStatus;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.voucherDate = {};
      if (filters.dateFrom) query.voucherDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.voucherDate.$lte = new Date(filters.dateTo);
    }

    return query;
  }

  static async getAllEntries(filters = {}) {
    const query = this.buildListQuery(filters);

    return await JournalEntry.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode accountType')
      .sort({ voucherDate: -1, createdAt: -1 })
      .lean();
  }

  static async getEntryById(entryId) {
    return await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    })
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode accountType');
  }

  static async updateEntry(entryId, updateData) {
    const entry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    });

    if (!entry) {
      throw new Error('Entry not found');
    }

    if (entry.isLocked || entry.status === 'posted' || entry.status === 'reversed' || entry.status === 'deleted') {
      throw new Error('Cannot edit finalized journal entry');
    }

    const forbiddenFields = [
      'approvedBy',
      'approvalDate',
      'deletedAt',
      'deletedBy',
      'isBalanced',
      'isLocked',
      'reversalOf',
      'totalDebit',
      'totalCredit',
      'createdBy',
    ];

    for (const field of forbiddenFields) {
      if (updateData[field] !== undefined) {
        throw new Error(`${field} cannot be updated directly`);
      }
    }

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
      .populate('approvedBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode accountType');
  }

  static async deleteEntry(entryId, userId) {
    const entry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    });

    if (!entry) {
      throw new Error('Entry not found');
    }

    if (entry.status === 'posted' || entry.isLocked) {
      throw new Error('Cannot delete a posted or locked journal entry');
    }

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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const entry = await JournalEntry.findOne({
        _id: entryId,
        deletedAt: null,
      }).session(session);

      if (!entry) {
        throw new Error('Entry not found');
      }

      if (entry.status === 'posted') {
        throw new Error('Journal entry already posted');
      }

      if (entry.status === 'deleted' || entry.status === 'reversed') {
        throw new Error('Cannot approve this journal entry');
      }

      if (entry.approvalStatus !== 'pending') {
        throw new Error('Only pending entries can be approved');
      }

      this.validateDoubleEntry(entry.bookEntries);

      const accountErrors = await this.validateAccounts(entry.bookEntries);
      if (accountErrors.length > 0) {
        throw new Error(`Invalid accounts: ${accountErrors.join(', ')}`);
      }

      entry.approvalStatus = 'approved';
      entry.status = 'posted';
      entry.isLocked = true;
      entry.approvedBy = approvedBy;
      entry.approvalDate = new Date();

      await entry.save({ session });
      await session.commitTransaction();

      return await JournalEntry.findById(entry._id)
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('bookEntries.account', 'accountName accountCode accountType');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  static async rejectEntry(entryId, approvedBy, rejectionReason) {
    const entry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    });

    if (!entry) {
      throw new Error('Entry not found');
    }

    if (entry.status === 'posted') {
      throw new Error('Cannot reject a posted journal entry');
    }

    if (entry.status === 'deleted' || entry.status === 'reversed') {
      throw new Error('Cannot reject this journal entry');
    }

    if (entry.approvalStatus !== 'pending') {
      throw new Error('Only pending entries can be rejected');
    }

    return await JournalEntry.findByIdAndUpdate(
      entryId,
      {
        approvalStatus: 'rejected',
        approvedBy,
        approvalDate: new Date(),
        rejectionReason: rejectionReason || '',
      },
      { new: true }
    )
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode accountType');
  }

  static async getEntriesByDateRange(dateFrom, dateTo) {
    return await JournalEntry.find({
      voucherDate: {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo),
      },
      deletedAt: null,
    })
      .populate('bookEntries.account', 'accountName accountCode accountType')
      .sort({ voucherDate: 1, createdAt: 1 })
      .lean();
  }

  static async getEntriesByAccount(accountId) {
    return await JournalEntry.find({
      'bookEntries.account': accountId,
      approvalStatus: 'approved',
      status: 'posted',
      deletedAt: null,
    })
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode accountType')
      .sort({ voucherDate: -1, createdAt: -1 })
      .lean();
  }

  static async getPendingApprovals() {
    return await JournalEntry.find({
      approvalStatus: 'pending',
      status: { $nin: ['deleted', 'reversed'] },
      deletedAt: null,
    })
      .populate('createdBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode accountType')
      .sort({ voucherDate: 1, createdAt: 1 })
      .lean();
  }

  static async calculateAccountBalance(accountId) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    });

    if (!account) {
      throw new Error('Account not found');
    }

    let balance = account.openingBalance || 0;

    const entries = await JournalEntry.find({
      'bookEntries.account': accountId,
      status: 'posted',
      deletedAt: null,
    }).lean();

    for (const entry of entries) {
      for (const line of entry.bookEntries) {
        if (line.account.toString() === accountId.toString()) {
          balance += line.debit || 0;
          balance -= line.credit || 0;
        }
      }
    }

    return balance;
  }

  static async getTrialBalance() {
    const entries = await JournalEntry.find({
      status: 'posted',
      deletedAt: null,
    })
      .populate('bookEntries.account', 'accountName accountCode accountType')
      .lean();

    const balances = {};
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of entries) {
      for (const bookEntry of entry.bookEntries) {
        if (!bookEntry.account) continue;

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
      isBalanced: Math.abs(totalDebits - totalCredits) <= 1,
    };
  }
}

module.exports = AccountingService;