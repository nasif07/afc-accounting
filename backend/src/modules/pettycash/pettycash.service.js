const PettyCash = require("./pettycash.model");
const AccountingService = require("../accounting/accounting.service");
const ValidationService = require("../../services/validationService");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");
const JournalEntry = require("../accounting/accounting.model");

const PETTY_CASH_ACCOUNT_CODE = "1001";

class PettyCashService {
  /**
   * Validate petty cash data
   */
  static validatePettyCashData(pettyCashData) {
    const errors = [];

    if (!pettyCashData.date) {
      errors.push("Date is required");
    }

    if (
      !pettyCashData.description ||
      pettyCashData.description.trim().length === 0
    ) {
      errors.push("Description is required");
    }

    if (!pettyCashData.amount || Number(pettyCashData.amount) <= 0) {
      errors.push("Amount must be greater than 0");
    }

    if (!pettyCashData.expenseAccount) {
      errors.push("Expense account is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static async getPettyCashAccount() {
    return await ChartOfAccounts.findOne({
      accountCode: PETTY_CASH_ACCOUNT_CODE,
      deletedAt: null,
    });
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

  static getCounterpartyLabel(entry, pettyCashAccountId) {
    const otherLine = (entry.bookEntries || []).find(
      (line) => this.getAccountId(line.account) !== String(pettyCashAccountId),
    );

    return this.getAccountLabel(otherLine?.account);
  }

  static buildPettyCashRow(entry, pettyCashAccountId) {
    const pettyCashLine = (entry.bookEntries || []).find(
      (line) => this.getAccountId(line.account) === String(pettyCashAccountId),
    );

    if (!pettyCashLine) return null;

    const debit = Number(pettyCashLine.debit || 0);
    const credit = Number(pettyCashLine.credit || 0);

    return {
      id: entry._id,
      journalEntryId: entry._id,
      date: entry.voucherDate || entry.createdAt,
      voucherNumber: entry.voucherNumber || "---",
      referenceNumber: entry.referenceNumber || "",
      type: debit > 0 ? "deposit" : "expense",
      description: pettyCashLine.description || entry.description || "",
      counterparty: this.getCounterpartyLabel(entry, pettyCashAccountId),
      debit,
      credit,
      sourceModule: entry.sourceModule || "manual",
      status: "approved",
      approvalStatus: entry.approvalStatus,
      createdBy: entry.createdBy || null,
    };
  }

  static async getJournalBackedTransactions(filters = {}) {
    const pettyCashAccount = await this.getPettyCashAccount();

    if (!pettyCashAccount) {
      const error = new Error(
        `Petty cash account ${PETTY_CASH_ACCOUNT_CODE} is not configured`,
      );
      error.statusCode = 404;
      throw error;
    }

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const search = String(filters.search || "").trim().toLowerCase();

    const query = {
      "bookEntries.account": pettyCashAccount._id,
      // In this schema approved journals are posted and have approvalStatus approved.
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
      .populate("bookEntries.account", "accountCode accountName accountType")
      .sort({ voucherDate: 1, createdAt: 1, _id: 1 });

    const rows = entries
      .map((entry) =>
        this.buildPettyCashRow(entry.toJSON(), pettyCashAccount._id),
      )
      .filter(Boolean);

    const searchedRows = search
      ? rows.filter((row) =>
          [
            row.voucherNumber,
            row.referenceNumber,
            row.type,
            row.description,
            row.counterparty,
            row.sourceModule,
            row.createdBy?.name,
            row.createdBy?.email,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search)),
        )
      : rows;

    let runningBalance = 0;
    const rowsWithBalance = searchedRows.map((row) => {
      runningBalance += row.debit - row.credit;
      return {
        ...row,
        runningBalance,
      };
    });

    const totalDebit = rowsWithBalance.reduce(
      (sum, row) => sum + row.debit,
      0,
    );
    const totalCredit = rowsWithBalance.reduce(
      (sum, row) => sum + row.credit,
      0,
    );

    const descendingRows = [...rowsWithBalance].reverse();
    const total = descendingRows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    return {
      account: {
        _id: pettyCashAccount._id,
        accountCode: pettyCashAccount.accountCode,
        accountName: pettyCashAccount.accountName,
        accountType: pettyCashAccount.accountType,
      },
      transactions: descendingRows.slice(skip, skip + limit),
      summary: {
        totalDebit,
        totalCredit,
        balance: totalDebit - totalCredit,
        count: total,
      },
      pagination: {
        total,
        page: safePage,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Create journal entry for petty cash
   * Debit  = Expense Account
   * Credit = Petty Cash Account
   */
  static async createJournalEntryForPettyCash(pettyCash) {
    const pettyCashAccount = await this.getPettyCashAccount();

    if (!pettyCashAccount) {
      throw new Error(
        `Petty cash account ${PETTY_CASH_ACCOUNT_CODE} is not configured`,
      );
    }

    const bookEntries = [
      {
        account: pettyCash.expenseAccount,
        debit: Number(pettyCash.amount),
        credit: 0,
        description: pettyCash.description,
      },
      {
        account: pettyCashAccount._id,
        debit: 0,
        credit: Number(pettyCash.amount),
        description: `Petty cash paid to ${pettyCash.paidTo || ""}`.trim(),
      },
    ];

    const accountValidation =
      await ValidationService.validateAccounts(bookEntries);

    if (!accountValidation.isValid) {
      throw new Error(
        `Account validation failed: ${accountValidation.errors.join(", ")}`,
      );
    }

    return await AccountingService.createJournalEntry({
      voucherDate: pettyCash.date,
      transactionType: "payment",
      sourceModule: "petty_cash",
      requiresApproval: false,
      description: `Petty Cash: ${pettyCash.description} (${pettyCash.pettyCashNumber})`,
      bookEntries,
      referenceNumber: pettyCash.pettyCashNumber,
      createdBy: pettyCash.createdBy,
    });
  }
  /**
   * Create a new petty cash disbursement
   */
  static async createPettyCash(pettyCashData) {
    const validation = this.validatePettyCashData(pettyCashData);

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    if (pettyCashData.pettyCashNumber) {
      const existingPettyCash = await PettyCash.findOne({
        pettyCashNumber: pettyCashData.pettyCashNumber.toUpperCase(),
        deletedAt: null,
      });

      if (existingPettyCash) {
        throw new Error(
          `Petty cash number ${pettyCashData.pettyCashNumber} already exists`,
        );
      }
    }

    const pettyCash = new PettyCash({
      ...pettyCashData,
      pettyCashNumber: pettyCashData.pettyCashNumber
        ? pettyCashData.pettyCashNumber.toUpperCase()
        : undefined,
      amount: Number(pettyCashData.amount),
      accountingStatus: "pending",
    });

    await pettyCash.save();

    try {
      const journalEntry = await this.createJournalEntryForPettyCash(pettyCash);

      pettyCash.journalEntryId = journalEntry._id;
      pettyCash.accountingStatus = "posted";

      await pettyCash.save();
    } catch (error) {
      pettyCash.accountingStatus = "pending";
      await pettyCash.save();

      throw new Error(
        `Petty cash saved but journal entry failed: ${error.message}`,
      );
    }

    return await this.getPettyCashById(pettyCash._id);
  }

  /**
   * Get all petty cash records with filters
   */
  static async getAllPettyCash(filters = {}) {
    const query = { deletedAt: null };

    if (filters.createdBy) query.createdBy = filters.createdBy;
    if (filters.expenseAccount) query.expenseAccount = filters.expenseAccount;
    if (filters.accountingStatus)
      query.accountingStatus = filters.accountingStatus;

    if (filters.dateFrom || filters.dateTo) {
      query.date = {};

      if (filters.dateFrom) {
        query.date.$gte = new Date(filters.dateFrom);
      }

      if (filters.dateTo) {
        query.date.$lte = new Date(filters.dateTo);
      }
    }

    return await PettyCash.find(query)
      .populate("expenseAccount", "accountCode accountName accountType")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("journalEntryId")
      .sort({ date: -1 });
  }

  /**
   * Get petty cash by ID
   */
  static async getPettyCashById(pettyCashId) {
    const pettyCash = await PettyCash.findOne({
      _id: pettyCashId,
      deletedAt: null,
    })
      .populate("expenseAccount", "accountCode accountName accountType")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("deletedBy", "name email")
      .populate("journalEntryId");

    if (!pettyCash) {
      throw new Error("Petty cash record not found");
    }

    return pettyCash;
  }

  /**
   * Update petty cash record
   *
   * Important:
   * If accountingStatus is posted, we do not allow direct update
   * because journal entry is already created.
   */
  static async updatePettyCash(pettyCashId, updateData, userId) {
    const pettyCash = await PettyCash.findOne({
      _id: pettyCashId,
      deletedAt: null,
    });

    if (!pettyCash) {
      throw new Error("Petty cash record not found");
    }

    if (pettyCash.accountingStatus === "posted") {
      throw new Error(
        "Cannot update posted petty cash entry. Reverse the journal entry first.",
      );
    }

    const immutableFields = [
      "pettyCashNumber",
      "createdBy",
      "createdAt",
      "journalEntryId",
      "accountingStatus",
    ];

    const attemptedImmutableUpdate = immutableFields.some(
      (field) => field in updateData,
    );

    if (attemptedImmutableUpdate) {
      throw new Error(
        `Cannot update immutable fields: ${immutableFields.join(", ")}`,
      );
    }

    const validation = this.validatePettyCashData({
      ...pettyCash.toObject(),
      ...updateData,
    });

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    updateData.updatedBy = userId;

    const updatedPettyCash = await PettyCash.findByIdAndUpdate(
      pettyCashId,
      updateData,
      { new: true, runValidators: true },
    )
      .populate("expenseAccount", "accountCode accountName accountType")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    return updatedPettyCash;
  }

  /**
   * Soft delete petty cash record
   */
  static async deletePettyCash(pettyCashId, userId) {
    const pettyCash = await PettyCash.findOne({
      _id: pettyCashId,
      deletedAt: null,
    });

    if (!pettyCash) {
      throw new Error("Petty cash record not found");
    }

    if (pettyCash.accountingStatus === "posted") {
      throw new Error(
        "Cannot delete posted petty cash entry. Reverse the journal entry first.",
      );
    }

    pettyCash.deletedAt = new Date();
    pettyCash.deletedBy = userId;

    await pettyCash.save();

    return pettyCash;
  }

  /**
   * Get petty cash by expense account
   */
  static async getPettyCashByExpenseAccount(expenseAccountId) {
    return await PettyCash.find({
      expenseAccount: expenseAccountId,
      accountingStatus: "posted",
      deletedAt: null,
    })
      .populate("expenseAccount", "accountCode accountName accountType")
      .populate("createdBy", "name email")
      .populate("journalEntryId")
      .sort({ date: -1 });
  }

}

module.exports = PettyCashService;
