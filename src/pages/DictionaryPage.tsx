import { Languages, Search, Star, Volume2 } from "lucide-react";
import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageKey } from "../components/AppShell";
import { lookupDictionary } from "../services/dictionary/localDictionaryProvider";
import { suggestDictionaryWords } from "../services/dictionary/dictionarySuggestions";
import { translateWithProvider } from "../services/providers/registry";
import { addRecentLookup, upsertVocabulary } from "../services/storage/localStore";
import { PageProps } from "../types/app";
import { Definition, DictionaryEntry } from "../types/models";
import { createId, nowIso } from "../utils/id";

type DictionaryPageProps = PageProps & {
  onNavigate?: (page: PageKey) => void;
};

const defaultQuickWords = ["serendipity", "sustainable", "local-first", "translation"];

export function DictionaryPage({ store, setStore, onNavigate }: DictionaryPageProps) {
  const [query, setQuery] = useState("");
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const queryKind = useMemo(() => getQueryKind(query), [query]);
  const recentWords = useMemo(() => store.recentLookups.filter((item) => item.kind === "word").slice(0, 6), [store.recentLookups]);
  const suggestionSeedWords = useMemo(
    () => [
      ...recentWords.map((item) => item.text),
      ...store.vocabulary.map((item) => item.word),
      ...store.dictionaryEntries.map((item) => item.headword)
    ],
    [recentWords, store.vocabulary, store.dictionaryEntries]
  );
  const suggestions = useMemo(() => suggestDictionaryWords(query, suggestionSeedWords, 5), [query, suggestionSeedWords]);
  const quickWords = recentWords.length ? recentWords.map((item) => item.text) : defaultQuickWords;

  async function handleLookup(event: FormEvent) {
    event.preventDefault();
    await runLookup(query);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && suggestions[activeSuggestionIndex]) {
      event.preventDefault();
      applyQuickWord(suggestions[activeSuggestionIndex]);
    }
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
      const result = await lookupDictionary(store, trimmed);
      if (!result) {
        setError("没有找到这个单词。可以检查拼写，或换成原形再查。");
        return;
      }
      const localized = await localizeEntry(result);
      setEntry(localized);
      setStore((current) => addRecentLookup(current, { text: localized.headword, kind: "word" }));
    } catch (caught) {
      setError(toFriendlyLookupError(caught));
    } finally {
      setIsLoading(false);
    }
  }

  async function localizeEntry(result: DictionaryEntry): Promise<DictionaryEntry> {
    const definitions = await Promise.all(result.definitions.map((definition, index) => localizeDefinition(definition, index)));
    return { ...result, definitions };
  }

  async function localizeDefinition(definition: Definition, index: number): Promise<Definition> {
    if (definition.definitionZh || !definition.definitionEn || index > 5) {
      return definition;
    }
    try {
      const translated = await translateWithProvider(store, {
        text: definition.definitionEn,
        sourceLang: "en",
        targetLang: "zh"
      });
      return { ...definition, definitionZh: translated.output.translatedText };
    } catch {
      return definition;
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
        note: entry.source ? `来自 ${sourceLabel(entry.source)}` : undefined,
        status: existed?.status ?? "new",
        reviewCount: existed?.reviewCount ?? 0,
        masteredCount: existed?.masteredCount ?? 0,
        lastReviewedAt: existed?.lastReviewedAt,
        nextReviewAt: existed?.nextReviewAt ?? now,
        createdAt: existed?.createdAt ?? now,
        updatedAt: now
      })
    );
  }

  function applyQuickWord(word: string) {
    setQuery(word);
    setActiveSuggestionIndex(0);
    void runLookup(word);
  }

  function updateQuery(value: string) {
    setQuery(value);
    setActiveSuggestionIndex(0);
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
    <section className="page dictionary-focus-page mature-dictionary-page">
      <header className="mature-page-hero dictionary-hero">
        <div>
          <div className="eyebrow">Lookup</div>
          <h1>查词</h1>
        </div>
        <button className="button ghost-button" type="button" onClick={() => onNavigate?.("translate")}>
          <Languages size={16} aria-hidden="true" />
          翻译
        </button>
      </header>

      <section className="lookup-shell">
        <div className="lookup-search-wrap">
          <form className="lookup-search" onSubmit={handleLookup}>
            <Search size={22} aria-hidden="true" />
            <input
              id="dictionary-query"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="输入单词"
              autoComplete="off"
            />
            <button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? "查询中" : "查词"}
            </button>
          </form>

          {suggestions.length ? (
            <div className="dictionary-suggestion-panel" role="listbox" aria-label="候选词">
              {suggestions.map((word, index) => (
                <button
                  className={index === activeSuggestionIndex ? "suggestion-item active" : "suggestion-item"}
                  type="button"
                  key={word}
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                  onClick={() => applyQuickWord(word)}
                >
                  <span>{word}</span>
                  <small>{index === 0 ? "最可能" : "候选"}</small>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="lookup-meta-row">
          <span>{queryKind}</span>
          {query.trim() && queryKind !== "单词" ? (
            <button type="button" onClick={() => onNavigate?.("translate")}>转到翻译</button>
          ) : null}
        </div>

        <div className="quick-inputs mature-quick-row" aria-label="常查词">
          {quickWords.map((word) => (
            <button className="chip-button" type="button" key={word} onClick={() => applyQuickWord(word)}>
              {word}
            </button>
          ))}
        </div>
      </section>

      <section className="lookup-result-card">
        {error ? <div className="error">{error}</div> : null}
        {entry ? (
          <div className="stack">
            <div className="dictionary-card-head">
              <div>
                <div className="word-title">{entry.headword}</div>
                <div className="phonetic-row">
                  <button className="chip-button" type="button" onClick={() => playPronunciation("en-US")} title="播放美式发音">
                    美式 {entry.phoneticUS ?? fallbackPhonetic(entry.headword)}
                    <Volume2 size={14} aria-hidden="true" />
                  </button>
                  <button className="chip-button" type="button" onClick={() => playPronunciation("en-GB")} title="播放英式发音">
                    英式 {entry.phoneticUK ?? entry.phoneticUS ?? fallbackPhonetic(entry.headword)}
                    <Volume2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <button className="button" type="button" onClick={addToVocabulary}>
                <Star size={16} aria-hidden="true" />
                收藏
              </button>
            </div>

            <div className="definition-list">
              {entry.definitions.map((definition) => (
                <section className="definition-card" key={definition.id}>
                  <div className="definition-meta">
                    {definition.partOfSpeech ? <span className="chip">{definition.partOfSpeech}</span> : null}
                    {definition.source ? <span className="chip">{sourceLabel(definition.source)}</span> : null}
                  </div>
                  {definition.definitionZh ? <p className="definition-zh">{definition.definitionZh}</p> : <p className="definition-zh">{definition.definitionEn}</p>}
                  {definition.definitionZh && definition.definitionEn ? <p className="definition-en muted">{definition.definitionEn}</p> : null}
                  {definition.exampleZh ? <p className="example muted">{definition.exampleZh}</p> : definition.exampleEn ? <p className="example muted">例句：{definition.exampleEn}</p> : null}
                </section>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="输入单词开始" body={recentWords.length ? "最近查过的单词会自动显示在输入框下方。" : undefined} />
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

function sourceLabel(value: string): string {
  if (/free dictionary/i.test(value)) {
    return "免费词典";
  }
  if (/merriam/i.test(value)) {
    return "韦氏词典";
  }
  if (/oxford/i.test(value)) {
    return "牛津词典";
  }
  return value;
}

function fallbackPhonetic(word: string): string {
  return `/${word}/`;
}

function toFriendlyLookupError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught);
  if (/network|failed to fetch|load failed/i.test(message)) {
    return "网络连接失败。请检查网络后再查词。";
  }
  if (/404|not found|no definition|未找到/i.test(message)) {
    return "没有找到这个单词。可以检查拼写，或换成原形再查。";
  }
  return message || "查词失败，请稍后再试。";
}
