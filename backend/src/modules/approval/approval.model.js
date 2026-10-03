const mongoose = require("mongoose");
const { APPROVAL_STATUS } = require("../../config/constants");

/**
 * A general approval request: a document (or set of documents) an accountant
 * submits for a director to sign off on.
 *
 * Deliberately NOT a journal entry — it posts nothing to the ledger, carries no
 * amount, and has no accounting side effects. It is a standalone document
 * workflow that happens to be operated by the same two roles.
 */

const attachmentSchema = new mongoose.Schema(
  {
    // The R2 object key is the durable identity of the file. No URL is stored:
    // the bucket is private and every read mints a short-lived presigned GET
    // (see r2.service.js), so a persisted URL would be stale within minutes and
    // would leak a bearer-style link into the database if it weren't.
    key: {
      type: String,
      required: true,
      trim: true,
    },
    // Original upload name — display only, never used to build a path.
    filename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    // Both of these are re-read from R2 via HeadObject before the parent
    // document is saved; they are never trusted from the client payload.
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 1,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const approvalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    // Rich text (HTML) produced by the TipTap editor. Always written through
    // sanitizeRichText() in the service — the model stores markup, so nothing
    // may reach it that has not been through the tag allowlist first.
    //
    // The 2,000-character product rule is enforced against descriptionText,
    // not this field: formatting is not something the author "typed", and a
    // bulleted list can carry several times its own text in markup. The cap
    // here is a storage backstop, sized so the heaviest plausible markup
    // expansion of 2,000 typed characters still fits.
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [20000, "Description is too long"],
    },

    // Plain-text projection of `description`, derived on every write.
    //
    // Denormalised deliberately: the list search is a regex scan, and running
    // it against the HTML would match tag and attribute names — a search for
    // "li" would return every request containing a bulleted list. Deriving it
    // once on write is also what keeps table previews and the text/plain part
    // of notification emails from re-parsing HTML on every read.
    descriptionText: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        // At least one attachment is the whole point of the workflow — a
        // request with no supporting document is a note, not something a
        // director can meaningfully approve.
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one attachment is required",
      },
    },

    status: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [1000, "Rejection reason cannot exceed 1000 characters"],
      default: null,
    },

    // Every director this request was emailed to, appended once per send.
    //
    // A log rather than a flag: the accountant needs to see whether a reminder
    // has already gone out, and to whom, before sending another — information
    // a boolean loses the moment a second director is added. Delivery is
    // recorded per recipient because SMTP fails per recipient: one send to
    // three directors can leave two informed and one not.
    notifications: {
      type: [
        new mongoose.Schema(
          {
            recipient: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            // Snapshotted rather than looked up on read: this records where the
            // mail actually went, which stays true even if the director later
            // changes their address or is deactivated.
            email: { type: String, required: true, trim: true },
            sentBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            sentAt: { type: Date, default: Date.now },
            // False when SMTP rejected this recipient; `error` carries why, so
            // the UI can explain a partial send instead of silently claiming
            // everyone was reached.
            delivered: { type: Boolean, default: false },
            error: { type: String, default: null },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    // Soft delete, matching the house pattern in accounting.model.js,
    // bank.model.js, coa.model.js and payroll.model.js: approval requests are
    // record-bearing (a director's decision is an auditable fact), so rows are
    // retired rather than removed.
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

// Mirrors accounting.model.js:385 — every find*() excludes soft-deleted rows
// unless a caller explicitly overrides deletedAt in its own filter.
approvalSchema.pre(/^find/, function (next) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// Serves the director review screen (status=pending, newest first) and the
// accountant's own list, both of which sort by date descending.
approvalSchema.index({ status: 1, deletedAt: 1, date: -1 });
approvalSchema.index({ createdBy: 1, deletedAt: 1, date: -1 });

module.exports = mongoose.model("Approval", approvalSchema);
