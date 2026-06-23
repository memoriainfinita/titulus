# Logo/imagen + override por item en textos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un tipo de item `image` (logo) con subida de archivo y mostrarlo en ambos modos, y permitir override por item de tamaño, color, fuente, interletraje e interlineado en los textos.

**Architecture:** Campos planos opcionales en `CreditItem` y un default global en `CreditConfig`, resueltos por módulos puros (`textStyle.ts`, `image.ts`) que consumen los renderers (`ScrollCredits`, `AppearingCredits`). UI por item en `CreditEditor`, default global de ancho de logo en `ConfigPanel`. El override de texto se centraliza en `resolveTextStyle`, consumido por los tres puntos que hoy construyen estilo de texto inline.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand (+persist), Tailwind 4, shadcn/ui, framer-motion, Vitest 4 + happy-dom.

## Global Constraints

- Gestor de paquetes: pnpm. Tests: `pnpm test:run`.
- Override por item sigue el patrón de `pauseOverride`/spacer/divider: campo plano opcional, `undefined`/vacío = hereda el global.
- Reglas de borde del resolver de texto: `fontSize` y `lineHeight` válidos solo si `> 0` (0/negativo = no-set); `letterSpacing` admite 0 y negativos (CSS válido, global por defecto 0); `color` y `fontFamily` se consideran no-set si `trim()` queda vacío.
- Ancho de imagen en % del ancho del escenario; alto automático conservando proporción.
- Lógica pura testeada con Vitest; render JSX, subida de archivo y UID quedan fuera del alcance unit. Las tareas de UI se verifican con `pnpm exec tsc --noEmit` y revisión en navegador.
- Sin emojis en código, copy ni commits.
- Errores preexistentes de `tsc` en `useVideoExport.ts`/`CreditPreview.tsx`/`examples`: no introducir nuevos, ignorar esos.

---

### Task 1: Campos de override de texto + `resolveTextStyle` (módulo puro)

**Files:**
- Modify: `src/lib/credit/types.ts`
- Create: `src/lib/credit/textStyle.ts`
- Test: `src/lib/credit/textStyle.test.ts`

**Interfaces:**
- Consumes: `CreditItem`, `CreditConfig` (de `types.ts`); `getFontSize` (de `store.ts`).
- Produces:
  - `interface ResolvedTextStyle { fontFamily: string; fontSize: number; color: string; letterSpacing: number; lineHeight: number }`
  - `resolveTextStyle(item: CreditItem, config: CreditConfig): ResolvedTextStyle`

- [ ] **Step 1: Añadir campos en `CreditItem`** (`types.ts`). Tras el bloque de overrides de divider (`dividerColor?: string`), antes del cierre de la interface, añadir:

```ts
  // Text overrides. undefined/vacío = hereda el global correspondiente.
  fontSize?: number // px; <= 0 se ignora
  color?: string // vacío = hereda config.textColor
  fontFamily?: string // vacío = hereda config.fontFamily
  letterSpacing?: number // px; admite 0 y negativos
  lineHeight?: number // <= 0 se ignora
```

