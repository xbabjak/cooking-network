import DOMPurify from "isomorphic-dompurify";

/**
 * Remove HTML tags and return plain text for excerpts (feed, user page preview).
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).trim();
}

/**
 * Extract first <img src="..."> from HTML for feed preview image.
 */
export function getFirstImageFromHtml(html: string): string | null {
  if (!html || typeof html !== "string") return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/**
 * Sanitize HTML for safely rendering with dangerouslySetInnerHTML (XSS protection).
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "code", "pre",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "hr",
      "a", "img",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel"],
  });
}

/**
 * Convert legacy plain text + imageUrls to HTML for edit form initialization.
 */
export function plainToHtml(plain: string, imageUrls?: string[]): string {
  const images = (imageUrls ?? [])
    .filter((url) => url && url.startsWith("http"))
    .map((url) => `<img src="${url.replace(/"/g, "&quot;")}" alt="" />`)
    .join("");

  const escaped = (plain ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const paragraphs = escaped
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  if (!images && !paragraphs) return "<p></p>";
  return images + paragraphs;
}
