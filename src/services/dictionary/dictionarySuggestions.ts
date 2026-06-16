import { normalizeHeadword } from "../../utils/text";
import { getStaticDictionaryHeadwords } from "./staticDictionarySources";

export function suggestDictionaryWords(query: string, extraWords: string[] = [], limit = 5): string[] {
  const normalizedQuery = normalizeHeadword(query);
  if (!normalizedQuery) {
    return [];
  }

  const rankedWords = collectRankedWords([...extraWords, ...getStaticDictionaryHeadwords()]);
  return rankedWords
    .map((item) => ({ ...item, score: scoreSuggestion(normalizedQuery, item.normalized, item.rank) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.rank - b.rank || a.word.localeCompare(b.word))
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

  if (query.length < 3) {
    return 0;
  }

  if (word.includes(query)) {
    return 30000 + rankBoost - word.length;
  }

  const distance = levenshtein(query, word.slice(0, Math.max(query.length, 3)));
  return distance <= 2 ? 10000 + rankBoost - distance * 500 : 0;
}

function levenshtein(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, index) => [index]);
  for (let column = 1; column <= b.length; column += 1) {
    rows[0][column] = column;
  }
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return rows[a.length][b.length];
}
