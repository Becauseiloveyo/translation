import {
  ApiProvider,
  AppStore,
  DictionaryEntry,
  DictionaryImport,
  DictionarySource,
  TranslationResult,
  UserDictionary,
  UserTerm,
  VocabularyItem
} from "../../types/models";
import { createId, nowIso } from "../../utils/id";

const STORE_KEY = "litedict.v1.store";

export function createInitialStore(): AppStore {
  const createdAt = nowIso();

  return {
    settings: {
      theme: "system",
      fontMode: "default",
      defaultSourceLang: "auto",
      defaultTargetLang: "auto",
      autoSaveHistory: true,
      localDictionaryFolder: "~/.litedict/dictionaries"
    },
    apiProviders: [
      {
        id: "provider_mymemory_free",
        name: "MyMemory Free Translate",
        type: "mymemory",
        baseUrl: "https://api.mymemory.translated.net/get",
        enabled: true,
        priority: 10,
        useFor: ["translate"],
        defaultTargetLang: "zh",
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "provider_libretranslate",
        name: "LibreTranslate",
        type: "libretranslate",
        baseUrl: "https://libretranslate.com/translate",
        enabled: false,
        priority: 15,
        useFor: ["translate"],
        defaultTargetLang: "zh",
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "provider_free_dictionary",
        name: "Free Dictionary API",
        type: "free_dictionary",
        baseUrl: "https://api.dictionaryapi.dev/api/v2/entries",
        language: "en",
        enabled: true,
        priority: 20,
        useFor: ["dictionary"],
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "provider_oxford",
        name: "Oxford Dictionaries API",
        type: "oxford",
        baseUrl: "https://od-api.oxforddictionaries.com/api/v2",
        language: "en-gb",
        enabled: false,
        priority: 30,
        useFor: ["dictionary"],
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "provider_merriam_webster",
        name: "Merriam-Webster Collegiate",
        type: "merriam_webster",
        baseUrl: "https://www.dictionaryapi.com/api/v3/references/collegiate/json",
        language: "en",
        enabled: false,
        priority: 40,
        useFor: ["dictionary"],
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "provider_openai_compatible",
        name: "OpenAI Compatible",
        type: "openai",
        baseUrl: "https://api.example.invalid/v1",
        model: "gpt-4.1-mini",
        enabled: false,
        priority: 20,
        useFor: ["translate", "explain"],
        defaultTargetLang: "zh",
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "provider_mock",
        name: "Mock Provider",
        type: "mock",
        enabled: true,
        priority: 100,
        useFor: ["dictionary"],
        defaultTargetLang: "zh",
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "provider_deepl_placeholder",
        name: "DeepL Placeholder",
        type: "deepl",
        enabled: false,
        priority: 30,
        useFor: ["translate"],
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "provider_google_placeholder",
        name: "Google Translate Placeholder",
        type: "google",
        enabled: false,
        priority: 40,
        useFor: ["translate", "ocr"],
        createdAt,
        updatedAt: createdAt
      }
    ],
    vocabulary: [],
    glossary: [
      {
        id: "term_local_first",
        sourceText: "local-first",
        targetText: "本地优先",
        sourceLang: "en",
        targetLang: "zh",
        domain: "software",
        priority: 10,
        note: "Mock term to demonstrate glossary matching.",
        createdAt,
        updatedAt: createdAt
      }
    ],
    history: [],
    dictionarySources: [],
    dictionaryImports: [],
    userDictionaries: [],
    dictionaryEntries: []
  };
}

export function loadStore(): AppStore {
  const fallback = createInitialStore();
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppStore>;
    return {
      ...fallback,
      ...parsed,
      settings: { ...fallback.settings, ...parsed.settings },
      apiProviders: mergeDefaultProviders(parsed.apiProviders, fallback.apiProviders),
      vocabulary: parsed.vocabulary ?? [],
      glossary: parsed.glossary ?? fallback.glossary,
      history: parsed.history ?? [],
      dictionarySources: parsed.dictionarySources ?? [],
      dictionaryImports: parsed.dictionaryImports ?? [],
      userDictionaries: parsed.userDictionaries ?? [],
      dictionaryEntries: parsed.dictionaryEntries ?? []
    };
  } catch {
    return fallback;
  }
}

export function saveStore(store: AppStore): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function addHistory(store: AppStore, item: Omit<TranslationResult, "id" | "createdAt">): AppStore {
  const historyItem: TranslationResult = {
    ...item,
    id: createId("hist"),
    createdAt: nowIso()
  };
  return {
    ...store,
    history: [historyItem, ...store.history].slice(0, 500)
  };
}

export function upsertVocabulary(store: AppStore, item: VocabularyItem): AppStore {
  const exists = store.vocabulary.some((entry) => entry.id === item.id);
  return {
    ...store,
    vocabulary: exists
      ? store.vocabulary.map((entry) => (entry.id === item.id ? item : entry))
      : [item, ...store.vocabulary]
  };
}

export function upsertGlossaryTerm(store: AppStore, item: UserTerm): AppStore {
  const exists = store.glossary.some((entry) => entry.id === item.id);
  return {
    ...store,
    glossary: exists ? store.glossary.map((entry) => (entry.id === item.id ? item : entry)) : [item, ...store.glossary]
  };
}

export function upsertProvider(store: AppStore, item: ApiProvider): AppStore {
  const exists = store.apiProviders.some((entry) => entry.id === item.id);
  return {
    ...store,
    apiProviders: exists
      ? store.apiProviders.map((entry) => (entry.id === item.id ? item : entry))
      : [item, ...store.apiProviders]
  };
}

export function addDictionaryImport(
  store: AppStore,
  userDictionary: UserDictionary,
  entries: DictionaryEntry[],
  importRecord: DictionaryImport,
  source?: DictionarySource
): AppStore {
  const sourceList = source
    ? store.dictionarySources.some((item) => item.id === source.id)
      ? store.dictionarySources.map((item) => (item.id === source.id ? source : item))
      : [source, ...store.dictionarySources]
    : store.dictionarySources;

  return {
    ...store,
    userDictionaries: [userDictionary, ...store.userDictionaries],
    dictionaryEntries: [...entries, ...store.dictionaryEntries],
    dictionaryImports: [importRecord, ...store.dictionaryImports],
    dictionarySources: sourceList
  };
}

export function resetStore(): AppStore {
  const next = createInitialStore();
  saveStore(next);
  return next;
}

function mergeDefaultProviders(savedProviders: ApiProvider[] | undefined, defaultProviders: ApiProvider[]): ApiProvider[] {
  if (!savedProviders?.length) {
    return defaultProviders;
  }

  const savedIds = new Set(savedProviders.map((provider) => provider.id));
  const missingDefaults = defaultProviders.filter((provider) => !savedIds.has(provider.id));
  return [...savedProviders, ...missingDefaults];
}
