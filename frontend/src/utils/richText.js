/**
 * Client-side helpers for the HTML written by RichTextEditor.
 *
 * The authority on both sanitisation and length is the server
 * (backend/src/utils/richText.js). These exist so the form can validate and
 * preview without a round trip, and are intentionally the same rules: text
 * length is measured on words, not markup, so formatting a sentence never
 * changes whether it fits.
 */

// Elements whose text is code, not prose. textContent would otherwise hand
// back the *source* of a <script> as if the author had typed it — inflating
// the character count and putting JavaScript into a table preview. The parsed
// document is inert so nothing runs either way, but the server drops these
// (sanitize-html's nonTextTags default) and the two projections have to agree.
const NON_TEXT_TAGS = "script, style, textarea, noscript, option";

// DOMParser rather than a regex: a regex that strips tags also mangles text
// containing "<" and decodes nothing, so "a < b" and "&amp;" both come out
// wrong. The parser is inert — it builds a detached document that never
// executes scripts or loads resources.
const parse = (html) => {
  const doc = new DOMParser().parseFromString(
    // Block boundaries become newlines first, so two paragraphs do not merge
    // into one run-on word when their text is concatenated.
    String(html).replace(
      /<\/?(p|div|br|li|h[1-6]|blockquote|pre|hr|tr)[^>]*>/gi,
      "\n",
    ),
    "text/html",
  );

  doc.body.querySelectorAll(NON_TEXT_TAGS).forEach((node) => node.remove());
  return doc;
};

/** The plain-text projection — what the character counter and validators count. */
export const htmlToPlainText = (html) => {
  if (typeof html !== "string" || html === "") return "";
  if (!/[<&]/.test(html)) return html.trim(); // already plain text

  // textContent decodes entities for us, so "R&amp;D" is already "R&D" here —
  // the server has to do that by hand (see its decodeEntities).
  return (parse(html).body.textContent || "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    // One newline per block boundary. The regex above matches a block's
    // opening AND closing tag, so without this every paragraph break would
    // count as two characters against a limit measured in typed ones — and
    // the server, which collapses the same way, would disagree with the
    // counter the user is watching.
    .replace(/\n{2,}/g, "\n")
    .trim();
};

/** True for an editor that has been opened and cleared ("<p></p>"). */
export const isRichTextEmpty = (html) => htmlToPlainText(html).length === 0;

/**
 * A single-line summary for table rows and cards.
 *
 * Prefers the server's stored `descriptionText`, falling back to deriving it
 * here — rows created before that field existed have it empty, and a preview
 * column that goes blank on every historical row reads as data loss.
 */
export const toPreview = (descriptionText, description) =>
  descriptionText?.trim() || htmlToPlainText(description).replace(/\n+/g, " ");
