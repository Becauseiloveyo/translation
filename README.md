# LiteDict

LiteDict 是一个本地优先的个人翻译词典应用。目标是做一个干净、轻量、无广告、无需登录的翻译和词典工具，支持自带 API、自带词典、自定义术语表和词汇本。

## 项目状态

当前仓库包含：

- React + TypeScript + Vite 前端应用
- Tauri 2 桌面端工程
- Capacitor Android 工程
- Chrome / Edge 浏览器插件
- Mock 翻译 Provider
- OpenAI-compatible 翻译 Provider
- Mock 词典 Provider
- 本地导入词典查询
- 词汇本、术语表、翻译历史
- CSV / TSV / JSON / TXT 词典导入预览和字段映射

## 核心原则

- 无广告
- 无会员弹窗
- 无课程推荐
- 无强制登录
- 本地优先
- 不内置商业词典数据
- 不提交 API key
- 用户自己配置 API 和导入合法取得的词典

## 本地开发

安装依赖：

```bash
npm install
```

启动 Web 开发服务：

```bash
npm run dev
```

构建前端：

```bash
npm run build
```

## 桌面端

桌面端使用 Tauri。

开发运行：

```bash
npm run tauri:dev
```

打包桌面应用：

```bash
npm run tauri:build
```

注意：Tauri 需要先安装 Rust、Cargo 和 Windows C++ 构建工具。

## Android 应用

Android 端使用 Capacitor 复用当前前端应用，工程目录在 `android/`。

同步前端资源到 Android：

```bash
npm run android:sync
```

生成 Debug APK：

```bash
cd android
./gradlew assembleDebug
```

在 Windows PowerShell 中也可以运行：

```powershell
cd android
.\gradlew.bat assembleDebug
```

APK 生成后通常位于：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

如果本地 Gradle 下载 AndroidX / Maven 依赖超时，可以用 Android Studio 打开 `android/` 后构建，或换到 Google Maven / Maven Central 网络稳定的环境继续执行 Gradle。

## 浏览器插件

Chrome / Edge 插件位于 `browser-extension/`，使用 Manifest V3。

本地安装方式：

1. 打开 `chrome://extensions` 或 `edge://extensions`
2. 开启开发者模式
3. 点击“加载已解压的扩展程序”
4. 选择 `browser-extension` 文件夹

插件功能：

- 读取网页选中文本
- 默认使用 Mock Provider 翻译
- 可在插件设置页配置 OpenAI-compatible Provider
- 设置和历史保存在浏览器本地存储

## GitHub 发行版

发行版会把 Android 和浏览器插件分开放：

- `litedict-browser-extension-*.zip`：Chrome / Edge 插件包
- `litedict-android-project-*.zip`：Android 工程包
- `litedict-android-debug-*.apk`：如果 GitHub Actions 成功完成 Android 构建，会附带 Debug APK

## 词典导入

LiteDict 不包含真实商业词典数据。用户可以自行导入合法取得的词典文件。

当前支持：

- CSV
- TSV
- JSON
- TXT

示例源配置见：

```text
dictionary_sources.example.json
```

个人本地源配置请放在：

```text
dictionary_sources.local.json
```

该文件已被 `.gitignore` 忽略，不应提交。

## Provider 配置

支持 OpenAI-compatible Chat Completions API：

- Base URL
- API Key
- Model
- 默认目标语言
- Provider 启用状态和优先级

不要把真实 API key 写入仓库。`.env.example` 仅作为示例。

## 隐私和数据

LiteDict 默认本地优先。词汇本、术语表、翻译历史、Provider 设置和导入词典条目默认保存在本地。

当前 v1 的本地持久化使用浏览器 / WebView 本地存储适配器。后续版本计划迁移到 SQLite，并补充 API key 加密存储。

## 数据版权声明

本项目不包含任何受版权保护的商业词典数据、商业词典音频、抓取词典内容或第三方品牌素材。

用户需要自行负责合法获取和导入所使用的词典数据、API 凭据和其他资源。

不要提交：

- API key
- `.env`
- 本地数据库
- 导入词典数据
- 词典缓存
- 商业词典数据
- 抓取数据
- 商业词典音频
- 第三方 Logo 或品牌资产

## 后续计划

- SQLite 本地数据库
- API key 加密存储
- Android APK / Release 包稳定构建
- StarDict / MDX / MDD 导入
- 截图翻译和 OCR
- 划词弹窗
- 全局快捷键
- 多 Provider 对比
- Anki 导出

