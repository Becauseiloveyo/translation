const defaults = {
  providerType: "mock",
  providerName: "Mock Provider",
  baseUrl: "",
  apiKey: "",
  model: "",
  targetLang: "zh"
};

const sourceText = document.getElementById("sourceText");
const targetLang = document.getElementById("targetLang");
const translateButton = document.getElementById("translateButton");
const copyButton = document.getElementById("copyButton");
const openOptions = document.getElementById("openOptions");
const resultText = document.getElementById("resultText");
const providerName = document.getElementById("providerName");
const statusText = document.getElementById("status");

let latestResult = "";

init();

async function init() {
  const settings = await loadSettings();
  targetLang.value = settings.targetLang || "zh";
  providerName.textContent = settings.providerName || "Mock Provider";

  const selected = await readSelectedText();
  sourceText.value = selected || "";
  if (selected) {
    await translate();
  }
}

translateButton.addEventListener("click", () => {
  void translate();
});

copyButton.addEventListener("click", async () => {
  if (!latestResult) {
    return;
  }
  await navigator.clipboard.writeText(latestResult);
  setStatus("已复制");
});

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function readSelectedText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTION" });
      if (response?.text) {
        chrome.storage.local.set({ lastSelection: response.text });
        return response.text;
      }
    } catch {
      // Some browser pages do not accept content scripts.
    }
  }

  const data = await chrome.storage.local.get("lastSelection");
  return data.lastSelection || "";
}

async function translate() {
  const text = sourceText.value.trim();
  if (!text) {
    latestResult = "";
    resultText.textContent = "等待输入";
    setStatus("");
    return;
  }

  const settings = await loadSettings();
  providerName.textContent = settings.providerName || "Mock Provider";
  setStatus("翻译中");

  try {
    const output =
      settings.providerType === "openai" ? await translateWithOpenAICompatible(text, settings) : mockTranslate(text, targetLang.value);
    latestResult = output;
    resultText.textContent = output;
    setStatus("");
    await saveHistory(text, output, settings.providerName || "Mock Provider");
  } catch (error) {
    const fallback = mockTranslate(text, targetLang.value);
    latestResult = fallback;
    resultText.textContent = fallback;
    setStatus(`已回退到 Mock：${error.message}`);
  }
}

function mockTranslate(text, lang) {
  return lang === "en" ? `Mock translation: ${text}` : `模拟译文：${text}`;
}

async function translateWithOpenAICompatible(text, settings) {
  if (!settings.baseUrl || !settings.apiKey || !settings.model) {
    throw new Error("Provider 设置不完整");
  }

  const baseUrl = settings.baseUrl.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Return only the translated text. Do not add commentary."
        },
        {
          role: "user",
          content: `Translate to ${targetLang.value}:\n\n${text}`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const translated = data?.choices?.[0]?.message?.content?.trim();
  if (!translated) {
    throw new Error("空响应");
  }
  return translated;
}

async function loadSettings() {
  const data = await chrome.storage.local.get(Object.keys(defaults));
  return { ...defaults, ...data };
}

async function saveHistory(source, translated, provider) {
  const data = await chrome.storage.local.get("history");
  const history = Array.isArray(data.history) ? data.history : [];
  history.unshift({
    source,
    translated,
    provider,
    targetLang: targetLang.value,
    createdAt: new Date().toISOString()
  });
  await chrome.storage.local.set({ history: history.slice(0, 100) });
}

function setStatus(text) {
  statusText.textContent = text;
}

