import { ApiProvider, AppStore, ProviderPurpose, UserTerm } from "../../types/models";
import { MockTranslationProvider } from "./mockTranslationProvider";
import { MyMemoryTranslationProvider } from "./myMemoryTranslationProvider";
import { OpenAICompatibleTranslationProvider } from "./openAICompatibleTranslationProvider";
import { PlaceholderTranslationProvider } from "./placeholders";
import { TranslateInput, TranslationProvider } from "./types";

export function findMatchedTerms(text: string, terms: UserTerm[]): UserTerm[] {
  const lower = text.toLocaleLowerCase();
  return terms
    .filter((term) => {
      const source = term.sourceText.trim();
      return source && (text.includes(source) || lower.includes(source.toLocaleLowerCase()));
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 12);
}

export function enabledProvidersFor(store: AppStore, purpose: ProviderPurpose): ApiProvider[] {
  return store.apiProviders
    .filter((provider) => provider.enabled && provider.useFor.includes(purpose))
    .sort((a, b) => a.priority - b.priority);
}

export function createTranslationProvider(config: ApiProvider): TranslationProvider {
  if (config.type === "mymemory") {
    return new MyMemoryTranslationProvider(config);
  }
  if (config.type === "mock") {
    return new MockTranslationProvider();
  }
  if (config.type === "openai") {
    return new OpenAICompatibleTranslationProvider(config);
  }
  return new PlaceholderTranslationProvider(config.id, config.name);
}

export function getPreferredTranslationProvider(store: AppStore, preferredId?: string): ApiProvider {
  const enabled = enabledProvidersFor(store, "translate");
  const preferred = preferredId ? store.apiProviders.find((provider) => provider.id === preferredId) : undefined;
  if (preferred?.enabled && preferred.useFor.includes("translate")) {
    return preferred;
  }
  return enabled[0] ?? store.apiProviders.find((provider) => provider.type === "mock") ?? store.apiProviders[0];
}

export async function translateWithProvider(
  store: AppStore,
  input: Omit<TranslateInput, "glossary">,
  preferredProviderId?: string
) {
  const glossary = findMatchedTerms(input.text, store.glossary);
  const providerConfig = getPreferredTranslationProvider(store, preferredProviderId);
  const provider = createTranslationProvider(providerConfig);
  try {
    return {
      output: await provider.translate({ ...input, glossary }),
      matchedTerms: glossary,
      providerConfig,
      fallbackError: undefined as string | undefined
    };
  } catch (error) {
    const fallbackProviderConfig =
      store.apiProviders.find((candidate) => candidate.enabled && candidate.type === "mymemory") ??
      store.apiProviders.find((candidate) => candidate.type === "mock");

    if (!fallbackProviderConfig || fallbackProviderConfig.id === providerConfig.id) {
      throw error;
    }

    const fallbackProvider = createTranslationProvider(fallbackProviderConfig);
    return {
      output: await fallbackProvider.translate({ ...input, glossary }),
      matchedTerms: glossary,
      providerConfig: fallbackProviderConfig,
      fallbackError: (error as Error).message
    };
  }
}
