export type ProviderPurpose = "translate" | "dictionary" | "explain" | "ocr";
export type ProviderType = "openai" | "deepl" | "google" | "oxford" | "merriam_webster" | "free_dictionary" | "mymemory" | "libretranslate" | "custom" | "mock";
export type ThemeMode = "light" | "dark" | "system";
export type FontMode = "default" | "system";
export type VocabularyStatus = "new" | "learning" | "mastered";
export type DictionarySourceType = "local_file" | "local_folder" | "download" | "api";
export type DictionaryFormat = "csv" | "tsv" | "json" | "txt" | "sqlite" | "stardict" | "mdx" | "mdd";

export type Definition = {
  id: string;
  partOfSpeech?: string;
  definitionZh?: string;
  definitionEn?: string;
  exampleEn?: string;
  exampleZh?: string;
  source?: string;
};

export type Phrase = {
  id: string;
  phrase: string;
  translation?: string;
};

export type Example = {
  id: string;
  text: string;
  translation?: string;
};

export type DictionaryEntry = {
  id: string;
  dictionaryId?: string;
  headword: string;
  normalizedHeadword: string;
  language: string;
  phoneticUS?: string;
  phoneticUK?: string;
  audioUS?: string;
  audioUK?: string;
  definitions: Definition[];
  phrases?: Phrase[];
  synonyms?: string[];
  antonyms?: string[];
  examples?: Example[];
  source?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TranslationResult = {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang?: string;
  targetLang: string;
  provider: string;
  alternatives?: string[];
  createdAt: string;
};

export type VocabularyItem = {
  id: string;
  word: string;
  translation?: string;
  note?: string;
  status: VocabularyStatus;
  reviewCount?: number;
  masteredCount?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type RecentLookup = {
  id: string;
  text: string;
  kind: "word" | "phrase" | "sentence";
  createdAt: string;
};

export type UserTerm = {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang?: string;
  targetLang?: string;
  domain?: string;
  note?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiProvider = {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl?: string;
  appId?: string;
  apiKeyEncrypted?: string;
  model?: string;
  language?: string;
  enabled: boolean;
  priority: number;
  useFor: ProviderPurpose[];
  defaultTargetLang?: string;
  createdAt: string;
  updatedAt: string;
};

export type DictionarySource = {
  id: string;
  name: string;
  type: DictionarySourceType;
  url?: string;
  localPath?: string;
  format: DictionaryFormat;
  enabled: boolean;
  autoUpdate: boolean;
  lastCheckedAt?: string;
  lastImportedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DictionaryImport = {
  id: string;
  sourceId?: string;
  sourceName?: string;
  fileName?: string;
  filePath?: string;
  format: string;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  status: "pending" | "success" | "failed";
  createdAt: string;
};

export type UserDictionary = {
  id: string;
  name: string;
  description?: string;
  language: string;
  enabled: boolean;
  entryCount: number;
  sourceType?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  theme: ThemeMode;
  fontMode: FontMode;
  defaultSourceLang: string;
  defaultTargetLang: string;
  autoSaveHistory: boolean;
  localDictionaryFolder: string;
};

export type AppStore = {
  settings: AppSettings;
  apiProviders: ApiProvider[];
  vocabulary: VocabularyItem[];
  recentLookups: RecentLookup[];
  glossary: UserTerm[];
  history: TranslationResult[];
  dictionarySources: DictionarySource[];
  dictionaryImports: DictionaryImport[];
  userDictionaries: UserDictionary[];
  dictionaryEntries: DictionaryEntry[];
};
