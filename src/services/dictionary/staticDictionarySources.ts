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

export const STATIC_DICTIONARY_SOURCES: StaticDictionarySource[] = [
  {
    id: "builtin-core-en-zh",
    label: "内置核心中英词典",
    lookup: lookupBuiltinEnglishChineseDictionary
  },
  {
    id: "expanded-en-zh",
    label: "扩展中英词库",
    lookup: lookupExpandedEnglishChineseDictionary
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
