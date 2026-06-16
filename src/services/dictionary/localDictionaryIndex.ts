import { AppStore, DictionaryEntry } from "../../types/models";

export function buildEnabledLocalDictionaryIndex(store: AppStore): Map<string, DictionaryEntry[]> {
  const enabledDictionaries = [...store.userDictionaries]
    .filter((dictionary) => dictionary.enabled)
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || a.name.localeCompare(b.name));
  const priorityByDictionaryId = new Map(enabledDictionaries.map((dictionary, index) => [dictionary.id, index]));
  const index = new Map<string, DictionaryEntry[]>();

  for (const entry of store.dictionaryEntries) {
    if (entry.dictionaryId && !priorityByDictionaryId.has(entry.dictionaryId)) {
      continue;
    }
    const priority = entry.dictionaryId ? priorityByDictionaryId.get(entry.dictionaryId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    const bucket = index.get(entry.normalizedHeadword) ?? [];
    bucket.push({ ...entry, note: entry.note ?? `priority:${priority}` });
    index.set(entry.normalizedHeadword, bucket);
  }

  for (const bucket of index.values()) {
    bucket.sort((a, b) => entryPriority(a) - entryPriority(b));
  }

  return index;
}

function entryPriority(entry: DictionaryEntry): number {
  const match = entry.note?.match(/priority:(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}
