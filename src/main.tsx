import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './global.css'

async function boot() {
  // Restore theme from localStorage
  try {
    const saved = localStorage.getItem('pilipaladown-theme')
    if (saved === 'light') document.documentElement.classList.add('light-theme')
    if (saved === 'high-contrast') document.documentElement.classList.add('high-contrast-theme')
  } catch {}

  // Platform detection: Electron, Capacitor, or Web
  if (typeof window.electronAPI === 'undefined') {
    const isCapacitor = typeof (window as any).Capacitor !== 'undefined'
    if (isCapacitor) {
      // Android mode
      const { createAndroidApi } = await import('./adapters/android-adapter')
      window.electronAPI = await createAndroidApi()
    } else {
      // Web mode
      const { createWebApi } = await import('./adapters/web-adapter')
      window.electronAPI = createWebApi()
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

boot()
