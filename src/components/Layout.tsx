import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useWorkStore } from '../stores/workStore'
import { t, useLocaleStore, Locale } from '../stores/localeStore'
import { Header } from './Header'
import { HomePage } from './HomePage'
import { ParsePage } from './ParsePage'
import { TaskPage } from './TaskPage'
import { LoginPage } from './LoginPage'
import { SettingsPage } from './SettingsPage'
import { ErrorPage } from './ErrorPage'

type Page = 'home' | 'parse' | 'task' | 'login' | 'settings' | 'error'

export const Layout: React.FC = () => {
  // Restore locale on mount
  const setLocale = useLocaleStore((s) => s.setLocale)

  // Listen for menu actions from main process (tray etc.)
  useEffect(() => {
    const handler = (_event: any, action: string) => {
      if (action === 'navigate:task') setCurrentPage('task')
      if (action === 'navigate:home') setCurrentPage('home')
    }
    try { return (window as any).electronAPI?.onMenuAction?.(handler) } catch {}
    return () => {}
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pilipaladown-locale') as Locale
      if (saved) setLocale(saved)
    } catch {}
    // Sync initial locale to tray
    try { (window as any).electronAPI?.setTrayLocale(useLocaleStore.getState().locale) } catch {}
  }, [])
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [parseTarget, setParseTarget] = useState<{ idType: string; value: string | number } | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [loginRefreshKey, setLoginRefreshKey] = useState(0)
  const { isLoggedIn, checking, checkLogin } = useAuthStore()
  const workMode = useWorkStore((s) => s.mode)
  const hasParseResult = workMode === 'video' || workMode === 'season'

  useEffect(() => {
    checkLogin()
  }, [])

  useEffect(() => {
    if (!checking && !isLoggedIn) {
      setCurrentPage('login')
    }
  }, [checking, isLoggedIn])

  const handleNavigate = (page: Page) => {
    setCurrentPage(page)
  }

  const handleNavigateParse = (idType: string, value: string | number) => {
    setParseTarget({ idType, value })
    setCurrentPage('parse')
  }

  const handleNavigateToParse = () => {
    setCurrentPage('parse')
  }

  const handleError = (message: string) => {
    setErrorMessage(message)
    setCurrentPage('error')
  }

  if (checking) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage refreshKey={loginRefreshKey} onError={handleError} onNavigateParse={handleNavigateParse} />
      case 'parse':
        return (
          <ParsePage
            onError={handleError}
            onBack={() => { setCurrentPage('home'); setParseTarget(null) }}
            parseTarget={parseTarget}
          />
        )
      case 'task':
        return <TaskPage onError={handleError} />
      case 'login':
        return (
          <LoginPage
            onLoginSuccess={() => {
              setCurrentPage('home')
              setLoginRefreshKey(k => k + 1)
              useAuthStore.getState().setLoggedIn(true)
            }}
          />
        )
      case 'settings':
        return <SettingsPage onError={handleError} />
      case 'error':
        return <ErrorPage message={errorMessage} onRetry={() => setCurrentPage('home')} />
      default:
        return <HomePage refreshKey={loginRefreshKey} onError={handleError} onNavigateParse={handleNavigateParse} />
    }
  }

  return (
    <div className="app-layout">
      <Header
        currentPage={currentPage}
        onNavigate={(page) => {
          if (page !== 'parse') setParseTarget(null)
          handleNavigate(page)
        }}
        onNavigateToParse={handleNavigateToParse}
        isLoggedIn={isLoggedIn}
        hasParseResult={hasParseResult}
      />
      <main className="app-main">
        <div className="page-container">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
