const Receipt = require('./receipt.model');
const PDFGenerator = require('../../utils/pdfGenerator');

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

    return await Receipt.find(query)
      .populate('student', 'name rollNumber class email')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ date: -1 });
  }

  static async getReceiptById(receiptId) {
    return await Receipt.findById(receiptId)
      .populate('student')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');
  }

  static async updateReceipt(receiptId, updateData) {
    return await Receipt.findByIdAndUpdate(
      receiptId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  static async deleteReceipt(receiptId) {
    return await Receipt.findByIdAndDelete(receiptId);
  }

  static async approveReceipt(receiptId, approvedBy) {
    const receipt = await Receipt.findByIdAndUpdate(
      receiptId,
      {
        approvalStatus: 'approved',
        approvedBy,
        approvalDate: new Date()
      },
      { new: true }
    );

    // Generate PDF receipt
    if (receipt) {
      const student = await receipt.populate('student');
      const pdfPath = await PDFGenerator.generateReceipt(receipt, student.student);
      receipt.pdfPath = pdfPath;
      await receipt.save();
    }

    return receipt;
  }

  static async rejectReceipt(receiptId, approvedBy, rejectionReason) {
    return await Receipt.findByIdAndUpdate(
      receiptId,
      {
        approvalStatus: 'rejected',
        approvedBy,
        approvalDate: new Date(),
        rejectionReason
      },
      { new: true }
    );
  }

  static async getReceiptsByStudent(studentId) {
    return await Receipt.find({ student: studentId })
      .sort({ date: -1 });
  }

  static async getTotalFeeCollected(filters = {}) {
    const query = { approvalStatus: 'approved' };
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.date.$lte = new Date(filters.dateTo);
    }

    const result = await Receipt.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$feeType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    return result;
  }
}

module.exports = ReceiptService;
