import React from 'react'
import { CheckSquare, Square } from 'lucide-react'
import { useWorkStore } from '../stores/workStore'
import { useT } from '../stores/localeStore'

interface VideoItemListProps {
  onParseSelected: () => void
  onPlayEpisode?: (page: any) => void
  sectionTabs: { title: string; pages: any[] }[]
  sectionActiveIndex: number
  onSectionChange: (index: number) => void
}

export const VideoItemList: React.FC<VideoItemListProps> = ({
  onParseSelected,
  onPlayEpisode,
  sectionTabs,
  sectionActiveIndex,
  onSectionChange,
}) => {
  const t = useT()
  const { videoData, selectAllPages, selectAllSectionPages, toggleSectionPage } = useWorkStore()
  const currentSection = sectionTabs[sectionActiveIndex]
  const pages = currentSection?.pages || []
  const selectedCount = pages.filter((p: any) => p.selected).length
  const allSelected = selectedCount === pages.length && pages.length > 0

  // Section index in the store (offset by 1 because tab 0 is "正片")
  const storeSectionIndex = sectionActiveIndex > 0 ? sectionActiveIndex - 1 : -1

  const handleToggle = (pageIndex: number) => {
    if (storeSectionIndex >= 0) {
      toggleSectionPage(storeSectionIndex, pageIndex)
    } else {
      const store = useWorkStore.getState()
      const p = [...store.videoData.pages]
      p[pageIndex] = { ...p[pageIndex], selected: !p[pageIndex].selected }
      store.setVideoData({ ...store.videoData, pages: p })
    }
  }

  const handleSelectAll = () => {
    if (storeSectionIndex >= 0) {
      selectAllSectionPages(storeSectionIndex, !allSelected)
    } else {
      selectAllPages(!allSelected)
    }
  }

  return (
    <div className="video-item-list">
      {sectionTabs.length > 1 && (
        <div className="section-tabs">
          {sectionTabs.map((tab, index) => (
            <button
              key={index}
              className={`section-tab ${index === sectionActiveIndex ? 'active' : ''}`}
              onClick={() => onSectionChange(index)}
            >
              {tab.title}
            </button>
          ))}
        </div>
      )}

      <div className="item-actions">
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleSelectAll}
        >
          {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
          <span>{allSelected ? t('parse.deselect_all') : t('parse.select_all')} ({selectedCount}/{pages.length})</span>
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={onParseSelected}
          disabled={selectedCount === 0}
        >
          {t('parse.parse_selected')} ({selectedCount})
        </button>
      </div>

      <div className="episode-grid">
        {pages.map((page: any, index: number) => {
          return (
            <div
              key={index}
              className={`episode-card ${page.selected ? 'selected' : ''} ${page.multiPage ? 'multi-page' : ''}`}
              onClick={() => handleToggle(index)}
            >
              <div className="episode-card-main">
                <span className="episode-badge">{page.badge}</span>
                <div className="episode-card-text">
                  <span className="episode-title">{page.part}</span>
                  {page.multiPage && page.pageLabel && (
                    <span className="episode-page-label">{page.pageLabel}</span>
                  )}
                </div>
              </div>
              {onPlayEpisode && (
                <button
                  className="episode-play-btn"
                  title={t('parse.online_play')}
                  onClick={(e) => { e.stopPropagation(); onPlayEpisode(page) }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
