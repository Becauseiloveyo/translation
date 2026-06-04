import { ArrowLeftRight, Copy, Eraser, Languages, Search, Sparkles, Star } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
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
  { value: "auto", label: "自动检测" },
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
  const resultTitle = dictionaryEntry ? "词典释义" : "译文";
  const primaryActionLabel = isLoading ? "处理中" : detection.intent === "lookup" ? "查词" : "翻译";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await runTranslateOrLookup();
  }

  async function runTranslateOrLookup() {
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
      <header className="translate-titlebar">
        <div>
          <div className="eyebrow">Translate</div>
          <h1>翻译与查词</h1>
          <p>快速翻译、查词、术语匹配，并把有价值的结果保存到词汇本。</p>
        </div>
        <div className="page-actions">
          <button className="button icon" type="button" onClick={copyResult} title="复制结果" disabled={!resultText}>
            <Copy size={16} aria-hidden="true" />
          </button>
          <button className="button icon" type="button" onClick={clearAll} title="清空">
            <Eraser size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <form className="translate-workbench" onSubmit={handleSubmit}>
        <section className="panel language-bar" aria-label="语言设置">
          <label className="lang-control">
            <span>源语言</span>
            <select className="select lang-select" value={sourceLang} onChange={(event) => setSourceLang(event.target.value)}>
              {languageOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="button icon language-swap" type="button" onClick={swapLanguages} title="交换语言">
            <ArrowLeftRight size={18} aria-hidden="true" />
          </button>
          <label className="lang-control">
            <span>目标语言</span>
            <select className="select lang-select" value={targetLang} onChange={(event) => setTargetLang(event.target.value)}>
              {languageOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="panel translate-pane source-pane">
          <div className="translate-pane-head">
            <div>
              <div className="pane-kicker">原文</div>
              <div className="pane-title">输入或粘贴要处理的内容</div>
            </div>
          </div>
          <textarea
            className="textarea translate-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="输入或粘贴要翻译的文本"
          />
          <div className="translate-pane-foot">
            <div className="source-meta">
              <span className="muted small">{text.trim().length} 字</span>
              <span className="chip">{formatDetection(detection)}</span>
            </div>
            <div className="source-actions">
              <button className="button" type="button" onClick={clearAll}>
                <Eraser size={16} aria-hidden="true" />
                清空
              </button>
              <button className="button primary" type="submit" disabled={isLoading || detection.intent === "empty"}>
                {detection.intent === "lookup" ? <Search size={17} aria-hidden="true" /> : <Languages size={17} aria-hidden="true" />}
                {primaryActionLabel}
              </button>
            </div>
          </div>
        </section>

        <section className="panel translate-pane output-pane">
          <div className="translate-pane-head">
            <div>
              <div className="pane-kicker">{resultTitle}</div>
              <div className="pane-title">{dictionaryEntry ? dictionaryEntry.headword : "翻译结果与操作"}</div>
            </div>
            <div className="result-toolbar compact">
              <select className="select provider-select" value={providerId} onChange={(event) => setProviderId(event.target.value)} title="Provider">
                {providerOptions.map((provider) => (
                  <option value={provider.id} key={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <button className="button icon" type="button" onClick={copyResult} disabled={!resultText} title="复制">
                <Copy size={16} aria-hidden="true" />
              </button>
              <button className="button" type="button" onClick={saveResultToVocabulary} disabled={!resultText}>
                <Star size={16} aria-hidden="true" />
                加入词汇本
              </button>
            </div>
          </div>

          <div className="translate-result-surface">
            {translation ? <TranslationResultPanel result={translation} /> : null}
            {dictionaryEntry ? <DictionaryResultPanel entry={dictionaryEntry} /> : null}
            {!translation && !dictionaryEntry && !error ? (
              <div className="translate-empty">
                <Languages size={28} aria-hidden="true" />
                <strong>译文会显示在这里</strong>
                <span>单个英文词会优先查词，短语和句子会优先翻译。</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="translate-secondary">
          <div className="secondary-block">
            <div className="label">快速输入</div>
            <div className="quick-inputs" aria-label="快速输入">
              {quickInputs.map((value) => (
                <button className="chip-button" type="button" key={value} onClick={() => setText(value)}>
                  {value}
                </button>
              ))}
            </div>
          </div>
          {translation?.matchedTerms.length ? <MatchedTerms terms={translation.matchedTerms} /> : null}
          {translation?.alternatives.length ? <AlternativeTranslations alternatives={translation.alternatives} /> : null}
          {error ? <div className="error soft-error">{error}</div> : null}
          {translation?.fallbackError ? <div className="notice soft-notice">已回退到 Mock Provider：{translation.fallbackError}</div> : null}
        </section>
      </form>
    </section>
  );
}

function TranslationResultPanel({ result }: { result: TranslateState }) {
  return (
    <div className="translation-output stack">
      <div className="row">
        <span className="chip good">{result.provider}</span>
      </div>
      <div className="result-text">{result.translatedText}</div>
    </div>
  );
}

function DictionaryResultPanel({ entry }: { entry: DictionaryEntry }) {
  return (
    <article className="dictionary-card stack">
      <header>
        <div className="dictionary-card-head">
          <div>
            <div className="word-title">{entry.headword}</div>
            <div className="phonetic-row">
              {entry.phoneticUS ? <span>US {entry.phoneticUS}</span> : null}
              {entry.phoneticUK ? <span>UK {entry.phoneticUK}</span> : null}
            </div>
          </div>
          {entry.source ? <span className="chip good">{entry.source}</span> : null}
        </div>
      </header>
      <div className="definition-list">
        {entry.definitions.map((definition) => (
          <section className="definition-card" key={definition.id}>
            <div className="definition-meta">
              {definition.partOfSpeech ? <span className="chip">{definition.partOfSpeech}</span> : null}
              {definition.source ? <span className="chip">{definition.source}</span> : null}
            </div>
            {definition.definitionZh ? <p className="definition-zh">{definition.definitionZh}</p> : null}
            {definition.definitionEn ? <p className="definition-en">{definition.definitionEn}</p> : null}
            {definition.exampleEn ? <p className="example">例：{definition.exampleEn}</p> : null}
            {definition.exampleZh ? <p className="example muted">{definition.exampleZh}</p> : null}
          </section>
        ))}
      </div>
    </article>
  );
}

function MatchedTerms({ terms }: { terms: UserTerm[] }) {
  return (
    <div className="secondary-block">
      <div className="label">
        <Sparkles size={14} aria-hidden="true" />
        术语匹配
      </div>
      <div className="term-chip-grid">
        {terms.map((term) => (
          <span className="chip good" key={term.id}>
            {term.sourceText} → {term.targetText}
          </span>
        ))}
      </div>
    </div>
  );
}

function AlternativeTranslations({ alternatives }: { alternatives: string[] }) {
  return (
    <div className="secondary-block">
      <div className="label">备选译法</div>
      <div className="alternative-grid">
        {alternatives.map((alternative) => (
          <div className="notice" key={alternative}>
            {alternative}
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
