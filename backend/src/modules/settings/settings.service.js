const Settings = require('./settings.model');

class SettingsService {
  static async getSettings() {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    return settings;
  }

  static async updateSettings(updateData) {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(updateData);
    } else {
      Object.assign(settings, updateData);
    }
    await settings.save();
    return settings;
  }

  static async getFinancialYearSettings() {
    const settings = await this.getSettings();
    return {
      financialYearType: settings.financialYearType,
      startMonth: settings.financialYearType === 'julyjune' ? 'July' : 'January',
      endMonth: settings.financialYearType === 'julyjune' ? 'June' : 'December'
    };
  }

  static async getApprovalLimits() {
    const settings = await this.getSettings();
    return {
      accountantLimit: settings.accountantApprovalLimit,
      directorLimit: settings.directorApprovalLimit
    };
  }

  static async getVoucherNumberingFormat() {
    const settings = await this.getSettings();
    return {
      receiptPrefix: settings.receiptVoucherPrefix,
      expensePrefix: settings.expenseVoucherPrefix,
      payrollPrefix: settings.payrollVoucherPrefix,
      journalPrefix: settings.journalVoucherPrefix
    };
  }

  static async updateApprovalLimits(accountantLimit, directorLimit) {
    return await this.updateSettings({
      accountantApprovalLimit: accountantLimit,
      directorApprovalLimit: directorLimit
    });
  }

  static async updateVoucherPrefixes(receiptPrefix, expensePrefix, payrollPrefix, journalPrefix) {
    return await this.updateSettings({
      receiptVoucherPrefix: receiptPrefix,
      expenseVoucherPrefix: expensePrefix,
      payrollVoucherPrefix: payrollPrefix,
      journalVoucherPrefix: journalPrefix
    });
  }
}

module.exports = SettingsService;
