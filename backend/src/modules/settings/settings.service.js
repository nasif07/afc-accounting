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

  // Returns the subset of settings consumed by PDF generators and print templates
  static async getOrgInfo() {
    const s = await this.getSettings();
    return {
      orgName:              s.orgName,
      orgEmail:             s.orgEmail,
      orgPhone:             s.orgPhone,
      orgAddress:           s.orgAddress,
      orgWebsite:           s.orgWebsite,
      orgLogo:              s.orgLogo,
      directorName:         s.directorName,
      directorTitle:        s.directorTitle,
      reportHeader:         s.reportHeader,
      reportFooter:         s.reportFooter,
      leaveYearLabel:       s.leaveYearLabel,
      benefitPeriodLabel:   s.benefitPeriodLabel,
      bankNameForPayment:   s.bankNameForPayment,
      bankAccountForPayment: s.bankAccountForPayment,
      currency:             s.currency,
      currencySymbol:       s.currencySymbol,
    };
  }

  static async getFinancialYearSettings() {
    const settings = await this.getSettings();
    return {
      financialYearType: settings.financialYearType,
      startMonth: settings.financialYearType === 'julyjune' ? 'July' : 'January',
      endMonth:   settings.financialYearType === 'julyjune' ? 'June' : 'December',
    };
  }

  static async getApprovalLimits() {
    const settings = await this.getSettings();
    return {
      directorLimit:     settings.approvalLimitDirector,
      accountantLimit:   settings.approvalLimitAccountant,
      subAccountantLimit: settings.approvalLimitSubAccountant,
    };
  }

  static async updateApprovalLimits(directorLimit, accountantLimit, subAccountantLimit) {
    return this.updateSettings({
      approvalLimitDirector:     directorLimit,
      approvalLimitAccountant:   accountantLimit,
      approvalLimitSubAccountant: subAccountantLimit,
    });
  }
}

module.exports = SettingsService;
