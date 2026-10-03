const { StatusCodes } = require('http-status-codes');
const SettingsService = require('./settings.service');
const ApiResponse = require('../../utils/apiResponse');

class SettingsController {
  static async presignLogoUpload(req, res, next) {
    try {
      const result = await SettingsService.presignLogoUpload(req.body);
      return ApiResponse.success(res, result, 'Upload URL created');
    } catch (error) {
      next(error);
    }
  }

  static async setLogo(req, res, next) {
    try {
      const settings = await SettingsService.setLogo(req.body.key);
      return ApiResponse.success(res, settings, 'Logo updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async clearLogo(req, res, next) {
    try {
      const settings = await SettingsService.clearLogo();
      return ApiResponse.success(res, settings, 'Logo removed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Serves the current logo by redirecting to a short-lived presigned GET, so
   * the bytes never pass through this process.
   *
   * The 302 is what makes a plain <img src> work against a private bucket. It
   * must NOT be cached by the browser: the presigned URL it points at expires
   * in minutes, and a cached redirect would send users to a dead link long
   * after the image itself would have been fine.
   */
  static async getLogo(req, res, next) {
    try {
      const url = await SettingsService.getLogoUrl();

      if (!url) {
        // No upload — the caller falls back to the artwork bundled with the
        // frontend. 404 rather than a redirect to a default, so an <img> with
        // an onError handler can tell the two states apart.
        return res.status(StatusCodes.NOT_FOUND).end();
      }

      res.set('Cache-Control', 'no-store');
      return res.redirect(StatusCodes.TEMPORARY_REDIRECT, url);
    } catch (error) {
      next(error);
    }
  }

  static async getSettings(req, res, next) {
    try {
      const settings = await SettingsService.getSettings();
      return ApiResponse.success(res, settings, 'Settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req, res, next) {
    try {
      const updateData = req.body;
      const settings = await SettingsService.updateSettings(updateData);
      return ApiResponse.success(res, settings, 'Settings updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SettingsController;
