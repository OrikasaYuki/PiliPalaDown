/**
 * Android download manager.
 * Uses fetch() for download + @ffmpeg/ffmpeg WASM for merge + Capacitor FS for save.
 */
import { CapacitorHttp } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import PQueue from 'p-queue'
import * as Storage from './storage'
import NativeDownload from './nativedownload'
import type { DownloadTask } from '../../../shared/download/types'

const downloadQueue = new PQueue({ concurrency: 2 })
const mergeQueue = new PQueue({ concurrency: 1 })

let _taskIdCounter = Date.now()
const _activeTasks = new Map<number, DownloadTask>()
let _sessdata = ''

/** Set SESSDATA for authenticating DASH stream downloads */
export function setSessdata(sd: string) {
  _sessdata = sd
}

/** Ensure the working directory exists */
async function ensureDir() {
  try {
    await Filesystem.mkdir({ path: 'PiliPalaDown', directory: Directory.Data, recursive: true })
  } catch {
    // Directory may already exist
  }
}

export async function createTasks(tasks: any[]): Promise<number[]> {
  await ensureDir()
  const ids: number[] = []
  for (const t of tasks) {
    const id = await Storage.createTask(t)
    ids.push(id)
    const task: DownloadTask = {
      id,
      bvid: t.bvid, cid: t.cid, format: t.format,
      title: t.title, owner: t.owner, cover: t.cover,
      audioUrl: t.audio, videoUrl: t.video,
      width: t.width, height: t.height, duration: t.duration,
      downloadType: t.downloadType,
      status: 'waiting', folder: 'PiliPalaDown',
      audioProgress: 0, videoProgress: 0, mergeProgress: 0,
      totalBytes: 0, downloadedBytes: 0, speedBytesPerSec: 0, phase: '',
      createAt: new Date().toLocaleString(),
    }
    _activeTasks.set(id, task)
    downloadQueue.add(() => processTask(task))
  }
  return ids
}

async function processTask(task: DownloadTask) {
  try {
    task.status = 'running'
    await Storage.updateTaskStatus(task.id, 'running')

    let audioFile: string | null = null
    let videoFile: string | null = null

    // Only download what's needed for the selected mode
    if (task.downloadType === 'audio') {
      task.phase = 'downloading_audio'
      audioFile = await downloadFile(task.audioUrl, `${task.id}.m4a`, (b, t, s) => {
        task.audioProgress = t > 0 ? b / t : 0; task.totalBytes = t; task.downloadedBytes = b; task.speedBytesPerSec = s
      })
    } else {
      // video or merge — always need the video stream
      task.phase = 'downloading_video'
      videoFile = await downloadFile(task.videoUrl, `${task.id}.mp4`, (b, t, s) => {
        task.videoProgress = t > 0 ? b / t : 0; task.totalBytes = t; task.downloadedBytes = b; task.speedBytesPerSec = s
      })

      // For merge, also download audio
      if (task.downloadType === 'merge') {
        task.phase = 'downloading_audio'
        audioFile = await downloadFile(task.audioUrl, `${task.id}.m4a`, (b, t, s) => {
          task.audioProgress = t > 0 ? b / t : 0; task.totalBytes = t; task.downloadedBytes = b; task.speedBytesPerSec = s
        })
      }
    }

    if (task.downloadType === 'merge') {
      task.phase = 'merging'
      let merged: string | null = null
      try {
        merged = await mergeQueue.add(async () => {
          return mergeMedia(videoFile!, audioFile!, `${task.id}_merged.mp4`, task.duration, (p) => {
            task.mergeProgress = p
          })
        }) as string
      } catch (err) {
        console.warn('[download] FFmpeg merge failed, falling back to video-only:', err)
      }

      if (merged) {
        await saveToDownloads(merged, sanitizeFilename(task.title) + '.mp4')
      } else {
        // FFmpeg merge failed — save both video and audio separately
        const safe = sanitizeFilename(task.title)
        await saveToDownloads(videoFile!, safe + '_video.mp4')
        await saveToDownloads(audioFile!, safe + '_audio.m4a')
      }
    } else if (task.downloadType === 'video') {
      await saveToDownloads(videoFile!, sanitizeFilename(task.title) + '.mp4')
    } else {
      // audio-only
      await saveToDownloads(audioFile!, sanitizeFilename(task.title) + '.m4a')
    }

    task.status = 'done'
    task.phase = 'done'
    await Storage.updateTaskStatus(task.id, 'done')
  } catch (err: any) {
    task.status = 'error'
    task.phase = ''
    task.errorMessage = err?.message || String(err || '')
    if (!task.errorMessage) task.errorMessage = '未知错误'
    console.error('[download] processTask error:', err)
    await Storage.updateTaskStatus(task.id, 'error')
  }
}

