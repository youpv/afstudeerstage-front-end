import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '@shopify/polaris'
import enTranslations from '@shopify/polaris/locales/en.json'
import '@shopify/polaris/build/esm/styles.css'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IntegrationProvider } from './context/IntegrationContext.jsx'
import App from './App.jsx'

// Create a client
const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider i18n={enTranslations}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <IntegrationProvider>
            <App />
          </IntegrationProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </AppProvider>
  </StrictMode>,
)
