const path = require('path');
const Settings = require('./settings.model');
const r2 = require('../../services/r2.service');
const { ORG_LOGO } = require('../../config/constants');
const { BadRequestError } = require('../../errors');
const { loadOrgLogo } = require('../../utils/reportLogo');

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

  /**
   * The subset of settings consumed by PDF generators and print templates.
   *
   * `withLogo` is opt-in rather than always-on because resolving the logo can
   * mean a round trip to R2, and most callers of this method only want the
   * organisation's name and address — the approval notification email, for
   * one, would otherwise pay for an image it never renders.
   */
  static async getOrgInfo({ withLogo = false } = {}) {
    const s = await this.getSettings();

    const info = {
      orgName:              s.orgName,
      orgEmail:             s.orgEmail,
      orgPhone:             s.orgPhone,
      orgAddress:           s.orgAddress,
      orgWebsite:           s.orgWebsite,
      orgLogo:              s.orgLogo,
      orgLogoKey:           s.orgLogoKey,
      orgLogoMimeType:      s.orgLogoMimeType,
      directorName:         s.directorName,
      directorTitle:        s.directorTitle,
      reportHeader:         s.reportHeader,
      reportFooter:         s.reportFooter,
      leaveYearLabel:       s.leaveYearLabel,
      benefitPeriodLabel:   s.benefitPeriodLabel,
      healthFundLabel:      s.healthFundLabel,
      annualLeaveDays:      s.annualLeaveDays,
      sickLeaveDays:        s.sickLeaveDays,
      bankNameForPayment:   s.bankNameForPayment,
      bankAccountForPayment: s.bankAccountForPayment,
      currency:             s.currency,
      currencySymbol:       s.currencySymbol,
      // Populated below when withLogo is set: a Buffer plus the extension the
      // document generators need. Declared here so the shape is the same
      // either way and callers can test it without optional chaining.
      logoImage: null,
      logoImageType: null,
    };

    if (withLogo) {
      const logo = await loadOrgLogo(info);
      if (logo) {
        info.logoImage = logo.data;
        info.logoImageType = logo.type;
      }
    }

    return info;
  }

  // ── Organisation logo ───────────────────────────────────────────────────

  /**
   * Mints a presigned PUT for a new logo. Same contract as approval
   * attachments: the browser uploads the bytes straight to R2 and this process
   * never touches them, so the claimed type is only pinned into the signature
   * here — setLogo() re-reads the truth from R2 before anything is persisted.
   */
  static async presignLogoUpload({ filename, contentType }) {
    if (!ORG_LOGO.ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new BadRequestError(
        `Logo must be a PNG, JPG or WEBP image (received ${contentType || 'nothing'})`,
      );
    }

    // A .png renamed to .jpg passes a MIME-only check, because the browser
    // reports whatever the extension implies. Mirrors approval.service.js.
    const ext = path.extname(filename || '').toLowerCase();
    if (!ORG_LOGO.MIME_EXTENSIONS[contentType].includes(ext)) {
      throw new BadRequestError(
        `'${filename}' does not look like a ${contentType} image`,
      );
    }

    const key = r2.buildLogoKey(filename);
    const uploadUrl = await r2.presignUpload({ key, contentType });

    return {
      key,
      uploadUrl,
      contentType,
      expiresIn: ORG_LOGO.UPLOAD_URL_TTL_SECONDS,
    };
  }

  /**
   * Commits an uploaded logo.
   *
   * The server never saw the bytes, so it cannot take the client's word for
   * what landed: HeadObject re-reads the real size and content type from R2,
   * and anything that fails the rules is deleted rather than left to rot in
   * the bucket as an orphan nobody will ever look for.
   */
  static async setLogo(key) {
    if (!r2.isLogoKey(key)) {
      throw new BadRequestError('That is not a valid logo upload');
    }

    const head = await r2.headObject(key);
    if (!head) {
      throw new BadRequestError(
        'The logo was not uploaded successfully. Please try again.',
      );
    }

    if (!ORG_LOGO.ALLOWED_MIME_TYPES.includes(head.contentType)) {
      await r2.deleteObjectQuietly(key);
      throw new BadRequestError(
        `Logo must be a PNG, JPG or WEBP image (uploaded ${head.contentType || 'unknown'})`,
      );
    }

    if (!head.size || head.size > ORG_LOGO.MAX_FILE_SIZE) {
      await r2.deleteObjectQuietly(key);
      throw new BadRequestError(
        `Logo exceeds the ${Math.round(ORG_LOGO.MAX_FILE_SIZE / 1024 / 1024)}MB limit`,
      );
    }

    const settings = await this.getSettings();
    const previousKey = settings.orgLogoKey;

    settings.orgLogoKey = key;
    settings.orgLogoMimeType = head.contentType;
    settings.orgLogoUpdatedAt = new Date();
    // The hand-typed path would otherwise keep winning in any code path that
    // still reads it, so an upload retires it explicitly.
    settings.orgLogo = '';
    await settings.save();

    // Only after the new logo is safely persisted — losing the old one while
    // the new one failed to save would leave the org with no logo at all.
    if (previousKey && previousKey !== key) {
      await r2.deleteObjectQuietly(previousKey);
    }

    return settings;
  }

  /** Drops the uploaded logo and falls back to the artwork bundled with the app. */
  static async clearLogo() {
    const settings = await this.getSettings();
    const previousKey = settings.orgLogoKey;

    settings.orgLogoKey = '';
    settings.orgLogoMimeType = '';
    settings.orgLogoUpdatedAt = new Date();
    await settings.save();

    if (previousKey) await r2.deleteObjectQuietly(previousKey);

    return settings;
  }

  /**
   * A short-lived presigned GET for the current logo, or null when the org is
   * still on the bundled artwork. The controller redirects to this rather than
   * proxying the bytes, so the image never passes through Node.
   */
  static async getLogoUrl() {
    const settings = await this.getSettings();
    if (!settings.orgLogoKey) return null;

    return r2.presignDownload({
      key: settings.orgLogoKey,
      filename: 'logo' + path.extname(settings.orgLogoKey),
      inline: true,
    });
  }

}

module.exports = SettingsService;
