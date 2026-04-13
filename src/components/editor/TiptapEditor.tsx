"use client";

import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Underline as UnderlineIcon,
} from "lucide-react";
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
          <Bold size={16} strokeWidth={1.75} aria-hidden="true" />
        </TbButton>
        <TbButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          ariaLabel="Italic"
        >
          <Italic size={16} strokeWidth={1.75} aria-hidden="true" />
        </TbButton>
        <TbButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          ariaLabel="Underline"
        >
          <UnderlineIcon size={16} strokeWidth={1.75} aria-hidden="true" />
        </TbButton>

        <TbDivider />

        {/* Group 2: block quote */}
        <TbButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          ariaLabel="Quote"
        >
          <Quote size={16} strokeWidth={1.75} aria-hidden="true" />
        </TbButton>

        <TbDivider />

        {/* Group 3: lists */}
        <TbButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          ariaLabel="Bulleted list"
        >
          <List size={16} strokeWidth={1.75} aria-hidden="true" />
        </TbButton>
        <TbButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          ariaLabel="Numbered list"
        >
          <ListOrdered size={16} strokeWidth={1.75} aria-hidden="true" />
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