- [ ] **Step 2: Escribir el test que falla** en `src/lib/credit/textStyle.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { resolveTextStyle } from "./textStyle"
import { DEFAULT_CONFIG, CreditItem, CreditConfig } from "./types"

function cfg(patch: Partial<CreditConfig> = {}): CreditConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}
function item(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "t", type: "name", text: "X", ...patch }
}

describe("resolveTextStyle", () => {
  it("inherits all globals when no overrides", () => {
    const c = cfg({ fontFamily: "'Inter', sans-serif", textColor: "#fff", letterSpacing: 2, lineHeight: 1.4 })
    const r = resolveTextStyle(item({ type: "name" }), c)
    expect(r.fontFamily).toBe("'Inter', sans-serif")
    expect(r.fontSize).toBe(c.fontSizeName)
    expect(r.color).toBe("#fff")
    expect(r.letterSpacing).toBe(2)
    expect(r.lineHeight).toBe(1.4)
  })
  it("uses the per-type global size by item type", () => {
    expect(resolveTextStyle(item({ type: "title" }), cfg()).fontSize).toBe(DEFAULT_CONFIG.fontSizeTitle)
    expect(resolveTextStyle(item({ type: "role" }), cfg()).fontSize).toBe(DEFAULT_CONFIG.fontSizeRole)
  })
  it("applies per-item overrides over globals", () => {
    const r = resolveTextStyle(
      item({ fontSize: 99, color: "#ff0000", fontFamily: "'Roboto', sans-serif", letterSpacing: -1, lineHeight: 2 }),
      cfg(),
    )
    expect(r.fontSize).toBe(99)
    expect(r.color).toBe("#ff0000")
    expect(r.fontFamily).toBe("'Roboto', sans-serif")
    expect(r.letterSpacing).toBe(-1)
    expect(r.lineHeight).toBe(2)
  })
  it("ignores non-positive fontSize and lineHeight, falling back to global", () => {
    const c = cfg({ lineHeight: 1.5 })
    const r = resolveTextStyle(item({ type: "name", fontSize: 0, lineHeight: 0 }), c)
    expect(r.fontSize).toBe(c.fontSizeName)
    expect(r.lineHeight).toBe(1.5)
  })
  it("allows a letterSpacing override of 0", () => {
    expect(resolveTextStyle(item({ letterSpacing: 0 }), cfg({ letterSpacing: 5 })).letterSpacing).toBe(0)
  })
  it("treats whitespace-only color and fontFamily as unset", () => {
    const c = cfg({ textColor: "#abcdef", fontFamily: "'Inter', sans-serif" })
    const r = resolveTextStyle(item({ color: "   ", fontFamily: "  " }), c)
    expect(r.color).toBe("#abcdef")
    expect(r.fontFamily).toBe("'Inter', sans-serif")
  })
})
```

- [ ] **Step 3: Ejecutar el test y verificar que falla**

Run: `pnpm exec vitest run src/lib/credit/textStyle.test.ts`
Expected: FAIL — no se puede resolver `./textStyle`.

- [ ] **Step 4: Implementar `src/lib/credit/textStyle.ts`**

```ts
// Pure resolution of per-item text overrides over the global config.
// Each field: a valid per-item value wins, otherwise the global.
// Mirrors the resolve* pattern in separators.ts.

import { CreditItem, CreditConfig } from "./types"
import { getFontSize } from "./store"

export interface ResolvedTextStyle {
  fontFamily: string
  fontSize: number
  color: string
  letterSpacing: number
  lineHeight: number
}

export function resolveTextStyle(item: CreditItem, config: CreditConfig): ResolvedTextStyle {
  const fontFamily = item.fontFamily?.trim() ? item.fontFamily.trim() : config.fontFamily
  const color = item.color?.trim() ? item.color.trim() : config.textColor
  const fontSize =
    typeof item.fontSize === "number" && item.fontSize > 0
      ? item.fontSize
      : getFontSize(item.type, config)
  const letterSpacing =
    typeof item.letterSpacing === "number" ? item.letterSpacing : config.letterSpacing
  const lineHeight =
    typeof item.lineHeight === "number" && item.lineHeight > 0 ? item.lineHeight : config.lineHeight
  return { fontFamily, fontSize, color, letterSpacing, lineHeight }
}
```

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

