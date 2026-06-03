import { Download, Plus, Save, Trash2, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { upsertGlossaryTerm } from "../services/storage/localStore";
import { PageProps } from "../types/app";
import { UserTerm } from "../types/models";
import { createId, nowIso } from "../utils/id";
import { downloadTextFile, escapeCsv } from "../utils/text";

type GlossaryForm = {
  id?: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  domain: string;
  note: string;
  priority: number;
};

const emptyForm: GlossaryForm = {
  sourceText: "",
  targetText: "",
  sourceLang: "en",
  targetLang: "zh",
  domain: "",
  note: "",
  priority: 1
};

export function GlossaryPage({ store, setStore }: PageProps) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<GlossaryForm>(emptyForm);

  const filtered = useMemo(() => {
    const lower = query.trim().toLocaleLowerCase();
    if (!lower) {
      return store.glossary;
    }
    return store.glossary.filter((term) =>
      [term.sourceText, term.targetText, term.domain, term.note].filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(lower))
    );
  }, [query, store.glossary]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.sourceText.trim() || !form.targetText.trim()) {
      return;
    }
    const now = nowIso();
    const existing = form.id ? store.glossary.find((term) => term.id === form.id) : undefined;
    const item: UserTerm = {
      id: form.id ?? createId("term"),
      sourceText: form.sourceText.trim(),
      targetText: form.targetText.trim(),
      sourceLang: form.sourceLang.trim() || undefined,
      targetLang: form.targetLang.trim() || undefined,
      domain: form.domain.trim() || undefined,
      note: form.note.trim() || undefined,
      priority: Number.isFinite(form.priority) ? form.priority : 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    setStore((current) => upsertGlossaryTerm(current, item));
    setForm(emptyForm);
  }

  function remove(id: string) {
    setStore((current) => ({
      ...current,
      glossary: current.glossary.filter((term) => term.id !== id)
    }));
  }

  function exportCsv() {
    const rows = [
      ["source_text", "target_text", "source_lang", "target_lang", "domain", "note", "priority"],
      ...store.glossary.map((term) => [
        term.sourceText,
        term.targetText,
        term.sourceLang ?? "",
        term.targetLang ?? "",
        term.domain ?? "",
        term.note ?? "",
        term.priority
      ])
    ];
    downloadTextFile("litedict-glossary.csv", rows.map((row) => row.map(escapeCsv).join(",")).join("\n"), "text/csv;charset=utf-8");
  }

  async function importTerms(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    const terms = parseTerms(text, file.name);
    setStore((current) => ({ ...current, glossary: [...terms, ...current.glossary] }));
    event.target.value = "";
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Glossary"
        title="术语表"
        actions={
          <>
            <label className="button" htmlFor="glossary-import">
              <Upload size={16} aria-hidden="true" />
              导入
            </label>
            <input id="glossary-import" className="hidden-file" type="file" accept=".csv,.tsv,.json" onChange={importTerms} />
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
            <div className="panel-title">{form.id ? "编辑术语" : "新增术语"}</div>
            {form.id ? (
              <button className="button" type="button" onClick={() => setForm(emptyForm)}>
                <Plus size={16} aria-hidden="true" />
                新增
              </button>
            ) : null}
          </div>
          <div className="grid-two">
            <div className="field">
              <label htmlFor="term-source">原文</label>
              <input
                id="term-source"
                className="input"
                value={form.sourceText}
                onChange={(event) => setForm({ ...form, sourceText: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="term-target">译文</label>
              <input
                id="term-target"
                className="input"
                value={form.targetText}
                onChange={(event) => setForm({ ...form, targetText: event.target.value })}
              />
            </div>
          </div>
          <div className="grid-three">
            <div className="field">
              <label htmlFor="term-source-lang">源语言</label>
              <input
                id="term-source-lang"
                className="input"
                value={form.sourceLang}
                onChange={(event) => setForm({ ...form, sourceLang: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="term-target-lang">目标语言</label>
              <input
                id="term-target-lang"
                className="input"
                value={form.targetLang}
                onChange={(event) => setForm({ ...form, targetLang: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="term-priority">优先级</label>
              <input
                id="term-priority"
                className="input"
                type="number"
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="term-domain">领域</label>
            <input id="term-domain" className="input" value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="term-note">备注</label>
            <textarea
              id="term-note"
              className="textarea"
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              style={{ minHeight: 88 }}
            />
          </div>
          <button className="button primary" type="submit">
            <Save size={16} aria-hidden="true" />
            保存
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">术语列表</div>
            <span className="chip">{store.glossary.length}</span>
          </div>
          <div className="pad">
            <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索术语" />
          </div>
          {filtered.length ? (
            <div className="list">
              {filtered.map((term) => (
                <div className="list-item" key={term.id}>
                  <div className="item-head">
                    <button className="link-button" type="button" onClick={() => setForm(toForm(term))}>
                      <div className="item-title">
                        {term.sourceText} → {term.targetText}
                      </div>
                      <div className="muted small">
                        {[term.sourceLang, term.targetLang].filter(Boolean).join(" → ")}
                        {term.domain ? ` · ${term.domain}` : ""}
                      </div>
                    </button>
                    <div className="row">
                      <span className="chip">P{term.priority}</span>
                      <button className="button icon danger" type="button" onClick={() => remove(term.id)} title="删除">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {term.note ? <p className="muted small">{term.note}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="pad">
              <EmptyState title="暂无术语" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function toForm(term: UserTerm): GlossaryForm {
  return {
    id: term.id,
    sourceText: term.sourceText,
    targetText: term.targetText,
    sourceLang: term.sourceLang ?? "",
    targetLang: term.targetLang ?? "",
    domain: term.domain ?? "",
    note: term.note ?? "",
    priority: term.priority
  };
}

function parseTerms(text: string, fileName: string): UserTerm[] {
  const now = nowIso();
  if (fileName.toLocaleLowerCase().endsWith(".json")) {
    try {
      const parsed = JSON.parse(text) as Array<Record<string, unknown>>;
      return parsed
        .filter((row) => row.source_text || row.sourceText)
        .map((row) => rowToTerm(normalizeTermRow(row), now));
    } catch {
      return [];
    }
  }

  const delimiter = fileName.toLocaleLowerCase().endsWith(".tsv") ? "\t" : ",";
  const [headerLine, ...lines] = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  const headers = splitLine(headerLine, delimiter);
  return lines
    .map((line) => Object.fromEntries(headers.map((header, index) => [header.trim(), splitLine(line, delimiter)[index]?.trim() ?? ""])))
    .filter((row) => row.source_text || row.sourceText)
    .map((row) => rowToTerm(normalizeTermRow(row), now));
}

function normalizeTermRow(row: Record<string, unknown>) {
  return {
    sourceText: String(row.source_text ?? row.sourceText ?? ""),
    targetText: String(row.target_text ?? row.targetText ?? ""),
    sourceLang: String(row.source_lang ?? row.sourceLang ?? ""),
    targetLang: String(row.target_lang ?? row.targetLang ?? ""),
    domain: String(row.domain ?? ""),
    note: String(row.note ?? ""),
    priority: Number(row.priority ?? 1)
  };
}

function rowToTerm(row: ReturnType<typeof normalizeTermRow>, now: string): UserTerm {
  return {
    id: createId("term"),
    sourceText: row.sourceText,
    targetText: row.targetText,
    sourceLang: row.sourceLang || undefined,
    targetLang: row.targetLang || undefined,
    domain: row.domain || undefined,
    note: row.note || undefined,
    priority: Number.isFinite(row.priority) ? row.priority : 1,
    createdAt: now,
    updatedAt: now
  };
}

function splitLine(line: string, delimiter: string): string[] {
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
    } else if (char === delimiter && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

