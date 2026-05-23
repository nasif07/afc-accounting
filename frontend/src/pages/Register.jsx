import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../store/slices/authSlice";
import toast from "react-hot-toast";
import { User, Mail, Lock, ClipboardCheck } from "lucide-react";
import { ButtonLoader } from "../components/common/Loaders";
import logo from "/afc-logo.jpg";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      const result = await dispatch(register(formData)).unwrap();

      // Alliance Française specific approval workflow
      if (result.user?.status === "pending") {
        toast.success("Request submitted. Awaiting Directorate approval.");
        setTimeout(() => {
          navigate("/login");
        }, 2500);
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
      {/* Institutional Tricolore Header */}
      <div className="fixed top-0 left-0 w-full h-1 flex z-50">
        <div className="w-1/3 bg-[#002395]"></div>
        <div className="w-1/3 bg-white"></div>
        <div className="w-1/3 bg-[#ED1C24]"></div>
      </div>

      <div className="bg-white rounded-sm border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
        {/* Branding Section */}
        <div className="border-b border-slate-100 p-8 text-center">
          <img
            src={logo}
            alt="Alliance Française"
            className="h-16 md:h-24 w-auto mx-auto mb-4"
          />
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
                <User
                  className="absolute left-3 top-3 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Name"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-sm focus:ring-1 focus:ring-[#002395] focus:border-[#002395] outline-none transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Professional Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-3 text-slate-400"
                  size={16}
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="finance.officer@alliance.org"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-sm focus:ring-1 focus:ring-[#002395] focus:border-[#002395] outline-none transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Set Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-3 text-slate-400"
                  size={16}
                />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-sm focus:ring-1 focus:ring-[#002395] focus:border-[#002395] outline-none transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-3 text-slate-400"
                  size={16}
                />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-sm focus:ring-1 focus:ring-[#002395] focus:border-[#002395] outline-none transition-all text-sm"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-3 py-2 text-[11px] font-medium rounded-sm">
                System Alert: {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#002395] hover:bg-[#001a6e] text-white font-bold py-3 px-4 rounded-sm transition-all flex items-center justify-center gap-2 shadow-md active:transform active:scale-[0.99] disabled:opacity-70">
              {loading ? (
                <ButtonLoader />
              ) : (
                <ClipboardCheck size={18} />
              )}
              <span className="uppercase tracking-widest text-xs">
                {loading ? "Processing..." : "Submit Access Request"}
              </span>
            </button>
          </form>

          {/* Institutional Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-tight">
              All accounts require Directorate verification. <br />
              Already have credentials?{" "}
              <Link
                to="/login"
                className="text-[#ED1C24] font-bold hover:underline">
                Portal Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
