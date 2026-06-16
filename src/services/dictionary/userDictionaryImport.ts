import { DictionaryEntry, DictionaryImport, DictionarySource, UserDictionary } from "../../types/models";
import { createId, nowIso } from "../../utils/id";
import { normalizeHeadword } from "../../utils/text";

export type ParsedUserDictionaryImport = {
  userDictionary: UserDictionary;
  entries: DictionaryEntry[];
  importRecord: DictionaryImport;
  source: DictionarySource;
};

type ImportRow = {
  word?: string;
  headword?: string;
  phonetic?: string;
  phoneticUS?: string;
  phoneticUK?: string;
  pos?: string;
  translation?: string;
  definition?: string;
  definitionZh?: string;
  definitionEn?: string;
  example?: string;
  exampleEn?: string;
  exampleZh?: string;
};

export function parseUserDictionaryImport(fileName: string, text: string): ParsedUserDictionaryImport {
  const format = detectFormat(fileName, text);
  const rows = parseRows(text, format);
  const now = nowIso();
  const dictionaryId = createId("dict");
  const validEntries = rows.map((row) => toDictionaryEntry(row, dictionaryId, now)).filter((entry): entry is DictionaryEntry => Boolean(entry));
  const skippedCount = Math.max(0, rows.length - validEntries.length);

  if (!validEntries.length) {
    throw new Error("没有可导入的词条。请确认文件包含 word/headword 和 translation/definition 字段。");
  }

  const sourceId = createId("dict_src");
  const dictionaryName = cleanDictionaryName(fileName);

  return {
    userDictionary: {
      id: dictionaryId,
      name: dictionaryName,
      description: `由 ${fileName} 导入`,
      language: "en",
      enabled: true,
      entryCount: validEntries.length,
      sourceType: format,
      createdAt: now,
      updatedAt: now
    },
    entries: validEntries,
    importRecord: {
      id: createId("dict_import"),
      sourceId,
      sourceName: dictionaryName,
      fileName,
      format,
      importedCount: validEntries.length,
      skippedCount,
      errorCount: 0,
      status: "success",
      createdAt: now
    },
    source: {
      id: sourceId,
      name: dictionaryName,
      type: "local_file",
      localPath: fileName,
      format: format === "csv" || format === "tsv" || format === "json" ? format : "txt",
      enabled: true,
      autoUpdate: false,
      lastImportedAt: now,
      createdAt: now,
      updatedAt: now
    }
  };
}

function detectFormat(fileName: string, text: string): "json" | "tsv" | "csv" {
  const lower = fileName.toLocaleLowerCase();
  if (lower.endsWith(".json") || text.trim().startsWith("[") || text.trim().startsWith("{")) {
    return "json";
  }
  if (lower.endsWith(".tsv") || text.includes("\t")) {
    return "tsv";
  }
  return "csv";
}

function parseRows(text: string, format: "json" | "tsv" | "csv"): ImportRow[] {
  if (format === "json") {
    const parsed = JSON.parse(text) as ImportRow[] | { entries?: ImportRow[]; words?: ImportRow[] };
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return parsed.entries ?? parsed.words ?? [];
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return [];
  }
  const delimiter = format === "tsv" ? "\t" : ",";
  const first = splitLine(lines[0], delimiter).map((item) => item.trim());
  const hasHeader = first.some((cell) => /^(word|headword|translation|definition|phonetic|pos)$/i.test(cell));
  const headers = hasHeader ? first : ["word", "translation", "phonetic", "pos", "definition"];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cells = splitLine(line, delimiter);
    return headers.reduce<ImportRow>((row, header, index) => {
      const key = normalizeHeader(header);
      if (key) {
        row[key] = cells[index]?.trim();
      }
      return row;
    }, {});
  });
}

function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === "\t") {
    return line.split("\t");
  }

  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function normalizeHeader(header: string): keyof ImportRow | undefined {
  const normalized = header.trim().toLocaleLowerCase().replace(/[\s_-]+/g, "");
  if (normalized === "word") return "word";
  if (normalized === "headword") return "headword";
  if (normalized === "phonetic") return "phonetic";
  if (normalized === "phoneticus") return "phoneticUS";
  if (normalized === "phoneticuk") return "phoneticUK";
  if (normalized === "pos" || normalized === "partofspeech") return "pos";
  if (normalized === "translation") return "translation";
  if (normalized === "definition") return "definition";
  if (normalized === "definitionzh") return "definitionZh";
  if (normalized === "definitionen") return "definitionEn";
  if (normalized === "example") return "example";
  if (normalized === "exampleen") return "exampleEn";
  if (normalized === "examplezh") return "exampleZh";
  return undefined;
}

function toDictionaryEntry(row: ImportRow, dictionaryId: string, now: string): DictionaryEntry | null {
  const word = (row.word ?? row.headword ?? "").trim();
  const normalizedHeadword = normalizeHeadword(word);
  const definitionZh = (row.translation ?? row.definitionZh ?? "").trim();
  const definitionEn = (row.definition ?? row.definitionEn ?? "").trim();

  if (!normalizedHeadword || (!definitionZh && !definitionEn)) {
    return null;
  }

  return {
    id: createId("dict_entry"),
    dictionaryId,
    headword: word,
    normalizedHeadword,
    language: "en",
    phoneticUS: withSlashes(row.phoneticUS ?? row.phonetic),
    phoneticUK: withSlashes(row.phoneticUK ?? row.phonetic),
    definitions: [
      {
        id: createId("def"),
        partOfSpeech: row.pos?.trim() || undefined,
        definitionZh: definitionZh || undefined,
        definitionEn: definitionEn || undefined,
        exampleEn: row.exampleEn ?? row.example,
        exampleZh: row.exampleZh,
        source: "用户词库"
      }
    ],
    source: "用户词库",
    createdAt: now,
    updatedAt: now
  };
}

function withSlashes(text?: string): string | undefined {
  const trimmed = text?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}/`;
}

function cleanDictionaryName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "用户词库";
}
