# Rich Text Item Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five typed text items with a single rich-text item whose fragments (runs) carry their own font, size, bold, italic and color, edited with TipTap in the inspector.

**Architecture:** The document model is ours (`Rich` = lines → runs), stored on the item; TipTap only lives inside the inspector editor and is translated at the boundary by pure converters. Scenes render runs through a pure `RichText` component; typewriter and line-stagger operate on runs via pure helpers. Legacy item types are removed at the end, after the rich path is fully working (every task compiles green).

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Zustand / Vitest 4 + happy-dom / TipTap v3 (`@tiptap/react`, `@tiptap/extension-text-style` TextStyleKit).

**Spec:** `docs/superpowers/specs/2026-07-03-rich-text-item-design.md`

## Global Constraints

- Windows + PowerShell; package manager `pnpm` (NOT npm/bun).
- TDD per task: failing test first, then minimal code. Suite runs with `pnpm test:run`; a single file with `pnpm exec vitest run <path>`.
- After each task: `pnpm exec tsc --noEmit` clean, `pnpm exec eslint .` clean, all tests green, then commit (message in English, one commit per task).
- No migration/legacy support: app is in test, user hard-resets localStorage. Old item types are simply removed (Task 8).
- `bold` is boolean → weight 700 over global `config.fontWeight`. No numeric weight per fragment.
- Single global `fontSize` (default 36) replaces the five per-type sizes.

---

### Task 1: Rich model types and pure helpers

**Files:**
- Modify: `src/lib/credit/types.ts` (add Rich types + `rich?: Rich` on `CreditItem`)
- Create: `src/lib/credit/rich.ts`
- Create: `src/lib/credit/rich.test.ts`

**Interfaces:**
- Produces: types `RichStyle { fontFamily?: string; fontSize?: number; bold?: boolean; italic?: boolean; color?: string }`, `RichRun { text: string; style?: RichStyle }`, `RichLine = RichRun[]`, `Rich = RichLine[]` (all exported from `types.ts`); functions `plainToRich(text: string): Rich`, `richToPlain(rich: Rich): string`, `sliceRuns(rich: Rich, nChars: number): Rich`, `isValidRich(x: unknown): x is Rich`, `fontInUseByItems(items: CreditItem[], family: string): boolean` (from `rich.ts`).

- [ ] **Step 1: Write the failing tests** — create `src/lib/credit/rich.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { plainToRich, richToPlain, sliceRuns, isValidRich, fontInUseByItems } from "./rich"
import { CreditItem, Rich } from "./types"

describe("plainToRich / richToPlain", () => {
  it("splits plain text into one unstyled run per line", () => {
    expect(plainToRich("Hola\nMundo")).toEqual([[{ text: "Hola" }], [{ text: "Mundo" }]])
  })

  it("empty text becomes a single line with an empty run", () => {
    expect(plainToRich("")).toEqual([[{ text: "" }]])
  })

  it("round-trips through richToPlain", () => {
    expect(richToPlain(plainToRich("A\nB\nC"))).toBe("A\nB\nC")
  })

  it("richToPlain joins runs within a line without separators", () => {
    const rich: Rich = [[{ text: "Ho" }, { text: "la", style: { bold: true } }], [{ text: "B" }]]
    expect(richToPlain(rich)).toBe("Hola\nB")
  })
})

describe("sliceRuns", () => {
  const rich: Rich = [
    [{ text: "ab" }, { text: "cd", style: { bold: true } }],
    [{ text: "ef" }],
  ]

  it("cuts mid-run preserving the run style", () => {
    expect(sliceRuns(rich, 3)).toEqual([[{ text: "ab" }, { text: "c", style: { bold: true } }]])
  })

  it("counts the newline between lines as one typed char", () => {
    // "abcd" = 4 chars, newline = 5th, "e" = 6th
    expect(sliceRuns(rich, 5)).toEqual([[{ text: "ab" }, { text: "cd", style: { bold: true } }], []])
    expect(sliceRuns(rich, 6)).toEqual([[{ text: "ab" }, { text: "cd", style: { bold: true } }], [{ text: "e" }]])
  })

  it("returns everything when nChars covers the full text", () => {
    expect(sliceRuns(rich, 99)).toEqual(rich)
  })

  it("returns one empty line for nChars 0", () => {
    expect(sliceRuns(rich, 0)).toEqual([[]])
  })
})

describe("isValidRich", () => {
  it("accepts lines of runs with optional style object", () => {
    expect(isValidRich([[{ text: "a" }], [{ text: "b", style: { bold: true } }]])).toBe(true)
    expect(isValidRich([[]])).toBe(true)
  })

  it("rejects non-arrays, runs without string text, and non-object styles", () => {
    expect(isValidRich("x")).toBe(false)
    expect(isValidRich([{ text: "a" }])).toBe(false) // line must be an array
    expect(isValidRich([[{ text: 1 }]])).toBe(false)
    expect(isValidRich([[{ text: "a", style: "bold" }]])).toBe(false)
    expect(isValidRich([[null]])).toBe(false)
  })
})

describe("fontInUseByItems", () => {
  const items: CreditItem[] = [
    { id: "a", type: "name", text: "x", rich: [[{ text: "x", style: { fontFamily: "'Lobster', display" } }]] },
    { id: "b", type: "name", text: "y" },
  ]

  it("finds a family used by any run", () => {
    expect(fontInUseByItems(items, "'Lobster', display")).toBe(true)
  })

  it("returns false for unused families and items without rich", () => {
    expect(fontInUseByItems(items, "'Inter', sans-serif")).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/credit/rich.test.ts`
