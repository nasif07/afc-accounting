/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider, useDispatch } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";

import store from "./store/store.js";
import { queryClient } from "./lib/queryClient";
import router from "./Routes/Routes.jsx";
import { getCurrentUser } from "./store/slices/authSlice.js";
import { fetchSettings } from "./store/slices/settingsSlice.js";
import "./index.css";
import LoadingSpinner from "./components/common/LoadingSpinner.jsx";
import {
  clearChunkReloadFlag,
  reloadOnceForChunkError,
} from "./utils/chunkReload.js";

// Vite fires this when a lazy route's chunk (or its CSS) fails to load —
// almost always a tab left open across a redeploy. Reload once to pick up the
// new build instead of letting the route crash.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnceForChunkError()) event.preventDefault();
});

// Clear the one-shot guard only after the app has run cleanly for a while, so
// a chunk that is genuinely missing can't turn into a reload loop.
setTimeout(clearChunkReloadFlag, 10000);

function AppInitializer() {
  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Promise.allSettled([
          dispatch(getCurrentUser()).unwrap?.(),
          dispatch(fetchSettings()),
        ]);
      } catch (error) {
        console.error("Failed to initialize app:", error);
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