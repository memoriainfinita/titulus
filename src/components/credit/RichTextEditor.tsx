"use client"

import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import Document from "@tiptap/extension-document"
import Paragraph from "@tiptap/extension-paragraph"
import Text from "@tiptap/extension-text"
import Bold from "@tiptap/extension-bold"
import Italic from "@tiptap/extension-italic"
import { TextStyleKit } from "@tiptap/extension-text-style"
import { UndoRedo } from "@tiptap/extensions"
import { Bold as BoldIcon, Italic as ItalicIcon, RemoveFormatting } from "lucide-react"
import { Rich } from "@/lib/credit/types"
import { richToTiptap, tiptapToRich, TiptapDoc } from "@/lib/credit/tiptapRich"
import { useCreditStore } from "@/lib/credit/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function RichTextEditor({
  itemId,
  rich,
  onChange,
}: {
  itemId: string
  rich: Rich
  onChange: (rich: Rich) => void
}) {
  const fonts = useCreditStore((s) => s.fonts)
  // Track selection-dependent toolbar state via a render tick.
  const [, setTick] = React.useState(0)

  const editor = useEditor({
    immediatelyRender: false, // SSR-safe (Next.js)
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      TextStyleKit.configure({ backgroundColor: false, lineHeight: false }),
      UndoRedo,
    ],
    content: richToTiptap(rich) as object,
    editorProps: {
      attributes: {
        class: "min-h-20 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none",
      },
      // Paste always as plain text: external HTML formatting never enters the model.
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? ""
        if (!text) return false
        view.dispatch(view.state.tr.insertText(text))
        return true
      },
    },
    onUpdate: ({ editor }) => {
      onChange(tiptapToRich(editor.getJSON() as TiptapDoc))
    },
    onSelectionUpdate: () => setTick((t) => t + 1),
    onTransaction: () => setTick((t) => t + 1),
  })

  // Selecting another item swaps the document. setContent only when the id changes,
  // NOT on every rich change (that would fight the user's typing).
  const lastItemIdRef = React.useRef(itemId)
  React.useEffect(() => {
    if (!editor || lastItemIdRef.current === itemId) return
    lastItemIdRef.current = itemId
    editor.commands.setContent(richToTiptap(rich) as object)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, editor])

  if (!editor) return null

  const attrs = editor.getAttributes("textStyle") as { fontFamily?: string; fontSize?: string; color?: string }
  const currentFamily = attrs.fontFamily ?? "__global"
  const currentSize = attrs.fontSize ? String(parseFloat(attrs.fontSize)) : ""
  const currentColor = attrs.color ?? ""

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 flex-wrap">
        <Select
          value={currentFamily}
          onValueChange={(v) => {
            if (v === "__global") editor.chain().focus().unsetFontFamily().run()
            else editor.chain().focus().setFontFamily(v).run()
          }}
        >
          <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="Fuente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__global">(global)</SelectItem>
            {fonts.map((f) => (
              <SelectItem key={f.id} value={f.family}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number" min={1} step={1}
          value={currentSize}
          placeholder="px"
          onChange={(e) => {
            const raw = e.target.value
            if (raw === "") { editor.chain().unsetFontSize().run(); return }
            const n = Number(raw)
            if (Number.isNaN(n) || n <= 0) return
            editor.chain().setFontSize(`${n}px`).run()
          }}
          className="h-7 w-16 text-xs"
        />
        <Button
          size="sm"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          className="h-7 w-7 p-0"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          className="h-7 w-7 p-0"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon className="h-3.5 w-3.5" />
        </Button>
        <div className="relative w-7 h-7 rounded-md border overflow-hidden shrink-0">
          <input
            type="color"
            value={currentColor || "#ffffff"}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          />
          <div className="w-full h-full" style={{ backgroundColor: currentColor || "transparent" }} />
        </div>
        <Button
          size="sm" variant="ghost" className="h-7 w-7 p-0"
          title="Quitar formato de la selección"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
