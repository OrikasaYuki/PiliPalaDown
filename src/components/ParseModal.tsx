import React, { useState } from 'react'
import { X, Download, Check, AlertCircle } from 'lucide-react'
import { useWorkStore } from '../stores/workStore'
import { useT } from '../stores/localeStore'
import { formatSeconds } from '../api/bilibili'

interface ParseModalProps {
  open: boolean
  onClose: () => void
  onDownload: () => Promise<void>
}

export const ParseModal: React.FC<ParseModalProps> = ({ open, onClose, onDownload }) => {
  const t = useT()
  const {
    allPlayInfo, finishCount, totalCount,
    downloadBtnDisabled, downloadType, preferredCodec, preferHiResAudio, errorList,
    setDownloadType, setPreferredCodec, setPreferHiResAudio,
    togglePlayInfoSelection, selectAllPlayInfo, resetModal,
  } = useWorkStore()

  const [parsing, setParsing] = useState(false)

  const total = allPlayInfo.length
  const allFinish = finishCount > 0 && finishCount >= total && !parsing

  if (!open) return null

  const selectedCount = allPlayInfo.filter(i => i.selected).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content parse-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{allFinish ? t('parse.batch_download') : t('parse.parsing_remaining', { count: total - finishCount })}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Parse progress */}
          {parsing && (
            <div className="parse-progress">
              <div className="progress-text">
                正在解析，剩余 {total - finishCount} 项
              </div>
              <div className="progress-bar-wrapper">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${total > 0 ? (finishCount / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Error list */}
          {errorList.length > 0 && allFinish && (
            <div className="error-list">
              <div className="error-list-header">
                <AlertCircle size={16} />
                <span>{t('parse.parse_failed', { count: errorList.length })}</span>
              </div>
              {errorList.map((err, i) => (
                <div key={i} className="error-item">{err}</div>
              ))}
            </div>
          )}

          {/* Item list */}
          {allPlayInfo.length > 0 && (
            <div className="playinfo-list">
              {allPlayInfo
                .filter(info => info.info)
                .sort((a, b) => a.page.page - b.page.page)
                .map((info, index) => {
                  return (
                    <div
                      key={index}
                      className={`playinfo-item ${info.selected ? 'selected' : ''}`}
                      onClick={() => togglePlayInfoSelection(index)}
                    >
                      <div className="playinfo-check">
                        {info.selected ? <Check size={16} /> : null}
                      </div>
                      <div className="playinfo-info">
                        <span className="playinfo-badge">{info.page.badge}</span>
                        <span className="playinfo-title">{info.page.part}</span>
                      </div>
                      <select
                        className="quality-select"
                        value={info.formatIndex}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const idx = parseInt(e.target.value)
                          const updated = [...allPlayInfo]
                          updated[index] = { ...updated[index], formatIndex: idx }
                          useWorkStore.getState().setAllPlayInfo(updated)
                        }}
                      >
                        {info.info?.accept_quality.map((fmt: number, i: number) => (
                          <option key={i} value={i}>
                            {t(`format.q${fmt}`) || `Q${fmt}`}
                          </option>
                        ))}
                      </select>
                      {info.audioOptions && info.audioOptions.length > 1 && (
                        <select
                          className="quality-select"
                          style={{ maxWidth: 130 }}
                          value={info.audioIndex}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            const idx = parseInt(e.target.value)
                            const updated = [...allPlayInfo]
                            updated[index] = { ...updated[index], audioIndex: idx }
                            useWorkStore.getState().setAllPlayInfo(updated)
                          }}
                        >
                          {info.audioOptions.map((opt: any, i: number) => (
                            <option key={i} value={i}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {allFinish && allPlayInfo.length > 0 && (
            <div className="footer-options">
              <span>{t('parse.selected', { n: selectedCount, total: allPlayInfo.length })}</span>
              <select
                className="footer-select"
                value={downloadType}
                onChange={e => setDownloadType(e.target.value as any)}
              >
                <option value="merge">{t('parse.download_type_merge')}</option>
                <option value="audio">{t('parse.download_type_audio')}</option>
                <option value="video">{t('parse.download_type_video')}</option>
              </select>
              <select
                className="footer-select"
                value={preferredCodec}
                onChange={e => setPreferredCodec(parseInt(e.target.value) as any)}
              >
                <option value={12}>HEVC</option>
                <option value={7}>AVC</option>
                <option value={13}>AV1</option>
              </select>
            </div>
          )}

          <div className="footer-actions">
            {!allFinish && (
              <button className="btn btn-ghost" onClick={onClose}>{t('parse.cancel')}</button>
            )}
            {allFinish && (
              <>
                <button
                  className="btn btn-ghost"
                  onClick={() => selectAllPlayInfo(true)}
                >
                  全选
                </button>
                <button
                  className="btn btn-primary"
                  onClick={onDownload}
                  disabled={selectedCount === 0 || downloadBtnDisabled}
                >
                  <Download size={16} />
                  <span>{t('parse.start_download')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
