const Bank = require("./bank.model");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");
const COAService = require("../chartOfAccounts/coa.service");
const JournalEntry = require("../accounting/accounting.model");

class BankService {
  static async getBankParentAccount() {
    return await ChartOfAccounts.findOne({
      accountCode: "1002",
      deletedAt: null,
    });
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

    // Create bank account
    const bank = new Bank(bankData);
    await bank.save();

    const hasOpeningBalanceJournal =
      await COAService.hasOpeningBalanceJournal(coaAccount._id);

    if (Number(bankData.openingBalance || 0) > 0 && !hasOpeningBalanceJournal) {
      coaAccount.openingBalance = Number(bankData.openingBalance);
      coaAccount.openingBalanceType = "debit";
      coaAccount.openingDate = bankData.openingDate || new Date();
      await coaAccount.save();
      await COAService.createOpeningBalanceJournal(coaAccount, bankData.createdBy);
    } else if (hasOpeningBalanceJournal) {
      await COAService.deduplicateOpeningBalanceJournals(
        coaAccount._id,
        bankData.createdBy,
      );
    }

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
      query.bankName = { $regex: filters.bankName, $options: "i" };
    }
    if (filters.accountType) {
      query.accountType = filters.accountType;
    }

    const banks = await Bank.find(query)
      .populate("createdBy", "name email")
      .populate("coaAccount", "accountName accountCode accountType balance")
      .sort({ createdAt: -1 })
      .lean();

    // Calculate current balance for each bank from approved journal ledger only.
    for (const bank of banks) {
      try {
        bank.currentBalance = await this.calculateBankBalance(bank._id);
        if (bank.lastReconciledDate) {
          bank.reconciliationDifference =
            Number(bank.lastReconciledBalance || 0) - bank.currentBalance;
        }
      } catch (error) {
        console.error(`Error calculating balance for bank ${bank._id}:`, error.message);
        bank.currentBalance = 0;
        bank.balanceError = error.message;
      }
    }

