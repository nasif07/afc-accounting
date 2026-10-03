import { useCallback, useEffect, useId } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Link2,
  Link2Off,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { htmlToPlainText } from "../../utils/richText";

/**
 * The app's rich-text input, built on TipTap.
 *
 * Value contract: the field holds **HTML**, and is a controlled value in the
 * react-hook-form sense — pass it through a <Controller>, not {...register()},
 * because there is no underlying <input> for RHF to attach a ref to.
 *
 * The toolbar is deliberately short. Every button here maps to a tag the
 * server's allowlist accepts (backend/src/utils/richText.js); anything richer
 * would be silently stripped on save, which reads to the author as the editor
 * losing their work. Keep the two lists in step when adding a control.
 *
 * Length is counted in characters of *text*, not markup, matching the server's
 * rule — so bolding a word never costs the author part of their limit.
 */

// StarterKit v3 already bundles Link, Underline, lists and history, so the
// extension list stays to configuration rather than assembling the basics.
const buildExtensions = (placeholder) => [
  StarterKit.configure({
    // Only h2/h3 are offered: the page already owns h1, and a document outline
    // that can skip to h4 produces headings nobody styled.
    heading: { levels: [2, 3] },
    link: {
      openOnClick: false, // clicking inside the editor should place the caret
      autolink: true,
      defaultProtocol: "https",
      // Mirrors the server's allowedSchemes. javascript: URLs are the reason
      // this list is an allowlist and not a denylist.
      protocols: ["http", "https", "mailto"],
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
    // Neither has a toolbar button, and both produce markup the sanitiser
    // keeps — leaving them enabled would let a paste introduce formatting the
    // author has no way to remove.
    codeBlock: false,
    horizontalRule: false,
  }),
  Placeholder.configure({ placeholder }),
];

function ToolbarButton({ onClick, active, disabled, label, icon: Icon }) {
  return (
    <button
      type="button"
      // Buttons inside a form default to type="submit"; without this, bolding a
      // word would submit the request.
      onMouseDown={(e) => e.preventDefault()} // keep the selection alive
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={!!active}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-brand-navy-light text-brand-navy"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
      )}>
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" />;

export default function RichTextEditor({
  value = "",
  onChange,
  onBlur,
  label,
  required = false,
  error,
  hint,
  placeholder = "Start typing…",
  maxLength,
  disabled = false,
  minHeight = "10rem",
  className = "",
}) {
  const editorId = useId();

  const editor = useEditor({
    extensions: buildExtensions(placeholder),
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        // `rich-text` carries the shared prose styles (index.css) so what is
        // typed here and what RichTextView renders later look identical.
        class: "rich-text focus:outline-none",
        style: `min-height:${minHeight}`,
        "aria-labelledby": label ? `${editorId}-label` : undefined,
      },
    },
    onUpdate: ({ editor: instance }) => {
      // An emptied editor serialises to "<p></p>", which is truthy and would
      // sail past a `required` check. Normalising it to "" here means the Zod
      // rule and the server agree with what the user sees: nothing typed.
      onChange?.(instance.isEmpty ? "" : instance.getHTML());
    },
    onBlur: () => onBlur?.(),
  });

  // Re-sync when the value is replaced from outside — a form reset after a
  // successful submit, or an edit form loading its record. Guarded on
  // inequality so this never fires on the editor's own keystrokes, which would
  // reset the cursor to the start of the document on every character.
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previous = editor.getAttributes("link").href ?? "";
    // An inline link popover is a bigger component than this whole editor,
    // and nothing else in the app needs one yet. prompt() is the honest
    // placeholder — it works with the keyboard and does not pretend to be
    // more than it is.
    const input = window.prompt("Link URL", previous);
    if (input === null) return; // cancelled — leave the existing link alone

    const url = input.trim();
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // A bare "af-chittagong.org" is what people actually type; without a
    // scheme the browser resolves it as a path on this app's own origin.
    const href = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }, [editor]);

  if (!editor) return null;

  // Counted with the same projection the form's Zod rule and the server both
  // use — deliberately NOT TipTap's CharacterCount extension. That counts
  // ProseMirror's text size, which charges nothing for a paragraph break,
  // while the validators count the newline the break becomes. The gap grows
  // with every paragraph, so a long description could sit at "1,994 / 2,000"
  // on screen and still be rejected by the API. One counter, one rule.
  const characters = htmlToPlainText(value).length;
  const overLimit = maxLength ? characters > maxLength : false;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label
          id={`${editorId}-label`}
          className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-white transition",
          "focus-within:ring-4",
          error || overLimit
            ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-100"
            : "border-slate-300 focus-within:border-slate-800 focus-within:ring-slate-100",
          disabled && "bg-slate-100",
        )}>
        {/* ── Toolbar ── */}
        <div
          role="toolbar"
          aria-label="Text formatting"
          className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/70 px-2 py-1.5">
          <ToolbarButton
            icon={Bold}
            label="Bold"
            disabled={disabled}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            icon={Italic}
            label="Italic"
            disabled={disabled}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            icon={UnderlineIcon}
            label="Underline"
            disabled={disabled}
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <ToolbarButton
            icon={Strikethrough}
            label="Strikethrough"
            disabled={disabled}
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />

          <Divider />

          <ToolbarButton
            icon={Heading2}
            label="Heading"
            disabled={disabled}
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            icon={Heading3}
            label="Subheading"
            disabled={disabled}
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          />

          <Divider />

          <ToolbarButton
            icon={List}
            label="Bullet list"
            disabled={disabled}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Numbered list"
            disabled={disabled}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            icon={Quote}
            label="Quote"
            disabled={disabled}
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />

          <Divider />

          <ToolbarButton
            icon={Link2}
            label="Add link"
            disabled={disabled}
            active={editor.isActive("link")}
            onClick={setLink}
          />
          <ToolbarButton
            icon={Link2Off}
            label="Remove link"
            disabled={disabled || !editor.isActive("link")}
            onClick={() => editor.chain().focus().unsetLink().run()}
          />
          <ToolbarButton
            icon={RemoveFormatting}
            label="Clear formatting"
            disabled={disabled}
            onClick={() =>
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }
          />

          {/* Pushed right: undo/redo are recovery, not composition. */}
          <span className="ml-auto flex items-center gap-0.5">
            <ToolbarButton
              icon={Undo2}
              label="Undo"
              disabled={disabled || !editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
            />
            <ToolbarButton
              icon={Redo2}
              label="Redo"
              disabled={disabled || !editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
            />
          </span>
        </div>

        {/* ── Surface ── */}
        <EditorContent
          editor={editor}
          className="max-h-96 overflow-y-auto px-4 py-3 text-sm text-slate-900"
        />
      </div>

      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
        </div>

        {maxLength && (
          <p
            className={cn(
              "shrink-0 text-xs tabular-nums",
              overLimit ? "font-semibold text-red-600" : "text-slate-400",
            )}>
            {characters.toLocaleString()} / {maxLength.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
