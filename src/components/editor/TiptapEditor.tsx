"use client";

import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

interface Props {
  initialContent: string;
  placeholder: string;
  onUpdate: (html: string) => void;
  onBlur?: () => void;
  editable?: boolean;
}

export function TiptapEditor({
  initialContent,
  placeholder,
  onUpdate,
  onBlur,
  editable = true,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-ink-light/60 before:float-left before:pointer-events-none before:h-0",
      }),
    ],
    content: initialContent,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap-editor min-h-[320px] outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    onBlur: () => {
      if (onBlur) onBlur();
    },
  });

  // Keep an up-to-date ref of the editor so the parent can access it
  // through the exported `useEditorHandle` if needed later.
  const editorRef = useRef<Editor | null>(null);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-[320px] text-[17px] leading-[1.75] text-ink-light">
        {placeholder}
      </div>
    );
  }

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="mb-5 pb-3 border-b border-navy/[0.08]">
      <div className="inline-flex items-center gap-0.5 rounded-lg bg-[#f5f1ea] border border-navy/[0.06] p-1">
        {/* Group 1: text formatting */}
        <TbButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          ariaLabel="Bold"
        >
          <span className="font-bold text-[15px]">B</span>
        </TbButton>
        <TbButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          ariaLabel="Italic"
        >
          <span className="italic text-[15px] font-serif">I</span>
        </TbButton>
        <TbButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          ariaLabel="Underline"
        >
          <span className="underline text-[15px]">U</span>
        </TbButton>

        <TbDivider />

        {/* Group 2: block quote */}
        <TbButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          ariaLabel="Quote"
        >
          <QuoteIcon />
        </TbButton>

        <TbDivider />

        {/* Group 3: lists */}
        <TbButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          ariaLabel="Bulleted list"
        >
          <BulletListIcon />
        </TbButton>
        <TbButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          ariaLabel="Numbered list"
        >
          <NumberedListIcon />
        </TbButton>
      </div>
    </div>
  );
}

function TbButton({
  active,
  onClick,
  ariaLabel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
        active
          ? "bg-white text-navy border border-navy/15 shadow-[0_1px_2px_rgba(15,31,61,0.06)]"
          : "text-ink-mid border border-transparent hover:bg-white hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

function TbDivider() {
  return (
    <div
      aria-hidden="true"
      className="w-px h-5 bg-navy/10 mx-1 shrink-0"
    />
  );
}

function QuoteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 4h3.2v3.2H4.6c0 1 .4 1.7 1.6 1.9v1.3C4 10.3 3 9 3 7V4Zm6.8 0H13v3.2h-1.6c0 1 .4 1.7 1.6 1.9v1.3c-2.2-.1-3.2-1.4-3.2-3.4V4Z" />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="3" cy="4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="3" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <line x1="6.5" y1="4" x2="14" y2="4" />
      <line x1="6.5" y1="8" x2="14" y2="8" />
      <line x1="6.5" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function NumberedListIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="6.5" y1="4" x2="14" y2="4" />
      <line x1="6.5" y1="8" x2="14" y2="8" />
      <line x1="6.5" y1="12" x2="14" y2="12" />
      <text
        x="1.2"
        y="5.4"
        fontSize="3.8"
        fontWeight="700"
        stroke="none"
        fill="currentColor"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        1
      </text>
      <text
        x="1.2"
        y="9.4"
        fontSize="3.8"
        fontWeight="700"
        stroke="none"
        fill="currentColor"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        2
      </text>
      <text
        x="1.2"
        y="13.4"
        fontSize="3.8"
        fontWeight="700"
        stroke="none"
        fill="currentColor"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        3
      </text>
    </svg>
  );
}

export function getReadingStats(html: string) {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / 200);
  return {
    wordCount: words,
    readingTime:
      words === 0
        ? "0 words"
        : minutes < 1
          ? "< 1 min read"
          : `~${minutes} min read`,
  };
}
