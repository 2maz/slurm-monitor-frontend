import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UiProvider } from "./components/ui/Provider.tsx"

import keycloak, { auth_required } from "./auth";

const client = new QueryClient();

if(auth_required())
{
  keycloak.init({
    onLoad: 'login-required',
    pkceMethod: 'S256',
    checkLoginIframe: false
  }).then((authenticated) => {
    if(!authenticated) {
      keycloak.login().catch((reason) => {
        console.log("Login rejected: " + reason)
      })
    }

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <QueryClientProvider client={client}>
          <UiProvider>
          <App />
          </UiProvider>
        </QueryClientProvider>
      </React.StrictMode>,
    )
  }).catch((error) => {
    console.error("Keycloak initialization failed", error)
  })
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
