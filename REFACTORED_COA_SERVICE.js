// ✅ REFACTORED: Chart of Accounts Service
// Includes: Leaf node validation, circular reference detection, soft-delete, tree building

const ChartOfAccounts = require('./coa.model');

class COAService {
  /**
   * ✅ NEW: Check if account is a leaf node (no children)
   */
  static async isLeafNode(accountId) {
    const account = await ChartOfAccounts.findById(accountId).lean();
    if (!account) return false;
    return !account.hasChildren;
  }
  
  /**
   * ✅ NEW: Detect circular parent references
   */
  static async detectCircularReference(accountId, parentId) {
    if (!parentId) return false;
    
    if (accountId.toString() === parentId.toString()) {
      return true;  // Circular: account is its own parent
    }
    
    let current = parentId;
    const visited = new Set([parentId.toString()]);
    
    while (current) {
      const parent = await ChartOfAccounts.findById(current).lean();
      if (!parent) break;
      
      if (parent.parentAccount) {
        const parentId = parent.parentAccount.toString();
        
        if (parentId === accountId.toString()) {
          return true;  // Circular: found back reference
        }
        
        if (visited.has(parentId)) {
          return true;  // Circular: already visited this parent
        }
        
        visited.add(parentId);
        current = parent.parentAccount;
      } else {
        break;
      }
    }
    
    return false;
  }
  
  /**
   * ✅ NEW: Get all children of an account (recursive)
   */
  static async getChildren(accountId, includeInactive = false) {
    const query = { parentAccount: accountId };
    if (!includeInactive) query.status = 'active';
    
    const children = await ChartOfAccounts.find(query).lean();
    
    let allChildren = [...children];
    for (const child of children) {
      const grandchildren = await this.getChildren(child._id, includeInactive);
      allChildren = allChildren.concat(grandchildren);
    }
    
    return allChildren;
  }
  
  /**
   * ✅ NEW: Build account hierarchy tree
   */
  static async buildAccountTree(parentId = null, includeInactive = false) {
    const query = parentId ? { parentAccount: parentId } : { parentAccount: null };
    if (!includeInactive) query.status = 'active';
    
    const accounts = await ChartOfAccounts.find(query).lean();
    
    const tree = [];
    for (const account of accounts) {
      const children = await this.buildAccountTree(account._id, includeInactive);
      tree.push({
        ...account,
        children,
        isLeaf: !account.hasChildren,
      });
    }
    
    return tree;
  }
  
  /**
   * ✅ NEW: Get only leaf nodes (accounts that can be used in transactions)
   */
  static async getLeafNodes(accountType = null, includeInactive = false) {
    const query = { hasChildren: false, status: 'active' };
    if (accountType) query.accountType = accountType;
    if (!includeInactive) query.status = 'active';
    
    return await ChartOfAccounts.find(query)
      .sort({ accountCode: 1 })
      .lean();
  }
  
  /**
   * ✅ FIXED: Create account with validation
   */
  static async createAccount(accountData) {
    // ✅ NEW: Validate parent account if provided
    if (accountData.parentAccount) {
      const parent = await ChartOfAccounts.findById(accountData.parentAccount);
      if (!parent) {
        throw new Error('Parent account does not exist');
      }
      
      // ✅ NEW: Parent must be of same account type
      if (parent.accountType !== accountData.accountType) {
        throw new Error(
          `Parent account must be of type ${accountData.accountType}, got ${parent.accountType}`
        );
      }
      
      // ✅ NEW: Check for circular reference
      const isCircular = await this.detectCircularReference(
        null,
        accountData.parentAccount
      );
      if (isCircular) {
        throw new Error('Circular parent reference detected');
      }
      
      // ✅ NEW: Mark parent as having children
      await ChartOfAccounts.findByIdAndUpdate(
        accountData.parentAccount,
        { hasChildren: true }
      );
    }
    
    const account = new ChartOfAccounts(accountData);
    await account.save();
    return account;
  }
  
  /**
   * ✅ FIXED: Get all accounts with proper filtering
   */
  static async getAllAccounts(filters = {}) {
    const query = { status: 'active' };  // ✅ NEW: Exclude archived by default
    
    if (filters.accountType) query.accountType = filters.accountType;
    if (filters.isActive !== undefined) {
      query.status = filters.isActive ? 'active' : { $ne: 'active' };
    }
    if (filters.includeInactive) {
      delete query.status;
    }
    
    return await ChartOfAccounts.find(query)
      .populate('createdBy', 'name email')
      .populate('parentAccount', 'accountName accountCode')
      .sort({ createdAt: -1 })
      .lean();  // ✅ NEW: Use lean() for performance
  }
  
