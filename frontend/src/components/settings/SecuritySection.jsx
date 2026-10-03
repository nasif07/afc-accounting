import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { KeyRound, Mail, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button, Input, FormField } from "../common";
import { passwordAPI } from "../../services/apiMethods";
import { queryClient } from "../../lib/queryClient";

/**
 * Password management on the Settings page: change it, or have a reset link
 * emailed.
 *
 * Kept out of the settings form entirely. That form is a single PUT of
 * organisation preferences that a director saves when they are done editing;
 * a password change is an immediate, irreversible security action that ends
 * every other session. Folding it in would mean "Save" sometimes logs you out.
 */

// Mirrors auth.validation.js on the server. 72 is bcrypt's own limit — beyond
// it the input is silently truncated, so two different passwords would match.
const MIN_LENGTH = 8;

const changeSchema = z
  .object({
    currentPassword: z.string().min(1, "Your current password is required"),
    newPassword: z
      .string()
      .min(MIN_LENGTH, `Password must be at least ${MIN_LENGTH} characters`)
      .max(72, "Password cannot exceed 72 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Your new password must be different from the current one",
    path: ["newPassword"],
  });

/** Password input with a show/hide toggle. */
function PasswordInput({ label, error, register, name, autoComplete, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField label={label} error={error} required>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className="pr-11"
          {...register(name)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((previous) => !previous)}
          // Not focusable in the tab order: it is a convenience for a mouse,
          // and sitting between the fields would put it in the middle of the
          // keyboard path through the form.
          tabIndex={-1}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600">
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </FormField>
  );
}

export default function SecuritySection({ userEmail }) {
  const navigate = useNavigate();
  const [changing, setChanging] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changeSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onChangePassword = async (values) => {
    setChanging(true);
    try {
      await passwordAPI.change({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      reset();
      // The server revoked every refresh token and cleared this browser's
      // cookies, so there is no session left to keep. Clearing the query cache
      // matters too: it still holds the previous session's data.
      queryClient.clear();
      toast.success("Password changed. Please sign in again.");
      navigate("/login", { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message || "Could not change your password";

      // "Your current password is incorrect" belongs on the field it is about,
      // not in a toast that disappears while the user is still looking at it.
      if (/current password/i.test(message)) {
        setError("currentPassword", { type: "server", message });
      } else {
        toast.error(message);
      }
    } finally {
      setChanging(false);
    }
  };

  const onEmailResetLink = async () => {
    if (!userEmail) return;
    setSendingLink(true);
    try {
      await passwordAPI.forgot(userEmail);
      setLinkSent(true);
      toast.success("If that address has an account, a reset link is on its way.");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not send the reset link. Please try again.",
      );
    } finally {
      setSendingLink(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Change password ── */}
      <section>
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy-light text-brand-navy">
            <KeyRound size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              You will be signed out of this and every other device.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onChangePassword)}
          className="max-w-md space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          {/* Tells a password manager which account these fields belong to,
              so it offers to update the right entry rather than creating one. */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={userEmail || ""}
            readOnly
            hidden
          />

          <PasswordInput
            label="Current password"
            name="currentPassword"
            autoComplete="current-password"
            register={register}
            error={errors.currentPassword?.message}
          />
          <PasswordInput
            label="New password"
            name="newPassword"
            autoComplete="new-password"
            register={register}
            error={errors.newPassword?.message}
          />
          <PasswordInput
            label="Confirm new password"
            name="confirmPassword"
            autoComplete="new-password"
            register={register}
            error={errors.confirmPassword?.message}
          />

          <p className="text-xs text-slate-500">
            At least {MIN_LENGTH} characters.
          </p>

          <Button type="submit" loading={changing} icon={ShieldCheck}>
            Change Password
          </Button>
        </form>
      </section>

      {/* ── Forgot password ── */}
      <section>
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Mail size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Forgot Password</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Cannot remember your current password? Have a reset link emailed
              instead.
            </p>
          </div>
        </div>

        <div className="max-w-md rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs text-slate-600">
            A single-use link will be sent to{" "}
            <span className="font-semibold text-slate-800">{userEmail}</span>.
            It expires in 60 minutes.
          </p>

          <Button
            type="button"
            variant="outline"
            icon={Mail}
            loading={sendingLink}
            onClick={onEmailResetLink}
            className="mt-3">
            {linkSent ? "Send another link" : "Email me a reset link"}
          </Button>

          {linkSent && (
            <p className="mt-2 text-xs text-emerald-700">
              Sent. Check your inbox — and your spam folder, since it is an
              automated message.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
