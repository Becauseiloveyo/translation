import { ApiProvider, Definition, DictionaryEntry } from "../../types/models";
import { createId, nowIso } from "../../utils/id";
import { normalizeHeadword } from "../../utils/text";
import { DictionaryProvider, LookupInput } from "../providers/types";
import { MockDictionaryProvider } from "./mockDictionaryProvider";

const FREE_DICTIONARY_BASE = "https://api.dictionaryapi.dev/api/v2/entries";
const OXFORD_BASE = "https://od-api.oxforddictionaries.com/api/v2";
const MERRIAM_BASE = "https://www.dictionaryapi.com/api/v3/references/collegiate/json";

export function enabledDictionaryProviders(providers: ApiProvider[]): ApiProvider[] {
  return providers
    .filter((provider) => provider.enabled && provider.useFor.includes("dictionary"))
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export function createDictionaryProvider(config: ApiProvider): DictionaryProvider {
  if (config.type === "free_dictionary") {
    return new FreeDictionaryProvider(config);
  }
  if (config.type === "oxford") {
    return new OxfordDictionaryProvider(config);
  }
  if (config.type === "merriam_webster") {
    return new MerriamWebsterDictionaryProvider(config);
  }
  return new MockDictionaryProvider();
}

export function canUseRemoteDictionaryProvider(config: ApiProvider): boolean {
  if (config.type === "free_dictionary") {
    return true;
  }
  if (config.type === "oxford") {
    return Boolean(config.appId && config.apiKeyEncrypted);
  }
  if (config.type === "merriam_webster") {
    return Boolean(config.apiKeyEncrypted);
  }
  return false;
}

class FreeDictionaryProvider implements DictionaryProvider {
  id: string;
  name: string;

  constructor(private readonly config: ApiProvider) {
    this.id = config.id;
    this.name = config.name;
  }

  async lookup(input: LookupInput): Promise<DictionaryEntry | null> {
    const word = normalizeHeadword(input.text);
    if (!word) {
      return null;
    }

    const lang = this.config.language ?? input.sourceLang ?? "en";
    const baseUrl = (this.config.baseUrl ?? FREE_DICTIONARY_BASE).replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/${encodeURIComponent(lang)}/${encodeURIComponent(word)}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`${this.name} HTTP ${response.status}`);
    }

    const data = (await response.json()) as FreeDictionaryResponse;
    if (!Array.isArray(data) || !data.length) {
      return null;
    }

    return mapFreeDictionaryEntry(data[0], word, lang, this.name);
  }
}

class OxfordDictionaryProvider implements DictionaryProvider {
  id: string;
  name: string;

  constructor(private readonly config: ApiProvider) {
    this.id = config.id;
    this.name = config.name;
  }

  async lookup(input: LookupInput): Promise<DictionaryEntry | null> {
    const word = normalizeHeadword(input.text);
    if (!word) {
      return null;
    }
    if (!this.config.appId || !this.config.apiKeyEncrypted) {
      throw new Error("Oxford Dictionaries 需要 app_id 和 app_key。请在设置里填写。\n");
    }

    const lang = this.config.language ?? "en-gb";
    const baseUrl = (this.config.baseUrl ?? OXFORD_BASE).replace(/\/+$/, "");
    const params = new URLSearchParams({
      q: word,
      fields: "definitions,pronunciations,examples"
    });
    const response = await fetch(`${baseUrl}/words/${encodeURIComponent(lang)}?${params.toString()}`, {
      headers: {
        app_id: this.config.appId,
        app_key: this.config.apiKeyEncrypted
      }
    });

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`${this.name} HTTP ${response.status}`);
    }

    const data = (await response.json()) as OxfordResponse;
    return mapOxfordEntry(data, word, lang, this.name);
  }
}

class MerriamWebsterDictionaryProvider implements DictionaryProvider {
  id: string;
  name: string;

  constructor(private readonly config: ApiProvider) {
    this.id = config.id;
    this.name = config.name;
  }

