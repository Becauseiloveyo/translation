import { DictionaryEntry } from "../../types/models";
import { lookupBuiltinEnglishChineseDictionary } from "./builtinEnglishChineseDictionary";
import { lookupCommonEnglishChineseDictionary, getCommonDictionaryHeadwords } from "./commonEnglishChineseDictionary";
import { lookupExpandedEnglishChineseDictionary } from "./expandedEnglishChineseDictionary";

export type StaticDictionarySource = {
  id: string;
  label: string;
  lookup: (text: string) => DictionaryEntry | null;
  getHeadwords?: () => string[];
};

const CORE_HEADWORDS = [
  "hello",
  "world",
  "word",
  "dictionary",
  "translation",
  "translate",
  "language",
  "meaning",
  "phonetic",
  "pronunciation",
  "example",
  "definition",
  "synonym",
  "antonym",
  "vocabulary",
  "study",
  "learn",
  "review",
  "remember",
  "forget",
  "search",
  "lookup"
];

const EXPANDED_HEADWORDS = [
  "history",
  "setting",
  "backup",
  "restore",
  "export",
  "import",
  "local",
  "offline",
  "online",
  "network",
  "provider",
  "service",
  "source",
  "target",
  "result",
  "input",
  "output",
  "copy",
  "save",
  "clear",
  "error",
  "failed",
  "success",
  "simple",
  "advanced",
  "modern",
  "clean",
  "light",
  "dark",
  "system",
  "font",
  "icon",
  "design",
  "style",
  "mobile",
  "application",
  "privacy",
  "secure",
  "data",
  "database",
  "file",
  "folder",
  "cache",
  "sync",
  "release",
  "build",
  "install",
  "update",
  "version",
  "feature",
  "function",
  "quality",
  "stable",
  "fast",
  "slow",
  "good",
  "bad",
  "better",
  "best",
  "use",
  "useful",
  "important",
  "common",
  "core",
  "basic"
];

export const STATIC_DICTIONARY_SOURCES: StaticDictionarySource[] = [
  {
    id: "builtin-core-en-zh",
    label: "内置核心中英词典",
    lookup: lookupBuiltinEnglishChineseDictionary,
    getHeadwords: () => CORE_HEADWORDS
  },
  {
    id: "expanded-en-zh",
    label: "扩展中英词库",
    lookup: lookupExpandedEnglishChineseDictionary,
    getHeadwords: () => EXPANDED_HEADWORDS
  },
  {
    id: "common-en-zh",
    label: "常用中英词库",
    lookup: lookupCommonEnglishChineseDictionary,
    getHeadwords: getCommonDictionaryHeadwords
  }
];

export function lookupStaticDictionarySources(text: string): DictionaryEntry | null {
  for (const source of STATIC_DICTIONARY_SOURCES) {
    const entry = source.lookup(text);
    if (entry) {
      return entry;
    }
  }
  return null;
}

export function getStaticDictionaryHeadwords(): string[] {
  return STATIC_DICTIONARY_SOURCES.flatMap((source) => source.getHeadwords?.() ?? []);
}
