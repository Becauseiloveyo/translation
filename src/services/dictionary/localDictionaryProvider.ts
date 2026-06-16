import { ApiProvider, AppStore, DictionaryEntry } from "../../types/models";
import { normalizeHeadword } from "../../utils/text";
import { lookupBuiltinEnglishChineseDictionary } from "./builtinEnglishChineseDictionary";
import { lookupExpandedEnglishChineseDictionary } from "./expandedEnglishChineseDictionary";
import { MockDictionaryProvider } from "./mockDictionaryProvider";
import { canUseRemoteDictionaryProvider, createDictionaryProvider, enabledDictionaryProviders } from "./remoteDictionaryProviders";
import { buildLookupForms } from "./wordForms";

export async function lookupDictionary(store: AppStore, text: string): Promise<DictionaryEntry | null> {
  const normalized = normalizeHeadword(text);
  if (!normalized) {
    return null;
  }

  const lookupForms = buildLookupForms(normalized);

  for (const form of lookupForms) {
    const local = lookupLocalDictionary(store, form);
    if (local) {
      return local;
    }
  }

  for (const form of lookupForms) {
    const builtin = lookupBuiltinEnglishChineseDictionary(form) ?? lookupExpandedEnglishChineseDictionary(form);
    if (builtin) {
      return builtin;
    }
  }

  const remote = await lookupRemoteDictionaries(store, text);
  if (remote) {
    return remote;
  }

  return new MockDictionaryProvider().lookup({ text });
}

function lookupLocalDictionary(store: AppStore, normalized: string): DictionaryEntry | undefined {
  const enabledDictionaryIds = new Set(
    store.userDictionaries.filter((dictionary) => dictionary.enabled).map((dictionary) => dictionary.id)
  );

  return store.dictionaryEntries.find((entry) => {
    if (entry.normalizedHeadword !== normalized) {
      return false;
    }
    return !entry.dictionaryId || enabledDictionaryIds.has(entry.dictionaryId);
  });
}

async function lookupRemoteDictionaries(store: AppStore, text: string): Promise<DictionaryEntry | null> {
  const remoteProviders = enabledDictionaryProviders(store.apiProviders).filter(shouldTryProvider);

  for (const providerConfig of remoteProviders) {
    try {
      const provider = createDictionaryProvider(providerConfig);
      const entry = await provider.lookup({ text, sourceLang: providerConfig.language ?? "en" });
      if (entry) {
        return entry;
      }
    } catch {
      // Keep lookup resilient: a broken online provider must not block local dictionaries, built-in dictionary, or mock fallback.
    }
  }

  return null;
}

function shouldTryProvider(provider: ApiProvider): boolean {
  return provider.type !== "mock" && canUseRemoteDictionaryProvider(provider);
}
