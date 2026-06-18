import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../store/slices/authSlice";
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

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordMismatch =
    touched.confirmPassword &&
    formData.confirmPassword &&
    formData.password !== formData.confirmPassword;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBlur = (e) => {
    setTouched({ ...touched, [e.target.name]: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    const { confirmPassword, ...payload } = formData;

    try {
      const result = await dispatch(register(payload)).unwrap();

      if (result.user?.status === "pending") {
        toast.success("Request submitted. Awaiting Directorate approval.");
        setTimeout(() => navigate("/login"), 2500);
        return;
      }

      toast.success("Account created successfully.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err || "Registration failed. Please contact IT support.");
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Full Legal Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  className={authInputClass}
                />
              </div>
              {touched.name && !formData.name.trim() && (
                <p className="mt-1 text-[10px] text-red-600">Name is required.</p>
              )}
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
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="finance.officer@alliance.org"
                  autoComplete="email"
                  required
                  className={authInputClass}
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  className={authInputClass}
                />
              </div>
              {formData.password && (
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
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  error={passwordMismatch ? "Passwords do not match." : ""}
                  touched={!!touched.confirmPassword}
                  className={authInputClass}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-3 py-2 text-[11px] font-medium rounded-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={!!passwordMismatch}
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
