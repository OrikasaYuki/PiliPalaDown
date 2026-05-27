import { create } from 'zustand'
import { VideoFormat, VideoFormatLabels } from '../types'

export const QUALITY_OPTIONS: { id: number }[] = [
  { id: 16 }, { id: 32 }, { id: 64 }, { id: 80 }, { id: 116 }, { id: 120 },
]

interface SettingsState {
  downloadFolder: string
  defaultPlayQuality: number
  showDiscoverFeed: boolean
  loading: boolean
  saving: boolean

  setDownloadFolder: (val: string) => void
  setDefaultPlayQuality: (val: number) => void
  setShowDiscoverFeed: (val: boolean) => void
  setLoading: (val: boolean) => void
  setSaving: (val: boolean) => void
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<string>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  downloadFolder: '',
  defaultPlayQuality: (() => {
    try { return parseInt(localStorage.getItem('pilipaladown-play-quality') || '16', 10) } catch { return 16 }
  })(),
  showDiscoverFeed: (() => {
    try { return localStorage.getItem('pilipaladown-discover-feed') !== '0' } catch { return true }
  })(),
  loading: false,
  saving: false,

  setDownloadFolder: (val) => set({ downloadFolder: val }),
  setDefaultPlayQuality: (val) => {
    set({ defaultPlayQuality: val })
    try { localStorage.setItem('pilipaladown-play-quality', val.toString()) } catch {}
  },
  setShowDiscoverFeed: (val) => {
    set({ showDiscoverFeed: val })
    try { localStorage.setItem('pilipaladown-discover-feed', val ? '1' : '0') } catch {}
  },
  setLoading: (val) => set({ loading: val }),
  setSaving: (val) => set({ saving: val }),

  loadSettings: async () => {
    try {
      set({ loading: true })
      const fields = await window.electronAPI.getFields()
      set({ downloadFolder: fields.download_folder || '' })
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      set({ loading: false })
    }
  },

  saveSettings: async () => {
    const { downloadFolder } = get()
    set({ saving: true })
    try {
      const message = await window.electronAPI.saveFields([['download_folder', downloadFolder]])
      return message
    } catch (err: any) {
      throw err
    } finally {
      set({ saving: false })
    }
  },
}))
