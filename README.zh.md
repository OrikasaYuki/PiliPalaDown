# PiliPalaDown

> **免责声明**
>
> 本项目仅用于学习和研究目的。**不提倡、不鼓励**任何违反哔哩哔哩用户协议的行为。
> 本软件所使用的 API 及所有媒体内容版权均归 **上海宽娱数码科技有限公司（哔哩哔哩）** 所有。
> 用户应在下载后 **24 小时内**删除所获取的内容。
> 开发者不对使用本软件产生的任何问题负责，包括但不限于账号封禁、数据丢失、法律纠纷等。
> 如认为本项目侵犯了您的权益，请联系删除。

---

一个基于 Electron 和 TypeScript 的现代跨平台 Bilibili 视频下载工具。

## 功能

- **在线播放** — 应用内直接播放视频，支持画质切换
- **视频解析** — 支持 BV 号、EP 号、SS 号、收藏夹解析
- **多P与合集** — 批量选择和下载多P视频与合集
- **画质选择** — 从 360P 到 4K 多档画质
- **编码选择** — HEVC / AVC / AV1
- **下载管理** — 实时进度追踪（速度、大小、阶段）
- **内置播放器** — 视频和音频播放
- **扫码登录** — 使用哔哩哔哩 APP 扫码
- **多语言** — 中文 · English · 日本語
- **主题系统** — 深色（默认）、浅色、高对比

## 快速开始

### 开发模式

```bash
npm install
npm run electron:dev
```

### 构建

```bash
npm run electron:build    # 桌面版
npm run web:dev            # Web 模式
npm run web:build          # Web 构建
```

## 环境要求

- Node.js 20+
- npm
- FFmpeg（Windows 构建已内置）

## 技术栈

- **前端**: React 18 + Zustand + 纯 CSS
- **后端**: TypeScript + Node.js（Electron 主进程 / Express）
- **桌面**: Electron + electron-builder
- **构建**: Vite + vite-plugin-electron
- **存储**: 基于 JSON 文件（无原生依赖）

## 许可

MIT
