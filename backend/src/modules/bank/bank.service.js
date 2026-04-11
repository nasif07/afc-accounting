const Bank = require("./bank.model");
const AccountingService = require("../accounting/accounting.service");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");

class BankService {
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

    // Calculate current balance for each bank
    for (const bank of banks) {
      try {
        bank.currentBalance = await this.calculateBankBalance(bank._id);
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
    const immutableFields = ["accountNumber", "coaAccount", "createdBy", "createdAt"];
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
    const JournalEntry = require("../accounting/accounting.model");
    const linkedEntries = await JournalEntry.countDocuments({
      "bookEntries.account": bank.coaAccount,
      status: "posted",
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
   * FIXED: Calculate bank balance including opening balance
   * Balance = Opening Balance + Sum of all journal entries (debits - credits)
   */
  static async calculateBankBalance(bankId, asOfDate = new Date()) {
    const bank = await Bank.findById(bankId);

    if (!bank) {
      throw new Error("Bank account not found");
    }

    if (!bank.coaAccount) {
      throw new Error("Bank account is not linked to a chart of account");
    }

    // Get balance from ledger (sum of journal entries)
    const balanceData = await AccountingService.calculateAccountBalance(
      bank.coaAccount,
      asOfDate
    );

    // FIXED: Include opening balance in calculation
    const currentBalance = bank.openingBalance + (balanceData.balance || 0);

    return currentBalance;
  }

  /**
   * Get total balance across all bank accounts
   */
  static async getTotalBankBalance() {
    const banks = await this.getAllBankAccounts();

    const totalBalance = banks.reduce((sum, bank) => {
      return sum + (bank.currentBalance || 0);
    }, 0);

    return {
      totalBalance,
      accountCount: banks.length,
      accounts: banks.map((b) => ({
        _id: b._id,
        bankName: b.bankName,
        accountNumber: b.accountNumber,
        currentBalance: b.currentBalance,
      })),
    };
  }

  /**
   * Reconcile a bank account
   * FIXED: Store signed difference (positive = over, negative = under)
   */
  static async reconcileBankAccount(bankId, reconciledBalance, reconciledDate, userId) {
    const bank = await Bank.findById(bankId);

    if (!bank) {
      throw new Error("Bank account not found");
    }

    if (!reconciledBalance || !reconciledDate) {
      throw new Error("Reconciled balance and date are required");
    }

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

    return {
      ...bank.toObject(),
      reconciliationInfo: {
        systemBalance: currentBalance,
        reconciledBalance: reconciledBalance,
        difference: difference,
        status: difference === 0 ? "reconciled" : "pending",
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

    const currentBalance = await this.calculateBankBalance(bankId);

    return {
      bankId: bank._id,
      bankName: bank.bankName,
      currentBalance,
      lastReconciledDate: bank.lastReconciledDate,
      lastReconciledBalance: bank.lastReconciledBalance,
      reconciliationDifference: bank.reconciliationDifference,
      isReconciled: bank.reconciliationDifference === 0,
      status:
        bank.reconciliationDifference === 0
          ? "reconciled"
          : bank.reconciliationDifference > 0
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
    const JournalEntry = require("../accounting/accounting.model");
    const recentEntries = await JournalEntry.countDocuments({
      "bookEntries.account": bank.coaAccount,
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
