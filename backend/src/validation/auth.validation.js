const { z } = require("zod");

// Matches the User schema's own minimum, so the form, the API and the model
// cannot disagree about what a valid password is.
const MIN_PASSWORD_LENGTH = 8;

const password = (label = "Password") =>
  z
    .string()
    .min(MIN_PASSWORD_LENGTH, `${label} must be at least ${MIN_PASSWORD_LENGTH} characters`)
    // Bcrypt silently truncates at 72 bytes, so anything longer gives the user
    // a false sense of strength and would let two different passwords match.
    .max(72, `${label} cannot exceed 72 characters`);

const forgotPasswordBody = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

const resetPasswordBody = z.object({
  // 48 random bytes, hex-encoded by auth.service.js. Length-checked here so a
  // malformed link is rejected before it costs a database lookup.
  token: z
    .string()
    .trim()
    .regex(/^[0-9a-f]{96}$/, "This reset link is invalid or has expired. Please request a new one."),
  password: password("New password"),
});

const changePasswordBody = z
  .object({
    // Deliberately NOT length-validated: this is checked against the stored
    // hash, and rejecting it on length would tell the caller something about
    // the existing password before verifying anything.
    currentPassword: z.string().min(1, "Your current password is required"),
    newPassword: password("New password"),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Your new password must be different from the current one",
    path: ["newPassword"],
  });

module.exports = {
  forgotPasswordBody,
  resetPasswordBody,
  changePasswordBody,
  MIN_PASSWORD_LENGTH,
};
