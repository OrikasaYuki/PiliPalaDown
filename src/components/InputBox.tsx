import React, { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useWorkStore } from '../stores/workStore'
import { useT } from '../stores/localeStore'
import * as api from '../api/bilibili'

interface InputBoxProps {
  onStartParse: (idType: string, value: string | number) => Promise<void>
}

export const InputBox: React.FC<InputBoxProps> = ({ onStartParse }) => {
  const t = useT()
  const { urlValue, setUrlValue, urlInvalid, setUrlInvalid, btnLoading, setBtnLoading } = useWorkStore()
  const [localValue, setLocalValue] = useState(urlValue)

  const handleParse = async () => {
    const trimmed = localValue.trim()
    if (!trimmed) { setUrlInvalid(true); return }
    try {
      setBtnLoading(true)
      setUrlValue(trimmed)
      let url = trimmed
      try { const r = await api.handleB23(url); if (r) url = r } catch {}
      try { const r = await api.handleSeasonsArchivesList(url); if (r) url = r } catch {}
      const { type, value } = api.checkURL(url)
      setUrlValue(value.toString())
      setUrlInvalid(false)
      await onStartParse(type, value)
    } catch { setUrlInvalid(true) }
    finally { setTimeout(() => setBtnLoading(false), 200) }
  }

  return (
    <div className="input-box">
      <div className={`input-group ${urlInvalid ? 'has-error' : ''}`}>
        <div className="input-wrapper">
          <Search size={18} className="input-icon" />
          <input type="text" className={`input-field ${urlInvalid ? 'error' : ''}`}
            placeholder={t('home.input_placeholder')}
            value={localValue}
            onChange={e => { setLocalValue(e.target.value); setUrlInvalid(false) }}
            onKeyUp={e => e.key === 'Enter' && handleParse()}
            disabled={btnLoading}
          />
        </div>
        <button className="btn btn-primary input-btn" onClick={handleParse} disabled={btnLoading}>
          {btnLoading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
          <span>{btnLoading ? t('home.parsing') : t('home.parse_btn')}</span>
        </button>
      </div>
      {urlInvalid && <div className="input-feedback">{t('home.input_error')}</div>}
    </div>
  )
}
