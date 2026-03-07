const Vendor = require('./vendor.model');

class VendorService {
  static async createVendor(vendorData) {
    const vendor = new Vendor(vendorData);
    await vendor.save();
    return vendor;
  }

  static async getAllVendors(filters = {}) {
    const query = {};
    if (filters.vendorType) query.vendorType = filters.vendorType;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { vendorName: { $regex: filters.search, $options: 'i' } },
        { vendorCode: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return await Vendor.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  static async getVendorById(vendorId) {
    return await Vendor.findById(vendorId)
      .populate('createdBy', 'name email');
  }

  static async updateVendor(vendorId, updateData) {
    return await Vendor.findByIdAndUpdate(
      vendorId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  static async deleteVendor(vendorId) {
    return await Vendor.findByIdAndDelete(vendorId);
  }

  static async getVendorPayables(vendorId) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new Error('Vendor not found');
    return {
      vendorName: vendor.vendorName,
      totalPayable: vendor.totalPayable,
      totalPaid: vendor.totalPaid,
      pendingAmount: vendor.totalPayable - vendor.totalPaid
    };
  }

  static async updateVendorBalance(vendorId, amount, isPaid = false) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new Error('Vendor not found');

    if (isPaid) {
      vendor.totalPaid += amount;
    } else {
      vendor.totalPayable += amount;
    }

    await vendor.save();
    return vendor;
  }

  static async getVendorsByType(vendorType) {
    return await Vendor.find({ vendorType, status: 'active' });
  }

  static async getTotalPayables() {
    const result = await Vendor.aggregate([
      {
        $group: {
          _id: null,
          totalPayable: { $sum: '$totalPayable' },
          totalPaid: { $sum: '$totalPaid' }
        }
      }
    ]);

    return result.length > 0 ? result[0] : { totalPayable: 0, totalPaid: 0 };
  }
}

module.exports = VendorService;
