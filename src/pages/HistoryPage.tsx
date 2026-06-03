import { Copy, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { PageProps } from "../types/app";

export function HistoryPage({ store, setStore }: PageProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const lower = query.trim().toLocaleLowerCase();
    if (!lower) {
      return store.history;
    }
    return store.history.filter((item) =>
      [item.sourceText, item.translatedText, item.provider].some((value) => value.toLocaleLowerCase().includes(lower))
    );
  }, [query, store.history]);

  function remove(id: string) {
    setStore((current) => ({
      ...current,
      history: current.history.filter((item) => item.id !== id)
    }));
  }

  function clearAll() {
    setStore((current) => ({
      ...current,
      history: []
    }));
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="History"
        title="历史"
        actions={
          <button className="button danger" type="button" onClick={clearAll} disabled={!store.history.length}>
            <Trash2 size={16} aria-hidden="true" />
            清空
          </button>
        }
      />

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">翻译历史</div>
          <span className="chip">{store.history.length}</span>
        </div>
        <div className="pad">
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索历史" />
        </div>
        {filtered.length ? (
          <div className="list">
            {filtered.map((item) => (
              <div className="list-item" key={item.id}>
                <div className="item-head">
                  <div className="stack" style={{ gap: 6 }}>
                    <div className="item-title">{item.sourceText}</div>
                    <div className="result-text" style={{ fontSize: 15 }}>
                      {item.translatedText}
                    </div>
                    <div className="row">
                      <span className="chip">{item.sourceLang ?? "auto"} → {item.targetLang}</span>
                      <span className="chip good">{item.provider}</span>
                      <span className="muted small">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="row">
                    <button className="button icon" type="button" onClick={() => void navigator.clipboard.writeText(item.translatedText)} title="复制">
                      <Copy size={16} aria-hidden="true" />
                    </button>
                    <button className="button icon danger" type="button" onClick={() => remove(item.id)} title="删除">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pad">
            <EmptyState title="暂无历史" />
          </div>
        )}
      </div>
    </section>
  );
}

