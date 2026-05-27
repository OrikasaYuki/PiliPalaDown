/**
 * Client-side URL parsing helpers
 */
import type { VideoParseResult, PageParseResult, VideoInfo, SeasonInfo, Episode, FavList } from '../types'

export type IDType = 'bv' | 'ep' | 'ss' | 'fav'

/**
 * Parse user input to extract video ID type and value
 */
export function checkURL(url: string): { type: IDType; value: string | number } {
  const matchBvid = url.match(/^(?:https?:\/\/www\.bilibili\.com\/video\/)?(BV1[a-zA-Z0-9]+)/)
  if (matchBvid) return { type: 'bv', value: matchBvid[1] }

  const matchSeason = url.match(/^(?:https?:\/\/www\.bilibili\.com\/bangumi\/play\/)?(ep|ss)(\d+)/)
  if (matchSeason) return { type: matchSeason[1] as 'ep' | 'ss', value: parseInt(matchSeason[2]) }

  try {
    const _url = new URL(url)
    const mediaId = parseInt(_url.searchParams.get('fid') || '')
    if (_url.hostname === 'space.bilibili.com' && _url.pathname.match(/^\/\d+\/favlist$/) && !isNaN(mediaId)) {
      return { type: 'fav', value: mediaId }
    }
    const mlMatch = url.match(/^https:\/\/www\.bilibili\.com\/medialist\/detail\/ml(\d+)/)
    if (mlMatch) return { type: 'fav', value: parseInt(mlMatch[1]) }
  } catch {}

  throw new Error('输入的视频链接格式错误')
}

/**
 * Handle b23.tv short URLs
 */
export async function handleB23(url: string): Promise<string | false> {
  if (!url.match(/^https:\/\/b23\.tv\//)) return false
  const epMatch = url.match(/^https:\/\/b23\.tv\/(ep|ss)(\d+)/)
  if (epMatch) return `https://www.bilibili.com/bangumi/play/${epMatch[1]}${epMatch[2]}`
  const location = await window.electronAPI.getRedirectedLocation(url)
  return location
}

/**
 * Handle seasons archives list URLs
 */
export async function handleSeasonsArchivesList(url: string): Promise<string | false> {
  try { new URL(url) } catch { return false }
  const _url = new URL(url)
  const mid = _url.pathname.match(/^\/(\d+)\/channel\/collectiondetail$/)?.[1]
  const seasonId = parseInt(_url.searchParams.get('sid') || '')
  if (_url.hostname === 'space.bilibili.com' && mid && !isNaN(seasonId)) {
    return window.electronAPI.getSeasonsArchivesListFirstBvid(parseInt(mid), seasonId)
  }
  return false
}

/**
 * Convert VideoInfo to VideoParseResult
 */
export function videoInfoToParseResult(info: VideoInfo, bvid: string): VideoParseResult {
  return {
    section: (info.ugc_season?.sections || []).map((s) => {
      let episodeCounter = 0
      let pageCounter = 0
      return {
        title: (info.ugc_season?.sections || []).length === 1 ? (info.ugc_season?.title || s.title) : s.title,
        pages: s.episodes.flatMap((ep) => {
          episodeCounter++
          const isMultiPage = ep.pages.length > 1
          return ep.pages.map((p, pageIdx) => {
            pageCounter++
            const pageTitle = p.part && p.part !== ep.title ? p.part : (p.part || ep.title)
            return {
              bvid: ep.bvid,
              cid: p.cid,
              dimension: p.dimension,
              duration: p.duration,
              page: pageCounter,
              part: isMultiPage ? `${pageTitle}` : (ep.title === p.part ? ep.title : (p.part || ep.title)),
              badge: episodeCounter.toString(),
              selected: bvid === ep.bvid,
              multiPage: isMultiPage,
              pageLabel: isMultiPage ? `P${pageIdx + 1}` : '',
            } as PageParseResult
          })
        }),
      }
    }),
    targetURL: `https://www.bilibili.com/video/${bvid}`,
    areas: [],
    styles: [],
    status: '',
    cover: info.pic,
    title: info.title,
    description: info.desc,
    publishData: new Date(info.pubdate * 1000).toLocaleString(),
    duration: info.duration,
    pages: info.pages.map((page, index) => ({
      ...page,
      bvid,
      badge: (index + 1).toString(),
      selected: info.pages.length === 1,
    })),
    dimension: info.dimension,
    owner: info.owner,
    staff: info.staff?.map((s) => `${s.name}[${s.title}]`) || [],
  }
}

/**
 * Convert SeasonInfo to VideoParseResult
 */
export function seasonInfoToParseResult(info: SeasonInfo, idType: string, value: string | number): VideoParseResult {
  const episodeToPage = (ep: Episode, index: number): PageParseResult => ({
    bvid: ep.bvid,
    cid: ep.cid,
    dimension: ep.dimension,
    duration: ep.duration,
    page: index + 1,
    part: ep.long_title || (ep.title.match(/^\d+$/) ? `第 ${ep.title} 集` : ep.title),
    badge: ep.title.match(/^\d+$/) ? `EP${ep.title}` : ep.title,
    selected: false,
  })

  return {
    section: (info.section || []).map((s) => ({
      pages: s.episodes.map(episodeToPage),
      title: s.title,
    })),
    targetURL: `https://www.bilibili.com/bangumi/play/${idType}${value}`,
    areas: info.areas.map((a) => a.name),
    styles: info.styles,
    duration: 0,
    cover: info.cover,
    description: info.evaluate,
    owner: { name: info.actors, face: '', mid: 0 },
    pages: info.episodes.map(episodeToPage),
    status: info.new_ep.desc,
    publishData: info.publish?.pub_time || '',
    staff: info.actors?.split('\n') || [],
    dimension: { height: 0, rotate: 0, width: 0 },
    title: info.title,
  }
}

/**
 * Convert FavList to VideoParseResult
 */
export function favListToParseResult(list: FavList): VideoParseResult {
  return {
    areas: [],
    cover: list[0]?.cover || '',
    description: list[0]?.intro || '',
    dimension: { height: 0, width: 0, rotate: 0 },
    duration: list[0]?.duration || 0,
    owner: list[0]?.upper || { mid: 0, name: '', face: '' },
    pages: list.map((info, index) => ({
      badge: (index + 1).toString(),
      selected: index === 0,
      bvid: info.bvid,
      cid: info.ugc.first_cid,
      dimension: { height: 0, width: 0, rotate: 0 },
      duration: info.duration,
      page: index,
      part: info.title,
    })),
    publishData: list[0]?.pubtime ? new Date(list[0].pubtime * 1000).toLocaleString() : '',
    section: [],
    staff: [],
    status: '',
    styles: [],
    targetURL: `https://www.bilibili.com/video/${list[0]?.bvid || ''}`,
    title: list[0]?.title || '',
  }
}

export function secondToTime(second: number): string {
  return `${Math.floor(second / 60)}:${(second % 60).toString().padStart(2, '0')}`
}

export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  let str = ''
  if (h > 0) str += `${h}时`
  if (m > 0) str += `${m}分`
  if (s > 0) str += `${s}秒`
  return str
}
