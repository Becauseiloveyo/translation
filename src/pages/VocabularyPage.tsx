import { Download, Plus, Save, Trash2, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { upsertVocabulary } from "../services/storage/localStore";
import { PageProps } from "../types/app";
import { VocabularyItem, VocabularyStatus } from "../types/models";
import { createId, nowIso } from "../utils/id";
import { downloadTextFile, escapeCsv } from "../utils/text";

type VocabularyForm = {
  id?: string;
  word: string;
  translation: string;
  note: string;
  status: VocabularyStatus;
};

const emptyForm: VocabularyForm = {
  word: "",
  translation: "",
  note: "",
  status: "new"
};

export function VocabularyPage({ store, setStore }: PageProps) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<VocabularyForm>(emptyForm);

  const filtered = useMemo(() => {
    const lower = query.trim().toLocaleLowerCase();
    if (!lower) {
      return store.vocabulary;
    }
    return store.vocabulary.filter((item) =>
      [item.word, item.translation, item.note].filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(lower))
    );
  }, [query, store.vocabulary]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.word.trim()) {
      return;
    }

    const now = nowIso();
    const existing = form.id ? store.vocabulary.find((item) => item.id === form.id) : undefined;
    const item: VocabularyItem = {
      id: form.id ?? createId("vocab"),
      word: form.word.trim(),
      translation: form.translation.trim() || undefined,
      note: form.note.trim() || undefined,
      status: form.status,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    setStore((current) => upsertVocabulary(current, item));
    setForm(emptyForm);
  }

  function remove(id: string) {
    setStore((current) => ({
      ...current,
      vocabulary: current.vocabulary.filter((item) => item.id !== id)
    }));
  }

  function exportCsv() {
    const rows = [
      ["word", "translation", "note", "status"],
      ...store.vocabulary.map((item) => [item.word, item.translation ?? "", item.note ?? "", item.status])
    ];
    downloadTextFile("litedict-vocabulary.csv", rows.map((row) => row.map(escapeCsv).join(",")).join("\n"), "text/csv;charset=utf-8");
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    const [headerLine, ...lines] = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
    const headers = splitCsvLine(headerLine).map((header) => header.trim());
    const now = nowIso();
    const items = lines.flatMap((line): VocabularyItem[] => {
        const values = splitCsvLine(line);
        const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
        const status = isStatus(row.status) ? row.status : "new";
        if (!row.word?.trim()) {
          return [];
        }
        return [{
          id: createId("vocab"),
          word: row.word.trim(),
          translation: row.translation || undefined,
          note: row.note || undefined,
          status,
          createdAt: now,
          updatedAt: now
        }];
      });

    setStore((current) => ({ ...current, vocabulary: [...items, ...current.vocabulary] }));
    event.target.value = "";
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Vocabulary"
        title="词汇本"
        actions={
          <>
            <label className="button" htmlFor="vocabulary-import">
              <Upload size={16} aria-hidden="true" />
              导入 CSV
            </label>
            <input id="vocabulary-import" className="hidden-file" type="file" accept=".csv" onChange={importCsv} />
            <button className="button" type="button" onClick={exportCsv}>
              <Download size={16} aria-hidden="true" />
              导出 CSV
            </button>
          </>
        }
      />

      <div className="grid-two">
        <form className="panel pad stack" onSubmit={handleSubmit}>
          <div className="item-head">
            <div className="panel-title">{form.id ? "编辑词条" : "新增词条"}</div>
            {form.id ? (
              <button className="button" type="button" onClick={() => setForm(emptyForm)}>
                <Plus size={16} aria-hidden="true" />
                新增
              </button>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="vocab-word">单词</label>
            <input id="vocab-word" className="input" value={form.word} onChange={(event) => setForm({ ...form, word: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="vocab-translation">释义</label>
            <input
              id="vocab-translation"
              className="input"
              value={form.translation}
              onChange={(event) => setForm({ ...form, translation: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="vocab-status">状态</label>
            <select
              id="vocab-status"
              className="select"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as VocabularyStatus })}
            >
              <option value="new">new</option>
              <option value="learning">learning</option>
              <option value="mastered">mastered</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="vocab-note">笔记</label>
            <textarea
              id="vocab-note"
              className="textarea"
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              style={{ minHeight: 92 }}
            />
          </div>
          <button className="button primary" type="submit">
            <Save size={16} aria-hidden="true" />
            保存
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">词条列表</div>
            <span className="chip">{store.vocabulary.length}</span>
          </div>
          <div className="pad">
            <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索词汇本" />
          </div>
          {filtered.length ? (
            <div className="list">
              {filtered.map((item) => (
                <div className="list-item" key={item.id}>
                  <div className="item-head">
                    <button className="link-button" type="button" onClick={() => setForm(toForm(item))}>
                      <div className="item-title">{item.word}</div>
                      <div className="muted small">{item.translation}</div>
                    </button>
                    <div className="row">
                      <span className="chip">{item.status}</span>
                      <button className="button icon danger" type="button" onClick={() => remove(item.id)} title="删除">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {item.note ? <p className="muted small">{item.note}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="pad">
              <EmptyState title="暂无词汇" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function toForm(item: VocabularyItem): VocabularyForm {
  return {
    id: item.id,
    word: item.word,
    translation: item.translation ?? "",
    note: item.note ?? "",
    status: item.status
  };
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function isStatus(value: string): value is VocabularyStatus {
  return value === "new" || value === "learning" || value === "mastered";
}
