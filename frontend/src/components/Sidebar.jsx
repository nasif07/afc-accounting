import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { LogOut, X, ChevronUp  } from "lucide-react";
import { useDispatch } from "react-redux";
import { menuSections } from "../constants/menuSection";
import { logoutAsync } from "../store/slices/authSlice";
import logo from "/afc-logo.jpg";

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
          fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200 bg-white
          transition-all duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
          lg:translate-x-0 lg:shadow-none
          w-70 sm:w-72
          ${desktopOpen ? "lg:w-64" : "lg:w-20"}
        `}>
        {/* Logo row */}
        <div className="relative flex min-h-15 items-center justify-center border-b border-slate-200 px-4 py-3 sm:min-h-17 lg:min-h-18">
          <button
            onClick={onClose}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200 lg:hidden"
            aria-label="Close sidebar"
            type="button">
            <X size={18} />
          </button>

          {desktopOpen ? (
            <img
              className="h-auto w-24 object-contain sm:w-28"
              src={logo}
              alt="AFC Logo"
            />
          ) : (
            <img
              className="hidden h-9 w-9 rounded-md object-cover lg:block"
              src={logo}
              alt="AFC Logo"
            />
          )}
        </div>

        {/* Nav */}
        <nav className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {authorizedSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {desktopOpen && (
                <h3 className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 sm:text-[11px]">
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
                      ${
                        isActive
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
                      }
                      ${!desktopOpen ? "lg:justify-center lg:px-0" : ""}
                    `}>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#DA002E]" />
                    )}

                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.4 : 2}
                      className={`shrink-0 ${
                        isActive
                          ? "text-slate-900"
                          : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />

                    {desktopOpen && (
                      <span
                        className={`truncate ${isActive ? "font-semibold" : ""}`}>
                        {item.title}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        {/* User footer */}
        <div className="border-t border-red-100 p-3 sm:p-4">
          <div
            onClick={() => setShowLogout((v) => !v)}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-2.5 transition-all duration-200 hover:border-red-200 hover:bg-red-100 ${!desktopOpen ? "lg:justify-center" : ""}`}>
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A32D2D] text-xs font-bold uppercase text-white sm:h-9 sm:w-9">
              {user?.name?.[0] || "U"}
              <span
                className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white transition-colors duration-300 ${showLogout ? "bg-[#A32D2D]" : "bg-emerald-400"}`}
              />
            </div>
            {desktopOpen && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#501313]">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-xs capitalize text-[#993556]">
                  {role ? role.replace("-", " ") : "—"}
                </p>
              </div>
            )}
            {desktopOpen && (
              <span
                className={`text-[#A32D2D] transition-transform duration-300 ${showLogout ? "rotate-180" : "rotate-0"}`}>
                <ChevronUp size={15} />
              </span>
            )}
          </div>

          {/* Slide down logout */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showLogout
                ? "max-h-20 opacity-100 mt-2"
                : "max-h-0 opacity-0 mt-0"
            }`}>
            <button
              onClick={handleLogout}
              type="button"
              className={`flex w-full items-center gap-3 rounded-xl border border-red-100 bg-white px-3 py-2.5 text-sm font-semibold text-[#A32D2D] shadow-sm transition-all hover:bg-red-50 hover:border-red-200 hover:shadow-none active:bg-red-100 ${!desktopOpen ? "lg:justify-center" : ""}`}
              aria-label="Logout">
              <LogOut size={16} />
              {desktopOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
