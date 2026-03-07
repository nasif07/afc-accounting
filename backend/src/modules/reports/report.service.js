const Receipt = require('../receipts/receipt.model');
const Expense = require('../expenses/expense.model');
const JournalEntry = require('../accounting/accounting.model');
const ChartOfAccounts = require('../chartOfAccounts/coa.model');
const Bank = require('../bank/bank.model');

class ReportService {
  static async getIncomeStatement(dateFrom, dateTo) {
    // Revenue (Total Approved Receipts)
    const receipts = await Receipt.aggregate([
      {
        $match: {
          date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
          approvalStatus: 'approved'
        }
      },
      {
        $group: {
          _id: '$feeType',
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Expenses (Total Approved Expenses)
    const expenses = await Expense.aggregate([
      {
        $match: {
          date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
          approvalStatus: 'approved'
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalRevenue = receipts.reduce((sum, r) => sum + r.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.total, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      period: { from: dateFrom, to: dateTo },
      revenue: { byType: receipts, total: totalRevenue },
      expenses: { byCategory: expenses, total: totalExpenses },
      netIncome
    };
  }

  static async getBalanceSheet(asOfDate) {
    // Assets
    const assets = await ChartOfAccounts.find({
      accountType: 'asset',
      createdAt: { $lte: new Date(asOfDate) }
    });

    // Liabilities
    const liabilities = await ChartOfAccounts.find({
      accountType: 'liability',
      createdAt: { $lte: new Date(asOfDate) }
    });

    // Equity
    const equity = await ChartOfAccounts.find({
      accountType: 'equity',
      createdAt: { $lte: new Date(asOfDate) }
    });

    const totalAssets = assets.reduce((sum, a) => sum + a.currentBalance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.currentBalance, 0);
    const totalEquity = equity.reduce((sum, e) => sum + e.currentBalance, 0);

    return {
      asOfDate,
      assets: { details: assets, total: totalAssets },
      liabilities: { details: liabilities, total: totalLiabilities },
      equity: { details: equity, total: totalEquity },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity
    };
  }

  static async getCashFlowStatement(dateFrom, dateTo) {
    // Opening cash balance
    const bankAccounts = await Bank.find();
    const openingBalance = bankAccounts.reduce((sum, b) => sum + b.openingBalance, 0);

    // Cash inflows (Receipts)
    const inflows = await Receipt.aggregate([
      {
        $match: {
          date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
          approvalStatus: 'approved'
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Cash outflows (Expenses + Payroll)
    const outflows = await Expense.aggregate([
      {
        $match: {
          date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
          approvalStatus: 'approved'
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalInflows = inflows.length > 0 ? inflows[0].total : 0;
    const totalOutflows = outflows.length > 0 ? outflows[0].total : 0;
    const closingBalance = openingBalance + totalInflows - totalOutflows;

    return {
      period: { from: dateFrom, to: dateTo },
      openingBalance,
      inflows: totalInflows,
      outflows: totalOutflows,
      closingBalance
    };
  }

  static async getReceiptPaymentSummary(dateFrom, dateTo) {
    // Receipts by fee type
    const receipts = await Receipt.aggregate([
      {
        $match: {
          date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
          approvalStatus: 'approved'
        }
      },
      {
        $group: {
          _id: '$feeType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Payments by category
    const payments = await Expense.aggregate([
      {
        $match: {
          date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
          approvalStatus: 'approved'
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      period: { from: dateFrom, to: dateTo },
      receipts: { byType: receipts, total: receipts.reduce((sum, r) => sum + r.total, 0) },
      payments: { byCategory: payments, total: payments.reduce((sum, p) => sum + p.total, 0) }
    };
  }

  static async getHeadwiseIncomeReport(dateFrom, dateTo) {
    return await Receipt.aggregate([
      {
        $match: {
          date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
          approvalStatus: 'approved'
        }
      },
      {
        $group: {
          _id: '$feeType',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);
  }

  static async getTrialBalance(asOfDate) {
    const accounts = await ChartOfAccounts.find({
      createdAt: { $lte: new Date(asOfDate) }
    });

    let totalDebits = 0;
    let totalCredits = 0;

    const balances = accounts.map(account => {
      if (account.currentBalance >= 0) {
        totalDebits += account.currentBalance;
      } else {
        totalCredits += Math.abs(account.currentBalance);
      }

      return {
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        balance: account.currentBalance
      };
    });

    return {
      asOfDate,
      accounts: balances,
      totalDebits,
      totalCredits,
      balanced: Math.abs(totalDebits - totalCredits) < 0.01
    };
  }
}

module.exports = ReportService;