Expected: FAIL — `./rich` module not found.

- [ ] **Step 3: Add the types to `types.ts`** — insert after the `DividerStyle` line (`export type DividerStyle = ...`):

```ts
// Rich text model: an item's text as lines of styled runs.
// A run without style inherits the global config (font, size, color).
export interface RichStyle {
  fontFamily?: string
  fontSize?: number // px
  bold?: boolean // renders weight 700 over config.fontWeight
  italic?: boolean
  color?: string
}

export interface RichRun {
  text: string
  style?: RichStyle
}

export type RichLine = RichRun[]
export type Rich = RichLine[]
```

And inside `CreditItem`, after the `text: string` field:

```ts
  // Rich text (lines -> styled runs). When present, scenes render it instead of
  // `text`; `text` is kept in sync (derived) for durations, list rows, typewriter length.
  rich?: Rich
```

- [ ] **Step 4: Implement `src/lib/credit/rich.ts`**:

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/credit/rich.test.ts` → PASS.
Run: `pnpm exec tsc --noEmit && pnpm exec eslint .` → clean.
Run: `pnpm test:run` → all green (196 + 13 new).

- [ ] **Step 6: Commit**

```powershell
git add src/lib/credit/types.ts src/lib/credit/rich.ts src/lib/credit/rich.test.ts
git commit -m "feat: rich text model types and pure helpers"
```

---

### Task 2: TipTap dependencies and boundary converters

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Create: `src/lib/credit/tiptapRich.ts`
- Create: `src/lib/credit/tiptapRich.test.ts`

**Interfaces:**
- Consumes: `Rich`, `RichStyle` from `types.ts` (Task 1).
- Produces: `tiptapToRich(doc: TiptapDoc): Rich`, `richToTiptap(rich: Rich): TiptapDoc`, exported type `TiptapDoc` (minimal structural type of TipTap's `editor.getJSON()`).

- [ ] **Step 1: Install TipTap v3**

```powershell
pnpm add @tiptap/react @tiptap/core @tiptap/pm @tiptap/extension-document @tiptap/extension-paragraph @tiptap/extension-text @tiptap/extension-bold @tiptap/extension-italic @tiptap/extension-text-style @tiptap/extensions
```

Expected: lockfile updated, no build scripts prompt. Verify: `pnpm exec tsc --noEmit` still clean.

- [ ] **Step 2: Write the failing tests** — create `src/lib/credit/tiptapRich.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/credit/tiptapRich.test.ts`
Expected: FAIL — `./tiptapRich` module not found.

- [ ] **Step 4: Implement `src/lib/credit/tiptapRich.ts`**:

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/credit/tiptapRich.test.ts` → PASS.
Run: `pnpm exec tsc --noEmit && pnpm exec eslint .` → clean. `pnpm test:run` → green.

