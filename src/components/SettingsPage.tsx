import React, { useEffect, useState } from 'react'
import { Save, LogOut, Power, Loader2, Folder, FileText, Sun, Moon, Globe, Monitor } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useT, useLocaleStore, Locale } from '../stores/localeStore'
import { useThemeStore } from '../stores/themeStore'
import { useSettingsStore, QUALITY_OPTIONS } from '../stores/settingsStore'
import { Eye, EyeOff } from 'lucide-react'

interface SettingsPageProps {
  onError: (message: string) => void
}

const locales: { key: Locale; label: string }[] = [
  { key: 'zh', label: '中文' },
  { key: 'en', label: 'English' },
  { key: 'ja', label: '日本語' },
]

export const SettingsPage: React.FC<SettingsPageProps> = ({ onError }) => {
  const { downloadFolder, setDownloadFolder, loading, saving, loadSettings, saveSettings } = useSettingsStore()
  const { logout } = useAuthStore()
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const defaultPlayQuality = useSettingsStore((s) => s.defaultPlayQuality)
  const setDefaultPlayQuality = useSettingsStore((s) => s.setDefaultPlayQuality)
  const showDiscoverFeed = useSettingsStore((s) => s.showDiscoverFeed)
  const setShowDiscoverFeed = useSettingsStore((s) => s.setShowDiscoverFeed)
  const [gpuEnabled, setGpuEnabled] = useState(false)
  const [gpuLoading, setGpuLoading] = useState(false)

  useEffect(() => {
    window.electronAPI.getGpuStatus().then((r: { enabled: boolean }) => setGpuEnabled(r.enabled)).catch(() => {})
  }, [])

  const handleToggleGpu = async (enable: boolean) => {
    setGpuLoading(true)
    try {
      const r: { success: boolean; needsRestart: boolean } = await window.electronAPI.setGpuEnabled(enable)
      if (r.success && r.needsRestart) {
        if (confirm(enable ? 'GPU加速开启后需要重启应用。是否立即重启？' : 'GPU加速关闭后需要重启应用。是否立即重启？')) {
          await window.electronAPI.relaunch()
        }
      }
    } catch (err: any) {
      onError(err.message)
    } finally {
      setGpuLoading(false)
    }
  }
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    try {
      const msg = await saveSettings()
      setMessage(t('settings.saved'))
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      onError(err.message)
    }
  }

  const handleLogout = async () => {
    if (!confirm(t('settings.logout_confirm'))) return
    await logout()
    window.location.reload()
  }

  const handleQuit = async () => {
    if (!confirm(t('settings.quit_confirm'))) return
    try {
      await window.electronAPI.quit()
    } catch {}
  }

  if (loading) {
    return (
      <div className="loading-state">
        <Loader2 size={24} className="spin" />
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="settings-card">
        <h3>{t('settings.download_folder')}</h3>
        <div className="settings-field">
          <label className="field-label">{t('settings.download_folder')}</label>
          <div className="field-input-group">
            <Folder size={18} className="field-icon" />
            <input
              type="text"
              className="field-input"
              value={downloadFolder}
              onChange={e => setDownloadFolder(e.target.value)}
              placeholder={t('settings.download_folder')}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
              <span>{t('settings.save')}</span>
            </button>
          </div>
          {message && <p className="field-success">{message}</p>}
        </div>
      </div>

      <div className="settings-card">
        <h3>{t('settings.theme')}</h3>
        <div className="settings-field">
          <label className="field-label">{t('settings.theme')}</label>
          <div className="settings-actions">
            <button
              className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={14} />
              <span>{t('settings.theme_dark')}</span>
            </button>
            <button
              className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setTheme('light')}
            >
              <Sun size={14} />
              <span>{t('settings.theme_light')}</span>
            </button>
            <button
              className={`btn ${theme === 'high-contrast' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setTheme('high-contrast')}
            >
              <Moon size={14} />
              <span>{t('settings.theme_high_contrast')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>{t('settings.play_quality')}</h3>
        <div className="settings-field">
          <div className="settings-actions" style={{ flexWrap: 'wrap' }}>
            {QUALITY_OPTIONS.map(q => (
              <button
                key={q.id}
                className={`btn ${defaultPlayQuality === q.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                onClick={() => setDefaultPlayQuality(q.id)}
              >
                {t(`format.q${q.id}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>{t('settings.language')}</h3>
        <div className="settings-field">
          <label className="field-label">{t('settings.language')}</label>
          <div className="settings-actions">
            {locales.map(l => (
              <button
                key={l.key}
                className={`btn ${locale === l.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                onClick={() => setLocale(l.key)}
              >
                <Globe size={14} />
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>{t('settings.feed')}</h3>
        <div className="settings-field">
          <div className="settings-actions">
            <button
              className={`btn ${showDiscoverFeed ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setShowDiscoverFeed(true)}
            >
              <Eye size={14} />
              <span>{t('settings.feed_on')}</span>
            </button>
            <button
              className={`btn ${!showDiscoverFeed ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setShowDiscoverFeed(false)}
            >
              <EyeOff size={14} />
              <span>{t('settings.feed_off')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>GPU 加速</h3>
        <div className="settings-field">
          <div className="settings-actions">
            <button
              className={`btn ${!gpuEnabled ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => handleToggleGpu(false)}
              disabled={gpuLoading}
            >
              <Monitor size={14} />
              <span>禁用</span>
            </button>
            <button
              className={`btn ${gpuEnabled ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => handleToggleGpu(true)}
              disabled={gpuLoading}
            >
              <Monitor size={14} />
              <span>启用</span>
            </button>
          </div>
          {gpuLoading && <div className="loading-state" style={{ padding: 8 }}><Loader2 size={14} className="spin" /></div>}
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {gpuEnabled ? 'GPU加速已启用' : 'GPU加速已禁用（默认）'}
          </p>
        </div>
      </div>

      <div className="settings-card">
        <h3>{t('settings.app')}</h3>
        <div className="settings-actions">
          <button className="btn btn-ghost" onClick={handleLogout}>
            <LogOut size={16} />
            <span>{t('settings.logout')}</span>
          </button>
          <button className="btn btn-ghost danger" onClick={handleQuit}>
            <Power size={16} />
            <span>{t('settings.quit')}</span>
          </button>
        </div>
      </div>

      <div className="settings-card">
        <h3>{t('settings.debug')}</h3>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
          {t('settings.log_path', { path: '~/.pilipaladown/app.log' })}
        </p>
        <div className="settings-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            alert('路径: %USERPROFILE%\\.pilipaladown\\app.log')
          }}>
            <FileText size={14} />
            <span>{t('settings.view_log')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
