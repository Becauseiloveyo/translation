import { hasChinese, isSingleEnglishWord } from "./text";

export type InputIntent = "empty" | "lookup" | "translate";

export type InputDetection = {
  intent: InputIntent;
  kind: "empty" | "word" | "phrase" | "sentence";
  sourceLang: string;
  targetLang: string;
  hasChinese: boolean;
};

export function detectInput(text: string, sourceOverride = "auto", targetOverride = "auto"): InputDetection {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      intent: "empty",
      kind: "empty",
      sourceLang: sourceOverride,
      targetLang: targetOverride === "auto" ? "zh" : targetOverride,
      hasChinese: false
    };
  }

  const containsChinese = hasChinese(trimmed);
  const singleWord = isSingleEnglishWord(trimmed);
  const hasSentenceMark = /[.!?。！？\n]/.test(trimmed);
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const sourceLang = sourceOverride === "auto" ? (containsChinese ? "zh" : "en") : sourceOverride;
  const targetLang = targetOverride === "auto" ? (containsChinese ? "en" : "zh") : targetOverride;

  return {
    intent: singleWord ? "lookup" : "translate",
    kind: singleWord ? "word" : hasSentenceMark || wordCount > 5 ? "sentence" : "phrase",
    sourceLang,
    targetLang,
    hasChinese: containsChinese
  };
}

