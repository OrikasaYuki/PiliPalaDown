import fs from 'fs'
import path from 'path'
import os from 'os'

const LOG_DIR = path.join(os.homedir(), '.pilipaladown')
const LOG_PATH = path.join(LOG_DIR, 'app.log')

function ensureDir(dir: string) {
  try { fs.mkdirSync(dir, { recursive: true }) } catch {}
}

export function log(message: string, ...args: any[]) {
  ensureDir(LOG_DIR)
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')}`
  try {
    fs.appendFileSync(LOG_PATH, line + '\n', 'utf-8')
  } catch {}
  console.log(line)
}

export function logError(message: string, error?: any) {
  ensureDir(LOG_DIR)
  const timestamp = new Date().toISOString()
  let line = `[${timestamp}] ERROR: ${message}`
  if (error) {
    if (error instanceof Error) {
      line += `\n  Message: ${error.message}`
      if (error.stack) line += `\n  Stack: ${error.stack.split('\n').slice(1, 4).join('\n  ')}`
    } else {
      line += `\n  Detail: ${JSON.stringify(error)}`
    }
  }
  try {
    fs.appendFileSync(LOG_PATH, line + '\n', 'utf-8')
  } catch {}
  console.error(line)
}

export function getLogPath(): string {
  return LOG_PATH
}
