import React from 'react'
import { X } from 'lucide-react'
import { useT } from '../stores/localeStore'

interface PlayerModalProps {
  open: boolean
  onClose: () => void
  src: string
  title: string
  type: 'video' | 'audio'
  isOnline?: boolean
  bvid?: string
  cid?: number
  page?: number
}

export const PlayerModal: React.FC<PlayerModalProps> = ({ open, onClose, src, title, type, isOnline, bvid, cid, page }) => {
  const t = useT()

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content player-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{type === 'video' ? t('task.player_title_video') : t('task.player_title_audio')}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          {isOnline && bvid && cid ? (
            <div className="player-wrapper video-ratio">
              <iframe
                src={`https://player.bilibili.com/player.html?bvid=${bvid}&cid=${cid}${page ? `&p=${page}` : ''}&autoplay=1`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
                title={title}
              />
            </div>
          ) : type === 'video' ? (
            <div className="player-wrapper video-ratio">
              <video src={src} controls className="player-element" playsInline />
            </div>
          ) : (
            <div className="audio-wrapper">
              <audio src={src} controls className="player-element" />
            </div>
          )}
          <div className="player-info" style={{ padding: 'var(--space-md) var(--space-xl)' }}>
            <p className="player-title">{title || t('parse.online_play')}</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>{t('parse.close')}</button>
        </div>
      </div>
    </div>
  )
}
