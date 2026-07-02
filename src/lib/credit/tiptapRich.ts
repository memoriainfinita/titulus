// Pure converters between TipTap's JSON document and our Rich model.
// TipTap only exists inside the inspector editor; everything else uses Rich.

import { Rich, RichLine, RichStyle } from "./types"

export interface TiptapMark {
  type: string
  attrs?: { fontFamily?: string; fontSize?: string; color?: string }
}

export interface TiptapNode {
  type: string
  text?: string
  marks?: TiptapMark[]
  content?: TiptapNode[]
}

export type TiptapDoc = TiptapNode

function marksToStyle(marks: TiptapMark[] | undefined): RichStyle | undefined {
  if (!marks || marks.length === 0) return undefined
  const style: RichStyle = {}
  for (const mark of marks) {
    if (mark.type === "bold") style.bold = true
    if (mark.type === "italic") style.italic = true
    if (mark.type === "textStyle" && mark.attrs) {
      if (mark.attrs.fontFamily) style.fontFamily = mark.attrs.fontFamily
      if (mark.attrs.color) style.color = mark.attrs.color
      if (mark.attrs.fontSize) {
        const px = parseFloat(mark.attrs.fontSize)
        if (!Number.isNaN(px) && px > 0) style.fontSize = px
      }
    }
  }
  return Object.keys(style).length > 0 ? style : undefined
}

export function tiptapToRich(doc: TiptapDoc): Rich {
  const paragraphs = doc.content ?? []
  if (paragraphs.length === 0) return [[]]
  return paragraphs.map((p) => {
    const line: RichLine = []
    for (const node of p.content ?? []) {
      if (node.type !== "text" || typeof node.text !== "string") continue
      const style = marksToStyle(node.marks)
      line.push(style ? { text: node.text, style } : { text: node.text })
    }
    return line
  })
}

function styleToMarks(style: RichStyle | undefined): TiptapMark[] | undefined {
  if (!style) return undefined
  const marks: TiptapMark[] = []
  if (style.bold) marks.push({ type: "bold" })
  if (style.italic) marks.push({ type: "italic" })
  const attrs: TiptapMark["attrs"] = {}
  if (style.fontFamily) attrs.fontFamily = style.fontFamily
  if (style.color) attrs.color = style.color
  if (typeof style.fontSize === "number" && style.fontSize > 0) attrs.fontSize = `${style.fontSize}px`
  if (Object.keys(attrs).length > 0) marks.push({ type: "textStyle", attrs })
  return marks.length > 0 ? marks : undefined
}

export function richToTiptap(rich: Rich): TiptapDoc {
  return {
    type: "doc",
    content: rich.map((line) => {
      const content = line
        .filter((run) => run.text)
        .map((run) => {
          const marks = styleToMarks(run.style)
          return marks ? { type: "text", text: run.text, marks } : { type: "text", text: run.text }
        })
      return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" }
    }),
  }
}
