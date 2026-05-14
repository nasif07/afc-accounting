import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Sidebar from "../components/Sidebar";
import { logoutAsync } from "../store/slices/authSlice";

export default function DashboardLayout() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutAsync());
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        user={user}
        mobileOpen={mobileOpen}
        desktopOpen={desktopOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          desktopOpen ? "lg:ml-64" : "lg:ml-20"
        }`}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Open sidebar"
              type="button">
              <Menu size={20} />
            </button>

            {/* Desktop Collapse Button */}
            <button
              onClick={() => setDesktopOpen((prev) => !prev)}
              className="hidden items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:inline-flex"
              aria-label="Toggle sidebar"
              type="button">
              {desktopOpen ? (
                <PanelLeftClose size={20} />
              ) : (
                <PanelLeftOpen size={20} />
              )}
            </button>

            <h1 className="text-sm font-semibold text-slate-800 sm:text-base">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-sm text-slate-700 sm:block">
              Welcome,{" "}
              <span className="font-semibold">{user?.name || "User"}</span>
            </div>

            <button
              onClick={handleLogout}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              aria-label="Logout">
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
