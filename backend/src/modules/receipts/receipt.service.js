const Receipt = require("./receipt.model");
const PDFGenerator = require("../../utils/pdfGenerator");

// Approval/financial-outcome fields that must never be settable through the
// generic update path — they're only ever set by approveReceipt/rejectReceipt.
const RECEIPT_PROTECTED_FIELDS = [
  "approvalStatus",
  "approvedBy",
  "approvalDate",
  "rejectionReason",
  "journalEntryId",
  "accountingStatus",
];

class ReceiptService {
  static async createReceipt(receiptData) {
    const receipt = new Receipt(receiptData);
    await receipt.save();
    return receipt;
  }

  static async getAllReceipts(filters = {}) {
    const query = {};
    if (filters.student) query.student = filters.student;
    if (filters.feeType) query.feeType = filters.feeType;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.date.$lte = new Date(filters.dateTo);
    }

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Receipt.find(query)
        .populate("student", "name rollNumber class email")
        .populate("createdBy", "name email")
        .populate("approvedBy", "name email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Receipt.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  static async getReceiptById(receiptId) {
    return await Receipt.findById(receiptId)
      .populate("student")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email");
  }

  static async updateReceipt(receiptId, updateData) {
    for (const field of RECEIPT_PROTECTED_FIELDS) {
      delete updateData[field];
    }

    return await Receipt.findByIdAndUpdate(receiptId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  static async deleteReceipt(receiptId) {
    return await Receipt.findByIdAndDelete(receiptId);
  }

  static async approveReceipt(receiptId, approvedBy) {
    const receipt = await Receipt.findByIdAndUpdate(
      receiptId,
      {
        approvalStatus: "approved",
        approvedBy,
        approvalDate: new Date(),
      },
      { new: true },
    );

    // Generate PDF receipt
    if (receipt) {
      const student = await receipt.populate("student");
      const pdfPath = await PDFGenerator.generateReceipt(
        receipt,
        student.student,
      );
      receipt.pdfPath = pdfPath;
      await receipt.save();
    }

    return receipt;
  }

  static async rejectReceipt(receiptId, approvedBy, rejectionReason) {
    return await Receipt.findByIdAndUpdate(
      receiptId,
      {
        approvalStatus: "rejected",
        approvedBy,
        approvalDate: new Date(),
        rejectionReason,
      },
      { new: true },
    );
  }

  static async getReceiptsByStudent(studentId) {
    return await Receipt.find({ student: studentId }).sort({ date: -1 });
  }

  static async getTotalFeeCollected(filters = {}) {
    const query = { approvalStatus: "approved" };
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.date.$lte = new Date(filters.dateTo);
    }

    const result = await Receipt.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$feeType",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    return result;
  }
}

module.exports = ReceiptService;
