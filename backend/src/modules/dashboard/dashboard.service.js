const Bank = require("../bank/bank.model");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");
const COAService = require("../chartOfAccounts/coa.service");
const JournalEntry = require("../accounting/accounting.model");
const PettyCashService = require("../pettycash/pettycash.service");

const PETTY_CASH_ACCOUNT_CODE = "1001";
const BANK_PARENT_ACCOUNT_CODE = "1002";

class DashboardService {
  static getAccountId(account) {
    if (!account) return "";
    if (typeof account === "object") return String(account._id || account);
    return String(account);
  }

  static getAccountLabel(account) {
    if (!account || typeof account === "string") return "Unassigned";
    const code = account.accountCode ? `${account.accountCode} - ` : "";
    return `${code}${account.accountName || "Unassigned"}`;
  }

  static getLineForAccount(entry, accountId) {
    return (entry.bookEntries || []).find(
      (line) => this.getAccountId(line.account) === String(accountId),
    );
  }

  static getMonthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  static getMonthEnd(date) {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  }

  static getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
  }

  static getMonthLabel(date) {
    return date.toLocaleString("en-US", { month: "short" });
  }

  static async getApprovedEntries(query = {}) {
    return await JournalEntry.find({
      ...query,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
    })
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountCode accountName accountType");
  }

  static async getMonthlyIncomeExpense() {
    const now = new Date();
    const startDate = this.getMonthStart(now);
    const endDate = this.getMonthEnd(now);

    const entries = await this.getApprovedEntries({
      voucherDate: { $gte: startDate, $lte: endDate },
    });

    let income = 0;
    let expense = 0;

    for (const entry of entries) {
      const jsonEntry = entry.toJSON();

      for (const line of jsonEntry.bookEntries || []) {
        const type = String(line.account?.accountType || "").toLowerCase();
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);

        if (["income", "revenue"].includes(type)) {
          income += credit - debit;
        }

        if (type === "expense") {
          expense += debit - credit;
        }
      }
    }

    return {
      income: Math.max(0, income),
      expense: Math.max(0, expense),
    };
  }

  static async getIncomeExpenseChart(monthCount = 6) {
    const now = new Date();
    const firstMonth = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
    const buckets = new Map();

    for (let index = 0; index < monthCount; index += 1) {
      const bucketDate = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
      buckets.set(this.getMonthKey(bucketDate), {
        month: this.getMonthLabel(bucketDate),
        income: 0,
        expense: 0,
      });
    }

    const entries = await this.getApprovedEntries({
      voucherDate: {
        $gte: firstMonth,
        $lte: this.getMonthEnd(now),
      },
    });

    for (const entry of entries) {
      const jsonEntry = entry.toJSON();
      const key = this.getMonthKey(new Date(jsonEntry.voucherDate));
      const bucket = buckets.get(key);
      if (!bucket) continue;

      for (const line of jsonEntry.bookEntries || []) {
        const type = String(line.account?.accountType || "").toLowerCase();
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);

        if (["income", "revenue"].includes(type)) {
          bucket.income += credit - debit;
        }

        if (type === "expense") {
          bucket.expense += debit - credit;
        }
      }
    }

    return [...buckets.values()].map((bucket) => ({
      ...bucket,
      income: Math.max(0, bucket.income),
      expense: Math.max(0, bucket.expense),
    }));
  }

  static async getExpenseByCategory() {
    const now = new Date();
    const entries = await this.getApprovedEntries({
      voucherDate: {
        $gte: this.getMonthStart(now),
        $lte: this.getMonthEnd(now),
      },
    });

    const categories = new Map();

    for (const entry of entries) {
      const jsonEntry = entry.toJSON();

      for (const line of jsonEntry.bookEntries || []) {
        const type = String(line.account?.accountType || "").toLowerCase();
        if (type !== "expense") continue;

        const amount = Number(line.debit || 0) - Number(line.credit || 0);
        if (amount <= 0) continue;

        const label = this.getAccountLabel(line.account);
        categories.set(label, (categories.get(label) || 0) + amount);
      }
    }

    return [...categories.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }

  static async getPettyCashSummary() {
    try {
      const result = await PettyCashService.getJournalBackedTransactions({
        page: 1,
        limit: 5,
      });

      return {
        balance: result.summary?.balance || 0,
        recent: result.transactions || [],
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return { balance: 0, recent: [], warning: error.message };
      }

      throw error;
    }
  }

  static async getBankAccountIds() {
    const bankParent = await ChartOfAccounts.findOne({
      accountCode: BANK_PARENT_ACCOUNT_CODE,
      deletedAt: null,
    });

    if (!bankParent) return [];

    const childAccounts = await ChartOfAccounts.find({
      parentAccount: bankParent._id,
      status: "active",
      deletedAt: null,
    }).select("_id");

    const childIds = childAccounts.map((account) => account._id);

    return childIds;
  }

  static async getBankBalanceAndAlerts() {
    const bankAccountIds = await this.getBankAccountIds();

    if (bankAccountIds.length === 0) {
      return {
        balance: 0,
        alerts: [],
      };
    }

    await Promise.all(
      bankAccountIds.map((accountId) =>
        COAService.deduplicateOpeningBalanceJournals(accountId),
      ),
    );

    const entries = await this.getApprovedEntries({
      "bookEntries.account": { $in: bankAccountIds },
    });

    let balance = 0;
    const alerts = [];

    for (const entry of entries) {
      const jsonEntry = entry.toJSON();

      for (const accountId of bankAccountIds) {
        const line = this.getLineForAccount(jsonEntry, accountId);
        if (!line) continue;

        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        balance += debit - credit;

        const reconciliation = (jsonEntry.bankReconciliations || []).find(
          (item) => String(item.account) === String(accountId),
        );

        if (reconciliation?.status !== "reconciled") {
          alerts.push({
            id: `${jsonEntry._id}-${accountId}`,
            type: "unreconciled",
            date: jsonEntry.voucherDate,
            voucherNumber: jsonEntry.voucherNumber,
            referenceNumber: jsonEntry.referenceNumber || "",
            description: line.description || jsonEntry.description || "",
            amount: debit - credit,
          });
        }
      }
    }

    const mismatchBanks = await Bank.find({
      coaAccount: { $in: bankAccountIds },
      isActive: true,
      deletedAt: null,
      reconciliationDifference: { $ne: 0 },
    }).select("bankName reconciliationDifference lastReconciledDate");

    for (const bank of mismatchBanks) {
      alerts.push({
        id: `bank-mismatch-${bank._id}`,
        type: "mismatch",
        date: bank.lastReconciledDate,
        voucherNumber: "Reconciliation",
        description: `${bank.bankName} reconciliation difference`,
        amount: Number(bank.reconciliationDifference || 0),
      });
    }

    return {
      balance,
      alerts: alerts
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 8),
    };
  }

  static async getRecentJournals(limit = 5) {
    const entries = await JournalEntry.find({ deletedAt: null })
      .populate("createdBy", "name email")
      .sort({ voucherDate: -1, createdAt: -1 })
      .limit(limit);

    return entries.map((entry) => {
      const jsonEntry = entry.toJSON();
      return {
        id: jsonEntry._id,
        voucherNumber: jsonEntry.voucherNumber,
        voucherDate: jsonEntry.voucherDate,
        description: jsonEntry.description,
        referenceNumber: jsonEntry.referenceNumber || "",
        status: jsonEntry.approvalStatus,
        postingStatus: jsonEntry.status,
        totalDebit: jsonEntry.totalDebit,
        createdBy: jsonEntry.createdBy,
      };
    });
  }

  static async getDashboardSummary() {
    const [
      pettyCash,
      bank,
      monthly,
      incomeExpenseChart,
      expenseByCategory,
      pendingApproval,
      recentJournals,
    ] = await Promise.all([
      this.getPettyCashSummary(),
      this.getBankBalanceAndAlerts(),
      this.getMonthlyIncomeExpense(),
      this.getIncomeExpenseChart(),
      this.getExpenseByCategory(),
      JournalEntry.countDocuments({
        approvalStatus: "pending",
        deletedAt: null,
      }),
      this.getRecentJournals(),
    ]);

    return {
      summary: {
        pettyCash: pettyCash.balance,
        bankBalance: bank.balance,
        monthlyIncome: monthly.income,
        monthlyExpense: monthly.expense,
        pendingApproval,
      },
      charts: {
        incomeVsExpense: incomeExpenseChart,
        expenseByCategory,
      },
      recentJournals,
      recentPettyCash: pettyCash.recent,
      bankReconciliationAlerts: bank.alerts,
      warnings: {
        pettyCash: pettyCash.warning || "",
      },
    };
  }
}

module.exports = DashboardService;
