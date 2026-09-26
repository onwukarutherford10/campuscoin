import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DATA_MODE } from './services/api/config.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {DATA_MODE === 'mock' ? (
      <App />
    ) : (
      <main className="mx-auto max-w-xl p-8 text-gray-900">
        <h1 className="text-2xl font-semibold">Live data is being connected</h1>
        <p className="mt-3">The current screens still use demo data. Switch to mock mode to view the demo while live screens are integrated in later phases.</p>
      </main>
    )}
  </StrictMode>,
)
