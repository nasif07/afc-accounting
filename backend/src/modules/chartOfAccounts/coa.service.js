const ChartOfAccounts = require('./coa.model');

class COAService {
  static async createAccount(accountData) {
    const account = new ChartOfAccounts(accountData);
    await account.save();
    return account;
  }

  static async getAllAccounts(filters = {}) {
    const query = { status: { $ne: 'archived' } };
    if (filters.accountType) query.accountType = filters.accountType;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.leafNodesOnly) query.hasChildren = false;

    return await ChartOfAccounts.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  static async getAccountById(accountId) {
    return await ChartOfAccounts.findById(accountId)
      .populate('createdBy', 'name email')
      .populate('parentAccount');
  }

  static async updateAccount(accountId, updateData) {
    return await ChartOfAccounts.findByIdAndUpdate(accountId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  // Soft delete account
  static async deleteAccount(accountId, userId) {
    const account = await ChartOfAccounts.findById(accountId);
    if (!account) throw new Error('Account not found');

    // Cannot delete if has transactions
    if (account.hasTransactions) {
      throw new Error('Cannot delete account with existing transactions');
    }

    // Cannot delete if has children
    if (account.hasChildren) {
      throw new Error('Cannot delete account with child accounts');
    }

    return await ChartOfAccounts.findByIdAndUpdate(
      accountId,
      {
        status: 'archived',
        deletedAt: new Date(),
        deletedBy: userId,
      },
      { new: true }
    );
  }

  static async getAccountsByType(accountType) {
    return await ChartOfAccounts.find({
      accountType,
      isActive: true,
      status: 'active',
    });
  }

  static async getAccountBalance(accountId) {
    const account = await ChartOfAccounts.findById(accountId);
    if (!account) throw new Error('Account not found');
    return account.currentBalance;
  }

  static async updateAccountBalance(accountId, amount, isDebit) {
    const account = await ChartOfAccounts.findById(accountId);
    if (!account) throw new Error('Account not found');

    if (isDebit) {
      account.currentBalance += amount;
    } else {
      account.currentBalance -= amount;
    }

    await account.save();
    return account;
  }

  // Check if account is a leaf node
  static async isLeafNode(accountId) {
    const account = await ChartOfAccounts.findById(accountId);
    return account && !account.hasChildren;
  }

  // Get all children recursively
  static async getChildren(accountId) {
    const children = await ChartOfAccounts.find({ parentAccount: accountId });
    let allChildren = [...children];

    for (const child of children) {
      const grandchildren = await this.getChildren(child._id);
      allChildren = [...allChildren, ...grandchildren];
    }

    return allChildren;
  }

  // Get only leaf nodes
  static async getLeafNodes(filters = {}) {
    const query = { hasChildren: false, status: 'active' };
    if (filters.accountType) query.accountType = filters.accountType;

    return await ChartOfAccounts.find(query)
      .select('_id accountCode accountName accountType status')
      .lean();
  }

  // Restore archived account
  static async restoreAccount(accountId) {
    return await ChartOfAccounts.findByIdAndUpdate(
      accountId,
      {
        status: 'active',
        deletedAt: null,
        deletedBy: null,
      },
      { new: true }
    );
  }

  // Build account tree
  static async buildAccountTree() {
    const accounts = await ChartOfAccounts.find({ status: 'active' }).lean();
    const accountMap = {};
    const roots = [];

    // Create map
    accounts.forEach((acc) => {
      accountMap[acc._id] = { ...acc, children: [] };
    });

    // Build tree
    accounts.forEach((acc) => {
      if (acc.parentAccount) {
        const parent = accountMap[acc.parentAccount];
        if (parent) {
          parent.children.push(accountMap[acc._id]);
        }
      } else {
        roots.push(accountMap[acc._id]);
      }
    });

    return roots;
  }

  // Get trial balance
  static async getTrialBalance() {
    const JournalEntry = require('../accounting/accounting.model');
    const entries = await JournalEntry.find({ status: 'posted' }).populate(
      'bookEntries.account'
    );

    const balances = {};
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of entries) {
      for (const bookEntry of entry.bookEntries) {
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
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }
}

module.exports = COAService;
