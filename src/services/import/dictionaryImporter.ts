import {
  DictionaryEntry,
  DictionaryFormat,
  DictionaryImport,
  DictionarySource,
  UserDictionary
} from "../../types/models";
import { createId, nowIso } from "../../utils/id";
import { normalizeHeadword } from "../../utils/text";

export type ImportRow = Record<string, string>;

export type ImportPreview = {
  format: DictionaryFormat;
  fields: string[];
  rows: ImportRow[];
  errors: string[];
};

export type FieldMapping = {
  headword: string;
  definitionZh?: string;
  definitionEn?: string;
  phoneticUS?: string;
  phoneticUK?: string;
  partOfSpeech?: string;
  exampleEn?: string;
  exampleZh?: string;
  note?: string;
  source?: string;
};

export type ImportBuildResult = {
  dictionary: UserDictionary;
  entries: DictionaryEntry[];
  importRecord: DictionaryImport;
  source?: DictionarySource;
};

export function detectDictionaryFormat(fileName: string, fallback: DictionaryFormat = "txt"): DictionaryFormat {
  const ext = fileName.split(".").pop()?.toLocaleLowerCase();
  if (ext === "csv" || ext === "tsv" || ext === "json" || ext === "txt") {
    return ext;
  }
  return fallback;
}

export function parseDictionaryText(text: string, format: DictionaryFormat): ImportPreview {
  if (format === "json") {
    return parseJsonRows(text);
  }
  if (format === "csv" || format === "tsv") {
    return parseDelimitedRows(text, format === "csv" ? "," : "\t");
  }
  return parseTxtRows(text);
}

function parseJsonRows(text: string): ImportPreview {
  try {
    const parsed = JSON.parse(text) as unknown;
    const array = Array.isArray(parsed) ? parsed : [];
    const rows = array
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      .map((item) =>
        Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value == null ? "" : String(value)]))
      );
    const fields = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    return { format: "json", fields, rows: rows.slice(0, 5000), errors: array.length ? [] : ["JSON must be an array of objects."] };
  } catch (error) {
    return { format: "json", fields: [], rows: [], errors: [`JSON parse failed: ${(error as Error).message}`] };
  }
}

function parseDelimitedRows(text: string, delimiter: string): ImportPreview {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((line) => line.trim());
  if (!lines.length) {
    return { format: delimiter === "," ? "csv" : "tsv", fields: [], rows: [], errors: ["File is empty."] };
  }

  const records = lines.map((line) => parseDelimitedLine(line, delimiter));
  const headers = records[0].map((header) => header.trim()).filter(Boolean);
  const rows = records.slice(1).map((record) => {
    const row: ImportRow = {};
    headers.forEach((header, index) => {
      row[header] = record[index]?.trim() ?? "";
    });
    return row;
  });

  return {
    format: delimiter === "," ? "csv" : "tsv",
    fields: headers,
    rows: rows.slice(0, 5000),
    errors: headers.length ? [] : ["Missing header row."]
  };
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
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

function parseTxtRows(text: string): ImportPreview {
  const rows = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [headword, ...rest] = line.includes("\t") ? line.split("\t") : line.split(/\s*[:：-]\s*/);
      return {
        headword: headword?.trim() ?? "",
        definition_zh: rest.join(" ").trim()
      };
    });

  return {
    format: "txt",
    fields: ["headword", "definition_zh"],
    rows: rows.slice(0, 5000),
    errors: []
  };
}

export function inferFieldMapping(fields: string[]): FieldMapping {
  const normalized = new Map(fields.map((field) => [field.toLocaleLowerCase(), field]));
  const find = (...names: string[]) => names.map((name) => normalized.get(name)).find(Boolean);

  return {
    headword: find("headword", "word", "term", "source_text", "source") ?? fields[0] ?? "",
    definitionZh: find("definition_zh", "definitionzh", "translation", "target_text", "target", "meaning_zh"),
    definitionEn: find("definition_en", "definitionen", "definition", "meaning_en"),
    phoneticUS: find("phonetic_us", "phoneticus", "us"),
    phoneticUK: find("phonetic_uk", "phoneticuk", "uk"),
    partOfSpeech: find("part_of_speech", "pos"),
    exampleEn: find("example_en", "example"),
    exampleZh: find("example_zh"),
    note: find("note", "notes"),
    source: find("source")
  };
}

export function buildDictionaryImport(
  params: {
    dictionaryName: string;
    language: string;
    fileName?: string;
    sourceUrl?: string;
    format: DictionaryFormat;
    rows: ImportRow[];
    mapping: FieldMapping;
  },
  existingNormalizedHeadwords: Set<string>
): ImportBuildResult {
  const now = nowIso();
  const dictionaryId = createId("dict");
  const entries: DictionaryEntry[] = [];
  let skippedCount = 0;
  let errorCount = 0;

  for (const row of params.rows) {
    const headword = row[params.mapping.headword]?.trim();
    if (!headword) {
      errorCount += 1;
      continue;
    }

    const normalizedHeadword = normalizeHeadword(headword);
    const dedupeKey = normalizedHeadword;
    if (existingNormalizedHeadwords.has(dedupeKey)) {
      skippedCount += 1;
      continue;
    }

    existingNormalizedHeadwords.add(dedupeKey);
    entries.push({
      id: createId("entry"),
      dictionaryId,
      headword,
      normalizedHeadword,
      language: params.language,
      phoneticUS: read(row, params.mapping.phoneticUS),
      phoneticUK: read(row, params.mapping.phoneticUK),
      definitions: [
        {
          id: createId("def"),
          partOfSpeech: read(row, params.mapping.partOfSpeech),
          definitionZh: read(row, params.mapping.definitionZh),
          definitionEn: read(row, params.mapping.definitionEn),
          exampleEn: read(row, params.mapping.exampleEn),
          exampleZh: read(row, params.mapping.exampleZh),
          source: read(row, params.mapping.source)
        }
      ],
      note: read(row, params.mapping.note),
      source: read(row, params.mapping.source) ?? params.dictionaryName,
      createdAt: now,
      updatedAt: now
    });
  }

  const dictionary: UserDictionary = {
    id: dictionaryId,
    name: params.dictionaryName,
    language: params.language,
    enabled: true,
    entryCount: entries.length,
    sourceType: params.sourceUrl ? "download" : "local_file",
    createdAt: now,
    updatedAt: now
  };

  const importRecord: DictionaryImport = {
    id: createId("import"),
    sourceName: params.dictionaryName,
    fileName: params.fileName,
    format: params.format,
    importedCount: entries.length,
    skippedCount,
    errorCount,
    status: errorCount > 0 && entries.length === 0 ? "failed" : "success",
    createdAt: now
  };

  const source: DictionarySource | undefined = params.sourceUrl
    ? {
        id: createId("source"),
        name: params.dictionaryName,
        type: "download",
        url: params.sourceUrl,
        format: params.format,
        enabled: true,
        autoUpdate: false,
        lastImportedAt: now,
        createdAt: now,
        updatedAt: now
      }
    : undefined;

  return { dictionary, entries, importRecord, source };
}

function read(row: ImportRow, key?: string): string | undefined {
  if (!key) {
    return undefined;
  }
  const value = row[key]?.trim();
  return value || undefined;
}
