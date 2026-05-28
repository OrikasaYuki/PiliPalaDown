/**
 * Capacitor plugin wrapper for opening files with system viewer.
 */
import { registerPlugin } from '@capacitor/core'

export interface OpenFilePlugin {
  openFile(options: { displayName: string }): Promise<void>
}

const OpenFile = registerPlugin<OpenFilePlugin>('OpenFile')
export default OpenFile
