import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutAsync } from '../store/slices/authSlice';
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import Button from './ui/Button';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/students', label: 'Students', icon: Users },
  { path: '/receipts', label: 'Receipts', icon: DollarSign },
  { path: '/expenses', label: 'Expenses', icon: TrendingUp },
  { path: '/accounting', label: 'Accounting', icon: FileText },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/payroll', label: 'Payroll', icon: DollarSign },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function PremiumLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const currentPath = window.location.pathname;

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync());
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-neutral-200 transition-all duration-300 flex flex-col shadow-sm`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-mahogany-700">Alliance</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-mahogany-50 text-mahogany-700 border-l-4 border-mahogany-700'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
                title={!sidebarOpen ? item.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-neutral-200 p-3">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-mahogany-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-mahogany-700">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              {sidebarOpen && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-neutral-600 truncate capitalize">
                      {user?.role || 'user'}
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
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-8 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              {navItems.find((item) => item.path === currentPath)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-neutral-600 hover:text-neutral-900"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="container-premium">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
