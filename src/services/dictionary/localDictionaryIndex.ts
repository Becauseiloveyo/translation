import { AppStore, DictionaryEntry } from "../../types/models";

type RankedEntry = {
  entry: DictionaryEntry;
  priority: number;
};

export function buildEnabledLocalDictionaryIndex(store: AppStore): Map<string, DictionaryEntry[]> {
  const enabledDictionaries = [...store.userDictionaries]
    .filter((dictionary) => dictionary.enabled)
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || a.name.localeCompare(b.name));
  const priorityByDictionaryId = new Map(enabledDictionaries.map((dictionary, index) => [dictionary.id, index]));
  const rankedIndex = new Map<string, RankedEntry[]>();

  for (const entry of store.dictionaryEntries) {
    if (entry.dictionaryId && !priorityByDictionaryId.has(entry.dictionaryId)) {
      continue;
    }
    const priority = entry.dictionaryId ? priorityByDictionaryId.get(entry.dictionaryId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    const bucket = rankedIndex.get(entry.normalizedHeadword) ?? [];
    bucket.push({ entry, priority });
    rankedIndex.set(entry.normalizedHeadword, bucket);
  }

  const result = new Map<string, DictionaryEntry[]>();
  for (const [headword, bucket] of rankedIndex.entries()) {
    result.set(
      headword,
      bucket
        .sort((a, b) => a.priority - b.priority)
        .map((item) => item.entry)
    );
  }

  return result;
}
