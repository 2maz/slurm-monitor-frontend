import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UiProvider } from "./components/ui/Provider.tsx"

const client = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <UiProvider>
      <App />
      </UiProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
