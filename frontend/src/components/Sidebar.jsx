import { NavLink, useLocation, useNavigate } from "react-router";
import { useMemo, useState, useEffect } from "react";
import { LogOut, ShieldOff, X, ChevronUp  } from "lucide-react";
import { useDispatch } from "react-redux";
import { menuSections } from "../constants/menuSection";
import { logoutAsync, logoutAllAsync } from "../store/slices/authSlice";
import api from "../services/api";
import { queryClient } from "../lib/queryClient";
import logo from "/afc-logo.png";

export default function Sidebar({
  user,
  mobileOpen = false,
  desktopOpen = true,
  onClose = () => {},
}) {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const role = user?.role || "";
  const [showLogout, setShowLogout] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (role !== "director") return;
    api.get("/auth/pending")
      .then((res) => setPendingCount(res.data?.data?.length ?? 0))
      .catch(() => {});
  }, [role]);

  const authorizedSections = useMemo(() => {
    if (!role) return [];
    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(role)),
      }))
      .filter((section) => section.items.length > 0);
  }, [role]);

  const handleLogout = async () => {
    await dispatch(logoutAsync());
    // Redux is wiped by the root reducer on this action, but React Query's
    // cache lives outside Redux entirely — clear it too, or a fast re-login
    // as a different user would still see the previous user's cached data.
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  const handleLogoutAllDevices = async () => {
    if (!window.confirm("Log out of all devices? Every other signed-in session will be ended immediately.")) {
      return;
    }
    await dispatch(logoutAllAsync());
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar panel */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen flex-col bg-brand-navy-dark
          transition-all duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
          lg:translate-x-0 lg:shadow-none
          w-70 sm:w-72
          ${desktopOpen ? "lg:w-64" : "lg:w-20"}
        `}>
        {/* Logo row */}
        <div className="relative flex min-h-15 items-center justify-center border-b border-white/10 px-4 py-3 sm:min-h-17 lg:min-h-18">
          <button
            onClick={onClose}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 active:bg-white/15 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Close sidebar"
            type="button">
            <X size={18} />
          </button>

          {desktopOpen ? (
              <img
                className="h-14 w-auto rounded-sm object-cover"
                src={logo}
                alt="AFC Logo"
              />
          ) : (
            <div className="hidden rounded-md bg-white p-1 lg:block">
              <img
                className="h-7 w-7 rounded-sm object-cover"
                src={logo}
                alt="AFC Logo"
              />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {authorizedSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {desktopOpen && (
                <h3 className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 sm:text-[11px]">
                  {section.title}
                </h3>
              )}

              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`
                      group relative flex items-center gap-3 rounded-xl
                      px-3 py-3 sm:py-2.5
                      text-sm font-medium transition-all duration-150
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                      ${
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white active:bg-white/10"
                      }
                      ${!desktopOpen ? "lg:justify-center lg:px-0" : ""}
                    `}>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-red-600" />
                    )}

                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.4 : 2}
                      className={`shrink-0 ${
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />

                    {desktopOpen && (
                      <span
                        className={`truncate flex-1 ${isActive ? "font-semibold" : ""}`}>
                        {item.title}
                      </span>
                    )}

                    {desktopOpen && item.path === "/director/approvals" && pendingCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                        {pendingCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        {/* User footer */}
        <div className="border-t border-white/10 p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setShowLogout((v) => !v)}
            aria-expanded={showLogout}
            aria-label="Account menu"
            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white/5 p-2.5 text-left transition-all duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${!desktopOpen ? "lg:justify-center" : ""}`}>
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold uppercase text-white sm:h-9 sm:w-9">
              {user?.name?.[0] || "U"}
              <span
                className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-navy-dark transition-colors duration-300 ${showLogout ? "bg-red-400" : "bg-emerald-400"}`}
              />
            </div>
            {desktopOpen && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-xs capitalize text-slate-300">
                  {role ? role.replace("-", " ") : "—"}
                </p>
              </div>
            )}
            {desktopOpen && (
              <span
                className={`text-slate-300 transition-transform duration-300 ${showLogout ? "rotate-180" : "rotate-0"}`}>
                <ChevronUp size={15} />
              </span>
            )}
          </button>

          {/* Slide down logout */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out space-y-1.5 ${
              showLogout
                ? "max-h-40 opacity-100 mt-2"
                : "max-h-0 opacity-0 mt-0"
            }`}>
            <button
              onClick={handleLogout}
              type="button"
              className={`flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${!desktopOpen ? "lg:justify-center" : ""}`}
              aria-label="Logout">
              <LogOut size={16} className="text-red-400" />
              {desktopOpen && <span>Logout</span>}
            </button>
            <button
              onClick={handleLogoutAllDevices}
              type="button"
              className={`flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${!desktopOpen ? "lg:justify-center" : ""}`}
              aria-label="Log out of all devices">
              <ShieldOff size={16} />
              {desktopOpen && <span>Log out of all devices</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
