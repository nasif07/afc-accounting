const ChartOfAccounts = require("./coa.model");
const JournalEntry = require("../accounting/accounting.model");

class COAService {
  static async hasRealChildren(accountId) {
    return !!(await ChartOfAccounts.exists({ parentAccount: accountId, deletedAt: null }));
  }

  static async hasRealTransactions(accountId) {
    return !!(await JournalEntry.exists({ "bookEntries.account": accountId, deletedAt: null }));
  }

  static async createAccount(accountData) {
    const account = new ChartOfAccounts(accountData);
    await account.save();
    return account;
  }

  static async getAllAccounts(filters = {}) {
    const query = {};

    if (!filters.includeDeleted) {
      query.deletedAt = null;
    }

    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    if (filters.accountType) {
      query.accountType = filters.accountType;
    }

    const accounts = await ChartOfAccounts.find(query)
      .populate("createdBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status")
      .sort({ accountCode: 1 });

    if (filters.leafNodesOnly) {
      const leafAccounts = [];
      for (const account of accounts) {
        const hasChildren = await this.hasRealChildren(account._id);
        if (!hasChildren) {
          leafAccounts.push(account);
        }
      }
      return leafAccounts;
    }

    return accounts;
  }

  static async getAccountById(accountId) {
    return await ChartOfAccounts.findById(accountId)
      .populate("createdBy", "name email")
      .populate("deletedBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status");
  }

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

    // Prevent changing parent if it has transactions
    if (updateData.parentAccount !== undefined && String(updateData.parentAccount || '') !== String(account.parentAccount || '')) {
        const hasTransactions = await this.hasRealTransactions(accountId);
        if (hasTransactions) throw new Error("Cannot change parent of an account with transactions");
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
    const account = await ChartOfAccounts.findOne({ _id: accountId, status: "archived" });
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

    if (!filters.includeDeleted) {
      query.deletedAt = null;
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