- [ ] **Step 6: Commit**

```powershell
git add package.json pnpm-lock.yaml src/lib/credit/tiptapRich.ts src/lib/credit/tiptapRich.test.ts
git commit -m "feat: TipTap v3 deps and pure doc<->rich converters"
```

---

### Task 3: Additive `text` item type + derived-text sync in the store

**Files:**
- Modify: `src/lib/credit/types.ts` (add `"text"` to `CreditItemType`, labels, icons)
- Modify: `src/lib/credit/store.ts` (`addItem`, `updateItem`)
- Modify: `src/components/credit/CreditEditor.tsx` (`TYPE_ICONS`, `ADD_MENU_TYPES`)
- Modify: `src/lib/credit/store.test.ts`

**Interfaces:**
- Consumes: `plainToRich`, `richToPlain` (Task 1).
- Produces: item type `"text"`; store invariant: `updateItem(id, { rich })` also recomputes `item.text = richToPlain(rich)`; `addItem("text")` creates `{ text: "Nuevo texto", rich: plainToRich("Nuevo texto") }`.

- [ ] **Step 1: Write the failing tests** — in `src/lib/credit/store.test.ts`, add inside the existing store describe (same level as other `it` blocks; the file resets the store in `beforeEach`):

```ts
  it("addItem('text') creates a rich item with placeholder text and rich in sync", () => {
    useCreditStore.setState({ items: [] })
    useCreditStore.getState().addItem("text")
    const it0 = useCreditStore.getState().items[0]
    expect(it0.type).toBe("text")
    expect(it0.text).toBe("Nuevo texto")
    expect(it0.rich).toEqual([[{ text: "Nuevo texto" }]])
  })

  it("updateItem with a rich patch recomputes the derived plain text", () => {
    useCreditStore.setState({ items: [{ id: "r", type: "text", text: "", rich: [[{ text: "" }]] }] })
    useCreditStore.getState().updateItem("r", {
      rich: [[{ text: "Hola " }, { text: "mundo", style: { bold: true } }], [{ text: "adiós" }]],
    })
    expect(useCreditStore.getState().items[0].text).toBe("Hola mundo\nadiós")
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/credit/store.test.ts`
Expected: FAIL — `"text"` is not a valid `CreditItemType` (type error) / placeholder empty.

- [ ] **Step 3: Implement**

In `types.ts`, add `"text"` as the FIRST member of `CreditItemType`:

```ts
export type CreditItemType =
  | "text"
  | "title"
  ...
```

Add to `CREDIT_TYPE_LABELS`: `text: "Texto",` and to `CREDIT_TYPE_ICONS`: `text: "Type",` (first entries).

In `store.ts`:
- Import `plainToRich, richToPlain` from `./rich`.
- In `addItem`, replace the `placeholder` ternary chain result for the new type and attach rich. Replace the `const newItem` line with:

```ts
        const resolved = text ?? (type === "text" ? "Nuevo texto" : placeholder)
        const newItem: CreditItem =
          type === "text"
            ? { id: uuid(), type, text: resolved, rich: plainToRich(resolved) }
            : { id: uuid(), type, text: resolved }
```

- In `updateItem`, keep derived text in sync:

```ts
      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item
            const next = { ...item, ...patch }
            // rich is the source of truth for text items: text is derived.
            if (patch.rich) next.text = richToPlain(patch.rich)
            return next
          }),
        })),
```

In `CreditEditor.tsx`:
- The file already imports `Type as TypeIcon` from lucide (used by the empty state). Reuse it: add `text: TypeIcon,` as the first entry of `TYPE_ICONS` and `"text"` as the first entry of `ADD_MENU_TYPES`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/credit/store.test.ts` → PASS.
Run: `pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm test:run` → clean/green.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/credit/types.ts src/lib/credit/store.ts src/components/credit/CreditEditor.tsx src/lib/credit/store.test.ts
git commit -m "feat: additive rich text item type with derived plain text"
```

---

### Task 4: `RichText` render component wired into both scenes

**Files:**
- Create: `src/components/credit/RichText.tsx`
- Modify: `src/components/credit/ScrollCredits.tsx` (`CreditLine` text branch)
- Modify: `src/components/credit/AppearingCredits.tsx` (`AppearItem` text)

