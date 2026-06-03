import { Copy, Eraser, Languages, Search, Star } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { lookupDictionary } from "../services/dictionary/localDictionaryProvider";
import { translateWithProvider } from "../services/providers/registry";
import { addHistory, upsertVocabulary } from "../services/storage/localStore";
import { PageProps } from "../types/app";
import { DictionaryEntry, UserTerm } from "../types/models";
import { detectInput, InputDetection } from "../utils/detectInput";
import { createId, nowIso } from "../utils/id";

type TranslateState = {
  translatedText: string;
  alternatives: string[];
  provider: string;
  matchedTerms: UserTerm[];
  fallbackError?: string;
};

export function TranslatePage({ store, setStore }: PageProps) {
  const [text, setText] = useState("");
  const [sourceLang, setSourceLang] = useState(store.settings.defaultSourceLang);
  const [targetLang, setTargetLang] = useState(store.settings.defaultTargetLang);
  const [providerId, setProviderId] = useState("provider_mock");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [translation, setTranslation] = useState<TranslateState | null>(null);
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null);
  const detection = useMemo(() => detectInput(text, sourceLang, targetLang), [sourceLang, targetLang, text]);

  const providerOptions = store.apiProviders.filter((provider) => provider.useFor.includes("translate"));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextDetection = detectInput(text, sourceLang, targetLang);
    setError("");
    setTranslation(null);
    setDictionaryEntry(null);

    if (nextDetection.intent === "empty") {
      return;
    }

    setIsLoading(true);
    try {
      if (nextDetection.intent === "lookup") {
        const entry = await lookupDictionary(store, text);
        setDictionaryEntry(entry);
      } else {
        const response = await translateWithProvider(
          store,
          {
            text: text.trim(),
            sourceLang: nextDetection.sourceLang,
            targetLang: nextDetection.targetLang
          },
          providerId
        );

        setTranslation({
          translatedText: response.output.translatedText,
          alternatives: response.output.alternatives ?? [],
          provider: response.output.provider,
          matchedTerms: response.matchedTerms,
          fallbackError: response.fallbackError
        });

        if (store.settings.autoSaveHistory) {
          setStore((current) =>
            addHistory(current, {
              sourceText: text.trim(),
              translatedText: response.output.translatedText,
              sourceLang: nextDetection.sourceLang,
              targetLang: nextDetection.targetLang,
              provider: response.output.provider,
              alternatives: response.output.alternatives
            })
          );
        }
      }
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function clearAll() {
    setText("");
    setTranslation(null);
    setDictionaryEntry(null);
    setError("");
  }

  function copyResult() {
    const value = translation?.translatedText ?? dictionaryEntry?.definitions[0]?.definitionZh ?? "";
    if (value) {
      void navigator.clipboard.writeText(value);
    }
  }

  function saveLookupToVocabulary(entry: DictionaryEntry) {
    const firstDefinition = entry.definitions[0];
    const now = nowIso();
    setStore((current) =>
      upsertVocabulary(current, {
        id: createId("vocab"),
        word: entry.headword,
        translation: firstDefinition?.definitionZh ?? firstDefinition?.definitionEn,
        status: "new",
        note: entry.source ? `From ${entry.source}` : undefined,
        createdAt: now,
        updatedAt: now
      })
    );
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Translate"
        title="翻译与查词"
        actions={
          <>
            <button className="button" type="button" onClick={copyResult} title="复制结果">
              <Copy size={16} aria-hidden="true" />
              复制
            </button>
            <button className="button" type="button" onClick={clearAll} title="清空">
              <Eraser size={16} aria-hidden="true" />
              清空
            </button>
          </>
        }
      />

      <form className="grid-two" onSubmit={handleSubmit}>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">输入</div>
            <span className="chip">{formatDetection(detection)}</span>
          </div>
          <div className="pad stack">
            <textarea
              className="textarea"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="输入单词、短语或句子"
            />
            <div className="grid-three">
              <div className="field">
                <label htmlFor="source-lang">源语言</label>
                <select id="source-lang" className="select" value={sourceLang} onChange={(event) => setSourceLang(event.target.value)}>
                  <option value="auto">自动</option>
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="target-lang">目标语言</label>
                <select id="target-lang" className="select" value={targetLang} onChange={(event) => setTargetLang(event.target.value)}>
                  <option value="auto">自动</option>
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="provider">Provider</label>
                <select id="provider" className="select" value={providerId} onChange={(event) => setProviderId(event.target.value)}>
                  {providerOptions.map((provider) => (
                    <option value={provider.id} key={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button className="button primary" type="submit" disabled={isLoading}>
              {detection.intent === "lookup" ? <Search size={17} aria-hidden="true" /> : <Languages size={17} aria-hidden="true" />}
              {isLoading ? "处理中" : detection.intent === "lookup" ? "查词" : "翻译"}
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">结果</div>
            {translation ? <span className="chip good">{translation.provider}</span> : null}
            {dictionaryEntry ? <span className="chip good">{dictionaryEntry.source ?? "Dictionary"}</span> : null}
          </div>
          <div className="pad stack">
            {error ? <div className="error">{error}</div> : null}
            {translation?.fallbackError ? <div className="notice">已回退到 Mock Provider：{translation.fallbackError}</div> : null}
            {translation ? <TranslationResultPanel result={translation} /> : null}
            {dictionaryEntry ? (
              <DictionaryResultPanel entry={dictionaryEntry} onSave={() => saveLookupToVocabulary(dictionaryEntry)} />
            ) : null}
            {!translation && !dictionaryEntry && !error ? (
              <EmptyState title="等待输入" body="单个英文词会优先查词，短语和句子会优先翻译。" />
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
}

function TranslationResultPanel({ result }: { result: TranslateState }) {
  return (
    <div className="stack">
      <div className="result-text">{result.translatedText}</div>
      {result.matchedTerms.length ? (
        <div className="stack">
          <div className="label">匹配术语</div>
          <div className="row">
            {result.matchedTerms.map((term) => (
              <span className="chip good" key={term.id}>
                {term.sourceText} → {term.targetText}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {result.alternatives.length ? (
        <div className="stack">
          <div className="label">备选</div>
          {result.alternatives.map((alternative) => (
            <div className="notice" key={alternative}>
              {alternative}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DictionaryResultPanel({ entry, onSave }: { entry: DictionaryEntry; onSave: () => void }) {
  return (
    <div className="stack">
      <div className="item-head">
        <div>
          <div className="item-title">{entry.headword}</div>
          <div className="muted small">
            {[entry.phoneticUS, entry.phoneticUK].filter(Boolean).join(" / ")}
          </div>
        </div>
        <button className="button" type="button" onClick={onSave}>
          <Star size={16} aria-hidden="true" />
          加入词汇本
        </button>
      </div>
      <div>
        {entry.definitions.map((definition) => (
          <div className="definition" key={definition.id}>
            <div className="row">
              {definition.partOfSpeech ? <span className="chip">{definition.partOfSpeech}</span> : null}
              {definition.source ? <span className="chip">{definition.source}</span> : null}
            </div>
            {definition.definitionZh ? <p>{definition.definitionZh}</p> : null}
            {definition.definitionEn ? <p className="muted">{definition.definitionEn}</p> : null}
            {definition.exampleEn ? <p className="small">{definition.exampleEn}</p> : null}
            {definition.exampleZh ? <p className="small muted">{definition.exampleZh}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDetection(detection: InputDetection): string {
  if (detection.intent === "empty") {
    return "空";
  }
  return `${detection.kind === "word" ? "单词" : detection.kind === "phrase" ? "短语" : "句子"} · ${
    detection.intent === "lookup" ? "查词优先" : `${detection.sourceLang} → ${detection.targetLang}`
  }`;
}

