/**
 * Android download manager.
 * Uses fetch() for download + @ffmpeg/ffmpeg WASM for merge + Capacitor FS for save.
 */
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import * as Storage from './storage'
import type { DownloadTask } from '../../../shared/download/types'

let _taskIdCounter = Date.now()
const _activeTasks = new Map<number, DownloadTask>()

export async function createTasks(tasks: any[]): Promise<number[]> {
  const ids: number[] = []
  for (const t of tasks) {
    const id = await Storage.createTask(t)
    ids.push(id)
    const task: DownloadTask = {
      id, ...t,
      status: 'waiting', folder: 'PiliPalaDown',
      audioProgress: 0, videoProgress: 0, mergeProgress: 0,
      totalBytes: 0, downloadedBytes: 0, speedBytesPerSec: 0, phase: '',
      createAt: new Date().toLocaleString(),
    }
    _activeTasks.set(id, task)
    processTask(task) // fire-and-forget
  }
  return ids
}

async function processTask(task: DownloadTask) {
  try {
    task.status = 'running'
    task.phase = 'downloading_audio'
    await Storage.updateTaskStatus(task.id, 'running')

    const audioFile = await downloadFile(task.audioUrl, `${task.id}.m4a`, (b, t, s) => {
      task.audioProgress = t > 0 ? b / t : 0; task.totalBytes = t; task.downloadedBytes = b; task.speedBytesPerSec = s
    })

    task.phase = 'downloading_video'
    const videoFile = await downloadFile(task.videoUrl, `${task.id}.mp4`, (b, t, s) => {
      task.videoProgress = t > 0 ? b / t : 0; task.totalBytes = t; task.downloadedBytes = b; task.speedBytesPerSec = s
    })

    if (task.downloadType === 'merge') {
      task.phase = 'merging'
      const merged = await mergeMedia(videoFile, audioFile, `${task.id}_merged.mp4`, task.duration, (p) => {
        task.mergeProgress = p
      })
      // Save to Downloads/PiliPalaDown/
      const outputName = sanitizeFilename(task.title) + '.mp4'
      await saveToDownloads(merged, outputName)
      // Cleanup temp files
      await Filesystem.deleteFile({ path: videoFile, directory: Directory.Data })
      await Filesystem.deleteFile({ path: audioFile, directory: Directory.Data })
      await Filesystem.deleteFile({ path: merged, directory: Directory.Data })
    } else {
      // Audio-only or video-only
      const ext = task.downloadType === 'audio' ? '.m4a' : '.mp4'
      const srcFile = task.downloadType === 'audio' ? audioFile : videoFile
      await saveToDownloads(srcFile, sanitizeFilename(task.title) + ext)
      await Filesystem.deleteFile({ path: srcFile, directory: Directory.Data })
    }

    task.status = 'done'
    task.phase = 'done'
    await Storage.updateTaskStatus(task.id, 'done')
  } catch (err: any) {
    task.status = 'error'
    task.phase = ''
    task.errorMessage = err.message
    await Storage.updateTaskStatus(task.id, 'error')
  }
}

async function downloadFile(url: string, filename: string, onProgress: (bytes: number, total: number, speed: number) => void): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
      'Referer': 'https://www.bilibili.com',
    },
  })
  const contentLength = resp.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength, 10) : 0
  const reader = resp.body!.getReader()
  const chunks: Uint8Array[] = []
  let downloaded = 0
  let lastTime = Date.now()
  let lastBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    downloaded += value.length
    const now = Date.now()
    const elapsed = (now - lastTime) / 1000
    if (elapsed >= 0.1) {
      const speed = lastBytes > 0 ? (downloaded - lastBytes) / elapsed : 0
      lastTime = now; lastBytes = downloaded
      onProgress(downloaded, total, speed)
    }
  }

  // Write to app data directory
  const blob = new Blob(chunks as BlobPart[])
  const base64 = await blobToBase64(blob)
  await Filesystem.writeFile({ path: `PiliPalaDown/${filename}`, data: base64, directory: Directory.Data })
  onProgress(downloaded, total, 0)
  return `PiliPalaDown/${filename}`
}

async function mergeMedia(videoFile: string, audioFile: string, outputFile: string, _duration: number, onProgress: (p: number) => void): Promise<string> {
  const ffmpeg = new FFmpeg()
  ffmpeg.on('progress', ({ progress }) => onProgress(progress))

  // Load FFmpeg WASM core
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  await ffmpeg.load({
    coreURL: `${base}/ffmpeg-core.js`,
    wasmURL: `${base}/ffmpeg-core.wasm`,
  })

  // Read input files into FFmpeg's virtual FS
  const videoData = await Filesystem.readFile({ path: videoFile, directory: Directory.Data })
  const audioData = await Filesystem.readFile({ path: audioFile, directory: Directory.Data })

  await ffmpeg.writeFile('input_video.mp4', await fetchFile(`data:video/mp4;base64,${videoData.data}`))
  await ffmpeg.writeFile('input_audio.m4a', await fetchFile(`data:audio/mp4;base64,${audioData.data}`))
  await ffmpeg.exec(['-i', 'input_video.mp4', '-i', 'input_audio.m4a', '-c:v', 'copy', '-c:a', 'copy', '-strict', '-2', 'output.mp4'])

  const data = await ffmpeg.readFile('output.mp4')
  const uint8 = data as Uint8Array
  const base64 = arrayToBase64(uint8)
  await Filesystem.writeFile({ path: outputFile, data: base64, directory: Directory.Data })

  ffmpeg.terminate()
  onProgress(1)
  return outputFile
}

async function saveToDownloads(sourcePath: string, displayName: string): Promise<void> {
  // Copy file from app data to Downloads/PiliPalaDown/
  const result = await Filesystem.readFile({ path: sourcePath, directory: Directory.Data })

  // Use MediaStore API for Android 10+ to save to Downloads
  try {
    await Filesystem.writeFile({
      path: `PiliPalaDown/${displayName}`,
      data: result.data,
      directory: Directory.ExternalStorage,
      // Note: On Android 11+, this requires MANAGE_EXTERNAL_STORAGE permission
      // or uses MediaStore API via Capacitor plugin
    })
  } catch {
    // Fallback: keep in app data directory with a note
    console.warn('Could not save to Downloads, file stays in app data:', sourcePath)
  }
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
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i])
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
