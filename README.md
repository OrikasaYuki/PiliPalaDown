# PiliPalaDown

> **免责声明 / Disclaimer**
>
> 本项目仅用于学习和研究目的。**不提倡、不鼓励**任何违反哔哩哔哩用户协议的行为。
> 本软件所使用的 API 及所有媒体内容版权均归 **上海宽娱数码科技有限公司（哔哩哔哩）** 所有。
> 用户应在下载后 **24 小时内**删除所获取的内容。
> 开发者不对使用本软件产生的任何问题负责，包括但不限于账号封禁、数据丢失、法律纠纷等。
> 如认为本项目侵犯了您的权益，请联系删除。
>
> This project is for **educational and research purposes only**. It is **NOT endorsed or encouraged**
> for any violation of Bilibili's Terms of Service.
> All APIs and media content used by this software are the property of **Bilibili (Shanghai Kuanyu Digital Technology Co., Ltd.)**.
> Users should **delete downloaded content within 24 hours**.
> The developer assumes no liability for any issues arising from the use of this software,
> including but not limited to account suspension, data loss, or legal disputes.
> If you believe this project infringes on your rights, please contact us for removal.

---

A modern, cross-platform Bilibili video downloader built with Electron and TypeScript. Features a clean minimal design with dark/light/high-contrast themes.

[中文说明](README.zh.md)

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
