import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import ErrorBoundary from "../components/ErrorBoundary";
import Layout from "../components/Layout";
import LoadingSpinner from "../components/LoadingSpinner";
import ProtectedRoute from "../components/ProtectedRoute";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Students from "../pages/Students";
import Receipts from "../pages/Receipts";
import Expenses from "../pages/Expenses";
import Payroll from "../pages/Payroll";
import Accounting from "../pages/Accounting";
import Accounts from "../pages/Accounts";
import JournalEntries from "../pages/JournalEntries";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import DirectorApprovals from "../pages/DirectorApprovals";

/**
 * RootRedirect: Handles root path redirection based on auth state
 * - Authenticated users → /dashboard
 * - Unauthenticated users → /login
 */
function RootRedirect() {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) {
    return <LoadingSpinner message="Verifying authentication..." />;
  }

  return (
    <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
  );
}

/**
 * ProtectedLayoutWrapper: Wraps Layout with ProtectedRoute for all protected pages
 * Uses Outlet to render child routes inside Layout
 */
function ProtectedLayoutWrapper() {
  return (
    <ProtectedRoute>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
}

/**
 * DirectorLayoutWrapper: Wraps Layout with director-only ProtectedRoute
 * Used for director-specific pages like approvals
 */
function DirectorLayoutWrapper() {
  return (
    <ProtectedRoute requiredRole="director">
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
}

/**
 * Placeholder component for pages not yet implemented
 */
function ComingSoon() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Coming Soon</h2>
        <p className="text-slate-600">This feature is under development</p>
      </div>
    </div>
  );
}

/**
 * Router configuration using createBrowserRouter
 * 
 * Structure:
 * - Root redirect (/)
 * - Public routes (/login, /register)
 * - Protected routes under /dashboard with nested children
 * - Director-only routes under /director with nested children
 */
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login",
    element: <Login />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/register",
    element: <Register />,
    errorElement: <ErrorBoundary />,
  },
  {
    // Protected routes - all authenticated users
    path: "/dashboard",
    element: <ProtectedLayoutWrapper />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true, // Default route for /dashboard
        element: <Dashboard />,
      },
      {
        path: "students",
        element: <Students />,
      },
      {
        path: "receipts",
        element: <Receipts />,
      },
      {
        path: "expenses",
        element: <Expenses />,
      },
      {
        path: "payroll",
        element: <Payroll />,
      },
      {
        path: "accounting",
        element: <Accounting />,
      },
      {
        path: "accounts",
        element: <Accounts />,
      },
      {
        path: "journal-entries",
        element: <JournalEntries />,
      },
      {
        path: "ledger",
        element: <ComingSoon />,
      },
      {
        path: "bank-cash",
        element: <ComingSoon />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "users",
        element: <ComingSoon />,
      },
      {
        path: "audit-log",
        element: <ComingSoon />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
    ],
  },
  {
    // Director-only routes
    path: "/director",
    element: <DirectorLayoutWrapper />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: "approvals",
        element: <DirectorApprovals />,
      },
    ],
  },
  {
    // Catch-all for undefined routes
    path: "*",
    element: (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">404</h1>
          <p className="text-lg text-slate-600 mb-8">Page not found</p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    ),
  },
]);

export default router;
