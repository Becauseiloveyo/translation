import { Languages, Search, Star, Volume2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageKey } from "../components/AppShell";
import { lookupDictionary } from "../services/dictionary/localDictionaryProvider";
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
  const queryKind = useMemo(() => getQueryKind(query), [query]);
  const recentWords = useMemo(() => store.recentLookups.filter((item) => item.kind === "word").slice(0, 6), [store.recentLookups]);
  const suggestions = useMemo(() => getSuggestions(query, store.vocabulary.map((item) => item.word)), [query, store.vocabulary]);
  const quickWords = recentWords.length ? recentWords.map((item) => item.text) : defaultQuickWords;

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
        <form className="lookup-search" onSubmit={handleLookup}>
          <Search size={22} aria-hidden="true" />
          <input
            id="dictionary-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入单词"
            autoComplete="off"
          />
          <button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? "查询中" : "查词"}
          </button>
        </form>

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

        {suggestions.length ? (
          <div className="suggestion-row">
            <span>可能想查</span>
            {suggestions.map((word) => (
              <button type="button" key={word} onClick={() => applyQuickWord(word)}>
                {word}
              </button>
            ))}
          </div>
        ) : null}
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
                    {definition.partOfSpeech ? <span className="chip">{partOfSpeechLabel(definition.partOfSpeech)}</span> : null}
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

function getSuggestions(query: string, words: string[]): string[] {
  const trimmed = query.trim().toLocaleLowerCase();
  if (trimmed.length < 2) {
    return [];
  }
  const uniqueWords = Array.from(new Set(words.map((word) => word.trim()).filter(Boolean)));
  return uniqueWords
    .map((word) => ({ word, score: suggestionScore(trimmed, word.toLocaleLowerCase()) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
    .slice(0, 4)
    .map((item) => item.word);
}

function suggestionScore(query: string, word: string): number {
  if (word === query) {
    return 0;
  }
  if (word.startsWith(query)) {
    return 100 - word.length;
  }
  if (word.includes(query)) {
    return 60 - word.length;
  }
  const distance = levenshtein(query, word.slice(0, Math.max(query.length, 3)));
  return distance <= 2 ? 30 - distance : 0;
}

function levenshtein(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, index) => [index]);
  for (let column = 1; column <= b.length; column += 1) {
    rows[0][column] = column;
  }
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return rows[a.length][b.length];
}

function partOfSpeechLabel(value: string): string {
  const normalized = value.toLocaleLowerCase();
  const labels: Record<string, string> = {
    noun: "名词",
    verb: "动词",
    adjective: "形容词",
    adverb: "副词",
    pronoun: "代词",
    preposition: "介词",
    conjunction: "连词",
    interjection: "感叹词",
    entry: "词条"
  };
  return labels[normalized] ?? value;
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
