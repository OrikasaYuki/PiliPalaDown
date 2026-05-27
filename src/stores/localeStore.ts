import { create } from 'zustand'
import zh from '../i18n/zh.json'
import en from '../i18n/en.json'
import ja from '../i18n/ja.json'

export type Locale = 'zh' | 'en' | 'ja'

const messages: Record<Locale, any> = { zh, en, ja }

type DeepKeyOf<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends object
      ? DeepKeyOf<T[K], `${Prefix}${K}.`>
      : never
}[keyof T & string]

type MessageKey = DeepKeyOf<typeof zh>

function getNested(obj: any, path: string): string {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null) return path
    current = current[key]
  }
  return typeof current === 'string' ? current : path
}

// Standalone t function — reads current locale from store
function lookup(key: string, params?: Record<string, string | number>): string {
  const state = useLocaleStore.getState()
  const msg = messages[state.locale] || messages.zh
  let text = getNested(msg, key)
  if (!text) text = getNested(messages.zh, key) || key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'zh',
  setLocale: (locale) => {
    set({ locale })
    try { localStorage.setItem('pilipaladown-locale', locale) } catch {}
    try { (window as any).electronAPI?.setTrayLocale(locale) } catch {}
  },
}))

// Export t directly — components that need reactivity subscribe to locale
// and call t() which always reads the latest locale from the store
export function t(key: string, params?: Record<string, string | number>): string {
  return lookup(key, params)
}

// React hook: returns bound t function that triggers re-render on locale change
export function useT() {
  const locale = useLocaleStore((s) => s.locale)
  return (key: string, params?: Record<string, string | number>) => lookup(key, params)
}
