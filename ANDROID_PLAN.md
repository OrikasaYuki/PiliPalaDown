# Android Build Plan

## Architecture

```
React Components
    ↕ window.electronAPI (same interface)
    └── Android Adapter → Capacitor Plugins (HTTP, Filesystem, etc.)
                            ↕
                    Bilibili API (direct fetch)
                    FFmpeg WASM (in WebView)
```

The Android build reuses:
- **All React components & stores** — unchanged
- **All Bilibili API client code** — runs in WebView (fetch API is available)
- **Web adapter pattern** — Android adapter overrides Electron-specific APIs

## Changes Required

### 1. Capactior Setup

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/filesystem @capacitor/dialog
npx cap add android
```

### 2. Android Adapter (`src/adapters/android-adapter.ts`)

Rewrite to replace Electron APIs with Capacitor implementations:

| Electron API | Capacitor Replacement |
|---|---|
| `fs.writeFileSync` | `Filesystem.writeFile` |
| `shell.showItemInFolder` | File open via intent |
| `dialog.showOpenDirectory` | `Dialog.prompt` for path input |
| `fetch` (Bilibili CDN) | Direct fetch (no CORS in WebView) |
| `video:get-stream-url` | Just return video URL (no ffmpeg) |
| FFmpeg merge | **FFmpeg WASM** (`@ffmpeg/ffmpeg`) |
| Show file in explorer | Open file with SAF intent |

### 3. FFmpeg on Android — WASM Approach

Windows `.exe` **cannot** run on Android. Solution: `@ffmpeg/ffmpeg` (WASM).

```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

- Runs FFmpeg entirely in the WebView via WebAssembly
- No native binary needed, no architecture compatibility issues
- Performance: slower than native but sufficient for muxing (copy mode)
- Core file: ~31MB loaded on first use
- Audio-only and video-only downloads skip FFmpeg entirely

Implementation in `server/task/manager.ts`:
```typescript
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const ffmpeg = new FFmpeg()
// Load WASM core on first use
await ffmpeg.load({
  coreURL: await toBlobURL(`${base}ffmpeg-core.js`, 'text/javascript'),
  wasmURL: await toBlobURL(`${base}ffmpeg-core.wasm`, 'application/wasm'),
})
```

For Android, FFmpeg WASM core files can be:
- Bundled in `public/ffmpeg/` and copied to Android assets
- Or loaded from CDN on first use (requires network)

### 4. Download to Device

Use Capacitor Filesystem:

```typescript
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'

// Write downloaded media to app data directory first
const result = await Filesystem.writeFile({
  path: `PiliPalaDown/${filename}`,
  data: base64Data,
  directory: Directory.Data,
  // ... then use SAF or MediaStore to save to Downloads
})

// For final save to Downloads/PiliPalaDown/
// Option A: Use MediaStore API (API 29+) — best for media files
// Option B: Use SAF (Storage Access Framework) directory picker
// Option C: Use cordova-plugin-file for broader compatibility
```

**Recommended approach**: Save to `Downloads/PiliPalaDown/` using:
1. `@capacitor/filesystem` → `Directory.ExternalStorage` or `Directory.Documents`
2. Path: `PiliPalaDown/filename.mp4`
3. Need `READ_EXTERNAL_STORAGE` permission for older Android versions
4. For Android 11+ (API 30+): use `ManageExternalStoragePermission` or `MediaStore` API

### 5. Backendless Architecture

On Android, there's **no Express server**. All API calls go directly:
```
WebView → fetch('https://api.bilibili.com/...') → Bilibili API
```

This works because:
- Capacitor WebView allows unrestricted network access
- The Bilibili API client code (`server/bilibili/`) can run in the WebView
- WBI signing, QR login, DASH URL fetching all work via fetch()
- CORS is not enforced in Capacitor WebView

Changes needed:
- Move `server/bilibili/` code to be importable in the renderer (shared module)
- All Bilibili API calls go directly from the WebView

### 6. Download Queue in WebView

The download manager (`server/task/manager.ts`) currently runs in Node.js.
On Android, downloads must run in the WebView:

- Use `fetch()` + `ReadableStream` for chunked download
- Use `IndexedDB` for task queue persistence (replaces JSON file)
- Use `@ffmpeg/ffmpeg` for merging (in-WASM)
- Use `Capacitor Filesystem` for writing to disk

### 7. APK Build

```bash
# Build web assets
npm run web:build

# Sync to Android
npx cap sync android

# Open in Android Studio (or CLI build)
npx cap open android
# or: cd android && ./gradlew assembleDebug

# Build release APK/AAB
cd android && ./gradlew assembleRelease
# Requires keystore configuration
```

### 8. Android-Specific UI Tweaks

- Back navigation (hardware back button) → `@capacitor/app` `backButton` listener
- Status bar color → Android theme configuration
- Fullscreen video player → CSS tweaks for notch/cutout
- Touch-optimized episode grid → already responsive
- Bottom nav instead of top header (optional v2)

### 9. Files Changed

| File | Change |
|------|--------|
| `package.json` | Add Capacitor deps, `@ffmpeg/ffmpeg`, scripts |
| `capacitor.config.ts` | Update server URL, permissions |
| `src/adapters/android-adapter.ts` | **Full rewrite** with Capacitor APIs |
| `src/main.tsx` | Platform detection, WASM FFmpeg init |
| `server/task/manager.ts` | FFmpeg WASM path for downloads |
| `server/bilibili/client.ts` | Make importable in renderer |
| `vite.config.web.ts` | Add FFmpeg WASM core to copy |
| `android/` | Auto-generated Capacitor Android project |

### 10. Implementation Order

1. Install Capacitor + plugins, configure project
2. Rewrite `android-adapter.ts` with Capacitor APIs
3. Move `server/bilibili/` to shared code (importable from renderer)
4. Implement FFmpeg WASM download merge
5. Implement file save to `Downloads/PiliPalaDown/`
6. Test QR login + video parsing
7. Test download + merge + save
8. Build APK, test on device

## Open Questions

1. Download merge performance: FFmpeg WASM vs native — test on mid-range devices
2. Large file downloads → need chunked resume support for reliability
3. Battery/background restrictions on Android 12+ — foreground service needed?
4. FFmpeg WASM core bundling strategy — bundle or CDN load?
