/** Rich text JSON renderer with HTML escaping. */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

interface RichTextNode {
  type?: string;
  text?: string;
  content?: RichTextNode[] | string;
  attrs?: Record<string, unknown>;
}

function extractText(node: RichTextNode | string | undefined): string {
  if (!node) return "";
  if (typeof node === "string") return escapeHtml(node);
  if (typeof node.text === "string") return escapeHtml(node.text);
  if (Array.isArray(node.content)) {
    return node.content.map(extractText).join("");
  }
  if (typeof node.content === "string") return escapeHtml(node.content);
  return "";
}

/**
 * Render a rich text JSON document to HTML.
 * Content format: `{ type: "doc", content: [{ type: "heading"|"paragraph"|..., content: ... }] }`
 */
export function renderRichText(content: unknown): string {
  if (!content) return "";

  let doc: unknown = content;
  if (typeof content === "string") {
    try {
      doc = JSON.parse(content);
    } catch {
      return `<p>${escapeHtml(content)}</p>`;
    }
  }

  const parsed = doc as RichTextNode;
  if (parsed.type === "doc" && Array.isArray(parsed.content)) {
    return parsed.content
      .map((node) => {
        const text = extractText(node);
        switch (node.type) {
          case "heading": {
            const level = Math.max(1, Math.min(6, Number(node.attrs?.level) || 2));
            return `<h${level}>${text}</h${level}>`;
          }
          case "paragraph":
            return `<p>${text}</p>`;
          case "blockquote":
            return `<blockquote>${text}</blockquote>`;
          case "codeBlock":
            return `<pre><code>${text}</code></pre>`;
          case "bulletList":
          case "orderedList": {
            const tag = node.type === "bulletList" ? "ul" : "ol";
            const items = ((node.content as RichTextNode[] | undefined) ?? [])
              .map((li) => `<li>${extractText(li)}</li>`)
              .join("");
            return `<${tag}>${items}</${tag}>`;
          }
          default:
            return text ? `<p>${text}</p>` : "";
        }
      })
      .join("");
  }

  return typeof content === "string" ? `<p>${escapeHtml(content)}</p>` : "";
}

/** Extract plain text paragraphs from rich text JSON (for product descriptions, etc.). */
export function extractParagraphs(content: unknown): string[] {
  if (!content) return [];

  let doc: unknown = content;
  if (typeof content === "string") {
    try {
      doc = JSON.parse(content);
    } catch {
      return [content];
    }
  }

  const parsed = doc as RichTextNode;
  if (!parsed.content || !Array.isArray(parsed.content)) return [];

  return parsed.content
    .filter((node) => node.type === "paragraph")
    .map((node) => extractText(node));
}
