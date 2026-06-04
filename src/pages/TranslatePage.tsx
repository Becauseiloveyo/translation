import { ArrowLeftRight, Copy, Eraser, Languages, Search, Star } from "lucide-react";
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

const languageOptions = [
  { value: "auto", label: "自动" },
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" }
];

const quickInputs = ["local-first dictionary", "serendipity", "把这句话翻译成自然中文"];

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
  const resultText = translation?.translatedText ?? dictionaryEntry?.definitions[0]?.definitionZh ?? dictionaryEntry?.definitions[0]?.definitionEn ?? "";

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
    if (resultText) {
      void navigator.clipboard.writeText(resultText);
    }
  }

  function swapLanguages() {
    if (sourceLang === "auto" && targetLang === "auto") {
      setSourceLang("zh");
      setTargetLang("en");
      return;
    }
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  }

  function saveResultToVocabulary() {
    if (!text.trim() || !resultText) {
      return;
    }
    const now = nowIso();
    setStore((current) =>
      upsertVocabulary(current, {
        id: createId("vocab"),
        word: dictionaryEntry?.headword ?? text.trim(),
        translation: resultText,
        status: "new",
        note: translation ? `来自 ${translation.provider}` : dictionaryEntry?.source ? `来自 ${dictionaryEntry.source}` : undefined,
        createdAt: now,
        updatedAt: now
      })
    );
  }

  return (
    <section className="page translate-page">
      <PageHeader
        eyebrow="Translate"
        title="翻译与查词"
        actions={
          <>
            <button className="button icon" type="button" onClick={copyResult} title="复制结果" disabled={!resultText}>
              <Copy size={16} aria-hidden="true" />
            </button>
            <button className="button icon" type="button" onClick={clearAll} title="清空">
              <Eraser size={16} aria-hidden="true" />
            </button>
          </>
        }
      />

      <form className="translate-workspace" onSubmit={handleSubmit}>
        <section className="panel pad stack translate-card">
          <div className="translate-card-head">
            <span className="chip good">{formatDetection(detection)}</span>
            <select className="select compact-select" value={providerId} onChange={(event) => setProviderId(event.target.value)}>
              {providerOptions.map((provider) => (
                <option value={provider.id} key={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <textarea
            className="textarea translate-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="输入单词、短语或句子"
          />

          <div className="quick-inputs" aria-label="快速输入">
            {quickInputs.map((value) => (
              <button className="chip-button" type="button" key={value} onClick={() => setText(value)}>
                {value}
              </button>
            ))}
          </div>

          <div className="language-row">
            <select className="select" value={sourceLang} onChange={(event) => setSourceLang(event.target.value)}>
              {languageOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="button icon swap-button" type="button" onClick={swapLanguages} title="交换语言">
              <ArrowLeftRight size={17} aria-hidden="true" />
            </button>
            <select className="select" value={targetLang} onChange={(event) => setTargetLang(event.target.value)}>
              {languageOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button className="button primary big full-width" type="submit" disabled={isLoading || detection.intent === "empty"}>
            {detection.intent === "lookup" ? <Search size={18} aria-hidden="true" /> : <Languages size={18} aria-hidden="true" />}
            {isLoading ? "处理中" : detection.intent === "lookup" ? "查词" : "翻译"}
          </button>
        </section>

        <section className="panel result-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">结果</div>
              <div className="muted small">支持复制并沉淀到词汇本</div>
            </div>
            {resultText ? (
              <button className="button" type="button" onClick={saveResultToVocabulary}>
                <Star size={16} aria-hidden="true" />
                加入词汇本
              </button>
            ) : null}
          </div>
          <div className="pad stack">
            {error ? <div className="error">{error}</div> : null}
            {translation?.fallbackError ? <div className="notice">已回退到 Mock Provider：{translation.fallbackError}</div> : null}
            {translation ? <TranslationResultPanel result={translation} /> : null}
            {dictionaryEntry ? <DictionaryResultPanel entry={dictionaryEntry} /> : null}
            {!translation && !dictionaryEntry && !error ? (
              <EmptyState title="等待输入" body="单个英文词会优先查词，短语和句子会优先翻译。" />
            ) : null}
          </div>
        </section>
      </form>
    </section>
  );
}

function TranslationResultPanel({ result }: { result: TranslateState }) {
  return (
    <div className="stack">
      <div className="result-text">{result.translatedText}</div>
      <div className="row">
        <span className="chip good">{result.provider}</span>
      </div>
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
          <div className="label">备选译法</div>
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

function DictionaryResultPanel({ entry }: { entry: DictionaryEntry }) {
  return (
    <div className="stack">
      <div>
        <div className="word-title">{entry.headword}</div>
        <div className="muted small">{[entry.phoneticUS, entry.phoneticUK].filter(Boolean).join(" / ")}</div>
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
    return "等待输入";
  }
  const kind = detection.kind === "word" ? "单词" : detection.kind === "phrase" ? "短语" : "句子";
  return detection.intent === "lookup" ? `${kind} · 查词优先` : `${kind} · ${detection.sourceLang} → ${detection.targetLang}`;
}
