import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UiProvider } from "./components/ui/Provider.tsx"

import { ReactKeycloakProvider } from '@react-keycloak/web';
import keycloak, { keycloakInitOptions, auth_required } from "./auth";

const client = new QueryClient();

if(auth_required())
{
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <QueryClientProvider client={client}>
          <UiProvider>
            <ReactKeycloakProvider authClient={keycloak} initOptions={keycloakInitOptions}>
            <App />
            </ReactKeycloakProvider>
          </UiProvider>
        </QueryClientProvider>
      </React.StrictMode>
    )
} else {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <QueryClientProvider client={client}>
          <UiProvider>
          <App />
          </UiProvider>
        </QueryClientProvider>
      </React.StrictMode>,
    )
}
