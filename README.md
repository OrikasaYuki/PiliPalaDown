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

[中文说明](README.zh.md)

A cross-platform Bilibili video downloader built with Electron and TypeScript. Features online playback, multi-P and collection download, quality selection, and multi-language UI.

## Features

- **Online Playback** — Stream videos directly in-app with quality switching
- **Video Parsing** — Parse by BV, EP, SS, or favorites list
- **Multi-P & Collection** — Batch select and download multi-part videos and collections
- **Quality Selection** — 360P to 4K, with HEVC / AVC / AV1 codec preference
- **Download Management** — Real-time progress with speed, size, and phase info
- **Built-in Player** — Video and audio playback
- **QR Code Login** — Login with Bilibili App
- **Multi-language** — 中文 · English · 日本語
- **Theme System** — Dark (default), Light, High Contrast

## Download

Get the latest release from the [Releases page](https://github.com/OrikasaYuki/PiliPalaDown/releases).

| Package | Description |
|---------|-------------|
| `PiliPalaDown Setup x.x.x.exe` | Windows installer (recommended) |
| `PiliPalaDown x.x.x.exe` | Portable version (no install needed) |
| Source code | Zip / tar.gz archives |

**System Requirements**: Windows 10+, 64-bit. FFmpeg is bundled.

## Screenshots

*(Coming soon)*

## Development

```bash
# Clone
git clone https://github.com/OrikasaYuki/PiliPalaDown.git
cd PiliPalaDown

# Install dependencies
npm install

# Start in development mode (Electron)
npm run electron:dev

# Or run in browser (Express dev server)
npm run web:dev
```

### Build

```bash
# Build desktop installer
npm run electron:build

# Build for web
npm run web:build
```

Outputs are placed in `release/` (Electron) or `dist-web/` (web).

## Project Structure

```
src/            React UI components, stores, i18n
electron/       Electron main process & preload
server/         Bilibili API client, download manager, storage, FFmpeg
public/         App icons (SVG/PNG/ICO)
scripts/        Build utilities
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Zustand, pure CSS |
| Backend | TypeScript, Node.js |
| Desktop | Electron, electron-builder |
| Build | Vite, vite-plugin-electron |
| Storage | JSON file (no native deps) |
| Media | FFmpeg |

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report bugs** — Open an [issue](https://github.com/OrikasaYuki/PiliPalaDown/issues) with detailed steps to reproduce
2. **Suggest features** — Open an issue with the `enhancement` label
3. **Submit code** — Fork the repo, create a feature branch, and open a pull request

Please ensure your code passes TypeScript checking before submitting:
```bash
npx tsc --noEmit
```

## Issues

Before opening an issue, please:

- Check the [existing issues](https://github.com/OrikasaYuki/PiliPalaDown/issues) for duplicates
- Include your platform (Windows version, etc.)
- Provide logs from `%USERPROFILE%\.pilipaladown\app.log`
- Describe steps to reproduce clearly

## License

[MIT](LICENSE)
