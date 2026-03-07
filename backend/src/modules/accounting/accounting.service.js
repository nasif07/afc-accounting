const JournalEntry = require('./accounting.model');
const ChartOfAccounts = require('../chartOfAccounts/coa.model');

class AccountingService {
  static async createJournalEntry(entryData) {
    // Validate double-entry
    this.validateDoubleEntry(entryData.bookEntries);

    const entry = new JournalEntry(entryData);
    await entry.save();

    // Update account balances
    for (const bookEntry of entryData.bookEntries) {
      await ChartOfAccounts.findByIdAndUpdate(
        bookEntry.account,
        {
          $inc: {
            currentBalance: bookEntry.isDebit ? bookEntry.amount : -bookEntry.amount
          }
        }
      );
    }

    return entry.populate('createdBy', 'name email').populate('bookEntries.account');
  }

  static validateDoubleEntry(bookEntries) {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of bookEntries) {
      if (entry.isDebit) {
        totalDebits += entry.amount;
      } else {
        totalCredits += entry.amount;
      }
    }

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Double-entry validation failed. Debits: ${totalDebits}, Credits: ${totalCredits}`);
    }
  }

  static async getAllEntries(filters = {}) {
    const query = {};
    if (filters.transactionType) query.transactionType = filters.transactionType;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.date.$lte = new Date(filters.dateTo);
    }

    return await JournalEntry.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode')
      .sort({ date: -1 });
  }

  static async getEntryById(entryId) {
    return await JournalEntry.findById(entryId)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('bookEntries.account');
  }

  static async updateEntry(entryId, updateData) {
    // If book entries are being updated, validate double-entry
    if (updateData.bookEntries) {
      this.validateDoubleEntry(updateData.bookEntries);
    }

    return await JournalEntry.findByIdAndUpdate(
      entryId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email').populate('bookEntries.account');
  }

  static async deleteEntry(entryId) {
    const entry = await JournalEntry.findById(entryId);
    if (!entry) throw new Error('Entry not found');

    // Reverse account balances
    for (const bookEntry of entry.bookEntries) {
      await ChartOfAccounts.findByIdAndUpdate(
        bookEntry.account,
        {
          $inc: {
            currentBalance: bookEntry.isDebit ? -bookEntry.amount : bookEntry.amount
          }
        }
      );
    }

    return await JournalEntry.findByIdAndDelete(entryId);
  }

  static async approveEntry(entryId, approvedBy) {
    return await JournalEntry.findByIdAndUpdate(
      entryId,
      {
        approvalStatus: 'approved',
        approvedBy,
        approvalDate: new Date()
      },
      { new: true }
    ).populate('bookEntries.account');
  }

  static async rejectEntry(entryId, approvedBy, rejectionReason) {
    const entry = await JournalEntry.findById(entryId);
    if (!entry) throw new Error('Entry not found');

    // Reverse account balances
    for (const bookEntry of entry.bookEntries) {
      await ChartOfAccounts.findByIdAndUpdate(
        bookEntry.account,
        {
          $inc: {
            currentBalance: bookEntry.isDebit ? -bookEntry.amount : bookEntry.amount
          }
        }
      );
    }

    return await JournalEntry.findByIdAndUpdate(
      entryId,
      {
        approvalStatus: 'rejected',
        approvedBy,
        approvalDate: new Date(),
        rejectionReason
      },
      { new: true }
    );
  }

  static async getEntriesByDateRange(dateFrom, dateTo) {
    return await JournalEntry.find({
      date: {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo)
      }
    })
      .populate('bookEntries.account', 'accountName accountCode')
      .sort({ date: 1 });
  }

  static async getEntriesByAccount(accountId) {
    return await JournalEntry.find({
      'bookEntries.account': accountId,
      approvalStatus: 'approved'
    })
      .populate('bookEntries.account')
      .sort({ date: -1 });
  }

  static async getPendingApprovals() {
    return await JournalEntry.find({ approvalStatus: 'pending' })
      .populate('createdBy', 'name email')
      .populate('bookEntries.account', 'accountName')
      .sort({ date: 1 });
  }
}

module.exports = AccountingService;
