import React, { useEffect, useState } from 'react'
import { Loader2, Play, User, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { InputBox } from './InputBox'
import { useSettingsStore } from '../stores/settingsStore'
import { useT } from '../stores/localeStore'
import { secondToTime } from '../api/bilibili'

interface HomePageProps {
  onError: (message: string) => void
  onNavigateParse: (idType: string, value: string | number) => void
  refreshKey?: number
}

interface PopularItem {
  bvid: string
  title: string
  cover: string
  author: string
  duration: number
}

// Module-level cache: survives component mount/unmount across tab switches
let _cache: PopularItem[] = []
let _initialLoadStarted = false
let _loadingInProgress = false

export const HomePage: React.FC<HomePageProps> = ({ onError, onNavigateParse, refreshKey = 0 }) => {
  const [popularList, setPopularList] = useState<PopularItem[]>(_cache)
  const [loading, setLoading] = useState(_cache.length === 0)
  const showFeed = useSettingsStore((s) => s.showDiscoverFeed)
  const setShowFeed = useSettingsStore((s) => s.setShowDiscoverFeed)
  const t = useT()

  useEffect(() => {
    // Reset cache when refreshKey changes (e.g. after login)
    if (refreshKey > 0) {
      _cache = []
      _initialLoadStarted = false
      _loadingInProgress = false
      setPopularList([])
      setLoading(true)
    }
    if (_cache.length > 0) return
    if (_initialLoadStarted || _loadingInProgress) return
    _initialLoadStarted = true
    loadPopularList()
  }, [refreshKey])

  async function loadPopularList() {
    if (_loadingInProgress) return undefined
    _loadingInProgress = true
    try {
      setLoading(true)
      const bvids = await window.electronAPI.getPopularVideos()
      const start = Math.floor(Math.random() * Math.max(1, bvids.length - 12))
      const batch = bvids.slice(start, start + 12)
      const details = await Promise.allSettled(
        batch.map(async (bvid: string) => {
          const info = await window.electronAPI.getVideoInfo(bvid)
          return { bvid, title: info.title, cover: info.pic, author: info.owner.name, duration: info.duration } as PopularItem
        })
      )
      const items: PopularItem[] = []
      for (const result of details) {
        if (result.status === 'fulfilled') items.push(result.value)
      }
      _cache = items
      setPopularList(items)
    } catch {
      // Silently fail
    } finally {
      _loadingInProgress = false
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    _cache = []
    _initialLoadStarted = false
    setLoading(true)
    await loadPopularList()
  }

  return (
    <div className={`home-page ${!showFeed ? 'home-page-centered' : ''}`}>
      <div className="home-hero">
        <h1 className="home-title">PiliPalaDown</h1>
        <p className="home-subtitle">{t('home.subtitle')}</p>
        <InputBox onStartParse={async (idType, value) => { onNavigateParse(idType, value) }} />
      </div>

      {showFeed && (
        <section className="popular-section">
          <div className="section-header">
            <h2 className="section-title">{t('home.popular')}</h2>
            <div className="section-header-actions">
              <button className="btn btn-ghost btn-sm" onClick={handleRefresh} disabled={loading} title={t('home.refresh')}>
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                <span>{t('home.refresh')}</span>
              </button>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowFeed(false)} title={t('home.feed_on')}>
                <EyeOff size={14} />
              </button>
            </div>
          </div>

          {loading && _cache.length === 0 ? (
            <div className="loading-state"><Loader2 size={24} className="spin" /></div>
          ) : (
            <div className="video-grid">
              {popularList.map((item) => (
                <div key={item.bvid} className="video-card" onClick={() => onNavigateParse('bv', item.bvid)}>
                  <div className="video-card-cover">
                    <img src={item.cover} alt={item.title} referrerPolicy="no-referrer" loading="lazy" />
                    <div className="video-card-overlay"><Play size={24} /></div>
                    <span className="video-card-duration">{secondToTime(item.duration)}</span>
                  </div>
                  <div className="video-card-info">
                    <h3 className="video-card-title">{item.title}</h3>
                    <span className="video-card-author"><User size={12} />{item.author}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!showFeed && (
        <div className="feed-disabled">
          <div className="feed-disabled-inner">
            <span className="feed-disabled-text">{t('home.feed_off')}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFeed(true)}>
              <Eye size={14} />
              <span>{t('home.feed_on')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
