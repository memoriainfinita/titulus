// Pure helpers for the rich text model (lines -> styled runs).
// The model lives in types.ts; TipTap is translated at the editor boundary only.

import { CreditItem, Rich, RichLine } from "./types"

// Plain text -> one unstyled run per line. Used by addItem, the demo and CSV import.
export function plainToRich(text: string): Rich {
  return text.split("\n").map((line) => [{ text: line }])
}

// Derived plain text: lines joined with \n, runs concatenated.
export function richToPlain(rich: Rich): string {
  return rich.map((line) => line.map((r) => r.text).join("")).join("\n")
}

// First nChars of the flattened text, preserving run styles. The newline
// between lines counts as one typed character (typewriter).
export function sliceRuns(rich: Rich, nChars: number): Rich {
  const out: Rich = []
  let remaining = Math.max(0, nChars)
  for (let li = 0; li < rich.length; li++) {
    if (li > 0) {
      if (remaining <= 0) break
      remaining -= 1 // the newline before this line
    }
    const line: RichLine = []
    for (const run of rich[li]) {
      if (remaining <= 0) break
      const take = run.text.slice(0, remaining)
      remaining -= take.length
      if (take) line.push({ ...run, text: take })
    }
    out.push(line)
  }
  return out.length > 0 ? out : [[]]
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x)
}

// Guards imported/persisted rich payloads: corrupt shapes reject the file
// instead of crashing the render (same policy as isValidImportedItems).
export function isValidRich(x: unknown): x is Rich {
  if (!Array.isArray(x)) return false
  return x.every(
    (line) =>
      Array.isArray(line) &&
      line.every(
        (run) =>
          isPlainObject(run) &&
          typeof run.text === "string" &&
          (run.style === undefined || isPlainObject(run.style)),
      ),
  )
}

// True when any run of any item uses the CSS family. Blocks font deletion.
export function fontInUseByItems(items: CreditItem[], family: string): boolean {
  return items.some((item) =>
    (item.rich ?? []).some((line) => line.some((run) => run.style?.fontFamily === family)),
  )
}
