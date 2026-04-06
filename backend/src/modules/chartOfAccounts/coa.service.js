const ChartOfAccounts = require("./coa.model");

class COAService {
  static async hasRealChildren(accountId) {
    return !!(await ChartOfAccounts.exists({
      parentAccount: accountId,
      deletedAt: null,
      status: { $ne: "archived" },
    }));
  }

  static async hasRealTransactions(accountId) {
    const JournalEntry = require("../accounting/accounting.model");

    return !!(await JournalEntry.exists({
      "bookEntries.account": accountId,
      status: { $in: ["posted", "draft"] },
      deletedAt: null,
    }));
  }

  static async validateParentAccount({
    accountId = null,
    parentAccountId,
    accountType,
  }) {
    if (!parentAccountId) return null;

    if (accountId && parentAccountId.toString() === accountId.toString()) {
      throw new Error("Account cannot be its own parent");
    }

    const parent = await ChartOfAccounts.findOne({
      _id: parentAccountId,
      deletedAt: null,
      status: { $ne: "archived" },
    });

    if (!parent) {
      throw new Error("Parent account not found");
    }

    if (parent.status !== "active") {
      throw new Error("Only active accounts can be used as parent");
    }

    if (parent.accountType !== accountType) {
      throw new Error("Parent account type must match");
    }

    // circular parent protection
    let current = parent;
    const visited = new Set();

    while (current) {
      const currentId = current._id.toString();

      if (visited.has(currentId)) {
        throw new Error("Circular parent reference detected");
      }

      if (accountId && currentId === accountId.toString()) {
        throw new Error("Circular parent reference detected");
      }

      visited.add(currentId);

      if (!current.parentAccount) break;

      current = await ChartOfAccounts.findOne({
        _id: current.parentAccount,
        deletedAt: null,
        status: { $ne: "archived" },
      });
    }

    return parent;
  }

  static async createAccount(accountData) {
    await this.validateParentAccount({
      parentAccountId: accountData.parentAccount,
      accountType: accountData.accountType,
    });

    const account = new ChartOfAccounts(accountData);
    await account.save();

    return account;
  }

