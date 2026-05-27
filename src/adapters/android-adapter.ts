/**
 * Android adapter: implements ElectronAPI using:
 * - shared/bilibili/ for Bilibili API calls (platform-independent)
 * - Capacitor plugins for filesystem, QR, dialogs
 * - Android-specific download + FFmpeg WASM
 */
import { Filesystem, Directory } from '@capacitor/filesystem'
import { BiliClient } from '../../shared/bilibili/client'
import * as biliVideo from '../../shared/bilibili/video'
import * as biliAuth from '../../shared/bilibili/auth'
import * as QRCode from 'qrcode'
import * as Storage from './android/storage'
import * as Download from './android/download'
import type { ElectronAPI } from '../types'

export async function createAndroidApi(): Promise<ElectronAPI> {
  // Restore saved SESSDATA
  const sd = await Storage.getSessdata()
  const client = new BiliClient(sd || undefined)

  return {
    // ===== Auth =====
    async checkLogin() {
      return biliAuth.checkLogin(client)
    },

    async getUserInfo() {
      return biliAuth.getUserInfo(client)
    },

    async getQRInfo() {
      const info = await biliAuth.getQRInfo(client)
      const image = await QRCode.toDataURL(info.url, { width: 280, margin: 1, color: { dark: '#000', light: '#fff' } })
      return { image, key: info.qrcode_key }
    },

    async getQRStatus(key: string) {
      return biliAuth.pollQRLogin(client, key, async (sd) => {
        await Storage.saveSessdata(sd)
      })
    },

    async logout() {
      client.setSessdata('')
      await Storage.clearSessdata()
    },

    // ===== Bilibili =====
    getVideoInfo: (bvid) => biliVideo.getVideoInfo(client, bvid),
    getSeasonInfo: (epid, ssid) => biliVideo.getSeasonInfo(client, epid, ssid),
    getPlayInfo: (bvid, cid) => biliVideo.getPlayInfo(client, bvid, cid),
    getPopularVideos: () => biliVideo.getPopularVideos(client),
    getFavList: (mediaId) => biliVideo.getFavList(client, mediaId),
    getRedirectedLocation: async (url: string) => {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
      return res.url
    },
    getSeasonsArchivesListFirstBvid: (mid, seasonId) =>
      biliVideo.getSeasonsArchivesListFirstBvid(client, mid, seasonId),

    // ===== Task =====
    createTask: async (tasks) => { await Download.createTasks(tasks) },
    getActiveTask: () => Promise.resolve(Download.getActiveTasks().map(t => ({
      ...t, format: t.format as any, status: t.status as any,
    })) as any),
    getTaskList: (page, pageSize) => Storage.getTaskList(page, pageSize),
    deleteTask: async (id) => { await Download.deleteTask(id) },
    showFile: async () => { /* No file manager on Android from WebView */ },
    getDownloadUrl: () => '',

    // ===== Settings =====
    async getFields() {
      const fields = await Storage.getFields(['download_folder'])
      return fields as any
    },
    async saveFields(data: [string, string][]) {
      await Storage.saveFields(data)
      return '保存成功'
    },

    // ===== App =====
    async quit() {
      // Android — can't quit, just hide
    },
    async getAppVersion() {
      try {
        const pkg = await Filesystem.readFile({ path: 'package.json', directory: Directory.Data })
        return JSON.parse(pkg.data as string).version || '1.0.0'
      } catch { return '1.0.0' }
    },

    log: async () => {},

    // ===== Online Playback =====
    async getPlayUrl(bvid: string, cid: number) {
      const playInfo = await biliVideo.getPlayInfo(client, bvid, cid)
      const labels: Record<number, string> = {
        6: '240P', 16: '360P', 32: '480P', 64: '720P',
        74: '720P60', 80: '1080P', 112: '1080P+', 116: '1080P60',
        120: '4K', 125: 'HDR', 126: '杜比', 127: '8K',
      }
      const codecOrder = [12, 7, 13]
      const qMap = new Map<number, { url: string; codecid: number }>()
      for (const v of playInfo.dash.video) {
        if (!qMap.has(v.id)) qMap.set(v.id, { url: v.baseUrl, codecid: v.codecid })
        else {
          const existing = qMap.get(v.id)!
          if (codecOrder.indexOf(v.codecid) < codecOrder.indexOf(existing.codecid))
            qMap.set(v.id, { url: v.baseUrl, codecid: v.codecid })
        }
      }
      let audioUrl = ''
      if (playInfo.dash.flac?.audio?.baseUrl) audioUrl = playInfo.dash.flac.audio.baseUrl
      else if (playInfo.dash.audio?.length) audioUrl = playInfo.dash.audio.sort((a: any, b: any) => b.id - a.id)[0].baseUrl

      const qualities = Array.from(qMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([id, { url }]) => ({ id, url, label: labels[id] || `Q${id}` }))

      return { videoUrl: qualities[0]?.url || '', audioUrl, qualities }
    },
    getStreamUrl: async (videoUrl, audioUrl) => ({ videoProxyUrl: videoUrl, audioProxyUrl: audioUrl }),

    // ===== Tray (no-op on Android) =====
    setTrayLocale: async () => {},
    onMenuAction: () => { const f = () => {}; return f },

    // ===== GPU =====
    getGpuStatus: async () => ({ enabled: false }),
    setGpuEnabled: async () => ({ success: true, needsRestart: false }),
    relaunch: async () => {},
  }
}
