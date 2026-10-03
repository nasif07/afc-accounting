const Bank = require("./bank.model");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");
const COAService = require("../chartOfAccounts/coa.service");
const JournalEntry = require("../accounting/accounting.model");
const { NotFoundError, BadRequestError } = require("../../errors");
const logger = require("../../utils/logger");
const { formatReferenceNumber } = require("../../utils/reference");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Parent head every Fixed Deposit Receipt account hangs off, mirroring how
// 1002 is the parent for individual bank accounts.
const FDR_PARENT_ACCOUNT_CODE = "1100";

class BankService {
  static async getBankParentAccount() {
    return await ChartOfAccounts.findOne({
      accountCode: "1002",
      deletedAt: null,
    });
  }

  static async getFdrParentAccount() {
    return await ChartOfAccounts.findOne({
      accountCode: FDR_PARENT_ACCOUNT_CODE,
      deletedAt: null,
    });
  }

  /**
   * Fixed Deposit Receipts: every active child of the FDR head (1100), with
   * its ledger balance and how many approved journal entries touch it.
   *
   * FDRs are plain Chart-of-Accounts children — there is no Bank-style
   * document behind them — so everything here derives from the same approved
   * journal ledger the bank balances use.
   *
   * `configured: false` (rather than an error) when 1100 doesn't exist yet:
   * the head is a normal COA account someone has to create, and the Bank &
   * Cash screen shows a "create it" hint instead of an error state.
   */
  static async getFdrSummary() {
    const parent = await this.getFdrParentAccount();

    if (!parent) {
      return {
        configured: false,
        parent: null,
        totalBalance: 0,
        accountCount: 0,
        transactionCount: 0,
        accounts: [],
      };
    }

    const children = await ChartOfAccounts.find({
      parentAccount: parent._id,
      accountType: "asset",
      status: "active",
      deletedAt: null,
    })
      .select("_id accountCode accountName")
      .sort({ accountCode: 1 });

    const accounts = [];
    let totalBalance = 0;
    let transactionCount = 0;

    for (const account of children) {
      const [currentBalance, count] = await Promise.all([
        this.calculateCoaLedgerBalance(account._id),
        JournalEntry.countDocuments({
          "bookEntries.account": account._id,
          status: "posted",
          approvalStatus: "approved",
          deletedAt: null,
        }),
      ]);

      totalBalance += currentBalance;
      transactionCount += count;

      accounts.push({
        _id: account._id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        currentBalance,
        transactionCount: count,
      });
    }

    return {
      configured: true,
      parent: {
        _id: parent._id,
        accountCode: parent.accountCode,
        accountName: parent.accountName,
      },
      totalBalance,
      accountCount: accounts.length,
      transactionCount,
      accounts,
    };
  }

  static async getActiveBankChildAccounts() {
    const parent = await this.getBankParentAccount();
    if (!parent) return [];

    return await ChartOfAccounts.find({
      parentAccount: parent._id,
      accountType: "asset",
      status: "active",
      deletedAt: null,
    }).select("_id accountCode accountName");
  }

  static async calculateCoaLedgerBalance(coaAccountId, asOfDate = new Date()) {
    await COAService.deduplicateOpeningBalanceJournals(coaAccountId);

    const entries = await JournalEntry.find({
      "bookEntries.account": coaAccountId,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
      voucherDate: { $lte: asOfDate },
    });

    return entries.reduce((balance, entry) => {
      const jsonEntry = entry.toJSON();
      const line = this.getBankLine(jsonEntry, coaAccountId);
      if (!line) return balance;

      return balance + Number(line.debit || 0) - Number(line.credit || 0);
    }, 0);
  }

