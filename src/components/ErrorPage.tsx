import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useT } from '../stores/localeStore'

interface ErrorPageProps {
  message: string
  onRetry: () => void
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ message, onRetry }) => {
  const t = useT()
  return (
    <div className="error-page">
      <div className="error-card">
        <AlertTriangle size={48} className="error-icon" />
        <h2>{t('error.fetch_failed')}</h2>
        <p className="error-message">{message}</p>
        <button className="btn btn-primary" onClick={onRetry}>
          <RefreshCw size={16} />
          <span>{t('error.retry')}</span>
        </button>
      </div>
    </div>
  )
}
