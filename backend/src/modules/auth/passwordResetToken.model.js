const mongoose = require("mongoose");

/**
 * One document per issued password-reset link.
 *
 * Only the SHA-256 of the token is stored, exactly as refreshToken.model.js
 * does: the raw value exists in the user's inbox and nowhere else, so a dump of
 * this collection hands an attacker nothing usable.
 *
 * Single-use and short-lived by design. A reset link is a full account
 * takeover in one URL — it arrives over email, which is replayable, forwarded
 * and often synced to other devices — so it is consumed on first use and
 * expires within the hour whether used or not.
 */
const passwordResetTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Set the moment the token is redeemed. Checked rather than deleted, so a
    // replayed link can be told apart from one that never existed.
    usedAt: {
      type: Date,
      default: null,
    },
    // Requesting a new link invalidates the outstanding ones, so a user who
    // clicks "send me a link" three times cannot leave two live keys behind.
    invalidatedAt: {
      type: Date,
      default: null,
    },
    // Recorded for the audit trail on a security-sensitive action; never used
    // to make a decision, since both are trivially spoofed.
    requestedFromIp: { type: String, default: null },
    requestedFromUserAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Let MongoDB garbage-collect spent tokens rather than accumulating them
// forever; expireAfterSeconds: 0 means "delete once expiresAt is in the past".
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PasswordResetToken", passwordResetTokenSchema);
