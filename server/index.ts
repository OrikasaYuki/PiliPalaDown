/**
 * Express server for Web mode (no Electron)
 * Serves the API for the web adapter
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { BiliClient } from './bilibili/client'
import * as biliVideo from './bilibili/video'
import * as biliAuth from './bilibili/auth'
import { createTasks, getActiveTasks, deleteTask as deleteManagedTask, checkFFmpeg } from './task/manager'
import { getFields, saveFields as dbSaveFields, getTaskList, getCurrentFolder, getSessdata, fixStuckTasks } from './util/db'

// Fix stuck tasks from previous session (crash during download)
fixStuckTasks()

const app = express()
const PORT = 8098

app.use(cors())
app.use(express.json())

// Serve static frontend
app.use(express.static(path.join(__dirname, '../dist-web')))

function getClient(): BiliClient {
  const sd = getSessdata()
  return new BiliClient(sd || undefined)
}

// ===== API Routes =====

// Auth
app.get('/api/getUserInfo', async (_req, res) => {
  try {
    const client = getClient()
    const body = await client.get<any>('https://api.bilibili.com/x/space/myinfo')
    const d = body.data
    res.json({
      success: true,
      data: { name: d.name, face: d.face, mid: d.mid, vipType: d.vip?.type || 0, vipStatus: d.vip?.status || 0 },
      message: '获取成功',
    })
  } catch {
    res.json({ success: false, data: null, message: '未登录' })
  }
})

app.get('/api/checkLogin', async (_req, res) => {
  const client = getClient()
  const success = await biliAuth.checkLogin(client)
  res.json({ success, data: null, message: success ? '已登录' : '未登录' })
})

app.get('/api/getQRInfo', async (_req, res) => {
  try {
    const client = getClient()
    const data = await biliAuth.getQRInfo(client)
    res.json({ success: true, data, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/getQRStatus', async (req, res) => {
  try {
    const client = getClient()
    const key = req.query.key as string
    const result = await biliAuth.pollQRLogin(client, key)
    res.json(result)
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/logout', async (_req, res) => {
  const client = getClient()
  biliAuth.logout(client)
  res.json({ success: true, data: null, message: '已退出登录' })
})

// Bilibili
app.get('/api/getVideoInfo', async (req, res) => {
  try {
    const client = getClient()
    const bvid = req.query.bvid as string
    const data = await biliVideo.getVideoInfo(client, bvid)
    res.json({ success: true, data, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/getSeasonInfo', async (req, res) => {
  try {
    const client = getClient()
    const epid = parseInt(req.query.epid as string) || 0
    const ssid = parseInt(req.query.ssid as string) || 0
    const data = await biliVideo.getSeasonInfo(client, epid, ssid)
    res.json({ success: true, data, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/getPlayInfo', async (req, res) => {
  try {
    const client = getClient()
    const bvid = req.query.bvid as string
    const cid = parseInt(req.query.cid as string)
    const data = await biliVideo.getPlayInfo(client, bvid, cid)
    res.json({ success: true, data, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/getPopularVideos', async (_req, res) => {
  try {
    const client = getClient()
    const data = await biliVideo.getPopularVideos(client)
    res.json({ success: true, data, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/getFavList', async (req, res) => {
  try {
    const client = getClient()
    const mediaId = parseInt(req.query.mediaId as string)
    const data = await biliVideo.getFavList(client, mediaId)
    res.json({ success: true, data, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/getRedirectedLocation', async (req, res) => {
  try {
    const url = req.query.url as string
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    res.json({ success: true, data: response.url, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/getSeasonsArchivesListFirstBvid', async (req, res) => {
  try {
    const client = getClient()
    const mid = parseInt(req.query.mid as string)
    const seasonId = parseInt(req.query.seasonId as string)
    const data = await biliVideo.getSeasonsArchivesListFirstBvid(client, mid, seasonId)
    res.json({ success: true, data, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

// Online playback
app.get('/api/getPlayUrl', async (req, res) => {
  try {
    const client = getClient()
    const bvid = req.query.bvid as string
    const cid = parseInt(req.query.cid as string)
    const playInfo = await biliVideo.getPlayInfo(client, bvid, cid)
    if (!playInfo.dash.video.length) throw new Error('No video stream')

    const labels: Record<number, string> = {
      6: '240P', 16: '360P', 32: '480P', 64: '720P',
      74: '720P60', 80: '1080P', 112: '1080P+', 116: '1080P60',
      120: '4K', 125: 'HDR', 126: '杜比', 127: '8K',
    }
    const codecOrder = [12, 7, 13]
    const qMap = new Map<number, string>()
    for (const v of playInfo.dash.video) {
      if (!qMap.has(v.id)) qMap.set(v.id, v.baseUrl)
      else {
        const existing = playInfo.dash.video.find((x: any) => x.baseUrl === qMap.get(v.id))
        if (existing && codecOrder.indexOf(v.codecid) < codecOrder.indexOf(existing.codecid)) {
          qMap.set(v.id, v.baseUrl)
        }
      }
    }
    // Get best audio URL
    let audioUrl = ''
    if (playInfo.dash.flac?.audio?.baseUrl) {
      audioUrl = playInfo.dash.flac.audio.baseUrl
    } else if (playInfo.dash.audio?.length) {
      audioUrl = playInfo.dash.audio.sort((a: any, b: any) => b.id - a.id)[0].baseUrl
    }

    const qualities = Array.from(qMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([id, url]) => ({ id, url, label: labels[id] || `Q${id}` }))

    res.json({ success: true, data: { videoUrl: qualities[0]?.url || '', audioUrl, qualities }, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

// Task
app.post('/api/createTask', async (req, res) => {
  try {
    createTasks(req.body)
    res.json({ success: true, data: null, message: '任务创建成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/getActiveTask', async (_req, res) => {
  try {
    const data = getActiveTasks()
    res.json({ success: true, data, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/getTaskList', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 0
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const data = getTaskList(page, pageSize)
    res.json({ success: true, data, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/deleteTask', async (req, res) => {
  try {
    const id = parseInt(req.query.id as string)
    deleteManagedTask(id)
    res.json({ success: true, data: null, message: '删除成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/showFile', async (req, res) => {
  try {
    const filePath = req.query.filePath as string
    const { shell } = await import('child_process')
    const { execSync } = await import('child_process')
    execSync(`explorer /select,"${filePath}"`)
    res.json({ success: true, data: null, message: '打开成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/downloadVideo', async (req, res) => {
  const filePath = req.query.path as string
  if (!filePath || !fs.existsSync(filePath)) {
    res.status(404).json({ success: false, data: null, message: '文件不存在' })
    return
  }
  res.sendFile(filePath)
})

// Settings
app.get('/api/getFields', async (_req, res) => {
  try {
    const data = getFields(['download_folder'])
    res.json({ success: true, data, message: '获取成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.post('/api/saveFields', async (req, res) => {
  try {
    const fields: [string, string][] = req.body
    for (const [name, value] of fields) {
      if (name === 'download_folder') {
        fs.mkdirSync(value, { recursive: true })
      }
    }
    dbSaveFields(fields)
    res.json({ success: true, data: null, message: '保存成功' })
  } catch (err: any) {
    res.json({ success: false, data: null, message: err.message })
  }
})

app.get('/api/quit', async (_req, res) => {
  res.json({ success: true, data: null, message: '退出成功' })
  process.exit(0)
})

// ===== Server Start =====

if (!checkFFmpeg()) {
  console.error('FFmpeg is not installed. Please install FFmpeg from https://ffmpeg.org/download.html')
  process.exit(1)
}

app.listen(PORT, () => {
  console.log(`PiliPalaDown server running at http://localhost:${PORT}`)
})