**Interfaces:**
- Consumes: `Rich`, `RichLine`, `RichStyle` (Task 1), `plainToRich` (Task 1), `config.fontWeight`.
- Produces: `RichText({ rich, baseWeight }: { rich: Rich; baseWeight: number })` and `LineSpans({ line, baseWeight }: { line: RichLine; baseWeight: number })` — pure presentational, no hooks.

- [ ] **Step 1: Implement `src/components/credit/RichText.tsx`** (presentational; covered by the pure-model tests plus scene usage — no DOM unit tests, per project convention):

```tsx
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
  if (empty) return <>{" "}</>
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
```

- [ ] **Step 2: Wire into `ScrollCredits.tsx`** — in `CreditLine`, replace the final text branch content `{item.text || " "}` with:

```tsx
      {item.rich ? (
        <RichText rich={item.rich} baseWeight={fontWeight} />
      ) : (
        item.text || " "
      )}
```

`fontWeight` is not in scope in `CreditLine` (it lives inside `getItemStyle`), so add `const fontWeight = resolveFontWeight(item, config)` right above the text-branch `return` (the `resolveFontWeight` import already exists in the file).

Add the import: `import { RichText } from "./RichText"`.

- [ ] **Step 3: Wire into `AppearingCredits.tsx`** — in `AppearItem`, it already computes `const fontWeight = resolveFontWeight(item, config)`. Replace `{item.text || " "}` with:

```tsx
      {item.rich ? (
        <RichText rich={item.rich} baseWeight={fontWeight} />
      ) : (
        item.text || " "
      )}
```

Add the import: `import { RichText } from "./RichText"`.

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm test:run` → clean/green.
Manual smoke: `pnpm dev` → add a "Texto" item from the "+" menu → it renders in both modes (plain runs). Stop the dev server afterwards (kill the process holding :3000).

- [ ] **Step 5: Commit**

```powershell
git add src/components/credit/RichText.tsx src/components/credit/ScrollCredits.tsx src/components/credit/AppearingCredits.tsx
git commit -m "feat: render rich runs in scroll and appearing scenes"
```

---

### Task 5: Typewriter and line-stagger over runs

**Files:**
- Modify: `src/components/credit/AppearingCredits.tsx` (`TypewriterItem`, `LinesItem`, parent manual state)

**Interfaces:**
- Consumes: `sliceRuns`, `plainToRich` (Task 1), `LineSpans` (Task 4), `typedCharsAt` (existing).
- Produces: `TypewriterItem` props change: `manualTypedText: string` → `manualTypedChars: number`; live typing keeps a char counter. `LinesItem` iterates `Rich` lines instead of `text.split("\n")`.

- [ ] **Step 1: `TypewriterItem` types runs** — replace its state/render logic:

```tsx
  const rich = item.rich ?? plainToRich(item.text || "")
  const text = item.text || ""
  const [nTyped, setNTyped] = React.useState(0)
  React.useEffect(() => {
    if (!live || !isPlaying) return
    const id = setInterval(() => {
      setNTyped((n) => {
        if (n + 1 >= text.length) clearInterval(id)
        return Math.min(text.length, n + 1)
      })
    }, speed)
    return () => clearInterval(id)
  }, [live, isPlaying, text, speed])

  const shownRich = sliceRuns(rich, live ? nTyped : manualTypedChars)
```

Prop rename: `manualTypedText: string` → `manualTypedChars: number` (interface + destructuring). In the JSX, replace `{shown}` with:

```tsx
      <RichText rich={shownRich} baseWeight={resolveFontWeight(item, config)} />
```

Keep the existing live/manual cursor branch unchanged, after the `RichText`. `RichText` renders one block div per line, so on multiline items the cursor trails below the last line block — accepted behavior.

Imports to add at the top of `AppearingCredits.tsx`: `import { sliceRuns, plainToRich } from "@/lib/credit/rich"` and `import { RichText, LineSpans } from "./RichText"`.

- [ ] **Step 2: parent manual state** — in `AppearingCredits`:
- Rename state `manualTypedText`/`setManualTypedText` (string) → `manualTypedChars`/`setManualTypedChars` (number, init 0).
- In the manual-derive effect, replace the typewriter branch body:

```tsx
    if (foundItem && foundType === "typewriter") {
      const text = foundItem.text || ""
      setManualTypedChars(typedCharsAt(timeIntoItem, text.length, resolveTypewriterSpeed(foundItem, config)))
    } else {
      setManualTypedChars(0)
    }
