import { ArrowLeftRight, Copy, Eraser, Languages, Search, Sparkles, Star } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { AppSelect } from "../components/AppSelect";
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
  { value: "auto", label: "自动检测", description: "按内容判断语言" },
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
  const [providerId, setProviderId] = useState("provider_mymemory_free");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [translation, setTranslation] = useState<TranslateState | null>(null);
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null);
  const detection = useMemo(() => detectInput(text, sourceLang, targetLang), [sourceLang, targetLang, text]);

  const providerOptions = store.apiProviders
    .filter((provider) => provider.enabled && provider.useFor.includes("translate") && provider.type !== "mock")
    .map((provider) => ({ value: provider.id, label: provider.name, description: provider.type }));
  const resultText = translation?.translatedText ?? dictionaryEntry?.definitions[0]?.definitionZh ?? dictionaryEntry?.definitions[0]?.definitionEn ?? "";
  const resultTitle = dictionaryEntry ? "词典释义" : "译文";
  const primaryActionLabel = isLoading ? "处理中" : detection.intent === "lookup" ? "查词" : "翻译";
  const activeProviderId = providerOptions.some((provider) => provider.value === providerId) ? providerId : providerOptions[0]?.value ?? "provider_mock";

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
          activeProviderId
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
      setError(toFriendlyError(caught));
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
        reviewCount: 0,
        masteredCount: 0,
        nextReviewAt: now,
        note: translation ? `来自 ${translation.provider}` : dictionaryEntry?.source ? `来自 ${dictionaryEntry.source}` : undefined,
        createdAt: now,
        updatedAt: now
      })
    );
  }

  return (
    <section className="page translate-page app-translate-page">
      <form className="translate-app-shell" onSubmit={handleSubmit}>
        <section className="translate-language-strip" aria-label="语言设置">
          <AppSelect label="源语言" className="lang-control" buttonClassName="lang-select" value={sourceLang} options={languageOptions} onChange={setSourceLang} />
          <button className="button icon language-swap" type="button" onClick={swapLanguages} title="交换语言">
            <ArrowLeftRight size={18} aria-hidden="true" />
          </button>
          <AppSelect label="目标语言" className="lang-control" buttonClassName="lang-select" value={targetLang} options={languageOptions} onChange={setTargetLang} />
        </section>

        <section className="translate-input-card">
          <div className="translate-card-topline">
            <span>{formatDetection(detection)}</span>
            <span>{text.trim().length} 字</span>
          </div>
          <textarea
            className="textarea translate-input app-translate-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="输入单词查词，输入句子翻译"
          />
          <div className="translate-action-bar">
            <button className="button ghost-button" type="button" onClick={clearAll} disabled={!text && !resultText && !error}>
              <Eraser size={16} aria-hidden="true" />
              清空
            </button>
            <button className="button primary" type="submit" disabled={isLoading || detection.intent === "empty"}>
              {detection.intent === "lookup" ? <Search size={17} aria-hidden="true" /> : <Languages size={17} aria-hidden="true" />}
              {primaryActionLabel}
            </button>
          </div>
        </section>

        <section className="translate-result-card">
          <div className="translate-result-head">
            <div>
              <div className="pane-kicker">{resultTitle}</div>
              <div className="pane-title">{dictionaryEntry ? dictionaryEntry.headword : resultText ? "处理结果" : "等待输入"}</div>
            </div>
            <div className="result-toolbar compact">
              <button className="button icon" type="button" onClick={copyResult} disabled={!resultText} title="复制">
                <Copy size={16} aria-hidden="true" />
              </button>
              <button className="button icon" type="button" onClick={saveResultToVocabulary} disabled={!resultText} title="加入词汇本">
                <Star size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="translate-result-surface app-result-surface">
            {translation ? <TranslationResultPanel result={translation} /> : null}
            {dictionaryEntry ? <DictionaryResultPanel entry={dictionaryEntry} /> : null}
            {!translation && !dictionaryEntry && !error ? (
              <div className="translate-empty">
                <Languages size={28} aria-hidden="true" />
                <strong>结果会显示在这里</strong>
                <span>单词优先查词，句子优先翻译。</span>
              </div>
            ) : null}
            {error ? <div className="error soft-error">{error}</div> : null}
          </div>
        </section>

        <section className="translate-bottom-sheet">
          <div className="quick-inputs" aria-label="快速输入">
            {quickInputs.map((value) => (
              <button className="chip-button" type="button" key={value} onClick={() => setText(value)}>
                {value}
              </button>
            ))}
          </div>
          {providerOptions.length > 1 ? (
            <AppSelect className="provider-control subtle-provider" buttonClassName="provider-select" value={activeProviderId} options={providerOptions} onChange={setProviderId} placeholder="翻译服务" />
          ) : null}
          {translation?.matchedTerms.length ? <MatchedTerms terms={translation.matchedTerms} /> : null}
          {translation?.alternatives.length ? <AlternativeTranslations alternatives={translation.alternatives} /> : null}
          {translation?.fallbackError ? <div className="notice soft-notice">主服务不可用，已使用备用结果。</div> : null}
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
  return detection.intent === "lookup" ? "单词 · 查词" : `翻译 · ${detection.sourceLang} → ${detection.targetLang}`;
}

function toFriendlyError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught);
  if (/network|failed to fetch|load failed/i.test(message)) {
    return "网络连接失败。请检查网络，或者稍后再试。";
  }
  if (/429|limit|quota|rate/i.test(message)) {
    return "当前翻译服务请求过多或达到限额。可以稍后再试，或在设置里切换服务。";
  }
  if (/401|403|key|unauthorized|forbidden/i.test(message)) {
    return "服务凭据不可用。请到设置里检查 API Key 或 Provider 配置。";
  }
  if (/404|not found|no definition|未找到/i.test(message)) {
    return "没有找到对应结果。可以换一个写法，或检查拼写。";
  }
  return message || "处理失败，请稍后再试。";
}
