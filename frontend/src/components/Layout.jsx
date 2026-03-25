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
  ShieldCheck, // Added for Approvals
} from "lucide-react";
import { toast } from "sonner";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  // Define the menu items
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Students", path: "/students" },
    { icon: Receipt, label: "Receipts", path: "/receipts" },
    { icon: DollarSign, label: "Expenses", path: "/expenses" },
    { icon: Briefcase, label: "Payroll", path: "/payroll" },
    { icon: Zap, label: "Accounting", path: "/accounting" },
    // --- Added Approvals Route (Role Protected) ---
    { 
      icon: ShieldCheck, 
      label: "Approvals", 
      path: "/approvals",
      roles: ["director", "admin"] // Only these roles can see this
    },
    { icon: FileText, label: "Reports", path: "/reports" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* 1. Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-mahogany-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Alliance</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            // Role-based filtering: Skip item if user doesn't have the required role
            if (item.roles && !item.roles.includes(user?.role)) {
              return null;
            }

            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  active
                    ? "bg-mahogany-50 text-mahogany-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={20} className={active ? "text-mahogany-600" : "text-slate-400"} />
                <span className="text-sm">{item.label}</span>
                
                {/* Visual Indicator for Approvals (Optional badge) */}
                {item.label === "Approvals" && (
                   <span className="ml-auto w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200"
            >
              <div className="w-10 h-10 rounded-full bg-mahogany-600 border-2 border-white flex items-center justify-center shadow-sm text-white font-bold">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.name || "Admin"}</p>
                <p className="text-xs font-medium text-slate-500 truncate capitalize">{user?.role || "Staff"}</p>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-[60] animate-in fade-in slide-in-from-bottom-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-slate-900">
              {menuItems.find((item) => item.path === location.pathname)?.label || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
             <div className="hidden sm:block text-right mr-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</p>
                <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 justify-end">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </p>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 relative">
          <div className="max-w-[1600px] mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;