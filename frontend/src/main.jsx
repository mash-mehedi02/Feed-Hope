/**
 * FeedHope Frontend - Main Entry Point
 * React + Firebase Application
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import './index.css'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// Initialize React app immediately (don't wait for DOMContentLoaded in modern browsers)
console.log('🚀 Main.jsx - Starting FeedHope React app...');

try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found!');
  }
  
  console.log('✅ Root element found');
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
  
  console.log('✅ React app rendered successfully!');
} catch (error) {
  console.error('❌ Error initializing app:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif;">
        <h1 style="color: #ef4444;">Error Loading App</h1>
        <p style="color: #6b7280; margin: 20px 0;">${error.message}</p>
        <button onclick="window.location.reload()" style="
          padding: 10px 20px;
          background: #2E8B57;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        ">Reload Page</button>
      </div>
    `;
  }
}

