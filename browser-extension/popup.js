const defaults = {
  providerType: "mock",
  providerName: "Lookup first",
  baseUrl: "",
  apiKey: "",
  model: "",
  targetLang: "zh"
};

const sourceText = document.getElementById("sourceText");
const sourceCount = document.getElementById("sourceCount");
const targetLang = document.getElementById("targetLang");
const translateButton = document.getElementById("translateButton");
const copyButton = document.getElementById("copyButton");
const clearButton = document.getElementById("clearButton");
const openOptions = document.getElementById("openOptions");
const resultText = document.getElementById("resultText");
const providerName = document.getElementById("providerName");
const statusText = document.getElementById("status");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");

let latestResult = "";
let latestAudio = "";
let debounceTimer = 0;

init();

async function init() {
  const settings = await loadSettings();
  targetLang.value = settings.targetLang || "zh";
  providerName.textContent = "查词优先";
  await renderHistory();

  const selected = await readSelectedText();
  sourceText.value = selected || "";
  updateSourceCount();
  if (selected) {
    await processText("selection");
  }
}

sourceText.addEventListener("input", () => {
  updateSourceCount();
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    void processText("debounce");
  }, 500);
});

targetLang.addEventListener("change", async () => {
  await chrome.storage.local.set({ targetLang: targetLang.value });
  if (sourceText.value.trim()) {
    await processText("target-change");
  }
});

translateButton.addEventListener("click", () => {
  void processText("manual");
});

copyButton.addEventListener("click", async () => {
  if (!latestResult) {
    setStatus("没有可复制的内容", "muted");
    return;
  }
  await navigator.clipboard.writeText(latestResult);
  setStatus("已复制", "success");
});

clearButton.addEventListener("click", () => {
  window.clearTimeout(debounceTimer);
  sourceText.value = "";
  latestResult = "";
  latestAudio = "";
  resultText.textContent = "查词或译文会显示在这里";
  updateSourceCount();
  setStatus("");
});

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

resultText.addEventListener("dblclick", () => {
  if (latestAudio) {
    const audio = new Audio(latestAudio);
    void audio.play().catch(() => speak(sourceText.value.trim()));
    return;
  }
  speak(sourceText.value.trim());
});

async function readSelectedText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTION" });
      if (response?.text) {
        await chrome.storage.local.set({ lastSelection: response.text });
        return response.text;
      }
    } catch {
      // Browser internal pages and extension pages may not accept content scripts.
    }
  }

  const data = await chrome.storage.local.get("lastSelection");
  return data.lastSelection || "";
}

async function processText(trigger) {
  const text = sourceText.value.trim();
  if (!text) {
    latestResult = "";
    latestAudio = "";
    resultText.textContent = "查词或译文会显示在这里";
    setStatus("");
    return;
  }

  if (isSingleEnglishWord(text)) {
    translateButton.textContent = "查词";
    await lookupWord(text, trigger);
    return;
  }

  translateButton.textContent = "翻译";
  await translate(text, trigger);
}

async function lookupWord(word, trigger) {
  latestAudio = "";
  providerName.textContent = "Free Dictionary";
  setStatus(trigger === "selection" ? "已读取选中单词，查词中" : "查词中", "muted");

  try {
    const entry = await lookupFreeDictionary(word);
    latestResult = formatDictionaryResult(entry);
    latestAudio = entry.audio || "";
    resultText.textContent = latestResult;
    setStatus(latestAudio ? "查词完成，双击结果可播放发音" : "查词完成，可双击结果使用系统发音", "success");
    await saveHistory(word, latestResult, "Free Dictionary");
    await renderHistory();
  } catch (error) {
    latestResult = `未找到 “${word}” 的在线词条。`;
    resultText.textContent = latestResult;
    setStatus(`查词失败：${error.message}`, "warning");
  }
}

