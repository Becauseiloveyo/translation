import { Plus, Search, Star } from "lucide-react";
import { FormEvent, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { lookupDictionary } from "../services/dictionary/localDictionaryProvider";
import { upsertVocabulary } from "../services/storage/localStore";
import { PageProps } from "../types/app";
import { DictionaryEntry } from "../types/models";
import { createId, nowIso } from "../utils/id";

export function DictionaryPage({ store, setStore }: PageProps) {
  const [query, setQuery] = useState("");
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLookup(event: FormEvent) {
    event.preventDefault();
    setError("");
    setEntry(null);
    if (!query.trim()) {
      return;
    }
    setIsLoading(true);
    try {
      setEntry(await lookupDictionary(store, query));
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
    setStore((current) =>
      upsertVocabulary(current, {
        id: createId("vocab"),
        word: entry.headword,
        translation: first?.definitionZh ?? first?.definitionEn,
        note: entry.source ? `From ${entry.source}` : undefined,
        status: "new",
        createdAt: now,
        updatedAt: now
      })
    );
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Dictionary"
        title="词典"
        actions={
          entry ? (
            <button className="button" type="button" onClick={addToVocabulary}>
              <Star size={16} aria-hidden="true" />
              加入词汇本
            </button>
          ) : null
        }
      />

      <div className="grid-two">
        <form className="panel pad stack" onSubmit={handleLookup}>
          <div className="field">
            <label htmlFor="dictionary-query">查词</label>
            <input
              id="dictionary-query"
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="hello"
            />
          </div>
          <button className="button primary" type="submit" disabled={isLoading}>
            <Search size={17} aria-hidden="true" />
            {isLoading ? "查询中" : "查询"}
          </button>
          <div className="notice">已启用个人词典：{store.userDictionaries.filter((dictionary) => dictionary.enabled).length}</div>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">词条</div>
            {entry ? <span className="chip good">{entry.source ?? "Local"}</span> : null}
          </div>
          <div className="pad stack">
            {error ? <div className="error">{error}</div> : null}
            {entry ? (
              <div className="stack">
                <div>
                  <div className="item-title">{entry.headword}</div>
                  <div className="muted small">{[entry.phoneticUS, entry.phoneticUK].filter(Boolean).join(" / ")}</div>
                </div>
                {entry.definitions.map((definition) => (
                  <div className="definition" key={definition.id}>
                    <div className="row">
                      {definition.partOfSpeech ? <span className="chip">{definition.partOfSpeech}</span> : null}
                      {entry.dictionaryId ? <span className="chip">Imported</span> : null}
                    </div>
                    {definition.definitionZh ? <p>{definition.definitionZh}</p> : null}
                    {definition.definitionEn ? <p className="muted">{definition.definitionEn}</p> : null}
                    {definition.exampleEn ? <p className="small">{definition.exampleEn}</p> : null}
                    {definition.exampleZh ? <p className="small muted">{definition.exampleZh}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无词条" body="未导入个人词典时会使用 mock 词典兜底。" />
            )}
          </div>
        </div>
      </div>

      <div className="panel pad stack" style={{ marginTop: 16 }}>
        <div className="item-head">
          <div>
            <div className="panel-title">个人词典</div>
            <div className="muted small">导入的词典会优先参与查询。</div>
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
          <EmptyState title="未导入个人词典" />
        )}
      </div>
    </section>
  );
}

