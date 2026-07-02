import * as React from "react"
import { Rich, RichLine, RichStyle } from "@/lib/credit/types"

// CSS for a run: only the overridden properties; everything else inherits
// from the wrapper (which carries the resolved global/base text style).
function runCss(style: RichStyle | undefined, baseWeight: number): React.CSSProperties | undefined {
  if (!style) return undefined
  const css: React.CSSProperties = {}
  if (style.fontFamily) css.fontFamily = style.fontFamily
  if (typeof style.fontSize === "number" && style.fontSize > 0) css.fontSize = `${style.fontSize}px`
  if (style.bold) css.fontWeight = Math.max(700, baseWeight)
  if (style.italic) css.fontStyle = "italic"
  if (style.color) css.color = style.color
  return css
}

// One line of runs. Empty lines render an nbsp to keep their height.
export function LineSpans({ line, baseWeight }: { line: RichLine; baseWeight: number }) {
  const empty = line.length === 0 || line.every((r) => !r.text)
  if (empty) return <>&nbsp;</>
  return (
    <>
      {line.map((run, i) => (
        <span key={i} style={runCss(run.style, baseWeight)}>
          {run.text}
        </span>
      ))}
    </>
  )
}

// Whole rich block: one div per line.
export function RichText({ rich, baseWeight }: { rich: Rich; baseWeight: number }) {
  return (
    <>
      {rich.map((line, i) => (
        <div key={i}>
          <LineSpans line={line} baseWeight={baseWeight} />
        </div>
      ))}
    </>
  )
}
