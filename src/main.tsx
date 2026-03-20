import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css' // <-- ESTA LINHA É A MAIS IMPORTANTE
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)