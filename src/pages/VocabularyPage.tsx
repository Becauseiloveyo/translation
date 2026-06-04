import { CheckCircle2, Download, Plus, RotateCcw, Save, Search, Trash2, Upload } from "lucide-react";
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

const statusLabels: Record<VocabularyStatus, string> = {
  new: "新词",
  learning: "学习中",
  mastered: "已掌握"
};

type FilterValue = "all" | VocabularyStatus;

export function VocabularyPage({ store, setStore }: PageProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [form, setForm] = useState<VocabularyForm>(emptyForm);

  const stats = useMemo(
    () => ({
      total: store.vocabulary.length,
      new: store.vocabulary.filter((item) => item.status === "new").length,
      learning: store.vocabulary.filter((item) => item.status === "learning").length,
      mastered: store.vocabulary.filter((item) => item.status === "mastered").length
    }),
    [store.vocabulary]
  );

  const filtered = useMemo(() => {
    const lower = query.trim().toLocaleLowerCase();
    return store.vocabulary.filter((item) => {
      const matchFilter = filter === "all" || item.status === filter;
      const matchQuery =
        !lower || [item.word, item.translation, item.note].filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(lower));
      return matchFilter && matchQuery;
    });
  }, [filter, query, store.vocabulary]);

  const studyItem = useMemo(
    () => store.vocabulary.find((item) => item.status === "learning") ?? store.vocabulary.find((item) => item.status === "new") ?? store.vocabulary[0],
    [store.vocabulary]
  );

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

  function updateStatus(item: VocabularyItem, status: VocabularyStatus) {
    setStore((current) =>
      upsertVocabulary(current, {
        ...item,
        status,
        updatedAt: nowIso()
      })
    );
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
      return [
        {
          id: createId("vocab"),
          word: row.word.trim(),
          translation: row.translation || undefined,
          note: row.note || undefined,
          status,
          createdAt: now,
          updatedAt: now
        }
      ];
    });

    setStore((current) => ({ ...current, vocabulary: [...items, ...current.vocabulary] }));
    event.target.value = "";
  }

  return (
    <section className="page vocabulary-page">
      <PageHeader
        eyebrow="Vocabulary"
        title="词汇本"
        actions={
          <>
            <label className="button" htmlFor="vocabulary-import">
              <Upload size={16} aria-hidden="true" />
              导入
            </label>
            <input id="vocabulary-import" className="hidden-file" type="file" accept=".csv" onChange={importCsv} />
            <button className="button" type="button" onClick={exportCsv}>
              <Download size={16} aria-hidden="true" />
              导出
            </button>
          </>
        }
      />

      <section className="metric-grid">
        <MiniStat label="全部" value={stats.total} />
        <MiniStat label="新词" value={stats.new} />
        <MiniStat label="学习中" value={stats.learning} />
        <MiniStat label="已掌握" value={stats.mastered} />
      </section>

      <div className="grid-two vocabulary-grid">
        <section className="panel pad stack">
          <div className="item-head">
            <div>
              <div className="panel-title">学习卡</div>
              <div className="muted small">优先展示学习中和新词</div>
            </div>
            <span className="chip good">{studyItem ? statusLabels[studyItem.status] : "空"}</span>
          </div>
          {studyItem ? (
            <div className="study-card">
              <div>
                <div className="word-title">{studyItem.word}</div>
                <div className="study-translation">{studyItem.translation || "还没有释义"}</div>
                {studyItem.note ? <p className="muted">{studyItem.note}</p> : null}
              </div>
              <div className="study-card-actions">
                <button className="button" type="button" onClick={() => updateStatus(studyItem, "learning")}>
                  <RotateCcw size={16} aria-hidden="true" />
                  学习中
                </button>
                <button className="button primary" type="button" onClick={() => updateStatus(studyItem, "mastered")}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  已掌握
                </button>
              </div>
            </div>
          ) : (
            <EmptyState title="还没有词" body="可以在翻译页或查词页把结果加入词汇本。" />
          )}
        </section>

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
          <div className="grid-two">
            <div className="field">
              <label htmlFor="vocab-word">单词 / 短语</label>
              <input id="vocab-word" className="input" value={form.word} onChange={(event) => setForm({ ...form, word: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="vocab-status">状态</label>
              <select
                id="vocab-status"
                className="select"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as VocabularyStatus })}
              >
                <option value="new">新词</option>
                <option value="learning">学习中</option>
                <option value="mastered">已掌握</option>
              </select>
            </div>
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
            <label htmlFor="vocab-note">笔记</label>
            <textarea
              id="vocab-note"
              className="textarea"
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              style={{ minHeight: 84 }}
            />
          </div>
          <button className="button primary" type="submit">
            <Save size={16} aria-hidden="true" />
            保存
          </button>
        </form>
      </div>

      <section className="panel vocabulary-list-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">词条列表</div>
            <div className="muted small">点击词条可以编辑</div>
          </div>
          <span className="chip">{filtered.length}</span>
        </div>
        <div className="pad stack">
          <div className="search-row">
            <Search size={17} aria-hidden="true" />
            <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索词汇本" />
          </div>
          <div className="row">
            {(["all", "new", "learning", "mastered"] as FilterValue[]).map((value) => (
              <button className={filter === value ? "chip-button active" : "chip-button"} type="button" key={value} onClick={() => setFilter(value)}>
                {value === "all" ? "全部" : statusLabels[value]}
              </button>
            ))}
          </div>
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
                    <span className="chip">{statusLabels[item.status]}</span>
                    <button className="button icon" type="button" onClick={() => updateStatus(item, "new")} title="重置为新词">
                      <RotateCcw size={16} aria-hidden="true" />
                    </button>
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
            <EmptyState title="没有匹配词条" />
          </div>
        )}
      </section>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
