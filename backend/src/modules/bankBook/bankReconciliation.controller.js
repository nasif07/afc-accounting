const BankReconciliationService = require("./bankReconciliation.service");
const ApiResponse = require("../../utils/apiResponse");

class BankReconciliationController {
  static async create(req, res, next) {
    try {
      const reconciliation = await BankReconciliationService.createReconciliationPeriod(
        req.body,
        req.user.userId,
      );
      return ApiResponse.created(
        res,
        reconciliation,
        "Bank reconciliation period created successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async list(req, res, next) {
    try {
      const result = await BankReconciliationService.listByAccount(req.query);
      return ApiResponse.success(
        res,
        result,
        "Bank reconciliations retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const view = await BankReconciliationService.getReconciliationView(req.params.id);
      return ApiResponse.success(
        res,
        view,
        "Bank reconciliation retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateBalances(req, res, next) {
    try {
      const reconciliation = await BankReconciliationService.updateBalances(
        req.params.id,
        req.body,
        req.user.userId,
      );
      return ApiResponse.success(
        res,
        reconciliation,
        "Bank reconciliation balances updated successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async addAdjustmentLine(req, res, next) {
    try {
      const { type, line } = req.body;
      const reconciliation = await BankReconciliationService.addAdjustmentLine(
        req.params.id,
        type,
        line,
      );
      return ApiResponse.success(
        res,
        reconciliation,
        "Adjustment line added successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async removeAdjustmentLine(req, res, next) {
    try {
      const { id, type, lineId } = req.params;
      const reconciliation = await BankReconciliationService.removeAdjustmentLine(
        id,
        type,
        lineId,
      );
      return ApiResponse.success(
        res,
        reconciliation,
        "Adjustment line removed successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async postAdjustmentLine(req, res, next) {
    try {
      const { id, type, lineId } = req.params;
      const reconciliation = await BankReconciliationService.postAdjustmentLine(
        id,
        type,
        lineId,
        { contraAccount: req.body?.contraAccount },
        req.user.userId,
      );
      return ApiResponse.success(
        res,
        reconciliation,
        "Adjustment line posted to the books successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async finalize(req, res, next) {
    try {
      const force = req.body?.force === true;
      const skipPosting = req.body?.skipPosting === true;
      const result = await BankReconciliationService.finalizeReconciliation(
        req.params.id,
        req.user.userId,
        { force, skipPosting },
      );

      const postedCount = result.posted?.length || 0;

      return ApiResponse.success(
        res,
        result,
        postedCount > 0
          ? `Bank reconciliation finalized — ${postedCount} adjustment(s) posted to the books`
          : "Bank reconciliation finalized successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      await BankReconciliationService.deleteReconciliation(req.params.id, req.user.userId);
      return ApiResponse.success(res, null, "Bank reconciliation deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  static async exportPdf(req, res, next) {
    try {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="bank-reconciliation-${req.params.id}.pdf"`,
      );
      return BankReconciliationService.exportReconciliationPdf(req.params.id, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BankReconciliationController;
