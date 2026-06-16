import { CheckCircle2, ClipboardCheck, Download } from "lucide-react";
import { AppStore } from "../types/models";
import { downloadTextFile } from "../utils/text";

type ReleasePreflightCardProps = {
  store: AppStore;
};

export function ReleasePreflightCard({ store }: ReleasePreflightCardProps) {
  const rows = buildPreflightRows(store);

  function exportChecklist() {
    const content = [
      "LiteDict Release Preflight",
      "",
      ...rows.map((row) => `- [${row.ok ? "x" : " "}] ${row.title}: ${row.detail}`),
      "",
      "Manual checks:",
      "- [ ] APK builds successfully in GitHub Actions",
      "- [ ] Launcher icon is unchanged on MIUI/home screen",
      "- [ ] Lookup works for password, translation, and running",
      "- [ ] Suggestions work for a, tr, and app",
      "- [ ] CSV dictionary import preview works with 3 test rows",
      "- [ ] Vocabulary item can jump back to dictionary lookup"
    ].join("\n");
    downloadTextFile("litedict-release-preflight.md", content, "text/markdown;charset=utf-8");
  }

  return (
    <section className="panel pad stack release-preflight-card">
      <div className="item-head">
        <div>
          <div className="panel-title">Release 前自检</div>
          <div className="muted small">发正式包前先过一遍，避免图标、查词、导入和词汇本跳转回归。</div>
        </div>
        <button className="button" type="button" onClick={exportChecklist}>
          <Download size={16} aria-hidden="true" />
          导出清单
        </button>
      </div>
      <div className="release-check-list">
        {rows.map((row) => (
          <div className={row.ok ? "release-check-item good" : "release-check-item"} key={row.title}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <div>
              <strong>{row.title}</strong>
              <span>{row.detail}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="notice">
        <ClipboardCheck size={15} aria-hidden="true" />
        构建成功和桌面图标仍需在 GitHub Actions 与真机上确认。
      </div>
    </section>
  );
}

type PreflightRow = {
  title: string;
  detail: string;
  ok: boolean;
};

function buildPreflightRows(store: AppStore): PreflightRow[] {
  const enabledDictionaryCount = store.userDictionaries.filter((dictionary) => dictionary.enabled).length;
  return [
    {
      title: "本地设置可用",
      detail: `${store.settings.defaultSourceLang} → ${store.settings.defaultTargetLang}`,
      ok: Boolean(store.settings)
    },
    {
      title: "翻译 Provider",
      detail: `${store.apiProviders.filter((provider) => provider.enabled && provider.useFor.includes("translate")).length} 个已启用`,
      ok: store.apiProviders.some((provider) => provider.enabled && provider.useFor.includes("translate"))
    },
    {
      title: "查词 Provider",
      detail: `${store.apiProviders.filter((provider) => provider.enabled && provider.useFor.includes("dictionary")).length} 个已启用`,
      ok: store.apiProviders.some((provider) => provider.enabled && provider.useFor.includes("dictionary"))
    },
    {
      title: "词汇本数据",
      detail: `${store.vocabulary.length} 个词条`,
      ok: Array.isArray(store.vocabulary)
    },
    {
      title: "外接词库",
      detail: `${enabledDictionaryCount}/${store.userDictionaries.length} 个启用，${store.dictionaryEntries.length} 个本地词条`,
      ok: Array.isArray(store.userDictionaries) && Array.isArray(store.dictionaryEntries)
    },
    {
      title: "备份数据结构",
      detail: "包含 settings / providers / vocabulary / dictionaries",
      ok: Boolean(store.settings && store.apiProviders && store.vocabulary && store.dictionaryEntries)
    }
  ];
}
