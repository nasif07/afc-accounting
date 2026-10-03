const ChartOfAccounts = require("../chartOfAccounts/coa.model");
const COAService = require("../chartOfAccounts/coa.service");
const JournalEntry = require("../accounting/accounting.model");
const PettyCashService = require("../pettycash/pettycash.service");
const { formatReferenceNumber } = require("../../utils/reference");

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

      // getJournalBackedTransactions returns balance as an unsigned
      // magnitude plus a separate balanceType (matching the COA "Current
      // Balance" display convention) — reconstruct the signed figure here
      // since this value gets summed with bankBalance elsewhere
      // (getBankAccountIds usage below) where a credit/overdrawn petty cash
      // position must subtract, not add.
      const magnitude = Number(result.summary?.balance || 0);
      const balanceType = result.summary?.balanceType || "debit";

      return {
        balance: balanceType === "credit" ? -magnitude : magnitude,
        recent: result.transactions || [],
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return { balance: 0, recent: [], warning: error.message };
      }

      throw error;
    }
  }

  // Returns the account documents (not just ids) — the per-account balances
  // below need the code/name to label themselves.
  static async getBankAccounts() {
    const bankParent = await ChartOfAccounts.findOne({
      accountCode: BANK_PARENT_ACCOUNT_CODE,
      deletedAt: null,
    });

    if (!bankParent) return [];

    return await ChartOfAccounts.find({
      parentAccount: bankParent._id,
      status: "active",
      deletedAt: null,
    })
      .select("_id accountCode accountName")
      .sort({ accountCode: 1 });
  }

  // Total bank balance plus the per-account breakdown behind it, from the
  // same approved journal lines — so the accounts always add up to the
  // "Bank Balance" card.
  static async getBankBalances() {
    const bankAccounts = await this.getBankAccounts();

    if (bankAccounts.length === 0) {
      return { balance: 0, accounts: [] };
    }

    const bankAccountIds = bankAccounts.map((account) => account._id);

    await Promise.all(
      bankAccountIds.map((accountId) =>
        COAService.deduplicateOpeningBalanceJournals(accountId),
      ),
    );

    const entries = await this.getApprovedEntries({
      "bookEntries.account": { $in: bankAccountIds },
    });

    const byAccount = new Map(
      bankAccounts.map((account) => [
        String(account._id),
        {
          id: String(account._id),
          accountCode: account.accountCode,
          accountName: account.accountName,
          balance: 0,
          lastActivity: null,
        },
      ]),
    );

    for (const entry of entries) {
      const jsonEntry = entry.toJSON();

      for (const account of bankAccounts) {
        const line = this.getLineForAccount(jsonEntry, account._id);
        if (!line) continue;

        const row = byAccount.get(String(account._id));
        row.balance += Number(line.debit || 0) - Number(line.credit || 0);

        const voucherDate = new Date(jsonEntry.voucherDate);
        if (!row.lastActivity || voucherDate > row.lastActivity) {
          row.lastActivity = voucherDate;
        }
      }
    }

    const accounts = [...byAccount.values()];

    return {
      balance: accounts.reduce((sum, row) => sum + row.balance, 0),
      accounts,
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
        referenceNumber: formatReferenceNumber(jsonEntry),
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
      this.getBankBalances(),
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
      bankAccounts: bank.accounts,
      warnings: {
        pettyCash: pettyCash.warning || "",
      },
    };
  }
}

module.exports = DashboardService;
