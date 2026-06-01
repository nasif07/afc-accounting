import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { login } from "../store/slices/authSlice";
import { toast } from "sonner";
import { Mail, Lock, ShieldCheck, Landmark } from "lucide-react";
import { Input, Button } from "../components/common";
import logo from "/afc-logo.jpg";

const authInputClass =
  "pl-10 rounded-sm focus:ring-1 focus:ring-[#002395] focus:border-[#002395] py-2.5 sm:py-2.5";

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (location.state?.pendingApproval) {
      toast.info("Your account is pending Director approval.");
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await dispatch(login(formData)).unwrap();

      if (result.user?.status === "pending") {
        toast.warning("Account pending financial controller approval.");
        return;
      }

      if (result.user?.status !== "approved") {
        toast.error("Your account is not approved for access.");
        return;
      }

      const destination = location.state?.from?.pathname || "/dashboard";
      toast.success("Ledger access granted.");
      navigate(destination, { replace: true });
    } catch (err) {
      toast.error(err || "Login failed. Verify credentials.");
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
            Accounting Portal
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
            Financial Management &amp; Reporting
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                User Identification
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="finance.officer@alliance.org"
                  autoComplete="email"
                  required
                  className={authInputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Secure Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
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
              icon={ShieldCheck}
              className="bg-[#002395]! hover:bg-[#001a6e]! rounded-sm! font-bold! uppercase tracking-widest text-xs! py-3 shadow-md">
              {loading ? "Authenticating..." : "Access Ledger"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center gap-4 text-slate-400 mb-4">
              <div className="flex items-center gap-1">
                <Landmark size={12} />
                <span className="text-[10px] uppercase font-medium">Internal Use Only</span>
              </div>
            </div>
            <p className="text-center text-[10px] text-slate-500 leading-relaxed">
              Protected by Alliance Française Security Protocols.{" "}
              <br />
              New staff?{" "}
              <Link to="/register" className="text-[#ED1C24] font-bold hover:underline">
                Request Financial Access
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
