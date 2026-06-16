import { Download, Trash2, Upload } from "lucide-react";
import { ChangeEvent, Dispatch, SetStateAction, useMemo, useState } from "react";
import { AppSelect, AppSelectOption } from "./AppSelect";
import { EmptyState } from "./EmptyState";
import { parseUserDictionaryImport, ParsedUserDictionaryImport } from "../services/dictionary/userDictionaryImport";
import { addDictionaryImport } from "../services/storage/localStore";
import { AppStore, DictionaryEntry, UserDictionary } from "../types/models";
import { createId, nowIso } from "../utils/id";
import { downloadTextFile, escapeCsv } from "../utils/text";

type DictionaryConflictMode = "keep" | "skip" | "replace" | "merge";

type DictionaryManagerCardProps = {
  store: AppStore;
  setStore: Dispatch<SetStateAction<AppStore>>;
};

const conflictOptions: AppSelectOption[] = [
  { value: "skip", label: "跳过重复词", description: "推荐：保留已有词库结果" },
  { value: "replace", label: "覆盖重复词", description: "新词库优先" },
  { value: "merge", label: "合并释义", description: "把新释义追加到已有词条" },
  { value: "keep", label: "全部保留", description: "允许多个词库同时包含同一单词" }
];

export function DictionaryManagerCard({ store, setStore }: DictionaryManagerCardProps) {
  const [message, setMessage] = useState("");
  const [pendingImport, setPendingImport] = useState<ParsedUserDictionaryImport | null>(null);
  const [conflictMode, setConflictMode] = useState<DictionaryConflictMode>("skip");

  const sortedDictionaries = useMemo(() => sortDictionaries(store.userDictionaries), [store.userDictionaries]);
  const stats = useMemo(() => {
    const enabledIds = new Set(store.userDictionaries.filter((dictionary) => dictionary.enabled).map((dictionary) => dictionary.id));
    return {
      dictionaries: store.userDictionaries.length,
      enabled: enabledIds.size,
      entries: store.dictionaryEntries.length,
      enabledEntries: store.dictionaryEntries.filter((entry) => !entry.dictionaryId || enabledIds.has(entry.dictionaryId)).length
    };
  }, [store.userDictionaries, store.dictionaryEntries]);
  const preview = useMemo(() => buildPreview(pendingImport, store.dictionaryEntries), [pendingImport, store.dictionaryEntries]);

  async function importUserDictionary(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseUserDictionaryImport(file.name, text);
      setPendingImport(parsed);
      setConflictMode("skip");
      setMessage("");
    } catch (caught) {
      setMessage(toFriendlyDictionaryError(caught));
    } finally {
      event.target.value = "";
    }
  }

  function downloadCsvTemplate() {
    const rows = [
      ["word", "translation", "phonetic", "pos", "definition", "example"],
      ["apple", "苹果", "ˈæpl", "n.", "a round fruit", "I eat an apple every day."],
      ["request", "请求；要求", "rɪˈkwest", "n./v.", "an act of asking for something", "The app sends a request."],
      ["translate", "翻译", "trænzˈleɪt", "v.", "to change words into another language", "Please translate this sentence."]
    ];
    downloadTextFile("litedict-dictionary-template.csv", rows.map((row) => row.map(escapeCsv).join(",")).join("\n"), "text/csv;charset=utf-8");
  }

  function downloadJsonTemplate() {
    const template = [
      {
        word: "apple",
        translation: "苹果",
        phonetic: "ˈæpl",
        pos: "n.",
        definition: "a round fruit",
        example: "I eat an apple every day."
      },
      {
        word: "request",
        translation: "请求；要求",
        phonetic: "rɪˈkwest",
        pos: "n./v.",
        definition: "an act of asking for something",
        example: "The app sends a request."
      }
    ];
    downloadTextFile("litedict-dictionary-template.json", JSON.stringify(template, null, 2), "application/json;charset=utf-8");
  }

  function confirmImport() {
    if (!pendingImport) {
      return;
    }
    const summary = buildPreview(pendingImport, store.dictionaryEntries);
    if (!summary) {
      setMessage("导入预览失效，请重新选择词库文件。");
      return;
    }
    setStore((current) => applyDictionaryImport(current, pendingImport, conflictMode));
    setMessage(`已导入 ${pendingImport.userDictionary.name}，解析 ${summary.total} 个词条，重复 ${summary.conflicts} 个。`);
    setPendingImport(null);
  }

  function toggleDictionary(dictionary: UserDictionary) {
    setStore((current) => ({
      ...current,
      userDictionaries: current.userDictionaries.map((item) =>
        item.id === dictionary.id ? { ...item, enabled: !item.enabled, updatedAt: nowIso() } : item
      )
    }));
  }

  function deleteDictionary(dictionary: UserDictionary) {
    setStore((current) => ({
      ...current,
      userDictionaries: current.userDictionaries.filter((item) => item.id !== dictionary.id),
      dictionaryEntries: current.dictionaryEntries.filter((entry) => entry.dictionaryId !== dictionary.id),
      dictionarySources: current.dictionarySources.filter((source) => source.name !== dictionary.name)
    }));
  }

  function moveDictionary(dictionary: UserDictionary, direction: -1 | 1) {
    setStore((current) => {
      const ordered = sortDictionaries(current.userDictionaries);
      const index = ordered.findIndex((item) => item.id === dictionary.id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
        return current;
      }

      const first = ordered[index];
      const second = ordered[targetIndex];
      const firstPriority = first.priority ?? (index + 1) * 10;
      const secondPriority = second.priority ?? (targetIndex + 1) * 10;
      const now = nowIso();

      return {
        ...current,
        userDictionaries: current.userDictionaries.map((item) => {
          if (item.id === first.id) {
            return { ...item, priority: secondPriority, updatedAt: now };
          }
          if (item.id === second.id) {
            return { ...item, priority: firstPriority, updatedAt: now };
          }
          return item;
        })
      };
    });
  }

  return (
    <section className="panel pad stack settings-card dictionary-manager-card">
      <div className="item-head">
        <div>
          <div className="panel-title">本地词库</div>
          <div className="muted small">支持 CSV、TSV、JSON。导入前先预览，启用词库会参与查词和候选。</div>
        </div>
        <div className="row">
          <button className="button" type="button" onClick={downloadCsvTemplate}>
            <Download size={16} aria-hidden="true" />
            CSV 模板
          </button>
          <button className="button" type="button" onClick={downloadJsonTemplate}>
            <Download size={16} aria-hidden="true" />
            JSON 模板
          </button>
          <label className="button primary" htmlFor="dictionary-import-file">
            <Upload size={16} aria-hidden="true" />
            导入词库
          </label>
        </div>
        <input id="dictionary-import-file" className="hidden-file" type="file" accept=".csv,.tsv,.json,text/csv,application/json" onChange={importUserDictionary} />
      </div>

      <div className="notice">字段：word/headword、translation、phonetic、pos、definition、example。CSV 第一行建议保留表头。</div>

      <div className="provider-status-grid">
        <DictionaryStat title="词库" value={`${stats.enabled}/${stats.dictionaries}`} detail="启用 / 全部" />
        <DictionaryStat title="词条" value={`${stats.enabledEntries}`} detail={`总计 ${stats.entries}`} />
      </div>

      {preview ? (
        <div className="dictionary-import-preview">
          <div className="item-head">
            <div>
              <div className="item-title">导入预览：{pendingImport?.userDictionary.name}</div>
              <div className="muted small">
                {preview.format.toUpperCase()} · 可导入 {preview.total} 个 · 重复 {preview.conflicts} 个 · 跳过 {preview.skipped} 个
              </div>
            </div>
          </div>
          <div className="quick-inputs mature-quick-row">
            {preview.samples.map((word) => (
              <span className="chip" key={word}>{word}</span>
            ))}
          </div>
          <AppSelect label="重复词处理" value={conflictMode} options={conflictOptions} onChange={(value) => setConflictMode(value as DictionaryConflictMode)} />
          <div className="row">
            <button className="button primary" type="button" onClick={confirmImport}>确认导入</button>
            <button className="button" type="button" onClick={() => setPendingImport(null)}>取消</button>
          </div>
        </div>
      ) : null}

      {message ? <div className="notice">{message}</div> : null}

      {sortedDictionaries.length ? (
        <div className="dictionary-manager-list">
          {sortedDictionaries.map((dictionary, index) => (
            <div className="dictionary-manager-item" key={dictionary.id}>
              <div className="item-head">
                <div>
                  <div className="item-title">{dictionary.name}</div>
                  <div className="muted small">
                    P{dictionary.priority ?? (index + 1) * 10} · {dictionary.entryCount} 词条 · {dictionary.sourceType ?? "local"} · {dictionary.language}
                  </div>
                </div>
                <div className="row">
                  <button className="button" type="button" onClick={() => moveDictionary(dictionary, -1)} disabled={index === 0}>上移</button>
                  <button className="button" type="button" onClick={() => moveDictionary(dictionary, 1)} disabled={index === sortedDictionaries.length - 1}>下移</button>
                  <button className={dictionary.enabled ? "chip-button active" : "chip-button"} type="button" onClick={() => toggleDictionary(dictionary)}>
                    {dictionary.enabled ? "已启用" : "已停用"}
                  </button>
                  <button className="button icon danger" type="button" onClick={() => deleteDictionary(dictionary)} title="删除词库">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无外接词库" body="导入 CSV/TSV/JSON 后，会自动加入查词候选和本地优先查词。" />
      )}
    </section>
  );
}

function DictionaryStat({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="provider-status-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function buildPreview(parsed: ParsedUserDictionaryImport | null, existingEntries: DictionaryEntry[]) {
  if (!parsed) {
    return null;
  }
  const existingHeadwords = new Set(existingEntries.map((entry) => entry.normalizedHeadword));
  const conflicts = parsed.entries.filter((entry) => existingHeadwords.has(entry.normalizedHeadword)).length;
  return {
    format: parsed.importRecord.format,
    total: parsed.entries.length,
    conflicts,
    skipped: Math.max(0, parsed.importRecord.skippedCount),
    samples: parsed.entries.slice(0, 5).map((entry) => entry.headword)
  };
}

function applyDictionaryImport(store: AppStore, parsed: ParsedUserDictionaryImport, mode: DictionaryConflictMode): AppStore {
  const now = nowIso();
  const currentHeadwords = new Set(store.dictionaryEntries.map((entry) => entry.normalizedHeadword));
  const importedHeadwords = new Set(parsed.entries.map((entry) => entry.normalizedHeadword));
  let baseEntries = store.dictionaryEntries;
  let entriesToAdd = parsed.entries;
  let skippedCount = parsed.importRecord.skippedCount;

  if (mode === "skip") {
    entriesToAdd = parsed.entries.filter((entry) => !currentHeadwords.has(entry.normalizedHeadword));
    skippedCount += parsed.entries.length - entriesToAdd.length;
  }

  if (mode === "replace") {
    baseEntries = store.dictionaryEntries.filter((entry) => !importedHeadwords.has(entry.normalizedHeadword));
  }

  if (mode === "merge") {
    const importedByHeadword = new Map(parsed.entries.map((entry) => [entry.normalizedHeadword, entry]));
    baseEntries = store.dictionaryEntries.map((entry) => {
      const incoming = importedByHeadword.get(entry.normalizedHeadword);
      if (!incoming) {
        return entry;
      }
      importedByHeadword.delete(entry.normalizedHeadword);
      return mergeEntry(entry, incoming, now);
    });
    entriesToAdd = [...importedByHeadword.values()];
  }

  const priority = nextDictionaryPriority(store.userDictionaries);
  const userDictionary: UserDictionary = {
    ...parsed.userDictionary,
    priority,
    entryCount: entriesToAdd.length,
    updatedAt: now
  };
  const importRecord = {
    ...parsed.importRecord,
    importedCount: entriesToAdd.length,
    skippedCount,
    createdAt: now
  };

  return addDictionaryImport({ ...store, dictionaryEntries: baseEntries }, userDictionary, entriesToAdd, importRecord, parsed.source);
}

function mergeEntry(existing: DictionaryEntry, incoming: DictionaryEntry, now: string): DictionaryEntry {
  return {
    ...existing,
    definitions: [
      ...existing.definitions,
      ...incoming.definitions.map((definition) => ({ ...definition, id: createId("def") }))
    ],
    phoneticUS: existing.phoneticUS ?? incoming.phoneticUS,
    phoneticUK: existing.phoneticUK ?? incoming.phoneticUK,
    source: existing.source ?? incoming.source,
    updatedAt: now
  };
}

function sortDictionaries(dictionaries: UserDictionary[]): UserDictionary[] {
  return [...dictionaries].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || a.name.localeCompare(b.name));
}

function nextDictionaryPriority(dictionaries: UserDictionary[]): number {
  if (!dictionaries.length) {
    return 10;
  }
  return Math.max(...dictionaries.map((dictionary, index) => dictionary.priority ?? (index + 1) * 10)) + 10;
}

function toFriendlyDictionaryError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught);
  return message || "词库导入失败。";
}
