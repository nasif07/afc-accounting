import { NavLink, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { menuSections } from "../constants/menuSection";

export default function Sidebar({ user, isOpen = true }) {
  const location = useLocation();
  const role = user?.role || "sub-accountant";

  // Filter menu items based on role
  const authorizedSections = useMemo(() => {
    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(role)),
      }))
      .filter((section) => section.items.length > 0);
  }, [role]);

  return (
    <aside
      className={`bg-white border-r border-gray-100 h-screen sticky top-0 transition-all duration-200 ${
        isOpen ? "w-64" : "w-20"
      }`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }} // Force a clean font
    >
      {/* 1. Simple Header: Just the Brand */}
      <div className="h-16 flex items-center px-6 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#DA002E] rounded flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">af</span>
          </div>
          {isOpen && (
            <span className="font-bold text-gray-800 tracking-tight text-sm uppercase">
              Accounting <span className="text-gray-400 font-medium text-[10px] align-top ml-1">v1.0</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Navigation: High Contrast & Simple */}
      <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
        {authorizedSections.map((section) => (
          <div key={section.title}>
            {isOpen && (
              <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {section.title}
              </p>
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    } ${!isOpen ? "justify-center" : ""}`}
                  >
                    <Icon 
                      size={18} 
                      className={isActive ? "text-[#DA002E]" : "text-gray-400"} 
                    />
                    {isOpen && (
                      <span className={`text-[13px] ${isActive ? "font-semibold" : "font-medium"}`}>
                        {item.title}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 3. Footer: Basic Identity */}
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-50">
        <div className={`flex items-center gap-3 ${!isOpen ? "justify-center" : ""}`}>
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 uppercase">
            {user?.name?.[0] || 'A'}
          </div>
          {isOpen && (
            <div className="leading-tight">
              <p className="text-[12px] font-bold text-gray-800 truncate">{user?.name || "Accountant"}</p>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">{role}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}