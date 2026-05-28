import path from 'path'
import fs from 'fs'
import { BiliClient } from '../bilibili/client'
import { createTaskRecord, updateTaskStatus, getCurrentFolder, getSessdata, deleteTaskRecord } from '../util/db'
import { mergeMedia, addMetadata as addFFmpegMetadata, checkFFmpeg } from '../util/ffmpeg'
import { log, logError } from '../util/logger'
import PQueue from 'p-queue'
import type { TaskInitData, ActiveTask as ActiveTaskInfo } from '../../shared/download/types'

interface ManagedTask {
  info: ActiveTaskInfo
  options: TaskInitData
  cancel?: () => void
}

const downloadQueue = new PQueue({ concurrency: 3 })
const mergeQueue = new PQueue({ concurrency: 3 })
const tasks = new Map<number, ManagedTask>()

export function createTasks(options: TaskInitData[]): number[] {
  const folder = getCurrentFolder()
  const ids: number[] = []

  for (const opt of options) {
    const id = createTaskRecord({
      bvid: opt.bvid,
      cid: opt.cid,
      format: opt.format,
      title: opt.title,
      owner: opt.owner,
      cover: opt.cover,
      folder,
      duration: opt.duration,
      downloadType: opt.downloadType,
      audioUrl: opt.audio,
      videoUrl: opt.video,
      videoWidth: opt.width,
      videoHeight: opt.height,
    })

    const taskInfo: ActiveTaskInfo = {
      id,
      bvid: opt.bvid,
      cid: opt.cid,
      format: opt.format,
      title: opt.title,
      owner: opt.owner,
      cover: opt.cover,
      status: 'waiting',
      folder,
      audioProgress: 0,
      videoProgress: 0,
      mergeProgress: 0,
      duration: opt.duration,
      phase: '',
      totalBytes: 0,
      downloadedBytes: 0,
      speedBytesPerSec: 0,
    }

    tasks.set(id, { info: taskInfo, options: opt })
    ids.push(id)

    // Start processing
    downloadQueue.add(() => processTask(id))
  }

  return ids
}

async function processTask(id: number): Promise<void> {
  const task = tasks.get(id)
  if (!task) return

  const { options: opt, info } = task
  const sessdata = getSessdata()
  if (!sessdata) {
    info.status = 'error'
    updateTaskStatus(id, 'error')
    return
  }

  const client = new BiliClient(sessdata)

  try {
    info.status = 'running'
    updateTaskStatus(id, 'running')
    log(`[task-${id}] started, type=${opt.downloadType}, title=${opt.title}`)

    if (opt.downloadType === 'audio') {
      log(`[task-${id}] downloading audio...`)
      info.phase = 'downloading_audio'
      info.totalBytes = 0
      info.downloadedBytes = 0
      info.speedBytesPerSec = 0
      await downloadMedia(client, opt.audio, id, 'audio', (p, bytes, total, speed) => { info.audioProgress = p; info.downloadedBytes = bytes; info.totalBytes = total; info.speedBytesPerSec = speed })
      const outputPath = getFilePath(id, opt.title, 'audio')
      const audioPath = getTempPath(id, 'audio')
      log(`[task-${id}] audio downloaded, renaming ${audioPath} -> ${outputPath}`)
      fs.renameSync(audioPath, outputPath)
      try { await addFFmpegMetadata(outputPath, { description: opt.bvid, artist: opt.owner }) } catch (e: any) { log(`[task-${id}] metadata warn: ${e.message}`) }
      info.phase = 'done'
      info.status = 'done'
      updateTaskStatus(id, 'done')
      log(`[task-${id}] done`)
    } else if (opt.downloadType === 'video') {
      log(`[task-${id}] downloading video...`)
      info.phase = 'downloading_video'
      info.totalBytes = 0
      info.downloadedBytes = 0
      info.speedBytesPerSec = 0
      await downloadMedia(client, opt.video, id, 'video', (p, bytes, total, speed) => { info.videoProgress = p; info.downloadedBytes = bytes; info.totalBytes = total; info.speedBytesPerSec = speed })
      const outputPath = getFilePath(id, opt.title, 'video')
      const videoPath = getTempPath(id, 'video')
      log(`[task-${id}] video downloaded, renaming ${videoPath} -> ${outputPath}`)
      fs.renameSync(videoPath, outputPath)
      try { await addFFmpegMetadata(outputPath, { description: opt.bvid, artist: opt.owner }) } catch (e: any) { log(`[task-${id}] metadata warn: ${e.message}`) }
      info.phase = 'done'
      info.status = 'done'
      updateTaskStatus(id, 'done')
      log(`[task-${id}] done`)
    } else {
      // merge mode
      log(`[task-${id}] downloading audio...`)
      info.phase = 'downloading_audio'
      info.totalBytes = 0
      info.downloadedBytes = 0
      info.speedBytesPerSec = 0
      await downloadMedia(client, opt.audio, id, 'audio', (p, bytes, total, speed) => { info.audioProgress = p; info.downloadedBytes = bytes; info.totalBytes = total; info.speedBytesPerSec = speed })
      log(`[task-${id}] audio done, downloading video...`)
      info.phase = 'downloading_video'
      info.totalBytes = 0
      info.downloadedBytes = 0
      info.speedBytesPerSec = 0
      await downloadMedia(client, opt.video, id, 'video', (p, bytes, total, speed) => { info.videoProgress = p; info.downloadedBytes = bytes; info.totalBytes = total; info.speedBytesPerSec = speed })
      log(`[task-${id}] video done, starting ffmpeg merge...`)
      info.phase = 'merging'

      const outputPath = getFilePath(id, opt.title, 'merge')
      const videoPath = getTempPath(id, 'video')
      const audioPath = getTempPath(id, 'audio')

      await mergeQueue.add(() =>
        mergeMedia(outputPath, [videoPath, audioPath], opt.duration, (p) => {
          info.mergeProgress = p.percent
        })
      )
      log(`[task-${id}] merge complete, cleaning up...`)

      try { fs.unlinkSync(videoPath); log(`[task-${id}] deleted ${videoPath}`) } catch (e: any) { log(`[task-${id}] cleanup warn: ${e.message}`) }
      try { fs.unlinkSync(audioPath); log(`[task-${id}] deleted ${audioPath}`) } catch (e: any) { log(`[task-${id}] cleanup warn: ${e.message}`) }
      try { await addFFmpegMetadata(outputPath, { description: opt.bvid, artist: opt.owner }) } catch (e: any) { log(`[task-${id}] metadata warn: ${e.message}`) }
      info.phase = 'done'
      info.status = 'done'
      updateTaskStatus(id, 'done')
      log(`[task-${id}] done`)
    }
  } catch (err: any) {
    info.phase = ''
    info.status = 'error'
    updateTaskStatus(id, 'error')
    logError(`[task-${id}] failed`, err)
  }
}

