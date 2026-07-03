const Vendor = require('./vendor.model');
const { NotFoundError, BadRequestError } = require('../../errors');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
      throw new BadRequestError(`Vendor code ${vendorData.vendorCode} already exists`);
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
      const safe = escapeRegex(String(filters.search).slice(0, 100));
      query.$or = [
        { vendorName: { $regex: safe, $options: 'i' } },
        { vendorCode: { $regex: safe.toUpperCase(), $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
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
      throw new NotFoundError('Vendor not found');
    }

    return vendor;
  }

  /**
   * Update vendor (with immutable field protection)
   */
  static async updateVendor(vendorId, updateData, userId) {
    const vendor = await Vendor.findOne({ _id: vendorId, deletedAt: null });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    // Prevent updating immutable fields
    const immutableFields = ['vendorCode', 'createdBy', 'createdAt'];
    const attemptedImmutableUpdate = immutableFields.some(
      (field) => field in updateData
    );

    if (attemptedImmutableUpdate) {
      throw new BadRequestError(
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
      throw new NotFoundError('Vendor not found');
    }

    // Check if vendor has outstanding payables
    if (vendor.outstandingAmount > 0) {
      throw new BadRequestError(
        `Cannot delete vendor with outstanding payables of ${vendor.outstandingAmount}`
      );
    }

    vendor.deletedAt = new Date();
    vendor.deletedBy = userId;
    await vendor.save();

    return vendor;
  }

}

module.exports = VendorService;
