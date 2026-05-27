import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  // Auth
  checkLogin: () => ipcRenderer.invoke('auth:check-login'),
  getUserInfo: () => ipcRenderer.invoke('auth:get-user-info'),
  getQRInfo: () => ipcRenderer.invoke('auth:get-qr-info'),
  getQRStatus: (key: string) => ipcRenderer.invoke('auth:get-qr-status', key),
  logout: () => ipcRenderer.invoke('auth:logout'),

  // Bilibili
  getVideoInfo: (bvid: string) => ipcRenderer.invoke('bilibili:get-video-info', bvid),
  getSeasonInfo: (epid: number, ssid: number) => ipcRenderer.invoke('bilibili:get-season-info', epid, ssid),
  getPlayInfo: (bvid: string, cid: number) => ipcRenderer.invoke('bilibili:get-play-info', bvid, cid),
  getPopularVideos: () => ipcRenderer.invoke('bilibili:get-popular'),
  getFavList: (mediaId: number) => ipcRenderer.invoke('bilibili:get-fav-list', mediaId),
  getRedirectedLocation: (url: string) => ipcRenderer.invoke('bilibili:get-redirected-location', url),
  getSeasonsArchivesListFirstBvid: (mid: number, seasonId: number) => ipcRenderer.invoke('bilibili:get-seasons-archives-first', mid, seasonId),

  // Task
  createTask: (tasks: any[]) => ipcRenderer.invoke('task:create', tasks),
  getActiveTask: () => ipcRenderer.invoke('task:get-active'),
  getTaskList: (page: number, pageSize: number) => ipcRenderer.invoke('task:get-list', page, pageSize),
  deleteTask: (id: number) => ipcRenderer.invoke('task:delete', id),
  showFile: (path: string) => ipcRenderer.invoke('task:show-file', path),
  // Online playback
  getPlayUrl: (bvid: string, cid: number) =>
    ipcRenderer.invoke('video:get-play-url', bvid, cid),
  getStreamUrl: (videoUrl: string, audioUrl: string) =>
    ipcRenderer.invoke('video:get-stream-url', videoUrl, audioUrl),

  // Logging
  log: (msg: string) => ipcRenderer.invoke('log:write', msg),

  // Tray locale sync
  setTrayLocale: (locale: string) => ipcRenderer.invoke('tray:set-locale', locale),
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: any, action: string) => callback(action)
    ipcRenderer.on('menu:action', handler)
    return () => { ipcRenderer.removeListener('menu:action', handler) }
  },

  getDownloadUrl: (filePath: string) =>
    `file:///${filePath.replace(/\\/g, '/').replace(/^\//, '')}`,

  // Settings
  getFields: () => ipcRenderer.invoke('settings:get-fields'),
  saveFields: (fields: [string, string][]) => ipcRenderer.invoke('settings:save-fields', fields),

  // App
  getGpuStatus: () => ipcRenderer.invoke('gpu:get-status'),
  setGpuEnabled: (enabled: boolean) => ipcRenderer.invoke('gpu:set-enabled', enabled),
  relaunch: () => ipcRenderer.invoke('app:relaunch'),
  quit: () => ipcRenderer.invoke('app:quit'),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
