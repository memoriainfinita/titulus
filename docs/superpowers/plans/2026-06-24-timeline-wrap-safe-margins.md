# Timeline, control de wrap y respeto de márgenes seguros — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir línea de tiempo scrubbeable con saltos por item, control de wrap (no-envolver + ancho de caja) y un modo que constriñe el contenido a los márgenes título-seguros.

**Architecture:** Lógica pura nueva en `src/lib/credit/` (resolvers testeables); los componentes `ScrollCredits`/`AppearingCredits` la consumen y exponen callbacks de progreso/índice sin re-renderizar por frame; `CreditPreview` orquesta la barra de tiempo y los toggles. Reutiliza el `manualProgress` (0-1) ya soportado por ambos componentes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, framer-motion, Vitest 4 + happy-dom.

## Global Constraints

- Comentarios y mensajes de commit en inglés; UI en español.
- `tsc --noEmit` limpio en cada tarea (comando: `pnpm exec tsc --noEmit`).
- Suite completa verde en cada tarea (comando: `pnpm test:run`). Base actual: 117 tests.
- Test de un único archivo: `pnpm exec vitest run <ruta>`.
- Override por item: un valor válido del item gana, si no el global (patrón `resolveTextStyle`/`separators.ts`).
- `mergePersistedConfig` backfilla claves nuevas automáticamente (es `{ ...DEFAULT_CONFIG, ...persisted }`); basta con añadirlas a `DEFAULT_CONFIG`.
- Caja segura = título-segura, inset 0.1 por lado. Solo horizontal en ambos modos.
- No tocar el RAF interno de scroll ni los timers de aparición salvo lo indicado.

---

### Task 1: Tipos y defaults

**Files:**
- Modify: `src/lib/credit/types.ts` (CreditItem ~line 66, CreditConfig Layout ~line 101, junto a showSafeMargins ~line 143, DEFAULT_CONFIG ~line 174 y ~line 208)
- Test: `src/lib/credit/store.test.ts`

**Interfaces:**
- Produces: `config.respectSafeMargins: boolean`, `config.noWrap: boolean`, `config.textBoxWidth: number`; `item.noWrap?: boolean`, `item.textBoxWidth?: number`.

- [ ] **Step 1: Write the failing test** (añadir a `store.test.ts`)

```ts
import { mergePersistedConfig } from "./store"
import { DEFAULT_CONFIG, type CreditConfig } from "./types"

describe("mergePersistedConfig backfill (timeline/wrap/safe-margins)", () => {
  it("backfills new keys on older persisted state and keeps existing values", () => {
    const merged = mergePersistedConfig({ paddingX: 40 } as Partial<CreditConfig>)
    expect(merged.paddingX).toBe(40)
    expect(merged.respectSafeMargins).toBe(false)
    expect(merged.noWrap).toBe(false)
    expect(merged.textBoxWidth).toBe(100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/credit/store.test.ts`
Expected: FAIL (`respectSafeMargins`/`noWrap`/`textBoxWidth` no existen en `DEFAULT_CONFIG`).

- [ ] **Step 3: Add the type fields and defaults**

En `CreditItem`, tras `imageWidth?` (~line 66):

```ts
  // Wrap overrides. undefined = hereda el global correspondiente.
  noWrap?: boolean
  textBoxWidth?: number // % del ancho del escenario; <= 0 se ignora
```

En `CreditConfig`, en la sección Layout, tras `paddingX: number` (~line 101):

```ts
  noWrap: boolean // true = whiteSpace pre (no envuelve automático)
  textBoxWidth: number // max-width de la caja de texto, % del escenario; 100 = sin límite
```

En `CreditConfig`, tras `showSafeMargins: boolean ...` (~line 143):

```ts
  respectSafeMargins: boolean // constriñe el contenido a la caja título-segura; SÍ afecta al export
```

En `DEFAULT_CONFIG`, tras `paddingX: 80,` (~line 174):

```ts
  noWrap: false,
  textBoxWidth: 100,
```

En `DEFAULT_CONFIG`, tras `showSafeMargins: false,` (~line 208):

