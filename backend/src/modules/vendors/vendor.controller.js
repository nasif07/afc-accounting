const { StatusCodes } = require('http-status-codes');
const VendorService = require('./vendor.service');
const ApiResponse = require('../../utils/apiResponse');

class VendorController {
  /**
   * Create a new vendor
   */
  static async createVendor(req, res, next) {
    try {
      const {
        vendorCode,
        vendorName,
        vendorType,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        country,
        gstNumber,
        panNumber,
        bankAccountNumber,
        bankName,
        paymentTerms,
        creditLimit,
        notes,
      } = req.body;

      // Validate required fields
      if (!vendorCode || !vendorName || !vendorType) {
        return ApiResponse.badRequest(
          res,
          'Vendor code, name, and type are required'
        );
      }

      // Validate vendor type
      const validTypes = ['supplier', 'contractor', 'service-provider', 'other'];
      if (!validTypes.includes(vendorType)) {
        return ApiResponse.badRequest(
          res,
          `Vendor type must be one of: ${validTypes.join(', ')}`
        );
      }

      // Validate email if provided
      if (email) {
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
          return ApiResponse.badRequest(res, 'Please provide a valid email');
        }
      }

      // Validate credit limit if provided
      if (creditLimit !== undefined && creditLimit < 0) {
        return ApiResponse.badRequest(res, 'Credit limit cannot be negative');
      }

      const vendorData = {
        vendorCode: vendorCode.trim().toUpperCase(),
        vendorName: vendorName.trim(),
        vendorType,
        email: email ? email.toLowerCase() : undefined,
        phone: phone ? phone.trim() : undefined,
        address: address ? address.trim() : undefined,
        city: city ? city.trim() : undefined,
        state: state ? state.trim() : undefined,
        zipCode: zipCode ? zipCode.trim() : undefined,
        country: country ? country.trim() : 'India',
        gstNumber: gstNumber ? gstNumber.trim() : undefined,
        panNumber: panNumber ? panNumber.trim() : undefined,
        bankAccountNumber: bankAccountNumber ? bankAccountNumber.trim() : undefined,
        bankName: bankName ? bankName.trim() : undefined,
        paymentTerms: paymentTerms ? paymentTerms.trim() : undefined,
        creditLimit: creditLimit || 0,
        notes: notes ? notes.trim() : undefined,
        createdBy: req.user.userId,
      };

      const vendor = await VendorService.createVendor(vendorData);
      return ApiResponse.created(res, vendor, 'Vendor created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Get all vendors with filters
   */
  static async getAllVendors(req, res, next) {
    try {
      const { vendorType, isActive, search } = req.query;

      const filters = {};
      if (vendorType) filters.vendorType = vendorType;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (search) filters.search = search;

      const vendors = await VendorService.getAllVendors(filters);
      return ApiResponse.success(
        res,
        vendors,
        'Vendors retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vendor by ID
   */
  static async getVendorById(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, 'Vendor ID is required');
      }

      const vendor = await VendorService.getVendorById(id);
      return ApiResponse.success(res, vendor, 'Vendor retrieved successfully');
    } catch (error) {
      if (error.message === 'Vendor not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Update vendor
   */
  static async updateVendor(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return ApiResponse.badRequest(res, 'Vendor ID is required');
      }

      // Validate vendor type if provided
      if (updateData.vendorType) {
        const validTypes = ['supplier', 'contractor', 'service-provider', 'other'];
        if (!validTypes.includes(updateData.vendorType)) {
          return ApiResponse.badRequest(
            res,
            `Vendor type must be one of: ${validTypes.join(', ')}`
          );
        }
      }

      // Validate email if provided
      if (updateData.email) {
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(updateData.email)) {
          return ApiResponse.badRequest(res, 'Please provide a valid email');
        }
      }

      const vendor = await VendorService.updateVendor(id, updateData, req.user.userId);
      return ApiResponse.success(res, vendor, 'Vendor updated successfully');
    } catch (error) {
      if (error.message === 'Vendor not found') {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('Cannot update immutable')) {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Soft delete vendor
   */
  static async deleteVendor(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, 'Vendor ID is required');
      }

      const vendor = await VendorService.deleteVendor(id, req.user.userId);
      return ApiResponse.success(res, vendor, 'Vendor deleted successfully');
    } catch (error) {
      if (error.message === 'Vendor not found') {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('outstanding payables')) {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Restore deleted vendor
   */
  static async restoreVendor(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, 'Vendor ID is required');
      }

      const vendor = await VendorService.restoreVendor(id, req.user.userId);
      return ApiResponse.success(res, vendor, 'Vendor restored successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Get vendor payables
   */
  static async getVendorPayables(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, 'Vendor ID is required');
      }

      const payables = await VendorService.getVendorPayables(id);
      return ApiResponse.success(
        res,
        payables,
        'Vendor payables retrieved successfully'
      );
    } catch (error) {
      if (error.message === 'Vendor not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Get total payables across all vendors
   */
  static async getTotalPayables(req, res, next) {
    try {
      const totals = await VendorService.getTotalPayables();
      return ApiResponse.success(
        res,
        totals,
        'Total payables retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate vendor
   */
  static async deactivateVendor(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, 'Vendor ID is required');
      }

      const vendor = await VendorService.deactivateVendor(id, req.user.userId);
      return ApiResponse.success(res, vendor, 'Vendor deactivated successfully');
    } catch (error) {
      if (error.message === 'Vendor not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Activate vendor
   */
  static async activateVendor(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, 'Vendor ID is required');
      }

      const vendor = await VendorService.activateVendor(id, req.user.userId);
      return ApiResponse.success(res, vendor, 'Vendor activated successfully');
    } catch (error) {
      if (error.message === 'Vendor not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }
}

module.exports = VendorController;