```

- Reset effect: `setManualTypedText("")` → `setManualTypedChars(0)`.
- `TypewriterItem` call site: `manualTypedText={manualTypedText}` → `manualTypedChars={manualTypedChars}`.

- [ ] **Step 3: `LinesItem` over rich lines** — replace `const lines = (item.text || " ").split("\n")` with:

```tsx
  const richLines = item.rich ?? plainToRich(item.text || " ")
```

and in both map branches replace `{line || " "}` with `<LineSpans line={line} baseWeight={resolveFontWeight(item, config)} />`, mapping over `richLines` instead of `lines` (the manual branch keeps its `manualAppearStyle(...)` div, the live branch keeps its `motion.div`). `totalLines`/`countItemLines` are text-derived and stay unchanged.

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm test:run` → clean/green.
Manual smoke (`pnpm dev`, then kill :3000): a multi-line "Texto" item with line-stagger reveals per line; a typewriter item types run styles progressively; timeline scrub shows partial typing.

- [ ] **Step 5: Commit**

```powershell
git add src/components/credit/AppearingCredits.tsx
git commit -m "feat: typewriter and line stagger operate on rich runs"
```

---

### Task 6: TipTap editor with toolbar in the inspector

**Files:**
- Create: `src/components/credit/RichTextEditor.tsx`
- Modify: `src/components/credit/ItemInspector.tsx` (text branch uses the editor for `type === "text"`)

**Interfaces:**
- Consumes: `richToTiptap`, `tiptapToRich` (Task 2), `Rich` (Task 1), store `fonts`.
- Produces: `RichTextEditor({ itemId, rich, onChange }: { itemId: string; rich: Rich; onChange: (rich: Rich) => void })`.

- [ ] **Step 1: Implement `src/components/credit/RichTextEditor.tsx`**:

```tsx
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
            if (raw === "") { editor.chain().focus().unsetFontSize().run(); return }
            const n = Number(raw)
            if (Number.isNaN(n) || n <= 0) return
            editor.chain().focus().setFontSize(`${n}px`).run()
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
```

- [ ] **Step 2: Wire into `ItemInspector.tsx`** — at the TOP of the text-items return (the final `return` of `ItemInspector`), render the editor for the new type instead of Input/Textarea:

```tsx
      {item.type === "text" ? (
        <RichTextEditor
          itemId={item.id}
          rich={item.rich ?? plainToRich(item.text)}
          onChange={(rich) => updateItem(item.id, { rich })}
        />
      ) : item.type === "title" || item.type === "subtitle" ? (
        <Input ... unchanged ... />
      ) : (
        <Textarea ... unchanged ... />
      )}
```

Add the imports: `import { RichTextEditor } from "./RichTextEditor"` and `import { plainToRich } from "@/lib/credit/rich"`.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm test:run` → clean/green.
Manual smoke (`pnpm dev`, then kill :3000): select a "Texto" item → editor with toolbar appears; select a word → B/I/color/size/font apply and the preview updates live; Enter creates a new line; paste from a web page arrives unformatted; undo works (Ctrl+Z).

If `UndoRedo` fails to import from `@tiptap/extensions`, check `node_modules/@tiptap/extensions/package.json` exports — in some 3.x minors it is `import { UndoRedo } from "@tiptap/extensions/undo-redo"`.

- [ ] **Step 4: Commit**

```powershell
git add src/components/credit/RichTextEditor.tsx src/components/credit/ItemInspector.tsx
git commit -m "feat: TipTap rich text editor with formatting toolbar in inspector"
```

---

### Task 7: Font deletion guard + rich validation on import

**Files:**
- Modify: `src/components/credit/FontManager.tsx` (removeFont guard)
- Modify: `src/lib/credit/store.ts` (`isValidImportedItems` checks `rich`)
- Modify: `src/lib/credit/store.test.ts`

**Interfaces:**
- Consumes: `fontInUseByItems`, `isValidRich` (Task 1).

- [ ] **Step 1: Write the failing test** — in `store.test.ts` (project import/export describe):

```ts
  it("rejects a text item with corrupt rich payload", () => {
    const json = JSON.stringify({
      items: [{ id: "a", type: "text", text: "x", rich: [{ text: "not-a-line" }] }],
      config: {},
    })
    expect(useCreditStore.getState().importProject(json)).toBe(false)
  })

  it("accepts and round-trips a valid rich item", () => {
    useCreditStore.setState({
      items: [{ id: "a", type: "text", text: "Hola", rich: [[{ text: "Hola", style: { bold: true, fontSize: 20 } }]] }],
    })
    const json = useCreditStore.getState().exportProject()
    useCreditStore.setState({ items: [], config: { ...DEFAULT_CONFIG } })
    expect(useCreditStore.getState().importProject(json)).toBe(true)
    expect(useCreditStore.getState().items[0].rich).toEqual([[{ text: "Hola", style: { bold: true, fontSize: 20 } }]])
  })
