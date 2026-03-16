import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  // Show loading state while checking authentication
  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center h-screen bg-gray-100">
  //       <div className="text-center">
  //         <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  //         <p className="mt-4 text-gray-600">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, show the protected component
  return children;
}
