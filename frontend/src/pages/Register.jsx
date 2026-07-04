import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { register as registerUser } from "../store/slices/authSlice";
import { toast } from "sonner";
import { User, Mail, Lock, ClipboardCheck } from "lucide-react";
import { Input, Button } from "../components/common";
import logo from "/afc-logo.jpg";

const MIN_PASSWORD_LENGTH = 8;

const authInputClass =
  "pl-10 rounded-sm! focus:ring-1! focus:ring-[#002395]! focus:border-[#002395]! py-2.5 sm:py-2.5";

function getPasswordStrength(password) {
  if (!password) return null;
  if (password.length < MIN_PASSWORD_LENGTH)
    return { level: "weak", label: "Too short", color: "bg-red-400" };
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (score === 3) return { level: "strong", label: "Strong", color: "bg-emerald-500" };
  if (score >= 1) return { level: "medium", label: "Medium", color: "bg-amber-400" };
  return { level: "weak", label: "Weak", color: "bg-red-400" };
}

// ── Zod validation schema ────────────────────────────────────────────────────
// Backend has no dedicated register validation schema — auth.controller.js
// only checks "all fields present" and "password >= 8 chars" with generic
// messages, so this schema mirrors those exact rules (plus the frontend-only
// confirmPassword match, which is never sent to the server).
const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const EMPTY_VALUES = { name: "", email: "", password: "", confirmPassword: "" };

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: EMPTY_VALUES,
    mode: "onBlur",
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const passwordStrength = getPasswordStrength(password);
  // Purely a proactive UX nicety (disable submit before the user even tries) —
  // the zod .refine() above is what actually blocks/reports the mismatch.
  const passwordMismatch = Boolean(confirmPassword) && password !== confirmPassword;

  const onSubmit = async (data) => {
    const { confirmPassword: _confirmPassword, ...payload } = data;

    try {
      const result = await dispatch(registerUser(payload)).unwrap();

      if (result.user?.status === "pending") {
        toast.success("Request submitted. Awaiting Directorate approval.");
        setTimeout(() => navigate("/login", { state: { pendingApproval: true } }), 2500);
        return;
      }

      toast.success("Account created successfully.");
      navigate("/dashboard");
    } catch (err) {
      // Backend validation failures (errorMiddleware.js) come back as
      // errors: [{ field, message }] — map each to its form field. Register
      // itself never actually emits these today (its failures — missing
      // fields, short password, duplicate email — are intentionally generic
      // messages), but this keeps the same pattern as every other converted
      // form in case that ever changes.
      const fieldErrors = err?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        fieldErrors.forEach(({ field, message }) => {
          if (field) setError(field, { type: "server", message });
        });
      } else {
        toast.error(err?.message || "Registration failed. Please contact IT support.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center p-4">
      <div className="fixed top-0 left-0 w-full h-1 flex z-50">
        <div className="w-1/3 bg-[#002395]"></div>
        <div className="w-1/3 bg-white"></div>
        <div className="w-1/3 bg-[#ED1C24]"></div>
      </div>

      <div className="bg-white rounded-sm border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
        <div className="border-b border-slate-100 p-8 text-center">
          <img src={logo} alt="Alliance Française" className="h-16 md:h-24 w-auto mx-auto mb-4" />
          <h1 className="text-lg font-serif font-bold text-[#002395] tracking-widest uppercase">
            Access Request
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
            Accounting System Enrollment
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Full Legal Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                <Input
                  type="text"
                  placeholder="Name"
                  autoComplete="name"
                  maxLength={100}
                  className={authInputClass}
                  error={errors.name?.message}
                  touched={!!errors.name}
                  {...register("name")}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Professional Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                <Input
                  type="email"
                  placeholder="finance.officer@alliance.org"
                  autoComplete="email"
                  className={authInputClass}
                  error={errors.email?.message}
                  touched={!!errors.email}
                  {...register("email")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Set Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                <Input
                  type="password"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className={authInputClass}
                  error={errors.password?.message}
                  touched={!!errors.password}
                  {...register("password")}
                />
              </div>
              {password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1">
                    {["weak", "medium", "strong"].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          passwordStrength &&
                          ["weak", "medium", "strong"].indexOf(passwordStrength.level) >=
                            ["weak", "medium", "strong"].indexOf(level)
                            ? passwordStrength.color
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p
                    className={`text-[10px] font-medium ${
                      passwordStrength?.level === "strong"
                        ? "text-emerald-600"
                        : passwordStrength?.level === "medium"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}>
                    {passwordStrength?.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={authInputClass}
                  error={errors.confirmPassword?.message}
                  touched={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={passwordMismatch}
              icon={ClipboardCheck}
              className="bg-brand-blue! hover:bg-[#001a6e]! rounded-sm! font-bold! uppercase tracking-widest text-xs! py-3! shadow-md">
              {loading ? "Processing..." : "Submit Access Request"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-tight">
              All accounts require Directorate verification.{" "}
              <br />
              Already have credentials?{" "}
              <Link to="/login" className="text-[#ED1C24] font-bold hover:underline">
                Portal Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
