import { spawn, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { log, logError } from './logger'

function resolveFFmpegPath(): string {
  // 1) bundled in Electron resources (production)
  if (process.resourcesPath) {
    const bundled = path.join(process.resourcesPath, 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
    log('[ffmpeg] checking bundled path:', bundled, 'exists:', fs.existsSync(bundled))
    if (fs.existsSync(bundled)) return bundled
  }

  // 2) dev — local bin/
  const local = path.join(__dirname, '..', '..', 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
  log('[ffmpeg] checking local path:', local, 'exists:', fs.existsSync(local))
  if (fs.existsSync(local)) return path.resolve(local)

  // 3) cwd bin/
  const cwdBin = path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
  log('[ffmpeg] checking cwd path:', cwdBin, 'exists:', fs.existsSync(cwdBin))
  if (fs.existsSync(cwdBin)) return path.resolve(cwdBin)

  // 4) system PATH
  log('[ffmpeg] falling back to system PATH')
  return 'ffmpeg'
}

export function getFFmpegPath(): string {
  const p = resolveFFmpegPath()
  if (p !== 'ffmpeg') {
    log('[ffmpeg] resolved path:', p)
    return p
  }
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' })
    log('[ffmpeg] found on system PATH')
    return 'ffmpeg'
  } catch {
    const err = 'FFmpeg not found. Install from https://ffmpeg.org/download.html'
    logError(err)
    throw new Error(err)
  }
}

export interface MergeProgress {
  current: number
  total: number
  percent: number
}

export function mergeMedia(
  outputPath: string,
  inputs: string[],
  duration: number,
  onProgress?: (progress: MergeProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFFmpegPath()

    // Validate inputs exist
    for (const inp of inputs) {
      const exists = fs.existsSync(inp)
      log('[ffmpeg] input:', inp, 'exists:', exists, 'size:', exists ? fs.statSync(inp).size : 'N/A')
      if (!exists) {
        reject(new Error(`输入文件不存在: ${inp}`))
        return
      }
    }

    // Ensure output directory exists
    const outDir = path.dirname(outputPath)
    try { fs.mkdirSync(outDir, { recursive: true }) } catch {}
    log('[ffmpeg] output:', outputPath)

    const args: string[] = []
    for (const input of inputs) {
      args.push('-i', input)
    }
    args.push('-c:v', 'copy', '-c:a', 'copy', '-strict', '-2', '-y', outputPath)

    log('[ffmpeg] spawn:', ffmpegPath, args.join(' '))

    const proc = spawn(ffmpegPath, args)
    let stderr = ''
    let resolved = false

    // Since this ffmpeg build doesn't support -progress pipe:1,
    // estimate progress as 50% at start, 100% on completion
    if (onProgress) onProgress({ current: 0, total: duration, percent: 0.5 })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (resolved) return
      resolved = true
      log('[ffmpeg] exit code:', code)
      if (code === 0) {
        const outSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0
        log('[ffmpeg] merge success, output size:', outSize)
        if (onProgress) onProgress({ current: duration, total: duration, percent: 1 })
        resolve()
      } else {
        const errTail = stderr.slice(-500)
        logError(`FFmpeg exit code ${code}`, errTail)
        reject(new Error(`FFmpeg 合并失败 (code ${code}): ${errTail.slice(-200)}`))
      }
    })

    proc.on('error', (err) => {
      if (resolved) return
      resolved = true
      logError('FFmpeg spawn error', err)
      reject(new Error(`FFmpeg 启动失败: ${err.message}`))
    })

    // Timeout after 30 minutes
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        proc.kill()
        logError('FFmpeg timeout after 30min')
        reject(new Error('FFmpeg 合并超时 (30分钟)'))
      }
    }, 30 * 60 * 1000)
  })
}

export function addMetadata(filePath: string, metadata: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFFmpegPath()
    const tempPath = filePath + '.tmp.mp4'
    const args: string[] = ['-i', filePath]
    for (const [key, value] of Object.entries(metadata)) {
      args.push('-metadata', `${key}=${value}`)
    }
    args.push('-codec', 'copy', '-y', tempPath)

    log('[ffmpeg] addMetadata:', filePath)
    const proc = spawn(ffmpegPath, args)
    let stderr = ''

    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString() })
    proc.on('close', (code) => {
      if (code === 0) {
        try {
          fs.unlinkSync(filePath)
          fs.renameSync(tempPath, filePath)
          resolve()
        } catch (err: any) {
          reject(new Error(`文件替换失败: ${err.message}`))
        }
      } else {
        reject(new Error(`FFmpeg metadata failed: ${stderr.slice(-200)}`))
      }
    })
    proc.on('error', reject)
  })
}

export function checkFFmpeg(): boolean {
  try {
    getFFmpegPath()
    return true
  } catch {
    return false
  }
}
