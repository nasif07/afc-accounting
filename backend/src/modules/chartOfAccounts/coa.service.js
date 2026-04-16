const ChartOfAccounts = require("./coa.model");
const JournalEntry = require("../accounting/accounting.model");

class COAService {
  static async hasRealChildren(accountId) {
    return !!(await ChartOfAccounts.exists({
      parentAccount: accountId,
      deletedAt: null,
    }));
  }

  static async hasRealTransactions(accountId) {
    return !!(await JournalEntry.exists({
      "bookEntries.account": accountId,
      deletedAt: null,
      status: "approved",
    }));
  }

  /**
   * Check if setting parentAccount would create a circular reference
   * @param {ObjectId|string} accountId
   * @param {ObjectId|string|null} newParentId
   * @returns {Promise<boolean>}
   */
  static async wouldCreateCircularReference(accountId, newParentId) {
    if (!newParentId) return false;
    if (accountId.toString() === newParentId.toString()) return true;

    let currentParent = newParentId;
    const visited = new Set();

    while (currentParent) {
      const currentParentId = currentParent.toString();

      if (visited.has(currentParentId)) {
        return true;
      }

      if (currentParentId === accountId.toString()) {
        return true;
      }

      visited.add(currentParentId);

      const parent = await ChartOfAccounts.findById(currentParent, {
        parentAccount: 1,
      }).lean();

      currentParent = parent?.parentAccount || null;
    }

    return false;
  }

  static async createAccount(accountData) {
    const normalizedOpeningBalance = Number(accountData.openingBalance || 0);
    const normalizedOpeningBalanceType =
      accountData.openingBalanceType || "debit";

    const account = new ChartOfAccounts({
      ...accountData,
      openingBalance: normalizedOpeningBalance,
      openingBalanceType: normalizedOpeningBalanceType,
      currentBalance: normalizedOpeningBalance,
      currentBalanceType: normalizedOpeningBalanceType,
      openingDate: accountData.openingDate || new Date(),
    });

    await account.save();

    return await ChartOfAccounts.findById(account._id)
      .populate("createdBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status");
  }

  /**
   * Get all accounts with optional filtering
   */
  static async getAllAccounts(filters = {}) {
    const query = {};

    if (filters.includeDeleted) {
      query.includeDeleted = true;
    }

    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    if (filters.accountType) {
      query.accountType = filters.accountType;
    }

    let accounts = await ChartOfAccounts.find(query)
      .populate("createdBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status")
      .sort({ accountCode: 1 });

    if (filters.leafNodesOnly) {
      const parentAccounts = await ChartOfAccounts.distinct("parentAccount", {
        parentAccount: { $ne: null },
        deletedAt: null,
      });

      accounts = accounts.filter(
        (account) =>
          !parentAccounts.some(
            (parentId) => parentId.toString() === account._id.toString(),
          ),
      );
    }

    return accounts;
  }

  static async getAccountById(accountId) {
    return await ChartOfAccounts.findById(accountId)
      .populate("createdBy", "name email")
      .populate("deletedBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status");
  }

