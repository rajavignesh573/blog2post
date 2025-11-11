"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class:
            "font-medium text-sky-600 underline underline-offset-2 hover:text-sky-700",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Start editing…",
      }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editable: !readOnly,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white/60 p-3 shadow-sm backdrop-blur-sm transition focus-within:border-sky-400 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="prose prose-sm max-w-none text-zinc-800 opacity-50 dark:prose-invert dark:text-zinc-100">
          Loading editor…
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white/60 p-3 shadow-sm backdrop-blur-sm transition focus-within:border-sky-400 dark:border-zinc-700 dark:bg-zinc-900">
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none text-zinc-800 focus:outline-none dark:prose-invert dark:text-zinc-100"
      />
    </div>
  );
}