  /**
   * Create a new bank account with full validation
   * CRITICAL: Ensures COA linkage is valid and accounting-safe
   */
  static async createBankAccount(bankData) {
    // Validate required fields
    if (!bankData.coaAccount) {
      throw new Error("Bank account must be linked to a chart of account");
    }

    if (!bankData.bankName || !bankData.accountNumber || !bankData.accountHolderName) {
      throw new Error("Bank name, account number, and account holder name are required");
    }

    // Validate COA account exists and is valid
    const coaAccount = await ChartOfAccounts.findById(bankData.coaAccount);

    if (!coaAccount) {
      throw new Error("Linked chart of account not found");
    }

    if (coaAccount.deletedAt) {
      throw new Error("Linked chart of account is deleted and cannot be used");
    }

    // FIXED: Use COA's actual status field
    if (coaAccount.status !== "active") {
      throw new Error(
        `Linked chart of account is ${coaAccount.status || "inactive"} and cannot be used`
      );
    }

    // FIXED: Validate it's an asset account
    if (coaAccount.accountType !== "asset") {
      throw new Error(
        `Bank account must be linked to an Asset account. Provided account is: ${coaAccount.accountType}`
      );
    }

    const bankParentAccount = await this.getBankParentAccount();

    if (!bankParentAccount) {
      throw new Error("Main Bank account 1002 is not configured");
    }

    if (String(coaAccount.parentAccount || "") !== String(bankParentAccount._id)) {
      throw new Error("Bank account COA must be a child account under Bank account code 1002");
    }

    // FIXED: Validate it's a LEAF account (no children)
    const hasChildren = await ChartOfAccounts.countDocuments({
      parentAccount: coaAccount._id,
      deletedAt: null,
    });

    if (hasChildren > 0) {
      throw new Error(
        "Bank account must be linked to a leaf account (account with no sub-accounts)"
      );
    }

    // FIXED: Check for duplicate COA linkage
    const existingBank = await Bank.findOne({
      coaAccount: bankData.coaAccount,
      deletedAt: null,
    });

    if (existingBank) {
      throw new Error(
        "This COA account is already linked to another bank account. Each COA account can only be linked to one bank account."
      );
    }

    // A bank account carries no opening balance of its own — it only links to
    // a COA account that already has one (set on the COA screen, backed by a
    // real OPENING_BALANCE journal). Every balance read here derives from that
    // account's ledger, so there is nothing to seed at creation time.
    // New accounts land at the end of the user-defined order rather than
    // jumping to the front. Accounts predating displayOrder all sit at 0, so
    // the first created account after this change gets 1.
    const lastOrdered = await Bank.findOne({ deletedAt: null })
      .sort({ displayOrder: -1 })
      .select("displayOrder")
      .lean();

    const bank = new Bank({
      ...bankData,
      displayOrder: Number(lastOrdered?.displayOrder || 0) + 1,
    });
    await bank.save();

    // Populate references for response
    await bank.populate("coaAccount", "accountCode accountName accountType");
    await bank.populate("createdBy", "name email");

    return bank;
  }

  /**
   * Get all active bank accounts with current balances
   */
  static async getAllBankAccounts(filters = {}) {
    const query = { deletedAt: null, isActive: true };

    // Apply additional filters if provided
    if (filters.bankName) {
      query.bankName = { $regex: escapeRegex(String(filters.bankName).slice(0, 100)), $options: "i" };
    }
    if (filters.accountType) {
      query.accountType = filters.accountType;
    }

    const banks = await Bank.find(query)
      .populate("createdBy", "name email")
      .populate("coaAccount", "accountName accountCode accountType balance")
      // displayOrder is the drag-and-drop order from the Bank & Cash screen;
      // createdAt breaks ties for accounts that have never been reordered.
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    // Calculate current balance for each bank from approved journal ledger only.
    for (const bank of banks) {
      try {
        bank.currentBalance = await this.calculateBankBalance(bank._id);
      } catch (error) {
        logger.error({ err: error, bankId: bank._id }, "Error calculating balance for bank");
        bank.currentBalance = 0;
        bank.balanceError = error.message;
      }
    }

    return banks;
  }

