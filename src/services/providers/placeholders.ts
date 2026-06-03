import { TranslationProvider, TranslateInput, TranslateOutput } from "./types";

export class PlaceholderTranslationProvider implements TranslationProvider {
  id: string;
  name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  async translate(_input: TranslateInput): Promise<TranslateOutput> {
    throw new Error(`${this.name} is a placeholder adapter. Configure a real implementation before enabling it.`);
  }
}

