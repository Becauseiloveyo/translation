import { buildLookupForms } from "./wordForms";

export type PronunciationLocale = "en-US" | "en-GB";

type FreeDictionaryPhonetic = {
  audio?: string;
};

type FreeDictionaryEntry = {
  phonetics?: FreeDictionaryPhonetic[];
};

export async function playEnglishPronunciation(word: string, locale: PronunciationLocale, knownAudioUrls: Array<string | undefined> = []): Promise<boolean> {
  const candidates = await buildAudioCandidates(word, locale, knownAudioUrls);
  for (const url of candidates) {
    const played = await tryPlayAudio(url);
    if (played) {
      return true;
    }
  }
  return speakWord(word, locale);
}

async function buildAudioCandidates(word: string, locale: PronunciationLocale, knownAudioUrls: Array<string | undefined>): Promise<string[]> {
  const normalizedWords = unique(buildLookupForms(word).filter(Boolean));
  const directUrls = knownAudioUrls.filter((url): url is string => Boolean(url));
  const apiUrls = await fetchFreeDictionaryAudio(normalizedWords[0] ?? word);
  const type = locale === "en-US" ? "2" : "1";
  const constructed = normalizedWords.flatMap((item) => [
    `https://api.dictionaryapi.dev/media/pronunciations/en/${encodeURIComponent(item)}-${locale === "en-US" ? "us" : "uk"}.mp3`,
    `https://api.dictionaryapi.dev/media/pronunciations/en/${encodeURIComponent(item)}.mp3`,
    `https://dict.youdao.com/dictvoice?type=${type}&audio=${encodeURIComponent(item)}`
  ]);

  return unique([...directUrls, ...apiUrls, ...constructed]);
}

async function fetchFreeDictionaryAudio(word: string): Promise<string[]> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as FreeDictionaryEntry[];
    return unique((Array.isArray(data) ? data : []).flatMap((entry) => entry.phonetics ?? []).map((item) => normalizeAudioUrl(item.audio)).filter((url): url is string => Boolean(url)));
  } catch {
    return [];
  }
}

function normalizeAudioUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  return url;
}

async function tryPlayAudio(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.preload = "auto";
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(false);
    }, 4500);

    function cleanup() {
      window.clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
    }

    audio.onended = () => {
      cleanup();
      resolve(true);
    };
    audio.onerror = () => {
      cleanup();
      resolve(false);
    };

    void audio.play().then(() => {
      window.setTimeout(() => {
        cleanup();
        resolve(true);
      }, 350);
    }).catch(() => {
      cleanup();
      resolve(false);
    });
  });
}

function speakWord(word: string, locale: PronunciationLocale): boolean {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return false;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = locale;
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
  return true;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
