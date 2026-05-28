/**
 * Platform-independent download types.
 * Each platform provides its own implementation.
 */

// ===== Shared Download Types (Single Source of Truth) =====

export type TaskStatus = 'done' | 'waiting' | 'running' | 'error'

export interface TaskInitData {
  bvid: string
  cid: number
  format: number
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

export interface ActiveTask {
  id: number
  bvid: string
  cid: number
  format: number
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
  errorMessage?: string
}

export interface DownloadTask {
  id: number
  bvid: string
  cid: number
  title: string
  owner: string
  cover: string
  audioUrl: string
  videoUrl: string
  format: number
  width: number
  height: number
  duration: number
  downloadType: 'audio' | 'video' | 'merge'
  status: TaskStatus
  folder: string
  audioProgress: number
  videoProgress: number
  mergeProgress: number
  totalBytes: number
  downloadedBytes: number
  speedBytesPerSec: number
  phase: '' | 'downloading_audio' | 'downloading_video' | 'merging' | 'done'
  errorMessage?: string
  createAt: string
}

/** Each platform implements this interface */
export interface DownloadBackend {
  createTasks(tasks: DownloadTask[]): Promise<number[]>
  getActiveTasks(): Promise<DownloadTask[]>
  getTaskList(page: number, pageSize: number): Promise<DownloadTask[]>
  deleteTask(id: number): Promise<void>
}

/** Each platform implements a merge function */
export type MergeFn = (
  videoPath: string, audioPath: string, outputPath: string, duration: number,
  onProgress?: (pct: number) => void
) => Promise<void>
