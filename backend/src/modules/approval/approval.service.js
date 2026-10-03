const path = require("path");
const mongoose = require("mongoose");
const Approval = require("./approval.model");
const User = require("../users/user.model");
const SettingsService = require("../settings/settings.service");
const r2 = require("../../services/r2.service");
const mail = require("../../services/mail.service");
const { approvalRequestEmail } = require("../../utils/emailTemplates");
const { sanitizeRichText, htmlToPlainText } = require("../../utils/richText");
const logger = require("../../utils/logger");
const { createAuditLog } = require("../../middleware/auditLog");
const {
  APPROVAL_STATUS,
  APPROVAL_ATTACHMENTS,
  NOTIFICATION_EXCLUDED_EMAILS,
  USER_ROLES,
} = require("../../config/constants");
const {
  NotFoundError,
  BadRequestError,
  ValidationError,
} = require("../../errors");

const { ALLOWED_MIME_TYPES, MIME_EXTENSIONS, MAX_FILE_SIZE, MAX_FILES } =
  APPROVAL_ATTACHMENTS;

const POPULATE = [
  { path: "createdBy", select: "name email role" },
  { path: "approvedBy", select: "name email role" },
  { path: "rejectedBy", select: "name email role" },
];

const ENTITY_TYPE = "Approval";

// Where the review modal lives. The email's deep link opens the request in
// place on the director's queue (?request=<id>) rather than dropping them on a
// list they then have to search through — see useQueryModal.js on the client.
const buildReviewUrl = (approvalId) => {
  const base = (process.env.APP_URL || process.env.CORS_ORIGIN || "").replace(
    /\/+$/,
    "",
  );
  return base + "/director/approval-requests?request=" + approvalId;
};

class ApprovalService {
  // ── Attachments ─────────────────────────────────────────────────────────

  /**
   * Mints one presigned PUT per file. The client uploads bytes straight to R2;
   * this process never touches them.
   *
   * The claimed contentType/size are already shape-checked by the Zod schema,
   * and are pinned into each signature here — but they remain *claims* until
   * verifyAttachments() reads the real values back from R2 at create time.
   */
  static async createUploadUrls(files, userId) {
    if (files.length > MAX_FILES) {
      throw new BadRequestError(
        `Cannot upload more than ${MAX_FILES} files per request`,
      );
    }

    for (const file of files) {
      ApprovalService.assertExtensionMatchesMime(file.filename, file.contentType);
    }

    return Promise.all(
      files.map(async (file) => {
        const key = r2.buildObjectKey(userId, file.filename);
        // The declared size is validated by Zod (so an absurd claim is rejected
        // before we mint anything) but is deliberately not signed into the URL —
        // see the note in r2.service.js presignUpload. The authoritative size
        // check is the HeadObject read in verifyAttachments() below.
        const uploadUrl = await r2.presignUpload({
          key,
          contentType: file.contentType,
        });

        return {
          key,
          uploadUrl,
          filename: file.filename,
          contentType: file.contentType,
          expiresIn: APPROVAL_ATTACHMENTS.UPLOAD_URL_TTL_SECONDS,
        };
      }),
    );
  }

  /**
   * A .pdf renamed to .png (or vice versa) passes a MIME-only check, because
   * the browser reports whatever the extension implies. Requiring the two to
   * agree costs nothing and closes the trivial case.
   */
  static assertExtensionMatchesMime(filename, mimeType) {
    const ext = path.extname(filename || "").toLowerCase();
    const allowed = MIME_EXTENSIONS[mimeType];

    if (!allowed) {
      throw new BadRequestError(`File type '${mimeType}' is not allowed`);
    }

    if (!allowed.includes(ext)) {
      throw new BadRequestError(
        `File '${filename}' has extension '${ext}', which does not match its type (${mimeType})`,
      );
    }
  }

