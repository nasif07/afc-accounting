const Bank = require("./bank.model");
const AccountingService = require("../accounting/accounting.service");
const ChartOfAccounts = require("../chartOfAccounts/coa.model");

class BankService {
  static async createBankAccount(bankData) {
    console.log(bankData);
    if (!bankData.coaAccount) {
      throw new Error("Bank account must be linked to a chart of account");
    }

    const coaAccount = await ChartOfAccounts.findById(bankData.coaAccount);

    if (!coaAccount) {
      throw new Error("Linked chart of account not found");
    }

    if (coaAccount.deletedAt) {
      throw new Error("Linked chart of account is deleted");
    }

    if (coaAccount.status && coaAccount.status !== "active") {
      throw new Error("Linked chart of account is inactive");
    }


    if (coaAccount.accountType !== "asset") {
      throw new Error("Bank account must be linked to an Asset account");
    }

    const bank = new Bank(bankData);
    await bank.save();
    return bank;
  }

  static async getAllBankAccounts() {
    const banks = await Bank.find()
      .populate("createdBy", "name email")
      .populate("coaAccount", "accountName accountCode accountType")
      .sort({ createdAt: -1 })
      .lean();

    for (const bank of banks) {
      try {
        bank.currentBalance = await this.calculateBankBalance(bank._id);
      } catch (error) {
        bank.currentBalance = 0;
        bank.balanceError = error.message;
      }
    }

    return banks;
  }

  static async getBankAccountById(bankId) {
    const bank = await Bank.findById(bankId)
      .populate("createdBy", "name email")
      .populate("coaAccount", "accountName accountCode accountType")
      .lean();

    if (!bank) return null;

    try {
      bank.currentBalance = await this.calculateBankBalance(bankId);
    } catch (error) {
      bank.currentBalance = 0;
      bank.balanceError = error.message;
    }

    return bank;
  }

  static async updateBankAccount(bankId, updateData) {
    if (updateData.coaAccount) {
      const coaAccount = await ChartOfAccounts.findById(updateData.coaAccount);

      if (!coaAccount) {
        throw new Error("Linked chart of account not found");
      }

      if (coaAccount.deletedAt) {
        throw new Error("Linked chart of account is deleted");
      }

      if (coaAccount.status && coaAccount.status !== "active") {
        throw new Error("Linked chart of account is inactive");
      }

      if (coaAccount.accountType !== "asset") {
        throw new Error("Bank account must be linked to an Asset account");
      }
    }

    return await Bank.findByIdAndUpdate(
      bankId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email")
      .populate("coaAccount", "accountName accountCode accountType");
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

    if (!bank) {
      throw new Error("Bank account not found");
    }

    if (!bank.coaAccount) {
      throw new Error("Bank account is not linked to a chart of account");
    }

    const balanceData = await AccountingService.calculateAccountBalance(
      bank.coaAccount,
      asOfDate
    );

    return balanceData.balance;
  }

  static async getTotalBankBalance() {
    const banks = await this.getAllBankAccounts();
    const totalBalance = banks.reduce(
      (sum, bank) => sum + (bank.currentBalance || 0),
      0
    );

    return {
      totalBalance,
      accountCount: banks.length,
    };
  }

  static async reconcileBankAccount(bankId, reconciledBalance, reconciledDate) {
    const bank = await Bank.findById(bankId);

    if (!bank) {
      throw new Error("Bank account not found");
    }

    const currentBalance = await this.calculateBankBalance(bankId);

    bank.lastReconciledDate = reconciledDate;
    bank.lastReconciledBalance = reconciledBalance;
    bank.reconciliationDifference = Math.abs(currentBalance - reconciledBalance);

    await bank.save();
    return bank;
  }
}

module.exports = BankService;