import { DictionaryEntry } from "../../types/models";
import { createId, nowIso } from "../../utils/id";
import { normalizeHeadword } from "../../utils/text";
import { DictionaryProvider, LookupInput } from "../providers/types";

const seedDefinitions: Record<string, Pick<DictionaryEntry, "headword" | "phoneticUS" | "phoneticUK" | "definitions" | "examples">> = {
  hello: {
    headword: "hello",
    phoneticUS: "/həˈloʊ/",
    phoneticUK: "/həˈləʊ/",
    definitions: [
      {
        id: "def_hello_1",
        partOfSpeech: "interjection",
        definitionZh: "你好；用于问候或引起注意。",
        definitionEn: "Used as a greeting or to attract attention.",
        exampleEn: "Hello, welcome to LiteDict.",
        exampleZh: "你好，欢迎使用 LiteDict。"
      }
    ],
    examples: [{ id: "ex_hello_1", text: "Hello there.", translation: "你好。" }]
  },
  translate: {
    headword: "translate",
    phoneticUS: "/trænzˈleɪt/",
    phoneticUK: "/trænzˈleɪt/",
    definitions: [
      {
        id: "def_translate_1",
        partOfSpeech: "verb",
        definitionZh: "翻译；把一种语言转换成另一种语言。",
        definitionEn: "To express text or speech in another language.",
        exampleEn: "The app can translate short notes.",
        exampleZh: "这个应用可以翻译简短笔记。"
      }
    ]
  }
};

export class MockDictionaryProvider implements DictionaryProvider {
  id = "mock-dictionary";
  name = "Mock Dictionary";

  async lookup(input: LookupInput): Promise<DictionaryEntry | null> {
    const normalized = normalizeHeadword(input.text);
    if (!normalized) {
      return null;
    }

    const seeded = seedDefinitions[normalized];
    if (seeded) {
      return {
        ...seeded,
        id: `mock_${normalized}`,
        normalizedHeadword: normalized,
        language: input.sourceLang ?? "en",
        source: this.name,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
    }

    return {
      id: createId("mock_entry"),
      headword: input.text.trim(),
      normalizedHeadword: normalized,
      language: input.sourceLang ?? "en",
      definitions: [
        {
          id: createId("mock_def"),
          partOfSpeech: "mock",
          definitionZh: `“${input.text.trim()}” 的模拟词典释义。导入本地词典后会优先显示真实的个人词典结果。`,
          definitionEn: `Mock dictionary definition for "${input.text.trim()}".`
        }
      ],
      source: this.name,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  }
}

