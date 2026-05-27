/**
 * Web adapter: implements ElectronAPI using HTTP fetch to Express backend
 */
import type { ElectronAPI, VideoInfo, SeasonInfo, PlayInfo, FavList, QRInfo, ActiveTask, TaskInDB, SettingsFields } from '../types'

const BASE = (window as any).__PILIPALADOWN_SERVER_URL || 'http://localhost:8098'

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  const body = await res.json()
  if (!body.success) throw new Error(body.message || 'Request failed')
  return body.data as T
}

async function apiPost<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.message || 'Request failed')
  return json.data as T
}

export function createWebApi(): ElectronAPI {
  return {
    // Auth
    getUserInfo: async () => {
      try {
        return await apiGet<{ name: string; face: string; mid: number; vipType: number; vipStatus: number }>('/api/getUserInfo')
      } catch { return null }
    },
    checkLogin: async () => {
      const res = await fetch(`${BASE}/api/checkLogin`)
      const body = await res.json()
      return body.success
    },
    getQRInfo: () => apiGet<QRInfo>('/api/getQRInfo'),
    getQRStatus: async (key: string) => {
      const res = await fetch(`${BASE}/api/getQRStatus?key=${encodeURIComponent(key)}`)
      return res.json()
    },
    logout: () => apiPost('/api/logout'),

    // Bilibili
    getVideoInfo: (bvid: string) => apiGet<VideoInfo>(`/api/getVideoInfo?bvid=${bvid}`),
    getSeasonInfo: (epid: number, ssid: number) => apiGet<SeasonInfo>(`/api/getSeasonInfo?epid=${epid}&ssid=${ssid}`),
    getPlayInfo: (bvid: string, cid: number) => apiGet<PlayInfo>(`/api/getPlayInfo?bvid=${bvid}&cid=${cid}`),
    getPopularVideos: () => apiGet<string[]>('/api/getPopularVideos'),
    getFavList: (mediaId: number) => apiGet<FavList>(`/api/getFavList?mediaId=${mediaId}`),
    getRedirectedLocation: (url: string) => apiGet<string>(`/api/getRedirectedLocation?url=${encodeURIComponent(url)}`),
    getSeasonsArchivesListFirstBvid: (mid: number, seasonId: number) =>
      apiGet<string>(`/api/getSeasonsArchivesListFirstBvid?mid=${mid}&seasonId=${seasonId}`),

    // Task
    createTask: (tasks: any[]) => apiPost('/api/createTask', tasks),
    getActiveTask: () => apiGet<ActiveTask[]>('/api/getActiveTask'),
    getTaskList: (page: number, pageSize: number) =>
      apiGet<TaskInDB[]>(`/api/getTaskList?page=${page}&pageSize=${pageSize}`),
    deleteTask: (id: number) => apiGet(`/api/deleteTask?id=${id}`),
    showFile: (filePath: string) => apiGet(`/api/showFile?filePath=${encodeURIComponent(filePath)}`),
    getDownloadUrl: (path: string) => `${BASE}/api/downloadVideo?path=${encodeURIComponent(path)}`,

    setTrayLocale: async () => {},
    onMenuAction: () => { const f = () => {}; return f },

    // Online playback
    getPlayUrl: (bvid: string, cid: number) =>
      apiGet<{ videoUrl: string; audioUrl: string; qualities: { id: number; url: string; label: string }[] }>(
        `/api/getPlayUrl?bvid=${bvid}&cid=${cid}`
      ),
    getStreamUrl: async (videoUrl: string, _audioUrl: string) => videoUrl, // Web mode: just return video URL

    // Settings
    getFields: () => apiGet<SettingsFields>('/api/getFields'),
    saveFields: (fields: [string, string][]) => apiPost('/api/saveFields', fields),

    // App
    getGpuStatus: async () => ({ enabled: false }),
    setGpuEnabled: async () => ({ success: true, needsRestart: false }),
    relaunch: async () => {},
    quit: () => apiPost('/api/quit'),
    getAppVersion: async () => '1.0.0',
  }
}