async function lookupFreeDictionary(word) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  const entry = Array.isArray(data) ? data[0] : null;
  if (!entry) {
    throw new Error("空响应");
  }
  const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
  const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
  return {
    word: entry.word || word,
    phonetic: phonetics.find((item) => item.text)?.text || entry.phonetic || "",
    audio: normalizeAudioUrl(phonetics.find((item) => item.audio)?.audio),
    definitions: meanings.flatMap((meaning) =>
      (meaning.definitions || []).slice(0, 2).map((definition) => ({
        partOfSpeech: meaning.partOfSpeech,
        definition: definition.definition,
        example: definition.example
      }))
    )
  };
}

function formatDictionaryResult(entry) {
  const lines = [entry.word];
  if (entry.phonetic) {
    lines.push(`/${entry.phonetic.replace(/^\/+|\/+$/g, "")}/`);
  }
  for (const definition of entry.definitions.slice(0, 5)) {
    lines.push("");
    lines.push(`${definition.partOfSpeech || "definition"}. ${definition.definition}`);
    if (definition.example) {
      lines.push(`例：${definition.example}`);
    }
  }
  return lines.join("\n");
}

async function translate(text, trigger) {
  const settings = await loadSettings();
  providerName.textContent = settings.providerName || "Mock Provider";
  setStatus(trigger === "selection" ? "已读取选中文本，翻译中" : "翻译中", "muted");

  try {
    const output = settings.providerType === "openai" ? await translateWithOpenAICompatible(text, settings) : mockTranslate(text, targetLang.value);
    latestResult = output;
    latestAudio = "";
    resultText.textContent = output;
    setStatus("");
    await saveHistory(text, output, settings.providerName || "Mock Provider");
    await renderHistory();
  } catch (error) {
    const fallback = mockTranslate(text, targetLang.value);
    latestResult = fallback;
    latestAudio = "";
    resultText.textContent = fallback;
    setStatus(`已回退到 Mock：${error.message}`, "warning");
    await saveHistory(text, fallback, "Mock Provider");
    await renderHistory();
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
  const next = [
    {
      source,
      translated,
      provider,
      targetLang: targetLang.value,
      createdAt: new Date().toISOString()
    },
    ...history.filter((item) => item.source !== source || item.translated !== translated)
  ];
  await chrome.storage.local.set({ history: next.slice(0, 100) });
}

async function renderHistory() {
  const data = await chrome.storage.local.get("history");
  const history = Array.isArray(data.history) ? data.history.slice(0, 5) : [];
  historyCount.textContent = String(history.length);

  if (!history.length) {
    historyList.innerHTML = '<div class="history-empty">暂无历史</div>';
    return;
  }

  historyList.innerHTML = "";
  for (const item of history) {
    const button = document.createElement("button");
    button.className = "history-item";
    button.type = "button";
    button.innerHTML = `
      <span class="history-source"></span>
      <span class="history-translated"></span>
      <span class="history-meta"></span>
    `;
    button.querySelector(".history-source").textContent = item.source || "";
    button.querySelector(".history-translated").textContent = item.translated || "";
    button.querySelector(".history-meta").textContent = formatHistoryMeta(item);
    button.addEventListener("click", () => {
      sourceText.value = item.source || "";
      latestResult = item.translated || "";
      latestAudio = "";
      resultText.textContent = latestResult || "查词或译文会显示在这里";
      if (item.targetLang) {
        targetLang.value = item.targetLang;
      }
      updateSourceCount();
      setStatus("已载入历史记录", "muted");
    });
    historyList.appendChild(button);
  }
}

function updateSourceCount() {
  sourceCount.textContent = `${sourceText.value.trim().length} 字`;
}

function formatHistoryMeta(item) {
  const time = item.createdAt
    ? new Date(item.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";
  return [item.provider, time].filter(Boolean).join(" · ");
}

function setStatus(text, tone = "muted") {
  statusText.textContent = text;
  statusText.dataset.tone = tone;
}

function isSingleEnglishWord(text) {
  return /^[A-Za-z][A-Za-z'-]*$/.test(text.trim());
}

function normalizeAudioUrl(url) {
  if (!url) {
    return "";
  }
  return url.startsWith("//") ? `https:${url}` : url;
}

function speak(text) {
  if (!text || !("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}
