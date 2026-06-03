import { ApiProvider, DictionaryEntry, UserTerm } from "../../types/models";

export type TranslateInput = {
  text: string;
  sourceLang?: string;
  targetLang: string;
  glossary?: UserTerm[];
};

export type TranslateOutput = {
  translatedText: string;
  alternatives?: string[];
  provider: string;
  detectedLang?: string;
  raw?: unknown;
};

export type LookupInput = {
  text: string;
  sourceLang?: string;
  targetLang?: string;
};

export interface TranslationProvider {
  id: string;
  name: string;
  translate(input: TranslateInput): Promise<TranslateOutput>;
}

export interface DictionaryProvider {
  id: string;
  name: string;
  lookup(input: LookupInput): Promise<DictionaryEntry | null>;
}

export type ProviderFactoryContext = {
  config: ApiProvider;
};

