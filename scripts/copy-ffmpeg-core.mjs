/**
 * Copy FFmpeg WASM core files to public/ffmpeg/ for offline bundling.
 * Used by Android to avoid loading from CDN at runtime.
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const srcDir = resolve(root, 'node_modules/@ffmpeg/core/dist/esm')
const destDir = resolve(root, 'public/ffmpeg')

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true })
}

const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm']
for (const file of files) {
  const src = resolve(srcDir, file)
  const dest = resolve(destDir, file)
  copyFileSync(src, dest)
  console.log(`Copied ${file} to public/ffmpeg/`)
}
