import { PlugZap, Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { AppSelect, AppSelectOption } from "../components/AppSelect";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { createDictionaryProvider, canUseRemoteDictionaryProvider } from "../services/dictionary/remoteDictionaryProviders";
import { resetStore, upsertProvider } from "../services/storage/localStore";
import { PageProps } from "../types/app";
import { ApiProvider, AppSettings, ProviderPurpose, ProviderType } from "../types/models";
import { createId, nowIso } from "../utils/id";

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
  type: "openai",
  baseUrl: "",
  appId: "",
  apiKey: "",
  model: "",
  language: "en",
  enabled: true,
  priority: 20,
  defaultTargetLang: "zh",
  useFor: ["translate"]
};

const purposes: ProviderPurpose[] = ["translate", "dictionary", "explain", "ocr"];

const themeOptions: AppSelectOption[] = [
  { value: "system", label: "跟随系统", description: "推荐" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" }
];

const historyOptions: AppSelectOption[] = [
  { value: "true", label: "自动保存", description: "翻译结果保存到历史" },
  { value: "false", label: "不自动保存" }
];

const providerTypeOptions: AppSelectOption[] = [
  { value: "free_dictionary", label: "Free Dictionary", description: "无需 key，查词默认可用" },
  { value: "oxford", label: "Oxford API", description: "官方 API，需要 app_id + app_key" },
  { value: "merriam_webster", label: "Merriam-Webster", description: "官方 API，需要 key" },
  { value: "openai", label: "OpenAI Compatible", description: "翻译/解释，需要兼容接口 key" },
  { value: "deepl", label: "DeepL", description: "翻译占位" },
  { value: "google", label: "Google", description: "翻译占位" },
  { value: "custom", label: "Custom", description: "自定义 Provider" },
  { value: "mock", label: "Mock", description: "离线演示兜底" }
];

const enabledOptions: AppSelectOption[] = [
  { value: "true", label: "启用" },
  { value: "false", label: "停用" }
];

export function SettingsPage({ store, setStore }: PageProps) {
  const [providerForm, setProviderForm] = useState<ProviderForm>(emptyProviderForm);
  const [testMessage, setTestMessage] = useState("");

  const sortedProviders = useMemo(
    () => [...store.apiProviders].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)),
    [store.apiProviders]
  );

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setStore((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: value
      }
    }));
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
        setTestMessage(`查词测试失败：${(caught as Error).message}`);
      }
      return;
    }

    if (provider.type === "mock") {
      setTestMessage("Mock Provider 可用。");
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
      setTestMessage(`连接测试失败：${(caught as Error).message}`);
    }
  }

  return (
    <section className="page settings-page">
      <PageHeader
        eyebrow="Settings"
        title="我的与设置"
        actions={
          <button className="button danger" type="button" onClick={() => setStore(resetStore())}>
            重置本地数据
          </button>
        }
      />

      <div className="grid-two settings-grid">
        <div className="panel pad stack settings-card">
          <div>
            <div className="panel-title">偏好</div>
            <div className="muted small">查词优先，翻译作为辅助能力。</div>
          </div>
          <div className="grid-two">
            <AppSelect
              label="主题"
              value={store.settings.theme}
              options={themeOptions}
              onChange={(value) => updateSetting("theme", value as AppSettings["theme"])}
            />
            <AppSelect
              label="历史"
              value={store.settings.autoSaveHistory ? "true" : "false"}
              options={historyOptions}
              onChange={(value) => updateSetting("autoSaveHistory", value === "true")}
            />
          </div>
          <div className="grid-two">
            <div className="field">
              <label htmlFor="default-source">默认源语言</label>
              <input
                id="default-source"
                className="input"
                value={store.settings.defaultSourceLang}
                onChange={(event) => updateSetting("defaultSourceLang", event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="default-target">默认目标语言</label>
              <input
                id="default-target"
                className="input"
                value={store.settings.defaultTargetLang}
                onChange={(event) => updateSetting("defaultTargetLang", event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="local-folder">本地词典文件夹</label>
            <input
              id="local-folder"
              className="input"
              value={store.settings.localDictionaryFolder}
              onChange={(event) => updateSetting("localDictionaryFolder", event.target.value)}
            />
          </div>
          <div className="notice">API key 当前仅写入本地应用数据。不要把自己的 key 提交到公开仓库。</div>
        </div>

        <form className="panel pad stack settings-card provider-wizard" onSubmit={saveProvider}>
          <div className="item-head">
            <div>
              <div className="panel-title">{providerForm.id ? "编辑 Provider" : "新增 Provider"}</div>
              <div className="muted small">选择预设后会自动填入用途、Base URL 和优先级；key 仍需要你自己申请和填写。</div>
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
              <button
                className={providerForm.type === option.value ? "preset-card active" : "preset-card"}
                type="button"
                key={option.value}
                onClick={() => applyProviderType(option.value)}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>

          <div className="grid-two">
            <div className="field">
              <label htmlFor="provider-name">名称</label>
              <input
                id="provider-name"
                className="input"
                value={providerForm.name}
                onChange={(event) => setProviderForm({ ...providerForm, name: event.target.value })}
              />
            </div>
            <AppSelect
              label="状态"
              value={providerForm.enabled ? "true" : "false"}
              options={enabledOptions}
              onChange={(value) => setProviderForm({ ...providerForm, enabled: value === "true" })}
            />
          </div>

          <div className="field">
            <label htmlFor="provider-base">Base URL</label>
            <input
              id="provider-base"
              className="input"
              value={providerForm.baseUrl}
              onChange={(event) => setProviderForm({ ...providerForm, baseUrl: event.target.value })}
              placeholder="https://api.dictionaryapi.dev/api/v2/entries"
            />
          </div>
          <div className="grid-three">
            <div className="field">
              <label htmlFor="provider-app-id">App ID</label>
              <input
                id="provider-app-id"
                className="input"
                value={providerForm.appId}
                onChange={(event) => setProviderForm({ ...providerForm, appId: event.target.value })}
                placeholder="Oxford app_id"
              />
            </div>
            <div className="field">
              <label htmlFor="provider-key">API key / app_key</label>
              <input
                id="provider-key"
                className="input"
                type="password"
                value={providerForm.apiKey}
                onChange={(event) => setProviderForm({ ...providerForm, apiKey: event.target.value })}
                placeholder={providerForm.id ? "留空保留原 key" : ""}
              />
            </div>
            <div className="field">
              <label htmlFor="provider-language">语言</label>
              <input
                id="provider-language"
                className="input"
                value={providerForm.language}
                onChange={(event) => setProviderForm({ ...providerForm, language: event.target.value })}
                placeholder="en / en-gb / en-us"
              />
            </div>
          </div>
          <div className="grid-two">
            <div className="field">
              <label htmlFor="provider-model">Model</label>
              <input
                id="provider-model"
                className="input"
                value={providerForm.model}
                onChange={(event) => setProviderForm({ ...providerForm, model: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="provider-priority">优先级</label>
              <input
                id="provider-priority"
                className="input"
                type="number"
                value={providerForm.priority}
                onChange={(event) => setProviderForm({ ...providerForm, priority: Number(event.target.value) })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="provider-target">默认翻译目标语言</label>
            <input
              id="provider-target"
              className="input"
              value={providerForm.defaultTargetLang}
              onChange={(event) => setProviderForm({ ...providerForm, defaultTargetLang: event.target.value })}
            />
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
                    const useFor = providerForm.useFor.includes(purpose)
                      ? providerForm.useFor.filter((item) => item !== purpose)
                      : [...providerForm.useFor, purpose];
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
      </div>

      <div className="panel provider-list-panel" style={{ marginTop: 16 }}>
        <div className="panel-header">
          <div>
            <div className="panel-title">Providers</div>
            <div className="muted small">推荐顺序：本地词典 → Free Dictionary → Oxford/Merriam-Webster → Mock。</div>
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
                    <button
                      className="button icon danger"
                      type="button"
                      onClick={() => deleteProvider(provider.id)}
                      disabled={provider.id === "provider_mock"}
                      title="删除"
                    >
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
    </section>
  );
}

function providerPreset(type: ProviderType): Pick<ProviderForm, "name" | "baseUrl" | "language" | "useFor" | "priority"> {
  if (type === "free_dictionary") {
    return {
      name: "Free Dictionary API",
      baseUrl: "https://api.dictionaryapi.dev/api/v2/entries",
      language: "en",
      useFor: ["dictionary"],
      priority: 20
    };
  }
  if (type === "oxford") {
    return {
      name: "Oxford Dictionaries API",
      baseUrl: "https://od-api.oxforddictionaries.com/api/v2",
      language: "en-gb",
      useFor: ["dictionary"],
      priority: 30
    };
  }
  if (type === "merriam_webster") {
    return {
      name: "Merriam-Webster Collegiate",
      baseUrl: "https://www.dictionaryapi.com/api/v3/references/collegiate/json",
      language: "en",
      useFor: ["dictionary"],
      priority: 40
    };
  }
  if (type === "openai") {
    return {
      name: "OpenAI Compatible",
      baseUrl: "https://api.example.invalid/v1",
      language: "auto",
      useFor: ["translate", "explain"],
      priority: 10
    };
  }
  return {
    name: `${type} Provider`,
    baseUrl: "",
    language: "auto",
    useFor: type === "mock" ? ["translate", "dictionary"] : ["translate"],
    priority: 100
  };
}

function isDictionaryApiProviderType(type: ProviderType): boolean {
  return type === "free_dictionary" || type === "oxford" || type === "merriam_webster";
}
