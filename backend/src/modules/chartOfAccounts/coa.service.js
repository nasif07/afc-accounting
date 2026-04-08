const ChartOfAccounts = require("./coa.model");
const JournalEntry = require("../accounting/accounting.model");

class COAService {
  static async hasRealChildren(accountId) {
    return !!(await ChartOfAccounts.exists({ parentAccount: accountId, deletedAt: null }));
  }

  static async hasRealTransactions(accountId) {
    return !!(await JournalEntry.exists({ "bookEntries.account": accountId, deletedAt: null }));
  }

  /**
   * Check if setting parentAccount would create a circular reference
   * @param {ObjectId} accountId - The account being updated
   * @param {ObjectId} newParentId - The proposed parent account
   * @returns {Promise<boolean>} - True if circular reference would be created
   */
  static async wouldCreateCircularReference(accountId, newParentId) {
    if (!newParentId) return false;
    if (accountId.toString() === newParentId.toString()) return true;

    // Check if newParent is a descendant of accountId
    let currentParent = newParentId;
    const visited = new Set();

    while (currentParent) {
      if (visited.has(currentParent.toString())) {
        // Circular reference detected in existing tree
        return true;
      }
      if (currentParent.toString() === accountId.toString()) {
        // newParent is a descendant of accountId
        return true;
      }

      visited.add(currentParent.toString());
      const parent = await ChartOfAccounts.findById(currentParent, { parentAccount: 1 });
      currentParent = parent?.parentAccount;
    }

    return false;
  }

  static async createAccount(accountData) {
    const account = new ChartOfAccounts(accountData);
    await account.save();
    return account;
  }

  /**
   * Get all accounts with optional filtering
   * Optimized to avoid N+1 queries for leaf node detection
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

    // Optimized leaf node filtering using aggregation instead of N+1 queries
    if (filters.leafNodesOnly) {
      // Get all accounts that have children in a single query
      const parentAccounts = await ChartOfAccounts.distinct("parentAccount", {
        parentAccount: { $ne: null },
        deletedAt: null,
      });

      // Filter to only leaf accounts
      accounts = accounts.filter(
        (account) => !parentAccounts.some((p) => p.toString() === account._id.toString())
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
    if (!account) throw new Error("Account not found");

    if (account.status === "archived") {
      throw new Error("Archived account cannot be updated");
    }

    // Prevent changing accountType if it has transactions or children
    if (updateData.accountType && updateData.accountType !== account.accountType) {
      const hasTransactions = await this.hasRealTransactions(accountId);
      if (hasTransactions) throw new Error("Cannot change account type of an account with transactions");
      const hasChildren = await this.hasRealChildren(accountId);
      if (hasChildren) throw new Error("Cannot change account type of a parent account");
    }

    // Prevent changing parent if it has transactions or would create circular reference
    if (updateData.parentAccount !== undefined && String(updateData.parentAccount || '') !== String(account.parentAccount || '')) {
      const hasTransactions = await this.hasRealTransactions(accountId);
      if (hasTransactions) throw new Error("Cannot change parent of an account with transactions");

      // CRITICAL FIX: Check for circular references
      const wouldBeCircular = await this.wouldCreateCircularReference(accountId, updateData.parentAccount);
      if (wouldBeCircular) {
        throw new Error("Cannot set parent account: would create a circular reference in the account hierarchy");
      }
    }

    Object.assign(account, updateData);
    account.updatedBy = userId;
    await account.save();
    return account;
  }

  static async updateAccountStatus(accountId, status, userId) {
    const account = await ChartOfAccounts.findById(accountId);
    if (!account) throw new Error("Account not found");

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
    if (!account) throw new Error("Account not found");

    if (account.status === "archived") return account; // Already archived

    const hasChildren = await this.hasRealChildren(accountId);
    if (hasChildren) throw new Error("Cannot archive account with child accounts");

    const hasTransactions = await this.hasRealTransactions(accountId);
    if (hasTransactions) throw new Error("Cannot archive account with existing transactions");

    account.status = "archived";
    account.deletedAt = new Date();
    account.deletedBy = userId;
    await account.save();
    return account;
  }

  static async restoreAccount(accountId, userId) {
    // We need to use includeDeleted: true to find the archived account
    const account = await ChartOfAccounts.findOne({ _id: accountId, status: "archived", includeDeleted: true });
    if (!account) throw new Error("Archived account not found");

    if (account.parentAccount) {
      const parent = await ChartOfAccounts.findOne({
        _id: account.parentAccount,
        deletedAt: null,
        status: "active",
      });
      if (!parent) {
        throw new Error("Cannot restore account because parent is missing or inactive");
      }
    }

    account.status = "active";
    account.deletedAt = null;
    account.deletedBy = null;
    account.updatedBy = userId;
    await account.save();
    return account;
  }

  static async buildAccountTree(filters = {}) {
    const query = {};

    if (filters.includeDeleted) {
      query.includeDeleted = true;
    }

    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    const accounts = await ChartOfAccounts.find(query).sort({ accountCode: 1 }).lean();
    const accountMap = {};
    accounts.forEach(acc => { accountMap[acc._id] = { ...acc, children: [] }; });

    const roots = [];
    accounts.forEach(acc => {
      if (acc.parentAccount && accountMap[acc.parentAccount]) {
        accountMap[acc.parentAccount].children.push(accountMap[acc._id]);
      } else {
        roots.push(accountMap[acc._id]);
      }
    });

    return roots;
  }
}

module.exports = COAService;
