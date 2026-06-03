# LiteDict

LiteDict is a local-first personal desktop translation dictionary app. It is designed as a clean, no-ads dictionary and translation tool with bring-your-own API providers and bring-your-own dictionaries.

## Current v1 Scope

- Tauri 2 + React + TypeScript + Vite project shell.
- Focused sidebar app UI.
- Translate page with mock provider and OpenAI-compatible provider adapter.
- Dictionary page with mock lookup and imported local dictionary lookup.
- Vocabulary, glossary, translation history, dictionary source/import, and API provider settings pages.
- Local persistence through a storage adapter backed by browser/Tauri app local storage for v1.
- CSV, TSV, JSON, and TXT dictionary import preview and save flow.

## Development

```bash
npm install
npm run dev
```

Desktop development requires Rust and Tauri prerequisites:

```bash
npm run tauri:dev
```

The current machine must have Rust `cargo` installed before Tauri commands can run.

## Privacy And Data

LiteDict is local-first. User vocabulary, glossary terms, history, provider settings, and imported dictionary entries are stored locally by default. API keys are entered by the user in settings and are not committed to the repository.

API key storage is abstracted for future encryption support. Until encryption is added, treat local app data as sensitive.

## Dictionary Data Notice

This project does not include copyrighted dictionary data. Users are responsible for legally obtaining and importing any dictionaries or API credentials used with the app.

Do not commit:

- API keys
- local database files
- imported dictionaries
- dictionary cache files
- commercial dictionary datasets
- scraped dictionary data
- commercial dictionary audio
- third-party logos or brand assets

## Dictionary Source Examples

Use `dictionary_sources.example.json` as a shape reference only. Put personal source configuration in `dictionary_sources.local.json`, which is ignored by git.
## Android App

LiteDict also includes a Capacitor Android target in `android/`.

```bash
npm run android:sync
cd android
.\gradlew.bat assembleDebug
```

The debug APK is expected at `android/app/build/outputs/apk/debug/app-debug.apk` after Gradle finishes successfully.

On this Windows machine, the Android project and SDK were generated successfully, but APK generation is currently blocked by repeated Gradle timeouts while downloading AndroidX dependencies from Maven repositories. Opening `android/` in Android Studio or running Gradle from a network where Google Maven/Maven Central are stable should finish the APK build.

## Browser Extension

A Chrome/Edge Manifest V3 extension is available in `browser-extension/`.

Local install:

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select the `browser-extension` folder.

The extension supports selected-text translation, mock translation by default, and an OpenAI-compatible provider configured in the extension options page.
