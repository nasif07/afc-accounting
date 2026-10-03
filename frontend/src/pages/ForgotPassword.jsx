import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { toast } from "sonner";
import { Mail, MailCheck } from "lucide-react";
import { Button, Input, FormField } from "../components/common";
import { passwordAPI } from "../services/apiMethods";
import logo from "/afc-logo.png";

/**
 * "Email me a reset link" for someone who cannot sign in.
 *
 * The confirmation is deliberately identical whether or not the address has an
 * account — the server answers the same way for the same reason, and a UI that
 * said "no account with that email" would hand back exactly the information
 * the API is careful not to give. It also means this page never needs to know
 * the outcome, so there is no error state to design beyond the network failing.
 */

const forgotSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  const onSubmit = async (values) => {
    try {
      await passwordAPI.forgot(values.email);
      setSentTo(values.email);
    } catch (error) {
      // Only reachable when the request itself failed (offline, rate limited).
      // A real "no such user" never lands here — the API returns 200 for it.
      toast.error(
        error.response?.data?.message ||
          "Could not send the reset link. Please try again shortly.",
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <img src={logo} alt="Alliance Française de Chittagong" className="h-14 w-auto" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {sentTo ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <MailCheck size={22} className="text-emerald-600" />
              </div>
              <h1 className="text-lg font-bold text-slate-900">Check your email</h1>
              <p className="mt-2 text-sm text-slate-500">
                If <span className="font-semibold text-slate-700">{sentTo}</span>{" "}
                has an account, a single-use reset link is on its way. It expires
                in 60 minutes.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Nothing after a few minutes? Check your spam folder — it is an
                automated message.
              </p>

              <Button
                variant="outline"
                fullWidth
                className="mt-5"
                loading={isSubmitting}
                onClick={() => onSubmit({ email: getValues("email") })}>
                Send another link
              </Button>

              <Link
                to="/login"
                className="mt-4 inline-block text-sm font-semibold text-brand-navy hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy-light text-brand-navy">
                  <Mail size={18} aria-hidden="true" />
                </span>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Forgot your password?</h1>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Enter your email and we will send you a link to choose a new
                    one.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
                <FormField label="Email" error={errors.email?.message} required>
                  <Input
                    type="email"
                    autoComplete="username"
                    placeholder="you@af-chittagong.org"
                    {...register("email")}
                  />
                </FormField>

                <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
                  Send reset link
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-slate-500">
                Remembered it?{" "}
                <Link to="/login" className="font-semibold text-brand-navy hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
