import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button, Input, FormField } from "../components/common";
import { passwordAPI } from "../services/apiMethods";
import logo from "/afc-logo.png";

/**
 * The page the emailed reset link opens: `/reset-password?token=…`.
 *
 * Public by necessity — the whole point is that the visitor cannot sign in.
 * The token is the only credential, and it is single-use and hour-limited on
 * the server, so this page does nothing to validate it beyond checking that
 * one is present at all: asking the server "is this token good?" before the
 * new password is typed would burn a request and tell an attacker holding a
 * guessed link whether to keep going.
 */

const MIN_LENGTH = 8;

const resetSchema = z
  .object({
    password: z
      .string()
      .min(MIN_LENGTH, `Password must be at least ${MIN_LENGTH} characters`)
      .max(72, "Password cannot exceed 72 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  });

function PasswordInput({ label, error, register, name, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField label={label} error={error} required>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          className="pr-11"
          {...register(name)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((previous) => !previous)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600">
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </FormField>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [fatalError, setFatalError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    setFatalError("");
    try {
      await passwordAPI.reset(token, values.password);
      setDone(true);
      toast.success("Password updated. You can sign in now.");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Could not reset your password. Please request a new link.";
      // A dead token is terminal for this page — there is nothing to retype,
      // so the form is replaced rather than left sitting there inviting a
      // second attempt that cannot succeed.
      if (/invalid|expired/i.test(message)) setFatalError(message);
      else toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children) => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <img src={logo} alt="Alliance Française de Chittagong" className="h-14 w-auto" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );

  // ── No token at all: the link was truncated or hand-typed ──────────────
  if (!token) {
    return shell(
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertCircle size={22} className="text-red-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Reset link incomplete</h1>
        <p className="mt-2 text-sm text-slate-500">
          This page needs the full link from your email. Copy the whole address,
          or request a new one.
        </p>
        <Link
          to="/login"
          className="mt-5 inline-block text-sm font-semibold text-brand-navy hover:underline">
          Back to sign in
        </Link>
      </div>,
    );
  }

  if (done) {
    return shell(
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 size={22} className="text-emerald-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Password updated</h1>
        <p className="mt-2 text-sm text-slate-500">
          Every other device has been signed out. Use your new password to sign
          in.
        </p>
        <Button className="mt-5" fullWidth onClick={() => navigate("/login", { replace: true })}>
          Go to sign in
        </Button>
      </div>,
    );
  }

  if (fatalError) {
    return shell(
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertCircle size={22} className="text-red-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Link no longer valid</h1>
        <p className="mt-2 text-sm text-slate-500">{fatalError}</p>
        <Link
          to="/login"
          className="mt-5 inline-block text-sm font-semibold text-brand-navy hover:underline">
          Back to sign in
        </Link>
      </div>,
    );
  }

  return shell(
    <>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy-light text-brand-navy">
          <KeyRound size={18} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Choose a new password</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            This link can be used once. At least {MIN_LENGTH} characters.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <PasswordInput
          label="New password"
          name="password"
          register={register}
          error={errors.password?.message}
        />
        <PasswordInput
          label="Confirm new password"
          name="confirmPassword"
          register={register}
          error={errors.confirmPassword?.message}
        />

        <Button type="submit" fullWidth loading={submitting} className="mt-2">
          Set new password
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500">
        <Link to="/login" className="font-semibold text-brand-navy hover:underline">
          Back to sign in
        </Link>
      </p>
    </>,
  );
}
