const defaults = {
  providerType: "mock",
  providerName: "Mock Provider",
  baseUrl: "",
  apiKey: "",
  model: "",
  targetLang: "zh"
};

const fields = {
  providerType: document.getElementById("providerType"),
  providerName: document.getElementById("providerName"),
  baseUrl: document.getElementById("baseUrl"),
  apiKey: document.getElementById("apiKey"),
  model: document.getElementById("model"),
  targetLang: document.getElementById("targetLang")
};

const statusText = document.getElementById("status");

init();

document.getElementById("saveButton").addEventListener("click", async () => {
  const next = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value.trim()]));
  await chrome.storage.local.set(next);
  setStatus("已保存");
});

document.getElementById("clearHistoryButton").addEventListener("click", async () => {
  await chrome.storage.local.set({ history: [] });
  setStatus("历史已清空");
});

async function init() {
  const data = await chrome.storage.local.get(Object.keys(defaults));
  const settings = { ...defaults, ...data };
  for (const [key, input] of Object.entries(fields)) {
    input.value = settings[key] || "";
  }
}

function setStatus(text) {
  statusText.textContent = text;
}
