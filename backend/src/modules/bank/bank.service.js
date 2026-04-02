const Bank = require("./bank.model");
const AccountingService = require("../accounting/accounting.service");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");

class BankService {
  static async createBankAccount(bankData) {
    const bank = new Bank(bankData);
    await bank.save();
    return bank;
  }

  static async getAllBankAccounts() {
    const banks = await Bank.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Dynamically calculate balance for each bank account
    for (const bank of banks) {
      bank.currentBalance = await this.calculateBankBalance(bank._id);
    }

    return banks;
  }

  static async getBankAccountById(bankId) {
    const bank = await Bank.findById(bankId)
      .populate("createdBy", "name email")
      .lean();

    if (bank) {
      bank.currentBalance = await this.calculateBankBalance(bankId);
    }

    return bank;
  }

  static async updateBankAccount(bankId, updateData) {
    return await Bank.findByIdAndUpdate(
      bankId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  static async deleteBankAccount(bankId, userId) {
    return await Bank.findByIdAndUpdate(
      bankId,
      {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: userId,
      },
      { new: true }
    );
  }

  static async calculateBankBalance(bankId, asOfDate = new Date()) {
    const bank = await Bank.findById(bankId);
    if (!bank) return 0;

    // In a real system, bank accounts should be linked to a COA account
    // If not linked, we'd need a separate BankTransaction model
    // For now, we'll look for journal entries that might be related to this bank
    // Ideally, the Bank model should have a 'coaAccount' field.
    
    if (bank.coaAccount) {
      const balanceData = await AccountingService.calculateAccountBalance(bank.coaAccount, asOfDate);
      return balanceData.balance;
    }

    return bank.openingBalance || 0;
  }

  static async getTotalBankBalance() {
    const banks = await this.getAllBankAccounts();
    const totalBalance = banks.reduce((sum, bank) => sum + (bank.currentBalance || 0), 0);

    return {
      totalBalance,
      accountCount: banks.length
    };
  }

  static async reconcileBankAccount(bankId, reconciledBalance, reconciledDate) {
    const bank = await Bank.findById(bankId);
    if (!bank) throw new Error("Bank account not found");

    const currentBalance = await this.calculateBankBalance(bankId);

    bank.lastReconciledDate = reconciledDate;
    bank.lastReconciledBalance = reconciledBalance;
    bank.reconciliationDifference = Math.abs(currentBalance - reconciledBalance);

    await bank.save();
    return bank;
  }
}

module.exports = BankService;
