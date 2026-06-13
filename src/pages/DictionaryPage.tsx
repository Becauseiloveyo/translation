import { ArrowRight, BookOpen, DatabaseZap, Languages, Plus, Search, Star, Volume2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageKey } from "../components/AppShell";
import { lookupDictionary } from "../services/dictionary/localDictionaryProvider";
import { upsertVocabulary } from "../services/storage/localStore";
import { PageProps } from "../types/app";
import { DictionaryEntry } from "../types/models";
import { createId, nowIso } from "../utils/id";

type DictionaryPageProps = PageProps & {
  onNavigate?: (page: PageKey) => void;
};

const quickWords = ["serendipity", "sustainable", "local-first", "translation"];

export function DictionaryPage({ store, setStore, onNavigate }: DictionaryPageProps) {
  const [query, setQuery] = useState("");
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const enabledDictionaries = store.userDictionaries.filter((dictionary) => dictionary.enabled).length;
  const enabledOnlineDictionaries = store.apiProviders.filter((provider) => provider.enabled && provider.useFor.includes("dictionary")).length;
  const queryKind = useMemo(() => getQueryKind(query), [query]);

  async function handleLookup(event: FormEvent) {
    event.preventDefault();
    await runLookup(query);
  }

  async function runLookup(nextQuery: string) {
    setError("");
    setEntry(null);
    const trimmed = nextQuery.trim();
    if (!trimmed) {
      return;
    }
    setIsLoading(true);
    try {
      setEntry(await lookupDictionary(store, trimmed));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function addToVocabulary() {
    if (!entry) {
      return;
    }
    const now = nowIso();
    const first = entry.definitions[0];
    const existed = store.vocabulary.find((item) => item.word.toLocaleLowerCase() === entry.headword.toLocaleLowerCase());
    setStore((current) =>
      upsertVocabulary(current, {
        id: existed?.id ?? createId("vocab"),
        word: entry.headword,
        translation: first?.definitionZh ?? first?.definitionEn,
        note: entry.source ? `来自 ${entry.source}` : undefined,
        status: existed?.status ?? "new",
        createdAt: existed?.createdAt ?? now,
        updatedAt: now
      })
    );
  }

  function applyQuickWord(word: string) {
    setQuery(word);
    void runLookup(word);
  }

  function playPronunciation(locale: "en-US" | "en-GB") {
    if (!entry) {
      return;
    }
    const audioUrl = locale === "en-US" ? entry.audioUS ?? entry.audioUK : entry.audioUK ?? entry.audioUS;
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      void audio.play().catch(() => speakWord(entry.headword, locale));
      return;
    }
    speakWord(entry.headword, locale);
  }

  return (
    <section className="page dictionary-focus-page">
      <header className="translate-titlebar">
        <div>
          <div className="eyebrow">Dictionary first</div>
          <h1>查单词</h1>
          <p>这是 LiteDict 的主入口。单词先查释义、音标和例句；短语或长句再切到翻译。</p>
        </div>
        <div className="page-actions">
          <button className="button" type="button" onClick={() => onNavigate?.("translate")}>
            <Languages size={16} aria-hidden="true" />
            翻译句子
          </button>
          <button className="button" type="button" onClick={() => onNavigate?.("sources")}>
            <DatabaseZap size={16} aria-hidden="true" />
            词典来源
          </button>
        </div>
      </header>

      <section className="panel pad stack" style={{ marginBottom: 16 }}>
        <div className="item-head">
          <div>
            <div className="panel-title">输入单词</div>
            <div className="muted small">推荐查单个英文词；检测到句子时可以直接跳转到翻译。</div>
          </div>
          <div className="row">
            <span className="chip good">{enabledOnlineDictionaries} 个在线词典</span>
            <span className="chip">{enabledDictionaries} 本本地词典</span>
          </div>
        </div>
        <form
          className="search-row"
          style={{ gridTemplateColumns: "auto minmax(0, 1fr) auto" }}
          onSubmit={handleLookup}
        >
          <Search size={20} aria-hidden="true" />
          <input
            id="dictionary-query"
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入单词，例如 hello / serendipity"
            autoComplete="off"
          />
          <button className="button primary" type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? "查询中" : "查词"}
          </button>
        </form>
        <div className="source-meta">
          <span className="chip">{queryKind}</span>
          {query.trim() && queryKind !== "单词" ? (
            <button className="chip-button" type="button" onClick={() => onNavigate?.("translate")}>
              更像短语或句子，去翻译
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="quick-inputs" aria-label="常查词">
          {quickWords.map((word) => (
            <button className="chip-button" type="button" key={word} onClick={() => applyQuickWord(word)}>
              {word}
            </button>
          ))}
        </div>
      </section>

      <div className="grid-two">
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">词条结果</div>
              <div className="muted small">释义、音标、例句会集中显示在这里。发音优先使用词典音频，失败时使用系统 TTS。</div>
            </div>
            {entry ? <span className="chip good">{entry.source ?? "Local"}</span> : null}
          </div>
          <div className="pad stack">
            {error ? <div className="error">{error}</div> : null}
            {entry ? (
              <div className="stack">
                <div className="dictionary-card-head">
                  <div>
                    <div className="word-title">{entry.headword}</div>
                    <div className="phonetic-row">
                      {entry.phoneticUS ? (
                        <button className="chip-button" type="button" onClick={() => playPronunciation("en-US")} title="播放美式发音">
                          US {entry.phoneticUS}
                          <Volume2 size={14} aria-hidden="true" />
                        </button>
                      ) : null}
                      {entry.phoneticUK ? (
                        <button className="chip-button" type="button" onClick={() => playPronunciation("en-GB")} title="播放英式发音">
                          UK {entry.phoneticUK}
                          <Volume2 size={14} aria-hidden="true" />
                        </button>
                      ) : null}
                      {!entry.phoneticUS && !entry.phoneticUK ? (
                        <button className="chip-button" type="button" onClick={() => playPronunciation("en-US")} title="使用系统发音">
                          发音
                          <Volume2 size={14} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <button className="button" type="button" onClick={addToVocabulary}>
                    <Star size={16} aria-hidden="true" />
                    加入词汇本
                  </button>
                </div>

                <div className="definition-list">
                  {entry.definitions.map((definition) => (
                    <section className="definition-card" key={definition.id}>
                      <div className="definition-meta">
                        {definition.partOfSpeech ? <span className="chip">{definition.partOfSpeech}</span> : null}
                        {definition.source ? <span className="chip">{definition.source}</span> : null}
                        {entry.dictionaryId ? <span className="chip">Imported</span> : null}
                      </div>
                      {definition.definitionZh ? <p className="definition-zh">{definition.definitionZh}</p> : null}
                      {definition.definitionEn ? <p className="definition-en">{definition.definitionEn}</p> : null}
                      {definition.exampleEn ? <p className="example">例：{definition.exampleEn}</p> : null}
                      {definition.exampleZh ? <p className="example muted">{definition.exampleZh}</p> : null}
                    </section>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="先输入一个单词" body="查询顺序：本地词典 → 在线官方/开放词典 → Mock 兜底。" />
            )}
          </div>
        </section>

        <section className="panel pad stack">
          <div className="item-head">
            <div>
              <div className="panel-title">功能定位</div>
              <div className="muted small">把复杂功能收起来，只保留主线。</div>
            </div>
            <BookOpen size={20} aria-hidden="true" />
          </div>
          <div className="content-list">
            <button className="content-button" type="button" onClick={() => onNavigate?.("dictionary")}>
              <span className="content-icon">
                <BookOpen size={18} aria-hidden="true" />
              </span>
              <span>查单词</span>
              <strong>主功能</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button className="content-button" type="button" onClick={() => onNavigate?.("translate")}>
              <span className="content-icon">
                <Languages size={18} aria-hidden="true" />
              </span>
              <span>翻译短语/句子</span>
              <strong>第二功能</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button className="content-button" type="button" onClick={() => onNavigate?.("vocabulary")}>
              <span className="content-icon">
                <Star size={18} aria-hidden="true" />
              </span>
              <span>词汇本</span>
              <strong>{store.vocabulary.length} 词</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>

      <section className="panel pad stack" style={{ marginTop: 16 }}>
        <div className="item-head">
          <div>
            <div className="panel-title">个人词典</div>
            <div className="muted small">导入的词典会优先参与查询；没有词典时保留在线词典与 mock 兜底。</div>
          </div>
          <span className="chip">{store.dictionaryEntries.length} entries</span>
        </div>
        {store.userDictionaries.length ? (
          <div className="list">
            {store.userDictionaries.map((dictionary) => (
              <div className="list-item" key={dictionary.id}>
                <div className="item-head">
                  <div>
                    <div className="item-title">{dictionary.name}</div>
                    <div className="muted small">
                      {dictionary.language} · {dictionary.entryCount} entries
                    </div>
                  </div>
                  <button
                    className="button"
                    type="button"
                    onClick={() =>
                      setStore((current) => ({
                        ...current,
                        userDictionaries: current.userDictionaries.map((item) =>
                          item.id === dictionary.id ? { ...item, enabled: !item.enabled, updatedAt: nowIso() } : item
                        )
                      }))
                    }
                  >
                    <Plus size={16} aria-hidden="true" />
                    {dictionary.enabled ? "停用" : "启用"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="未导入个人词典" body="可以先用 Free Dictionary API 或官方 API 测试查词流程。" />
        )}
      </section>
    </section>
  );
}

function speakWord(word: string, locale: "en-US" | "en-GB") {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = locale;
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function getQueryKind(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return "等待输入";
  }
  if (/^[A-Za-z][A-Za-z'-]*$/.test(trimmed)) {
    return "单词";
  }
  if (trimmed.split(/\s+/).filter(Boolean).length <= 4) {
    return "短语";
  }
  return "句子";
}
