chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "litedict-translate-selection",
    title: "用 LiteDict 翻译选中文本",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "litedict-translate-selection") {
    return;
  }

  chrome.storage.local.set({
    lastSelection: info.selectionText || ""
  });
});

