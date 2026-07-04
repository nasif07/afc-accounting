const JournalEntry = require('../accounting/accounting.model');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safeRegex = (s) => ({ $regex: escapeRegex(String(s).slice(0, 100)), $options: 'i' });

class SearchService {
  static async searchJournalEntries(query, filters = {}) {
    const searchRegex = safeRegex(query);
    const dateFilter = this.buildDateFilter(filters);

    return await JournalEntry.find({
      $or: [
        { referenceNumber: searchRegex },
        { description: searchRegex }
      ],
      ...dateFilter,
      ...(filters.transactionType && { transactionType: filters.transactionType }),
      ...(filters.approvalStatus && { approvalStatus: filters.approvalStatus })
    })
      .populate('bookEntries.account', 'accountName accountCode')
      .sort({ date: -1 });
  }

  static buildDateFilter(filters) {
    const dateFilter = {};
    if (filters.dateFrom || filters.dateTo) {
      dateFilter.date = {};
      if (filters.dateFrom) dateFilter.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) dateFilter.date.$lte = new Date(filters.dateTo);
    }
    return dateFilter;
  }
}

module.exports = SearchService;
