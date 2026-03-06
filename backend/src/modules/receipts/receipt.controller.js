const { StatusCodes } = require('http-status-codes');
const ReceiptService = require('./receipt.service');
const ApiResponse = require('../../utils/apiResponse');

class ReceiptController {
  static async createReceipt(req, res, next) {
    try {
      const { receiptNumber, student, feeType, amount, paymentMode, referenceNumber, description } = req.body;

      if (!receiptNumber || !student || !feeType || !amount || !paymentMode) {
        return ApiResponse.badRequest(res, 'Receipt number, student, fee type, amount, and payment mode are required');
      }

      const receiptData = {
        receiptNumber,
        student,
        feeType,
        amount,
        paymentMode,
        referenceNumber,
        description,
        createdBy: req.user.userId
      };

      const receipt = await ReceiptService.createReceipt(receiptData);
      return ApiResponse.created(res, receipt, 'Receipt created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAllReceipts(req, res, next) {
    try {
      const { student, feeType, approvalStatus, dateFrom, dateTo } = req.query;
      const filters = {};
      if (student) filters.student = student;
      if (feeType) filters.feeType = feeType;
      if (approvalStatus) filters.approvalStatus = approvalStatus;
      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom;
        filters.dateTo = dateTo;
      }

      const receipts = await ReceiptService.getAllReceipts(filters);
      return ApiResponse.success(res, receipts, 'Receipts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getReceiptById(req, res, next) {
    try {
      const { id } = req.params;
      const receipt = await ReceiptService.getReceiptById(id);

      if (!receipt) {
        return ApiResponse.notFound(res, 'Receipt not found');
      }

      return ApiResponse.success(res, receipt, 'Receipt retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateReceipt(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const receipt = await ReceiptService.updateReceipt(id, updateData);

      if (!receipt) {
        return ApiResponse.notFound(res, 'Receipt not found');
      }

      return ApiResponse.success(res, receipt, 'Receipt updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteReceipt(req, res, next) {
    try {
      const { id } = req.params;
      const receipt = await ReceiptService.deleteReceipt(id);

      if (!receipt) {
        return ApiResponse.notFound(res, 'Receipt not found');
      }

      return ApiResponse.success(res, null, 'Receipt deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async approveReceipt(req, res, next) {
    try {
      const { id } = req.params;
      const receipt = await ReceiptService.approveReceipt(id, req.user.userId);

      if (!receipt) {
        return ApiResponse.notFound(res, 'Receipt not found');
      }

      return ApiResponse.success(res, receipt, 'Receipt approved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async rejectReceipt(req, res, next) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return ApiResponse.badRequest(res, 'Rejection reason is required');
      }

      const receipt = await ReceiptService.rejectReceipt(id, req.user.userId, rejectionReason);

      if (!receipt) {
        return ApiResponse.notFound(res, 'Receipt not found');
      }

      return ApiResponse.success(res, receipt, 'Receipt rejected successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTotalFeeCollected(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.query;
      const filters = {};
      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom;
        filters.dateTo = dateTo;
      }

      const totals = await ReceiptService.getTotalFeeCollected(filters);
      return ApiResponse.success(res, totals, 'Fee collection totals retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReceiptController;