  /**
   * Server-side enforcement of the upload contract. Because the bytes went
   * straight to R2, this is the only point at which the app learns what was
   * *actually* stored — so count, ownership, existence, size and content type
   * are all re-checked here against R2's own metadata, not the client payload.
   *
   * Returns fully-populated attachment sub-documents ready to persist.
   */
  static async verifyAttachments(attachmentRefs, userId) {
    if (attachmentRefs.length === 0) {
      throw new ValidationError("At least one attachment is required", [
        { path: ["attachments"], message: "At least one attachment is required" },
      ]);
    }

    if (attachmentRefs.length > MAX_FILES) {
      throw new ValidationError(
        `Cannot attach more than ${MAX_FILES} files`,
        [{ path: ["attachments"], message: `Cannot attach more than ${MAX_FILES} files` }],
      );
    }

    const keys = attachmentRefs.map((a) => a.key);
    if (new Set(keys).size !== keys.length) {
      throw new ValidationError("The same file was attached more than once", [
        { path: ["attachments"], message: "Duplicate attachment" },
      ]);
    }

    const ownedPrefix = `approvals/${userId}/`;

    return Promise.all(
      attachmentRefs.map(async ({ key, filename }) => {
        // Keys are minted server-side and namespaced by uploader, so anything
        // outside this user's own prefix was not issued to this request.
        if (!r2.isOwnedKey(key) || !key.startsWith(ownedPrefix)) {
          throw new BadRequestError(`Attachment '${filename}' is not a valid upload`);
        }

        const head = await r2.headObject(key);
        if (!head) {
          throw new BadRequestError(
            `Attachment '${filename}' was not uploaded successfully. Please try again.`,
          );
        }

        if (!ALLOWED_MIME_TYPES.includes(head.contentType)) {
          await r2.deleteObjectQuietly(key);
          throw new BadRequestError(
            `Attachment '${filename}' has an unsupported type (${head.contentType || "unknown"})`,
          );
        }

        if (!head.size || head.size > MAX_FILE_SIZE) {
          await r2.deleteObjectQuietly(key);
          throw new BadRequestError(
            `Attachment '${filename}' exceeds the ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB limit`,
          );
        }

        ApprovalService.assertExtensionMatchesMime(filename, head.contentType);

        return {
          key,
          filename,
          mimeType: head.contentType,
          size: head.size,
          uploadedAt: new Date(),
        };
      }),
    );
  }

  /**
   * Short-lived presigned GET for one attachment. Authorisation is re-checked
   * here (not just at list time) because the resulting URL is itself the
   * capability — anyone holding it can read the file until it expires.
   */
  static async getAttachmentUrl(approvalId, key, actor) {
    const approval = await Approval.findById(approvalId).lean();
    if (!approval) throw new NotFoundError("Approval request not found");

    ApprovalService.assertCanView(approval, actor);

    const attachment = approval.attachments.find((a) => a.key === key);
    if (!attachment) {
      throw new NotFoundError("Attachment not found on this request");
    }

    const url = await r2.presignDownload({
      key: attachment.key,
      filename: attachment.filename,
    });

    return {
      url,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      expiresIn: APPROVAL_ATTACHMENTS.DOWNLOAD_URL_TTL_SECONDS,
    };
  }

  // ── Authorisation ───────────────────────────────────────────────────────

  /** Directors see everything; everyone else sees only what they created. */
  static assertCanView(approval, actor) {
    if (actor.role === USER_ROLES.DIRECTOR) return;

    const ownerId = approval.createdBy?._id || approval.createdBy;
    if (String(ownerId) !== String(actor.userId || actor.id)) {
      throw new NotFoundError("Approval request not found");
    }
  }

  // ── Reads ───────────────────────────────────────────────────────────────

  static async getApprovals(filters, actor) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { deletedAt: null };

    // Non-directors are scoped to their own requests regardless of what they
    // ask for; a director can opt into the same view with ?mine=true.
    if (actor.role !== USER_ROLES.DIRECTOR || filters.mine) {
      query.createdBy = actor.userId || actor.id;
    }

    if (filters.status) query.status = filters.status;

    if (filters.search) {
      // Escaped so a user searching for "(" doesn't produce an invalid regex.
      const safe = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      // descriptionText, not description: the stored description is HTML, and
      // scanning the markup would match tag names — a search for "li" would
      // hit every request that happens to contain a bulleted list.
      query.$or = [{ title: rx }, { descriptionText: rx }];
    }

