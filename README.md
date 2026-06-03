# LiteDict

LiteDict 鏄竴涓湰鍦颁紭鍏堢殑涓汉缈昏瘧璇嶅吀搴旂敤銆傜洰鏍囨槸鍋氫竴涓共鍑€銆佽交閲忋€佹棤骞垮憡銆佹棤闇€鐧诲綍鐨勭炕璇戝拰璇嶅吀宸ュ叿锛屾敮鎸佽嚜甯?API銆佽嚜甯﹁瘝鍏搞€佽嚜瀹氫箟鏈琛ㄥ拰璇嶆眹鏈€?
## 椤圭洰鐘舵€?
褰撳墠浠撳簱鍖呭惈锛?
- React + TypeScript + Vite 鍓嶇搴旂敤
- Tauri 2 妗岄潰绔伐绋?- Capacitor Android 宸ョ▼
- Chrome / Edge 娴忚鍣ㄦ彃浠?- Mock 缈昏瘧 Provider
- OpenAI-compatible 缈昏瘧 Provider
- Mock 璇嶅吀 Provider
- 鏈湴瀵煎叆璇嶅吀鏌ヨ
- 璇嶆眹鏈€佹湳璇〃銆佺炕璇戝巻鍙?- CSV / TSV / JSON / TXT 璇嶅吀瀵煎叆棰勮鍜屽瓧娈垫槧灏?
## 鏍稿績鍘熷垯

- 鏃犲箍鍛?- 鏃犱細鍛樺脊绐?- 鏃犺绋嬫帹鑽?- 鏃犲己鍒剁櫥褰?- 鏈湴浼樺厛
- 涓嶅唴缃晢涓氳瘝鍏告暟鎹?- 涓嶆彁浜?API key
- 鐢ㄦ埛鑷繁閰嶇疆 API 鍜屽鍏ュ悎娉曞彇寰楃殑璇嶅吀

## 鏈湴寮€鍙?
瀹夎渚濊禆锛?
```bash
npm install
```

鍚姩 Web 寮€鍙戞湇鍔★細

```bash
npm run dev
```

鏋勫缓鍓嶇锛?
```bash
npm run build
```

## 妗岄潰绔?
妗岄潰绔娇鐢?Tauri銆?
寮€鍙戣繍琛岋細

```bash
npm run tauri:dev
```

鎵撳寘妗岄潰搴旂敤锛?
```bash
npm run tauri:build
```

娉ㄦ剰锛歍auri 闇€瑕佸厛瀹夎 Rust銆丆argo 鍜?Windows C++ 鏋勫缓宸ュ叿銆?
## Android 搴旂敤

Android 绔娇鐢?Capacitor 澶嶇敤褰撳墠鍓嶇搴旂敤锛屽伐绋嬬洰褰曞湪 `android/`銆?
鍚屾鍓嶇璧勬簮鍒?Android锛?
```bash
npm run android:sync
```

鐢熸垚 Debug APK锛?
```bash
cd android
.\gradlew.bat assembleDebug
```

APK 鐢熸垚鍚庨€氬父浣嶄簬锛?
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

褰撳墠杩欏彴 Windows 鏈哄櫒涓婏紝Android 宸ョ▼鍜?SDK 宸茬敓鎴愭垚鍔燂紝浣?APK 鏋勫缓琚?Gradle 涓嬭浇 AndroidX / Maven 渚濊禆瓒呮椂闃诲銆傚彲浠ョ敤 Android Studio 鎵撳紑 `android/`锛屾垨鍦?Google Maven / Maven Central 缃戠粶绋冲畾鐨勭幆澧冧腑缁х画鎵ц Gradle 鏋勫缓銆?
## 娴忚鍣ㄦ彃浠?
Chrome / Edge 鎻掍欢浣嶄簬 `browser-extension/`锛屼娇鐢?Manifest V3銆?
鏈湴瀹夎鏂瑰紡锛?
1. 鎵撳紑 `chrome://extensions` 鎴?`edge://extensions`
2. 寮€鍚紑鍙戣€呮ā寮?3. 鐐瑰嚮鈥滃姞杞藉凡瑙ｅ帇鐨勬墿灞曠▼搴忊€?4. 閫夋嫨 `browser-extension` 鏂囦欢澶?
鎻掍欢鍔熻兘锛?
- 璇诲彇缃戦〉閫変腑鏂囨湰
- 榛樿浣跨敤 Mock Provider 缈昏瘧
- 鍙湪鎻掍欢璁剧疆椤甸厤缃?OpenAI-compatible Provider
- 璁剧疆鍜屽巻鍙蹭繚瀛樺湪娴忚鍣ㄦ湰鍦板瓨鍌?
## 璇嶅吀瀵煎叆

