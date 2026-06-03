import { ApiProvider } from "../../types/models";
import { TranslationProvider, TranslateInput, TranslateOutput } from "./types";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export class OpenAICompatibleTranslationProvider implements TranslationProvider {
  id: string;
  name: string;
  private config: ApiProvider;

  constructor(config: ApiProvider) {
    this.id = config.id;
    this.name = config.name;
    this.config = config;
  }

  async translate(input: TranslateInput): Promise<TranslateOutput> {
    const apiKey = this.config.apiKeyEncrypted?.trim();
    const baseUrl = this.config.baseUrl?.replace(/\/+$/, "");
    const model = this.config.model?.trim();

    if (!apiKey) {
      throw new Error("OpenAI-compatible provider is missing an API key.");
    }
    if (!baseUrl) {
      throw new Error("OpenAI-compatible provider is missing a base URL.");
    }
    if (!model) {
      throw new Error("OpenAI-compatible provider is missing a model.");
    }

    const glossary = input.glossary?.length
      ? input.glossary.map((term) => `${term.sourceText} => ${term.targetText}`).join("\n")
      : "None";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a careful translation engine. Return only the translated text. Respect glossary terms when they fit naturally."
          },
          {
            role: "user",
            content: [
              `Source language: ${input.sourceLang ?? "auto"}`,
              `Target language: ${input.targetLang}`,
              `Glossary:\n${glossary}`,
              `Text:\n${input.text}`
            ].join("\n\n")
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Provider request failed with HTTP ${response.status}.`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const translatedText = data.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error("Provider returned an empty translation.");
    }

    return {
      translatedText,
      provider: this.name,
      detectedLang: input.sourceLang,
      raw: data
    };
  }
}

