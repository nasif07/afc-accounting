import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { logout, logoutAsync } from "../store/slices/authSlice";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Users,
  Receipt,
  DollarSign,
  Briefcase,
  Zap,
  FileText,
  Settings,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Students", path: "/students" },
    { icon: Receipt, label: "Receipts", path: "/receipts" },
    { icon: DollarSign, label: "Expenses", path: "/expenses" },
    { icon: Briefcase, label: "Payroll", path: "/payroll" },
    { icon: Zap, label: "Accounting", path: "/accounting" },
    { icon: FileText, label: "Reports", path: "/reports" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      navigate("/login");
      toast.success("Logged out successfully");
    } catch (error) {
      dispatch(logout());
      navigate("/login");
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile Responsive */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-neutral-200 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col shadow-sm lg:shadow-none`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-neutral-200">
          {sidebarOpen && (
            <h1 className="text-lg md:text-xl font-bold text-mahogany-700">Alliance</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-neutral-600 hover:text-neutral-900 transition-colors lg:hidden"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 md:px-3 py-4 md:py-6 space-y-1 md:space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all duration-200 text-sm md:text-base ${
                  isActive(item.path)
                    ? "bg-mahogany-50 text-mahogany-700 border-l-4 border-mahogany-700"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
                title={!sidebarOpen ? item.label : ""}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-neutral-200 p-2 md:p-3">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-mahogany-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-mahogany-700">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              {sidebarOpen && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-neutral-600 truncate capitalize">
                      {user?.role || "user"}
                    </p>
                  </div>
                  <ChevronDown size={16} />
                </>
              )}
            </button>

            {/* User Menu Dropdown */}
            {userMenuOpen && sidebarOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-neutral-200 rounded-lg shadow-lg py-2 z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - Mobile Responsive */}
        <header className="h-14 md:h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 md:px-8 shadow-sm">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-neutral-900">
              {menuItems.find((item) => item.path === location.pathname)?.label ||
                "Dashboard"}
            </h2>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-neutral-600 hover:text-neutral-900"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Page Content - Mobile Responsive */}
        <main className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

Layout.displayName = "Layout";

export default Layout;
