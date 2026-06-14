import { CheckCircle2, DownloadCloud, FolderSearch, Save, Upload } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import { AppSelect } from "../components/AppSelect";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import {
  buildDictionaryImport,
  detectDictionaryFormat,
  FieldMapping,
  ImportPreview,
  inferFieldMapping,
  parseDictionaryText
} from "../services/import/dictionaryImporter";
import { addDictionaryImport } from "../services/storage/localStore";
import { PageProps } from "../types/app";
import { DictionaryFormat } from "../types/models";
import { nowIso } from "../utils/id";

const supportedFormats: DictionaryFormat[] = ["csv", "tsv", "json", "txt"];

export function DictionarySourcesPage({ store, setStore }: PageProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<FieldMapping>({ headword: "" });
  const [dictionaryName, setDictionaryName] = useState("");
  const [language, setLanguage] = useState("en");
  const [fileName, setFileName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const fieldOptions = useMemo(() => preview?.fields ?? [], [preview]);

  async function handleLocalFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await previewFile(file);
    event.target.value = "";
  }

  async function handleFolderScan(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => supportedFormats.includes(detectDictionaryFormat(file.name)));
    if (!files.length) {
      setError("未找到支持的 CSV、TSV、JSON 或 TXT 文件。");
      return;
    }

    setError("");
    setSuccess("");
    const previews = await Promise.all(
      files.map(async (file) => parseDictionaryText(await file.text(), detectDictionaryFormat(file.name)))
    );
    const fields = Array.from(new Set(previews.flatMap((item) => item.fields)));
    const rows = previews.flatMap((item) => item.rows);
    const errors = previews.flatMap((item) => item.errors);
    const nextPreview: ImportPreview = {
      format: detectDictionaryFormat(files[0].name),
      fields,
      rows,
      errors
    };
    setPreview(nextPreview);
    setMapping(inferFieldMapping(fields));
    setFileName(`folder-scan-${files.length}-files`);
    setDictionaryName(`Folder import ${new Date().toLocaleDateString()}`);
  }

  async function previewFile(file: File) {
    setError("");
    setSuccess("");
    const format = detectDictionaryFormat(file.name);
    if (!supportedFormats.includes(format)) {
      setError("仅支持 CSV、TSV、JSON 和 TXT。");
      return;
    }
    const nextPreview = parseDictionaryText(await file.text(), format);
    setPreview(nextPreview);
    setMapping(inferFieldMapping(nextPreview.fields));
    setFileName(file.name);
    setDictionaryName(file.name.replace(/\.[^.]+$/, ""));
  }

  async function previewUrl() {
    if (!sourceUrl.trim()) {
      return;
    }
    setIsLoadingUrl(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(sourceUrl.trim());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      const format = detectDictionaryFormat(new URL(sourceUrl.trim()).pathname, "csv");
      const nextPreview = parseDictionaryText(text, format);
      setPreview(nextPreview);
      setMapping(inferFieldMapping(nextPreview.fields));
      setFileName(sourceUrl.trim().split("/").pop() || "download");
      setDictionaryName(sourceUrl.trim().split("/").pop()?.replace(/\.[^.]+$/, "") || "Downloaded dictionary");
    } catch (caught) {
      setError(`下载失败：${(caught as Error).message}`);
    } finally {
      setIsLoadingUrl(false);
    }
  }

  function saveImport() {
    if (!preview) {
      return;
    }
    if (!mapping.headword) {
      setError("必须映射 headword 字段。");
      return;
    }

    const existing = new Set(store.dictionaryEntries.map((entry) => entry.normalizedHeadword));
    const result = buildDictionaryImport(
      {
        dictionaryName: dictionaryName.trim() || "Imported dictionary",
        language,
        fileName,
        sourceUrl: sourceUrl.trim() || undefined,
        format: preview.format,
        rows: preview.rows,
        mapping
      },
      existing
    );

    setStore((current) => addDictionaryImport(current, result.dictionary, result.entries, result.importRecord, result.source));
    setSuccess(`已导入 ${result.importRecord.importedCount} 条，跳过 ${result.importRecord.skippedCount} 条，错误 ${result.importRecord.errorCount} 条。`);
    setPreview(null);
    setMapping({ headword: "" });
    setFileName("");
    setDictionaryName("");
    setSourceUrl("");
  }

  return (
    <section className="page">
      <PageHeader eyebrow="Dictionary Sources" title="词典来源" />

      <div className="grid-two">
        <div className="panel pad stack">
          <div className="panel-title">导入</div>
          <div className="row">
            <label className="button" htmlFor="dictionary-file">
              <Upload size={16} aria-hidden="true" />
              本地文件
            </label>
            <input id="dictionary-file" className="hidden-file" type="file" accept=".csv,.tsv,.json,.txt" onChange={handleLocalFile} />

            <label className="button" htmlFor="dictionary-folder">
              <FolderSearch size={16} aria-hidden="true" />
              扫描文件夹
            </label>
            <input
              id="dictionary-folder"
              className="hidden-file"
              type="file"
              accept=".csv,.tsv,.json,.txt"
              multiple
              onChange={handleFolderScan}
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            />
          </div>

          <div className="field">
            <label htmlFor="dictionary-url">下载 URL</label>
            <div className="row" style={{ alignItems: "stretch" }}>
              <input
                id="dictionary-url"
                className="input"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://example.invalid/my-dictionary.csv"
              />
              <button className="button" type="button" onClick={previewUrl} disabled={isLoadingUrl}>
                <DownloadCloud size={16} aria-hidden="true" />
                {isLoadingUrl ? "下载中" : "预览"}
              </button>
            </div>
          </div>

          {error ? <div className="error">{error}</div> : null}
          {success ? (
            <div className="notice">
              <CheckCircle2 size={16} aria-hidden="true" /> {success}
            </div>
          ) : null}
        </div>

        <div className="panel pad stack">
          <div className="panel-title">字段映射</div>
          {preview ? (
            <>
              <div className="grid-two">
                <div className="field">
                  <label htmlFor="dict-name">词典名称</label>
                  <input id="dict-name" className="input" value={dictionaryName} onChange={(event) => setDictionaryName(event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="dict-lang">语言</label>
                  <input id="dict-lang" className="input" value={language} onChange={(event) => setLanguage(event.target.value)} />
                </div>
              </div>
              <div className="grid-two">
                <MappingSelect label="headword" value={mapping.headword} fields={fieldOptions} onChange={(value) => setMapping({ ...mapping, headword: value ?? "" })} />
                <MappingSelect
                  label="definition_zh"
                  value={mapping.definitionZh}
                  fields={fieldOptions}
                  onChange={(value) => setMapping({ ...mapping, definitionZh: value })}
                />
                <MappingSelect
                  label="definition_en"
                  value={mapping.definitionEn}
                  fields={fieldOptions}
                  onChange={(value) => setMapping({ ...mapping, definitionEn: value })}
                />
                <MappingSelect
                  label="part_of_speech"
                  value={mapping.partOfSpeech}
                  fields={fieldOptions}
                  onChange={(value) => setMapping({ ...mapping, partOfSpeech: value })}
                />
                <MappingSelect
                  label="phonetic_us"
                  value={mapping.phoneticUS}
                  fields={fieldOptions}
                  onChange={(value) => setMapping({ ...mapping, phoneticUS: value })}
                />
                <MappingSelect
                  label="phonetic_uk"
                  value={mapping.phoneticUK}
                  fields={fieldOptions}
                  onChange={(value) => setMapping({ ...mapping, phoneticUK: value })}
                />
                <MappingSelect
                  label="example_en"
                  value={mapping.exampleEn}
                  fields={fieldOptions}
                  onChange={(value) => setMapping({ ...mapping, exampleEn: value })}
                />
                <MappingSelect
                  label="example_zh"
                  value={mapping.exampleZh}
                  fields={fieldOptions}
                  onChange={(value) => setMapping({ ...mapping, exampleZh: value })}
                />
              </div>
              <button className="button primary" type="button" onClick={saveImport}>
                <Save size={16} aria-hidden="true" />
                保存导入
              </button>
            </>
          ) : (
            <EmptyState title="暂无预览" />
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header">
          <div className="panel-title">预览</div>
          {preview ? <span className="chip">{preview.format} · {preview.rows.length} rows</span> : null}
        </div>
        <div className="pad">
          {preview ? (
            <div className="stack">
              {preview.errors.length ? <div className="error">{preview.errors.join("；")}</div> : null}
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      {preview.fields.map((field) => (
                        <th key={field}>{field}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 20).map((row, index) => (
                      <tr key={`${index}-${JSON.stringify(row).slice(0, 20)}`}>
                        {preview.fields.map((field) => (
                          <td key={field}>{row[field]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState title="未选择数据" />
          )}
        </div>
      </div>

      <div className="grid-two" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">已导入词典</div>
            <span className="chip">{store.userDictionaries.length}</span>
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
                      {dictionary.enabled ? "停用" : "启用"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pad">
              <EmptyState title="暂无个人词典" />
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">导入历史</div>
            <span className="chip">{store.dictionaryImports.length}</span>
          </div>
          {store.dictionaryImports.length ? (
            <div className="list">
              {store.dictionaryImports.map((item) => (
                <div className="list-item" key={item.id}>
                  <div className="item-head">
                    <div>
                      <div className="item-title">{item.sourceName ?? item.fileName ?? "Dictionary import"}</div>
                      <div className="muted small">{new Date(item.createdAt).toLocaleString()}</div>
                    </div>
                    <span className={item.status === "success" ? "chip good" : "chip warn"}>{item.status}</span>
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <span className="chip">imported {item.importedCount}</span>
                    <span className="chip">skipped {item.skippedCount}</span>
                    <span className="chip">errors {item.errorCount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pad">
              <EmptyState title="暂无导入记录" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MappingSelect({
  label,
  value,
  fields,
  onChange
}: {
  label: string;
  value?: string;
  fields: string[];
  onChange: (value: string | undefined) => void;
}) {
  const options = [{ value: "", label: "不映射" }, ...fields.map((field) => ({ value: field, label: field }))];
  return <AppSelect label={label} value={value ?? ""} options={options} onChange={(nextValue) => onChange(nextValue || undefined)} />;
}
