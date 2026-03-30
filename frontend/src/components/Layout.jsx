import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { useDispatch,useSelector } from "react-redux";
import Sidebar from "../components/Sidebar";
import { getCurrentUser } from "../store/slices/authSlice";
import { useEffect } from "react";
// import { getCurrentUser } from "./store/slices/authSlice";
// import { useDispatch, useSelector } from "react-redux";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useSelector((state) => state.auth);
  // const dispatch = useDispatch();
  // // Destructure 'loading' (or 'status') from your Redux state
  // const { isAuthenticated, loading } = useSelector((state) => state.auth);

  // useEffect(() => {
  //   dispatch(getCurrentUser());
  // }, [dispatch]);

  // // 1. Prevent redirection while the check is in progress
  // if (loading) {
  //   return <div>Loading...</div>; // Or a nice Spinner component
  // }


  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition">
            <Menu size={20} />
          </button>

          <div className="text-sm text-gray-700">
            Welcome,{" "}
            <span className="font-semibold">{user?.name || "User"}</span>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
