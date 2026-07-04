const mongoose = require("mongoose");

// One document per issued refresh token (not one per user), so a user can
// hold multiple valid sessions (e.g. desktop + laptop) and logout/rotation
// only has to affect the token actually presented, not every session.
const refreshTokenSchema = new mongoose.Schema(
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
    usedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Let MongoDB garbage-collect expired tokens instead of accumulating them
// forever; expireAfterSeconds: 0 means "delete once expiresAt is in the past".
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
