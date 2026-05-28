/**
 * Android adapter: implements ElectronAPI using:
 * - shared/bilibili/ for Bilibili API calls (platform-independent)
 * - Capacitor plugins for filesystem, QR, dialogs
 * - Android-specific download + FFmpeg WASM
 */
import { CapacitorHttp } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import * as biliVideo from '../../shared/bilibili/video'
import * as biliAuth from '../../shared/bilibili/auth'
import * as QRCode from 'qrcode'
import * as Storage from './android/storage'
import * as Download from './android/download'
import OpenFile from './android/openfile'
import NativeDownload from './android/nativedownload'
import { AndroidBiliClient } from './android/bili-client'
import type { ElectronAPI } from '../types'

export async function createAndroidApi(): Promise<ElectronAPI> {
  // Fix stuck tasks from previous session
  await Storage.fixStuckTasks()

  // Restore saved SESSDATA
  const sd = await Storage.getSessdata()
  const client = new AndroidBiliClient(sd || undefined)
  // Shared modules expect BiliClient type — duck-typed cast
  const c = client as any
  // Sync SESSDATA to download manager (DASH URLs require auth)
  if (sd) Download.setSessdata(sd)

  return {
    // ===== Auth =====
    async checkLogin() {
      return biliAuth.checkLogin(c)
    },

    async getUserInfo() {
      return biliAuth.getUserInfo(c)
    },

    async getQRInfo() {
      try {
        const info = await biliAuth.getQRInfo(c)
        const image = await QRCode.toDataURL(info.url, { width: 280, margin: 1, color: { dark: '#000', light: '#fff' } })
        return { image, key: info.qrcode_key }
      } catch (err) {
        console.error('[Android] getQRInfo failed:', err)
        throw err
      }
    },

    async getQRStatus(key: string) {
      // Use CapacitorHttp directly to bypass CORS (pollQRLogin uses fetch())
      try {
        const res = await client.getWithHeaders<any>('https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=' + key)
        const data = res.data
        if (data.code !== 0) return { success: false, message: data.message || 'API error' }
        if (data.data.code === 0) {
          const setCookie = res.headers['set-cookie'] || res.headers['Set-Cookie'] || ''
          const match = setCookie.match(/SESSDATA=([^;]+)/)
          if (match) {
            client.setSessdata(match[1])
            Download.setSessdata(match[1])
            await Storage.saveSessdata(match[1])
            return { success: true, message: '登录成功' }
          }
          return { success: false, message: '获取登录信息失败' }
        }
        const messages: Record<number, string> = {
          [-1]: '二维码已过期', [-2]: '二维码已失效',
          [-4]: '未扫码', [-5]: '已扫码，请点击确认',
        }
        return { success: false, message: messages[data.data.code] || `状态码: ${data.data.code}` }
      } catch (err: any) {
        return { success: false, message: err.message || '获取二维码状态失败' }
      }
    },

    async logout() {
      client.setSessdata('')
      await Storage.clearSessdata()
    },

    // ===== Bilibili =====
    getVideoInfo: (bvid) => biliVideo.getVideoInfo(c, bvid),
    getSeasonInfo: (epid, ssid) => biliVideo.getSeasonInfo(c, epid, ssid),
    getPlayInfo: (bvid, cid) => biliVideo.getPlayInfo(c, bvid, cid),
    getPopularVideos: () => biliVideo.getPopularVideos(c),
    getFavList: (mediaId) => biliVideo.getFavList(c, mediaId),
    getRedirectedLocation: async (url: string) => {
      try {
        const res = await CapacitorHttp.get({ url })
        return res.url || url
      } catch {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
        return res.url
      }
    },
    getSeasonsArchivesListFirstBvid: (mid, seasonId) =>
      biliVideo.getSeasonsArchivesListFirstBvid(c, mid, seasonId),

    // ===== Task =====
    createTask: async (tasks) => { await Download.createTasks(tasks) },
    getActiveTask: () => Promise.resolve(Download.getActiveTasks().map(t => ({
      ...t, format: t.format as any, status: t.status as any,
    })) as any),
    getTaskList: (page, pageSize) => Storage.getTaskList(page, pageSize),
    deleteTask: async (id) => { await Download.deleteTask(id) },
    showFile: async (path: string) => {
      try {
        const fileName = path.split(/[/\\]/).pop() || path
        await OpenFile.openFile({ displayName: fileName })
      } catch (err) {
        console.warn('Could not open file:', err)
      }
    },
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
      try {
        const { App } = await import('@capacitor/app')
        await App.exitApp()
      } catch { /* not available on older Capacitor */ }
    },
    async getAppVersion() {
      try {
        const { App } = await import('@capacitor/app')
        const info = await App.getInfo()
        return info.version || '1.0.0'
      } catch { return '1.0.0' }
    },

    log: async (msg: string) => {
      const line = `[${new Date().toISOString()}] [Android] ${msg}`
      console.log(line)
      try {
        const logs = JSON.parse(sessionStorage.getItem('pilipaladown-logs') || '[]')
        logs.push(line)
        if (logs.length > 200) logs.splice(0, logs.length - 200)
        sessionStorage.setItem('pilipaladown-logs', JSON.stringify(logs))
      } catch {}
    },

    // ===== Online Playback =====
    async getPlayUrl(bvid: string, cid: number) {
      const playInfo = await biliVideo.getPlayInfo(c, bvid, cid)
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

    // ===== Cache =====
    getCacheSize: async () => {
      try {
        return await NativeDownload.getCacheSize()
      } catch { return { size: 0 } }
    },
    clearCache: async () => {
      try {
        return await NativeDownload.clearCache()
      } catch { return { deleted: 0 } }
    },
  }
}
