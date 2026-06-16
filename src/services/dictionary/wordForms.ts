import { normalizeHeadword } from "../../utils/text";

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

export function buildLookupForms(text: string): string[] {
  const normalized = normalizeHeadword(text);
  if (!normalized) {
    return [];
  }

  const forms = new Set<string>();
  addForm(forms, normalized);

  if (normalized.endsWith("ies") && normalized.length > 4) {
    addForm(forms, `${normalized.slice(0, -3)}y`);
  }

  if (normalized.endsWith("ves") && normalized.length > 4) {
    const stem = normalized.slice(0, -3);
    addForm(forms, `${stem}f`);
    addForm(forms, `${stem}fe`);
  }

  if (normalized.endsWith("ing") && normalized.length > 5) {
    addStemForms(forms, normalized.slice(0, -3));
  }

  if (normalized.endsWith("ed") && normalized.length > 4) {
    addStemForms(forms, normalized.slice(0, -2));
  }

  if (normalized.endsWith("es") && normalized.length > 4) {
    const stem = normalized.slice(0, -2);
    addForm(forms, stem);
    addForm(forms, `${stem}e`);
  }

  if (normalized.endsWith("s") && normalized.length > 3) {
    addForm(forms, normalized.slice(0, -1));
  }

  return [...forms];
}

function addStemForms(forms: Set<string>, stem: string): void {
  addForm(forms, stem);
  addForm(forms, `${stem}e`);

  if (hasDoubledFinalConsonant(stem)) {
    addForm(forms, stem.slice(0, -1));
  }
}

function hasDoubledFinalConsonant(word: string): boolean {
  if (word.length < 2) {
    return false;
  }
  const last = word[word.length - 1];
  const previous = word[word.length - 2];
  return last === previous && !VOWELS.has(last);
}

function addForm(forms: Set<string>, word: string): void {
  const normalized = normalizeHeadword(word);
  if (normalized) {
    forms.add(normalized);
  }
}
