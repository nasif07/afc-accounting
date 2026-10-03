import { useMemo } from "react";
import DOMPurify from "dompurify";
import { cn } from "../../utils/cn";

/**
 * Read-only renderer for the HTML written by RichTextEditor.
 *
 * The content was already sanitised server-side before it was stored
 * (backend/src/utils/richText.js), so this pass is defence in depth rather than
 * the primary control — but it is cheap, and it is the layer that survives a
 * record written before the server rule existed, or by any future code path
 * that forgets to sanitise. dangerouslySetInnerHTML with no purification is the
 * one thing that must never appear.
 *
 * Legacy rows matter here: every approval request created before the editor
 * shipped holds plain text with real newlines. Those have no tags, so the
 * sanitiser passes them through unchanged and they would render as one run-on
 * paragraph — hence the plain-text branch below.
 */

// Deliberately narrower than the server's allowlist would have to be: this is
// only ever asked to render our own editor's output.
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
    "code", "pre", "blockquote", "ul", "ol", "li", "h2", "h3", "hr", "a",
  ],
  ALLOWED_ATTR: ["href", "target", "rel"],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
};

// A value with no angle brackets never went through the editor.
const looksLikeHtml = (value) => /<[a-z][\s\S]*>/i.test(value);

export default function RichTextView({ html, className = "", emptyText = null }) {
  const clean = useMemo(() => {
    if (typeof html !== "string" || html.trim() === "") return "";
    if (!looksLikeHtml(html)) return null; // plain text — rendered as text below
    return DOMPurify.sanitize(html, PURIFY_CONFIG);
  }, [html]);

  if (clean === "") {
    return emptyText ? (
      <p className={cn("text-sm italic text-slate-400", className)}>{emptyText}</p>
    ) : null;
  }

  // Pre-editor rows: render as text, honouring the newlines the author typed.
  if (clean === null) {
    return (
      <div className={cn("rich-text whitespace-pre-line", className)}>{html}</div>
    );
  }

  return (
    <div
      className={cn("rich-text", className)}
      // Purified immediately above; the config is a tag allowlist, so anything
      // not on that list is gone rather than escaped.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
