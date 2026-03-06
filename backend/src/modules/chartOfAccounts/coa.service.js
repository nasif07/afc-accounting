const ChartOfAccounts = require('./coa.model');

class COAService {
  static async createAccount(accountData) {
    const account = new ChartOfAccounts(accountData);
    await account.save();
    return account;
  }

  static async getAllAccounts(filters = {}) {
    const query = {};
    if (filters.accountType) query.accountType = filters.accountType;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

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
    return await ChartOfAccounts.findByIdAndUpdate(
      accountId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  static async deleteAccount(accountId) {
    return await ChartOfAccounts.findByIdAndDelete(accountId);
  }

  static async getAccountsByType(accountType) {
    return await ChartOfAccounts.find({ accountType, isActive: true });
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
}

module.exports = COAService;
