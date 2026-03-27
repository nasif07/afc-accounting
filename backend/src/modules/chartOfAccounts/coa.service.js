const ChartOfAccounts = require("./coa.model");

class COAService {
  static async refreshParentHasChildren(parentId) {
    if (!parentId) return;

    const hasChildren = await ChartOfAccounts.exists({
      parentAccount: parentId,
      deletedAt: null,
      status: { $ne: "archived" },
    });

    await ChartOfAccounts.findByIdAndUpdate(parentId, {
      hasChildren: !!hasChildren,
    });
  }

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

  static async createAccount(accountData) {
    const account = new ChartOfAccounts(accountData);
    await account.save();

    if (account.parentAccount) {
      await this.refreshParentHasChildren(account.parentAccount);
    }

    return account;
  }

  static async getAllAccounts(filters = {}) {
    const query = {
      deletedAt: null,
      status: { $ne: "archived" },
    };

    if (filters.accountType) query.accountType = filters.accountType;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const accounts = await ChartOfAccounts.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

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
    return await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    })
      .populate("createdBy", "name email")
      .populate("parentAccount");
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

    const oldParentId = existingAccount.parentAccount
      ? existingAccount.parentAccount.toString()
      : null;

    const nextParentId =
      updateData.parentAccount !== undefined
        ? updateData.parentAccount || null
        : oldParentId;

    if (nextParentId && nextParentId.toString() === accountId.toString()) {
      throw new Error("Account cannot be its own parent");
    }

    if (
      updateData.accountType &&
      updateData.accountType !== existingAccount.accountType
    ) {
      const hasTransactions = await this.hasRealTransactions(accountId);
      const hasChildren = await this.hasRealChildren(accountId);

      if (hasTransactions) {
        throw new Error(
          "Cannot change account type of an account with transactions",
        );
      }

      if (hasChildren) {
        throw new Error("Cannot change account type of a parent account");
      }
    }

    if (updateData.parentAccount) {
      const newParent = await ChartOfAccounts.findOne({
        _id: updateData.parentAccount,
        deletedAt: null,
      });

      if (!newParent) {
        throw new Error("Parent account not found");
      }

      if (newParent.status === "archived" || !newParent.isActive) {
        throw new Error(
          "Inactive or archived account cannot be used as parent",
        );
      }

      const effectiveType =
        updateData.accountType || existingAccount.accountType;
      if (newParent.accountType !== effectiveType) {
        throw new Error("Parent account type must match");
      }
    }

    const updatedAccount = await ChartOfAccounts.findByIdAndUpdate(
      accountId,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    const normalizedNewParentId = updatedAccount.parentAccount
      ? updatedAccount.parentAccount.toString()
      : null;

    if (oldParentId && oldParentId !== normalizedNewParentId) {
      await this.refreshParentHasChildren(oldParentId);
    }

    if (normalizedNewParentId) {
      await this.refreshParentHasChildren(normalizedNewParentId);
    }

    return updatedAccount;
  }

  static async deleteAccount(accountId, userId) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    });

    if (!account) throw new Error("Account not found");

    const hasTransactions = await this.hasRealTransactions(accountId);
    if (hasTransactions || account.hasTransactions) {
      throw new Error("Cannot delete account with existing transactions");
    }

    const hasChildren = await this.hasRealChildren(accountId);
    if (hasChildren) {
      throw new Error("Cannot delete account with child accounts");
    }

    const updated = await ChartOfAccounts.findByIdAndUpdate(
      accountId,
      {
        status: "archived",
        isActive: false,
        deletedAt: new Date(),
        deletedBy: userId,
      },
      { new: true },
    );

    if (account.parentAccount) {
      await this.refreshParentHasChildren(account.parentAccount);
    }

    return updated;
  }

  static async getAccountsByType(accountType) {
    return await ChartOfAccounts.find({
      accountType,
      isActive: true,
      status: "active",
      deletedAt: null,
    });
  }

  static async getAccountBalance(accountId) {
    const account = await ChartOfAccounts.findOne({
      _id: accountId,
      deletedAt: null,
    });

    if (!account) throw new Error("Account not found");

    let balance = account.openingBalance || 0;

    const JournalEntry = require("../accounting/accounting.model");
    const entries = await JournalEntry.find({
      "bookEntries.account": accountId,
      status: "posted",
      deletedAt: null,
    }).lean();

    for (const entry of entries) {
      for (const line of entry.bookEntries) {
        if (line.account.toString() === accountId.toString()) {
          balance += line.debit || 0;
          balance -= line.credit || 0;
        }
      }
    }

    return balance;
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

    if (filters.accountType) query.accountType = filters.accountType;

    const accounts = await ChartOfAccounts.find(query)
      .select("_id accountCode accountName accountType status parentAccount")
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
        isActive: true,
      });

      if (!parent) {
        throw new Error(
          "Cannot restore account because parent is missing or inactive",
        );
      }
    }

    const restored = await ChartOfAccounts.findByIdAndUpdate(
      accountId,
      {
        status: "active",
        isActive: true,
        deletedAt: null,
        deletedBy: null,
      },
      { new: true },
    );

    if (restored.parentAccount) {
      await this.refreshParentHasChildren(restored.parentAccount);
    }

    return restored;
  }

  static async buildAccountTree() {
    const accounts = await ChartOfAccounts.find({
      status: "active",
      deletedAt: null,
    }).lean();

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
