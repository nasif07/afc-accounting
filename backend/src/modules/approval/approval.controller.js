const ApiResponse = require("../../utils/apiResponse");
const ApprovalService = require("./approval.service");

// req.user carries identity; the request carries the client metadata the audit
// log records. Bundled here so every service call gets a consistent actor.
const actorFrom = (req) => ({
  ...req.user,
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});

class ApprovalController {
  static async createUploadUrls(req, res, next) {
    try {
      const uploads = await ApprovalService.createUploadUrls(
        req.body.files,
        req.user.userId || req.user.id,
      );

      return ApiResponse.success(res, { uploads }, "Upload URLs created");
    } catch (error) {
      next(error);
    }
  }

  static async listDirectors(req, res, next) {
    try {
      const directors = await ApprovalService.listDirectors();
      return ApiResponse.success(res, { directors }, "Directors retrieved");
    } catch (error) {
      next(error);
    }
  }

  /**
   * A partial send is a success, not an error: some directors were reached and
   * the delivery log records exactly who. The 200 body carries sent/failed so
   * the client can say so rather than showing a blanket failure toast.
   */
  static async notifyDirectors(req, res, next) {
    try {
      const result = await ApprovalService.notifyDirectors(
        req.params.id,
        req.body.directorIds,
        actorFrom(req),
      );

      const message =
        result.sent.length === 0
          ? "No directors could be notified"
          : result.failed.length > 0
            ? `Notified ${result.sent.length} of ${result.sent.length + result.failed.length} directors`
            : `Notified ${result.sent.length} director${result.sent.length === 1 ? "" : "s"}`;

      return ApiResponse.success(res, result, message);
    } catch (error) {
      next(error);
    }
  }

  static async createApproval(req, res, next) {
    try {
      const approval = await ApprovalService.createApproval(
        req.body,
        actorFrom(req),
      );

      return ApiResponse.created(
        res,
        approval,
        "Approval request submitted successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getStats(req, res, next) {
    try {
      const stats = await ApprovalService.getStats(req.query, actorFrom(req));
      return ApiResponse.success(res, stats, 'Approval stats retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getApprovals(req, res, next) {
    try {
      const result = await ApprovalService.getApprovals(
        req.query,
        actorFrom(req),
      );

      return ApiResponse.success(
        res,
        result,
        "Approval requests retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getApprovalById(req, res, next) {
    try {
      const approval = await ApprovalService.getApprovalById(
        req.params.id,
        actorFrom(req),
      );

      return ApiResponse.success(
        res,
        approval,
        "Approval request retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAttachmentUrl(req, res, next) {
    try {
      const result = await ApprovalService.getAttachmentUrl(
        req.params.id,
        req.params.key,
        actorFrom(req),
      );

      return ApiResponse.success(res, result, "Attachment link created");
    } catch (error) {
      next(error);
    }
  }

  static async approveApproval(req, res, next) {
    try {
      const approval = await ApprovalService.approveApproval(
        req.params.id,
        actorFrom(req),
      );

      return ApiResponse.success(res, approval, "Approval request approved");
    } catch (error) {
      next(error);
    }
  }

  static async rejectApproval(req, res, next) {
    try {
      const approval = await ApprovalService.rejectApproval(
        req.params.id,
        req.body.rejectionReason,
        actorFrom(req),
      );

      return ApiResponse.success(res, approval, "Approval request rejected");
    } catch (error) {
      next(error);
    }
  }

  static async bulkApprove(req, res, next) {
    try {
      const result = await ApprovalService.bulkApprove(
        req.body.ids,
        actorFrom(req),
      );

      // Always a 200: partial skips are a reported outcome, not a failure.
      // The message reflects what actually happened so the client can surface
      // it without re-deriving the wording.
      const message =
        result.totalSkipped > 0
          ? `Approved ${result.totalApproved} request(s); ${result.totalSkipped} skipped`
          : `Approved ${result.totalApproved} request(s)`;

      return ApiResponse.success(res, result, message);
    } catch (error) {
      next(error);
    }
  }

  static async deleteApproval(req, res, next) {
    try {
      const result = await ApprovalService.deleteApproval(
        req.params.id,
        actorFrom(req),
      );

      return ApiResponse.success(res, result, "Approval request deleted");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ApprovalController;
