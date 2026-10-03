const JournalEntry = require("./accounting.model");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");
const COAService = require("../chartOfAccounts/coa.service");
const Settings = require("../settings/settings.model");
const BankReconciliation = require("../bankBook/bankReconciliation.model");
const mongoose = require("mongoose");
const { BadRequestError, NotFoundError } = require("../../errors");
const { createAuditLog } = require("../../middleware/auditLog");
const { formatReferenceNumber } = require("../../utils/reference");

// A journal entry stays editable for this long after it is created,
// regardless of approval state. After that it is immutable.
// Reconciliation periods are whole Dhaka days, so their dates read wrong
// through toISOString (a period start is 18:00 UTC the day before).
const dhakaDay = (value) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

const EDIT_WINDOW_DAYS = 3;
const EDIT_WINDOW_HOURS = EDIT_WINDOW_DAYS * 24;

// The only entry-level fields an edit may change. Amounts, accounts, voucher
// number, transaction type and every approval/lifecycle field are permanently
// immutable — corrections go through a reversing entry. Kept in sync with
// accounting.controller.js's EDITABLE_FIELDS; the controller rejects unknown
// fields at the boundary, this list drives the change-log diff.
const EDITABLE_FIELDS = [
  "voucherDate",
  "description",
  "referenceNumber",
  "attachments",
];

class AccountingService {
  static getDebitNatureTypes() {
    return ["asset", "expense"];
  }

  static getCreditNatureTypes() {
    return ["liability", "equity", "income", "revenue"];
  }

  static normalizeAccountType(accountType) {
    return String(accountType || "")
      .trim()
      .toLowerCase();
  }

  static isDebitNature(accountType) {
    return this.getDebitNatureTypes().includes(
      this.normalizeAccountType(accountType),
    );
  }

  static isCreditNature(accountType) {
    return this.getCreditNatureTypes().includes(
      this.normalizeAccountType(accountType),
    );
  }

  static calculateSignedBalance(
    accountType,
    openingBalance,
    openingBalanceType,
  ) {
    const balance = Number(openingBalance || 0);
    const type = String(openingBalanceType || "").toLowerCase();

    if (this.isDebitNature(accountType)) {
      return type === "credit" ? -balance : balance;
    }

    if (this.isCreditNature(accountType)) {
      return type === "debit" ? -balance : balance;
    }

    return type === "credit" ? -balance : balance;
  }

  static applyLineToSignedBalance(
    accountType,
    currentSignedBalance,
    debit,
    credit,
  ) {
    const numericDebit = Number(debit || 0);
    const numericCredit = Number(credit || 0);

    if (this.isDebitNature(accountType)) {
      return currentSignedBalance + numericDebit - numericCredit;
    }

    if (this.isCreditNature(accountType)) {
      return currentSignedBalance + numericCredit - numericDebit;
    }

    return currentSignedBalance + numericDebit - numericCredit;
  }

  static normalizeMoney(value) {
    const amount = Number(value || 0);

    if (!Number.isFinite(amount)) {
      throw new Error("Amount must be a valid number");
    }

    return Math.round(amount * 100) / 100;
  }

  static signedToDisplayBalance(accountType, signedBalance) {
    if (this.isDebitNature(accountType)) {
      return {
        balance: Math.abs(signedBalance),
        balanceType: signedBalance >= 0 ? "debit" : "credit",
      };
    }

    if (this.isCreditNature(accountType)) {
      return {
        balance: Math.abs(signedBalance),
        balanceType: signedBalance >= 0 ? "credit" : "debit",
      };
    }

    return {
      balance: Math.abs(signedBalance),
      balanceType: signedBalance >= 0 ? "debit" : "credit",
    };
  }

  /**
   * Batched version of calculateAccountBalance for many accounts at once.
   * The per-account version does 2 sequential DB round-trips per account —
   * fine for a single lookup, but Trial Balance/Balance Sheet call it once
   * per active account in a for-loop, which against ~120 seeded accounts on
   * a remote cluster took 30+ seconds and blew the frontend's 15s request
   * timeout. This does exactly 1 query total (regardless of account count),
   * then reproduces the exact same signed-balance math in memory.
   */
  static async calculateAccountBalances(accounts, asOfDate = new Date()) {
    const accountIds = accounts.map((account) => account._id);

    const entries = await JournalEntry.find({
      "bookEntries.account": { $in: accountIds },
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
      voucherDate: { $lte: asOfDate },
    }).lean({ getters: true });

    // Same rule as the single-account path: whether an account's opening
    // balance has been migrated to a real journal is a property of the data,
    // not of the as-of date, so this probe is deliberately unscoped by date.
    // Deriving it from the date-filtered scan above would re-add the legacy
    // static account.openingBalance for any as-of date that falls before the
    // OPENING_BALANCE journal's own voucherDate, double-counting it.
    const openingJournals = await JournalEntry.find({
      "bookEntries.account": { $in: accountIds },
      sourceModule: "OPENING_BALANCE",
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
    })
      .select("bookEntries.account")
      .lean();

    const totalsByAccount = new Map();
    const hasOpeningJournalByAccount = new Set();

    for (const entry of openingJournals) {
      for (const line of entry.bookEntries || []) {
        const lineAccountId =
          typeof line.account === "object" && line.account !== null
            ? line.account._id?.toString()
            : line.account?.toString();
        if (lineAccountId) hasOpeningJournalByAccount.add(lineAccountId);
      }
    }

    for (const entry of entries) {
      for (const line of entry.bookEntries || []) {
        const lineAccountId =
          typeof line.account === "object" && line.account !== null
            ? line.account._id?.toString()
            : line.account?.toString();

        if (!lineAccountId) continue;

        const current = totalsByAccount.get(lineAccountId) || {
          debit: 0,
          credit: 0,
        };
        current.debit += Number(line.debit || 0);
        current.credit += Number(line.credit || 0);
        totalsByAccount.set(lineAccountId, current);
      }
    }

    const results = new Map();

    for (const account of accounts) {
      const accountId = account._id.toString();
      const hasApprovedOpeningJournal = hasOpeningJournalByAccount.has(accountId);

      let signedBalance = this.calculateSignedBalance(
        account.accountType,
        hasApprovedOpeningJournal ? 0 : account.openingBalance || 0,
        account.openingBalanceType || "debit",
      );

      const totals = totalsByAccount.get(accountId);

      if (totals) {
        signedBalance = this.applyLineToSignedBalance(
          account.accountType,
          signedBalance,
          totals.debit,
          totals.credit,
        );
      }

      const display = this.signedToDisplayBalance(
        account.accountType,
        signedBalance,
      );

      results.set(accountId, {
        accountId: account._id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        balance: display.balance,
        balanceType: display.balanceType,
        naturalBalanceType: this.isDebitNature(account.accountType)
          ? "debit"
          : "credit",
      });
    }

    return results;
  }

