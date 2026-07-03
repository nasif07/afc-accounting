const { StatusCodes } = require('http-status-codes');
const SettingsService = require('./settings.service');
const ApiResponse = require('../../utils/apiResponse');

class SettingsController {
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
