/**
 * JSON file-based storage (replaces SQLite)
 * Portable, no native dependencies needed
 */
import path from 'path'
import os from 'os'
import fs from 'fs'

const DATA_DIR = path.join(os.homedir(), '.pilipaladown')
const DB_PATH = path.join(DATA_DIR, 'data.json')

interface TaskRecord {
  id: number
  bvid: string
  cid: number
  format: number
  title: string
  owner: string
  cover: string
  status: string
  folder: string
  duration: number
  downloadType: string
  audioUrl: string
  videoUrl: string
  videoWidth: number
  videoHeight: number
  createAt: string
}

interface Store {
  fields: Record<string, string>
  tasks: TaskRecord[]
  taskIdCounter: number
}

let _store: Store | undefined

function ensureDir(dir: string) {
  try { fs.mkdirSync(dir, { recursive: true }) } catch {}
}

function loadStore(): Store {
  if (_store) return _store
  ensureDir(DATA_DIR)
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8')
    _store = JSON.parse(raw) as Store
    if (!_store.tasks) _store.tasks = []
    if (!_store.fields) _store.fields = {}
    if (!_store.taskIdCounter) _store.taskIdCounter = 1
  } catch {
    _store = { fields: {}, tasks: [], taskIdCounter: 1 }
  }
  return _store
}

function saveStore(): void {
  if (!_store) return
  ensureDir(DATA_DIR)
  fs.writeFileSync(DB_PATH, JSON.stringify(_store, null, 2), 'utf-8')
}

// ===== Fields (Settings) =====

export function getFields(names: string[]): Record<string, string> {
  const s = loadStore()
  const result: Record<string, string> = {}
  for (const name of names) {
    result[name] = s.fields[name] || ''
  }
  return result
}

export function saveFields(data: [string, string][]): void {
  const s = loadStore()
  for (const [name, value] of data) {
    s.fields[name] = value
  }
  saveStore()
}

export function getCurrentFolder(): string {
  const s = loadStore()
  if (s.fields.download_folder) {
    try { fs.mkdirSync(s.fields.download_folder, { recursive: true }) } catch {}
    return s.fields.download_folder
  }
  const defaultFolder = path.join(os.homedir(), 'Downloads', 'PiliPalaDown')
  try { fs.mkdirSync(defaultFolder, { recursive: true }) } catch {}
  s.fields.download_folder = defaultFolder
  saveStore()
  return defaultFolder
}

// ===== Tasks =====

export function createTaskRecord(task: {
  bvid: string; cid: number; format: number; title: string; owner: string
  cover: string; folder: string; duration: number; downloadType: string
  audioUrl: string; videoUrl: string; videoWidth: number; videoHeight: number
}): number {
  const s = loadStore()
  const id = s.taskIdCounter++
  const record: TaskRecord = {
    id,
    ...task,
    status: 'waiting',
    createAt: new Date().toLocaleString(),
  }
  s.tasks.unshift(record)
  saveStore()
  return id
}

export function updateTaskStatus(id: number, status: string): void {
  const s = loadStore()
  const task = s.tasks.find(t => t.id === id)
  if (task) {
    task.status = status
    saveStore()
  }
}

export function deleteTaskRecord(id: number): void {
  const s = loadStore()
  s.tasks = s.tasks.filter(t => t.id !== id)
  saveStore()
}

export function getTaskList(page: number, pageSize: number): TaskRecord[] {
  const s = loadStore()
  const start = page * pageSize
  return s.tasks.slice(start, start + pageSize)
}

export function getTaskById(id: number): TaskRecord | undefined {
  const s = loadStore()
  return s.tasks.find(t => t.id === id)
}

// ===== Auth =====

/** Mark in-progress tasks as failed (e.g. after app restart) */
export function fixStuckTasks(): void {
  const s = loadStore()
  let changed = false
  for (const task of s.tasks) {
    if (task.status === 'running' || task.status === 'waiting') {
      task.status = 'error'
      changed = true
    }
  }
  if (changed) saveStore()
}

export function getSessdata(): string | null {
  const s = loadStore()
  return s.fields.sessdata || null
}

export function saveSessdata(sessdata: string): void {
  const s = loadStore()
  s.fields.sessdata = sessdata
  saveStore()
}

export function clearSessdata(): void {
  const s = loadStore()
  delete s.fields.sessdata
  saveStore()
}