async function downloadMedia(client: BiliClient, url: string, id: number, type: string, onProgress: (p: number, bytes: number, total: number, speed: number) => void): Promise<void> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.bilibili.com',
  }
  // Bilibili DASH URLs require the SESSDATA cookie for authentication
  const sd = client.getSessdata()
  if (sd) {
    headers['Cookie'] = `SESSDATA=${sd}`
  }

  let resp = await fetch(url, { headers })

  if (!resp.ok) {
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 1000))
      resp = await fetch(url, { headers })
      if (resp.ok) break
    }
    if (!resp.ok) throw new Error(`Download failed after retries: HTTP ${resp.status} ${resp.statusText}`)
  }

  const contentLength = resp.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength, 10) : 0
  const filePath = getTempPath(id, type)
  const fileStream = fs.createWriteStream(filePath)

  const reader = resp.body!.getReader()
  let downloaded = 0
  let lastTime = Date.now()
  let lastBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    fileStream.write(Buffer.from(value))
    downloaded += value.length

    // Calculate speed every ~100ms
    const now = Date.now()
    const elapsed = (now - lastTime) / 1000
    if (elapsed >= 0.1) {
      const speed = lastBytes > 0 ? (downloaded - lastBytes) / elapsed : 0
      lastTime = now
      lastBytes = downloaded
      if (total > 0) onProgress(downloaded / total, downloaded, total, speed)
    }
  }

  fileStream.close()
  onProgress(1, downloaded, total, 0)
}

function getTempPath(id: number, type: string): string {
  const folder = getCurrentFolder()
  const ext = type === 'audio' ? 'm4a' : 'mp4'
  return path.join(folder, `${id}.${ext}`)
}

function getFilePath(id: number, title: string, downloadType: string): string {
  const folder = getCurrentFolder()
  const ext = downloadType === 'audio' ? '.m4a' : '.mp4'
  const encodedId = Buffer.from(id.toString()).toString('base64').replace(/=/g, '')
  const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_')
  return path.join(folder, `${safeTitle} ${encodedId}${ext}`)
}

export function getActiveTasks(): ActiveTaskInfo[] {
  return Array.from(tasks.values()).map(t => t.info)
}

export function deleteTask(id: number): void {
  tasks.delete(id)
  deleteTaskRecord(id)
}

export function getAllTasks(): ActiveTaskInfo[] {
  return Array.from(tasks.values()).map(t => t.info)
}

export { checkFFmpeg }
