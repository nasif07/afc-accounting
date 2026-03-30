import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import store from './store/store.js'
import { queryClient } from './lib/queryClient'
import './index.css'
import { RouterProvider } from "react-router-dom";
import router from './Routes/Routes.jsx'
import { getCurrentUser } from './store/slices/authSlice.js'

/**
 * AppInitializer: Initializes the app by:
 * 1. Dispatching getCurrentUser to check authentication
 * 2. Providing the router to React Router
 * 
 * This component is wrapped in Provider and QueryClientProvider
 * so it has access to Redux store and React Query client
 */
function AppInitializer() {
  // Initialize auth on app load
  React.useEffect(() => {
    store.dispatch(getCurrentUser());
  }, []); // Empty dependency array - runs once on mount

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