  /**
   * Update account with validation for circular references
   */
  static async updateAccount(accountId, updateData, userId) {
    const account = await ChartOfAccounts.findById(accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.status === "archived") {
      throw new Error("Archived account cannot be updated");
    }

    const hasTransactions = await this.hasRealTransactions(accountId);
    const hasChildren = await this.hasRealChildren(accountId);

    if (
      updateData.accountType &&
      updateData.accountType !== account.accountType
    ) {
      if (hasTransactions) {
        throw new Error(
          "Cannot change account type of an account with transactions",
        );
      }

      if (hasChildren) {
        throw new Error("Cannot change account type of a parent account");
      }
    }

    if (
      updateData.parentAccount !== undefined &&
      String(updateData.parentAccount || "") !==
        String(account.parentAccount || "")
    ) {
      if (hasTransactions) {
        throw new Error("Cannot change parent of an account with transactions");
      }

      const wouldBeCircular = await this.wouldCreateCircularReference(
        accountId,
        updateData.parentAccount,
      );

      if (wouldBeCircular) {
        throw new Error(
          "Cannot set parent account: would create a circular reference in the account hierarchy",
        );
      }

      if (updateData.parentAccount) {
        const parent = await ChartOfAccounts.findById(updateData.parentAccount);

        if (!parent) {
          throw new Error("Parent account not found");
        }

        if (parent.deletedAt) {
          throw new Error("Deleted account cannot be used as parent");
        }

        if (parent.status !== "active") {
          throw new Error(
            "Only active accounts can be used as parent accounts",
          );
        }

        if (
          parent.accountType !== (updateData.accountType || account.accountType)
        ) {
          throw new Error("Parent account type must match child account type");
        }

        if (await this.hasRealTransactions(parent._id)) {
          throw new Error(
            "An account with transactions cannot be used as a parent account",
          );
        }
      }
    }

    if (hasTransactions) {
      if (updateData.openingBalance !== undefined) {
        throw new Error(
          "Opening balance cannot be updated after transactions exist",
        );
      }

      if (updateData.openingBalanceType !== undefined) {
        throw new Error(
          "Opening balance type cannot be updated after transactions exist",
        );
      }

      if (updateData.openingDate !== undefined) {
        throw new Error(
          "Opening date cannot be updated after transactions exist",
        );
      }
    }

    const nextOpeningBalance =
      updateData.openingBalance !== undefined
        ? Number(updateData.openingBalance)
        : Number(account.openingBalance || 0);

    const nextOpeningBalanceType =
      updateData.openingBalanceType !== undefined
        ? updateData.openingBalanceType
        : account.openingBalanceType;

    Object.assign(account, updateData);
    account.updatedBy = userId;

    // If no approved transactions yet, keep current balance aligned with opening balance
    if (!hasTransactions) {
      account.currentBalance = nextOpeningBalance;
      account.currentBalanceType = nextOpeningBalanceType;
      account.hasTransactions = false;
    }

    await account.save();

    return await ChartOfAccounts.findById(account._id)
      .populate("createdBy", "name email")
      .populate("deletedBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status");
  }

