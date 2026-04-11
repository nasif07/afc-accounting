const Vendor = require('./vendor.model');

class VendorService {
  /**
   * Create a new vendor
   */
  static async createVendor(vendorData) {
    // Check for duplicate vendor code
    const existingVendor = await Vendor.findOne({
      vendorCode: vendorData.vendorCode.toUpperCase(),
      deletedAt: null,
    });

    if (existingVendor) {
      throw new Error(`Vendor code ${vendorData.vendorCode} already exists`);
    }

    const vendor = new Vendor({
      ...vendorData,
      vendorCode: vendorData.vendorCode.toUpperCase(),
    });

    await vendor.save();
    return vendor.populate('createdBy', 'name email');
  }

  /**
   * Get all vendors with filters
   */
  static async getAllVendors(filters = {}) {
    const query = { deletedAt: null };

    if (filters.vendorType) {
      query.vendorType = filters.vendorType;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.search) {
      query.$or = [
        { vendorName: { $regex: filters.search, $options: 'i' } },
        { vendorCode: { $regex: filters.search.toUpperCase(), $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return await Vendor.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 });
  }

  /**
   * Get vendor by ID
   */
  static async getVendorById(vendorId) {
    const vendor = await Vendor.findOne({ _id: vendorId, deletedAt: null })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('deletedBy', 'name email');

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return vendor;
  }

  /**
   * Update vendor (with immutable field protection)
   */
  static async updateVendor(vendorId, updateData, userId) {
    const vendor = await Vendor.findOne({ _id: vendorId, deletedAt: null });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Prevent updating immutable fields
    const immutableFields = ['vendorCode', 'createdBy', 'createdAt'];
    const attemptedImmutableUpdate = immutableFields.some(
      (field) => field in updateData
    );

    if (attemptedImmutableUpdate) {
      throw new Error(
        `Cannot update immutable fields: ${immutableFields.join(', ')}`
      );
    }

    // Add updatedBy
    updateData.updatedBy = userId;

    const updatedVendor = await Vendor.findByIdAndUpdate(vendorId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    return updatedVendor;
  }

  /**
   * Soft delete vendor
   */
  static async deleteVendor(vendorId, userId) {
    const vendor = await Vendor.findOne({ _id: vendorId, deletedAt: null });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Check if vendor has outstanding payables
    if (vendor.outstandingAmount > 0) {
      throw new Error(
        `Cannot delete vendor with outstanding payables of ${vendor.outstandingAmount}`
      );
    }

    vendor.deletedAt = new Date();
    vendor.deletedBy = userId;
    await vendor.save();

    return vendor;
  }

  /**
   * Restore deleted vendor
   */
  static async restoreVendor(vendorId, userId) {
    const vendor = await Vendor.findOne({ _id: vendorId, deletedAt: { $ne: null } });

    if (!vendor) {
      throw new Error('Deleted vendor not found');
    }

    vendor.deletedAt = null;
    vendor.deletedBy = null;
    vendor.updatedBy = userId;
    await vendor.save();

    return vendor;
  }

  /**
   * Get vendor payables
   */
  static async getVendorPayables(vendorId) {
    const vendor = await Vendor.findOne({ _id: vendorId, deletedAt: null });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return {
      vendorId: vendor._id,
      vendorName: vendor.vendorName,
      vendorCode: vendor.vendorCode,
      totalPayable: vendor.totalPayable,
      totalPaid: vendor.totalPaid,
      outstandingAmount: vendor.outstandingAmount,
      creditLimit: vendor.creditLimit,
      creditAvailable: Math.max(0, vendor.creditLimit - vendor.outstandingAmount),
    };
  }

  /**
   * Update vendor balance (called from expense/invoice modules)
   */
  static async updateVendorBalance(vendorId, amount, isPaid = false) {
    const vendor = await Vendor.findOne({ _id: vendorId, deletedAt: null });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    if (isPaid) {
      vendor.totalPaid += amount;
    } else {
      vendor.totalPayable += amount;
    }

    // Outstanding amount is calculated in pre-save hook
    await vendor.save();
    return vendor;
  }

  /**
   * Get vendors by type
   */
  static async getVendorsByType(vendorType) {
    return await Vendor.find({
      vendorType,
      isActive: true,
      deletedAt: null,
    }).sort({ vendorName: 1 });
  }

  /**
   * Get total payables across all vendors
   */
  static async getTotalPayables() {
    const result = await Vendor.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          totalPayable: { $sum: '$totalPayable' },
          totalPaid: { $sum: '$totalPaid' },
          outstandingAmount: { $sum: '$outstandingAmount' },
          vendorCount: { $sum: 1 },
        },
      },
    ]);

    return result.length > 0
      ? result[0]
      : {
          totalPayable: 0,
          totalPaid: 0,
          outstandingAmount: 0,
          vendorCount: 0,
        };
  }

  /**
   * Deactivate vendor
   */
  static async deactivateVendor(vendorId, userId) {
    const vendor = await Vendor.findOne({ _id: vendorId, deletedAt: null });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    vendor.isActive = false;
    vendor.updatedBy = userId;
    await vendor.save();

    return vendor;
  }

  /**
   * Activate vendor
   */
  static async activateVendor(vendorId, userId) {
    const vendor = await Vendor.findOne({ _id: vendorId, deletedAt: null });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    vendor.isActive = true;
    vendor.updatedBy = userId;
    await vendor.save();

    return vendor;
  }

  /**
   * Validate vendor can be used in transactions
   */
  static async validateVendorActive(vendorId) {
    const vendor = await Vendor.findOne({
      _id: vendorId,
      deletedAt: null,
      isActive: true,
    });

    if (!vendor) {
      throw new Error('Vendor is not active or has been deleted');
    }

    return vendor;
  }
}

module.exports = VendorService;
