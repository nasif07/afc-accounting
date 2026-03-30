import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider, useDispatch } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App.jsx'
import store from './store/store.js'
import { queryClient } from './lib/queryClient'
import './index.css'
import { RouterProvider } from "react-router-dom";
import router from './Routes/Routes.jsx'
import { getCurrentUser } from './store/slices/authSlice.js'
import { useEffect } from 'react'
function AppInitializer() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getCurrentUser());
  }, [dispatch]);

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
