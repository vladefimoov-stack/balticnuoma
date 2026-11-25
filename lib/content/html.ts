import sanitizeHtml from "sanitize-html";

/**
 * Car / category descriptions are written by staff in the admin's rich-text editor.
 * Stored and rendered through the same small allow-list (defense in depth).
 */
export function cleanHtml(html: string | null | undefined) {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h3", "h4", "blockquote", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["https", "mailto", "tel"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }) },
  }).trim();
}

/** True when the HTML has no visible text (e.g. "<p><br></p>" from an emptied editor). */
export function isBlankHtml(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;|\s/g, "") === "";
}