async function downloadFile(url: string, filename: string, onProgress: (bytes: number, total: number, speed: number) => void): Promise<string> {
  if (!_sessdata) {
    throw new Error('未登录，缺少 SESSDATA')
  }

  const filePath = `dl_${filename}`

  // Try to get content-length for progress tracking via CapacitorHttp (bypasses CDN 403)
  let totalBytes = 0
  try {
    const headResp = await CapacitorHttp.request({
      url,
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
        'Cookie': `SESSDATA=${_sessdata}`,
      },
    })
    const cl = headResp.headers?.['content-length'] || headResp.headers?.['Content-Length']
    if (cl) totalBytes = parseInt(cl, 10)
  } catch {}

  // Start native download (fire-and-forget on native side)
  const downloadPromise = NativeDownload.downloadFile({
    url,
    fileName: filePath,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    referer: 'https://www.bilibili.com',
    cookie: `SESSDATA=${_sessdata}`,
  })

  // Poll file size on disk for progress estimation
  const pollTimer = setInterval(async () => {
    try {
      const stat = await Filesystem.stat({ path: filePath, directory: Directory.Data })
      if (totalBytes > 0) {
        const pct = Math.min(stat.size / totalBytes, 1)
        onProgress(stat.size, totalBytes, 0)
        if (stat.size >= totalBytes) return
      }
    } catch {
      // File not yet created — still downloading
      if (totalBytes > 0) onProgress(0, totalBytes, 0)
    }
  }, 800)

  await downloadPromise
  clearInterval(pollTimer)
  onProgress(totalBytes || 1, totalBytes || 1, 0)
  return filePath
}

async function mergeMedia(videoFile: string, audioFile: string, outputFile: string, _duration: number, onProgress: (p: number) => void): Promise<string> {
  const ffmpeg = new FFmpeg()
  ffmpeg.on('progress', ({ progress }) => { onProgress(progress * 100) })

  // Load FFmpeg WASM core
  console.log('[merge] loading ffmpeg WASM...')
  await ffmpeg.load({
    coreURL: '/ffmpeg/ffmpeg-core.js',
    wasmURL: '/ffmpeg/ffmpeg-core.wasm',
  })

  // Read downloaded files
  console.log('[merge] reading video file:', videoFile)
  const videoData = await Filesystem.readFile({ path: videoFile, directory: Directory.Data })
  console.log('[merge] reading audio file:', audioFile)
  const audioData = await Filesystem.readFile({ path: audioFile, directory: Directory.Data })

  // Feed into FFmpeg virtual FS
  console.log('[merge] writing to ffmpeg FS...')
  await ffmpeg.writeFile('input_video.mp4', await fetchFile(`data:video/mp4;base64,${videoData.data}`))
  await ffmpeg.writeFile('input_audio.m4a', await fetchFile(`data:audio/mp4;base64,${audioData.data}`))

  // Execute merge
  console.log('[merge] executing ffmpeg...')
  await ffmpeg.exec(['-i', 'input_video.mp4', '-i', 'input_audio.m4a', '-c:v', 'copy', '-c:a', 'copy', '-strict', '-2', 'output.mp4'])

  // Read result from FFmpeg virtual FS
  console.log('[merge] reading output...')
  const data = await ffmpeg.readFile('output.mp4')
  const uint8 = data as Uint8Array
  console.log('[merge] output size:', uint8.length, 'bytes')

  // Convert to base64 (memory-hungry for large files)
  const base64 = arrayToBase64(uint8)
  console.log('[merge] base64 size:', base64.length, 'chars')

  // Write to app storage
  console.log('[merge] writing result to:', outputFile)
  await Filesystem.writeFile({ path: outputFile, data: base64, directory: Directory.Data })

  ffmpeg.terminate()
  console.log('[merge] done')
  onProgress(1)
  return outputFile
}

async function saveToDownloads(sourceFileName: string, displayName: string): Promise<void> {
  // Use native plugin — copies directly on the Java side, no bridge overhead
  await NativeDownload.saveToDownloads({ sourceFileName, displayName })
  console.log('[download] saved to Downloads:', displayName)
}

// ===== Helpers =====

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Remove data:...;base64, prefix
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function arrayToBase64(u8: Uint8Array): string {
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < u8.length; i += chunkSize) {
    binary += String.fromCharCode(...u8.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function sanitizeFilename(title: string): string {
  return title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100)
}

export function getActiveTasks(): DownloadTask[] {
  return Array.from(_activeTasks.values()).map(t => ({ ...t }))
}

export function deleteTask(id: number): void {
  _activeTasks.delete(id)
  Storage.deleteTaskRecord(id)
}
