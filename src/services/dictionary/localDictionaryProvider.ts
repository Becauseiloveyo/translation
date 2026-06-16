import { ApiProvider, AppStore, DictionaryEntry } from "../../types/models";
import { normalizeHeadword } from "../../utils/text";
import { buildEnabledLocalDictionaryIndex } from "./localDictionaryIndex";
import { MockDictionaryProvider } from "./mockDictionaryProvider";
import { canUseRemoteDictionaryProvider, createDictionaryProvider, enabledDictionaryProviders } from "./remoteDictionaryProviders";
import { lookupStaticDictionarySources } from "./staticDictionarySources";
import { buildLookupForms } from "./wordForms";

export async function lookupDictionary(store: AppStore, text: string): Promise<DictionaryEntry | null> {
  const normalized = normalizeHeadword(text);
  if (!normalized) {
    return null;
  }

  const lookupForms = buildLookupForms(normalized);
  const localIndex = buildEnabledLocalDictionaryIndex(store);

  for (const form of lookupForms) {
    const local = lookupLocalDictionary(localIndex, form);
    if (local) {
      return local;
    }
  }

  for (const form of lookupForms) {
    const builtin = lookupStaticDictionarySources(form);
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

function lookupLocalDictionary(index: Map<string, DictionaryEntry[]>, normalized: string): DictionaryEntry | undefined {
  return index.get(normalized)?.[0];
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
