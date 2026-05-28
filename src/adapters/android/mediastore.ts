/**
 * Capacitor plugin wrapper for MediaStore save-to-downloads.
 */
import { registerPlugin } from '@capacitor/core'

export interface MediaStorePlugin {
  saveToDownloads(options: { sourcePath: string; displayName: string }): Promise<{ uri: string }>
}

const MediaStore = registerPlugin<MediaStorePlugin>('MediaStore')
export default MediaStore
