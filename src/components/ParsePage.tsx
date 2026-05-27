import React, { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useWorkStore } from '../stores/workStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useT } from '../stores/localeStore'
import { InputBox } from './InputBox'
import { VideoInfoCard } from './VideoInfoCard'
import { VideoItemList } from './VideoItemList'
import { ParseModal } from './ParseModal'
import { PlayerModal } from './PlayerModal'
import * as biliApi from '../api/bilibili'
import { formatSeconds } from '../api/bilibili'
import { VideoFormat, VideoFormatLabels, TaskInitData } from '../types'

interface ParsePageProps {
  onError: (message: string) => void
  onBack: () => void
  parseTarget?: { idType: string; value: string | number } | null
}

export const ParsePage: React.FC<ParsePageProps> = ({ onError, onBack, parseTarget }) => {
  const t = useT()
  const {
    videoData, setVideoData, mode, setMode,
    btnLoading, setBtnLoading,
    sectionActiveIndex, setSectionActiveIndex,
    allPlayInfo, setAllPlayInfo,
    setFinishCount, setTotalCount, resetModal, addError, clearErrors,
    downloadType, preferredCodec, preferHiResAudio,
  } = useWorkStore()

  const [parseModalOpen, setParseModalOpen] = useState(false)
  const [parsing, setParsing] = useState(false)
  const abortControllers = useRef<AbortController[]>([])
  const [playerOpen, setPlayerOpen] = useState(false)
  const [playerSrc, setPlayerSrc] = useState('')
  const [playerTitle, setPlayerTitle] = useState('')
  const [playerQualities, setPlayerQualities] = useState<{ id: number; url: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)

  // Resolve video when parseTarget changes
  useEffect(() => {
    if (parseTarget) {
      resolveVideo(parseTarget.idType, parseTarget.value)
    }
  }, [parseTarget?.idType, parseTarget?.value])

  const resolveVideo = async (idType: string, value: string | number) => {
    try {
      setLoading(true)
      setBtnLoading(true)

      if (idType === 'bv') {
        const info = await window.electronAPI.getVideoInfo(value as string)
        const result = biliApi.videoInfoToParseResult(info, value as string)
        setVideoData(result)
        setMode('video')
      } else if (idType === 'ep' || idType === 'ss') {
        const epid = idType === 'ep' ? (value as number) : 0
        const ssid = idType === 'ss' ? (value as number) : 0
        const info = await window.electronAPI.getSeasonInfo(epid, ssid)
        const result = biliApi.seasonInfoToParseResult(info, idType, value)
        setVideoData(result)
        setMode('season')
      } else if (idType === 'fav') {
        const list = await window.electronAPI.getFavList(value as number)
        const result = biliApi.favListToParseResult(list)
        setVideoData(result)
        setMode('video')
      }
    } catch (err: any) {
      onError(err.message)
      setMode('hide')
    } finally {
      setLoading(false)
      setTimeout(() => setBtnLoading(false), 200)
    }
  }

  const handleStartParse = async (idType: string, value: string | number) => {
    if (typeof value === 'number') value = value.toString()
    await resolveVideo(idType, value)
  }

  const handleParseSelected = async () => {
    // Get selected pages from the currently active section
    const allSection = getSections()
    const currentPages = allSection[sectionActiveIndex]?.pages || videoData.pages
    const selectedPages = currentPages.filter(p => p.selected)
    if (selectedPages.length === 0) return

    clearErrors()
    resetModal()
    setTotalCount(selectedPages.length)
    setParseModalOpen(true)
    setParsing(true)

    let completed = 0
    const errors: string[] = []
    const items: any[] = []

    const queue = new (await import('p-queue')).default({ concurrency: 10 })

    for (const page of selectedPages) {
      queue.add(async () => {
        try {
          const controller = new AbortController()
          abortControllers.current.push(controller)
          const playInfo = await window.electronAPI.getPlayInfo(page.bvid, page.cid)
          playInfo.accept_quality = [...new Set(playInfo.dash.video.map((v: any) => v.id))].sort((a: any, b: any) => b - a)
          items.push({ page, info: playInfo, selected: true, formatIndex: 0 })
        } catch (err: any) {
          const badgeNotNum = !page.badge.match(/^\d+$/)
          errors.push(`${page.part}${badgeNotNum ? ` - ${page.badge}` : ''}`)
        } finally {
          completed++
          setFinishCount(completed)
        }
      })
    }

    await queue.onIdle()
    setAllPlayInfo(items)
    errors.forEach(e => addError(e))
    setParsing(false)
  }

  const handleDownload = async () => {
    const selectedItems = allPlayInfo.filter(i => i.selected)
    if (selectedItems.length === 0) return

    const tasks: TaskInitData[] = selectedItems.map(info => {
      const badgeNotNum = !info.page.badge.match(/^\d+$/)
      const isVideoMode = mode === 'video'
      const cardTitle = videoData.title
      const owner = videoData.staff.length > 0
        ? videoData.staff[0].split('[')[0].trim()
        : videoData.owner.name.trim()

      const fmt = info.info!.accept_quality[info.formatIndex]
      const activeVideo = getActiveVideo(info.info!, fmt, preferredCodec)
      const audioURL = getAudioURL(info.info!, preferHiResAudio)

      const titleParts = badgeNotNum
        ? [
            info.page.part.trim(),
            info.page.badge.trim(),
            `[${cardTitle.trim()}]`,
            `[${VideoFormatLabels[fmt as VideoFormat] || fmt}]`,
            `[${formatSeconds(info.info!.dash.duration)}]`,
          ].filter(Boolean)
        : [
            videoData.pages.length === 1 ? videoData.pages[0]?.badge || cardTitle : `[${cardTitle.trim()}]`,
            info.page.badge.trim() || '',
            info.page.part.trim(),
            isVideoMode ? `[${owner}]` : '',
            `[${VideoFormatLabels[fmt as VideoFormat] || fmt}]`,
            `[${formatSeconds(info.info!.dash.duration)}]`,
          ].filter(Boolean)

      return {
        bvid: info.page.bvid,
        cid: info.page.cid,
        format: fmt,
        cover: videoData.cover,
        title: titleParts.join(' '),
        owner,
        audio: audioURL,
        video: activeVideo.video,
        width: activeVideo.width,
        height: activeVideo.height,
        duration: info.info!.dash.duration,
        downloadType: downloadType,
      }
    })

    try {
      await window.electronAPI.createTask(tasks)
      setParseModalOpen(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const [playerAudioSrc, setPlayerAudioSrc] = React.useState('')

  const handlePlayEpisode = async (page: any) => {
    try {
      const playInfo = await window.electronAPI.getPlayUrl(page.bvid, page.cid)
      const qualities = playInfo.qualities || []
      const defaultQ = useSettingsStore.getState().defaultPlayQuality
      let selectedIdx = 0
      if (qualities.length > 1) {
        let best = qualities[0]
        for (const q of qualities) {
          if (q.id === defaultQ) { best = q; break }
          if (q.id > defaultQ && (best.id < defaultQ || q.id < best.id)) best = q
        }
        if (defaultQ > qualities[qualities.length - 1].id) best = qualities[qualities.length - 1]
        selectedIdx = qualities.indexOf(best)
      }
      const selectedQuality = qualities[selectedIdx]
      if (!selectedQuality) throw new Error('No suitable quality')

      setPlayerSrc(selectedQuality.url)
      setPlayerAudioSrc(playInfo.audioUrl || '')
      setPlayerTitle(page.part || videoData.title)
      setPlayerQualities(qualities)
      setPlayerOpen(true)
    } catch (err: any) {
      alert(t('parse.play_failed') + ': ' + err.message)
    }
  }

  const handlePlayerQualityChange = (url: string) => {
    setPlayerSrc(url)
  }

  const getSections = () => {
    // Always show the main pages first under "正片" for individual video parsing
    const mainSection = { title: '正片', pages: videoData.pages }
    if (mode === 'video') {
      // For single video: show main pages, then append collection sections if any
      return videoData.section.length > 0
        ? [mainSection, ...videoData.section]
        : [mainSection]
    }
    // For season: use the original logic (episodes as main + sections)
    return [mainSection].concat(videoData.section)
  }

  const allSection = getSections()
  const hasContent = mode !== 'hide' && !loading && !btnLoading

  return (
    <div className="parse-page">
      <button className="btn btn-ghost btn-sm back-btn" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>{t('parse.back')}</span>
      </button>

      <InputBox onStartParse={handleStartParse} />

      {loading && (
        <div className="loading-state">
          <Loader2 size={24} className="spin" />
        </div>
      )}

      {hasContent && (
        <>
          <VideoInfoCard />
          <VideoItemList
            onParseSelected={handleParseSelected}
            onPlayEpisode={handlePlayEpisode}
            sectionTabs={allSection}
            sectionActiveIndex={sectionActiveIndex}
            onSectionChange={setSectionActiveIndex}
          />
        </>
      )}

      {!loading && mode === 'hide' && !btnLoading && (
        <div className="parse-empty">
          <p>{t('home.input_placeholder')}</p>
        </div>
      )}

      <ParseModal
        open={parseModalOpen}
        onClose={() => {
          setParseModalOpen(false)
          abortControllers.current.forEach(c => c.abort())
          abortControllers.current = []
        }}
        onDownload={handleDownload}
      />

      <PlayerModal
        open={playerOpen}
        onClose={() => {
          setPlayerOpen(false)
          setPlayerSrc('')
          setPlayerAudioSrc('')
          setPlayerQualities([])
        }}
        src={playerSrc}
        audioSrc={playerAudioSrc}
        title={playerTitle}
        type="video"
        isOnline
        qualities={playerQualities}
        onQualityChange={handlePlayerQualityChange}
      />
    </div>
  )
}

function getActiveVideo(playInfo: any, format: VideoFormat, preferredCodec: 12 | 7 | 13 = 12): { video: string; width: number; height: number } {
  const codecOrder = [...new Set([preferredCodec, 12, 7, 13])]
  for (const code of codecOrder) {
    for (const item of playInfo.dash.video) {
      if (item.id === format && item.codecid === code) {
        return { video: item.baseUrl, width: item.width, height: item.height }
      }
    }
  }
  throw new Error('未找到对应视频分辨率格式')
}

function getAudioURL(playInfo: any, preferHiRes: boolean = true): string {
  if (preferHiRes && playInfo.dash.flac) {
    return playInfo.dash.flac.audio.baseUrl
  }
  return playInfo.dash.audio.sort((a: any, b: any) => b.id - a.id)[0]?.baseUrl || ''
}
