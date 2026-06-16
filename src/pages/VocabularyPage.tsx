import { BookOpen, CheckCircle2, Download, Plus, RotateCcw, Save, Search, Trash2, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { AppSelect } from "../components/AppSelect";
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

type VocabularyPageProps = PageProps & {
  onLookup?: (word: string) => void;
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

const statusOptions = [
  { value: "new", label: "新词" },
  { value: "learning", label: "学习中" },
  { value: "mastered", label: "已掌握" }
];

type FilterValue = "all" | VocabularyStatus;

export function VocabularyPage({ store, setStore, onLookup }: VocabularyPageProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [form, setForm] = useState<VocabularyForm>(emptyForm);
  const today = useMemo(() => new Date(), []);

  const stats = useMemo(
    () => ({
      total: store.vocabulary.length,
      due: store.vocabulary.filter((item) => isDue(item)).length,
      learning: store.vocabulary.filter((item) => item.status === "learning").length,
      mastered: store.vocabulary.filter((item) => item.status === "mastered").length
    }),
    [store.vocabulary]
  );

  const filtered = useMemo(() => {
    const lower = query.trim().toLocaleLowerCase();
    return store.vocabulary.filter((item) => {
      const matchFilter = filter === "all" || item.status === filter;
      const searchable = [item.word, item.translation, item.note, item.phonetic, item.partOfSpeech, item.source, item.definitionEn].filter(Boolean);
      const matchQuery = !lower || searchable.some((value) => value!.toLocaleLowerCase().includes(lower));
      return matchFilter && matchQuery;
    });
  }, [filter, query, store.vocabulary]);

  const studyItem = useMemo(() => {
    const sorted = [...store.vocabulary].sort((a, b) => reviewTime(a) - reviewTime(b));
    return sorted.find((item) => isDue(item)) ?? sorted.find((item) => item.status !== "mastered") ?? sorted[0];
  }, [store.vocabulary]);

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
      phonetic: existing?.phonetic,
      partOfSpeech: existing?.partOfSpeech,
      source: existing?.source,
      definitionEn: existing?.definitionEn,
      example: existing?.example,
      status: form.status,
      reviewCount: existing?.reviewCount ?? 0,
      masteredCount: existing?.masteredCount ?? 0,
      lastReviewedAt: existing?.lastReviewedAt,
      nextReviewAt: existing?.nextReviewAt ?? now,
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

  function reviewItem(item: VocabularyItem, remembered: boolean) {
    const now = new Date();
    const nextMasteredCount = remembered ? (item.masteredCount ?? 0) + 1 : 0;
    const nextReviewAt = remembered ? addDays(now, nextIntervalDays(nextMasteredCount)) : addHours(now, 6);
    const nextStatus: VocabularyStatus = remembered ? (nextMasteredCount >= 3 ? "mastered" : "learning") : "learning";

    setStore((current) =>
      upsertVocabulary(current, {
        ...item,
        status: nextStatus,
        reviewCount: (item.reviewCount ?? 0) + 1,
        masteredCount: nextMasteredCount,
        lastReviewedAt: now.toISOString(),
        nextReviewAt: nextReviewAt.toISOString(),
        updatedAt: now.toISOString()
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
      ["word", "translation", "note", "phonetic", "partOfSpeech", "source", "definitionEn", "example", "status", "reviewCount", "masteredCount", "lastReviewedAt", "nextReviewAt"],
      ...store.vocabulary.map((item) => [
        item.word,
        item.translation ?? "",
        item.note ?? "",
        item.phonetic ?? "",
        item.partOfSpeech ?? "",
        item.source ?? "",
        item.definitionEn ?? "",
        item.example ?? "",
        item.status,
        String(item.reviewCount ?? 0),
        String(item.masteredCount ?? 0),
        item.lastReviewedAt ?? "",
        item.nextReviewAt ?? ""
      ])
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
          phonetic: row.phonetic || undefined,
          partOfSpeech: row.partOfSpeech || undefined,
          source: row.source || undefined,
          definitionEn: row.definitionEn || undefined,
          example: row.example || undefined,
          status,
          reviewCount: Number(row.reviewCount || 0),
          masteredCount: Number(row.masteredCount || 0),
          lastReviewedAt: row.lastReviewedAt || undefined,
          nextReviewAt: row.nextReviewAt || now,
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
        <MiniStat label="今日" value={stats.due} />
        <MiniStat label="学习中" value={stats.learning} />
        <MiniStat label="已掌握" value={stats.mastered} />
      </section>

      <div className="grid-two vocabulary-grid">
        <section className="panel pad stack review-panel">
          <div className="item-head">
            <div>
              <div className="panel-title">今日复习</div>
              <div className="muted small">认识会推迟复习；不认识会更快再出现。</div>
            </div>
            <span className={studyItem && isDue(studyItem) ? "chip good" : "chip"}>{studyItem ? statusLabels[studyItem.status] : "空"}</span>
          </div>
          {studyItem ? (
            <div className="study-card">
              <div>
                <div className="word-title">{studyItem.word}</div>
                <VocabularyMeta item={studyItem} />
                <div className="study-translation">{studyItem.translation || "还没有释义"}</div>
                {studyItem.definitionEn ? <p className="definition-en muted">{studyItem.definitionEn}</p> : null}
                {studyItem.example ? <p className="example muted">例句：{studyItem.example}</p> : null}
                <div className="review-meta">
                  <span>复习 {studyItem.reviewCount ?? 0} 次</span>
                  <span>连续认识 {studyItem.masteredCount ?? 0} 次</span>
                  <span>{formatReviewDue(studyItem, today)}</span>
                </div>
                {studyItem.note ? <p className="muted">{studyItem.note}</p> : null}
              </div>
              <div className="study-card-actions review-actions">
                <button className="button" type="button" onClick={() => onLookup?.(studyItem.word)}>
                  <BookOpen size={16} aria-hidden="true" />
                  查词
                </button>
                <button className="button" type="button" onClick={() => reviewItem(studyItem, false)}>
                  <RotateCcw size={16} aria-hidden="true" />
                  不认识
                </button>
                <button className="button primary" type="button" onClick={() => reviewItem(studyItem, true)}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  认识
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
            <AppSelect label="状态" value={form.status} options={statusOptions} onChange={(value) => setForm({ ...form, status: value as VocabularyStatus })} />
          </div>
          <div className="field">
            <label htmlFor="vocab-translation">释义</label>
            <input id="vocab-translation" className="input" value={form.translation} onChange={(event) => setForm({ ...form, translation: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="vocab-note">笔记</label>
            <textarea id="vocab-note" className="textarea" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} style={{ minHeight: 84 }} />
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
            <div className="muted small">编辑词条，或直接回到查词页查看完整释义。</div>
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
                    <VocabularyMeta item={item} />
                  </button>
                  <div className="row">
                    <span className="chip">{statusLabels[item.status]}</span>
                    <span className="chip">{formatReviewDue(item, today)}</span>
                    <button className="button icon" type="button" onClick={() => onLookup?.(item.word)} title="查词">
                      <BookOpen size={16} aria-hidden="true" />
                    </button>
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

function VocabularyMeta({ item }: { item: VocabularyItem }) {
  const parts = [item.phonetic, item.partOfSpeech, item.source].filter(Boolean);
  if (!parts.length) {
    return null;
  }
  return <div className="muted small vocab-meta-line">{parts.join(" · ")}</div>;
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

function isDue(item: VocabularyItem): boolean {
  if (!item.nextReviewAt) {
    return item.status !== "mastered";
  }
  return new Date(item.nextReviewAt).getTime() <= Date.now();
}

function reviewTime(item: VocabularyItem): number {
  if (!item.nextReviewAt) {
    return 0;
  }
  return new Date(item.nextReviewAt).getTime();
}

function nextIntervalDays(masteredCount: number): number {
  if (masteredCount <= 1) {
    return 1;
  }
  if (masteredCount === 2) {
    return 3;
  }
  if (masteredCount === 3) {
    return 7;
  }
  return 14;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatReviewDue(item: VocabularyItem, today: Date): string {
  if (!item.nextReviewAt) {
    return item.status === "mastered" ? "已掌握" : "今天复习";
  }
  const target = new Date(item.nextReviewAt);
  const diffDays = Math.ceil((startOfDay(target).getTime() - startOfDay(today).getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) {
    return "今天复习";
  }
  if (diffDays === 1) {
    return "明天复习";
  }
  return `${diffDays} 天后`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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
