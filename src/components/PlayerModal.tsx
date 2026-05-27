import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useT } from '../stores/localeStore'

interface Quality {
  id: number
  url: string
  label: string
}

interface PlayerModalProps {
  open: boolean
  onClose: () => void
  src: string
  title: string
  type: 'video' | 'audio'
  isOnline?: boolean
  qualities?: Quality[]
  audioSrc?: string
  onQualityChange?: (qualityUrl: string) => void
}

export const PlayerModal: React.FC<PlayerModalProps> = ({ open, onClose, src, title, type, isOnline, qualities, audioSrc, onQualityChange }) => {
  const t = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [qualityIdx, setQualityIdx] = React.useState(0)

  // Sync: when video plays/pauses/seeks, mirror on audio
  const syncAudio = () => {
    if (!audioRef.current || !videoRef.current) return
    if (!audioRef.current.paused && videoRef.current.paused) audioRef.current.pause()
    if (Math.abs(audioRef.current.currentTime - videoRef.current.currentTime) > 0.5) {
      audioRef.current.currentTime = videoRef.current.currentTime
    }
  }

  useEffect(() => {
    if (open && src) {
      setTimeout(() => {
        // Start video
        if (type === 'video' && videoRef.current) {
          videoRef.current.load()
          videoRef.current.play().catch(() => {})
        }
        // Start audio in sync
        if (audioSrc && audioRef.current) {
          audioRef.current.load()
          audioRef.current.play().catch(() => {})
        }
        // Pure audio
        if (type === 'audio' && audioRef.current) {
          audioRef.current.load()
          audioRef.current.play().catch(() => {})
        }
      }, 300)
    }
  }, [open, src, audioSrc, type])

  useEffect(() => {
    if (!open) {
      if (videoRef.current) videoRef.current.pause()
      if (audioRef.current) audioRef.current.pause()
    }
  }, [open])

  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10)
    setQualityIdx(idx)
    if (onQualityChange && qualities) {
      onQualityChange(qualities[idx].url)
    }
  }

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

        <div className="modal-body">
          <div className="player-wrapper video-ratio">
            {type === 'video' ? (
              <video
                ref={videoRef}
                src={src}
                controls
                className="player-element"
                crossOrigin="anonymous"
                playsInline
                onPlay={() => audioRef.current?.play().catch(() => {})}
                onPause={() => audioRef.current?.pause()}
                onSeeked={syncAudio}
                onTimeUpdate={syncAudio}
              />
            ) : (
              <div className="audio-wrapper">
                <audio ref={audioRef} src={src} controls className="player-element" />
              </div>
            )}
          </div>

          {/* Hidden audio stream for DASH video+audio */}
          {isOnline && audioSrc && type === 'video' && (
            <audio
              ref={audioRef}
              src={audioSrc}
              preload="auto"
              style={{ display: 'none' }}
              crossOrigin="anonymous"
            />
          )}

          <div className="player-info">
            <p className="player-title">{title || t('parse.online_play')}</p>
            {isOnline && qualities && qualities.length > 1 && (
              <div className="player-quality">
                <span className="player-quality-label">{t('parse.quality')}</span>
                <select className="quality-select" value={qualityIdx} onChange={handleQualityChange}>
                  {qualities.map((q, i) => (
                    <option key={q.id} value={i}>{q.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>{t('parse.close')}</button>
        </div>
      </div>
    </div>
  )
}
