import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IntegrationProvider } from './context/IntegrationContext.jsx'
import App from './App.jsx'
// Import the global CSS file
import './index.css'

// Create a client
const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <IntegrationProvider>
          <App />
        </IntegrationProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
