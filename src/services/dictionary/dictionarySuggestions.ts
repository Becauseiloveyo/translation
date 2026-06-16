import { normalizeHeadword } from "../../utils/text";
import { getStaticDictionaryHeadwords } from "./staticDictionarySources";

export function suggestDictionaryWords(query: string, extraWords: string[] = [], limit = 5): string[] {
  const normalizedQuery = normalizeHeadword(query);
  if (!normalizedQuery) {
    return [];
  }

  const rankedWords = collectRankedWords([query, ...extraWords, ...getStaticDictionaryHeadwords()]);
  return rankedWords
    .map((item) => ({ ...item, score: scoreSuggestion(normalizedQuery, item.normalized, item.rank) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.normalized.length - b.normalized.length || a.rank - b.rank || a.word.localeCompare(b.word))
    .slice(0, limit)
    .map((item) => item.word);
}

type RankedWord = {
  word: string;
  normalized: string;
  rank: number;
};

function collectRankedWords(words: string[]): RankedWord[] {
  const seen = new Map<string, RankedWord>();
  words.forEach((word, index) => {
    const normalized = normalizeHeadword(word);
    if (!normalized) {
      return;
    }
    const current = seen.get(normalized);
    if (!current || index < current.rank) {
      seen.set(normalized, { word, normalized, rank: index });
    }
  });
  return [...seen.values()];
}

function scoreSuggestion(query: string, word: string, rank: number): number {
  const rankBoost = Math.max(0, 2000 - rank);

  if (word === query) {
    return 100000 + rankBoost;
  }

  if (word.startsWith(query)) {
    return 80000 + rankBoost - Math.max(0, word.length - query.length) * 4;
  }

  return 0;
}
