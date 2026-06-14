import { ApiProvider } from "../../types/models";
import { TranslateInput, TranslateOutput, TranslationProvider } from "./types";

type LibreTranslateResponse = {
  translatedText?: string;
  detectedLanguage?: {
    confidence?: number;
    language?: string;
  };
  error?: string;
};

const DEFAULT_BASE_URL = "https://libretranslate.com/translate";

export class LibreTranslateProvider implements TranslationProvider {
  id: string;
  name: string;

  constructor(private readonly config: ApiProvider) {
    this.id = config.id;
    this.name = config.name;
  }

  async translate(input: TranslateInput): Promise<TranslateOutput> {
    const text = input.text.trim();
    if (!text) {
      return { translatedText: "", alternatives: [], provider: this.name };
    }

    const endpoint = this.config.baseUrl?.trim() || DEFAULT_BASE_URL;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: normalizeLanguage(input.sourceLang, "auto"),
        target: normalizeLanguage(input.targetLang, "zh"),
        format: "text",
        api_key: this.config.apiKeyEncrypted || undefined
      })
    });

    if (!response.ok) {
      throw new Error(`${this.name} HTTP ${response.status}`);
    }

    const data = (await response.json()) as LibreTranslateResponse;
    if (data.error) {
      throw new Error(data.error);
    }
    if (!data.translatedText) {
      throw new Error(`${this.name} returned an empty translation`);
    }

    return {
      translatedText: data.translatedText,
      alternatives: [],
      provider: this.name,
      detectedLang: data.detectedLanguage?.language,
      raw: data
    };
  }
}

function normalizeLanguage(value: string | undefined, fallback: string): string {
  if (!value || value === "auto") {
    return fallback;
  }
  if (value === "zh") {
    return "zh";
  }
  return value;
}
