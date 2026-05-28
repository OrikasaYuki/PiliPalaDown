/**
 * Android storage — IndexedDB-based persistence.
 * Replaces JSON file storage used on desktop.
 */

const DB_NAME = 'pilipaladown'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('fields')) db.createObjectStore('fields')
      if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    fn(tx.objectStore(storeName))
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

// ===== Fields =====

export async function getFields(names: string[]): Promise<Record<string, string>> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fields', 'readonly')
    const store = tx.objectStore('fields')
    const result: Record<string, string> = {}
    let remaining = names.length
    if (remaining === 0) { resolve(result); db.close(); return }

    for (const name of names) {
      const req = store.get(name)
      req.onsuccess = () => {
        if (req.result) result[name] = req.result.value
        else result[name] = ''
        remaining--
        if (remaining === 0) { resolve(result); db.close() }
      }
      req.onerror = () => { reject(req.error); db.close() }
    }
  })
}

export async function saveFields(data: [string, string][]): Promise<void> {
  await withStore('fields', 'readwrite', (store) => {
    for (const [name, value] of data) store.put({ value }, name)
  })
}

export async function getSessdata(): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction('fields', 'readonly').objectStore('fields').get('sessdata')
    req.onsuccess = () => { resolve(req.result?.value || null); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

export async function saveSessdata(sd: string): Promise<void> {
  await withStore('fields', 'readwrite', (store) => store.put({ value: sd }, 'sessdata'))
}

export async function clearSessdata(): Promise<void> {
  await withStore('fields', 'readwrite', (store) => store.delete('sessdata'))
}

// ===== Tasks =====

export async function createTask(task: any): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tasks', 'readwrite')
    const req = tx.objectStore('tasks').add({ ...task, status: 'waiting', createAt: new Date().toLocaleString() })
    req.onsuccess = () => { resolve(Number(req.result)); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

export async function updateTaskStatus(id: number, status: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tasks', 'readwrite')
    const store = tx.objectStore('tasks')
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      if (getReq.result) { getReq.result.status = status; store.put(getReq.result) }
      db.close(); resolve()
    }
    getReq.onerror = () => { reject(getReq.error); db.close() }
  })
}

export async function deleteTaskRecord(id: number): Promise<void> {
  await withStore('tasks', 'readwrite', (store) => store.delete(id))
}

/** Mark in-progress tasks as failed (e.g. after app restart) */
export async function fixStuckTasks(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tasks', 'readwrite')
    const store = tx.objectStore('tasks')
    const req = store.getAll()
    req.onsuccess = () => {
      const all = req.result || []
      for (const record of all) {
        if (record.status === 'running' || record.status === 'waiting') {
          record.status = 'error'
          store.put(record)
        }
      }
    }
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function getTaskList(page: number, pageSize: number): Promise<any[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction('tasks', 'readonly').objectStore('tasks').getAll()
    req.onsuccess = () => {
      const all = (req.result || []).reverse()
      const start = page * pageSize
      resolve(all.slice(start, start + pageSize))
      db.close()
    }
    req.onerror = () => { reject(req.error); db.close() }
  })
}
