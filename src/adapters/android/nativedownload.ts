/**
 * Capacitor plugin wrapper for native Android HTTP download (no base64 overhead).
 * Downloads directly to a file path on disk, avoiding WebView memory issues.
 * Includes a web stub for Capacitor plugin registration compatibility.
 */
import { registerPlugin, WebPlugin } from '@capacitor/core'

export interface NativeDownloadPlugin {
  downloadFile(options: {
    url: string
    fileName: string
    userAgent: string
    referer: string
    cookie: string
  }): Promise<{ success: boolean }>

  saveToDownloads(options: {
    sourceFileName: string
    displayName: string
  }): Promise<{ success: boolean }>

  getCacheSize(): Promise<{ size: number }>

  clearCache(): Promise<{ deleted: number }>
}

class NativeDownloadWeb extends WebPlugin implements NativeDownloadPlugin {
  async downloadFile(): Promise<{ success: boolean }> { throw new Error('Only on Android') }
  async saveToDownloads(): Promise<{ success: boolean }> { throw new Error('Only on Android') }
  async getCacheSize(): Promise<{ size: number }> { return { size: 0 } }
  async clearCache(): Promise<{ deleted: number }> { return { deleted: 0 } }
}

const NativeDownload = registerPlugin<NativeDownloadPlugin>('NativeDownload', {
  web: () => new NativeDownloadWeb(),
})

export default NativeDownload
