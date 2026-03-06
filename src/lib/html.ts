import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "u",
  "ul",
];

export function sanitizeJobHtml(input: string): string {
  if (!input.includes("<")) return input;

  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "rel", "target"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (_tagName: string, attribs: Record<string, string>) => {
        const safeAttribs: Record<string, string> = {};

        if (typeof attribs.href === "string") {
          safeAttribs.href = attribs.href;
        }

        if (attribs.target === "_blank") {
          safeAttribs.target = "_blank";
          safeAttribs.rel = "noopener noreferrer";
        }

        return { tagName: "a", attribs: safeAttribs };
      },
    },
  });
}
