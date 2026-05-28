import { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, nativeImage } from 'electron'
import zh from '../src/i18n/zh.json'
import en from '../src/i18n/en.json'
import ja from '../src/i18n/ja.json'
import path from 'path'
import fs from 'fs'
import os from 'os'
import * as QRCode from 'qrcode'
import { BiliClient } from '../server/bilibili/client'
import * as biliVideo from '../server/bilibili/video'
import * as biliAuth from '../server/bilibili/auth'
import { createTasks, getActiveTasks, deleteTask as deleteManagedTask, checkFFmpeg } from '../server/task/manager'
import { getFields, saveFields as dbSaveFields, getTaskList, getSessdata, fixStuckTasks } from '../server/util/db'
import { log as fileLog } from '../server/util/logger'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let currentLocale: string = 'zh'

// ===== GPU Settings (must be read before app.whenReady) =====
const gpuSettingsPath = path.join(os.homedir(), '.pilipaladown', 'gpu.json')
let gpuEnabled = false

try {
  if (fs.existsSync(gpuSettingsPath)) {
    const g = JSON.parse(fs.readFileSync(gpuSettingsPath, 'utf-8'))
    gpuEnabled = g.enabled === true
  }
} catch {}

if (!gpuEnabled) {
  app.disableHardwareAcceleration()
}

const localeMessages: Record<string, any> = { zh, en, ja }

function t(key: string): string {
  const keys = key.split('.')
  let obj = localeMessages[currentLocale] || zh
  for (const k of keys) {
    if (obj == null) return key
    obj = obj[k]
  }
  return typeof obj === 'string' ? obj : key
}

