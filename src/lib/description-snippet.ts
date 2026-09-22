/** Display excerpt only: preserve words and never alter stored content. */
export function descriptionSnippet(text: string, limit = 600): string {
  if (text.length <= limit) return text;
  let end = Math.max(0, limit);
  while (end > 0 && !/\s/u.test(text[end])) end--;
  if (!end) {
    end = text.search(/\s/u);
    if (end < 0) return text;
  }
  return `${text.slice(0, end).trimEnd()}…`;
}
