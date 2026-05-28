# PiliPalaDown

> **免责声明**
>
> 本项目仅用于学习和研究目的。**不提倡、不鼓励**任何违反哔哩哔哩用户协议的行为。
> 本软件所使用的 API 及所有媒体内容版权均归 **上海宽娱数码科技有限公司（哔哩哔哩）** 所有。
> 用户应在下载后 **24 小时内**删除所获取的内容。
> 开发者不对使用本软件产生的任何问题负责，包括但不限于账号封禁、数据丢失、法律纠纷等。
> 如认为本项目侵犯了您的权益，请联系删除。

[English](README.md)

一个基于 Electron 和 TypeScript 的跨平台 Bilibili 视频下载工具。现已支持 **Android**（实验性）。

## 功能

- **在线播放** — 通过 Bilibili 官方 iframe 播放器直接观看
- **视频解析** — 支持 BV 号、EP 号、SS 号、收藏夹解析
- **多P与合集** — 批量选择和下载多P视频与合集
- **画质选择** — 360P 到 8K，HEVC / AVC / AV1 编码偏好
- **音频选择** — 每项独立音频格式选择（AAC / FLAC Hi-Res / Dolby Atmos）
- **下载管理** — 实时进度（速度、大小、阶段）
- **扫码登录** — 使用哔哩哔哩 APP 扫码
- **多语言** — 中文 · English · 日本語
- **主题系统** — 深色（默认）、浅色、高对比
- **GPU 开关** — 启用/禁用 GPU 加速，崩溃自动恢复
- **系统托盘** — 最小化到托盘，右键菜单
- **Android** — 原生下载引擎、自适应图标、竖屏支持

### Android 目前限制
- 高画质视频合并可能失败（WebView 内存限制），降级为分别保存音视频文件
- 部分文件无法获取大小时下载进度条不显示
- 文件管理功能暂不可用

## 下载

最新版本请访问 [Releases 页面](https://github.com/OrikasaYuki/PiliPalaDown/releases)。

| 包 | 说明 |
|------|------|
| `PiliPalaDown Setup x.x.x.exe` | Windows 安装包（推荐） |
| `PiliPalaDown x.x.x.exe` | 便携版（免安装） |

**系统要求**：Windows 10+，64位。已内置 FFmpeg。

## 快速开始

```bash
git clone https://github.com/OrikasaYuki/PiliPalaDown.git
cd PiliPalaDown
npm install
npm run electron:dev      # 开发模式（Electron）
npm run electron:build    # 构建桌面安装包
```

## 项目结构

```
src/            React 组件、状态管理、国际化
electron/       Electron 主进程 & preload
server/         Bilibili API、下载管理、FFmpeg、存储
public/         应用图标
scripts/        构建工具
```

## 技术栈

| 层 | 技术 |
|------|-----------|
| 前端 | React 18, Zustand, 纯 CSS |
| 后端 | TypeScript, Node.js |
| 桌面 | Electron, electron-builder |
| 构建 | Vite, vite-plugin-electron |
| 存储 | JSON 文件（无原生依赖） |
| 媒体 | FFmpeg |

## 贡献

欢迎通过 [issues](https://github.com/OrikasaYuki/PiliPalaDown/issues) 报告问题或提交 PR。

## 许可

[MIT](LICENSE)
