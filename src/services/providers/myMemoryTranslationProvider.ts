import { ApiProvider } from "../../types/models";
import { TranslateInput, TranslateOutput, TranslationProvider } from "./types";

const DEFAULT_BASE_URL = "https://api.mymemory.translated.net/get";

type MyMemoryResponse = {
  responseData?: {
    translatedText?: string;
    match?: number;
  };
  matches?: Array<{
    translation?: string;
    quality?: string;
    match?: number;
  }>;
  responseStatus?: number;
  responseDetails?: string;
};

export class MyMemoryTranslationProvider implements TranslationProvider {
  id: string;
  name: string;

  constructor(private readonly config: ApiProvider) {
    this.id = config.id;
    this.name = config.name;
  }

  async translate(input: TranslateInput): Promise<TranslateOutput> {
    const text = input.text.trim();
    if (!text) {
      return {
        translatedText: "",
        alternatives: [],
        provider: this.name,
        detectedLang: input.sourceLang
      };
    }

    const sourceLang = normalizeLanguage(input.sourceLang, text);
    const targetLang = normalizeLanguage(input.targetLang, text, "zh-CN");
    const baseUrl = this.config.baseUrl?.trim() || DEFAULT_BASE_URL;
    const params = new URLSearchParams({
      q: text,
      langpair: `${sourceLang}|${targetLang}`
    });
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`${this.name} HTTP ${response.status}`);
    }

    const data = (await response.json()) as MyMemoryResponse;
    const translatedText = data.responseData?.translatedText?.trim();
    if (!translatedText) {
      throw new Error(data.responseDetails || `${this.name} returned an empty translation`);
    }

    const alternatives = unique(
      (data.matches ?? [])
        .map((item) => item.translation?.trim())
        .filter((item): item is string => Boolean(item && item !== translatedText))
    ).slice(0, 3);

    return {
      translatedText,
      alternatives,
      provider: this.name,
      detectedLang: sourceLang,
      raw: data
    };
  }
}

function normalizeLanguage(value: string | undefined, text: string, autoFallback = "en"): string {
  if (!value || value === "auto") {
    return /[\u4e00-\u9fff]/.test(text) ? "zh-CN" : autoFallback;
  }
  if (value === "zh") {
    return "zh-CN";
  }
  if (value === "en") {
    return "en";
  }
  if (value === "ja") {
    return "ja";
  }
  if (value === "ko") {
    return "ko";
  }
  return value;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
