import { Download, PlugZap, Plus, Save, Trash2, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { AppSelect, AppSelectOption } from "../components/AppSelect";
import { DictionaryManagerCard } from "../components/DictionaryManagerCard";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { createDictionaryProvider, canUseRemoteDictionaryProvider } from "../services/dictionary/remoteDictionaryProviders";
import { importStoreBackup, resetStore, upsertProvider } from "../services/storage/localStore";
import { PageProps } from "../types/app";
import { ApiProvider, AppSettings, FontMode, ProviderPurpose, ProviderType } from "../types/models";
import { createId, nowIso } from "../utils/id";
import { downloadTextFile } from "../utils/text";

type ProviderForm = {
  id?: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  appId: string;
  apiKey: string;
  model: string;
  language: string;
  enabled: boolean;
  priority: number;
  defaultTargetLang: string;
  useFor: ProviderPurpose[];
};

const emptyProviderForm: ProviderForm = {
  name: "",
  type: "mymemory",
  baseUrl: "",
  appId: "",
  apiKey: "",
  model: "",
  language: "auto",
  enabled: true,
  priority: 10,
  defaultTargetLang: "zh",
  useFor: ["translate"]
};

const purposes: ProviderPurpose[] = ["translate", "dictionary", "explain", "ocr"];

const themeOptions: AppSelectOption[] = [
  { value: "system", label: "跟随系统", description: "推荐" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" }
];

const fontOptions: AppSelectOption[] = [
  { value: "default", label: "默认字体", description: "更接近普通应用，避免手写体" },
  { value: "system", label: "跟随系统字体", description: "使用手机系统字体设置" }
];

const historyOptions: AppSelectOption[] = [
  { value: "true", label: "自动保存", description: "翻译结果保存到历史" },
  { value: "false", label: "不自动保存" }
];

const providerTypeOptions: AppSelectOption[] = [
  { value: "mymemory", label: "MyMemory 免费翻译", description: "无需 key，默认内置翻译" },
  { value: "libretranslate", label: "LibreTranslate", description: "可配置自建或公共实例" },
  { value: "openai", label: "OpenAI Compatible", description: "高质量翻译/解释，需要兼容接口 key" },
  { value: "free_dictionary", label: "Free Dictionary", description: "无需 key，查词默认可用" },
  { value: "oxford", label: "Oxford API", description: "官方 API，需要 app_id + app_key" },
  { value: "merriam_webster", label: "Merriam-Webster", description: "官方 API，需要 key" },
  { value: "deepl", label: "DeepL", description: "翻译占位" },
  { value: "google", label: "Google", description: "翻译占位" },
  { value: "custom", label: "Custom", description: "自定义 Provider" },
  { value: "mock", label: "Mock", description: "仅调试兜底" }
];

const enabledOptions: AppSelectOption[] = [
  { value: "true", label: "启用" },
  { value: "false", label: "停用" }
];

export function SettingsPage({ store, setStore }: PageProps) {
  const [providerForm, setProviderForm] = useState<ProviderForm>(emptyProviderForm);
  const [testMessage, setTestMessage] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [showAdvancedProviders, setShowAdvancedProviders] = useState(false);

  const sortedProviders = useMemo(
    () => [...store.apiProviders].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)),
    [store.apiProviders]
  );

  const enabledTranslateProvider = sortedProviders.find((provider) => provider.enabled && provider.useFor.includes("translate") && provider.type !== "mock");
  const enabledDictionaryProvider = sortedProviders.find((provider) => provider.enabled && provider.useFor.includes("dictionary") && provider.type !== "mock");

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setStore((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: value
      }
    }));
  }

  function exportBackup() {
    const exportedAt = new Date().toISOString();
    const backup = JSON.stringify({ ...store, exportedAt, app: "LiteDict" }, null, 2);
    downloadTextFile(`litedict-backup-${exportedAt.slice(0, 10)}.json`, backup, "application/json;charset=utf-8");
    setBackupMessage("完整备份已导出。它包含设置、Provider、词汇本、历史、词典数据。请妥善保存。 ");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const next = importStoreBackup(text);
      setStore(() => next);
      setBackupMessage("备份已恢复。当前页面数据已经替换为导入内容。 ");
    } catch {
      setBackupMessage("备份恢复失败。请确认选择的是 LiteDict 导出的 JSON 文件。 ");
    } finally {
      event.target.value = "";
    }
  }

  function applyProviderType(typeValue: string) {
    const type = typeValue as ProviderType;
    const preset = providerPreset(type);
    setProviderForm((current) => ({
      ...current,
      type,
      name: current.name.trim() ? current.name : preset.name,
      baseUrl: current.baseUrl.trim() ? current.baseUrl : preset.baseUrl,
      language: preset.language ?? current.language,
      useFor: preset.useFor,
      priority: preset.priority,
      model: type === "openai" && !current.model ? "gpt-4.1-mini" : current.model
    }));
  }

  function saveProvider(event: FormEvent) {
    event.preventDefault();
    if (!providerForm.name.trim()) {
      return;
    }
    const now = nowIso();
    const existing = providerForm.id ? store.apiProviders.find((provider) => provider.id === providerForm.id) : undefined;
    const provider: ApiProvider = {
      id: providerForm.id ?? createId("provider"),
      name: providerForm.name.trim(),
      type: providerForm.type,
      baseUrl: providerForm.baseUrl.trim() || undefined,
      appId: providerForm.appId.trim() || existing?.appId,
      apiKeyEncrypted: providerForm.apiKey.trim() || existing?.apiKeyEncrypted,
      model: providerForm.model.trim() || undefined,
      language: providerForm.language.trim() || undefined,
      enabled: providerForm.enabled,
      priority: providerForm.priority,
      useFor: providerForm.useFor,
      defaultTargetLang: providerForm.defaultTargetLang.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    setStore((current) => upsertProvider(current, provider));
    setProviderForm(emptyProviderForm);
  }

  function editProvider(provider: ApiProvider) {
    setProviderForm({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      baseUrl: provider.baseUrl ?? "",
      appId: provider.appId ?? "",
      apiKey: "",
      model: provider.model ?? "",
      language: provider.language ?? "",
      enabled: provider.enabled,
      priority: provider.priority,
      defaultTargetLang: provider.defaultTargetLang ?? "",
      useFor: provider.useFor
    });
    setShowAdvancedProviders(true);
    setTestMessage("");
  }

  function deleteProvider(id: string) {
    if (id === "provider_mock") {
      return;
    }
    setStore((current) => ({
      ...current,
      apiProviders: current.apiProviders.filter((provider) => provider.id !== id)
    }));
  }

  async function testProvider(provider: ApiProvider) {
    setTestMessage("");
    if (provider.useFor.includes("dictionary") && isDictionaryApiProviderType(provider.type)) {
      if (!canUseRemoteDictionaryProvider(provider)) {
        setTestMessage(`${provider.name} 缺少必填凭据。Oxford 需要 app_id + app_key；Merriam-Webster 需要 API key。`);
        return;
      }
      try {
        const entry = await createDictionaryProvider(provider).lookup({ text: "hello", sourceLang: provider.language ?? "en" });
        setTestMessage(entry ? `${provider.name} 查词测试成功：${entry.headword}` : `${provider.name} 未返回 hello 词条。`);
      } catch (caught) {
        setTestMessage(`查词测试失败：${toFriendlySettingsError(caught)}`);
      }
      return;
    }

    if (provider.type === "mymemory") {
      setTestMessage("MyMemory 免费翻译默认可用；实际可用性受公共服务限额和网络影响。");
      return;
    }
    if (provider.type === "libretranslate") {
      setTestMessage("LibreTranslate 已支持。公共实例可能限流，推荐后续换成自建实例或填写稳定 base URL。");
      return;
    }
    if (provider.type === "mock") {
      setTestMessage("Mock Provider 仅用于调试兜底，不建议作为用户可见翻译源。");
      return;
    }
    if (provider.type !== "openai") {
      setTestMessage(`${provider.name} 仍是占位适配器。`);
      return;
    }
    if (!provider.baseUrl || !provider.apiKeyEncrypted || !provider.model) {
      setTestMessage("缺少 base URL、API key 或 model。");
      return;
    }
    try {
      const baseUrl = provider.baseUrl.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${provider.apiKeyEncrypted}`
        }
      });
      setTestMessage(response.ok ? "连接测试成功。" : `连接测试返回 HTTP ${response.status}。`);
    } catch (caught) {
      setTestMessage(`连接测试失败：${toFriendlySettingsError(caught)}`);
    }
  }

  return (
    <section className="page settings-page">
      <PageHeader
        eyebrow="Settings"
        title="我的与设置"
        actions={
          <button className="button danger" type="button" onClick={() => setStore(() => resetStore())}>
            重置本地数据
          </button>
        }
      />

      <div className="grid-two settings-grid">
        <div className="panel pad stack settings-card">
          <div>
            <div className="panel-title">偏好</div>
            <div className="muted small">日常使用只需要调整主题、字体和历史保存。</div>
          </div>
          <div className="grid-two">
            <AppSelect label="主题" value={store.settings.theme} options={themeOptions} onChange={(value) => updateSetting("theme", value as AppSettings["theme"])} />
            <AppSelect label="字体" value={store.settings.fontMode} options={fontOptions} onChange={(value) => updateSetting("fontMode", value as FontMode)} />
          </div>
          <div className="grid-two">
            <AppSelect label="历史" value={store.settings.autoSaveHistory ? "true" : "false"} options={historyOptions} onChange={(value) => updateSetting("autoSaveHistory", value === "true")} />
            <div className="field">
              <label htmlFor="local-folder">本地词典文件夹</label>
              <input id="local-folder" className="input" value={store.settings.localDictionaryFolder} onChange={(event) => updateSetting("localDictionaryFolder", event.target.value)} />
            </div>
          </div>
        </div>

        <div className="panel pad stack settings-card backup-card">
          <div>
            <div className="panel-title">备份与恢复</div>
            <div className="muted small">完整备份包含词汇本、历史、Provider、设置和导入词典。</div>
          </div>
          <div className="backup-actions">
            <button className="button primary" type="button" onClick={exportBackup}>
              <Download size={16} aria-hidden="true" />
              导出完整备份
            </button>
            <label className="button" htmlFor="settings-backup-import">
              <Upload size={16} aria-hidden="true" />
              恢复备份
            </label>
            <input id="settings-backup-import" className="hidden-file" type="file" accept=".json,application/json" onChange={importBackup} />
          </div>
          {backupMessage ? <div className="notice">{backupMessage}</div> : null}
          <div className="notice">API key 只保存在本地应用数据和你导出的备份文件中，不要公开分享备份。</div>
        </div>
      </div>

      <DictionaryManagerCard store={store} setStore={setStore} />

      <section className="panel pad stack provider-summary-card">
        <div className="item-head">
          <div>
            <div className="panel-title">翻译与词典服务</div>
            <div className="muted small">默认配置已经可用。高级 Provider 只在需要 API key 或自建服务时打开。</div>
          </div>
          <button className="button" type="button" onClick={() => setShowAdvancedProviders((value) => !value)}>
            {showAdvancedProviders ? "收起高级" : "高级设置"}
          </button>
        </div>
        <div className="provider-status-grid">
          <ProviderStatus title="翻译" provider={enabledTranslateProvider} fallback="MyMemory 免费翻译" />
          <ProviderStatus title="查词" provider={enabledDictionaryProvider} fallback="Free Dictionary API" />
        </div>
      </section>

      {showAdvancedProviders ? (
        <>
          <form className="panel pad stack settings-card provider-wizard" onSubmit={saveProvider}>
            <div className="item-head">
              <div>
                <div className="panel-title">高级 Provider</div>
                <div className="muted small">普通使用不需要配置；只有切换高质量 API 或自建服务时才需要。</div>
              </div>
              {providerForm.id ? (
                <button className="button" type="button" onClick={() => setProviderForm(emptyProviderForm)}>
                  <Plus size={16} aria-hidden="true" />
                  新增
                </button>
              ) : null}
            </div>

            <AppSelect label="Provider 类型" value={providerForm.type} options={providerTypeOptions} onChange={applyProviderType} />

            <div className="provider-preset-grid" aria-label="常用预设">
              {providerTypeOptions.slice(0, 4).map((option) => (
                <button className={providerForm.type === option.value ? "preset-card active" : "preset-card"} type="button" key={option.value} onClick={() => applyProviderType(option.value)}>
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>

            <div className="grid-two">
              <div className="field">
                <label htmlFor="provider-name">名称</label>
                <input id="provider-name" className="input" value={providerForm.name} onChange={(event) => setProviderForm({ ...providerForm, name: event.target.value })} />
              </div>
              <AppSelect label="状态" value={providerForm.enabled ? "true" : "false"} options={enabledOptions} onChange={(value) => setProviderForm({ ...providerForm, enabled: value === "true" })} />
            </div>

            <div className="field">
              <label htmlFor="provider-base">Base URL</label>
              <input id="provider-base" className="input" value={providerForm.baseUrl} onChange={(event) => setProviderForm({ ...providerForm, baseUrl: event.target.value })} placeholder="https://api.mymemory.translated.net/get" />
            </div>
            <div className="grid-three">
              <div className="field">
                <label htmlFor="provider-app-id">App ID</label>
                <input id="provider-app-id" className="input" value={providerForm.appId} onChange={(event) => setProviderForm({ ...providerForm, appId: event.target.value })} placeholder="Oxford app_id" />
              </div>
              <div className="field">
                <label htmlFor="provider-key">API key / app_key</label>
                <input id="provider-key" className="input" type="password" value={providerForm.apiKey} onChange={(event) => setProviderForm({ ...providerForm, apiKey: event.target.value })} placeholder={providerForm.id ? "留空保留原 key" : ""} />
              </div>
              <div className="field">
                <label htmlFor="provider-language">语言</label>
                <input id="provider-language" className="input" value={providerForm.language} onChange={(event) => setProviderForm({ ...providerForm, language: event.target.value })} placeholder="auto / en / en-gb / en-us" />
              </div>
            </div>
            <div className="grid-two">
              <div className="field">
                <label htmlFor="provider-model">Model</label>
                <input id="provider-model" className="input" value={providerForm.model} onChange={(event) => setProviderForm({ ...providerForm, model: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="provider-priority">优先级</label>
                <input id="provider-priority" className="input" type="number" value={providerForm.priority} onChange={(event) => setProviderForm({ ...providerForm, priority: Number(event.target.value) })} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="provider-target">默认翻译目标语言</label>
              <input id="provider-target" className="input" value={providerForm.defaultTargetLang} onChange={(event) => setProviderForm({ ...providerForm, defaultTargetLang: event.target.value })} />
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <div className="label">用途</div>
              <div className="row purpose-row">
                {purposes.map((purpose) => (
                  <button
                    className={providerForm.useFor.includes(purpose) ? "chip-button active" : "chip-button"}
                    type="button"
                    key={purpose}
                    onClick={() => {
                      const useFor = providerForm.useFor.includes(purpose) ? providerForm.useFor.filter((item) => item !== purpose) : [...providerForm.useFor, purpose];
                      setProviderForm({ ...providerForm, useFor });
                    }}
                  >
                    {purpose}
                  </button>
                ))}
              </div>
            </div>
            <button className="button primary" type="submit">
              <Save size={16} aria-hidden="true" />
              保存 Provider
            </button>
          </form>

          <div className="panel provider-list-panel advanced-provider-list" style={{ marginTop: 16 }}>
            <div className="panel-header">
              <div>
                <div className="panel-title">Providers</div>
                <div className="muted small">默认用 MyMemory；高质量翻译可配置 OpenAI Compatible；LibreTranslate 适合自建或公共实例。</div>
              </div>
              <span className="chip">{store.apiProviders.length}</span>
            </div>
            {testMessage ? (
              <div className="pad">
                <div className="notice">{testMessage}</div>
              </div>
            ) : null}
            {sortedProviders.length ? (
              <div className="list provider-list">
                {sortedProviders.map((provider) => (
                  <div className="list-item provider-list-item" key={provider.id}>
                    <div className="item-head">
                      <button className="link-button" type="button" onClick={() => editProvider(provider)}>
                        <div className="item-title">{provider.name}</div>
                        <div className="muted small">
                          {provider.type} · P{provider.priority} · {provider.useFor.join(", ")}
                          {provider.language ? ` · ${provider.language}` : ""}
                          {provider.appId ? " · app_id saved" : ""}
                          {provider.apiKeyEncrypted ? " · key saved" : ""}
                        </div>
                      </button>
                      <div className="row">
                        <span className={provider.enabled ? "chip good" : "chip"}>{provider.enabled ? "enabled" : "disabled"}</span>
                        <button className="button" type="button" onClick={() => void testProvider(provider)}>
                          <PlugZap size={16} aria-hidden="true" />
                          测试
                        </button>
                        <button className="button icon danger" type="button" onClick={() => deleteProvider(provider.id)} disabled={provider.id === "provider_mock"} title="删除">
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pad">
                <EmptyState title="暂无 Provider" />
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ProviderStatus({ title, provider, fallback }: { title: string; provider?: ApiProvider; fallback: string }) {
  return (
    <div className="provider-status-card">
      <span>{title}</span>
      <strong>{provider?.name ?? fallback}</strong>
      <small>{provider ? `${provider.type} · 已启用` : "默认可用"}</small>
    </div>
  );
}

function providerPreset(type: ProviderType): Pick<ProviderForm, "name" | "baseUrl" | "language" | "useFor" | "priority"> {
  if (type === "mymemory") {
    return { name: "MyMemory Free Translate", baseUrl: "https://api.mymemory.translated.net/get", language: "auto", useFor: ["translate"], priority: 10 };
  }
  if (type === "libretranslate") {
    return { name: "LibreTranslate", baseUrl: "https://libretranslate.com/translate", language: "auto", useFor: ["translate"], priority: 15 };
  }
  if (type === "free_dictionary") {
    return { name: "Free Dictionary API", baseUrl: "https://api.dictionaryapi.dev/api/v2/entries", language: "en", useFor: ["dictionary"], priority: 20 };
  }
  if (type === "oxford") {
    return { name: "Oxford Dictionaries API", baseUrl: "https://od-api.oxforddictionaries.com/api/v2", language: "en-gb", useFor: ["dictionary"], priority: 30 };
  }
  if (type === "merriam_webster") {
    return { name: "Merriam-Webster Collegiate", baseUrl: "https://www.dictionaryapi.com/api/v3/references/collegiate/json", language: "en", useFor: ["dictionary"], priority: 40 };
  }
  if (type === "openai") {
    return { name: "OpenAI Compatible", baseUrl: "https://api.example.invalid/v1", language: "auto", useFor: ["translate", "explain"], priority: 10 };
  }
  return {
    name: `${type} Provider`,
    baseUrl: "",
    language: "auto",
    useFor: type === "mock" ? ["dictionary"] : ["translate"],
    priority: 100
  };
}

function isDictionaryApiProviderType(type: ProviderType): boolean {
  return type === "free_dictionary" || type === "oxford" || type === "merriam_webster";
}

function toFriendlySettingsError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught);
  if (/network|failed to fetch|load failed/i.test(message)) {
    return "网络连接失败。";
  }
  if (/401|403|key|unauthorized|forbidden/i.test(message)) {
    return "凭据不可用，请检查 API key。";
  }
  if (/429|limit|quota|rate/i.test(message)) {
    return "服务限流或额度不足。";
  }
  return message || "测试失败。";
}