```

- [ ] **Step 2: Run to verify the first fails** (`importProject` returns `true` today for corrupt rich).

Run: `pnpm exec vitest run src/lib/credit/store.test.ts` → 1 FAIL.

- [ ] **Step 3: Implement**

In `store.ts`, import `isValidRich` from `./rich` and extend the `every` predicate of `isValidImportedItems` with:

```ts
      typeof it.text === "string" &&
      (it.rich === undefined || isValidRich(it.rich)),
```

In `FontManager.tsx`:
- `const { fonts, addFont, removeFont, config, updateConfig } = useCreditStore()` → also destructure `items`.
- Import `fontInUseByItems` from `@/lib/credit/rich`.
- In the delete button `onClick`, after the active-font guard, add:

```tsx
                          if (fontInUseByItems(items, font.family)) {
                            toast.error("No puedes eliminarla: la usa algún fragmento de texto")
                            return
                          }
```

- [ ] **Step 4: Verify** — `pnpm exec vitest run src/lib/credit/store.test.ts` PASS; `pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm test:run` clean/green.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/credit/store.ts src/lib/credit/store.test.ts src/components/credit/FontManager.tsx
git commit -m "feat: validate rich on import and block deleting fonts used by runs"
```

---

### Task 8: Remove legacy item types and per-item absorbed overrides

The big mechanical sweep. Everything below happens in ONE task because the type change ripples; the suite gates it.

**Files:**
- Modify: `src/lib/credit/types.ts`
- Modify: `src/lib/credit/store.ts`
- Modify: `src/lib/credit/textStyle.ts`
- Modify: `src/components/credit/ItemInspector.tsx`
- Modify: `src/components/credit/CreditEditor.tsx`
- Modify: `src/components/credit/ConfigPanel.tsx`
- Modify: `src/lib/credit/store.test.ts`, `src/lib/credit/textStyle.test.ts`, `src/lib/credit/appearing.test.ts`, `src/lib/credit/rich.test.ts`, any other test using old types (grep `type: "title"|"subtitle"|"name"|"role"|"description"`)

**Interfaces:**
- Produces: `CreditItemType = "text" | "spacer" | "divider" | "image"`; `CreditConfig.fontSize: number` (default 36) replacing the five per-type sizes; `CreditItem` loses `bold`, `italic`, `fontSize`, `color`, `fontFamily`, `fontWeight`; store loses `getFontSize`, `getFontWeight`, `resolveFontWeight` (scenes use `config.fontWeight` directly); `resolveTextStyle` reads only config for font/size/color.