  async lookup(input: LookupInput): Promise<DictionaryEntry | null> {
    const word = normalizeHeadword(input.text);
    if (!word) {
      return null;
    }
    if (!this.config.apiKeyEncrypted) {
      throw new Error("Merriam-Webster 需要 API key。请在设置里填写。");
    }

    const baseUrl = (this.config.baseUrl ?? MERRIAM_BASE).replace(/\/+$/, "");
    const url = `${baseUrl}/${encodeURIComponent(word)}?key=${encodeURIComponent(this.config.apiKeyEncrypted)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${this.name} HTTP ${response.status}`);
    }

    const data = (await response.json()) as MerriamResponse;
    if (!Array.isArray(data) || !data.length || typeof data[0] === "string") {
      return null;
    }

    return mapMerriamEntry(data, word, this.config.language ?? "en", this.name);
  }
}

type FreeDictionaryPhonetic = {
  text?: string;
  audio?: string;
};

type FreeDictionaryDefinition = {
  definition?: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
};

type FreeDictionaryMeaning = {
  partOfSpeech?: string;
  definitions?: FreeDictionaryDefinition[];
  synonyms?: string[];
  antonyms?: string[];
};

type FreeDictionaryEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: FreeDictionaryPhonetic[];
  meanings?: FreeDictionaryMeaning[];
  sourceUrls?: string[];
};

type FreeDictionaryResponse = FreeDictionaryEntry[];

type OxfordPronunciation = {
  audioFile?: string;
  phoneticSpelling?: string;
  dialects?: string[];
};

type OxfordSense = {
  definitions?: string[];
  examples?: { text?: string }[];
  subsenses?: OxfordSense[];
};

type OxfordEntryNode = {
  pronunciations?: OxfordPronunciation[];
  senses?: OxfordSense[];
};

type OxfordLexicalEntry = {
  lexicalCategory?: { text?: string };
  entries?: OxfordEntryNode[];
  pronunciations?: OxfordPronunciation[];
};

type OxfordResponse = {
  results?: Array<{
    id?: string;
    word?: string;
    lexicalEntries?: OxfordLexicalEntry[];
  }>;
};

type MerriamPronunciation = {
  mw?: string;
  sound?: {
    audio?: string;
  };
};

type MerriamEntry = {
  meta?: { id?: string; stems?: string[] };
  hwi?: { hw?: string; prs?: MerriamPronunciation[] };
  fl?: string;
  shortdef?: string[];
};

type MerriamResponse = Array<MerriamEntry | string>;

function mapFreeDictionaryEntry(entry: FreeDictionaryEntry, fallbackWord: string, lang: string, source: string): DictionaryEntry {
  const phonetics = entry.phonetics ?? [];
  const audio = normalizeAudioUrl(phonetics.find((item) => item.audio)?.audio);
  const phoneticText = phonetics.find((item) => item.text)?.text ?? entry.phonetic;
  const definitions = (entry.meanings ?? [])
    .flatMap((meaning) =>
      (meaning.definitions ?? []).map((definition) => ({
        id: createId("def"),
        partOfSpeech: meaning.partOfSpeech,
        definitionEn: definition.definition,
        exampleEn: definition.example,
        source
      }))
    )
    .filter((definition): definition is Definition => Boolean(definition.definitionEn))
    .slice(0, 16);

  const synonyms = unique((entry.meanings ?? []).flatMap((meaning) => meaning.synonyms ?? []));
  const antonyms = unique((entry.meanings ?? []).flatMap((meaning) => meaning.antonyms ?? []));
  const now = nowIso();
  const headword = entry.word ?? fallbackWord;

  return {
    id: `free_dictionary_${normalizeHeadword(headword)}`,
    headword,
    normalizedHeadword: normalizeHeadword(headword),
    language: lang,
    phoneticUS: phoneticText ? withSlashes(phoneticText) : undefined,
    phoneticUK: phoneticText ? withSlashes(phoneticText) : undefined,
    audioUS: audio,
    audioUK: audio,
    definitions: definitions.length ? definitions : [fallbackDefinition(headword, source)],
    synonyms: synonyms.length ? synonyms : undefined,
    antonyms: antonyms.length ? antonyms : undefined,
    source,
    note: entry.sourceUrls?.[0],
    createdAt: now,
    updatedAt: now
  };
}

