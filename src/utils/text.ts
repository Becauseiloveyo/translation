export function normalizeHeadword(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function hasChinese(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

export function isSingleEnglishWord(value: string): boolean {
  return /^[A-Za-z][A-Za-z'-]*$/.test(value.trim());
}

export function downloadTextFile(fileName: string, content: string, mimeType = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function escapeCsv(value: string | number | undefined): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
