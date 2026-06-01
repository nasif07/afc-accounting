import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { PageLoader } from "./common/Loaders";

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, loading, isPending, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (loading) {
    return <PageLoader message="Verifying authentication..." className="min-h-screen" />;
  }

  if (!isAuthenticated) {
    // Preserve the attempted URL so Login can redirect back after success
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Pending users: redirect to login and let it show the pending message
  if (isPending) {
    return <Navigate to="/login" state={{ pendingApproval: true }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-md">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500">
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
