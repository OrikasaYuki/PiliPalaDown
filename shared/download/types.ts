/**
 * Platform-independent download types.
 * Each platform provides its own implementation.
 */

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
  status: 'waiting' | 'running' | 'done' | 'error'
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
