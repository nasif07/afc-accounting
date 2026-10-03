const ApiResponse = require("../../utils/apiResponse");
const DashboardService = require("./dashboard.service");

class DashboardController {
  static async getSummary(req, res, next) {
    try {
      const summary = await DashboardService.getDashboardSummary();
      return ApiResponse.success(
        res,
        summary,
        "Dashboard summary retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardController;