  /**
   * Batched version of calculatePeriodAmount — same rationale as
   * calculateAccountBalances above, for generateIncomeStatement's
   * revenue/expense account loops.
   */
  static async calculatePeriodAmounts(accounts, startDate, endDate) {
    const accountIds = accounts.map((account) => account._id);
    const accountTypeById = new Map(
      accounts.map((account) => [account._id.toString(), account.accountType]),
    );

    const entries = await JournalEntry.find({
      "bookEntries.account": { $in: accountIds },
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
      voucherDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).lean({ getters: true });

    const signedByAccount = new Map();

    for (const entry of entries) {
      for (const line of entry.bookEntries || []) {
        const lineAccountId =
          typeof line.account === "object" && line.account !== null
            ? line.account._id?.toString()
            : line.account?.toString();

        if (!lineAccountId || !accountTypeById.has(lineAccountId)) continue;

        const current = signedByAccount.get(lineAccountId) || 0;
        signedByAccount.set(
          lineAccountId,
          this.applyLineToSignedBalance(
            accountTypeById.get(lineAccountId),
            current,
            line.debit || 0,
            line.credit || 0,
          ),
        );
      }
    }

    const results = new Map();

    for (const account of accounts) {
      const accountId = account._id.toString();
      results.set(accountId, Math.abs(signedByAccount.get(accountId) || 0));
    }

    return results;
  }

  static async generateTrialBalance(asOfDate = new Date()) {
    const accounts = await ChartOfAccounts.find({
      deletedAt: null,
      status: "active",
    }).lean({ getters: true });

    const balanceMap = await this.calculateAccountBalances(accounts, asOfDate);

    const balances = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      const balanceData = balanceMap.get(account._id.toString());

      if (!balanceData || !balanceData.balance) continue;

      const row = {
        accountCode: balanceData.accountCode,
        accountName: balanceData.accountName,
        accountType: balanceData.accountType,
        debit: balanceData.balanceType === "debit" ? balanceData.balance : 0,
        credit: balanceData.balanceType === "credit" ? balanceData.balance : 0,
      };

      balances.push(row);
      totalDebits += row.debit;
      totalCredits += row.credit;
    }

    return {
      balances,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }

  static async generateIncomeStatement(startDate, endDate) {
    const revenues = await ChartOfAccounts.find({
      accountType: { $in: ["income", "revenue", "Income", "Revenue"] },
      deletedAt: null,
      status: "active",
    }).lean({ getters: true });

    const expenses = await ChartOfAccounts.find({
      accountType: { $in: ["expense", "Expense"] },
      deletedAt: null,
      status: "active",
    }).lean({ getters: true });

    const periodAmounts = await this.calculatePeriodAmounts(
      [...revenues, ...expenses],
      startDate,
      endDate,
    );

    const revenueList = [];
    let totalRevenue = 0;

    for (const account of revenues) {
      const periodAmount = periodAmounts.get(account._id.toString()) || 0;

      if (periodAmount !== 0) {
        revenueList.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: periodAmount,
        });
        totalRevenue += periodAmount;
      }
    }

    const expenseList = [];
    let totalExpenses = 0;

