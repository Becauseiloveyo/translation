import { AppStore, DictionaryEntry } from "../../types/models";
import { normalizeHeadword } from "../../utils/text";
import { MockDictionaryProvider } from "./mockDictionaryProvider";

export async function lookupDictionary(store: AppStore, text: string): Promise<DictionaryEntry | null> {
  const normalized = normalizeHeadword(text);
  if (!normalized) {
    return null;
  }

  const enabledDictionaryIds = new Set(
    store.userDictionaries.filter((dictionary) => dictionary.enabled).map((dictionary) => dictionary.id)
  );

  const local = store.dictionaryEntries.find((entry) => {
    if (entry.normalizedHeadword !== normalized) {
      return false;
    }
    return !entry.dictionaryId || enabledDictionaryIds.has(entry.dictionaryId);
  });

  if (local) {
    return local;
  }

  return new MockDictionaryProvider().lookup({ text });
}

