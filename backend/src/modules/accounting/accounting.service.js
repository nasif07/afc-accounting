const JournalEntry = require('./accounting.model');
const ChartOfAccounts = require('../chartOfAccounts/coa.model');
const mongoose = require('mongoose');

class AccountingService {
  static async generateTrialBalance(asOfDate = new Date()) {
    const accounts = await ChartOfAccounts.find({
      deletedAt: null,
      status: "active",
    }).lean();

    const balances = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      const balanceData = await this.calculateAccountBalance(account._id, asOfDate);
      const balance = balanceData.balance;

      if (balance === 0) continue;

      const isDebit = account.accountType === "Asset" || account.accountType === "Expense";
      
      if (isDebit) {
        balances.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          debit: balance > 0 ? balance : 0,
          credit: balance < 0 ? Math.abs(balance) : 0,
        });
        if (balance > 0) totalDebits += balance;
        else totalCredits += Math.abs(balance);
      } else {
        balances.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          debit: balance < 0 ? Math.abs(balance) : 0,
          credit: balance > 0 ? balance : 0,
        });
        if (balance > 0) totalCredits += balance;
        else totalDebits += Math.abs(balance);
      }
    }

    return {
      balances,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 1,
    };
  }

  static async generateIncomeStatement(startDate, endDate) {
    const revenues = await ChartOfAccounts.find({
      accountType: "Revenue",
      deletedAt: null,
      status: "active",
    }).lean();

    const expenses = await ChartOfAccounts.find({
      accountType: "Expense",
      deletedAt: null,
      status: "active",
    }).lean();

    const revenueList = [];
    let totalRevenue = 0;
    for (const account of revenues) {
      const balanceData = await this.calculateAccountBalance(account._id, new Date(endDate));
      const startBalanceData = await this.calculateAccountBalance(account._id, new Date(startDate));
      const periodBalance = balanceData.balance - startBalanceData.balance;
      
      // Revenue accounts have natural credit balance. In our calculation, credit is negative.
      // So we negate it for display.
      const displayAmount = -periodBalance;
      
      if (displayAmount !== 0) {
        revenueList.push({
          accountName: account.accountName,
          amount: displayAmount,
        });
        totalRevenue += displayAmount;
      }
    }

    const expenseList = [];
    let totalExpenses = 0;
    for (const account of expenses) {
      const balanceData = await this.calculateAccountBalance(account._id, new Date(endDate));
      const startBalanceData = await this.calculateAccountBalance(account._id, new Date(startDate));
      const periodBalance = balanceData.balance - startBalanceData.balance;

      // Expense accounts have natural debit balance (positive).
      if (periodBalance !== 0) {
        expenseList.push({
          accountName: account.accountName,
          amount: periodBalance,
        });
        totalExpenses += periodBalance;
      }
    }

    return {
      revenues: revenueList,
      totalRevenue,
      expenses: expenseList,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }

  static async generateBalanceSheet(asOfDate = new Date()) {
    const assets = await ChartOfAccounts.find({
      accountType: "Asset",
      deletedAt: null,
      status: "active",
    }).lean();

    const liabilities = await ChartOfAccounts.find({
      accountType: "Liability",
      deletedAt: null,
      status: "active",
    }).lean();

    const equity = await ChartOfAccounts.find({
      accountType: "Equity",
      deletedAt: null,
      status: "active",
    }).lean();

    const assetList = [];
    let totalAssets = 0;
    for (const account of assets) {
      const balanceData = await this.calculateAccountBalance(account._id, asOfDate);
      if (balanceData.balance !== 0) {
        assetList.push({ accountName: account.accountName, amount: balanceData.balance });
        totalAssets += balanceData.balance;
      }
    }

    const liabilityList = [];
    let totalLiabilities = 0;
    for (const account of liabilities) {
      const balanceData = await this.calculateAccountBalance(account._id, asOfDate);
      // Liabilities are natural credit (negative). Negate for display.
      const displayAmount = -balanceData.balance;
      if (displayAmount !== 0) {
        liabilityList.push({ accountName: account.accountName, amount: displayAmount });
        totalLiabilities += displayAmount;
      }
    }

    const equityList = [];
    let totalEquity = 0;
    for (const account of equity) {
      const balanceData = await this.calculateAccountBalance(account._id, asOfDate);
      // Equity is natural credit (negative). Negate for display.
      const displayAmount = -balanceData.balance;
      if (displayAmount !== 0) {
        equityList.push({ accountName: account.accountName, amount: displayAmount });
        totalEquity += displayAmount;
      }
    }

    const fiscalYearStart = new Date(asOfDate.getFullYear(), 0, 1);
    const incomeStatement = await this.generateIncomeStatement(fiscalYearStart, asOfDate);
    const retainedEarnings = incomeStatement.netIncome;
    
    equityList.push({ accountName: "Retained Earnings (Current Period)", amount: retainedEarnings });
    totalEquity += retainedEarnings;

    return {
      assets: assetList,
      totalAssets,
      liabilities: liabilityList,
      totalLiabilities,
      equity: equityList,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
    };
  }

  static async generateCashFlowStatement(startDate, endDate) {
    // Simplified Cash Flow (Direct Method)
    // In a real system, we'd categorize accounts into Operating, Investing, Financing
    const cashAccounts = await ChartOfAccounts.find({
      accountName: { $regex: /cash|bank/i },
      deletedAt: null,
    }).lean();
    
    const cashAccountIds = cashAccounts.map(a => a._id);
    
    const startBalance = await Promise.all(cashAccountIds.map(id => this.calculateAccountBalance(id, new Date(new Date(startDate).getTime() - 1))));
    const endBalance = await Promise.all(cashAccountIds.map(id => this.calculateAccountBalance(id, new Date(endDate))));
    
    const totalStart = startBalance.reduce((sum, b) => sum + b.balance, 0);
    const totalEnd = endBalance.reduce((sum, b) => sum + b.balance, 0);
    
    // Get all transactions affecting cash in this period
    const entries = await JournalEntry.find({
      "bookEntries.account": { $in: cashAccountIds },
      status: "posted",
      deletedAt: null,
      voucherDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate("bookEntries.account").lean();
    
    const inflows = [];
    const outflows = [];
    let totalInflow = 0;
    let totalOutflow = 0;
    
    for (const entry of entries) {
      const cashLines = entry.bookEntries.filter(be => cashAccountIds.some(id => id.equals(be.account._id)));
      const otherLines = entry.bookEntries.filter(be => !cashAccountIds.some(id => id.equals(be.account._id)));
      
      for (const cl of cashLines) {
        if (cl.debit > 0) {
          totalInflow += cl.debit;
          inflows.push({ date: entry.voucherDate, description: entry.description, amount: cl.debit });
        }
        if (cl.credit > 0) {
          totalOutflow += cl.credit;
          outflows.push({ date: entry.voucherDate, description: entry.description, amount: cl.credit });
        }
      }
    }
    
    return {
      openingBalance: totalStart,
      inflows,
      totalInflow,
      outflows,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow,
      closingBalance: totalEnd
    };
  }

  static async getGeneralLedgerForAccount(accountId, startDate, endDate) {
    const account = await ChartOfAccounts.findById(accountId).lean();
    if (!account) throw new Error("Account not found");

    const openingBalanceDate = startDate ? new Date(startDate) : new Date(0);
    const openingBalanceData = await this.calculateAccountBalance(accountId, new Date(openingBalanceDate.getTime() - 1));
    
    const query = {
      "bookEntries.account": accountId,
      status: "posted",
      deletedAt: null,
    };

    if (startDate || endDate) {
      query.voucherDate = {};
      if (startDate) query.voucherDate.$gte = new Date(startDate);
      if (endDate) query.voucherDate.$lte = new Date(endDate);
    }

    const entries = await JournalEntry.find(query)
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountName accountCode accountType")
      .sort({ voucherDate: 1, createdAt: 1 })
      .lean();

    let runningBalance = openingBalanceData.balance;
    let totalDebit = 0;
    let totalCredit = 0;

    const transactions = entries.map((entry) => {
      const relevantBookEntry = entry.bookEntries.find(
        (be) => be.account._id.toString() === accountId.toString()
      );
      
      const debit = relevantBookEntry.debit || 0;
      const credit = relevantBookEntry.credit || 0;
      
      totalDebit += debit;
      totalCredit += credit;
      runningBalance += debit - credit;

      return {
        date: entry.voucherDate,
        voucherNumber: entry.voucherNumber,
        transactionType: entry.transactionType,
        description: relevantBookEntry.description || entry.description,
        reference: entry.referenceNumber,
        debit,
        credit,
        runningBalance,
        journalEntryId: entry._id,
      };
    });

    return {
      accountName: account.accountName,
      accountCode: account.accountCode,
      openingBalance: openingBalanceData.balance,
      totalDebit,
      totalCredit,
      closingBalance: runningBalance,
      transactions
    };
  }

  static async calculateAccountBalance(accountId, asOfDate = new Date()) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    });

    if (!account) {
      throw new Error("Account not found");
    }

    let balance = account.openingBalance || 0;

    const entries = await JournalEntry.find({
      "bookEntries.account": accountId,
      status: "posted",
      deletedAt: null,
      voucherDate: { $lte: asOfDate },
    }).lean();

    for (const entry of entries) {
      for (const line of entry.bookEntries) {
        if (line.account.toString() === accountId.toString()) {
          balance += line.debit || 0;
          balance -= line.credit || 0;
        }
      }
    }

    return {
      accountId: account._id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      balance: balance,
      naturalBalanceType: account.accountType === "Asset" || account.accountType === "Expense" ? "debit" : "credit",
    };
  }

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

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Double-entry validation failed. Debits: ${totalDebits}, Credits: ${totalCredits}`);
    }
  }

  static async validateAccounts(bookEntries) {
    const errors = [];
    const accountIds = [...new Set(bookEntries.map(e => (e.account || e.accountId)?.toString()).filter(Boolean))];

    if (accountIds.length === 0) return ['Account is required for each line item'];

    const accounts = await ChartOfAccounts.find({ _id: { $in: accountIds }, deletedAt: null }).lean();
    const accountMap = new Map(accounts.map(a => [a._id.toString(), a]));

    const childRows = await ChartOfAccounts.aggregate([
      { $match: { parentAccount: { $in: accountIds.map(id => new mongoose.Types.ObjectId(id)) }, deletedAt: null, status: { $ne: 'archived' } } },
      { $group: { _id: '$parentAccount', count: { $sum: 1 } } }
    ]);
    const parentSet = new Set(childRows.map(row => row._id.toString()));

    for (const entry of bookEntries) {
      const accountId = (entry.account || entry.accountId)?.toString();
      if (!accountId) { errors.push('Account ID is required'); continue; }
      const account = accountMap.get(accountId);
      if (!account) { errors.push(`Account ${accountId} not found`); continue; }
      if (account.deletedAt) errors.push(`Account ${account.accountCode} is deleted`);
      if (account.status !== 'active') errors.push(`Account ${account.accountCode} is not active`);
      if (parentSet.has(accountId)) errors.push(`Account ${account.accountCode} is a parent account and cannot be used in transactions.`);
    }
    return [...new Set(errors)];
  }

  static async getAllEntries(filters = {}) {
    const query = { deletedAt: null };
    if (filters.transactionType) query.transactionType = filters.transactionType;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    if (filters.status) query.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      query.voucherDate = {};
      if (filters.dateFrom) query.voucherDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.voucherDate.$lte = new Date(filters.dateTo);
    }

    return await JournalEntry.find(query)
      .populate('createdBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode accountType')
      .sort({ voucherDate: -1, createdAt: -1 })
      .lean();
  }

  static async getEntryById(entryId) {
    return await JournalEntry.findOne({ _id: entryId, deletedAt: null })
      .populate('createdBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode accountType');
  }

  static async updateEntry(entryId, updateData) {
    const entry = await JournalEntry.findOne({ _id: entryId, deletedAt: null });
    if (!entry) throw new Error('Entry not found');
    if (entry.status === 'posted') throw new Error('Cannot edit posted journal entry');

    if (updateData.bookEntries) {
      this.validateDoubleEntry(updateData.bookEntries);
      const errors = await this.validateAccounts(updateData.bookEntries);
      if (errors.length > 0) throw new Error(`Invalid accounts: ${errors.join(', ')}`);
    }

    return await JournalEntry.findByIdAndUpdate(entryId, updateData, { new: true })
      .populate('createdBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode accountType');
  }

  static async deleteEntry(entryId, userId) {
    const entry = await JournalEntry.findOne({ _id: entryId, deletedAt: null });
    if (!entry) throw new Error('Entry not found');
    if (entry.status === 'posted') throw new Error('Cannot delete a posted journal entry');

    return await JournalEntry.findByIdAndUpdate(entryId, { status: 'deleted', deletedAt: new Date(), deletedBy: userId }, { new: true });
  }

  static async approveEntry(entryId, approvedBy) {
    const entry = await JournalEntry.findOne({ _id: entryId, deletedAt: null });
    if (!entry) throw new Error('Entry not found');
    if (entry.status === 'posted') throw new Error('Already posted');

    entry.approvalStatus = 'approved';
    entry.status = 'posted';
    entry.isLocked = true;
    entry.approvedBy = approvedBy;
    entry.approvalDate = new Date();

    await entry.save();
    return entry.populate('bookEntries.account');
  }

  static async getPendingApprovals() {
    return await JournalEntry.find({ approvalStatus: 'pending', deletedAt: null })
      .populate('bookEntries.account')
      .sort({ voucherDate: 1 });
  }
}

module.exports = AccountingService;
