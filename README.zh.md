# PiliPalaDown

> **免责声明**
>
> 本项目仅用于学习和研究目的。**不提倡、不鼓励**任何违反哔哩哔哩用户协议的行为。
> 本软件所使用的 API 及所有媒体内容版权均归 **上海宽娱数码科技有限公司（哔哩哔哩）** 所有。
> 用户应在下载后 **24 小时内**删除所获取的内容。
> 开发者不对使用本软件产生的任何问题负责，包括但不限于账号封禁、数据丢失、法律纠纷等。
> 如认为本项目侵犯了您的权益，请联系删除。

[English](README.md)

一个基于 Electron 和 TypeScript 的跨平台 Bilibili 视频下载工具。支持在线播放、多P与合集下载、画质选择、多语言界面。

## 功能

- **在线播放** — 应用内直接播放，支持画质切换
- **视频解析** — 支持 BV 号、EP 号、SS 号、收藏夹解析
- **多P与合集** — 批量选择和下载多P视频与合集
- **画质选择** — 360P 到 4K，支持 HEVC / AVC / AV1 编码
- **下载管理** — 实时进度显示（速度、大小、阶段）
- **内置播放器** — 视频和音频播放
- **扫码登录** — 使用哔哩哔哩 APP 扫码
- **多语言** — 中文 · English · 日本語
- **主题系统** — 深色（默认）、浅色、高对比

## 下载

最新版本请访问 [Releases 页面](https://github.com/OrikasaYuki/PiliPalaDown/releases)。

| 包 | 说明 |
|------|------|
| `PiliPalaDown Setup x.x.x.exe` | Windows 安装包（推荐） |
| `PiliPalaDown x.x.x.exe` | 便携版（免安装） |
| Source code | 源代码压缩包 |

**系统要求**：Windows 10+，64位。已内置 FFmpeg。

## 开发

```bash
git clone https://github.com/OrikasaYuki/PiliPalaDown.git
cd PiliPalaDown
npm install
npm run electron:dev    # Electron 开发模式
npm run web:dev          # 浏览器开发模式
```

### 构建

```bash
npm run electron:build  # 构建桌面安装包
npm run web:build       # 构建 Web 版
```

构建产物在 `release/`（桌面版）或 `dist-web/`（Web 版）。

## 项目结构

```
src/            React 组件、状态管理、国际化
electron/       Electron 主进程 & preload
server/         Bilibili API 客户端、下载管理、存储、FFmpeg
public/         应用图标 (SVG/PNG/ICO)
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

欢迎贡献代码！你可以通过以下方式帮助项目：

1. **报告 Bug** — 提交 [issue](https://github.com/OrikasaYuki/PiliPalaDown/issues)，描述复现步骤
2. **建议功能** — 提交 issue，标记 `enhancement`
3. **提交代码** — Fork 仓库，创建特性分支，提交 Pull Request

提交前请确保 TypeScript 检查通过：
```bash
npx tsc --noEmit
```

## Issues

提交 issue 前请：

- 检查[已有 issues](https://github.com/OrikasaYuki/PiliPalaDown/issues) 避免重复
- 提供操作系统版本
- 提供日志文件 `%USERPROFILE%\.pilipaladown\app.log`
- 清晰描述复现步骤

## 许可

[MIT](LICENSE)
