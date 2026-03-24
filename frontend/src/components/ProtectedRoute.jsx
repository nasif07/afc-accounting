import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, loading, isPending } = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth.user);

  // SHOW LOADING STATE
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // REDIRECT IF NOT AUTHENTICATED
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // BLOCK IF PENDING APPROVAL
  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Account Pending Approval</h2>
          <p className="text-gray-600 mb-6">
            Your account is awaiting Director approval. You will receive an email once approved.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('authToken');
              window.location.href = '/login';
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // CHECK ROLE-BASED ACCESS
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
          <p className="text-gray-600">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
