# Changelog

[中文版本](CHANGELOG.zh.md)

## [1.2.0] — 2026-05-29

### Added
- Android native download engine (bypasses WebView OOM, supports large files)
- Android adaptive icon branded with project logo
- Download cache viewer & cleaner in settings
- Download path hint on completion
- Portrait mode hamburger menu navigation

### Fixed
- Download retries now mark stuck tasks as failed on app restart (Android + Electron)
- Download error messages now shown with full detail
- i18n for download status text

### Android Limitations
- Audio/video merging may fail on high-quality videos (1080P60+) due to WebView memory constraints — falls back to separate video+audio files
- Download progress may not show for files where server does not provide content-length
- File management features (open file location) not available

## [1.1.1] — 2026-05-27

### Fixed
- QR code not displaying in Electron (missing `qrcode` image generation in IPC handler)

## [1.1.0] — 2026-05-27

### Added
- Audio format selection per item in download modal (AAC / FLAC Hi-Res / Dolby Atmos)
- Quality options 112 (1080P+), 125 (HDR), 126 (Dolby Vision), 127 (8K) in settings

### Changed
- Online playback switched from DASH direct play to Bilibili official iframe player
- Complete UI redesign: blue-purple accent palette, shadow system, card animations
- Slimmer header (48px), ghost buttons, pill section tabs
- spring-animated modals with stronger backdrop blur
- Dark theme default: dark gray (#08080e) for reduced eye strain
- Download quality algorithm: nearest match instead of highest available
- Default download quality: 360P, user-configurable in settings
- Settings page: wider layout (640px), card-based grouping

### Fixed
- Download progress flickering between phases (removed DB polling)
- Section tab selection off-by-one error
- Collection numbering mixing episode count with page count
- webRequest handler not intercepting when user logs in after startup
- Missing quality labels (112/125/126/127) in locale files
- i18n not updating nav bar on language switch (useT hook)
- Various scrollbar, spacing, and responsive layout issues

## [1.0.0] — 2026-05-27

First public release.

### Added
- Bilibili video parsing (BV/EP/SS/favorites)
- DASH stream quality selection (360P–4K) with codec preference
- Batch multi-P and collection download
- Online playback with separate audio+video stream sync
- Built-in video/audio player with quality switching
- Download manager with real-time progress (speed, size, phase)
- System tray with minimize-to-tray behavior
- QR code login with Bilibili App
- FFmpeg-based audio/video merging for downloads
- Multi-language support: 中文 / English / 日本語
- Theme system: Dark (default), Light, High Contrast
- GPU acceleration toggle with crash auto-recovery
- Discover page with trending video feed (toggleable)
- Custom app icon (SVG/PNG/ICO)
- Single-instance lock
- Platform adapter architecture (Electron / Web / Android-ready)
- Express server for web browser mode
