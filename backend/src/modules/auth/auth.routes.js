const express = require("express");
const rateLimit = require("express-rate-limit");
const AuthController = require("./auth.controller");
const validate = require("../../validation/validate");
const {
  forgotPasswordBody,
  resetPasswordBody,
  changePasswordBody,
} = require("../../validation/auth.validation");
const auth = require("../../middleware/auth");
const roleCheck = require("../../middleware/roleCheck");

const router = express.Router();

// Public routes
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

// ── Password reset (public) ───────────────────────────────────────────────
// Two separate budgets, deliberately. Sharing one would mean a user who
// mistypes their new password on the reset form twice is locked out for
// fifteen minutes — punishing the legitimate case for an abuse pattern that
// only applies to the other endpoint.

// Strict: this one sends mail to an address the caller chooses, which makes it
// the only endpoint here that can be turned into a way to spam a third party.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many reset requests. Please try again in 15 minutes.",
  },
});

// Looser: this endpoint sends nothing and guessing a 96-hex-character token is
// not a realistic attack, so the limit is here to stop a runaway client rather
// than to defend the token. It still needs to accommodate a person getting
// their new password wrong a few times.
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
  },
});

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate({ body: forgotPasswordBody }),
  AuthController.forgotPassword,
);

router.post(
  "/reset-password",
  resetPasswordLimiter,
  validate({ body: resetPasswordBody }),
  AuthController.resetPassword,
);
// Unauthenticated on purpose: this is how a session gets re-established
// once the access token has expired. Trust comes from the refresh-token
// cookie, validated inside the controller/service.
router.post("/refresh", AuthController.refresh);

// Protected routes
router.post("/logout", auth, AuthController.logout);
router.post("/logout-all", auth, AuthController.logoutAll);
router.get("/me", auth, AuthController.getCurrentUser);

// Signed-in password change. Requires the current password too — the session
// proves the browser was logged in once, not who is at the keyboard now.
router.patch(
  "/change-password",
  auth,
  validate({ body: changePasswordBody }),
  AuthController.changePassword,
);

// Director-only routes
router.get("/pending", auth, roleCheck.directorOnly, AuthController.getPendingUsers);
router.patch("/approve/:id", auth, roleCheck.directorOnly, AuthController.approveUser);
router.patch("/reject/:id", auth, roleCheck.directorOnly, AuthController.rejectUser);

module.exports = router;
