const { StatusCodes } = require('http-status-codes');
const VendorService = require('./vendor.service');
const ApiResponse = require('../../utils/apiResponse');

class VendorController {
  static async createVendor(req, res, next) {
    try {
      const { vendorCode, vendorName, vendorType, email, phone, address, city, state, pinCode, bankAccount, ifscCode } = req.body;

      if (!vendorCode || !vendorName || !vendorType) {
        return ApiResponse.badRequest(res, 'Vendor code, name, and type are required');
      }

      const vendorData = {
        vendorCode,
        vendorName,
        vendorType,
        email,
        phone,
        address,
        city,
        state,
        pinCode,
        bankAccount,
        ifscCode,
        createdBy: req.user.userId
      };

      const vendor = await VendorService.createVendor(vendorData);
      return ApiResponse.created(res, vendor, 'Vendor created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAllVendors(req, res, next) {
    try {
      const { vendorType, status, search } = req.query;
      const filters = {};
      if (vendorType) filters.vendorType = vendorType;
      if (status) filters.status = status;
      if (search) filters.search = search;

      const vendors = await VendorService.getAllVendors(filters);
      return ApiResponse.success(res, vendors, 'Vendors retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getVendorById(req, res, next) {
    try {
      const { id } = req.params;
      const vendor = await VendorService.getVendorById(id);

      if (!vendor) {
        return ApiResponse.notFound(res, 'Vendor not found');
      }

      return ApiResponse.success(res, vendor, 'Vendor retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateVendor(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const vendor = await VendorService.updateVendor(id, updateData);

      if (!vendor) {
        return ApiResponse.notFound(res, 'Vendor not found');
      }

      return ApiResponse.success(res, vendor, 'Vendor updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteVendor(req, res, next) {
    try {
      const { id } = req.params;
      const vendor = await VendorService.deleteVendor(id);

      if (!vendor) {
        return ApiResponse.notFound(res, 'Vendor not found');
      }

      return ApiResponse.success(res, null, 'Vendor deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getVendorPayables(req, res, next) {
    try {
      const { id } = req.params;
      const payables = await VendorService.getVendorPayables(id);
      return ApiResponse.success(res, payables, 'Vendor payables retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTotalPayables(req, res, next) {
    try {
      const totals = await VendorService.getTotalPayables();
      return ApiResponse.success(res, totals, 'Total payables retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = VendorController;
