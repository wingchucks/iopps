/**
 * HTML Sanitization utilities for preventing XSS attacks
 */
import DOMPurify from "isomorphic-dompurify";

// Configure DOMPurify with safe defaults
const DOMPURIFY_CONFIG = {
  // Allow safe HTML tags for job descriptions
  ALLOWED_TAGS: [
    "p", "br", "div", "span",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "strong", "b", "em", "i", "u",
    "a",
    "table", "thead", "tbody", "tr", "th", "td",
    "blockquote", "pre", "code",
    "hr",
  ],
  // Allow safe attributes
  ALLOWED_ATTR: [
    "href", "target", "rel",
    "class", "style",
  ],
  // Force all links to open in new tab with security attributes
  ADD_ATTR: ["target", "rel"],
  // Prevent dangerous protocols
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  // Remove any script-related content
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * Use this for any user-generated or external HTML content before rendering
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";

  // Sanitize the HTML
  const sanitized = DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG);

  // Convert to string (handles TrustedHTML type)
  let clean = typeof sanitized === "string" ? sanitized : String(sanitized);

  // Add security attributes to all links
  clean = clean.replace(
    /<a\s+([^>]*href=[^>]*)>/gi,
    '<a $1 target="_blank" rel="noopener noreferrer">'
  );

  return clean;
}

/**
 * Sanitize plain text (escape HTML entities)
 */
export function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Check if a string contains potentially dangerous HTML
 */
export function containsDangerousHtml(html: string): boolean {
  if (!html) return false;
  const dangerous = /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i;
  return dangerous.test(html);
}
