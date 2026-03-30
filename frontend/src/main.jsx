import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import store from './store/store.js'
import { queryClient } from './lib/queryClient'
import './index.css'
import { RouterProvider } from "react-router-dom";
import router from './Routes/Routes.jsx'
import { getCurrentUser } from './store/slices/authSlice.js'
import LoadingSpinner from './components/LoadingSpinner'

/**
 * AppInitializer: Initializes the app by:
 * 1. Dispatching getCurrentUser to check authentication
 * 2. Waiting for auth check to complete
 * 3. THEN providing the router to React Router
 * 
 * This ensures the router doesn't render before we know if user is authenticated
 */
function AppInitializer() {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Dispatch getCurrentUser and wait for it to complete
    dispatch(getCurrentUser()).then(() => {
      // Mark that auth check is complete
      setAuthChecked(true);
    });
  }, [dispatch]);

  // Don't render router until auth check is complete
  if (!authChecked) {
    return <LoadingSpinner message="Initializing application..." />;
  }

  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppInitializer />
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>,
)