  static async updateAccountStatus(accountId, status, userId) {
    const account = await ChartOfAccounts.findById(accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (!["active", "inactive", "archived"].includes(status)) {
      throw new Error("Invalid account status");
    }

    if (status === "archived") {
      return await this.archiveAccount(accountId, userId);
    }

    const hasChildren = await this.hasRealChildren(accountId);

    if (status === "inactive" && hasChildren) {
      throw new Error("Cannot inactivate a parent account with child accounts");
    }

    account.status = status;
    account.updatedBy = userId;
    await account.save();

    return account;
  }

  static async archiveAccount(accountId, userId) {
    const account = await ChartOfAccounts.findById(accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.status === "archived") {
      return account;
    }

    const hasChildren = await this.hasRealChildren(accountId);
    if (hasChildren) {
      throw new Error("Cannot archive account with child accounts");
    }

    const hasTransactions = await this.hasRealTransactions(accountId);
    if (hasTransactions) {
      throw new Error("Cannot archive account with existing transactions");
    }

    account.status = "archived";
    account.deletedAt = new Date();
    account.deletedBy = userId;
    account.updatedBy = userId;

    await account.save();
    return account;
  }

  static async restoreAccount(accountId, userId) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      status: "archived",
      includeDeleted: true,
    });

    if (!account) {
      throw new Error("Archived account not found");
    }

    if (account.parentAccount) {
      const parent = await ChartOfAccounts.findOne({
        _id: account.parentAccount,
        deletedAt: null,
        status: "active",
      });

      if (!parent) {
        throw new Error(
          "Cannot restore account because parent is missing or inactive",
        );
      }
    }

    account.status = "active";
    account.deletedAt = null;
    account.deletedBy = null;
    account.updatedBy = userId;

    await account.save();
    return account;
  }

  /**
   * Get only leaf accounts
   * Used for journal entry account selection
   */
  static async getLeafNodes(filters = {}) {
    const query = {
      deletedAt: null,
      status: "active",
    };

    if (filters.accountType) {
      query.accountType = filters.accountType;
    }

    const parentAccountIds = await ChartOfAccounts.distinct("parentAccount", {
      parentAccount: { $ne: null },
      deletedAt: null,
    });

    query._id = { $nin: parentAccountIds };

    const leafAccounts = await ChartOfAccounts.find(query)
      .select(
        "_id accountCode accountName accountType status currentBalance currentBalanceType openingBalance openingBalanceType openingDate hasTransactions",
      )
      .populate("parentAccount", "accountCode accountName")
      .sort({ accountCode: 1 });

    return leafAccounts;
  }

  /**
   * Fast balance read from stored account balance
   */
  static async getAccountBalance(accountId) {
    const account = await ChartOfAccounts.findById(accountId).select(
      "_id accountCode accountName accountType currentBalance currentBalanceType openingBalance openingBalanceType hasTransactions",
    );

    if (!account) {
      throw new Error("Account not found");
    }

    return {
      accountId: account._id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      balance: Number(account.currentBalance || 0),
      balanceType: account.currentBalanceType || "debit",
      openingBalance: Number(account.openingBalance || 0),
      openingBalanceType: account.openingBalanceType || "debit",
      hasTransactions: Boolean(account.hasTransactions),
    };
  }

  static async getAccountTransactions(accountId, limit = 20, offset = 0) {
    const parsedLimit = Number(limit);
    const parsedOffset = Number(offset);

    const safeLimit =
      Number.isNaN(parsedLimit) || parsedLimit < 1 ? 20 : parsedLimit;
    const safeOffset =
      Number.isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;

    const transactions = await JournalEntry.find(
      {
        "bookEntries.account": accountId,
        deletedAt: null,
        status: "approved",
      },
      {
        bookEntries: 1,
        voucherNumber: 1,
        voucherDate: 1,
        description: 1,
        status: 1,
        createdAt: 1,
      },
    )
      .sort({ voucherDate: -1, createdAt: -1 })
      .skip(safeOffset)
      .limit(safeLimit)
      .lean();

    return transactions.map((entry) => ({
      ...entry,
      bookEntries: (entry.bookEntries || []).filter(
        (bookEntry) => bookEntry.account?.toString() === accountId.toString(),
      ),
    }));
  }

  static async buildAccountTree(filters = {}) {
    const query = {};

    if (filters.includeDeleted) {
      query.includeDeleted = true;
    }

    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    const accounts = await ChartOfAccounts.find(query)
      .sort({ accountCode: 1 })
      .lean();

    const accountMap = {};

    accounts.forEach((account) => {
      accountMap[account._id] = {
        ...account,
        children: [],
      };
    });

    const roots = [];

    accounts.forEach((account) => {
      if (account.parentAccount && accountMap[account.parentAccount]) {
        accountMap[account.parentAccount].children.push(
          accountMap[account._id],
        );
      } else {
        roots.push(accountMap[account._id]);
      }
    });

    return roots;
  }

  /**
   * Helper method for journal approval logic
   * Marks account as having transactions
   */
  static async markAccountAsTransactional(accountId) {
    await ChartOfAccounts.findByIdAndUpdate(accountId, {
      hasTransactions: true,
    });
  }

  /**
   * Helper method for journal approval logic
   * Updates current balance incrementally
   * amount should be absolute amount in major unit
   */
  static async applyBalanceChange(accountId, entryType, amount) {
    const account = await ChartOfAccounts.findById(accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    const numericAmount = Number(amount || 0);

    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      throw new Error("Invalid balance change amount");
    }

    const currentSigned =
      (account.currentBalanceType === "credit" ? -1 : 1) *
      Number(account.currentBalance || 0);

    const delta = entryType === "credit" ? -numericAmount : numericAmount;
    const nextSigned = currentSigned + delta;

    account.currentBalance = Math.abs(nextSigned);
    account.currentBalanceType = nextSigned < 0 ? "credit" : "debit";
    account.hasTransactions = true;

    await account.save();

    return account;
  }
}

module.exports = COAService;