- [ ] **Step 1: Update the tests first** (RED by compile):
  - Global replace in ALL test files: `type: "title"`, `type: "subtitle"`, `type: "name"`, `type: "role"`, `type: "description"` → `type: "text"`.
  - `store.test.ts`: the `addItem` placeholder test asserts legacy strings ("Nombre Apellido", etc.) — rewrite it to `addItem("text")` inserting `text: "Nuevo texto"` with `rich: [[{ text: "Nuevo texto" }]]` (this may already be covered by the Task 3 test; if so, delete the legacy-placeholder test instead of rewriting it).
  - `store.test.ts`: delete tests covering removed per-item overrides (`preserves per-item text overrides...` fontSize/color/fontFamily assertions; `fontWeight` roundtrips) and any `getFontSize`/`getFontWeight`/`resolveFontWeight` describes; keep letterSpacing/lineHeight roundtrip assertions by moving them onto a `type: "text"` item if they live in a deleted test.
  - `textStyle.test.ts`: rewrite assertions — resolved `fontSize` comes from `config.fontSize`, `fontFamily` from `config.fontFamily`, `color` from `config.textColor`; per-item `letterSpacing`, `lineHeight`, `noWrap`, `textBoxWidth` overrides keep their existing tests.
  - Add to `store.test.ts` (config backfill):

```ts
  it("backfills the new single fontSize on import", () => {
    const json = JSON.stringify({ items: [{ id: "a", type: "text", text: "x" }], config: {} })
    expect(useCreditStore.getState().importProject(json)).toBe(true)
    expect(useCreditStore.getState().config.fontSize).toBe(36)
  })
```

