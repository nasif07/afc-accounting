const BankBookService = require("./bankBook.service");
const ApiResponse = require("../../utils/apiResponse");

class BankBookController {
  static async createTransaction(req, res, next) {
    try {
      const entry = await BankBookService.createTransaction(req.body, req.user);
      return ApiResponse.created(res, entry, "Bank transaction posted to journal successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getTransactions(req, res, next) {
    try {
      const result = await BankBookService.listTransactions(req.query);
      return ApiResponse.success(res, result, "Bank book transactions retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getTransaction(req, res, next) {
    try {
      const entry = await BankBookService.getTransaction(req.params.id);
      if (!entry) return ApiResponse.notFound(res, "Bank book transaction not found");
      return ApiResponse.success(res, entry, "Bank book transaction retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async updateTransaction(req, res, next) {
    try {
      const entry = await BankBookService.updateTransaction(
        req.params.id,
        req.body,
        req.user,
      );
      return ApiResponse.success(res, entry, "Bank book transaction updated successfully");
    } catch (error) {
      next(error);
    }
  }

  static async cancelTransaction(req, res, next) {
    try {
      const result = await BankBookService.cancelTransaction(
        req.params.id,
        req.user,
        req.body?.reason,
      );
      return ApiResponse.success(res, result, "Bank book transaction cancelled successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getStatement(req, res, next) {
    try {
      const statement = await BankBookService.getStatement(req.query);
      return ApiResponse.success(res, statement, "Bank statement generated successfully");
    } catch (error) {
      next(error);
    }
  }

  static async exportCsv(req, res, next) {
    try {
      const file = await BankBookService.exportStatementCsv(req.query);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
      return res.send(file.content);
    } catch (error) {
      next(error);
    }
  }

  static async exportExcel(req, res, next) {
    try {
      const file = await BankBookService.exportStatementExcel(req.query);
      res.setHeader("Content-Type", "application/vnd.ms-excel");
      res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
      return res.send(file.content);
    } catch (error) {
      next(error);
    }
  }

  static async exportPdf(req, res, next) {
    try {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="bank-statement-${Date.now()}.pdf"`,
      );
      return BankBookService.exportStatementPdf(req.query, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BankBookController;