  /**
   * Persist the card order from the Bank & Cash screen.
   *
   * `orderedIds` is whatever the client had on screen. It is treated as a
   * preference, not as the authoritative set: ids that no longer exist are
   * dropped and any account the client didn't know about (created or
   * reactivated by someone else in the meantime) is appended in its current
   * order. That way a concurrent edit degrades to "the new account is last"
   * instead of failing the request or losing rows from the ordering.
   */
  static async reorderBankAccounts(orderedIds) {
    const current = await Bank.find({ deletedAt: null, isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .select("_id")
      .lean();

    if (current.length === 0) {
      throw new NotFoundError("No bank accounts to reorder");
    }

    const knownIds = new Set(current.map((bank) => String(bank._id)));
    const seen = new Set();
    const requested = [];

    for (const rawId of orderedIds) {
      const id = String(rawId);
      if (!knownIds.has(id) || seen.has(id)) continue;
      seen.add(id);
      requested.push(id);
    }

    if (requested.length === 0) {
      throw new BadRequestError(
        "None of the supplied bank accounts exist — reload the page and try again",
      );
    }

    const finalOrder = [
      ...requested,
      ...current.map((bank) => String(bank._id)).filter((id) => !seen.has(id)),
    ];

    // timestamps:false and no updatedBy on purpose — dragging a card is a
    // presentation change, not an edit of the account, and it would otherwise
    // rewrite the "last updated by/at" of every account on the screen at once.
    await Bank.bulkWrite(
      finalOrder.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { displayOrder: index + 1 } },
        },
      })),
      { timestamps: false },
    );

    return finalOrder.map((id, index) => ({ _id: id, displayOrder: index + 1 }));
  }

  /**
   * Get a specific bank account by ID with current balance
   */
  static async getBankAccountById(bankId) {
    // FIXED: Add soft delete check
    const bank = await Bank.findOne({ _id: bankId, deletedAt: null })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("coaAccount", "accountName accountCode accountType balance")
      .lean();

    if (!bank) {
      throw new NotFoundError("Bank account not found");
    }

    // Calculate current balance
    try {
      bank.currentBalance = await this.calculateBankBalance(bankId);
    } catch (error) {
      logger.error({ err: error, bankId }, "Error calculating balance for bank");
      bank.currentBalance = 0;
      bank.balanceError = error.message;
    }

    return bank;
  }

  /**
   * Update bank account with validation
   * FIXED: Prevent updating immutable fields
   */
  static async updateBankAccount(bankId, updateData, userId) {
    // Prevent updating immutable fields. `openingBalance` is deliberately
    // NOT listed: it is not a field on this schema at all (see bank.model.js),
    // so there is nothing to protect — and guarding it here is what used to
    // make every edit fail, back when the form sent its whole state on update.
    // The controller strips it from the payload before this runs.
    //
    // Note these are rejected on mere *presence*, not on change — so callers
    // must send only the mutable fields, never a whole form snapshot.
    const immutableFields = [
      "accountNumber",
      "coaAccount",
      "createdBy",
      "createdAt",
    ];
    for (const field of immutableFields) {
      if (field in updateData) {
        throw new BadRequestError(`Cannot update immutable field: ${field}`);
      }
    }

    // If updating COA account, validate it
    if (updateData.coaAccount) {
      const coaAccount = await ChartOfAccounts.findById(updateData.coaAccount);

      if (!coaAccount) {
        throw new Error("Linked chart of account not found");
      }

      if (coaAccount.deletedAt) {
        throw new Error("Linked chart of account is deleted");
      }

      if (coaAccount.status !== "active") {
        throw new Error("Linked chart of account is inactive");
      }

      if (coaAccount.accountType !== "asset") {
        throw new Error("Bank account must be linked to an Asset account");
      }

      // Validate it's a leaf account
      const hasChildren = await ChartOfAccounts.countDocuments({
        parentAccount: coaAccount._id,
        deletedAt: null,
      });

      if (hasChildren > 0) {
        throw new Error("Bank account must be linked to a leaf account");
      }
    }

    // Add updatedBy tracking
    updateData.updatedBy = userId;

    const bank = await Bank.findByIdAndUpdate(bankId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("coaAccount", "accountName accountCode accountType");

    if (!bank) {
      throw new NotFoundError("Bank account not found");
    }

    return bank;
  }

  /**
   * Soft delete a bank account
   * FIXED: Add validation to prevent deletion if linked to active transactions
   */
  static async deleteBankAccount(bankId, userId) {
    const bank = await Bank.findById(bankId);

    if (!bank) {
      throw new NotFoundError("Bank account not found");
    }

    if (bank.deletedAt) {
      throw new Error("Bank account is already deleted");
    }

    // Check if there are any journal entries using this bank's COA account
    const linkedEntries = await JournalEntry.countDocuments({
      "bookEntries.account": bank.coaAccount,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
    });

    if (linkedEntries > 0) {
      throw new BadRequestError(
        `Cannot delete bank account. There are ${linkedEntries} posted journal entries using this account. Archive the account instead.`
      );
    }

    // Perform soft delete
    bank.deletedAt = new Date();
    bank.deletedBy = userId;
    bank.isActive = false;

    await bank.save();
    return bank;
  }

  /**
   * Calculate bank balance from approved ledger only.
   * Opening balance is represented by an approved OPENING_BALANCE journal.
   */
  static async calculateBankBalance(bankId, asOfDate = new Date()) {
    const bank = await Bank.findById(bankId);

    if (!bank) {
      throw new Error("Bank account not found");
    }

    if (!bank.coaAccount) {
      throw new Error("Bank account is not linked to a chart of account");
    }

    return await this.calculateCoaLedgerBalance(bank.coaAccount, asOfDate);
  }

  static getBankLine(entry, coaAccountId) {
    return (entry.bookEntries || []).find((line) => {
      const accountId =
        typeof line.account === "object" ? line.account?._id : line.account;
      return String(accountId) === String(coaAccountId);
    });
  }

  static async getApprovedBankTransactions(bankId, filters = {}) {
    const bank = await Bank.findOne({ _id: bankId, deletedAt: null }).lean();

    if (!bank) {
      throw new NotFoundError("Bank account not found");
    }

    await COAService.deduplicateOpeningBalanceJournals(bank.coaAccount);

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const search = String(filters.search || filters.referenceNumber || "")
      .trim()
      .toLowerCase();

    const query = {
      "bookEntries.account": bank.coaAccount,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
    };

    if (filters.startDate || filters.endDate) {
      query.voucherDate = {};

      if (filters.startDate) {
        query.voucherDate.$gte = new Date(filters.startDate);
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.voucherDate.$lte = endDate;
      }
    }

    const entries = await JournalEntry.find(query)
      .populate("createdBy", "name email")
      .sort({ voucherDate: 1, createdAt: 1, _id: 1 });

    let runningBalance = 0;
    const rows = entries
      .map((entry) => {
        const jsonEntry = entry.toJSON();
        const line = this.getBankLine(jsonEntry, bank.coaAccount);
        if (!line) return null;

        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        runningBalance += debit - credit;

        // No per-transaction reconciliation status: reconciliation is
        // period-based and lives entirely in the BankReconciliation module.
        return {
          journalEntryId: jsonEntry._id,
          date: jsonEntry.voucherDate,
          voucherNumber: jsonEntry.voucherNumber,
          referenceNumber: formatReferenceNumber(jsonEntry),
          description: line.description || jsonEntry.description || "",
          debit,
          credit,
          amount: debit - credit,
          runningBalance,
          sourceModule: jsonEntry.sourceModule,
          status: "approved",
          createdBy: jsonEntry.createdBy,
        };
      })
      .filter(Boolean);

    const filteredRows = rows.filter((row) => {
      if (!search) return true;

      return [
        row.voucherNumber,
        row.referenceNumber,
        row.description,
        row.sourceModule,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });

    const descendingRows = [...filteredRows].reverse();
    const total = descendingRows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    return {
      bankId: bank._id,
      coaAccount: bank.coaAccount,
      transactions: descendingRows.slice(skip, skip + limit),
      pagination: {
        total,
        page: safePage,
        limit,
        totalPages,
      },
    };
  }

  static getAccountId(account) {
    if (!account) return "";
    if (typeof account === "object") return String(account._id || account);
    return String(account);
  }

  static getAccountLabel(account) {
    if (!account) return "---";
    if (typeof account === "string") return account;

    const code = account.accountCode ? `${account.accountCode} - ` : "";
    return `${code}${account.accountName || "---"}`;
  }

  /**
   * The other side of the entry — the head money came from (on a deposit) or
   * went to (on a withdrawal). Multi-line entries report their first non-bank
   * line, which is what the cash-book column has room for.
   */
  static getCounterpartyLabel(entry, coaAccountId) {
    const otherLine = (entry.bookEntries || []).find(
      (line) => this.getAccountId(line.account) !== String(coaAccountId),
    );

    return this.getAccountLabel(otherLine?.account);
  }

  static buildBankReportRow(entry, coaAccountId) {
    const bankLine = (entry.bookEntries || []).find(
      (line) => this.getAccountId(line.account) === String(coaAccountId),
    );

    if (!bankLine) return null;

    const debit = Number(bankLine.debit || 0);
    const credit = Number(bankLine.credit || 0);

    return {
      id: entry._id,
      journalEntryId: entry._id,
      date: entry.voucherDate || entry.createdAt,
      voucherNumber: entry.voucherNumber || "---",
      referenceNumber: formatReferenceNumber(entry),
      type: debit > 0 ? "deposit" : "withdrawal",
      description: bankLine.description || entry.description || "",
      // Entry-level description, the same thing the Bank Book statement
      // prints in its "Note" column (see bankBook.service buildRow) — kept
      // separate from `description`, which falls back to the bank line's own
      // narration and feeds the "paid from / paid to" column instead.
      note: entry.description || "",
      counterparty: this.getCounterpartyLabel(entry, coaAccountId),
      debit,
      credit,
      sourceModule: entry.sourceModule || "manual",
      status: "approved",
      approvalStatus: entry.approvalStatus,
      createdBy: entry.createdBy || null,
    };
  }

  /**
   * Printable cash-book report for one bank account, built from the approved
   * journal ledger only — the same source and shape as the petty cash report
   * (see PettyCashService.getJournalBackedReport), so the two screens agree
   * on what an "approved" balance means.
   *
   * The opening balance is everything posted strictly before startDate; with
   * no startDate there is no prior period, so it is zero and the running
   * balance starts from the first transaction.
   */
  static async getJournalBackedReport(bankId, filters = {}) {
    const bank = await Bank.findOne({ _id: bankId, deletedAt: null })
      .populate("coaAccount", "accountCode accountName accountType")
      .lean();

    if (!bank) {
      throw new NotFoundError("Bank account not found");
    }

    if (!bank.coaAccount) {
      throw new BadRequestError(
        "Bank account is not linked to a chart of account",
      );
    }

    const coaAccountId = bank.coaAccount._id;

    await COAService.deduplicateOpeningBalanceJournals(coaAccountId);

    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;

    if (startDate && Number.isNaN(startDate.getTime())) {
      throw new BadRequestError("Invalid from date");
    }

    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new BadRequestError("Invalid to date");
    }

    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    const baseQuery = {
      "bookEntries.account": coaAccountId,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
    };

    const openingQuery = { ...baseQuery };

    if (startDate) {
      openingQuery.voucherDate = { $lt: startDate };
    } else {
      // No period start means no prior period to accumulate.
      openingQuery._id = null;
    }

    const periodQuery = { ...baseQuery };

    if (startDate || endDate) {
      periodQuery.voucherDate = {};
      if (startDate) periodQuery.voucherDate.$gte = startDate;
      if (endDate) periodQuery.voucherDate.$lte = endDate;
    }

    const [openingEntries, periodEntries] = await Promise.all([
      JournalEntry.find(openingQuery)
        .populate("bookEntries.account", "accountCode accountName accountType")
        .sort({ voucherDate: 1, createdAt: 1, _id: 1 }),
      JournalEntry.find(periodQuery)
        .populate("createdBy", "name email")
        .populate("bookEntries.account", "accountCode accountName accountType")
        .sort({ voucherDate: 1, createdAt: 1, _id: 1 }),
    ]);

    const openingBalance = openingEntries.reduce((sum, entry) => {
      const row = this.buildBankReportRow(entry.toJSON(), coaAccountId);
      if (!row) return sum;
      return sum + row.debit - row.credit;
    }, 0);

    let runningBalance = openingBalance;
    const transactions = periodEntries
      .map((entry) => this.buildBankReportRow(entry.toJSON(), coaAccountId))
      .filter(Boolean)
      .map((row) => {
        runningBalance += row.debit - row.credit;

        return {
          ...row,
          accountHead: row.counterparty,
          runningBalance,
        };
      });

    const totalDeposit = transactions.reduce((sum, row) => sum + row.debit, 0);
    const totalWithdrawal = transactions.reduce(
      (sum, row) => sum + row.credit,
      0,
    );

    return {
      bank: {
        _id: bank._id,
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountHolderName: bank.accountHolderName,
        branchName: bank.branchName,
        accountType: bank.accountType,
      },
      account: {
        _id: bank.coaAccount._id,
        accountCode: bank.coaAccount.accountCode,
        accountName: bank.coaAccount.accountName,
        accountType: bank.coaAccount.accountType,
      },
      openingBalance,
      transactions,
      summary: {
        totalDeposit,
        totalWithdrawal,
        closingBalance: openingBalance + totalDeposit - totalWithdrawal,
        count: transactions.length,
      },
      dateRange: {
        from: filters.startDate || null,
        to: filters.endDate || null,
      },
    };
  }

  /**
   * Get total balance across all bank accounts
   */
  static async getTotalBankBalance() {
    const childAccounts = await this.getActiveBankChildAccounts();
    const accounts = [];
    let totalBalance = 0;

    for (const account of childAccounts) {
      const currentBalance = await this.calculateCoaLedgerBalance(account._id);
      totalBalance += currentBalance;
      accounts.push({
        _id: account._id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        currentBalance,
      });
    }

    return {
      totalBalance,
      accountCount: accounts.length,
      accounts,
    };
  }
}

module.exports = BankService;
