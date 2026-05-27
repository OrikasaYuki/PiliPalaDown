import { create } from 'zustand'

export interface UserInfo {
  name: string
  face: string
  mid: number
  isVip: boolean
}

interface AuthState {
  isLoggedIn: boolean
  loading: boolean
  checking: boolean
  user: UserInfo | null

  setLoggedIn: (val: boolean) => void
  setLoading: (val: boolean) => void
  setChecking: (val: boolean) => void
  setUser: (user: UserInfo | null) => void

  checkLogin: () => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  loading: false,
  checking: true,
  user: null,

  setLoggedIn: (val) => set({ isLoggedIn: val }),
  setLoading: (val) => set({ loading: val }),
  setChecking: (val) => set({ checking: val }),
  setUser: (user) => set({ user }),

  checkLogin: async () => {
    try {
      const result = await window.electronAPI.checkLogin()
      set({ isLoggedIn: result, checking: false })
      if (result) {
        try {
          const raw = await window.electronAPI.getUserInfo()
          if (raw) {
            set({
              user: {
                name: raw.name || '',
                face: raw.face || '',
                mid: raw.mid || 0,
                isVip: !!(raw.vipStatus && raw.vipType > 0),
              },
            })
          }
        } catch {}
      }
      return result
    } catch {
      set({ isLoggedIn: false, checking: false })
      return false
    }
  },

  logout: async () => {
    try {
      await window.electronAPI.logout()
      set({ isLoggedIn: false, user: null })
    } catch (err) {
      console.error('Logout failed:', err)
    }
  },
}))
