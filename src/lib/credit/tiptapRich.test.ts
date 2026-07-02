import { describe, it, expect } from "vitest"
import { tiptapToRich, richToTiptap } from "./tiptapRich"
import { Rich } from "./types"

const doc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hola " },
        {
          type: "text",
          text: "mundo",
          marks: [
            { type: "bold" },
            { type: "italic" },
            { type: "textStyle", attrs: { fontFamily: "'Lobster', display", fontSize: "42px", color: "#ff0000" } },
          ],
        },
      ],
    },
    { type: "paragraph" }, // empty line
  ],
}

describe("tiptapToRich", () => {
  it("maps paragraphs to lines and marks to run styles", () => {
    expect(tiptapToRich(doc)).toEqual([
      [
        { text: "Hola " },
        { text: "mundo", style: { bold: true, italic: true, fontFamily: "'Lobster', display", fontSize: 42, color: "#ff0000" } },
      ],
      [],
    ])
  })

  it("ignores unknown marks and missing attrs", () => {
    const d = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "underline" }] }] }],
    }
    expect(tiptapToRich(d)).toEqual([[{ text: "x" }]])
  })

  it("empty doc becomes a single empty line", () => {
    expect(tiptapToRich({ type: "doc" })).toEqual([[]])
  })
})

describe("richToTiptap", () => {
  it("round-trips a styled rich document", () => {
    const rich: Rich = [
      [{ text: "A" }, { text: "B", style: { bold: true, fontSize: 20 } }],
      [],
      [{ text: "C", style: { italic: true, color: "#00ff00" } }],
    ]
    expect(tiptapToRich(richToTiptap(rich))).toEqual(rich)
  })

  it("emits fontSize as a px string for TextStyle", () => {
    const doc = richToTiptap([[{ text: "x", style: { fontSize: 36 } }]])
    const mark = doc.content?.[0].content?.[0].marks?.find((m) => m.type === "textStyle")
    expect(mark?.attrs?.fontSize).toBe("36px")
  })
})
