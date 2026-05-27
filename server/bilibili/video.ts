import { BiliClient } from './client'
import { signParams } from './wbi'
import type { VideoInfo, SeasonInfo, PlayInfo, FavList } from '../../src/types'

export async function getVideoInfo(client: BiliClient, bvid: string): Promise<VideoInfo> {
  const params = await signParams(client, { bvid })
  const res = await client.get<any>('https://api.bilibili.com/x/web-interface/wbi/view', params)
  return res.data as VideoInfo
}

export async function getSeasonInfo(client: BiliClient, epid: number, ssid: number): Promise<SeasonInfo> {
  const params: Record<string, string> = {}
  if (epid) params.ep_id = epid.toString()
  if (ssid) params.season_id = ssid.toString()
  const res = await client.get<any>('https://api.bilibili.com/pgc/view/web/season', params)
  return (res.result || res.data) as SeasonInfo
}

export async function getPlayInfo(client: BiliClient, bvid: string, cid: number): Promise<PlayInfo> {
  const params = await signParams(client, {
    bvid,
    cid: cid.toString(),
    fnval: '4048',
    fnver: '0',
    fourk: '1',
  })
  const res = await client.get<any>('https://api.bilibili.com/x/player/playurl', params)
  return res.data as PlayInfo
}

export async function getPopularVideos(client: BiliClient): Promise<string[]> {
  const urls = [
    'https://api.bilibili.com/x/web-interface/popular',
    'https://api.bilibili.com/x/web-interface/popular/precious',
    'https://api.bilibili.com/x/web-interface/ranking/v2',
  ]

  // Fetch all 3 sources in parallel for maximum variety
  const results = await Promise.allSettled(
    urls.map((url) => client.get<any>(url))
  )

  // Collect all BVIDs, deduplicate, shuffle
  const seen = new Set<string>()
  const allBvids: string[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const list: any[] = result.value.data?.list || []
      for (const v of list) {
        if (v.bvid && !seen.has(v.bvid)) {
          seen.add(v.bvid)
          allBvids.push(v.bvid)
        }
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = allBvids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allBvids[i], allBvids[j]] = [allBvids[j], allBvids[i]]
  }

  return allBvids
}

export async function getFavList(client: BiliClient, mediaId: number): Promise<FavList> {
  let page = 0
  let allItems: FavList = []

  while (true) {
    const params = await signParams(client, {
      media_id: mediaId.toString(),
      pn: (page + 1).toString(),
      ps: '40',
      order: 'mtime',
      type: '0',
      tid: '0',
      platform: 'web',
    })
    const res = await client.get<any>('https://api.bilibili.com/x/v3/fav/resource/list', params)
    const data = res.data
    const medias: FavList = data.medias || []
    allItems = allItems.concat(medias)
    if (!data.has_more) break
    page++
  }

  return allItems
}

export async function getSeasonsArchivesListFirstBvid(client: BiliClient, mid: number, seasonId: number): Promise<string> {
  const params = await signParams(client, {
    mid: mid.toString(),
    season_id: seasonId.toString(),
    page_num: '1',
    page_size: '1',
  })
  const res = await client.get<any>('https://api.bilibili.com/x/polymer/web-space/seasons_archives_list', params)
  const archives = res.data?.archives || []
  if (archives.length === 0) throw new Error('视频列表为空')
  return archives[0].bvid
}
