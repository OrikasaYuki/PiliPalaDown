import React, { useEffect, useRef } from 'react'
import { FolderOpen, Trash2, Loader2, Music, Film } from 'lucide-react'
import { useTaskStore, TaskItem } from '../stores/taskStore'
import { useT } from '../stores/localeStore'

interface TaskPageProps {
  onError: (message: string) => void
}

export const TaskPage: React.FC<TaskPageProps> = ({ onError }) => {
  const t = useT()
  const { tasks, loading, setLoading, setTasks, updateProgress, removeTask, refreshTasks, refreshActive } = useTaskStore()

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      await refreshTasks()
      startProgressPolling()
    } catch (err: any) {
      onError(err.message)
    } finally {
      setTimeout(() => setLoading(false), 200)
    }
  }

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      if (dbTimerRef.current) clearInterval(dbTimerRef.current)
    }
  }, [])

  const progressTimerRef = useRef<ReturnType<typeof setInterval>>()
  const dbTimerRef = useRef<ReturnType<typeof setInterval>>()

  const startProgressPolling = () => {
    // Lightweight in-memory progress: every 1s
    progressTimerRef.current = setInterval(async () => {
      await refreshActive()
    }, 1000)

    // Heavy JSON DB read: every 5s (catches done/error state changes)
    dbTimerRef.current = setInterval(async () => {
      await refreshTasks()
    }, 5000)
  }

  const handleShowFile = async (task: TaskItem) => {
    const ext = task.downloadType === 'audio' ? '.m4a' : '.mp4'
    const encodedId = btoa(task.id.toString()).replace(/=/g, '')
    const filename = `${task.title} ${encodedId}${ext}`
    try {
      task.opening = true
      await window.electronAPI.showFile(`${task.folder}\\${filename}`)
      setTimeout(() => { task.opening = false }, 3000)
    } catch {
      task.opening = false
    }
  }

  const handleDelete = async (task: TaskItem) => {
    try {
      task.deleting = true
      await window.electronAPI.deleteTask(task.id)
      removeTask(task.id)
    } catch (err: any) {
      alert(err.message)
      task.deleting = false
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
  }

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec === 0) return ''
    return `${formatBytes(bytesPerSec)}/s`
  }

  const formatProgress = (task: TaskItem) => {
    if (task.statusState === 'waiting') return '等待下载'
    if (task.statusState === 'error') return '下载失败'
    if (task.statusState === 'done') return task.folder
    const phase = task.phase || ''
    if (phase === 'downloading_audio') return '下载音频中'
    if (phase === 'downloading_video') return '下载视频中'
    if (phase === 'merging') return '合并音视频中'
    // Fallback to old logic
    if (task.videoProgress === 0) return '下载音频中'
    if (task.mergeProgress === 0) return '下载视频中'
    return '合并音视频中'
  }

  const getProgressWidth = (task: TaskItem) => {
    if (task.statusState === 'done') return 100
    if (task.statusState === 'error') return 0
    const phase = task.phase || ''
    if (phase === 'downloading_audio') return task.audioProgress * 100
    if (phase === 'downloading_video') return task.videoProgress * 100
    if (phase === 'merging') return task.mergeProgress * 100
    if (task.videoProgress === 0) return task.audioProgress * 100
    if (task.mergeProgress === 0) return task.videoProgress * 100
    return task.mergeProgress * 100
  }

  return (
    <div className="task-page">
      {loading && (
        <div className="loading-state">
          <Loader2 size={24} className="spin" />
        </div>
      )}

      {!loading && tasks.length === 0 && (
        <div className="empty-state">
          <Film size={48} />
          <p>{t('task.empty')}</p>
        </div>
      )}

      <div className="task-list">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`task-card ${task.deleting ? 'deleting' : ''}`}
          >
            <div className="task-main">
              <div className="task-header">
                <div className="task-type-badge">
                  {task.downloadType === 'audio' ? <Music size={12} /> : <Film size={12} />}
                  <span>{task.downloadType === 'audio' ? t('task.audio') : t('task.video')}</span>
                </div>
                <span className="task-filename">{task.title}</span>
              </div>

              <div className={`task-status ${task.statusState}`}>
                {formatProgress(task)}
              </div>

              {/* Detailed progress info */}
              {(task.statusState === 'running' || task.statusState === 'waiting') && (
                <div className="task-progress-detail">
                  <span className="task-progress-pct">
                    {getProgressWidth(task).toFixed(1)}%
                  </span>
                  {task.totalBytes > 0 && (
                    <>
                      <span className="task-progress-size">
                        {formatBytes(task.downloadedBytes)} / {formatBytes(task.totalBytes)}
                      </span>
                      {task.speedBytesPerSec > 0 && (
                        <span className="task-progress-speed">
                          {formatSpeed(task.speedBytesPerSec)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}

              {task.statusState !== 'done' && task.statusState !== 'error' && (
                <div className="task-progress">
                  <div
                    className="task-progress-bar"
                    style={{ width: `${getProgressWidth(task)}%` }}
                  />
                </div>
              )}
            </div>

            <div className="task-actions">
              {task.statusState === 'done' && (
                <>
                  <button
                    className="btn btn-ghost btn-icon"
                    title="打开文件位置"
                    onClick={() => handleShowFile(task)}
                  >
                    <FolderOpen size={16} />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    title="删除"
                    onClick={() => handleDelete(task)}
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
              {(task.statusState === 'error') && (
                <button
                  className="btn btn-ghost btn-icon"
                  title="删除"
                  onClick={() => handleDelete(task)}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