  static async getAllAccounts(filters = {}) {
    const query = {
      deletedAt: null,
      status: { $ne: "archived" },
    };

    if (filters.accountType) {
      query.accountType = filters.accountType;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const accounts = await ChartOfAccounts.find(query)
      .populate("createdBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status")
      .sort({ accountCode: 1 });

    if (!filters.leafNodesOnly) {
      return accounts;
    }

    const leafAccounts = [];
    for (const account of accounts) {
      const hasChildren = await this.hasRealChildren(account._id);
      if (!hasChildren) {
        leafAccounts.push(account);
      }
    }

    return leafAccounts;
  }

  static async getAccountById(accountId) {
    return await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    })
      .populate("createdBy", "name email")
      .populate("deletedBy", "name email")
      .populate("parentAccount", "accountCode accountName accountType status");
  }

  static async updateAccount(accountId, updateData) {
    const existingAccount = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    });

    if (!existingAccount) {
      throw new Error("Account not found");
    }

    if (existingAccount.status === "archived") {
      throw new Error("Archived account cannot be updated");
    }

    const hasTransactions = await this.hasRealTransactions(accountId);
    const hasChildren = await this.hasRealChildren(accountId);

    // determine effective future values
    const nextAccountType =
      updateData.accountType || existingAccount.accountType;
    const nextParentId =
      updateData.parentAccount !== undefined
        ? updateData.parentAccount || null
        : existingAccount.parentAccount || null;

    // protect account type change
    if (
      updateData.accountType &&
      updateData.accountType !== existingAccount.accountType
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

    // protect parent change
    if (
      updateData.parentAccount !== undefined &&
      String(nextParentId || "") !== String(existingAccount.parentAccount || "")
    ) {
      if (hasTransactions) {
        throw new Error("Cannot change parent of an account with transactions");
      }
    }

    await this.validateParentAccount({
      accountId,
      parentAccountId: nextParentId,
      accountType: nextAccountType,
    });

    // protect status changes
    if (updateData.status) {
      if (!["active", "inactive", "archived"].includes(updateData.status)) {
        throw new Error("Invalid account status");
      }

      if (updateData.status === "archived") {
        throw new Error(
          "Use archiveAccount() instead of directly setting archived status",
        );
      }

      if (updateData.status === "inactive" && hasChildren) {
        throw new Error(
          "Cannot inactivate a parent account with child accounts",
        );
      }
    }

    // keep document-based save so model hooks/validators are safer
    Object.keys(updateData).forEach((key) => {
      existingAccount[key] = updateData[key];
    });

    await existingAccount.save();

    return await this.getAccountById(existingAccount._id);
  }

  static async updateAccountStatus(accountId, status, userId = null) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    });

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

    if (userId) {
      account.updatedBy = userId;
    }

    await account.save();

    return await this.getAccountById(account._id);
  }

  static async archiveAccount(accountId, userId) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.status === "archived") {
      return account;
    }

    const hasTransactions = await this.hasRealTransactions(accountId);
    if (hasTransactions) {
      throw new Error("Cannot archive account with existing transactions");
    }

    const hasChildren = await this.hasRealChildren(accountId);
    if (hasChildren) {
      throw new Error("Cannot archive account with child accounts");
    }

    account.status = "archived";
    account.deletedAt = new Date();
    account.deletedBy = userId || null;

    await account.save();

    return account;
  }

  static async restoreAccount(accountId) {
    const account = await ChartOfAccounts.findById(accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (!account.deletedAt && account.status !== "archived") {
      return account;
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

    await account.save();

    return await this.getAccountById(account._id);
  }

  static async getAccountsByType(accountType) {
    return await ChartOfAccounts.find({
      accountType,
      status: "active",
      deletedAt: null,
    }).sort({ accountCode: 1 });
  }

  static async getAccountBalance(accountId, asOfDate = new Date()) {
    const AccountingService = require("../accounting/accounting.service");

    const balanceData = await AccountingService.calculateAccountBalance(
      accountId,
      asOfDate,
    );

    return balanceData.balance;
  }

  static async isLeafNode(accountId) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
      status: { $ne: "archived" },
    });

    if (!account) return false;

    const hasChildren = await this.hasRealChildren(accountId);
    return !hasChildren;
  }

  static async getChildren(accountId) {
    const children = await ChartOfAccounts.find({
      parentAccount: accountId,
      deletedAt: null,
      status: { $ne: "archived" },
    });

    let allChildren = [...children];

    for (const child of children) {
      const grandchildren = await this.getChildren(child._id);
      allChildren = [...allChildren, ...grandchildren];
    }

    return allChildren;
  }

  static async getLeafNodes(filters = {}) {
    const query = {
      deletedAt: null,
      status: "active",
    };

    if (filters.accountType) {
      query.accountType = filters.accountType;
    }

    const accounts = await ChartOfAccounts.find(query)
      .select("_id accountCode accountName accountType status parentAccount")
      .sort({ accountCode: 1 })
      .lean();

    const leafNodes = [];
    for (const account of accounts) {
      const hasChildren = await this.hasRealChildren(account._id);
      if (!hasChildren) {
        leafNodes.push(account);
      }
    }

    return leafNodes;
  }

static async buildAccountTree({ includeDeleted = false, status = "all" } = {}) {
  const query = {};

  if (!includeDeleted) {
    query.deletedAt = null;
  }

  if (status !== "all") {
    query.status = status;
  }

  const accounts = await ChartOfAccounts.find(query)
    .sort({ accountCode: 1 })
    .lean();

  const accountMap = {};
  const roots = [];

  accounts.forEach((acc) => {
    accountMap[acc._id.toString()] = { ...acc, children: [] };
  });

  accounts.forEach((acc) => {
    const parentId = acc.parentAccount ? acc.parentAccount.toString() : null;

    if (parentId && accountMap[parentId]) {
      accountMap[parentId].children.push(accountMap[acc._id.toString()]);
    } else {
      roots.push(accountMap[acc._id.toString()]);
    }
  });

  return roots;
}

  static async getTrialBalance() {
    const JournalEntry = require("../accounting/accounting.model");

    const entries = await JournalEntry.find({
      status: "posted",
      deletedAt: null,
    }).populate("bookEntries.account");

    const balances = {};
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of entries) {
      for (const bookEntry of entry.bookEntries) {
        if (!bookEntry.account) continue;

        const accountId = bookEntry.account._id.toString();

        if (!balances[accountId]) {
          balances[accountId] = {
            account: bookEntry.account,
            debit: 0,
            credit: 0,
          };
        }

        balances[accountId].debit += bookEntry.debit || 0;
        balances[accountId].credit += bookEntry.credit || 0;
        totalDebits += bookEntry.debit || 0;
        totalCredits += bookEntry.credit || 0;
      }
    }

    return {
      balances: Object.values(balances),
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 1,
    };
  }
}

module.exports = COAService;