  /**
   * ✅ FIXED: Get account by ID
   */
  static async getAccountById(accountId) {
    return await ChartOfAccounts.findById(accountId)
      .populate('createdBy', 'name email')
      .populate('parentAccount');
  }
  
  /**
   * ✅ FIXED: Update account with validation
   */
  static async updateAccount(accountId, updateData) {
    const account = await ChartOfAccounts.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    
    // ✅ NEW: Prevent changing account type if it has transactions
    if (updateData.accountType && updateData.accountType !== account.accountType) {
      if (account.hasTransactions) {
        throw new Error('Cannot change account type for an account with transactions');
      }
    }
    
    // ✅ NEW: Validate parent account if being changed
    if (updateData.parentAccount && updateData.parentAccount !== account.parentAccount?.toString()) {
      const parent = await ChartOfAccounts.findById(updateData.parentAccount);
      if (!parent) {
        throw new Error('Parent account does not exist');
      }
      
      // ✅ NEW: Parent must be of same account type
      if (parent.accountType !== (updateData.accountType || account.accountType)) {
        throw new Error(
          `Parent account must be of type ${updateData.accountType || account.accountType}`
        );
      }
      
      // ✅ NEW: Check for circular reference
      const isCircular = await this.detectCircularReference(accountId, updateData.parentAccount);
      if (isCircular) {
        throw new Error('Circular parent reference detected');
      }
      
      // ✅ NEW: Mark new parent as having children
      await ChartOfAccounts.findByIdAndUpdate(
        updateData.parentAccount,
        { hasChildren: true }
      );
    }
    
    return await ChartOfAccounts.findByIdAndUpdate(
      accountId,
      updateData,
      { new: true, runValidators: true }
    );
  }
  
  /**
   * ✅ FIXED: Soft delete account (cannot delete if has transactions)
   */
  static async deleteAccount(accountId, userId) {
    const account = await ChartOfAccounts.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    
    // ✅ NEW: Prevent deletion of accounts with transactions
    if (account.hasTransactions) {
      throw new Error(
        'Cannot delete an account that has transaction history. Archive it instead.'
      );
    }
    
    // ✅ NEW: Prevent deletion of accounts with children
    if (account.hasChildren) {
      throw new Error(
        'Cannot delete an account that has child accounts. Delete children first.'
      );
    }
    
    // ✅ NEW: Soft delete (mark as archived)
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
  
  /**
   * ✅ NEW: Archive account (soft delete without transaction check)
   */
  static async archiveAccount(accountId, userId) {
    const account = await ChartOfAccounts.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
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
  
  /**
   * ✅ NEW: Restore archived account
   */
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
  
  /**
   * ✅ FIXED: Get accounts by type
   */
  static async getAccountsByType(accountType) {
    return await ChartOfAccounts.find({ accountType, status: 'active' })
      .sort({ accountCode: 1 })
      .lean();
  }
  
  /**
   * ✅ NEW: Get balance (calculated, not stored)
   * This ensures balance is always accurate
   */
  static async getAccountBalance(accountId, asOfDate = null) {
    const AccountingService = require('../accounting/accounting.service');
    return await AccountingService.calculateAccountBalance(accountId, asOfDate);
  }
  
  /**
   * ✅ NEW: Get account with balance
   */
  static async getAccountWithBalance(accountId, asOfDate = null) {
    const account = await this.getAccountById(accountId);
    if (!account) throw new Error('Account not found');
    
    const balance = await this.getAccountBalance(accountId, asOfDate);
    
    return {
      ...account.toObject ? account.toObject() : account,
      currentBalance: balance,
    };
  }
  
  /**
   * ✅ NEW: Get trial balance (sum of all leaf node balances)
   */
  static async getTrialBalance(asOfDate = null) {
    const leafNodes = await this.getLeafNodes();
    
    const balances = {};
    let totalDebits = 0;
    let totalCredits = 0;
    
    for (const account of leafNodes) {
      const balance = await this.getAccountBalance(account._id, asOfDate);
      balances[account._id] = {
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        balance,
      };
      
      // ✅ NEW: Debit accounts (assets, expenses) have positive balance
      // Credit accounts (liabilities, equity, income) have negative balance
      if (['asset', 'expense'].includes(account.accountType)) {
        if (balance > 0) totalDebits += balance;
        else totalCredits += Math.abs(balance);
      } else {
        if (balance > 0) totalCredits += balance;
        else totalDebits += Math.abs(balance);
      }
    }
    
    return {
      balances,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }
}

module.exports = COAService;