    return banks;
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
      throw new Error("Bank account not found");
    }

    // Calculate current balance
    try {
      bank.currentBalance = await this.calculateBankBalance(bankId);
      if (bank.lastReconciledDate) {
        bank.reconciliationDifference =
          Number(bank.lastReconciledBalance || 0) - bank.currentBalance;
      }
    } catch (error) {
      console.error(`Error calculating balance for bank ${bankId}:`, error.message);
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
    // Prevent updating immutable fields
    const immutableFields = [
      "accountNumber",
      "coaAccount",
      "openingBalance",
      "createdBy",
      "createdAt",
    ];
    for (const field of immutableFields) {
      if (field in updateData) {
        throw new Error(`Cannot update immutable field: ${field}`);
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
      throw new Error("Bank account not found");
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
      throw new Error("Bank account not found");
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
      throw new Error(
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

  static getReconciliation(entry, coaAccountId) {
    return (entry.bankReconciliations || []).find(
      (item) => String(item.account) === String(coaAccountId),
    );
  }

  static async getApprovedBankTransactions(bankId, filters = {}) {
    const bank = await Bank.findOne({ _id: bankId, deletedAt: null }).lean();

    if (!bank) {
      throw new Error("Bank account not found");
    }

    await COAService.deduplicateOpeningBalanceJournals(bank.coaAccount);

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const search = String(filters.search || filters.referenceNumber || "")
      .trim()
      .toLowerCase();
    const reconciliationStatus = filters.reconciliationStatus || filters.status;

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

        const reconciliation = this.getReconciliation(jsonEntry, bank.coaAccount);
        const status = reconciliation?.status || "unreconciled";
        const isReconciled =
          Boolean(reconciliation?.isReconciled) || status === "reconciled";

        return {
          journalEntryId: jsonEntry._id,
          date: jsonEntry.voucherDate,
          voucherNumber: jsonEntry.voucherNumber,
          referenceNumber: jsonEntry.referenceNumber || "",
          description: line.description || jsonEntry.description || "",
          debit,
          credit,
          amount: debit - credit,
          runningBalance,
          sourceModule: jsonEntry.sourceModule,
          status: "approved",
          reconciliationStatus: status,
          isReconciled,
          reconciledAt: isReconciled ? reconciliation.reconciledAt : null,
          reconciledBy: isReconciled ? reconciliation.reconciledBy : null,
          reconciliationId: isReconciled ? reconciliation.reconciliationId : "",
          statementRef: isReconciled ? reconciliation.statementRef || "" : "",
          createdBy: jsonEntry.createdBy,
        };
      })
      .filter(Boolean);

    const filteredRows = rows.filter((row) => {
      if (
        reconciliationStatus &&
        reconciliationStatus !== "all" &&
        row.reconciliationStatus !== reconciliationStatus
      ) {
        return false;
      }

      if (!search) return true;

      return [
        row.voucherNumber,
        row.referenceNumber,
        row.description,
        row.sourceModule,
        row.reconciliationId,
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

  /**
   * Reconcile a bank account
   * FIXED: Store signed difference (positive = over, negative = under)
   */
  static async reconcileBankAccount(bankId, reconcileData, userId) {
    const bank = await Bank.findById(bankId);

    if (!bank) {
      throw new Error("Bank account not found");
    }

    const reconciledBalance = Number(reconcileData.reconciledBalance || 0);
    const reconciledDate = reconcileData.reconciledDate;
    const reconciliationId =
      reconcileData.reconciliationId ||
      reconcileData.statementReference ||
      `REC-${bankId}-${Date.now()}`;
    const statementRef = reconcileData.statementReference || reconciliationId;
    const transactionIds = Array.isArray(reconcileData.transactionIds)
      ? reconcileData.transactionIds
      : [];

    // Get current system balance
    const currentBalance = await this.calculateBankBalance(bankId, new Date(reconciledDate));

    // FIXED: Store signed difference (positive = bank has more, negative = bank has less)
    const difference = reconciledBalance - currentBalance;

    // Update reconciliation data
    bank.lastReconciledDate = new Date(reconciledDate);
    bank.lastReconciledBalance = reconciledBalance;
    bank.reconciliationDifference = difference;
    bank.updatedBy = userId;

    await bank.save();

    if (transactionIds.length > 0) {
      const approvedEntries = await JournalEntry.find({
        _id: { $in: transactionIds },
        "bookEntries.account": bank.coaAccount,
        status: "posted",
        approvalStatus: "approved",
        deletedAt: null,
      });

      for (const entry of approvedEntries) {
        const existing = (entry.bankReconciliations || []).find(
          (item) => String(item.account) === String(bank.coaAccount),
        );

        if (existing) {
          existing.status = "reconciled";
          existing.isReconciled = true;
          existing.reconciledAt = new Date(reconciledDate);
          existing.reconciledBy = userId;
          existing.reconciliationId = reconciliationId;
          existing.statementRef = statementRef;
        } else {
          entry.bankReconciliations.push({
            account: bank.coaAccount,
            status: "reconciled",
            isReconciled: true,
            reconciledAt: new Date(reconciledDate),
            reconciledBy: userId,
            reconciliationId,
            statementRef,
          });
        }

        await entry.save();
      }
    }

    const reconciliationStatus = await this.getReconciliationStatus(bankId);

    return {
      ...bank.toObject(),
      reconciliationInfo: {
        systemBalance: currentBalance,
        statementBalance: reconciledBalance,
        reconciledBalance: reconciliationStatus.reconciledBalance,
        unreconciledBalance: reconciliationStatus.unreconciledBalance,
        difference: difference,
        status: difference === 0 ? "reconciled" : "pending",
        reconciliationId,
        statementRef,
      },
    };
  }

  /**
   * Get reconciliation status for a bank account
   */
  static async getReconciliationStatus(bankId) {
    const bank = await Bank.findById(bankId);

    if (!bank) {
      throw new Error("Bank account not found");
    }

    await COAService.deduplicateOpeningBalanceJournals(bank.coaAccount);

    const approvedEntries = await JournalEntry.find({
      "bookEntries.account": bank.coaAccount,
      status: "posted",
      approvalStatus: "approved",
      deletedAt: null,
    });

    let currentBalance = 0;
    let reconciledBalance = 0;

    for (const entry of approvedEntries) {
      const jsonEntry = entry.toJSON();
      const line = this.getBankLine(jsonEntry, bank.coaAccount);
      if (!line) continue;

      const amount = Number(line.debit || 0) - Number(line.credit || 0);
      currentBalance += amount;

      const reconciliation = this.getReconciliation(jsonEntry, bank.coaAccount);
      if (
        reconciliation?.isReconciled ||
        reconciliation?.status === "reconciled"
      ) {
        reconciledBalance += amount;
      }
    }

    const unreconciledBalance = currentBalance - reconciledBalance;
    const reconciliationDifference = bank.lastReconciledDate
      ? Number(bank.lastReconciledBalance || 0) - currentBalance
      : bank.reconciliationDifference;

    return {
      bankId: bank._id,
      bankName: bank.bankName,
      currentBalance,
      reconciledBalance,
      unreconciledBalance,
      lastReconciledDate: bank.lastReconciledDate,
      lastReconciledBalance: bank.lastReconciledBalance,
      reconciliationDifference,
      isReconciled: reconciliationDifference === 0,
      status:
        reconciliationDifference === 0
          ? "reconciled"
          : reconciliationDifference > 0
          ? "over"
          : "under",
    };
  }

  /**
   * Archive a bank account (soft delete with ability to restore)
   */
  static async archiveBankAccount(bankId, userId) {
    const bank = await Bank.findById(bankId);

    if (!bank) {
      throw new Error("Bank account not found");
    }

    bank.isActive = false;
    bank.updatedBy = userId;

    await bank.save();
    return bank;
  }

  /**
   * Restore an archived bank account
   */
  static async restoreBankAccount(bankId, userId) {
    const bank = await Bank.findOne({ _id: bankId, deletedAt: null });

    if (!bank) {
      throw new Error("Bank account not found");
    }

    bank.isActive = true;
    bank.updatedBy = userId;

    await bank.save();
    return bank;
  }

  /**
   * Validate bank account can be deactivated
   */
  static async validateCanDeactivate(bankId) {
    const bank = await Bank.findById(bankId);

    if (!bank) {
      throw new Error("Bank account not found");
    }

    // Check for pending reconciliation
    if (bank.reconciliationDifference !== 0) {
      throw new Error(
        "Cannot deactivate bank account with pending reconciliation differences"
      );
    }

    // Check for recent transactions
    const recentEntries = await JournalEntry.countDocuments({
      "bookEntries.account": bank.coaAccount,
      status: "posted",
      approvalStatus: "approved",
      voucherDate: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
      deletedAt: null,
    });

    return {
      canDeactivate: true,
      warnings: recentEntries > 0 ? [`${recentEntries} transactions in last 30 days`] : [],
    };
  }
}

module.exports = BankService;
