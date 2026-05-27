// ===== Video Types =====

export type VideoFormat = 6 | 16 | 32 | 64 | 74 | 80 | 112 | 116 | 120 | 125 | 126 | 127

export const VideoFormatLabels: Record<VideoFormat, string> = {
  6: '240P 极速',
  16: '360P 流畅',
  32: '480P 清晰',
  64: '720P 高清',
  74: '720P60 高帧率',
  80: '1080P 高清',
  112: '1080P+ 高码率',
  116: '1080P60 高帧率',
  120: '4K 超清',
  125: 'HDR 真彩色',
  126: '杜比视界',
  127: '8K 超高清',
}

export interface VideoInfo {
  aid: number
  bvid: string
  title: string
  desc: string
  pic: string
  duration: number
  pubdate: number
  owner: { mid: number; name: string; face: string }
  dimension: { width: number; height: number; rotate: number }
  pages: PageInfo[]
  staff: StaffItem[] | null
  ugc_season?: {
    title: string
    sections: { title: string; episodes: { title: string; bvid: string; pages: PageInfo[] }[] }[] | null
  }
}

export interface PageInfo {
  cid: number
  page: number
  part: string
  duration: number
  dimension: { width: number; height: number; rotate: number }
}

export interface SeasonInfo {
  title: string
  cover: string
  evaluate: string
  season_id: number
  season_title: string
  actors: string
  styles: string[]
  episodes: Episode[]
  section: { title: string; episodes: Episode[] }[] | null
  new_ep: { desc: string; is_new: number }
  publish: { is_finish: number; pub_time: string }
  areas: { id: number; name: string }[]
}

export interface Episode {
  aid: number
  bvid: string
  cid: number
  title: string
  long_title: string
  cover: string
  duration: number
  ep_id: number
  dimension: { width: number; height: number; rotate: number }
}

export interface PlayInfo {
  accept_quality: VideoFormat[]
  dash: {
    duration: number
    video: MediaInfo[]
    audio: MediaInfo[]
    flac: { audio: MediaInfo } | null
  }
}

export interface MediaInfo {
  id: number
  baseUrl: string
  backupUrl: string[]
  bandwidth: number
  mimeType: string
  codecs: string
  width: number
  height: number
  frameRate: string
  codecid: number
}

export interface FavListItem {
  title: string
  cover: string
  intro: string
  duration: number
  upper: { mid: number; name: string; face: string }
  pubtime: number
  bvid: string
  ugc: { first_cid: number }
}

export type FavList = FavListItem[]

export interface StaffItem {
  mid: number
  title: string
  name: string
  face: string
}

// ===== Task Types =====

export interface TaskInitData {
  bvid: string
  cid: number
  format: VideoFormat
  title: string
  owner: string
  cover: string
  audio: string
  video: string
  width: number
  height: number
  duration: number
  downloadType: 'audio' | 'video' | 'merge'
}

export interface TaskInDB extends TaskInitData {
  id: number
  folder: string
  createAt: string
  status: TaskStatus
}

export type TaskStatus = 'done' | 'waiting' | 'running' | 'error'

export interface ActiveTask {
  id: number
  bvid: string
  cid: number
  format: VideoFormat
  title: string
  owner: string
  cover: string
  status: TaskStatus
  folder: string
  audioProgress: number
  videoProgress: number
  mergeProgress: number
  duration: number
  phase: 'downloading_audio' | 'downloading_video' | 'merging' | 'done' | ''
  totalBytes: number
  downloadedBytes: number
  speedBytesPerSec: number
}

// ===== Parse Result =====

export interface PageParseResult {
  cid: number
  bvid: string
  page: number
  part: string
  duration: number
  dimension: { width: number; height: number; rotate: number }
  badge: string
  selected: boolean
  multiPage?: boolean
  pageLabel?: string
}

export interface SectionItem {
  title: string
  pages: PageParseResult[]
}

export interface VideoParseResult {
  title: string
  description: string
  cover: string
  publishData: string
  duration: number
  pages: PageParseResult[]
  section: SectionItem[]
  owner: { mid: number; name: string; face: string }
  dimension: { width: number; height: number; rotate: number }
  staff: string[]
  status: string
  areas: string[]
  styles: string[]
  targetURL: string
}

// ===== Auth Types =====

export interface QRInfo {
  image: string
  key: string
}

export interface QRStatus {
  code: number
  message: string
}

// ===== Settings =====

export interface SettingsFields {
  download_folder: string
}

// ===== API Response =====

export interface ApiResponse<T = null> {
  success: boolean
  data: T
  message: string
}

// ===== ElectronAPI (Platform Abstraction) =====

export interface ElectronAPI {
  // Auth
  checkLogin(): Promise<boolean>
  getUserInfo(): Promise<{ name: string; face: string; mid: number; vipType: number; vipStatus: number } | null>
  getQRInfo(): Promise<QRInfo>
  getQRStatus(key: string): Promise<{ success: boolean; message: string }>
  logout(): Promise<void>

  // Bilibili
  getVideoInfo(bvid: string): Promise<VideoInfo>
  getSeasonInfo(epid: number, ssid: number): Promise<SeasonInfo>
  getPlayInfo(bvid: string, cid: number): Promise<PlayInfo>
  getPopularVideos(): Promise<string[]>
  getFavList(mediaId: number): Promise<FavList>
  getRedirectedLocation(url: string): Promise<string>
  getSeasonsArchivesListFirstBvid(mid: number, seasonId: number): Promise<string>

  // Tray
  setTrayLocale(locale: string): Promise<void>
  onMenuAction(callback: (action: string) => void): () => void

  // Online playback
  getPlayUrl(bvid: string, cid: number): Promise<{ videoUrl: string; audioUrl: string; qualities: { id: number; url: string; label: string }[] }>
  getStreamUrl(videoUrl: string, audioUrl: string): Promise<string>

  // Task
  createTask(tasks: TaskInitData[]): Promise<void>
  getActiveTask(): Promise<ActiveTask[] | null>
  getTaskList(page: number, pageSize: number): Promise<TaskInDB[]>
  deleteTask(id: number): Promise<void>
  showFile(path: string): Promise<void>
  getDownloadUrl(path: string): string

  // Settings
  getFields(): Promise<SettingsFields>
  saveFields(fields: [string, string][]): Promise<string>

  // App
  getGpuStatus(): Promise<{ enabled: boolean }>
  setGpuEnabled(enabled: boolean): Promise<{ success: boolean; needsRestart: boolean }>
  relaunch(): Promise<void>
  quit(): Promise<void>
  getAppVersion(): Promise<string>
}
