/**
 * Android adapter: implements ElectronAPI using Capacitor plugins
 * For future Android expansion (v2)
 */

import type { ElectronAPI } from '../types'

export async function createAndroidApi(): Promise<ElectronAPI> {
  // Fall back to web adapter for now (Android uses web mode with Capacitor)
  const { createWebApi } = await import('./web-adapter')
  return createWebApi()
}
