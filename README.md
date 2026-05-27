# PiliPalaDown

A modern, cross-platform Bilibili video downloader built with Electron and TypeScript. Features a clean minimal design with dark/light/high-contrast themes.

## Features

- **Online Playback** — Stream videos directly in-app with quality selection
- **Video Parsing** — Parse videos by BV, EP, SS, or favorites list
- **Multi-P / Collection Support** — Batch select and download multi-part videos and collections
- **Quality Selection** — Choose resolution from 360P to 4K
- **Codec Selection** — HEVC / AVC / AV1
- **Download Management** — Track progress, pause/delete tasks
- **Built-in Player** — Video and audio playback
- **QR Code Login** — Login with Bilibili App
- **Multi-language** — 中文 · English · 日本語
- **Theme Support** — Dark (default dark gray), Light, High Contrast (pure black)

## Screenshots

*(Coming soon)*

## Quick Start

### Development

```bash
npm install
npm run electron:dev
```

### Build

```bash
# Desktop (Electron)
npm run electron:build

# Web browser mode
npm run web:dev

# Web build
npm run web:build
```

## Requirements

- Node.js 20+
- npm
- FFmpeg (bundled with the app for Windows builds)

## Tech Stack

- **Frontend**: React 18 + Zustand + pure CSS
- **Backend**: TypeScript + Node.js (Electron main process / Express)
- **Desktop**: Electron + electron-builder
- **Build**: Vite + vite-plugin-electron
- **Storage**: JSON file-based (no native dependencies)

## Project Structure

```
src/
├── components/       # React UI components
├── stores/           # Zustand state management
├── adapters/         # Platform adapters (Electron/Web/Android)
├── api/              # Client-side API helpers
└── i18n/             # Locale files (zh/en/ja)

electron/
├── main.ts           # Electron main process (IPC handlers, tray, GPU)
└── preload.ts        # Context bridge (electronAPI)

server/
├── bilibili/         # Bilibili API client (video, auth, WBI sign)
├── task/             # Download manager
├── util/             # Storage, FFmpeg wrapper
└── index.ts          # Express server (web mode)

scripts/
└── generate-icon.js  # App icon generator
```

## License

MIT