    const [data, total] = await Promise.all([
      Approval.find(query)
        .populate(POPULATE)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Approval.countDocuments(query),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages,
        hasNextPage: page < pages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Counts for the stat tiles at the top of the approval screens.
   *
   * One aggregation rather than four counts: the tiles are rendered together
   * and would otherwise fire four round trips that can disagree with each
   * other — a request approved between call two and call three would be
   * counted in neither "pending" nor "approved today".
   *
   * Visibility follows getApprovals() exactly. A director sees the whole
   * organisation's queue; anyone else sees only what they raised, so the
   * numbers always describe the same rows the list below them shows.
   */
  static async getStats(filters, actor) {
    const match = { deletedAt: null };

    if (actor.role !== USER_ROLES.DIRECTOR || filters.mine) {
      match.createdBy = new mongoose.Types.ObjectId(actor.userId || actor.id);
    }

    // Server-local midnight. "Approved today" is a human question about the
    // working day, so it deliberately follows the server's day boundary rather
    // than UTC — the alternative rolls over mid-afternoon in Dhaka.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [result] = await Approval.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", APPROVAL_STATUS.PENDING] }, 1, 0] },
          },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", APPROVAL_STATUS.APPROVED] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", APPROVAL_STATUS.REJECTED] }, 1, 0] },
          },
          approvedToday: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", APPROVAL_STATUS.APPROVED] },
                    { $gte: ["$approvedAt", startOfToday] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // An empty match produces no group at all, not a row of zeroes — and the
    // group carries a null _id that has no business in the API response.
    const { _id, ...counts } = result ?? {};

    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      approvedToday: 0,
      ...counts,
    };
  }

  static async getApprovalById(id, actor) {
    const approval = await Approval.findById(id).populate(POPULATE).lean();
    if (!approval) throw new NotFoundError("Approval request not found");

    ApprovalService.assertCanView(approval, actor);
    return approval;
  }

  // ── Notifications ───────────────────────────────────────────────────────

  /**
   * The directors an accountant may notify.
   *
   * Filtered to accounts that can actually act on a request: a rejected or
   * deactivated director still carries the role on their user document, and
   * mailing them produces a request nobody is ever going to look at.
   */
  static async listDirectors() {
    return User.find({
      role: USER_ROLES.DIRECTOR,
      isActive: true,
      status: "approved",
      ...ApprovalService.excludedRecipientFilter(),
    })
      .select("name email")
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Keeps the excluded accounts out of both the picker and the send.
   *
   * Applied in sendNotifications() as well as listDirectors(), not just the
   * picker: the send re-reads its recipients from the database precisely
   * because it cannot trust the ids the client posted, and filtering only the
   * list it was offered would leave a hand-crafted request able to mail an
   * address the product says is never a recipient.
   *
   * `$nin` on a lowercase list works because the User schema lowercases every
   * email on write.
   */
  static excludedRecipientFilter() {
    if (NOTIFICATION_EXCLUDED_EMAILS.length === 0) return {};
    return { email: { $nin: NOTIFICATION_EXCLUDED_EMAILS } };
  }

  /**
   * Sends one request to a set of directors and records what happened.
   *
   * Never throws on a delivery failure. The request itself is already a fact —
   * just created, or sitting in the queue — and unwinding it because a mail
   * server timed out would destroy work the user cannot cheaply redo (the
   * attachments are already in R2). Failures come back in the return value so
   * the UI can say "2 of 3 notified" rather than claiming a clean send.
   *
   * @returns {{sent: Array, failed: Array, skipped: Array}}
   */
  static async sendNotifications(
    approval,
    directorIds,
    actor,
    { isReminder = false } = {},
  ) {
    const result = { sent: [], failed: [], skipped: [] };

    const unique = [...new Set((directorIds || []).map(String))];
    if (unique.length === 0) return result;

    // Re-read every recipient instead of trusting the ids in the payload. The
    // client picks them from listDirectors(), but this endpoint has to assume
    // it did not — otherwise it becomes a way to mail any user in the system.
    const directors = await User.find({
      _id: { $in: unique },
      role: USER_ROLES.DIRECTOR,
      isActive: true,
      status: "approved",
      ...ApprovalService.excludedRecipientFilter(),
    })
      .select("name email")
      .lean();

    const found = new Set(directors.map((d) => String(d._id)));
    unique
      .filter((id) => !found.has(id))
      .forEach((id) =>
        result.skipped.push({ id, reason: "Not a notifiable director" }),
      );

    if (directors.length === 0) return result;

    if (!mail.isConfigured()) {
      const reason = `Email is not configured on the server. Missing: ${mail
        .missingEnv()
        .join(", ")}`;
      directors.forEach((d) =>
        result.failed.push({ id: String(d._id), name: d.name, error: reason }),
      );
      return result;
    }

    const orgInfo = await SettingsService.getOrgInfo().catch(() => null);
    const sender = { name: actor.name || "An accountant", email: actor.email };

    // Sequential rather than Promise.all: SMTP servers rate-limit concurrent
    // connections from one client, and the recipient list is at most ten.
    for (const director of directors) {
      const { subject, html, text } = approvalRequestEmail({
        approval,
        recipient: director,
        sender,
        orgName: orgInfo?.orgName || "Alliance Française de Chittagong",
        reviewUrl: buildReviewUrl(approval._id),
        isReminder,
      });

      const outcome = await mail.sendMail({
        to: director.email,
        subject,
        html,
        text,
        // So a director can reply straight to the accountant who asked.
        replyTo: sender.email,
      });

      approval.notifications.push({
        recipient: director._id,
        email: director.email,
        sentBy: actor.userId || actor.id,
        sentAt: new Date(),
        delivered: outcome.sent,
        error: outcome.sent ? null : outcome.error,
      });

      if (outcome.sent) {
        result.sent.push({
          id: String(director._id),
          name: director.name,
          email: director.email,
        });
      } else {
        result.failed.push({
          id: String(director._id),
          name: director.name,
          error: outcome.error,
        });
      }
    }

    // Written outside any transaction on purpose: the log of what was mailed
    // has to survive even a partial send, and the mail has already left the
    // building regardless of what happens to this document.
    await Approval.updateOne(
      { _id: approval._id },
      { $set: { notifications: approval.notifications } },
    ).catch((error) =>
      logger.error(
        { err: error, approvalId: approval._id },
        "Notification sent but the delivery log could not be persisted",
      ),
    );

    return result;
  }

  /**
   * The standalone Notify action: chase a director about a request that
   * already exists. Restricted to pending requests — a decided request has
   * nothing left to approve, so a reminder about it is only noise.
   */
  static async notifyDirectors(id, directorIds, actor) {
    const approval = await Approval.findById(id);
    if (!approval) throw new NotFoundError("Approval request not found");

    ApprovalService.assertCanView(approval, actor);

    if (approval.status !== APPROVAL_STATUS.PENDING) {
      throw new BadRequestError(
        `This request has already been ${approval.status} — there is nothing left to approve.`,
      );
    }

    const result = await ApprovalService.sendNotifications(
      approval,
      directorIds,
      actor,
      { isReminder: true },
    );

    if (result.sent.length > 0) {
      await createAuditLog({
        action: "NOTIFY",
        entityType: ENTITY_TYPE,
        entityId: approval._id,
        userId: actor.userId || actor.id,
        userName: actor.name,
        userRole: actor.role,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        description: `Emailed approval request "${approval.title}" to ${result.sent
          .map((r) => r.name)
          .join(", ")}`,
        // Best-effort, unlike the create/decide trails: the mail is already
        // delivered, so a failure to write the log must not surface to the
        // user as a failure to notify.
        rethrow: false,
      });
    }

    return {
      ...result,
      approval: await ApprovalService.getApprovalById(approval._id, actor),
    };
  }

  // ── Writes ──────────────────────────────────────────────────────────────

  static async createApproval(input, actor) {
    const userId = actor.userId || actor.id;

    let attachments;
    try {
      attachments = await ApprovalService.verifyAttachments(
        input.attachments,
        userId,
      );
    } catch (error) {
      // verifyAttachments deletes the specific object it rejected, but the
      // others from the same submit are already sitting in R2 and now belong
      // to nothing — one bad file in a batch of five used to strand the other
      // four in the bucket forever, paid for and unreferenced.
      //
      // The ownership re-check is not redundant here. deleteObjectQuietly
      // removes whatever key it is handed, and this runs on the *unverified*
      // client payload, so without it a crafted request could name another
      // user's attachment and have a validation failure delete it.
      await ApprovalService.discardOrphanedUploads(input.attachments, userId);
      throw error;
    }

    // The description arrives as HTML from the TipTap editor, so the API — not
    // the editor's toolbar — decides what markup is storable. Zod checked the
    // shape and the typed length; this is the single place the tag allowlist
    // is applied, and it runs on every write path into this field.
    const description = sanitizeRichText(input.description);
    const descriptionText = htmlToPlainText(description);

    const session = await mongoose.startSession();
    session.startTransaction();

    let created;
    try {
      const [approval] = await Approval.create(
        [
          {
            title: input.title,
            description,
            descriptionText,
            date: input.date,
            attachments,
            status: APPROVAL_STATUS.PENDING,
            createdBy: userId,
          },
        ],
        { session },
      );

      await createAuditLog({
        action: "CREATE",
        entityType: ENTITY_TYPE,
        entityId: approval._id,
        userId,
        userName: actor.name,
        userRole: actor.role,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        changes: {
          after: {
            title: approval.title,
            date: approval.date,
            attachments: approval.attachments.map((a) => a.filename),
          },
        },
        description: `Created approval request "${approval.title}"`,
        // The trail on an approval request is a product feature, not
        // telemetry (accounting.service.js:1272 makes the same call) — if it
        // cannot be written, the request must not exist either.
        session,
        rethrow: true,
      });

      await session.commitTransaction();
      created = approval;
    } catch (error) {
      await session.abortTransaction();
      // The uploads are already in R2 but now belong to nothing. Clean them up
      // so a failed submit doesn't leave paid-for orphans behind.
      await Promise.all(
        attachments.map((a) => r2.deleteObjectQuietly(a.key)),
      );
      throw error;
    } finally {
      await session.endSession();
    }

    // Deliberately after the commit, and deliberately not inside the
    // transaction: mail is not transactional, so a send that happened cannot
    // be rolled back, and an SMTP timeout must never destroy a request whose
    // attachments are already uploaded. A failed notification is reported to
    // the caller as `notifications.failed`, and the request still stands.
    let notifyResult = null;
    if (input.notifyDirectors?.length) {
      try {
        notifyResult = await ApprovalService.sendNotifications(
          created,
          input.notifyDirectors,
          actor,
        );
      } catch (error) {
        // sendNotifications swallows per-recipient delivery failures, but the
        // work around them — reading the recipients, loading org settings —
        // can still throw. Letting that escape would report the whole submit
        // as failed for a request that is already committed, and the user
        // would re-upload and re-submit a duplicate.
        logger.error(
          { err: error, approvalId: created._id },
          "Approval created, but the notification fan-out failed",
        );
        notifyResult = {
          sent: [],
          skipped: [],
          failed: [
            {
              id: null,
              name: "the selected directors",
              error: "The request was saved, but the notification could not be sent.",
            },
          ],
        };
      }
    }

    const approval = await ApprovalService.getApprovalById(created._id, actor);
    // notifyResult is the outcome of THIS submit's send; approval.notifications
    // is the persisted log, and the spread already carries it.
    return notifyResult ? { ...approval, notifyResult } : approval;
  }

  /**
   * Best-effort cleanup of uploads that will never be referenced.
   *
   * Only ever deletes keys this user could have been issued: the argument is
   * an unverified client payload, and deleteObjectQuietly does not care whose
   * object a key points at.
   */
  static async discardOrphanedUploads(attachmentRefs, userId) {
    const ownedPrefix = `approvals/${userId}/`;

    await Promise.all(
      (attachmentRefs || [])
        .map((a) => a?.key)
        .filter((key) => r2.isOwnedKey(key) && key.startsWith(ownedPrefix))
        .map((key) => r2.deleteObjectQuietly(key)),
    );
  }

  /**
   * Shared by approve/reject and by bulk approve. Expects an already-loaded
   * document and an open session; the caller owns the transaction.
   */
  static async applyDecision(approval, decision, actor, session, extra = {}) {
    const userId = actor.userId || actor.id;
    const before = { status: approval.status };

    if (decision === APPROVAL_STATUS.APPROVED) {
      approval.status = APPROVAL_STATUS.APPROVED;
      approval.approvedBy = userId;
      approval.approvedAt = new Date();
      approval.rejectedBy = null;
      approval.rejectedAt = null;
      approval.rejectionReason = null;
    } else {
      approval.status = APPROVAL_STATUS.REJECTED;
      approval.rejectedBy = userId;
      approval.rejectedAt = new Date();
      approval.rejectionReason = extra.rejectionReason;
      approval.approvedBy = null;
      approval.approvedAt = null;
    }

    await approval.save({ session });

    await createAuditLog({
      action: decision === APPROVAL_STATUS.APPROVED ? "APPROVE" : "REJECT",
      entityType: ENTITY_TYPE,
      entityId: approval._id,
      userId,
      userName: actor.name,
      userRole: actor.role,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      changes: {
        before,
        after: {
          status: approval.status,
          ...(extra.rejectionReason && { rejectionReason: extra.rejectionReason }),
        },
      },
      description:
        decision === APPROVAL_STATUS.APPROVED
          ? `Approved request "${approval.title}"${extra.bulk ? " (bulk)" : ""}`
          : `Rejected request "${approval.title}": ${extra.rejectionReason}`,
      session,
      rethrow: true,
    });

    return approval;
  }

  static async approveApproval(id, actor) {
    const approval = await Approval.findById(id);
    if (!approval) throw new NotFoundError("Approval request not found");

    if (approval.status !== APPROVAL_STATUS.PENDING) {
      throw new BadRequestError(
        `This request has already been ${approval.status}`,
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await ApprovalService.applyDecision(
        approval,
        APPROVAL_STATUS.APPROVED,
        actor,
        session,
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    return ApprovalService.getApprovalById(id, actor);
  }

  static async rejectApproval(id, rejectionReason, actor) {
    const approval = await Approval.findById(id);
    if (!approval) throw new NotFoundError("Approval request not found");

    if (approval.status !== APPROVAL_STATUS.PENDING) {
      throw new BadRequestError(
        `This request has already been ${approval.status}`,
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await ApprovalService.applyDecision(
        approval,
        APPROVAL_STATUS.REJECTED,
        actor,
        session,
        { rejectionReason },
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    return ApprovalService.getApprovalById(id, actor);
  }

  /**
   * Bulk approve, in ONE transaction.
   *
   * Two failure modes are deliberately treated differently:
   *
   *  - Stale rows (already approved/rejected, or deleted, between the screen
   *    rendering and the click) are SKIPPED with a reason and reported back.
   *    Two directors working the same queue is normal, and failing the whole
   *    batch over one row someone else just handled would be maximally
   *    annoying and guaranteed to happen.
   *
   *  - Real errors (a failed save, a failed audit write) ABORT the entire
   *    transaction. Nothing is half-applied, and no approval is ever recorded
   *    without its audit entry.
   */
  static async bulkApprove(ids, actor) {
    // De-duplicate — the same id twice must not produce two audit entries.
    const uniqueIds = [...new Set(ids.map(String))];

    const session = await mongoose.startSession();
    session.startTransaction();

    const approved = [];
    const skipped = [];

    try {
      const approvals = await Approval.find({
        _id: { $in: uniqueIds },
        deletedAt: null,
      }).session(session);

      const byId = new Map(approvals.map((a) => [String(a._id), a]));

      for (const id of uniqueIds) {
        const approval = byId.get(id);

        if (!approval) {
          skipped.push({ id, reason: "Request no longer exists" });
          continue;
        }

        if (approval.status !== APPROVAL_STATUS.PENDING) {
          skipped.push({
            id,
            title: approval.title,
            reason: `Already ${approval.status}`,
          });
          continue;
        }

        await ApprovalService.applyDecision(
          approval,
          APPROVAL_STATUS.APPROVED,
          actor,
          session,
          { bulk: true },
        );

        approved.push({ id, title: approval.title });
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    return {
      approved,
      skipped,
      totalRequested: uniqueIds.length,
      totalApproved: approved.length,
      totalSkipped: skipped.length,
    };
  }

  /**
   * Soft delete. Only the creator, and only while the request is still
   * pending — once a director has ruled on it, the decision is a record and
   * the accountant cannot retract it.
   */
  static async deleteApproval(id, actor) {
    const approval = await Approval.findById(id);
    if (!approval) throw new NotFoundError("Approval request not found");

    const userId = actor.userId || actor.id;
    if (String(approval.createdBy) !== String(userId)) {
      throw new NotFoundError("Approval request not found");
    }

    if (approval.status !== APPROVAL_STATUS.PENDING) {
      throw new BadRequestError(
        `Cannot delete a request that has been ${approval.status}`,
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      approval.deletedAt = new Date();
      await approval.save({ session });

      await createAuditLog({
        action: "DELETE",
        entityType: ENTITY_TYPE,
        entityId: approval._id,
        userId,
        userName: actor.name,
        userRole: actor.role,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        changes: { before: { status: approval.status, deletedAt: null } },
        description: `Deleted approval request "${approval.title}"`,
        session,
        rethrow: true,
      });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    // The R2 objects are intentionally left in place: this is a soft delete,
    // and the attachments are part of the retained record.
    return { id: approval._id };
  }
}

module.exports = ApprovalService;