function mapOxfordEntry(data: OxfordResponse, fallbackWord: string, lang: string, source: string): DictionaryEntry | null {
  const result = data.results?.[0];
  if (!result) {
    return null;
  }

  const definitions: Definition[] = [];
  const pronunciations: OxfordPronunciation[] = [];

  for (const lexicalEntry of result.lexicalEntries ?? []) {
    pronunciations.push(...(lexicalEntry.pronunciations ?? []));
    for (const entry of lexicalEntry.entries ?? []) {
      pronunciations.push(...(entry.pronunciations ?? []));
      collectOxfordSenses(entry.senses ?? [], lexicalEntry.lexicalCategory?.text, definitions, source);
    }
  }

  const ukPronunciation = pronunciations.find((item) => includesDialect(item, "British")) ?? pronunciations[0];
  const usPronunciation = pronunciations.find((item) => includesDialect(item, "American")) ?? pronunciations[0];
  const headword = result.word ?? fallbackWord;
  const now = nowIso();

  return {
    id: `oxford_${normalizeHeadword(headword)}`,
    headword,
    normalizedHeadword: normalizeHeadword(headword),
    language: lang,
    phoneticUK: ukPronunciation?.phoneticSpelling ? withSlashes(ukPronunciation.phoneticSpelling) : undefined,
    phoneticUS: usPronunciation?.phoneticSpelling ? withSlashes(usPronunciation.phoneticSpelling) : undefined,
    audioUK: normalizeAudioUrl(ukPronunciation?.audioFile),
    audioUS: normalizeAudioUrl(usPronunciation?.audioFile),
    definitions: definitions.length ? definitions.slice(0, 16) : [fallbackDefinition(headword, source)],
    source,
    createdAt: now,
    updatedAt: now
  };
}

function collectOxfordSenses(senses: OxfordSense[], partOfSpeech: string | undefined, definitions: Definition[], source: string): void {
  for (const sense of senses) {
    for (const definition of sense.definitions ?? []) {
      definitions.push({
        id: createId("def"),
        partOfSpeech,
        definitionEn: definition,
        exampleEn: sense.examples?.find((example) => example.text)?.text,
        source
      });
    }
    if (sense.subsenses?.length) {
      collectOxfordSenses(sense.subsenses, partOfSpeech, definitions, source);
    }
  }
}

function mapMerriamEntry(data: MerriamResponse, fallbackWord: string, lang: string, source: string): DictionaryEntry | null {
  const entries = data.filter((item): item is MerriamEntry => typeof item !== "string");
  if (!entries.length) {
    return null;
  }

  const first = entries[0];
  const headword = cleanMerriamText(first.hwi?.hw ?? first.meta?.id ?? fallbackWord).replace(/\*/g, "");
  const pronunciation = first.hwi?.prs?.[0];
  const audio = pronunciation?.sound?.audio ? merriamAudioUrl(pronunciation.sound.audio) : undefined;
  const definitions = entries
    .flatMap((entry) =>
      (entry.shortdef ?? []).map((definition) => ({
        id: createId("def"),
        partOfSpeech: entry.fl,
        definitionEn: cleanMerriamText(definition),
        source
      }))
    )
    .filter((definition): definition is Definition => Boolean(definition.definitionEn))
    .slice(0, 16);
  const now = nowIso();

  return {
    id: `merriam_${normalizeHeadword(headword)}`,
    headword,
    normalizedHeadword: normalizeHeadword(headword),
    language: lang,
    phoneticUS: pronunciation?.mw ? withSlashes(pronunciation.mw) : undefined,
    audioUS: audio,
    definitions: definitions.length ? definitions : [fallbackDefinition(headword, source)],
    source,
    createdAt: now,
    updatedAt: now
  };
}

function includesDialect(pronunciation: OxfordPronunciation, token: string): boolean {
  return pronunciation.dialects?.some((dialect) => dialect.toLocaleLowerCase().includes(token.toLocaleLowerCase())) ?? false;
}

function normalizeAudioUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  return url;
}

function merriamAudioUrl(audio: string): string {
  const subdirectory = audio.startsWith("bix") ? "bix" : audio.startsWith("gg") ? "gg" : /^[0-9_\-]/.test(audio) ? "number" : audio[0];
  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${audio}.mp3`;
}

function cleanMerriamText(text: string): string {
  return text
    .replace(/\{bc\}/g, ": ")
    .replace(/\{/?it\}/g, "")
    .replace(/\{/?wi\}/g, "")
    .replace(/\{[^}]+\|([^}|]+)(?:\|[^}]*)?\}/g, "$1")
    .replace(/\{[^}]+\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function withSlashes(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}/`;
}

function fallbackDefinition(word: string, source: string): Definition {
  return {
    id: createId("def"),
    partOfSpeech: "entry",
    definitionEn: `${source} returned an entry for "${word}" without a displayable definition.`,
    source
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
