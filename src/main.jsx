import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    // iOS home-screen PWAs often keep an old worker until something
    // explicitly checks for updates — poll while the app is open.
    const hour = 60 * 60 * 1000
    window.setInterval(() => {
      registration.update().catch(() => {})
    }, hour)
    // Also check when the tab becomes visible again.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {})
      }
    })
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
