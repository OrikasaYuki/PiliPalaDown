import React, { useEffect, useState, useRef } from 'react'
import { QrCode, Smartphone, RefreshCw } from 'lucide-react'
import { useT } from '../stores/localeStore'

interface LoginPageProps {
  onLoginSuccess: () => void
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const t = useT()
  const [qrSrc, setQrSrc] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [qrLoading, setQrLoading] = useState(true)

  const qrKeyRef = useRef('')
  const refreshTimerRef = useRef<ReturnType<typeof setInterval>>()
  const statusTimerRef = useRef<ReturnType<typeof setInterval>>()

  const loadQR = async () => {
    try {
      setQrLoading(true)
      const qrInfo = await window.electronAPI.getQRInfo()
      setQrSrc(qrInfo.image)
      qrKeyRef.current = qrInfo.key
      setErrorMessage('')
    } catch (err: any) {
      setErrorMessage('加载二维码失败，请刷新页面重试')
    } finally {
      setQrLoading(false)
    }
  }

  const checkStatus = async () => {
    const key = qrKeyRef.current
    if (!key) return
    try {
      const status = await window.electronAPI.getQRStatus(key)
      if (status.success) {
        onLoginSuccess()
      } else {
        const msg = status.message
          .replace('未扫码', '')
          .replace('已扫码，请点击确认', '已扫码，请在手机上确认')
        if (msg) setStatusMessage(msg)
      }
    } catch {
      setErrorMessage('获取二维码状态失败')
    }
  }

  useEffect(() => {
    loadQR()

    refreshTimerRef.current = setInterval(() => {
      loadQR()
    }, 120000)

    statusTimerRef.current = setInterval(() => {
      checkStatus()
    }, 1000)

    return () => {
      clearInterval(refreshTimerRef.current)
      clearInterval(statusTimerRef.current)
    }
  }, [])

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-qr-section">
          {qrLoading ? (
            <div className="qr-placeholder">
              <div className="loading-spinner" />
            </div>
          ) : qrSrc ? (
            <img
              src={qrSrc}
              alt="QR Code"
              className="qr-image"
              onLoad={() => setQrLoading(false)}
              onError={() => setErrorMessage(t('login.qr_error'))}
            />
          ) : (
            <div className="qr-placeholder">
              <QrCode size={64} />
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={loadQR}>
            <RefreshCw size={14} />
            <span>{t('login.qr_refresh')}</span>
          </button>
        </div>

        <div className="login-info-section">
          <div className="login-icon">
            <Smartphone size={32} />
          </div>
          <h2>{t('login.title')}</h2>
          <p className="login-desc">{t('login.desc')}</p>
          {errorMessage && (
            <div className="status-message error">{errorMessage}</div>
          )}
          {!errorMessage && statusMessage && (
            <div className="status-message info">{statusMessage}</div>
          )}
        </div>
      </div>
    </div>
  )
}