LiteDict 涓嶅寘鍚湡瀹炲晢涓氳瘝鍏告暟鎹€傜敤鎴峰彲浠ヨ嚜琛屽鍏ュ悎娉曞彇寰楃殑璇嶅吀鏂囦欢銆?
褰撳墠鏀寔锛?
- CSV
- TSV
- JSON
- TXT

绀轰緥婧愰厤缃锛?
```text
dictionary_sources.example.json
```

涓汉鏈湴婧愰厤缃鏀惧湪锛?
```text
dictionary_sources.local.json
```

璇ユ枃浠跺凡琚?`.gitignore` 蹇界暐锛屼笉搴旀彁浜ゃ€?
## Provider 閰嶇疆

鏀寔 OpenAI-compatible Chat Completions API锛?
- Base URL
- API Key
- Model
- 榛樿鐩爣璇█
- Provider 鍚敤鐘舵€佸拰浼樺厛绾?
涓嶈鎶婄湡瀹?API key 鍐欏叆浠撳簱銆俙.env.example` 浠呬綔涓虹ず渚嬨€?
## 闅愮鍜屾暟鎹?
LiteDict 榛樿鏈湴浼樺厛銆傝瘝姹囨湰銆佹湳璇〃銆佺炕璇戝巻鍙层€丳rovider 璁剧疆鍜屽鍏ヨ瘝鍏告潯鐩粯璁や繚瀛樺湪鏈湴銆?
褰撳墠 v1 鐨勬湰鍦版寔涔呭寲浣跨敤娴忚鍣?/ WebView 鏈湴瀛樺偍閫傞厤鍣ㄣ€傚悗缁増鏈鍒掕縼绉诲埌 SQLite锛屽苟琛ュ厖 API key 鍔犲瘑瀛樺偍銆?
## 鏁版嵁鐗堟潈澹版槑

鏈」鐩笉鍖呭惈浠讳綍鍙楃増鏉冧繚鎶ょ殑鍟嗕笟璇嶅吀鏁版嵁銆佸晢涓氳瘝鍏搁煶棰戙€佹姄鍙栬瘝鍏稿唴瀹规垨绗笁鏂瑰搧鐗岀礌鏉愩€?
鐢ㄦ埛闇€瑕佽嚜琛岃礋璐ｅ悎娉曡幏鍙栧拰瀵煎叆鎵€浣跨敤鐨勮瘝鍏告暟鎹€丄PI 鍑嵁鍜屽叾浠栬祫婧愩€?
涓嶈鎻愪氦锛?
- API key
- `.env`
- 鏈湴鏁版嵁搴?- 瀵煎叆璇嶅吀鏁版嵁
- 璇嶅吀缂撳瓨
- 鍟嗕笟璇嶅吀鏁版嵁
- 鎶撳彇鏁版嵁
- 鍟嗕笟璇嶅吀闊抽
- 绗笁鏂?Logo 鎴栧搧鐗岃祫浜?
## 鍚庣画璁″垝

- SQLite 鏈湴鏁版嵁搴?- API key 鍔犲瘑瀛樺偍
- Android APK / Release 鍖呯ǔ瀹氭瀯寤?- StarDict / MDX / MDD 瀵煎叆
- 鎴浘缈昏瘧鍜?OCR
- 鍒掕瘝寮圭獥
- 鍏ㄥ眬蹇嵎閿?- 澶?Provider 瀵规瘮
- Anki 瀵煎嚭