    for (const account of expenses) {
      const periodAmount = periodAmounts.get(account._id.toString()) || 0;

      if (periodAmount !== 0) {
        expenseList.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: periodAmount,
        });
        totalExpenses += periodAmount;
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
      accountType: { $in: ["asset", "Asset"] },
      deletedAt: null,
      status: "active",
    }).lean({ getters: true });

    const liabilities = await ChartOfAccounts.find({
      accountType: { $in: ["liability", "Liability"] },
      deletedAt: null,
      status: "active",
    }).lean({ getters: true });

    const equity = await ChartOfAccounts.find({
      accountType: { $in: ["equity", "Equity"] },
      deletedAt: null,
      status: "active",
    }).lean({ getters: true });

    const balanceMap = await this.calculateAccountBalances(
      [...assets, ...liabilities, ...equity],
      asOfDate,
    );

    const buildList = (accountsList) => {
      const list = [];
      let total = 0;

      for (const account of accountsList) {
        const balanceData = balanceMap.get(account._id.toString());

        if (!balanceData || balanceData.balance === 0) continue;

        list.push({
          accountCode: balanceData.accountCode,
          accountName: balanceData.accountName,
          amount: balanceData.balance,
        });
        total += balanceData.balance;
      }

      return { list, total };
    };

    const { list: assetList, total: totalAssets } = buildList(assets);
    const { list: liabilityList, total: totalLiabilities } = buildList(liabilities);
    const { list: equityList, total: equityBaseTotal } = buildList(equity);
    let totalEquity = equityBaseTotal;

    const retainedEarningsAccount = await ChartOfAccounts.findOne({
      accountName: { $regex: /retained earnings/i },
      deletedAt: null,
      status: "active",
    }).lean({ getters: true });

    let retainedEarnings = 0;

    if (retainedEarningsAccount) {
      const reMap = await this.calculateAccountBalances(
        [retainedEarningsAccount],
        asOfDate,
      );
      retainedEarnings =
        reMap.get(retainedEarningsAccount._id.toString())?.balance || 0;
    } else {
      const fiscalYearStart = new Date(asOfDate.getFullYear(), 0, 1);
      const incomeStatement = await this.generateIncomeStatement(
        fiscalYearStart,
        asOfDate,
      );
      retainedEarnings = incomeStatement.netIncome;
    }

    equityList.push({
      accountCode: "RE",
      accountName: "Retained Earnings",
      amount: retainedEarnings,
    });

    totalEquity += retainedEarnings;

    return {
      assets: assetList,
      totalAssets,
      liabilities: liabilityList,
      totalLiabilities,
      equity: equityList,
      totalEquity,
      isBalanced:
        Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }

  /**
   * Every cash and bank account: Cash on Hand (1001), the Bank Accounts head
   * (1002) and everything beneath either of them. Matched by code and parent
   * rather than by name, so an account merely *named* like "Cash Fees
   * Receivable" can't be mistaken for cash. FDRs (1100) are deliberately not
   * cash — placing or encashing one shows up as a payment or a receipt.
   */
  static async getCashAndBankAccounts() {
    const heads = await ChartOfAccounts.find({
      accountCode: { $in: ["1001", "1002"] },
      deletedAt: null,
    }).lean({ getters: true });

    const accounts = [...heads];
    let frontier = heads.map((account) => account._id);

    while (frontier.length > 0) {
      const children = await ChartOfAccounts.find({
        parentAccount: { $in: frontier },
        deletedAt: null,
      }).lean({ getters: true });
      accounts.push(...children);
      frontier = children.map((account) => account._id);
    }

    return accounts;
  }

  /**
   * Receipts & Payments Account — the cash-basis statement a non-profit
   * publishes: opening cash and bank balances, every receipt and payment for
   * the period grouped by account head, and closing cash and bank balances.
   *
   * Built from approved, posted journal lines only. For each journal that
   * moves cash, its non-cash lines are the heads: a net credit on a head is
   * money received under it, a net debit is money paid out under it. A
   * journal whose cash lines net to zero (cash deposited into the bank, a
   * transfer between banks) moves no money in or out and is left out.
   */
  static async generateReceiptsAndPayments(startDate, endDate) {
    const cashAccounts = await this.getCashAndBankAccounts();
    const cashIds = new Set(cashAccounts.map((a) => a._id.toString()));

    const openingAsOf = new Date(new Date(startDate).getTime() - 1);
    const closingAsOf = new Date(endDate);

    const [openingMap, closingMap] = await Promise.all([
      this.calculateAccountBalances(cashAccounts, openingAsOf),
      this.calculateAccountBalances(cashAccounts, closingAsOf),
    ]);

    // Cash and bank are assets: a debit balance is money held, a credit
    // balance (an overdraft) is shown as a negative amount.
    const toSignedAmount = (balanceData) =>
      balanceData
        ? balanceData.balanceType === "credit"
          ? -balanceData.balance
          : balanceData.balance
        : 0;

    const balanceRows = (balanceMap) =>
      cashAccounts
        .map((account) => ({
          accountId: account._id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: toSignedAmount(balanceMap.get(account._id.toString())),
        }))
        .filter((row) => Math.abs(row.amount) >= 0.005)
        .sort((a, b) =>
          String(a.accountCode).localeCompare(String(b.accountCode)),
        );

    const openingBalances = balanceRows(openingMap);
    const closingBalances = balanceRows(closingMap);
    const totalOpening = openingBalances.reduce((s, r) => s + r.amount, 0);
    const totalClosing = closingBalances.reduce((s, r) => s + r.amount, 0);

    const entries = await JournalEntry.find({
      "bookEntries.account": { $in: [...cashIds] },
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
      voucherDate: { $gte: new Date(startDate), $lte: closingAsOf },
    })
      .populate("bookEntries.account", "accountCode accountName accountType")
      .sort({ voucherDate: 1, createdAt: 1, _id: 1 })
      .lean({ getters: true });

    const receipts = new Map();
    const payments = new Map();
    const lineAccountId = (line) =>
      (line.account?._id || line.account)?.toString() || "";

    for (const entry of entries) {
      const lines = entry.bookEntries || [];

      const cashNet = lines
        .filter((line) => cashIds.has(lineAccountId(line)))
        .reduce(
          (sum, line) => sum + Number(line.debit || 0) - Number(line.credit || 0),
          0,
        );

      if (Math.abs(cashNet) < 0.005) continue;

      for (const line of lines) {
        const accountId = lineAccountId(line);
        if (!accountId || cashIds.has(accountId)) continue;

        const net = Number(line.credit || 0) - Number(line.debit || 0);
        if (Math.abs(net) < 0.005) continue;

        const target = net > 0 ? receipts : payments;
        const row = target.get(accountId) || {
          accountId,
          accountCode: line.account?.accountCode || "",
          accountName: line.account?.accountName || "Unknown account",
          amount: 0,
          transactions: [],
        };

        row.amount += Math.abs(net);
        row.transactions.push({
          journalEntryId: entry._id,
          date: entry.voucherDate,
          voucherNumber: entry.voucherNumber,
          description: line.description || entry.description || "",
          amount: Math.abs(net),
        });
        target.set(accountId, row);
      }
    }

    const sortRows = (map) =>
      [...map.values()].sort((a, b) =>
        String(a.accountCode).localeCompare(String(b.accountCode)),
      );

    const receiptRows = sortRows(receipts);
    const paymentRows = sortRows(payments);
    const totalReceipts = receiptRows.reduce((s, r) => s + r.amount, 0);
    const totalPayments = paymentRows.reduce((s, r) => s + r.amount, 0);

    // Opening + receipts must equal payments + closing. It can only fail if a
    // posted journal is itself unbalanced, so it's surfaced, not hidden.
    const difference =
      totalOpening + totalReceipts - (totalPayments + totalClosing);

    return {
      openingBalances,
      totalOpening,
      receipts: receiptRows,
      totalReceipts,
      payments: paymentRows,
      totalPayments,
      closingBalances,
      totalClosing,
      receiptsSideTotal: totalOpening + totalReceipts,
      paymentsSideTotal: totalPayments + totalClosing,
      difference,
      isBalanced: Math.abs(difference) < 0.01,
    };
  }

  static async generateCashFlowStatement(startDate, endDate) {
    const cashAccounts = await ChartOfAccounts.find({
      accountName: { $regex: /cash|bank/i },
      deletedAt: null,
      status: "active",
    }).lean({ getters: true });

    const cashAccountIds = cashAccounts.map((a) => a._id);

    const startBalance = await Promise.all(
      cashAccountIds.map((id) =>
        this.calculateAccountBalance(
          id,
          new Date(new Date(startDate).getTime() - 1),
        ),
      ),
    );

    const endBalance = await Promise.all(
      cashAccountIds.map((id) =>
        this.calculateAccountBalance(id, new Date(endDate)),
      ),
    );

    const totalStart = startBalance.reduce(
      (sum, item) => sum + item.balance,
      0,
    );
    const totalEnd = endBalance.reduce((sum, item) => sum + item.balance, 0);

    const entries = await JournalEntry.find({
      "bookEntries.account": { $in: cashAccountIds },
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
      voucherDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .populate("bookEntries.account")
      .lean({ getters: true });

    const inflows = [];
    const outflows = [];
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const entry of entries) {
      const jsonEntry = entry;

      const cashLines = (jsonEntry.bookEntries || []).filter((bookEntry) =>
        cashAccountIds.some(
          (id) => id.toString() === bookEntry.account._id.toString(),
        ),
      );

      for (const line of cashLines) {
        if (line.debit > 0) {
          totalInflow += line.debit;
          inflows.push({
            date: jsonEntry.voucherDate,
            description: jsonEntry.description,
            amount: line.debit,
          });
        }

        if (line.credit > 0) {
          totalOutflow += line.credit;
          outflows.push({
            date: jsonEntry.voucherDate,
            description: jsonEntry.description,
            amount: line.credit,
          });
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
      closingBalance: totalEnd,
    };
  }

  static async getGeneralLedgerForAccount(
    accountId,
    startDate,
    endDate,
    options = {},
  ) {
    const account = await ChartOfAccounts.findById(accountId).lean({ getters: true });
    if (!account) throw new Error("Account not found");

    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(options.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const openingBalanceData = startDate
      ? await this.calculateAccountBalance(
          accountId,
          new Date(new Date(startDate).getTime() - 1),
        )
      : {
          balance: 0,
          balanceType: this.isDebitNature(account.accountType)
            ? "debit"
            : "credit",
        };

    const query = {
      "bookEntries.account": accountId,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
    };

    if (startDate || endDate) {
      query.voucherDate = {};
      if (startDate) query.voucherDate.$gte = new Date(startDate);
      if (endDate) query.voucherDate.$lte = new Date(endDate);
    }

    const sortOrder = { voucherDate: 1, createdAt: 1, _id: 1 };

    // Totals, the closing balance and the balance carried into this page must
    // cover the whole period, not just the rows on the current page —
    // otherwise changing the page size changes the closing balance, and every
    // page's running balance restarts from the period opening. So walk every
    // matching entry's lines (unpopulated, lines only) once up front.
    const allEntries = await JournalEntry.find(query)
      .select("bookEntries.account bookEntries.debit bookEntries.credit")
      .sort(sortOrder)
      .lean({ getters: true });

    const total = allEntries.length;

    let periodSignedBalance = this.calculateSignedBalance(
      account.accountType,
      openingBalanceData.balance,
      openingBalanceData.balanceType,
    );
    let broughtForwardSignedBalance = periodSignedBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    allEntries.forEach((entry, index) => {
      if (index === skip) broughtForwardSignedBalance = periodSignedBalance;

      const line = (entry.bookEntries || []).find(
        (bookEntry) => bookEntry.account?.toString() === accountId.toString(),
      );
      const debit = Number(line?.debit || 0);
      const credit = Number(line?.credit || 0);

      totalDebit += debit;
      totalCredit += credit;
      periodSignedBalance = this.applyLineToSignedBalance(
        account.accountType,
        periodSignedBalance,
        debit,
        credit,
      );
    });

    const entries = await JournalEntry.find(query)
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountName accountCode accountType")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .lean({ getters: true });

    let runningSignedBalance = broughtForwardSignedBalance;

    const transactions = entries.map((entry) => {
      const jsonEntry = entry;

      const relevantBookEntry = (jsonEntry.bookEntries || []).find(
        (bookEntry) =>
          bookEntry.account._id.toString() === accountId.toString(),
      );

      const debit = Number(relevantBookEntry?.debit || 0);
      const credit = Number(relevantBookEntry?.credit || 0);

      runningSignedBalance = this.applyLineToSignedBalance(
        account.accountType,
        runningSignedBalance,
        debit,
        credit,
      );

      const runningDisplay = this.signedToDisplayBalance(
        account.accountType,
        runningSignedBalance,
      );

      // The other side of the entry. A ledger row only ever shows this
      // account's own debit/credit, so on a compound entry (one debit against
      // several credits, say) the amount alone doesn't say where the money
      // went. These lines are what the report's "Detailed" view expands under
      // each row. bookEntries is already populated, so this costs no extra
      // query.
      const contraLines = (jsonEntry.bookEntries || [])
        .filter(
          (bookEntry) =>
            bookEntry.account?._id?.toString() !== accountId.toString(),
        )
        .map((bookEntry) => ({
          accountCode: bookEntry.account?.accountCode || "",
          accountName: bookEntry.account?.accountName || "",
          debit: Number(bookEntry.debit || 0),
          credit: Number(bookEntry.credit || 0),
          description: bookEntry.description || "",
        }));

      return {
        date: jsonEntry.voucherDate,
        voucherNumber: jsonEntry.voucherNumber,
        transactionType: jsonEntry.transactionType,
        description: relevantBookEntry?.description || jsonEntry.description,
        reference: formatReferenceNumber(jsonEntry),
        debit,
        credit,
        runningBalance: runningDisplay.balance,
        runningBalanceType: runningDisplay.balanceType,
        journalEntryId: jsonEntry._id,
        contraLines,
        // A compound entry is one with more than two lines in total; the UI
        // labels those differently from a plain two-sided posting.
        isCompound: (jsonEntry.bookEntries || []).length > 2,
      };
    });

    const closingDisplay = this.signedToDisplayBalance(
      account.accountType,
      periodSignedBalance,
    );

    return {
      accountName: account.accountName,
      accountCode: account.accountCode,
      accountType: account.accountType,
      openingBalance: openingBalanceData.balance,
      openingBalanceType: openingBalanceData.balanceType,
      totalDebit,
      totalCredit,
      closingBalance: closingDisplay.balance,
      closingBalanceType: closingDisplay.balanceType,
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  static async calculatePeriodAmount(accountId, startDate, endDate) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    }).lean({ getters: true });

    if (!account) {
      throw new Error("Account not found");
    }

    const entries = await JournalEntry.find({
      "bookEntries.account": accountId,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
      voucherDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).lean({ getters: true });

    let signedAmount = 0;

    for (const entry of entries) {
      const jsonEntry = entry;

      for (const line of jsonEntry.bookEntries || []) {
        const lineAccountId =
          typeof line.account === "object" && line.account !== null
            ? line.account._id?.toString()
            : line.account?.toString();

        if (lineAccountId === accountId.toString()) {
          signedAmount = this.applyLineToSignedBalance(
            account.accountType,
            signedAmount,
            line.debit || 0,
            line.credit || 0,
          );
        }
      }
    }

    return Math.abs(signedAmount);
  }

  static async calculateAccountBalance(accountId, asOfDate = new Date()) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    }).lean({ getters: true });

    if (!account) {
      throw new Error("Account not found");
    }

    // Deliberately NOT scoped by asOfDate. This flag answers a question about
    // the data ("has this account's opening balance been migrated to a real
    // journal?"), not about a point in time, and the answer must not change
    // with the as-of date. Scoping it was a real double-count bug: asking for
    // the balance as of the instant before an OPENING_BALANCE journal's own
    // voucherDate reported "no journal exists", so the legacy static
    // account.openingBalance was added on top — and then the caller (the
    // ledger's period, cash flow's inflows) counted the journal itself as
    // well, inflating the closing balance by exactly the opening amount.
    const hasApprovedOpeningJournal = !!(await JournalEntry.exists({
      "bookEntries.account": accountId,
      sourceModule: "OPENING_BALANCE",
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
    }));

    let signedBalance = this.calculateSignedBalance(
      account.accountType,
      hasApprovedOpeningJournal ? 0 : account.openingBalance || 0,
      account.openingBalanceType || "debit",
    );

    const entries = await JournalEntry.find({
      "bookEntries.account": accountId,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
      voucherDate: { $lte: asOfDate },
    }).lean({ getters: true });

    for (const entry of entries) {
      const jsonEntry = entry;

      for (const line of jsonEntry.bookEntries || []) {
        const lineAccountId =
          typeof line.account === "object" && line.account !== null
            ? line.account._id?.toString()
            : line.account?.toString();

        if (lineAccountId === accountId.toString()) {
          signedBalance = this.applyLineToSignedBalance(
            account.accountType,
            signedBalance,
            line.debit || 0,
            line.credit || 0,
          );
        }
      }
    }

    const display = this.signedToDisplayBalance(
      account.accountType,
      signedBalance,
    );

    return {
      accountId: account._id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      balance: display.balance,
      balanceType: display.balanceType,
      naturalBalanceType: this.isDebitNature(account.accountType)
        ? "debit"
        : "credit",
    };
  }

  static validateDoubleEntry(bookEntries) {
    if (!Array.isArray(bookEntries) || bookEntries.length < 2) {
      throw new BadRequestError("Journal entry must have at least 2 line items");
    }

    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of bookEntries) {
      const debit = this.normalizeMoney(entry.debit || 0);
      const credit = this.normalizeMoney(entry.credit || 0);

      if (debit < 0 || credit < 0) {
        throw new BadRequestError("Debit and credit cannot be negative");
      }

      if (debit > 0 && credit > 0) {
        throw new BadRequestError("A line cannot contain both debit and credit");
      }

      if (debit === 0 && credit === 0) {
        throw new BadRequestError("Each line must contain either debit or credit");
      }

      entry.debit = debit;
      entry.credit = credit;
      totalDebits += debit;
      totalCredits += credit;
    }

    if (Math.round(Math.abs(totalDebits - totalCredits) * 100) > 0) {
      throw new BadRequestError(
        `Double-entry validation failed. Debits: ${totalDebits}, Credits: ${totalCredits}`,
      );
    }
  }

  static async validateAccounts(bookEntries) {
    const errors = [];
    const accountIds = [
      ...new Set(
        bookEntries
          .map((entry) => (entry.account || entry.accountId)?.toString())
          .filter(Boolean),
      ),
    ];

    if (accountIds.length === 0) {
      return ["Account is required for each line item"];
    }

    const accounts = await ChartOfAccounts.find({
      _id: { $in: accountIds },
      deletedAt: null,
    }).lean();

    const accountMap = new Map(
      accounts.map((account) => [account._id.toString(), account]),
    );

    const childRows = await ChartOfAccounts.aggregate([
      {
        $match: {
          parentAccount: {
            $in: accountIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          deletedAt: null,
          status: { $ne: "archived" },
        },
      },
      {
        $group: {
          _id: "$parentAccount",
          count: { $sum: 1 },
        },
      },
    ]);

    const parentSet = new Set(childRows.map((row) => row._id.toString()));

    for (const entry of bookEntries) {
      const accountId = (entry.account || entry.accountId)?.toString();

      if (!accountId) {
        errors.push("Account ID is required");
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

      if (account.status !== "active") {
        errors.push(`Account ${account.accountCode} is not active`);
      }

      const isCurrentlyLeaf = !parentSet.has(accountId);
      entry.wasLeafAtCreation = isCurrentlyLeaf;

      if (!isCurrentlyLeaf) {
        errors.push(
          `Account ${account.accountCode} is a parent account and cannot be used in transactions.`,
        );
      }
    }

    return [...new Set(errors)];
  }

static async createJournalEntry(entryData, { session: externalSession } = {}) {
  if (!entryData?.bookEntries || !Array.isArray(entryData.bookEntries)) {
    throw new BadRequestError("Book entries are required");
  }

  this.validateDoubleEntry(entryData.bookEntries);

  const accountErrors = await this.validateAccounts(entryData.bookEntries);

  if (accountErrors.length > 0) {
    throw new BadRequestError(`Invalid accounts: ${accountErrors.join(", ")}`);
  }

  const requiresApproval = entryData.requiresApproval !== false;

  entryData.sourceModule = entryData.sourceModule || "manual";

  entryData.approvalStatus = "pending";
  entryData.status = "draft";

  const ownSession = !externalSession;
  const session = externalSession || await mongoose.startSession();
  if (ownSession) session.startTransaction();

  try {
    const [entry] = await JournalEntry.create([entryData], { session });

    if (ownSession) await session.commitTransaction();

    // Auto approve whenever the caller doesn't require a manual approval
    // step. If we were handed an external session (ownSession false), stay
    // inside it instead of committing here — approveEntry reuses the same
    // session so the caller's create+approve+their-own-writes stay atomic,
    // and the caller is responsible for the final commit/abort.
    if (!requiresApproval) {
      return await this.approveEntry(entry._id, entryData.createdBy, {
        session: ownSession ? undefined : session,
      });
    }

    const createdEntry = await JournalEntry.findById(entry._id)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("bookEntries.account", "accountName accountCode accountType");

    return createdEntry.toJSON();
  } catch (error) {
    if (ownSession) await session.abortTransaction();
    throw error;
  } finally {
    if (ownSession) await session.endSession();
  }
}

  static async getAllEntries(filters = {}) {
    const query = { deletedAt: null };

    if (filters.transactionType)
      query.transactionType = filters.transactionType;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    if (filters.status) query.status = filters.status;
    if (filters.sourceModule) query.sourceModule = filters.sourceModule;

    // Matches an entry if ANY of its book-entry lines hits this account. Both
    // this and the sourceModule filter above are already backed by indexes
    // ({sourceModule, voucherDate} and one leading with bookEntries.account).
    if (filters.account) query["bookEntries.account"] = filters.account;

    if (filters.dateFrom || filters.dateTo) {
      query.voucherDate = {};
      if (filters.dateFrom) query.voucherDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.voucherDate.$lte = new Date(filters.dateTo);
    }

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const sortField = filters.sortBy || "voucherDate";
    const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: sortOrder, _id: -1 };

    const total = await JournalEntry.countDocuments(query);

    const entries = await JournalEntry.find(query)
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountName accountCode accountType")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return {
      data: entries.map((entry) => entry.toJSON()),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  static async getEntryById(entryId) {
    const entry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    })
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .populate("bookEntries.account", "accountName accountCode accountType");

    if (!entry) return null;

    const json = entry.toJSON();

    // Added alongside the raw value rather than replacing it: the edit form
    // and the audit-log diff both round-trip `referenceNumber` and must keep
    // seeing exactly what is stored. `referenceLabel` is display-only.
    return { ...json, referenceLabel: formatReferenceNumber(json) };
  }

  static normalizeForDiff(value) {
    if (value === undefined || value === null) return null;
    if (value instanceof Date) return value.toISOString();
    // Copy to a plain array — a Mongoose array is live, so holding the
    // reference in the "before" snapshot would mutate along with the document
    // and the diff would come out empty.
    if (Array.isArray(value)) {
      return value.map((item) => (item instanceof Date ? item.toISOString() : item));
    }
    return value;
  }

  static valuesEqual(a, b) {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }

  /**
   * Flat, field-scoped snapshot of everything an edit is allowed to touch —
   * the two ends of the change-log diff. Line descriptions are keyed by
   * position (`bookEntries.0.description`) because bookEntrySchema is
   * declared `{ _id: false }`, so a line has no stable identifier; the edit
   * path compensates by refusing any change to the number of lines.
   */
  static snapshotEditableFields(entry) {
    const snapshot = {};

    for (const field of EDITABLE_FIELDS) {
      snapshot[field] = this.normalizeForDiff(entry[field]);
    }

    (entry.bookEntries || []).forEach((line, index) => {
      snapshot[`bookEntries.${index}.description`] = line.description || "";
    });

    return snapshot;
  }

  /**
   * A finalized bank reconciliation recomputes its book balance live from the
   * ledger every time it is opened (bankReconciliation.service.js's
   * getBookBalance), so moving an entry into or out of a finalized period
   * retroactively changes a signed-off statement's variance with nothing to
   * explain why. Amounts are immutable here, so no report total can go wrong
   * — but which period a total lands in still can, and that is enough.
   */
  static async assertDateNotInFinalizedReconciliation(entry, dates) {
    const accountIds = [
      ...new Set(
        (entry.bookEntries || [])
          .map((line) => line.account?.toString())
          .filter(Boolean),
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    if (accountIds.length === 0) return;

    for (const date of dates) {
      if (!date) continue;

      const clash = await BankReconciliation.findOne({
        status: "finalized",
        bankAccount: { $in: accountIds },
        periodStart: { $lte: date },
        periodEnd: { $gte: date },
      }).populate("bankAccount", "accountCode accountName");

      if (clash) {
        const label = clash.bankAccount?.accountName || "a bank account";
        throw new BadRequestError(
          `Voucher date ${dhakaDay(date)} falls inside a finalized bank reconciliation for ${label} ` +
            `(${dhakaDay(clash.periodStart)} to ${dhakaDay(clash.periodEnd)}). ` +
            "The date cannot be changed into or out of a reconciled period.",
        );
      }
    }
  }

  /**
   * Only the two postable categories (bankReconciliation.service.js's
   * POSTABLE_TYPES) ever carry a journalEntryId. Listed here rather than
   * imported because that service already requires this one.
   */
  static async syncReconciliationLineDates(journalEntryId, voucherDate, session) {
    for (const type of ["bankCreditsNotInBooks", "bankCharges"]) {
      await BankReconciliation.updateMany(
        { [`${type}.journalEntryId`]: journalEntryId, deletedAt: null },
        { $set: { [`${type}.$[line].date`]: voucherDate } },
        { arrayFilters: [{ "line.journalEntryId": journalEntryId }], session },
      );
    }
  }

  /**
   * Narrative-only edit of a journal entry, open for EDIT_WINDOW_HOURS after
   * creation regardless of approval state, and only while the director's
   * `allowJournalEdit` setting is on. Amounts, accounts and approval state
   * are never editable through this path — the controller rejects them at the
   * boundary and this method never assigns them.
   */
  static async updateEntry(entryId, updateData, actor = null) {
    const entry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    });

    if (!entry) throw new NotFoundError("Journal entry not found");

    if (entry.status === "deleted") {
      throw new BadRequestError("Cannot edit a deleted journal entry");
    }

    const settings = await Settings.findOne();

    if (!settings?.allowJournalEdit) {
      throw new BadRequestError("Journal entry editing is currently disabled");
    }

    const hoursSinceCreation =
      (Date.now() - new Date(entry.createdAt).getTime()) / 36e5;

    if (hoursSinceCreation > EDIT_WINDOW_HOURS) {
      throw new BadRequestError(
        `Journal entry can only be edited within ${EDIT_WINDOW_DAYS} days of creation`,
      );
    }

    if (
      updateData.bookEntries !== undefined &&
      updateData.bookEntries.length !== entry.bookEntries.length
    ) {
      throw new BadRequestError(
        "Journal entry lines cannot be added or removed — only a line's description can change.",
      );
    }

    const nextVoucherDate = updateData.voucherDate
      ? new Date(updateData.voucherDate)
      : null;
    const voucherDateChanged =
      nextVoucherDate &&
      nextVoucherDate.getTime() !== new Date(entry.voucherDate).getTime();

    if (voucherDateChanged) {
      await this.assertDateNotInFinalizedReconciliation(entry, [
        entry.voucherDate,
        nextVoucherDate,
      ]);
    }

    const before = this.snapshotEditableFields(entry);

    for (const field of EDITABLE_FIELDS) {
      if (updateData[field] !== undefined) {
        entry[field] = updateData[field];
      }
    }

    if (updateData.bookEntries !== undefined) {
      updateData.bookEntries.forEach((line, index) => {
        if (line && line.description !== undefined) {
          entry.bookEntries[index].description = line.description;
        }
      });
    }

    const after = this.snapshotEditableFields(entry);

    const changedFields = [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ].filter((field) => !this.valuesEqual(before[field], after[field]));

    // A no-op submit (the form resubmitting unchanged values) shouldn't
    // manufacture an empty change-log row.
    if (changedFields.length === 0) {
      return await this.getEntryById(entry._id);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // .save(), not findByIdAndUpdate: accounting.model.js's
      // preventEditingFinalized hook blocks every query-based update of a
      // posted/locked entry, and posted entries are precisely what this
      // feature has to be able to edit. Going through the document also keeps
      // the schema's pre('save') re-validation (balance, account state,
      // totals) in play, which a query update would only partly run.
      await entry.save({ session });

      // The journal entry is the source of truth for a posted reconciliation
      // line's date — the line keeps its own copy (it's what the statement
      // prints), so it has to move with the voucher or the statement shows a
      // stale date. The back-out itself reads the voucher date, not this copy
      // (getPostedAdjustmentEffect). Finalized periods can't
      // reach here: assertDateNotInFinalizedReconciliation already refused.
      if (voucherDateChanged) {
        await this.syncReconciliationLineDates(entry._id, nextVoucherDate, session);
      }

      await createAuditLog({
        action: "UPDATE",
        entityType: "JournalEntry",
        entityId: entry._id,
        userId: actor?.userId || actor?.id || null,
        userName: actor?.name,
        userRole: actor?.role,
        changes: {
          before: Object.fromEntries(
            changedFields.map((field) => [field, before[field] ?? null]),
          ),
          after: Object.fromEntries(
            changedFields.map((field) => [field, after[field] ?? null]),
          ),
        },
        description: `Edited journal entry ${entry.voucherNumber}: ${changedFields.join(", ")}`,
        // The change log is a product feature here, not telemetry — if it
        // can't be written, the edit must not persist either.
        session,
        rethrow: true,
      });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    return await this.getEntryById(entry._id);
  }

  static async deleteEntry(entryId, userId) {
    const entry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    });

    if (!entry) throw new Error("Entry not found");
    if (entry.status === "posted") {
      throw new Error("Cannot delete a posted journal entry");
    }

    const deletedEntry = await JournalEntry.findByIdAndUpdate(
      entryId,
      {
        status: "deleted",
        deletedAt: new Date(),
        deletedBy: userId,
      },
      { new: true },
    );

    return deletedEntry ? deletedEntry.toJSON() : null;
  }

  static async approveEntry(entryId, approvedBy, { session: externalSession } = {}) {
    const ownSession = !externalSession;
    const session = externalSession || await mongoose.startSession();

    // When running inside a caller-supplied (still-open, uncommitted)
    // transaction, this lookup must be scoped to that session — otherwise
    // it can't see a JournalEntry the caller just created in the same
    // transaction (e.g. createJournalEntry's auto-approve path), and would
    // wrongly throw "Entry not found". Left unsessioned when we own the
    // session (the standalone-approve path this always used before), so
    // that existing, already-tested behavior is unchanged.
    const entryQuery = JournalEntry.findOne({ _id: entryId, deletedAt: null });
    if (!ownSession) entryQuery.session(session);
    const entry = await entryQuery;

    if (!entry) throw new Error("Entry not found");
    if (entry.status === "posted" || entry.approvalStatus === "approved") {
      throw new Error("Journal entry is already approved and posted");
    }
    if (entry.approvalStatus === "rejected") {
      throw new Error("Rejected entry cannot be approved");
    }

    const accountIds = entry.bookEntries
      .map((entryLine) => entryLine.account)
      .filter(Boolean);

    if (accountIds.length > 0) {
      const childRows = await ChartOfAccounts.aggregate([
        {
          $match: {
            parentAccount: {
              $in: accountIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
            deletedAt: null,
            status: { $ne: "archived" },
          },
        },
        {
          $group: {
            _id: "$parentAccount",
            count: { $sum: 1 },
          },
        },
      ]);

      const currentParentSet = new Set(
        childRows.map((row) => row._id.toString()),
      );

      for (const bookEntry of entry.bookEntries) {
        const accountId = bookEntry.account?.toString();
        if (!accountId) continue;

        const wasLeafAtCreation = bookEntry.wasLeafAtCreation !== false;
        const isCurrentlyLeaf = !currentParentSet.has(accountId);

        if (!wasLeafAtCreation && !isCurrentlyLeaf) {
          const account = await ChartOfAccounts.findById(accountId);
          throw new Error(
            `Cannot approve: Account ${account?.accountCode} was not a leaf account at creation time and is still not a leaf account now.`,
          );
        }
      }
    }

    if (ownSession) session.startTransaction();

    try {
      entry.approvalStatus = "approved";
      entry.status = "posted";
      entry.isLocked = true;
      entry.approvedBy = approvedBy;
      entry.approvalDate = new Date();

      await entry.save({ session });

      const affectedAccountIds = [
        ...new Set(entry.bookEntries.map((line) => line.account.toString())),
      ];

      for (const accountId of affectedAccountIds) {
        await COAService.recalculateCurrentBalanceFromJournals(
          accountId,
          session,
        );
      }

      if (ownSession) await session.commitTransaction();

      // When we don't own the session, the transaction hasn't committed yet —
      // read the just-written fields back through the same session so the
      // returned object reflects them instead of the pre-approval state.
      const populatedEntryQuery = JournalEntry.findById(entry._id)
        .populate("createdBy", "name email")
        .populate("approvedBy", "name email")
        .populate("bookEntries.account", "accountCode accountName accountType");
      if (!ownSession) populatedEntryQuery.session(session);

      const populatedEntry = await populatedEntryQuery;

      return populatedEntry.toJSON();
    } catch (error) {
      if (ownSession) await session.abortTransaction();
      throw error;
    } finally {
      if (ownSession) await session.endSession();
    }
  }

  static async rejectEntry(entryId, rejectedBy, rejectionReason) {
    const entry = await JournalEntry.findOne({
      _id: entryId,
      deletedAt: null,
    });

    if (!entry) throw new Error("Entry not found");
    if (entry.status === "posted") {
      throw new Error("Cannot reject already posted entry");
    }
    if (entry.approvalStatus !== "pending") {
      throw new Error("Entry is not pending approval");
    }

    entry.approvalStatus = "rejected";
    entry.rejectionReason = rejectionReason;
    entry.isLocked = true;
    entry.rejectedBy = rejectedBy;
    entry.rejectionDate = new Date();

    await entry.save();

    const populatedEntry = await JournalEntry.findById(entry._id)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .populate("bookEntries.account", "accountCode accountName accountType");

    return populatedEntry ? populatedEntry.toJSON() : null;
  }

  static async getPendingApprovals() {
    const entries = await JournalEntry.find({
      approvalStatus: "pending",
      deletedAt: null,
    })
      .populate("createdBy", "name email")
      .populate("bookEntries.account", "accountCode accountName accountType")
      .sort({ voucherDate: -1 });

    return entries.map((entry) => entry.toJSON());
  }

}

module.exports = AccountingService;
