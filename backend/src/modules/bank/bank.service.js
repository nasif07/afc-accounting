const Bank = require('./bank.model');

class BankService {
  static async createBankAccount(bankData) {
    const bank = new Bank(bankData);
    await bank.save();
    return bank;
  }

  static async getAllBankAccounts() {
    return await Bank.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  static async getBankAccountById(bankId) {
    return await Bank.findById(bankId)
      .populate('createdBy', 'name email');
  }

  static async updateBankAccount(bankId, updateData) {
    return await Bank.findByIdAndUpdate(
      bankId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  static async deleteBankAccount(bankId) {
    return await Bank.findByIdAndDelete(bankId);
  }

  static async updateAccountBalance(bankId, amount, isDebit) {
    const bank = await Bank.findById(bankId);
    if (!bank) throw new Error('Bank account not found');

    if (isDebit) {
      bank.currentBalance += amount;
    } else {
      bank.currentBalance -= amount;
    }

    await bank.save();
    return bank;
  }

  static async getTotalBankBalance() {
    const result = await Bank.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$currentBalance' },
          accountCount: { $sum: 1 }
        }
      }
    ]);

    return result.length > 0 ? result[0] : { totalBalance: 0, accountCount: 0 };
  }

  static async getBankAccountsByStatus(status) {
    return await Bank.find({ status });
  }

  static async reconcileBankAccount(bankId, reconciledBalance, reconciledDate) {
    const bank = await Bank.findById(bankId);
    if (!bank) throw new Error('Bank account not found');

    bank.lastReconciledDate = reconciledDate;
    bank.lastReconciledBalance = reconciledBalance;
    bank.reconciliationDifference = Math.abs(bank.currentBalance - reconciledBalance);

    await bank.save();
    return bank;
  }
}

module.exports = BankService;
