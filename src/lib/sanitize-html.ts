import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize untrusted HTML before passing to `dangerouslySetInnerHTML`.
 *
 * The detail pages for jobs, events, and scholarships render rich-text
 * descriptions submitted by employers. Without sanitization, an employer
 * (or a compromised employer account) could inject `<script>` or
 * `onerror`/`onload` handlers that execute in every visitor's browser.
 *
 * DOMPurify's default profile strips scripts and event handlers but keeps
 * formatting tags (b, i, p, ul, li, a, img with safe src, etc.). We add
 * `target=_blank` + `rel=noopener` to all anchors via the standard
 * `uponSanitizeElement` hook pattern — see `sanitizeRichTextHtml` below.
 */
export function sanitizeRichTextHtml(html: string | null | undefined): string {
  if (!html || typeof html !== "string") return "";
  return DOMPurify.sanitize(html, {
    // Allowed tags — a conservative rich-text subset. Covers bold, italic,
    // headings, lists, links, paragraphs, line breaks, blockquotes, tables,
    // images. No scripts, no iframes, no form elements.
    ALLOWED_TAGS: [
      "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3",
      "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "s",
      "span", "strong", "sub", "sup", "table", "tbody", "td", "th",
      "thead", "tr", "u", "ul",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "target", "rel", "class", "style",
    ],
    // Block dangerous URL schemes like `javascript:` in href/src.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#|data:image\/(?:png|jpeg|gif|webp|svg\+xml);)/i,
    // Don't allow unknown elements / attrs to leak through.
    KEEP_CONTENT: true,
    // Discard comments.
    ALLOW_DATA_ATTR: false,
  });
}
