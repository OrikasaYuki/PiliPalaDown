import React from 'react'
import { ExternalLink } from 'lucide-react'
import { useWorkStore } from '../stores/workStore'
import { useT } from '../stores/localeStore'
import { secondToTime } from '../api/bilibili'

export const VideoInfoCard: React.FC = () => {
  const t = useT()
  const { videoData, mode } = useWorkStore()
  const data = videoData

  if (mode === 'hide') return null

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  )

  return (
    <div className="video-info-card">
      <div className="video-info-grid">
        {/* Cover */}
        <div className="video-cover-section">
          <div className="cover-wrapper">
            <img
              src={data.cover}
              alt={data.title}
              className="cover-image"
              referrerPolicy="no-referrer"
            />
            <a
              href={data.targetURL}
              target="_blank"
              rel="noopener noreferrer"
              className="cover-overlay"
              title="打开视频页面"
            >
              <ExternalLink size={20} />
            </a>
          </div>
        </div>

        {/* Info */}
        <div className="video-meta-section">
          <h3 className="video-title">
            <a href={data.targetURL} target="_blank" rel="noopener noreferrer">
              {data.title}
            </a>
          </h3>

          <div className="meta-grid">
            <InfoRow
              label={mode === 'video' ? (data.staff.length > 0 ? t('video.staff') : t('video.publisher')) : t('video.cast')}
              value={
                data.staff.length > 0
                  ? data.staff.map((s) => s.trim()).join(', ')
                  : data.owner.name
              }
            />
            <InfoRow label={t('video.publish_time')} value={data.publishData} />

            {mode === 'video' && (
              <>
                <InfoRow
                  label={t('video.resolution')}
                  value={`${data.dimension.width}x${data.dimension.height}`}
                />
                <InfoRow label={t('video.duration')} value={secondToTime(data.duration)} />
                <InfoRow label={t('video.episodes')} value={data.pages.length.toString()} />
              </>
            )}

            {mode === 'season' && (
              <>
                <InfoRow label="状态" value={data.status} />
                <InfoRow label="地区" value={data.areas.join(', ')} />
                <InfoRow label="标签" value={data.styles.join(', ')} />
              </>
            )}
          </div>

          <div className="video-description">
            <span className="desc-label">{t('video.description')}</span>
            <p className="desc-text">
              {data.description?.match(/^(\s*|.)$/)
                ? t('video.no_description')
                : data.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
