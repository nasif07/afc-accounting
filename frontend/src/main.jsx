import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider, useDispatch } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";

import store from "./store/store.js";
import { queryClient } from "./lib/queryClient";
import router from "./Routes/Routes.jsx";
import { getCurrentUser } from "./store/slices/authSlice.js";
import "./index.css";
import LoadingSpinner from "./components/common/LoadingSpinner.jsx";

function AppInitializer() {
  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await dispatch(getCurrentUser()).unwrap?.();
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [dispatch]);

  if (!isInitialized) {
    return <LoadingSpinner message="Initializing application..." />;
  }

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppInitializer />
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);