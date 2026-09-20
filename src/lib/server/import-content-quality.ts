import { Parser } from "htmlparser2";
import { descriptionText } from "@/lib/description-text";

// Exact, reversible UTF-8 punctuation interpreted as Windows-1252/Latin-1.
// Never recode the entire string: that destroys valid Unicode beside corruption.
const knownEncoding = new Map([
  ["â€™", "’"], ["â€˜", "‘"], ["â€œ", "“"], ["â€\u009d", "”"],
  ["â€¢", "•"], ["â€“", "–"], ["â€”", "—"], ["â€¦", "…"],
  ["â\u0080\u0099", "’"], ["â\u0080\u0098", "‘"],
  ["â\u0080\u009c", "“"], ["â\u0080\u009d", "”"],
  ["Â\u00a0", " "],
]);
const encodingPattern = new RegExp([...knownEncoding.keys()].join("|"), "g");

function safeLink(value: string): string {
  // Text only, not a clickable HTML sink; nevertheless drop active/relative URLs.
  if (!/^(https?:\/\/|mailto:)/i.test(value) || /[\s<>\u0000-\u001f]/.test(value)) return "";
  try { const url = new URL(value); return url.username || url.password ? "" : value; } catch { return ""; }
}

function importedHtmlText(value: string): string {
  const parts: string[] = [];
  const blocks = new Set(["p", "div", "section", "article", "br", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6"]);
  const links: string[] = [];
  let hiddenDepth = 0;
  const parser = new Parser({
    onopentag(name, attributes) {
      if (["script", "style", "template"].includes(name)) hiddenDepth++;
      if (hiddenDepth) return;
      if (blocks.has(name)) parts.push(name === "li" ? "\n• " : "\n");
      if (name === "a") links.push(safeLink(attributes.href || ""));
    },
    ontext(chunk) { if (!hiddenDepth) parts.push(chunk); },
    onclosetag(name) {
      if (["script", "style", "template"].includes(name)) hiddenDepth = Math.max(0, hiddenDepth - 1);
      else if (!hiddenDepth) {
        if (blocks.has(name)) parts.push("\n");
        if (name === "a") { const url = links.pop(); if (url) parts.push(` (${url})`); }
      }
    },
  }, { decodeEntities: true });
  parser.end(value);
  return parts.join("");
}

export interface ImportContentQuality {
  version: 1;
  rawDescription: string;
  needsReview: boolean;
  issues: string[];
}

/** Internal job metadata, excluded by publicContentRecord's positive projection.
 * Preserve source text, not purported original bytes; U+FFFD cannot be reversed.
 */
export function prepareImportedDescription(rawDescription: string, format?: unknown) {
  const description = normalizePartnerDescription(rawDescription, format);
  const issues: string[] = [];
  if (rawDescription.includes("\ufffd") || description.includes("\ufffd")) issues.push("replacement-character");
  if (/\bpossiblilties\b/.test(description)) issues.push("suspect-copy:possiblilties");
  if (/(?:Ã|Â|â€|â\u0080)/.test(description)) issues.push("suspect-encoding");
  const importContentQuality: ImportContentQuality = { version: 1, rawDescription, needsReview: issues.length > 0, issues };
  return { description, descriptionFormat: "plain-text" as const, importContentQuality };
}

export function normalizePartnerDescription(value: string, format?: unknown): string {
  const source = value.replace(/\r\n?/g, "\n");
  if (format === "plain-text") return descriptionText(source, "plain-text");
  const repaired = source.replace(encodingPattern, match => knownEncoding.get(match)!);
  // Deliberately a conservative prose subset, not a Markdown-to-HTML engine.
  // Parse source HTML once; decoded text is NEVER parsed again.
  const text = (format === "decoded-text" ? repaired : importedHtmlText(repaired))
    .replace(/\[([^\]\n]+)\]\(([^\s()]+)\)/g, (_match, label: string, href: string) => {
      const url = safeLink(href); return url ? `${label} (${url})` : label;
    })
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/^ {0,3}#{1,6}[ \t]+/gm, "")
    .replace(/^ {0,3}[-*+][ \t]+/gm, "• ");
  return descriptionText(text, "plain-text");
}
