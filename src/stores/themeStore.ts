import { create } from 'zustand'

export type Theme = 'dark' | 'light' | 'high-contrast'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (typeof window !== 'undefined' ? (localStorage.getItem('pilipaladown-theme') as Theme) : null) || 'dark',

  setTheme: (theme) => {
    set({ theme })
    try { localStorage.setItem('pilipaladown-theme', theme) } catch {}
    const root = document.documentElement
    root.classList.remove('light-theme', 'high-contrast-theme')
    if (theme === 'light') root.classList.add('light-theme')
    if (theme === 'high-contrast') root.classList.add('high-contrast-theme')
    // dark = default (no class needed)
  },

  toggleTheme: () => {
    const order: Theme[] = ['dark', 'light', 'high-contrast']
    const idx = order.indexOf(get().theme)
    get().setTheme(order[(idx + 1) % order.length])
  },
}))