function updateTrayMenu() {
  if (!tray) return
  const menu = Menu.buildFromTemplate([
    { label: t('tray.show_window'), click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' as const },
    { label: t('tray.quit'), click: () => app.quit() },
  ])
  tray.setContextMenu(menu)
}

function createTray() {
  // Try multiple paths for the icon (dev vs production)
  const iconPaths = [
    path.join(__dirname, '../public/icon-32.png'),           // dev
    path.join(app.getAppPath(), 'public', 'icon-32.png'),     // asar
    path.join(process.resourcesPath || '', 'icon-32.png'),    // extraResources
  ]
  let icon = nativeImage.createEmpty()
  for (const p of iconPaths) {
    if (fs.existsSync(p)) { icon = nativeImage.createFromPath(p).resize({ width: 16, height: 16 }); break }
  }
  tray = new Tray(icon)
  tray.setToolTip('PiliPalaDown')
  updateTrayMenu()
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'PiliPalaDown',
    backgroundColor: '#000000',
    icon: path.join(__dirname, '../public/icon-256.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function getClient(): BiliClient {
  const sd = getSessdata()
  return new BiliClient(sd || undefined)
}

// ===== IPC Handlers =====

function setupHandlers() {
  // Auth
  ipcMain.handle('auth:check-login', async () => {
    const client = getClient()
    return biliAuth.checkLogin(client)
  })

  ipcMain.handle('auth:get-qr-info', async () => {
    const client = getClient()
    const info = await biliAuth.getQRInfo(client)
    const image = await QRCode.toDataURL(info.url, { width: 280, margin: 1, color: { dark: '#000', light: '#fff' } })
    return { image, key: info.qrcode_key }
  })

  ipcMain.handle('auth:get-qr-status', async (_event, key: string) => {
    const client = getClient()
    return biliAuth.pollQRLogin(client, key)
  })

  ipcMain.handle('auth:get-user-info', async () => {
    const client = getClient()
    try {
      const res = await client.get<any>('https://api.bilibili.com/x/space/myinfo')
      const d = res.data
      // Bilibili API: data.vip.type (0=none, 1=monthly, 2=annual+), data.vip.status (0=expired, 1=active)
      return {
        name: d.name || '',
        face: d.face || '',
        mid: d.mid || 0,
        vipType: d.vip?.type || 0,
        vipStatus: d.vip?.status || 0,
      }
    } catch {
      return null
    }
  })

  ipcMain.handle('auth:logout', async () => {
    const client = getClient()
    biliAuth.logout(client)
  })

  // Bilibili
  ipcMain.handle('bilibili:get-video-info', async (_event, bvid: string) => {
    const client = getClient()
    return biliVideo.getVideoInfo(client, bvid)
  })

  ipcMain.handle('bilibili:get-season-info', async (_event, epid: number, ssid: number) => {
    const client = getClient()
    return biliVideo.getSeasonInfo(client, epid, ssid)
  })

  ipcMain.handle('bilibili:get-play-info', async (_event, bvid: string, cid: number) => {
    const client = getClient()
    return biliVideo.getPlayInfo(client, bvid, cid)
  })

  ipcMain.handle('bilibili:get-popular', async () => {
    const client = getClient()
    return biliVideo.getPopularVideos(client)
  })

  ipcMain.handle('bilibili:get-fav-list', async (_event, mediaId: number) => {
    const client = getClient()
    return biliVideo.getFavList(client, mediaId)
  })

  ipcMain.handle('bilibili:get-redirected-location', async (_event, url: string) => {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    return res.url
  })

  ipcMain.handle('bilibili:get-seasons-archives-first', async (_event, mid: number, seasonId: number) => {
    const client = getClient()
    return biliVideo.getSeasonsArchivesListFirstBvid(client, mid, seasonId)
  })

  // Task
  ipcMain.handle('task:create', async (_event, tasks: any[]) => {
    createTasks(tasks)
  })

  ipcMain.handle('task:get-active', async () => {
    return getActiveTasks()
  })

  ipcMain.handle('task:get-list', async (_event, page: number, pageSize: number) => {
    return getTaskList(page, pageSize)
  })

  ipcMain.handle('task:delete', async (_event, id: number) => {
    deleteManagedTask(id)
  })

  ipcMain.handle('task:show-file', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  // Settings
  ipcMain.handle('settings:get-fields', async () => {
    return getFields(['download_folder'])
  })

  ipcMain.handle('settings:save-fields', async (_event, fields: [string, string][]) => {
    // Validate download_folder
    for (const [name, value] of fields) {
      if (name === 'download_folder') {
        try {
          fs.mkdirSync(value, { recursive: true })
        } catch (err: any) {
          throw new Error(`目录创建失败：${err.message}`)
        }
      }
    }
    dbSaveFields(fields)
    return '保存成功'
  })

  // Tray i18n
  ipcMain.handle('tray:set-locale', async (_event, locale: string) => {
    currentLocale = locale
    updateTrayMenu()
  })

  // GPU acceleration
  ipcMain.handle('gpu:get-status', async () => {
    return { enabled: gpuEnabled }
  })

  ipcMain.handle('gpu:set-enabled', async (_event, enabled: boolean) => {
    gpuEnabled = enabled
    try {
      fs.mkdirSync(path.dirname(gpuSettingsPath), { recursive: true })
      fs.writeFileSync(gpuSettingsPath, JSON.stringify({ enabled }), 'utf-8')
    } catch {}
    return { success: true, needsRestart: true }
  })

  // Logging (from renderer)
  ipcMain.handle('log:write', async (_event, msg: string) => { fileLog(msg) })

  // App
  ipcMain.handle('app:quit', async () => {
    app.quit()
  })

  ipcMain.handle('app:relaunch', async () => {
    app.relaunch()
    app.exit(0)
  })

  ipcMain.handle('app:get-version', async () => {
    return app.getVersion()
  })

  // Video: get playable DASH URL with all available qualities for online streaming
  ipcMain.handle('video:get-play-url', async (_event, bvid: string, cid: number) => {
    fileLog(`[play] getPlayUrl bvid=${bvid} cid=${cid}`)
    const client = getClient()
    const playInfo = await biliVideo.getPlayInfo(client, bvid, cid)
    if (!playInfo.dash.video.length) throw new Error('No video stream available')

    const labels: Record<number, string> = {
      6: '240P', 16: '360P', 32: '480P', 64: '720P',
      74: '720P60', 80: '1080P', 112: '1080P+', 116: '1080P60',
      120: '4K', 125: 'HDR', 126: '杜比', 127: '8K',
    }

    const codecOrder = [12, 7, 13]
    const qualitiesMap = new Map<number, { url: string; codecid: number }>()

    for (const v of playInfo.dash.video) {
      if (!qualitiesMap.has(v.id)) {
        qualitiesMap.set(v.id, { url: v.baseUrl, codecid: v.codecid })
      } else {
        const existing = qualitiesMap.get(v.id)!
        if (codecOrder.indexOf(v.codecid) < codecOrder.indexOf(existing.codecid)) {
          qualitiesMap.set(v.id, { url: v.baseUrl, codecid: v.codecid })
        }
      }
    }

    const qualities = Array.from(qualitiesMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([id, { url }]) => ({ id, url, label: labels[id] || `Q${id}` }))

    // Get best audio URL (highest quality, prefer HiRes)
    let audioUrl = ''
    if (playInfo.dash.flac?.audio?.baseUrl) {
      audioUrl = playInfo.dash.flac.audio.baseUrl
    } else if (playInfo.dash.audio?.length) {
      audioUrl = playInfo.dash.audio.sort((a: any, b: any) => b.id - a.id)[0].baseUrl
    }

    fileLog(`[play] qualities: ${qualities.map(q => `${q.id}`).join(', ')} audioUrl: ${audioUrl ? 'yes' : 'no'}`)
    fileLog(`[play] best videoUrl: ${qualities[0]?.url?.slice(0, 80)}...`)
    return { videoUrl: qualities[0]?.url || '', audioUrl, qualities }
  })

  // Video: get stream URL (simple pass-through, no platform-specific deps)
  ipcMain.handle('video:get-stream-url', async (_event, videoUrl: string, _audioUrl: string) => {
    return videoUrl
  })
}

// Intercept Bilibili CDN requests to inject auth headers
let _webRequestSetup = false

function setupWebRequest() {
  if (_webRequestSetup || !mainWindow) return
  _webRequestSetup = true
  const sessdata = getSessdata()
  if (!sessdata) return

  // Add auth headers to Bilibili media CDN requests
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.bilivideo.com/*', '*://*.bilibili.com/*'] },
    (details, callback) => {
      const headers = { ...details.requestHeaders }
      if (!headers['Cookie']) {
        headers['Cookie'] = `SESSDATA=${sessdata}`
      }
      headers['Referer'] = 'https://www.bilibili.com'
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      callback({ requestHeaders: headers })
    }
  )
}

// ===== App Lifecycle =====

// GPU crash detection — auto-disable and restart
app.on('child-process-gone', (_event: any, details: any) => {
  if (details?.type !== 'GPU' || details?.reason === 'killed') return
  try { fs.writeFileSync(gpuSettingsPath, JSON.stringify({ enabled: false }), 'utf-8') } catch {}
  gpuEnabled = false
  app.relaunch()
  app.exit(0)
})

// Prevent multiple instances — must exit BEFORE any heavy init
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.exit(0)
  process.exit(0)
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

// Check ffmpeg on startup
app.whenReady().then(() => {
  // Fix stuck tasks from previous session
  fixStuckTasks()

  if (!checkFFmpeg()) {
    dialog.showErrorBox('FFmpeg 未安装',
      '请安装 FFmpeg 并将其添加到系统 PATH 中。\n\n下载地址：https://ffmpeg.org/download.html')
    app.quit()
    return
  }

  // Disable the default Electron menu bar
  Menu.setApplicationMenu(null)

  setupHandlers()
  createWindow()
  createTray()

  // Setup webRequest for Bilibili CDN auth
  setupWebRequest()

  // Minimize to tray instead of closing
  mainWindow!.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('before-quit', () => { isQuitting = true })