```ts
  respectSafeMargins: false,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/credit/store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/credit/types.ts src/lib/credit/store.test.ts
git commit -m "feat: add config/item fields for wrap, text box width and safe-margin respect"
```

---

### Task 2: `resolveSafeInset` (módulo puro)

**Files:**
- Create: `src/lib/credit/safeMargins.ts`
- Test: `src/lib/credit/safeMargins.test.ts`

**Interfaces:**
- Consumes: `config.respectSafeMargins` (Task 1).
- Produces: `resolveSafeInset(config: CreditConfig): number` y `TITLE_SAFE_INSET: number`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest"
import { resolveSafeInset, TITLE_SAFE_INSET } from "./safeMargins"
import { DEFAULT_CONFIG } from "./types"

describe("resolveSafeInset", () => {
  it("returns 0 when respectSafeMargins is off", () => {
    expect(resolveSafeInset({ ...DEFAULT_CONFIG, respectSafeMargins: false })).toBe(0)
  })
  it("returns the title-safe inset when on", () => {
    expect(resolveSafeInset({ ...DEFAULT_CONFIG, respectSafeMargins: true })).toBe(TITLE_SAFE_INSET)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/credit/safeMargins.test.ts`
Expected: FAIL ("Failed to resolve import './safeMargins'").

- [ ] **Step 3: Write minimal implementation** (`safeMargins.ts`)

```ts
import { CreditConfig } from "./types"

// Inset fraction (per edge) of the title-safe box.
export const TITLE_SAFE_INSET = 0.1

// Fraction of horizontal inset to apply to credit content. 0 when disabled.
export function resolveSafeInset(config: CreditConfig): number {
  return config.respectSafeMargins ? TITLE_SAFE_INSET : 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/credit/safeMargins.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add src/lib/credit/safeMargins.ts src/lib/credit/safeMargins.test.ts
git commit -m "feat: add resolveSafeInset pure helper"
```

---

### Task 3: `itemProgressBounds` (módulo puro)

**Files:**
- Create: `src/lib/credit/timeline.ts`
- Test: `src/lib/credit/timeline.test.ts`

**Interfaces:**
- Produces: `itemProgressBounds(itemDurations: number[]): ProgressBound[]` con `interface ProgressBound { start: number; end: number }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest"
import { itemProgressBounds } from "./timeline"

describe("itemProgressBounds", () => {
  it("returns empty for empty input", () => {
    expect(itemProgressBounds([])).toEqual([])
  })
  it("returns empty when total is zero", () => {
    expect(itemProgressBounds([0, 0])).toEqual([])
  })
  it("computes normalized cumulative bounds", () => {
    const b = itemProgressBounds([1, 3])
    expect(b[0]).toEqual({ start: 0, end: 0.25 })
    expect(b[1]).toEqual({ start: 0.25, end: 1 })
  })
  it("ends the last item at 1", () => {
    const b = itemProgressBounds([2, 2, 4])
    expect(b[b.length - 1].end).toBeCloseTo(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/credit/timeline.test.ts`
Expected: FAIL ("Failed to resolve import './timeline'").

- [ ] **Step 3: Write minimal implementation** (`timeline.ts`)

```ts
export interface ProgressBound {
  start: number
  end: number
}

// Map per-item durations to normalized [start,end] progress fractions (0-1).
// Empty input or non-positive total → empty array.
export function itemProgressBounds(itemDurations: number[]): ProgressBound[] {
  const total = itemDurations.reduce((s, d) => s + Math.max(0, d), 0)
  if (total <= 0) return []
  const bounds: ProgressBound[] = []
  let acc = 0
  for (const d of itemDurations) {
    const start = acc / total
    acc += Math.max(0, d)
    bounds.push({ start, end: acc / total })
  }
  return bounds
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/credit/timeline.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add src/lib/credit/timeline.ts src/lib/credit/timeline.test.ts
git commit -m "feat: add itemProgressBounds pure helper"
```

---

### Task 4: Extender `resolveTextStyle` (wrap + ancho de caja)

**Files:**
- Modify: `src/lib/credit/textStyle.ts`
- Test: `src/lib/credit/textStyle.test.ts`

**Interfaces:**
- Consumes: `config.noWrap`, `config.textBoxWidth`, `item.noWrap`, `item.textBoxWidth` (Task 1).
- Produces: `ResolvedTextStyle` ampliado con `whiteSpace: "pre" | "pre-wrap"`, `wordBreak: "break-word" | "normal"`, `maxWidth: string`.

- [ ] **Step 1: Write the failing test** (añadir a `textStyle.test.ts`)

```ts
import { resolveTextStyle } from "./textStyle"
import { DEFAULT_CONFIG, type CreditItem } from "./types"

const baseItem = (over: Partial<CreditItem> = {}): CreditItem =>
  ({ id: "x", type: "name", text: "t", ...over } as CreditItem)

describe("resolveTextStyle wrap/box-width", () => {
  it("wraps by default", () => {
    const s = resolveTextStyle(baseItem(), DEFAULT_CONFIG)
    expect(s.whiteSpace).toBe("pre-wrap")
    expect(s.wordBreak).toBe("break-word")
    expect(s.maxWidth).toBe("100%")
  })
  it("global noWrap switches to pre/normal", () => {
    const s = resolveTextStyle(baseItem(), { ...DEFAULT_CONFIG, noWrap: true })
    expect(s.whiteSpace).toBe("pre")
    expect(s.wordBreak).toBe("normal")
  })
  it("per-item noWrap overrides global", () => {
    const s = resolveTextStyle(baseItem({ noWrap: false }), { ...DEFAULT_CONFIG, noWrap: true })
    expect(s.whiteSpace).toBe("pre-wrap")
  })
  it("per-item textBoxWidth overrides global; invalid falls back", () => {
    expect(resolveTextStyle(baseItem({ textBoxWidth: 60 }), DEFAULT_CONFIG).maxWidth).toBe("60%")
    expect(resolveTextStyle(baseItem({ textBoxWidth: 0 }), { ...DEFAULT_CONFIG, textBoxWidth: 80 }).maxWidth).toBe("80%")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/credit/textStyle.test.ts`
Expected: FAIL (`whiteSpace`/`wordBreak`/`maxWidth` undefined).

- [ ] **Step 3: Extend the resolver** (`textStyle.ts`)

Ampliar la interfaz:

```ts
export interface ResolvedTextStyle {
  fontFamily: string
  fontSize: number
  color: string
  letterSpacing: number
  lineHeight: number
  whiteSpace: "pre" | "pre-wrap"
  wordBreak: "break-word" | "normal"
  maxWidth: string
}
```

Antes del `return` de `resolveTextStyle`, calcular y devolver:

```ts
  const noWrap = item.noWrap ?? config.noWrap
  const whiteSpace = noWrap ? "pre" : "pre-wrap"
  const wordBreak = noWrap ? "normal" : "break-word"
  const boxWidth =
    typeof item.textBoxWidth === "number" && item.textBoxWidth > 0
      ? item.textBoxWidth
      : config.textBoxWidth
  const maxWidth = `${boxWidth}%`
  return { fontFamily, fontSize, color, letterSpacing, lineHeight, whiteSpace, wordBreak, maxWidth }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/credit/textStyle.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/credit/textStyle.ts src/lib/credit/textStyle.test.ts
git commit -m "feat: resolve wrap mode and text box width in resolveTextStyle"
```

---

### Task 5: Roundtrip import/export de las claves nuevas

**Files:**
- Test: `src/lib/credit/store.test.ts`

**Interfaces:**
- Consumes: `exportProject`/`importProject` del store, claves de Task 1.

- [ ] **Step 1: Write the failing test**

Localizar en `store.test.ts` el patrón de test de roundtrip existente (export → import → comparar). Añadir:

```ts
it("roundtrips new config keys and item wrap overrides", () => {
  const store = useCreditStore.getState()
  store.updateConfig({ respectSafeMargins: true, noWrap: true, textBoxWidth: 70 })
  store.loadItems([{ id: "a", type: "name", text: "Ada", noWrap: true, textBoxWidth: 50 }])
  const json = useCreditStore.getState().exportProject()
  // reset
  store.updateConfig({ respectSafeMargins: false, noWrap: false, textBoxWidth: 100 })
  const ok = useCreditStore.getState().importProject(json)
  expect(ok).toBe(true)
  const after = useCreditStore.getState()
  expect(after.config.respectSafeMargins).toBe(true)
  expect(after.config.noWrap).toBe(true)
  expect(after.config.textBoxWidth).toBe(70)
  expect(after.items[0].noWrap).toBe(true)
  expect(after.items[0].textBoxWidth).toBe(50)
})
```

Nota: ajustar la forma de obtener el store (`useCreditStore.getState()`) al estilo ya usado en el archivo; si los tests existentes usan otro helper de reset, replicarlo.

- [ ] **Step 2: Run test to verify it fails or passes**

Run: `pnpm exec vitest run src/lib/credit/store.test.ts`
Expected: PASS si `exportProject` ya serializa config completo + items completos (es lo esperado). Si FALLA porque alguna clave no se serializa, corregir `exportProject`/`importProject` en `store.ts` para incluir el objeto `config` e `items` completos, y volver a correr.

- [ ] **Step 3: Commit**

```bash
git add src/lib/credit/store.test.ts src/lib/credit/store.ts
git commit -m "test: roundtrip new config keys and item wrap overrides"
```

---

### Task 6: `ScrollCredits` — wrap, ancho de caja, inset seguro, progreso y reanudación

**Files:**
- Modify: `src/components/credit/ScrollCredits.tsx`

**Interfaces:**
- Consumes: `resolveSafeInset` (Task 2), `resolveTextStyle` ampliado (Task 4).
- Produces: prop `onProgressChange?: (p: number) => void` en `ScrollCreditsProps`.

- [ ] **Step 1: Consumir el estilo de texto resuelto en `getItemStyle`**

En `getItemStyle` (la función que arma el estilo del item de texto), sustituir las líneas hardcodeadas `width: "100%"`, `whiteSpace: "pre-wrap"`, `wordBreak: "break-word"` por:

```ts
    width: "100%",
    maxWidth: ts.maxWidth,
    marginLeft: "auto",
    marginRight: "auto",
    boxSizing: "border-box",
    whiteSpace: ts.whiteSpace,
    wordBreak: ts.wordBreak,
```

(`ts` ya es `resolveTextStyle(item, config)` en esa función.)

- [ ] **Step 2: Aplicar el inset horizontal al contenedor de scroll**

Importar arriba: `import { resolveSafeInset } from "@/lib/credit/safeMargins"`.

Dentro del componente, antes del `return`, calcular: `const inset = resolveSafeInset(config)`.

En el div `ref={contentRef}` (hoy `className="absolute left-0 right-0"`), quitar `left-0 right-0` del className y añadir al `style`:

```ts
          left: `${inset * 100}%`,
          right: `${inset * 100}%`,
```

(mantener `transform` y `willChange` existentes).

- [ ] **Step 3: Añadir `onProgressChange` a la interfaz y props**

En `ScrollCreditsProps` añadir:

```ts
  // Reports current progress (0-1) during internal playback (for the timeline).
  onProgressChange?: (p: number) => void
```

Añadir `onProgressChange` al destructuring de props del componente.

- [ ] **Step 4: Reportar progreso y sembrar al reanudar**

Añadir, junto a los demás `useEffect`:

```ts
  // Report internal progress upward (timeline), but not in manual/export mode.
  React.useEffect(() => {
    if (manualProgress !== null) return
    onProgressChange?.(internalProgress)
  }, [internalProgress, manualProgress, onProgressChange])

  // When leaving manual mode (scrub release → Play), resume from the scrubbed point.
  const lastManualRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (manualProgress !== null) {
      lastManualRef.current = manualProgress
      return
    }
    if (lastManualRef.current !== null) {
      setInternalProgress(lastManualRef.current)
      lastManualRef.current = null
    }
  }, [manualProgress])
```

- [ ] **Step 5: Verificar tipos y suite**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errores.
Run: `pnpm test:run`
Expected: toda la suite verde.

- [ ] **Step 6: Commit**

```bash
git add src/components/credit/ScrollCredits.tsx
git commit -m "feat: ScrollCredits honors wrap, box width, safe inset and reports progress"
```

---

### Task 7: `AppearingCredits` — wrap, ancho de caja, inset seguro, progreso e índice

**Files:**
- Modify: `src/components/credit/AppearingCredits.tsx`

**Interfaces:**
- Consumes: `resolveSafeInset` (Task 2), `resolveTextStyle` ampliado (Task 4), `itemProgressBounds` (Task 3).
- Produces: props `onProgressChange?: (p: number) => void`, `onIndexChange?: (i: number) => void`; export de `getVisibleItems`.

- [ ] **Step 1: Consumir wrap/box-width en `AppearItem` y typewriter**

En `AppearItem`, sustituir `maxWidth: "100%"`, `whiteSpace: "pre-wrap"`, `wordBreak: "break-word"` por:

```ts
        maxWidth: ts.maxWidth,
        whiteSpace: ts.whiteSpace,
        wordBreak: ts.wordBreak,
```

En el bloque inline del typewriter (el `<div style={{...}}>` que renderiza `{typedText}`), sustituir `whiteSpace: "pre-wrap"`, `wordBreak: "break-word"` por el resuelto y añadir maxWidth. Como ese bloque llama varias veces a `resolveTextStyle(currentItem, config)`, capturarlo una vez encima del `return` del componente o reutilizar; mínimamente, añadir:

```ts
                whiteSpace: resolveTextStyle(currentItem, config).whiteSpace,
                wordBreak: resolveTextStyle(currentItem, config).wordBreak,
                maxWidth: resolveTextStyle(currentItem, config).maxWidth,
```

(sustituyendo las dos propiedades hardcodeadas previas).

- [ ] **Step 2: Aplicar el inset horizontal al contenedor**

Importar: `import { resolveSafeInset } from "@/lib/credit/safeMargins"` y `import { itemProgressBounds } from "@/lib/credit/timeline"`.

En el contenedor raíz del render normal (el `<div className="w-full h-full flex flex-col items-center justify-center overflow-hidden relative" style={backgroundStyle}>`), añadir al style el padding horizontal:

```ts
      style={{ ...backgroundStyle, paddingLeft: `${resolveSafeInset(config) * 100}%`, paddingRight: `${resolveSafeInset(config) * 100}%` }}
```

- [ ] **Step 3: Exportar `getVisibleItems` y añadir props**

Cambiar `function getVisibleItems` a `export function getVisibleItems`.

En `AppearingCreditsProps` añadir:

```ts
  onProgressChange?: (p: number) => void
  onIndexChange?: (i: number) => void
```

Añadirlas al destructuring del componente.

- [ ] **Step 4: Reportar progreso e índice**

Añadir junto a los demás effects:

```ts
  // Report item-granular progress and current index upward (timeline), not in manual mode.
  React.useEffect(() => {
    if (manualProgress !== null) return
    onIndexChange?.(currentIndex)
    const bounds = itemProgressBounds(itemDurations)
    const b = bounds[Math.min(currentIndex, bounds.length - 1)]
    if (b) onProgressChange?.(b.start)
  }, [currentIndex, manualProgress, itemDurations, onProgressChange, onIndexChange])
```

- [ ] **Step 5: Verificar tipos y suite**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errores.
Run: `pnpm test:run`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add src/components/credit/AppearingCredits.tsx
git commit -m "feat: AppearingCredits honors wrap, box width, safe inset and reports progress/index"
```

---

### Task 8: `TimelineBar` + orquestación en `CreditPreview`

**Files:**
- Create: `src/components/credit/TimelineBar.tsx`
- Modify: `src/components/credit/CreditPreview.tsx`

**Interfaces:**
- Consumes: `onProgressChange`/`onIndexChange`/`manualProgress` de Tasks 6-7; `getVisibleItems` (Task 7), `getAppearItemDuration` (`appearing.ts`), `itemProgressBounds` (Task 3).

- [ ] **Step 1: Crear `TimelineBar.tsx`**

```tsx
"use client"

import * as React from "react"

interface TimelineBarProps {
  progressRef: React.MutableRefObject<number>
  isScrubbing: boolean
  seekValue: number
  onSeekStart: () => void
  onSeek: (v: number) => void
  onSeekEnd: () => void
}

// Progress bar under the stage. While playing it follows progressRef via its own
// RAF (no parent re-render); while scrubbing it shows the controlled seek value.
export function TimelineBar({
  progressRef,
  isScrubbing,
  seekValue,
  onSeekStart,
  onSeek,
  onSeekEnd,
}: TimelineBarProps) {
  const [display, setDisplay] = React.useState(0)
  React.useEffect(() => {
    if (isScrubbing) return
    let raf: number
    const loop = () => {
      setDisplay(progressRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [isScrubbing, progressRef])

  const value = isScrubbing ? seekValue : display
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.001}
      value={value}
      onPointerDown={onSeekStart}
      onChange={(e) => onSeek(parseFloat(e.target.value))}
      onPointerUp={onSeekEnd}
      className="w-full accent-primary cursor-pointer"
      aria-label="Línea de tiempo"
    />
  )
}
```

- [ ] **Step 2: Estado y refs en `CreditPreview`**

Importar arriba:

```ts
import { TimelineBar } from "./TimelineBar"
import { getVisibleItems } from "./AppearingCredits"
import { getAppearItemDuration } from "@/lib/credit/appearing"
import { itemProgressBounds } from "@/lib/credit/timeline"
import { SkipBack, SkipForward } from "lucide-react"
```

Dentro del componente, junto a los demás `useState`:

```ts
  const progressRef = React.useRef(0)
  const [manualSeek, setManualSeek] = React.useState<number | null>(null)
  const [isScrubbing, setIsScrubbing] = React.useState(false)
  const [currentItemIndex, setCurrentItemIndex] = React.useState(0)

  const navBounds = React.useMemo(
    () => itemProgressBounds(getVisibleItems(items).map((i) => getAppearItemDuration(i, config))),
    [items, config],
  )
  const navCount = navBounds.length

  const seekToItem = (idx: number) => {
    const b = navBounds[idx]
    if (!b) return
    setPlaying(false)
    setIsScrubbing(false)
    setManualSeek(b.start)
    setCurrentItemIndex(idx)
  }
```

- [ ] **Step 3: Cablear el escenario VISIBLE**

En las instancias visibles de `ScrollCredits` y `AppearingCredits` (las de dentro del div con `ref={stageRef}`), añadir props:

```tsx
            manualProgress={manualSeek}
            onProgressChange={(p) => { progressRef.current = p }}
```

y solo en `AppearingCredits` añadir además:

```tsx
            onIndexChange={setCurrentItemIndex}
```

- [ ] **Step 4: Modificar Play y Reiniciar para limpiar el seek**

Botón Play/Pausar `onClick`: cambiar a una función que al **arrancar** limpie el seek:

```tsx
          onClick={() => {
            const next = !isPlaying
            setPlaying(next)
            if (next) { setManualSeek(null); setIsScrubbing(false) }
          }}
```

Botón Reiniciar `onClick`: cambiar a:

```tsx
          onClick={() => { setManualSeek(null); setIsScrubbing(false); restartPreview() }}
```

- [ ] **Step 5: Insertar la barra y los controles de item**

Justo encima del div de controles (`<div className="flex items-center justify-center gap-2 p-3 border-t bg-background">`), añadir:

```tsx
      {/* Timeline */}
      <div className="flex items-center gap-2 px-3 pt-2">
        {config.mode === "appearing" && (
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"
            onClick={() => seekToItem(Math.max(0, currentItemIndex - 1))}
            disabled={currentItemIndex <= 0} title="Item anterior">
            <SkipBack className="h-4 w-4" />
          </Button>
        )}
        <TimelineBar
          progressRef={progressRef}
          isScrubbing={isScrubbing}
          seekValue={manualSeek ?? 0}
          onSeekStart={() => { setIsScrubbing(true); setPlaying(false); setManualSeek(progressRef.current) }}
          onSeek={(v) => setManualSeek(v)}
          onSeekEnd={() => setIsScrubbing(false)}
        />
        {config.mode === "appearing" && (
          <>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"
              onClick={() => seekToItem(Math.min(navCount - 1, currentItemIndex + 1))}
              disabled={currentItemIndex >= navCount - 1} title="Item siguiente">
              <SkipForward className="h-4 w-4" />
            </Button>
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-12 text-right">
              {navCount > 0 ? `${Math.min(currentItemIndex, navCount - 1) + 1} / ${navCount}` : "0 / 0"}
            </span>
          </>
        )}
      </div>
```

- [ ] **Step 6: Verificar tipos y suite**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errores.
Run: `pnpm test:run`
Expected: verde.

- [ ] **Step 7: Verificación manual en navegador (anotar resultado)**

Con el dev server: arrastrar la barra pausa y mueve el pase; soltar deja el frame fijo; Play reanuda desde ahí (scroll continúa, no salta a 0); en aparición los botones saltan de item y el indicador "X / Y" avanza; la barra sigue el progreso durante la reproducción.

- [ ] **Step 8: Commit**

```bash
git add src/components/credit/TimelineBar.tsx src/components/credit/CreditPreview.tsx
git commit -m "feat: add scrubbable timeline with per-item navigation"
```

---

### Task 9: Botones de márgenes en `CreditPreview` (guía + respetar)

**Files:**
- Modify: `src/components/credit/CreditPreview.tsx`

**Interfaces:**
- Consumes: `config.respectSafeMargins`, `config.showSafeMargins`, `updateConfig`.

- [ ] **Step 1: Importar icono y renombrar la guía**

Añadir `SquareDashed` al import de `lucide-react` (junto a `SquareDashedBottom`).

En el botón existente del overlay-guía, cambiar el texto visible de `Márgenes` a `Guía` y el `title` a `"Mostrar guía de márgenes seguros (no se exporta)"`. (Mantiene `config.showSafeMargins`.)

- [ ] **Step 2: Añadir el botón "Respetar márgenes"**

Inmediatamente después del botón "Guía", añadir:

```tsx
        <Button
          size="sm"
          variant={config.respectSafeMargins ? "default" : "outline"}
          onClick={() => updateConfig({ respectSafeMargins: !config.respectSafeMargins })}
          title="Constreñir el contenido a los márgenes seguros (afecta al vídeo)"
        >
          <SquareDashed className="h-4 w-4 mr-1" />
          Respetar
        </Button>
```

- [ ] **Step 3: Verificar tipos y suite**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errores.
Run: `pnpm test:run`
Expected: verde.

- [ ] **Step 4: Verificación manual (anotar)**

Activar "Respetar" mete el contenido dentro del recuadro título-seguro tanto en preview como en el MP4 exportado; "Guía" solo dibuja las líneas y no sale en el export.

- [ ] **Step 5: Commit**

```bash
git add src/components/credit/CreditPreview.tsx
git commit -m "feat: add respect-safe-margins toggle and rename guide button"
```

---

### Task 10: Controles globales de wrap en `ConfigPanel`

**Files:**
- Modify: `src/components/credit/ConfigPanel.tsx`

**Interfaces:**
- Consumes: `config.noWrap`, `config.textBoxWidth`, `updateConfig`.

- [ ] **Step 1: Asegurar el import de `Switch`**

Comprobar que `Switch` está importado (se usa en otras secciones, p. ej. degradado/sombra). Si no, añadir: `import { Switch } from "@/components/ui/switch"`.

- [ ] **Step 2: Añadir los controles**

En la Section de tipografía, tras el `Field label="Altura de línea"` (~line 327) y antes de cerrar `</Section>` (~line 328), insertar:

```tsx
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-xs">No envolver texto (respeta solo saltos manuales)</Label>
              <Switch
                checked={config.noWrap}
                onCheckedChange={(v) => updateConfig({ noWrap: v })}
              />
            </div>
            <Field label="Ancho de caja de texto" hint={`${config.textBoxWidth}%`}>
              <Slider
                value={[config.textBoxWidth]}
                onValueChange={(v) => updateConfig({ textBoxWidth: v[0] })}
                min={10}
                max={100}
                step={1}
              />
            </Field>
```

- [ ] **Step 3: Verificar tipos y suite**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errores.
Run: `pnpm test:run`
Expected: verde.

- [ ] **Step 4: Verificación manual (anotar)**

El switch alterna el envuelto global; el slider estrecha la caja de texto y el texto envuelve antes (centrado).

- [ ] **Step 5: Commit**

```bash
git add src/components/credit/ConfigPanel.tsx
git commit -m "feat: global no-wrap toggle and text box width control"
```

---

### Task 11: Overrides de wrap por item en `CreditEditor`

**Files:**
- Modify: `src/components/credit/CreditEditor.tsx`

**Interfaces:**
- Consumes: `item.noWrap`, `item.textBoxWidth`, `updateItem`, `config` (para placeholder).

- [ ] **Step 1: Añadir los controles por item**

En el bloque de overrides de texto, tras el control de Interlineado (`lineHeight`, ~line 569), añadir dentro del mismo contenedor de overrides:

```tsx
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">No envolver</span>
              <Switch
                checked={item.noWrap ?? false}
                onCheckedChange={(v) => updateItem(item.id, { noWrap: v || undefined })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Ancho caja</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={item.textBoxWidth ?? ""}
                placeholder={String(config.textBoxWidth)}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === "") { updateItem(item.id, { textBoxWidth: undefined }); return }
                  const n = Number(raw)
                  updateItem(item.id, { textBoxWidth: Math.max(1, Math.min(100, n)) })
                }}
                className="h-7 text-xs"
              />
            </div>
```

Nota: confirmar que `Switch` e `Input` están importados en el archivo; si falta `Switch`, añadir `import { Switch } from "@/components/ui/switch"`.

- [ ] **Step 2: Verificar tipos y suite**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errores.
Run: `pnpm test:run`
Expected: verde.

- [ ] **Step 3: Verificación manual (anotar)**

Cada item de texto puede forzar su propio no-envolver y su ancho de caja; vacío hereda el global (placeholder muestra el valor global).

- [ ] **Step 4: Commit**

```bash
git add src/components/credit/CreditEditor.tsx
git commit -m "feat: per-item no-wrap and text box width overrides"
```

---

## Self-Review

**Spec coverage:**
- F1 respetar márgenes: `resolveSafeInset` (T2), consumo en scroll (T6) y aparición (T7) horizontal-only, botón (T9). Cubierto.
- F2 timeline: `itemProgressBounds` (T3), reporte de progreso/índice + seed-on-resume (T6/T7), barra + nav por item (T8). Cubierto.
- F3 wrap: campos (T1), `resolveTextStyle` ampliado (T4), consumo en scroll/aparición/typewriter (T6/T7), UI global (T10) y por item (T11). Cubierto.
- Backfill persistido y roundtrip: T1 (mergePersistedConfig) y T5. Cubierto.

**Type consistency:** `resolveSafeInset`/`TITLE_SAFE_INSET`, `itemProgressBounds`/`ProgressBound`, `ResolvedTextStyle` ampliado, props `onProgressChange`/`onIndexChange`/`manualProgress`, export `getVisibleItems` — usados de forma consistente entre tareas.

**Placeholder scan:** sin TBD/TODO; todos los pasos de código llevan el código.

**Notas de verificación de anclas durante ejecución:** confirmar imports de `Switch`/`Input` en `ConfigPanel`/`CreditEditor` (Steps lo indican) y la línea exacta del cierre de Section/override antes de insertar.
