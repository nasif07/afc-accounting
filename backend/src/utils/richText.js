const sanitizeHtml = require("sanitize-html");

/**
 * Server-side sanitisation for the rich-text fields produced by the TipTap
 * editor (frontend/src/components/common/RichTextEditor.jsx).
 *
 * The client sends HTML, so the client is by definition not the authority on
 * what that HTML contains — a crafted request can post anything to the API
 * regardless of what the editor's toolbar offers. Everything below is an
 * allowlist: tags and attributes not named here are dropped, not escaped, so
 * a stripped payload still reads as prose rather than as visible markup.
 *
 * Kept deliberately narrow and in lockstep with the editor's extension set.
 * Adding a mark to the toolbar means adding its tag here too, otherwise the
 * formatting silently disappears on save.
 */

// Mirrors StarterKit's node/mark set as configured in RichTextEditor.jsx.
// No images: attachments are the file channel here, and an <img src="data:">
// would let a request smuggle megabytes into a document field that Mongo
// stores inline.
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "hr",
  "a",
];

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  // href only — no target/rel from the client. The renderer adds its own
  // target="_blank" rel="noopener" so the decision is ours, not the payload's.
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
  // A link with a scheme we do not allow keeps its text and loses its href,
  // instead of the whole anchor (and the words inside it) vanishing.
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  // Empty paragraphs are how the editor represents blank lines; keeping them
  // preserves the author's spacing.
  nonTextTags: ["style", "script", "textarea", "option", "noscript"],
};

/** Strips everything not on the allowlist. Always call before persisting. */
const sanitizeRichText = (html) => {
  if (typeof html !== "string" || html.trim() === "") return "";
  return sanitizeHtml(html, SANITIZE_OPTIONS).trim();
};

// Block-level tags become a newline so "para one</p><p>para two" does not
// collapse into "para onepara two" and give a misleading character count.
const BLOCK_BOUNDARY = /<\/?(p|div|br|li|h[1-6]|blockquote|pre|hr|tr)[^>]*>/gi;

// sanitize-html re-encodes entities on output even with an empty tag
// allowlist, so stripping "<p>R&amp;D</p>" leaves the literal "R&amp;D". That
// is wrong for every consumer: it counts as five characters against a limit
// the author spent one on, and a search for "R&D" would never match. Only the
// five XML entities plus &nbsp; and numeric references can appear here, since
// the input is our own editor's serialisation.
const decodeEntities = (text) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // Last, or "&amp;lt;" would decode twice into "<".
    .replace(/&amp;/g, "&");

/**
 * The plain-text projection of a rich-text field.
 *
 * Three callers depend on it and each would be wrong without it:
 *   - length validation, so 2,000 characters means 2,000 *typed* characters
 *     rather than 2,000 characters of markup;
 *   - regex search, which must not match on tag names ("em" finding every
 *     italic run);
 *   - list previews and the text/plain part of notification emails.
 */
const htmlToPlainText = (html) => {
  if (typeof html !== "string" || html === "") return "";

  const stripped = sanitizeHtml(html.replace(BLOCK_BOUNDARY, "\n"), {
    allowedTags: [],
    allowedAttributes: {},
  });

  return (
    decodeEntities(stripped)
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      // One newline per block boundary, not two. BLOCK_BOUNDARY matches both
      // the opening and closing tag of every block, so "<p>a</p><p>b</p>"
      // would otherwise yield "a\n\nb" — inflating the character count by one
      // per paragraph, on a field whose limit is expressed in typed
      // characters. The client's projection (frontend/src/utils/richText.js)
      // collapses identically, so the two agree on what a description costs.
      .replace(/\n{2,}/g, "\n")
      .trim()
  );
};

/** True when the field carries no actual words — "<p></p>" from an empty editor. */
const isRichTextEmpty = (html) => htmlToPlainText(html).length === 0;

/**
 * Escapes a plain string for interpolation into an HTML email body. Used by
 * emailTemplates.js for the values that are *not* already sanitised rich text.
 */
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

module.exports = {
  sanitizeRichText,
  htmlToPlainText,
  isRichTextEmpty,
  escapeHtml,
  ALLOWED_TAGS,
};