Run: `pnpm exec vitest run src/lib/credit/textStyle.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 7: Commit**

```bash
git add src/lib/credit/types.ts src/lib/credit/textStyle.ts src/lib/credit/textStyle.test.ts
git commit -m "feat: add per-item text override fields and resolveTextStyle"
```

---

### Task 2: Consumir `resolveTextStyle` en los tres renderers

**Files:**
- Modify: `src/components/credit/ScrollCredits.tsx` (`getItemStyle`, líneas 22-49)
- Modify: `src/components/credit/AppearingCredits.tsx` (`AppearItem` líneas 89-119; bloque typewriter líneas 309-337)

**Interfaces:**
- Consumes: `resolveTextStyle` (Task 1).
- Produces: nada nuevo. Solo cambia la construcción de estilo.

- [ ] **Step 1: Importar el resolver en `ScrollCredits.tsx`.** Tras `import { resolveSpacerHeight, resolveDivider } from "@/lib/credit/separators"`, añadir:

```ts
import { resolveTextStyle } from "@/lib/credit/textStyle"
```

- [ ] **Step 2: Reemplazar el cuerpo de `getItemStyle`** (`ScrollCredits.tsx`, función completa actual líneas 22-49) por:

```tsx
function getItemStyle(item: CreditItem, config: CreditConfig): React.CSSProperties {
  const align = resolveAlignment(item, config)
  const ts = resolveTextStyle(item, config)
  const fontWeight = getFontWeight(item.type, config.fontWeight)

  let shadow: string | undefined
  if (config.useTextShadow && item.type !== "spacer" && item.type !== "divider") {
    shadow = `${config.textShadowX}px ${config.textShadowY}px ${config.textShadowBlur}px ${config.textShadowColor}`
  }

  return {
    fontFamily: ts.fontFamily,
    fontSize: `${ts.fontSize}px`,
    fontWeight,
    color: ts.color,
    letterSpacing: `${ts.letterSpacing}px`,
    lineHeight: ts.lineHeight,
    textAlign: align,
    textShadow: shadow,
    textTransform: item.uppercase ? "uppercase" : undefined,
    fontStyle: item.italic ? "italic" : undefined,
    padding: `0 ${config.paddingX}px`,
    width: "100%",
    boxSizing: "border-box",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  }
}
```

- [ ] **Step 3: Importar el resolver en `AppearingCredits.tsx`.** Tras `import { getAppearItemDuration } from "@/lib/credit/appearing"`, añadir:

```ts
import { resolveTextStyle } from "@/lib/credit/textStyle"
```

- [ ] **Step 4: Reemplazar el cuerpo de `AppearItem`** (líneas 89-119) por:

```tsx
function AppearItem({ item, config }: { item: CreditItem; config: CreditConfig }) {
  const align = resolveAlignment(item, config)
  const ts = resolveTextStyle(item, config)
  const fontWeight = item.bold ? 700 : getFontWeight(item.type, config.fontWeight)
  let shadow: string | undefined
  if (config.useTextShadow) {
    shadow = `${config.textShadowX}px ${config.textShadowY}px ${config.textShadowBlur}px ${config.textShadowColor}`
  }
  return (
    <div
      style={{
        fontFamily: ts.fontFamily,
        fontSize: `${ts.fontSize}px`,
        fontWeight,
        color: ts.color,
        letterSpacing: `${ts.letterSpacing}px`,
        lineHeight: ts.lineHeight,
        textAlign: align,
        textShadow: shadow,
        textTransform: item.uppercase ? "uppercase" : undefined,
        fontStyle: item.italic ? "italic" : undefined,
        padding: `0 ${config.paddingX}px`,
        maxWidth: "100%",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {item.text || " "}
    </div>
  )
}
```

- [ ] **Step 5: Actualizar el bloque typewriter** (`AppearingCredits.tsx`, dentro del `motion.div`, la rama `config.animationType === "typewriter" ? (...)`). Sustituir el `style` del `<div>` que envuelve `{typedText}` por uno basado en el resolver. Reemplazar:

```tsx
            <div
              style={{
                fontFamily: config.fontFamily,
                fontSize: `${getFontSize(currentItem.type, config)}px`,
                fontWeight: currentItem.bold
                  ? 700
                  : getFontWeight(currentItem.type, config.fontWeight),
                color: config.textColor,
                letterSpacing: `${config.letterSpacing}px`,
                lineHeight: config.lineHeight,
                textAlign: resolveAlignment(currentItem, config),
                textTransform: currentItem.uppercase ? "uppercase" : undefined,
                fontStyle: currentItem.italic ? "italic" : undefined,
                padding: `0 ${config.paddingX}px`,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: "1.5em",
              }}
            >
```

por:

```tsx
            <div
              style={{
                fontFamily: resolveTextStyle(currentItem, config).fontFamily,
                fontSize: `${resolveTextStyle(currentItem, config).fontSize}px`,
                fontWeight: currentItem.bold
                  ? 700
                  : getFontWeight(currentItem.type, config.fontWeight),
                color: resolveTextStyle(currentItem, config).color,
                letterSpacing: `${resolveTextStyle(currentItem, config).letterSpacing}px`,
                lineHeight: resolveTextStyle(currentItem, config).lineHeight,
                textAlign: resolveAlignment(currentItem, config),
                textTransform: currentItem.uppercase ? "uppercase" : undefined,
                fontStyle: currentItem.italic ? "italic" : undefined,
                padding: `0 ${config.paddingX}px`,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: "1.5em",
              }}
            >
```

- [ ] **Step 6: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores nuevos. (`getFontSize` puede quedar sin usar en `AppearingCredits` si ya no se referencia en otro punto; si `tsc`/lint lo marca, eliminar `getFontSize` del import de la línea 6. Comprobar con grep antes de quitarlo: sigue usándose en `getAppearItemDuration`? No — está en `appearing.ts`. En este archivo, tras el cambio, `getFontSize` ya no se usa: quitarlo del import.)

- [ ] **Step 7: Verificación manual en navegador**

`pnpm dev`. Sin overrides, scroll y aparición (incluido typewriter) se ven igual que antes. (Los controles de override llegan en Task 3.)

- [ ] **Step 8: Commit**

```bash
git add src/components/credit/ScrollCredits.tsx src/components/credit/AppearingCredits.tsx
git commit -m "refactor: consume resolveTextStyle in scroll, appearing and typewriter renderers"
```

---

### Task 3: UI de override de texto por item (`CreditEditor`)

**Files:**
- Modify: `src/components/credit/CreditEditor.tsx`

**Interfaces:**
- Consumes: `config`, `updateItem` (ya en `ItemRow`); `fonts` del store; `getFontSize` de `store`; `Input`, `Select`, `Button` (ya importados).
- Produces: nada exportado nuevo.

- [ ] **Step 1: Importar `getFontSize` y exponer `fonts`.** En `CreditEditor.tsx`, cambiar el import de store (línea 25):

```ts
import { useCreditStore, getFontSize } from "@/lib/credit/store"
```

En `ItemRow`, la línea `const { updateItem, removeItem, duplicateItem, moveItem, items, config } = useCreditStore()` pasar a incluir `fonts`:

```ts
  const { updateItem, removeItem, duplicateItem, moveItem, items, config, fonts } = useCreditStore()
```

- [ ] **Step 2: Añadir los controles de override** dentro del bloque de texto expandido, tras el bloque `config.mode === "appearing" && (...)` de la pausa (cierra justo antes del `</div>` que cierra ese panel, alrededor de la línea 285). Insertar:

```tsx
          <div className="border-t pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Tamaño</span>
              <Input
                type="number" min={1} step={1}
                value={item.fontSize ?? ""}
                placeholder={String(getFontSize(item.type, config))}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === "") { updateItem(item.id, { fontSize: undefined }); return }
                  const n = Number(raw); if (Number.isNaN(n)) return
                  updateItem(item.id, { fontSize: Math.max(1, n) })
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-24 text-sm"
              />
              <span className="text-[10px] text-muted-foreground">vacío = global</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Color</span>
              <div className="relative w-7 h-7 rounded-md border overflow-hidden shrink-0">
                <input
                  type="color"
                  value={item.color?.trim() ? item.color : config.textColor}
                  onChange={(e) => updateItem(item.id, { color: e.target.value })}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                />
                <div className="w-full h-full" style={{ backgroundColor: item.color?.trim() ? item.color : config.textColor }} />
              </div>
              <Input
                value={item.color ?? ""}
                placeholder="global"
                onChange={(e) => {
                  const raw = e.target.value
                  updateItem(item.id, { color: raw === "" ? undefined : raw })
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-7 flex-1 font-mono text-xs"
              />
              {item.color != null && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]"
                  onClick={(e) => { e.stopPropagation(); updateItem(item.id, { color: undefined }) }}>
                  global
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Fuente</span>
              <Select
                value={item.fontFamily ?? "__global"}
                onValueChange={(v) =>
                  updateItem(item.id, { fontFamily: v === "__global" ? undefined : v })
                }
              >
                <SelectTrigger className="h-7 text-sm flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global">(global)</SelectItem>
                  {fonts.map((f) => (
                    <SelectItem key={f.id} value={f.family}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Interletra</span>
              <Input
                type="number" step={0.5}
                value={item.letterSpacing ?? ""}
                placeholder={String(config.letterSpacing)}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === "") { updateItem(item.id, { letterSpacing: undefined }); return }
                  const n = Number(raw); if (Number.isNaN(n)) return
                  updateItem(item.id, { letterSpacing: n })
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-24 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Interlínea</span>
              <Input
                type="number" min={0.1} step={0.1}
                value={item.lineHeight ?? ""}
                placeholder={String(config.lineHeight)}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === "") { updateItem(item.id, { lineHeight: undefined }); return }
                  const n = Number(raw); if (Number.isNaN(n)) return
                  updateItem(item.id, { lineHeight: Math.max(0.1, n) })
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-24 text-sm"
              />
            </div>
          </div>
```

- [ ] **Step 3: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Verificación manual**

Seleccionar un item de texto: aparecen Tamaño/Color/Fuente/Interletra/Interlínea con placeholders = global. Cambiarlos se refleja en el preview (scroll y aparición). El botón "global" del color y los campos vacíos vuelven a heredar.

- [ ] **Step 5: Commit**

```bash
git add src/components/credit/CreditEditor.tsx
git commit -m "feat: per-item text override controls in editor"
```

---

### Task 4: Tipo `image`, default global y `resolveImageWidth` (módulo puro)

**Files:**
- Modify: `src/lib/credit/types.ts`
- Create: `src/lib/credit/image.ts`
- Test: `src/lib/credit/image.test.ts`

**Interfaces:**
- Consumes: `CreditItem`, `CreditConfig` (de `types.ts`).
- Produces: `resolveImageWidth(item: CreditItem, config: CreditConfig): number`.

- [ ] **Step 1: Añadir el tipo y los campos** en `types.ts`:

En `CreditItemType`, tras `| "divider"`, añadir:

```ts
  | "image"
```

En `CreditItem`, tras los campos de texto de Task 1, añadir:

```ts
  // Image (logo) item.
  imageSrc?: string // data URL
  imageWidth?: number // % del ancho del escenario; undefined = hereda config.imageWidth
```

En `CreditConfig`, tras `dividerColor: string`, añadir:

```ts
  imageWidth: number // percent of stage width
```

En `DEFAULT_CONFIG`, tras `dividerColor: "",`, añadir:

```ts
  imageWidth: 40,
```

En `CREDIT_TYPE_LABELS`, añadir:

```ts
  image: "Logo / Imagen",
```

En `CREDIT_TYPE_ICONS` (record sin uso real, solo exhaustividad), añadir:

```ts
  image: "Image",
```

- [ ] **Step 2: Escribir el test que falla** en `src/lib/credit/image.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { resolveImageWidth } from "./image"
import { DEFAULT_CONFIG, CreditItem, CreditConfig } from "./types"

function cfg(patch: Partial<CreditConfig> = {}): CreditConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}
function image(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "i", type: "image", text: "", ...patch }
}

describe("resolveImageWidth", () => {
  it("uses the global width when no override", () => {
    expect(resolveImageWidth(image(), cfg({ imageWidth: 40 }))).toBe(40)
  })
  it("uses the item override when set", () => {
    expect(resolveImageWidth(image({ imageWidth: 75 }), cfg())).toBe(75)
  })
  it("allows an override of 0", () => {
    expect(resolveImageWidth(image({ imageWidth: 0 }), cfg({ imageWidth: 40 }))).toBe(0)
  })
  it("ignores a negative override and falls back to global", () => {
    expect(resolveImageWidth(image({ imageWidth: -5 }), cfg({ imageWidth: 40 }))).toBe(40)
  })
})
```

- [ ] **Step 3: Ejecutar el test y verificar que falla**

Run: `pnpm exec vitest run src/lib/credit/image.test.ts`
Expected: FAIL — no se puede resolver `./image`.

- [ ] **Step 4: Implementar `src/lib/credit/image.ts`**

```ts
// Pure resolution helper for image (logo) items.
// Override per item when valid, otherwise the global config value.
// Mirrors resolveSpacerHeight in separators.ts.

import { CreditItem, CreditConfig } from "./types"

export function resolveImageWidth(item: CreditItem, config: CreditConfig): number {
  return typeof item.imageWidth === "number" && item.imageWidth >= 0
    ? item.imageWidth
    : config.imageWidth
}
```

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

Run: `pnpm exec vitest run src/lib/credit/image.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores nuevos. Si aparecen errores de exhaustividad de `switch`/`Record` por el nuevo tipo `image` fuera de los archivos del plan, anotarlos: `CREDIT_TYPE_LABELS`/`CREDIT_TYPE_ICONS` ya cubiertos en Step 1; `getFontSize` tiene `default`, no requiere cambio.

- [ ] **Step 7: Commit**

```bash
git add src/lib/credit/types.ts src/lib/credit/image.ts src/lib/credit/image.test.ts
git commit -m "feat: add image item type, global width default and resolveImageWidth"
```

---

### Task 5: Render de la imagen en scroll y aparición

**Files:**
- Modify: `src/components/credit/ScrollCredits.tsx` (`CreditLine`)
- Modify: `src/components/credit/AppearingCredits.tsx` (`getVisibleItems`, render del item actual)

**Interfaces:**
- Consumes: `resolveImageWidth` (Task 4), `resolveAlignment` (existente).
- Produces: nada nuevo.

- [ ] **Step 1: Importar `resolveImageWidth` en `ScrollCredits.tsx`.** Tras el import de `textStyle`, añadir:

```ts
import { resolveImageWidth } from "@/lib/credit/image"
```

- [ ] **Step 2: Añadir la rama `image` en `CreditLine`** (`ScrollCredits.tsx`), antes de la rama `if (item.type === "divider")`:

```tsx
  if (item.type === "image") {
    if (!item.imageSrc) return null
    const align = resolveAlignment(item, config)
    return (
      <div
        style={{
          padding: `0 ${config.paddingX}px`,
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
          margin: `${config.itemSpacing}px 0`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageSrc}
          alt=""
          style={{ width: `${resolveImageWidth(item, config)}%`, height: "auto", maxWidth: "100%" }}
        />
      </div>
    )
  }
```

- [ ] **Step 3: Importar `resolveImageWidth` en `AppearingCredits.tsx`.** Tras el import de `textStyle`, añadir:

```ts
import { resolveImageWidth } from "@/lib/credit/image"
```

- [ ] **Step 4: Dejar de filtrar `image` en `getVisibleItems`** (`AppearingCredits.tsx`, líneas 22-24):

```tsx
function getVisibleItems(items: CreditItem[]): CreditItem[] {
  return items.filter((i) => i.type !== "spacer" && i.type !== "divider")
}
```

(Ya no excluye `image`; mantiene `spacer`/`divider`. Si el código actual lista los tipos de otra forma, ajustar para que `image` quede incluido.)

- [ ] **Step 5: Cortocircuitar `image` antes del typewriter** en el render del item actual (`AppearingCredits.tsx`, dentro del `motion.div`). Envolver la condición existente `config.animationType === "typewriter" ? (...) : (<AppearItem .../>)` de modo que `image` se renderice primero. Sustituir la apertura `{config.animationType === "typewriter" ? (` por:

```tsx
          {currentItem.type === "image" ? (
            currentItem.imageSrc ? (
              <div className="w-full flex justify-center" style={{ padding: `0 ${config.paddingX}px` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentItem.imageSrc}
                  alt=""
                  style={{ width: `${resolveImageWidth(currentItem, config)}%`, height: "auto", maxWidth: "100%" }}
                />
              </div>
            ) : null
          ) : config.animationType === "typewriter" ? (
```

(El resto de la expresión ternaria —bloque typewriter y `: (<AppearItem .../>)`— queda igual. Resultado: `image ? <img> : typewriter ? <typewriter> : <AppearItem>`.)

- [ ] **Step 6: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 7: Verificación manual**

Hasta tener la UI (Task 6) no se puede subir imagen desde la app. Verificación temporal: en `DEFAULT_ITEMS` (`types.ts`) cambiar momentáneamente un item a `{ id: "demo-x", type: "image", text: "", imageSrc: "<data-url-o-url-de-prueba>" }`, comprobar que se ve en scroll y en aparición (incluida animación typewriter), y revertir el cambio antes del commit. Alternativa: dejar esta verificación para después de Task 6 (subida real) y commitear ahora solo con `tsc` en verde.

- [ ] **Step 8: Commit**

```bash
git add src/components/credit/ScrollCredits.tsx src/components/credit/AppearingCredits.tsx
git commit -m "feat: render image items in scroll and appearing modes"
```

---

### Task 6: UI del logo en `CreditEditor` + ancho global en `ConfigPanel`

**Files:**
- Modify: `src/components/credit/CreditEditor.tsx`
- Modify: `src/components/credit/ConfigPanel.tsx`

**Interfaces:**
- Consumes: `config`, `updateItem`, `updateConfig`; `Image` icon de lucide; `Input`, `Button`, `Slider` (ya disponibles en cada archivo).
- Produces: nada exportado nuevo.

- [ ] **Step 1: Importar el icono `Image`** en `CreditEditor.tsx`. En el import de `lucide-react` (líneas 4-24), añadir `Image,` (junto a `Minus`). Nota: el componente se llama `Image`; importarlo con alias para no chocar con tipos del DOM no es necesario en este archivo, pero usar `Image as ImageIcon` evita ambigüedad:

```ts
  Minus,
  Image as ImageIcon,
```

- [ ] **Step 2: Registrar el tipo en `TYPE_ICONS` y `ADD_MENU_TYPES`** (`CreditEditor.tsx`). En `TYPE_ICONS` añadir:

```ts
  image: ImageIcon,
```

En `ADD_MENU_TYPES` añadir `"image"` al final:

```ts
const ADD_MENU_TYPES: CreditItemType[] = [
  "title",
  "subtitle",
  "name",
  "role",
  "description",
  "spacer",
  "divider",
  "image",
]
```

- [ ] **Step 3: Excluir `image` del panel de texto** (HUECO 3). En la condición de apertura del bloque expandido de texto (`isSelected && item.type !== "spacer" && item.type !== "divider" && (`), añadir la exclusión de `image`:

```tsx
      {isSelected && item.type !== "spacer" && item.type !== "divider" && item.type !== "image" && (
```

- [ ] **Step 4: Fila resumen para `image`** (HUECO 6). Sustituir la condición de la descripción de la fila por una que contemple `image`:

```tsx
          {item.type === "spacer" || item.type === "divider" || item.type === "image" ? (
            <p className={cn(
              "text-xs italic",
              config.mode === "appearing" && (item.type === "spacer" || item.type === "divider")
                ? "text-muted-foreground/50"
                : "text-muted-foreground",
            )}>
              {item.type === "spacer"
                ? "(espacio en blanco)"
                : item.type === "divider"
                  ? "(línea separadora)"
                  : item.imageSrc ? "(logo cargado)" : "(logo / imagen sin cargar)"}
              {config.mode === "appearing" && (item.type === "spacer" || item.type === "divider") && " — no se aplica en aparición"}
            </p>
          ) : (
            <p className="text-sm truncate">{item.text || <span className="text-muted-foreground italic">(vacío)</span>}</p>
          )}
```

- [ ] **Step 5: Añadir el panel de edición de `image`.** Tras el bloque `isSelected && item.type === "divider" && (...)` (cierra alrededor de la línea 415), insertar:

```tsx
      {isSelected && item.type === "image" && (
        <div className="border-t px-2 py-2 space-y-2 bg-muted/30" onClick={(e) => e.stopPropagation()}>
          {item.imageSrc && (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageSrc} alt="" className="h-12 w-auto max-w-[120px] rounded border object-contain bg-background" />
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-destructive"
                onClick={() => updateItem(item.id, { imageSrc: undefined })}>
                Quitar
              </Button>
            </div>
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              id={`logo-file-${item.id}`}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => updateItem(item.id, { imageSrc: String(reader.result) })
                reader.readAsDataURL(file)
                e.target.value = ""
              }}
            />
            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
              <label htmlFor={`logo-file-${item.id}`} className="cursor-pointer">
                {item.imageSrc ? "Cambiar imagen" : "Subir imagen"}
              </label>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Ancho %</span>
            <Input
              type="number" min={0} max={100} step={1}
              value={item.imageWidth ?? ""}
              placeholder={String(config.imageWidth)}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "") { updateItem(item.id, { imageWidth: undefined }); return }
                const n = Number(raw); if (Number.isNaN(n)) return
                updateItem(item.id, { imageWidth: Math.max(0, Math.min(100, n)) })
              }}
              className="h-7 w-24 text-sm"
            />
            <span className="text-[10px] text-muted-foreground">vacío = global</span>
          </div>
        </div>
      )}
```

- [ ] **Step 6: Añadir el slider de ancho global en `ConfigPanel.tsx`.** En la sección "Diseño", tras el bloque de color del separador (el `{config.dividerColor.trim() !== "" && (...)}` que cierra antes de `</Section>`), insertar:

```tsx
            <Separator />
            <Field label="Ancho del logo" hint={`${config.imageWidth}%`}>
              <Slider
                value={[config.imageWidth]}
                onValueChange={(v) => updateConfig({ imageWidth: v[0] })}
                min={0}
                max={100}
                step={1}
              />
            </Field>
```

- [ ] **Step 7: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 8: Verificación manual**

Menú de añadir: aparece "Logo / Imagen". Insertarlo, subir un PNG: se ve miniatura en el editor y la imagen en el preview (scroll y aparición). Ajustar "Ancho %" por item y el "Ancho del logo" global. Confirmar que el panel de un logo no muestra controles de texto.

- [ ] **Step 9: Commit**

```bash
git add src/components/credit/CreditEditor.tsx src/components/credit/ConfigPanel.tsx
git commit -m "feat: image upload editor panel and global logo width control"
```

---

### Task 7: Roundtrip de persistencia + suite completa

**Files:**
- Modify: `src/lib/credit/store.test.ts`

**Interfaces:**
- Consumes: `useCreditStore`, `DEFAULT_CONFIG`.
- Produces: nada nuevo.

- [ ] **Step 1: Añadir tests de roundtrip** dentro del bloque `describe("project import/export", ...)`, antes de su `})` de cierre:

```ts
  it("preserves per-item text overrides through export then import", () => {
    useCreditStore.setState({
      items: [
        { id: "a", type: "name", text: "A", fontSize: 50, color: "#ff0000", fontFamily: "'Roboto', sans-serif", letterSpacing: 3, lineHeight: 2 },
      ],
    })
    const json = useCreditStore.getState().exportProject()
    useCreditStore.setState({ items: [], config: { ...DEFAULT_CONFIG } })
    useCreditStore.getState().importProject(json)

    const it0 = useCreditStore.getState().items[0]
    expect(it0.fontSize).toBe(50)
    expect(it0.color).toBe("#ff0000")
    expect(it0.fontFamily).toBe("'Roboto', sans-serif")
    expect(it0.letterSpacing).toBe(3)
    expect(it0.lineHeight).toBe(2)
  })

  it("preserves image item fields and backfills imageWidth global", () => {
    useCreditStore.setState({
      items: [{ id: "img", type: "image", text: "", imageSrc: "data:image/png;base64,AAA", imageWidth: 80 }],
    })
    const json = useCreditStore.getState().exportProject()
    useCreditStore.setState({ items: [], config: { ...DEFAULT_CONFIG } })
    useCreditStore.getState().importProject(json)

    const it0 = useCreditStore.getState().items[0]
    expect(it0.type).toBe("image")
    expect(it0.imageSrc).toBe("data:image/png;base64,AAA")
    expect(it0.imageWidth).toBe(80)
    expect(useCreditStore.getState().config.imageWidth).toBe(DEFAULT_CONFIG.imageWidth)
  })
```

- [ ] **Step 2: Ejecutar y verificar que pasan**

Run: `pnpm exec vitest run src/lib/credit/store.test.ts`
Expected: PASS (todos, incluidos los 2 nuevos).

- [ ] **Step 3: Ejecutar toda la suite**

Run: `pnpm test:run`
Expected: PASS — 54 previos + 6 (`textStyle`) + 4 (`image`) + 2 (store) = 66.

- [ ] **Step 4: Commit**

```bash
git add src/lib/credit/store.test.ts
git commit -m "test: roundtrip per-item text overrides and image fields"
```

---

## Self-Review

**Spec coverage:**
- Campos de override de texto + reglas de borde → Task 1.
- `resolveTextStyle` consumido en los tres renderers (HUECO 5) → Task 2.
- UI de override de texto por item → Task 3.
- Tipo `image`, labels/icons record, default global, `resolveImageWidth` → Task 4.
- Render de imagen en scroll y aparición, unfilter en `getVisibleItems`, cortocircuito typewriter (HUECO 4) → Task 5.
- `TYPE_ICONS`/`ADD_MENU_TYPES` (HUECOS 1, 2), gating del panel (HUECO 3), fila resumen (HUECO 6), panel de subida, slider global → Task 6.
- Persistencia (backfill `imageWidth` ya cubierto por `mergePersistedConfig`) + roundtrip de campos nuevos → Task 7.
- Fuera de alcance (URL externa, reescalado, override de `fontWeight`, logo en appearing para spacer/divider): no implementado, correcto.

**Placeholder scan:** sin TBD/TODO; el `<data-url-o-url-de-prueba>` de Task 5 Step 7 es una verificación manual opcional y reversible, no código a commitear.

**Type consistency:** `resolveTextStyle`/`ResolvedTextStyle`, `resolveImageWidth`, campos `fontSize`/`color`/`fontFamily`/`letterSpacing`/`lineHeight`/`imageSrc`/`imageWidth`/`config.imageWidth` usados igual en types, módulos puros, renderers, editor y config. Tipo `image` en `CreditItemType`, `CREDIT_TYPE_LABELS`, `CREDIT_TYPE_ICONS`, `TYPE_ICONS`, `ADD_MENU_TYPES`.

**Nota de orden:** Task 2 elimina el uso de `getFontSize` en `AppearingCredits` (quitar del import si queda sin usar); Task 3 vuelve a importar `getFontSize` pero en `CreditEditor` (archivo distinto), sin conflicto.
