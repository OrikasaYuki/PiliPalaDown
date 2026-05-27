import { create } from 'zustand'
import type { TaskInDB, ActiveTask, TaskStatus } from '../types'

export interface TaskItem extends TaskInDB {
  audioProgress: number
  videoProgress: number
  mergeProgress: number
  statusState: TaskStatus
  opening: boolean
  deleting: boolean
  // Detailed progress
  phase: 'downloading_audio' | 'downloading_video' | 'merging' | 'done' | ''
  totalBytes: number
  downloadedBytes: number
  speedBytesPerSec: number
}

interface TaskState {
  tasks: TaskItem[]
  loading: boolean

  setLoading: (val: boolean) => void
  setTasks: (tasks: TaskInDB[]) => void
  updateProgress: (activeTasks: ActiveTask[]) => void
  removeTask: (id: number) => void
  refreshTasks: () => Promise<void>
  refreshActive: () => Promise<void>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: true,

  setLoading: (val) => set({ loading: val }),

  setTasks: (tasks) => set({
    tasks: tasks.map((t) => ({
      ...t,
      audioProgress: 1,
      videoProgress: 1,
      mergeProgress: 1,
      statusState: t.status,
      opening: false,
      deleting: false,
      phase: '' as const,
      totalBytes: 0,
      downloadedBytes: 0,
      speedBytesPerSec: 0,
    })),
  }),

  updateProgress: (activeTasks) => set((s) => ({
    tasks: s.tasks.map((t) => {
      const active = activeTasks.find((a) => a.id === t.id)
      if (active) {
        return {
          ...t,
          audioProgress: active.audioProgress,
          videoProgress: active.videoProgress,
          mergeProgress: active.mergeProgress,
          statusState: active.status,
          phase: active.phase || t.phase,
          totalBytes: active.totalBytes || t.totalBytes,
          downloadedBytes: active.downloadedBytes || t.downloadedBytes,
          speedBytesPerSec: active.speedBytesPerSec || t.speedBytesPerSec,
        }
      }
      return t
    }),
  })),

  removeTask: (id) => set((s) => ({
    tasks: s.tasks.filter((t) => t.id !== id),
  })),

  refreshTasks: async () => {
    try {
      const taskList = await window.electronAPI.getTaskList(0, 360)
      get().setTasks(taskList)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
  },

  refreshActive: async () => {
    try {
      const activeTasks = await window.electronAPI.getActiveTask()
      if (activeTasks) {
        get().updateProgress(activeTasks)
      }
    } catch (err) {
      console.error('Failed to refresh active tasks:', err)
    }
  },
}))
