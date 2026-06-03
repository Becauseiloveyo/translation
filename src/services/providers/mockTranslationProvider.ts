import { TranslationProvider, TranslateInput, TranslateOutput } from "./types";

export class MockTranslationProvider implements TranslationProvider {
  id = "mock";
  name = "Mock Provider";

  async translate(input: TranslateInput): Promise<TranslateOutput> {
    const glossaryText = input.glossary?.length
      ? `\n\n术语提示：${input.glossary.map((term) => `${term.sourceText} → ${term.targetText}`).join("；")}`
      : "";

    const translatedText =
      input.targetLang === "en"
        ? `Mock translation: ${input.text}${glossaryText}`
        : `模拟译文：${input.text}${glossaryText}`;

    return {
      translatedText,
      alternatives:
        input.targetLang === "en"
          ? ["Concise mock alternative", "Natural mock alternative"]
          : ["更简洁的模拟译文", "更自然的模拟译文"],
      provider: this.name,
      detectedLang: input.sourceLang
    };
  }
}

