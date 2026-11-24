import './cspNonce'
import './zodConfig'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './fonts'
import './index.css'
import { App } from './App'

// Apply persisted color mode before first render to avoid a flash.
// The accent themes are gone; drop the stale key they left behind.
localStorage.removeItem('kavach_theme')
if ((localStorage.getItem('kavach_color_mode') ?? 'dark') === 'dark') {
  document.documentElement.classList.add('dark')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
