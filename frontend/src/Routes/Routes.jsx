/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Link } from "react-router";
import { useSelector } from "react-redux";
import ErrorBoundary from "../components/ErrorBoundary";
import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import PublicRoute from "../components/PublicRoute";
import { PageLoader } from "../components/common/Loaders";

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Each page is code-split into its own chunk. Initial bundle drops from ~1.2 MB
// to ~250 KB; remaining pages load on demand as users navigate.
const Login                = lazy(() => import("../pages/Login"));
const Register             = lazy(() => import("../pages/Register"));
const ForgotPassword       = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword        = lazy(() => import("../pages/ResetPassword"));
const Dashboard            = lazy(() => import("../pages/Dashboard"));
const Students             = lazy(() => import("../pages/Students"));
const Employees            = lazy(() => import("../pages/Employees"));
const Payroll              = lazy(() => import("../pages/Payroll"));
const PettyCash            = lazy(() => import("../pages/PettyCash"));
const PettyCashReportPage  = lazy(() => import("../pages/PettyCashReportPage"));
const Accounts             = lazy(() => import("../pages/Accounts"));
const JournalEntries       = lazy(() => import("../pages/JournalEntries"));
const JournalEntryDetails  = lazy(() => import("../pages/JournalEntryDetails"));
const Ledger               = lazy(() => import("../pages/Ledger"));
const BankCash             = lazy(() => import("../pages/BankCash"));
const BankReportPage       = lazy(() => import("../pages/BankReportPage"));
const BankBook             = lazy(() => import("../pages/BankBook"));
const BankReconciliation   = lazy(() => import("../pages/BankReconciliation"));
const Reports              = lazy(() => import("../pages/Reports"));
const Settings             = lazy(() => import("../pages/Settings"));
const DirectorApprovals    = lazy(() => import("../pages/DirectorApprovals"));
const JournalEntryApprovals = lazy(() => import("../pages/JournalEntryApprovals"));
const ApprovalRequests     = lazy(() => import("../pages/ApprovalRequests"));
const ApprovalReview       = lazy(() => import("../pages/ApprovalReview"));

// Redirect from / based on auth state
function RootRedirect() {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  if (loading) return <PageLoader message="Verifying authentication..." />;
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

// Layout wrapper for all authenticated users.
// Note: Layout (DashboardLayout) takes no props and renders its OWN internal
// <Outlet /> — it never reads `children`. A <Suspense> previously wrapped
// around an <Outlet /> passed as children here, which meant it was dead
// code: React never rendered it, so page navigation had no working Suspense
// boundary at all (the real Outlet, inside Layout.jsx, was unwrapped). The
// working boundary now lives in Layout.jsx around the Outlet that's
// actually rendered.
function ProtectedLayoutWrapper() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

// Layout wrapper for director-only pages
function DirectorLayoutWrapper() {
  return (
    <ProtectedRoute requiredRole="director">
      <Layout />
    </ProtectedRoute>
  );
}

function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">404</h1>
        <p className="text-lg text-slate-600 mb-8">Page not found</p>
        {/* Use Link for SPA navigation — avoids a full page reload */}
        <Link
          to="/dashboard"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  { path: "/",         element: <RootRedirect />,      errorElement: <ErrorBoundary /> },
  { path: "/login",    element: <PublicRoute><Suspense fallback={<PageLoader />}><Login /></Suspense></PublicRoute>,    errorElement: <ErrorBoundary /> },
  { path: "/register", element: <PublicRoute><Suspense fallback={<PageLoader />}><Register /></Suspense></PublicRoute>, errorElement: <ErrorBoundary /> },
  { path: "/forgot-password", element: <PublicRoute><Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense></PublicRoute>, errorElement: <ErrorBoundary /> },
  // NOT wrapped in PublicRoute: a signed-in user following a reset link from
  // their inbox must still land on the form, not be bounced to the dashboard.
  { path: "/reset-password", element: <Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>, errorElement: <ErrorBoundary /> },

  {
    path: "/dashboard",
    element: <ProtectedLayoutWrapper />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true,                   element: <Dashboard /> },
      { path: "students",              element: <Students /> },
      { path: "employees",             element: <Employees /> },
      { path: "payroll",               element: <Payroll /> },
      { path: "petty-cash",            element: <PettyCash /> },
      { path: "petty-cash/report",     element: <PettyCashReportPage /> },
      { path: "accounts",              element: <Accounts /> },
      { path: "journal-entries",       element: <JournalEntries /> },
      { path: "journal-entries/:id",   element: <JournalEntryDetails /> },
      { path: "ledger",                element: <Ledger /> },
      { path: "bank-cash",             element: <BankCash /> },
      { path: "bank-cash/report",      element: <BankReportPage /> },
      { path: "bank-book",             element: <BankBook /> },
      { path: "bank-book/reconciliation", element: <BankReconciliation /> },
      { path: "reports",               element: <Reports /> },
      { path: "settings",               element: <Settings /> },

      { path: "approval-requests",     element: <ApprovalRequests /> },
      // { path: "audit-log",             element: <ComingSoon /> },
    ],
  },

  {
    // Director-only section — all children require the director role
    path: "/director",
    element: <DirectorLayoutWrapper />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: "approvals",         element: <DirectorApprovals /> },
      { path: "journal-approvals", element: <JournalEntryApprovals /> },

      { path: "approval-requests", element: <ApprovalReview /> },
    ],
  },

  { path: "*", element: <NotFound /> },
]);

export default router;
