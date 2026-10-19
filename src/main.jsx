import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
document.documentElement.dataset.theme = 'light'
document.documentElement.style.colorScheme = 'light'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