Run: `pnpm exec tsc --noEmit` → FAILS (tests reference the world that doesn't exist yet, e.g. `config.fontSize`). That's the RED.

- [ ] **Step 2: `types.ts`**
  - `CreditItemType = "text" | "spacer" | "divider" | "image"`.
  - `CreditItem`: remove `bold?`, `italic?`, `fontSize?`, `color?`, `fontFamily?`, `fontWeight?` (keep `uppercase?`, `letterSpacing?`, `lineHeight?`, `noWrap?`, `textBoxWidth?`, and all non-text fields).
  - `CreditConfig`: remove `fontSizeTitle/Subtitle/Name/Role/Description`, add `fontSize: number` in Typography.
  - `DEFAULT_CONFIG`: remove the five sizes, add `fontSize: 36`.
  - `CREDIT_TYPE_LABELS` / `CREDIT_TYPE_ICONS`: only the 4 types.
  - `DEFAULT_ITEMS`: replace with a rich demo (each item `type: "text"`, `text` = derived plain, `rich` showing the feature). Use exactly:

```ts
export const DEFAULT_ITEMS: CreditItem[] = [
  { id: "demo-1", type: "text", text: "Mi Película Increíble", rich: [[{ text: "Mi Película Increíble", style: { fontSize: 72, bold: true } }]] },
  { id: "demo-2", type: "text", text: "Una historia de aventuras", rich: [[{ text: "Una historia de aventuras", style: { fontSize: 42, italic: true } }]] },
  { id: "demo-3", type: "spacer", text: "" },
  { id: "demo-4", type: "text", text: "Juan Pérez\nDirector", rich: [[{ text: "Juan Pérez" }], [{ text: "Director", style: { fontSize: 24, italic: true, color: "#c9c9c9" } }]] },
  { id: "demo-5", type: "spacer", text: "" },
  { id: "demo-6", type: "text", text: "María González\nProductora Ejecutiva", rich: [[{ text: "María González" }], [{ text: "Productora Ejecutiva", style: { fontSize: 24, italic: true, color: "#c9c9c9" } }]] },
  { id: "demo-7", type: "spacer", text: "" },
  { id: "demo-8", type: "divider", text: "" },
  { id: "demo-9", type: "spacer", text: "" },
  { id: "demo-10", type: "text", text: "Reparto", rich: [[{ text: "Reparto", style: { fontSize: 56, bold: true } }]] },
  { id: "demo-11", type: "spacer", text: "" },
  { id: "demo-12", type: "text", text: "Carlos Ruiz como Alejandro", rich: [[{ text: "Carlos Ruiz", style: { bold: true } }, { text: " como " }, { text: "Alejandro", style: { italic: true } }]] },
  { id: "demo-13", type: "text", text: "Ana Torres como Isabella", rich: [[{ text: "Ana Torres", style: { bold: true } }, { text: " como " }, { text: "Isabella", style: { italic: true } }]] },
  { id: "demo-14", type: "spacer", text: "" },
  { id: "demo-15", type: "text", text: "GRACIAS", rich: [[{ text: "GRACIAS", style: { fontSize: 72, bold: true } }]] },
  { id: "demo-16", type: "text", text: "Por ver esta película", rich: [[{ text: "Por ver esta película", style: { fontSize: 20 } }]] },
]
```

- [ ] **Step 3: `store.ts`**
  - `addItem`: delete the legacy placeholder ternary; keep only `text` (placeholder "Nuevo texto" + `plainToRich`) and the non-text types (`text: ""`).
  - Delete `getFontSize`, `getFontWeight`, `resolveFontWeight` entirely.
  - `mergePersistedConfig` needs no change (spread over `DEFAULT_CONFIG` backfills `fontSize`).

- [ ] **Step 4: `textStyle.ts`** — remove the `getFontSize` import; `fontFamily = config.fontFamily`, `color = config.textColor`, `fontSize = config.fontSize`; keep the per-item letterSpacing/lineHeight/noWrap/textBoxWidth logic unchanged.

- [ ] **Step 5: Scenes** — `ScrollCredits.tsx`, `AppearingCredits.tsx`: replace every `resolveFontWeight(item, config)` with `config.fontWeight`; remove the now-unused import; remove `fontStyle: item.italic ? "italic" : undefined` lines (italic is a run property now); `uppercase` stays.

- [ ] **Step 6: `ItemInspector.tsx`**
  - Text branch: only the `RichTextEditor` (drop the Input/Textarea branches for title/subtitle and the `toggleBold`/`toggleItalic` handlers and B/I buttons — the AA uppercase button and alignment buttons stay).
  - "Estilo de texto" section: remove the Tamaño, Color, Fuente and Peso rows (absorbed by runs); keep Interletra, Interlínea, No envolver, Ancho caja.
  - Remove the `getFontSize` import.

- [ ] **Step 7: `CreditEditor.tsx`**
  - `TYPE_ICONS` / `ADD_MENU_TYPES`: 4 entries (remove Heading1/Heading2/User/Briefcase/Text icon imports if now unused).
  - `ItemRow`: remove the `item.bold` / `item.italic` badges (keep AA and align).

- [ ] **Step 8: `ConfigPanel.tsx`**
  - Replace the five `Tamaño: X` sliders with ONE:

```tsx
            <Field label="Tamaño base" hint={`${config.fontSize}px`}>
              <Slider
                value={[config.fontSize]}
                onValueChange={(v) => updateConfig({ fontSize: v[0] })}
                min={10}
                max={200}
                step={1}
              />
            </Field>
```

  - In `PresetBar` presets: replace every `fontSizeTitle: N` with `fontSize: N` and delete `fontSizeSubtitle: 44`.

- [ ] **Step 9: Sweep and verify**

Run: `pnpm exec tsc --noEmit` → fix any remaining references it reports (grep `fontSizeTitle|fontSizeSubtitle|fontSizeName|fontSizeRole|fontSizeDescription|getFontSize|getFontWeight|resolveFontWeight|item.bold|item.italic|item.fontSize|item.color|item.fontFamily|item.fontWeight` over `src/`).
Run: `pnpm test:run` → all green. `pnpm exec eslint .` → clean (it will catch unused imports left behind). `pnpm build` → OK.

- [ ] **Step 10: Commit**

```powershell
git add -A src/
git commit -m "feat!: single rich text item replaces typed text items"
```

---

### Task 9: Final verification and session log

- [ ] **Step 1: Full gate** — `pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm test:run && pnpm build` → all clean/green.
- [ ] **Step 2: Manual smoke** (`pnpm dev`, kill :3000 afterwards): demo items render formatted in both modes; editor toolbar formats selections; typewriter/stagger/scrub/export dialog still work; "Vaciar lista" + "Ejemplo" reload the rich demo; hard reset of localStorage loads clean.
- [ ] **Step 3: Update `state.md`** — History entry (feature, decisions, suite count, commits) and mark the TODO if one exists; flag pending interactive verification by the user. Note that `creditos-la-vida-en-un-segundo.json` (legacy typed items) no longer imports; regenerating it as rich items is a separate TODO if the user wants to keep it.
- [ ] **Step 4: Commit** — `git add state.md && git commit -m "docs: session log for rich text item"`.
