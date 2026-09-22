import { Parser } from "htmlparser2";


/** Contract: output is plain text for React text children, NEVER an HTML sink.
 * Mark parsed values so projections don't decode or parse them a second time.
 */
export function descriptionText(value: string, format?: unknown): string {
  let text = value;
  if (format !== "plain-text") {
    const parts: string[] = [];
    const blocks = new Set(["p", "div", "section", "article", "br", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6"]);
    let hiddenDepth = 0;
    const parser = new Parser({
      onopentag(name) {
        if (name === "script" || name === "style" || name === "template") hiddenDepth++;
        if (!hiddenDepth && blocks.has(name)) parts.push(name === "li" ? "\n• " : "\n");
      },
      ontext(chunk) { if (!hiddenDepth) parts.push(chunk); },
      onclosetag(name) {
        if (name === "script" || name === "style" || name === "template") hiddenDepth = Math.max(0, hiddenDepth - 1);
        else if (!hiddenDepth && blocks.has(name)) parts.push("\n");
      },
    }, { decodeEntities: true });
    parser.end(value);
    text = parts.join("");
  }
  return text.replace(/\r/g, "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
