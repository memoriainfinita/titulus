# Espacios y separadores configurables + retirada de puntitos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer configurables el espacio (`spacer`) y el separador (`divider`) con defaults globales + override por item, y eliminar los puntitos de progreso del modo aparición.

**Architecture:** Campos planos opcionales en `CreditItem` (override) y nuevos defaults en `CreditConfig` (global), resueltos por un módulo puro `separators.ts` (override ?? global), consumido por `ScrollCredits`. Un `merge` custom en el `persist` de zustand rellena los nuevos campos de config para estados ya guardados. UI en `CreditEditor` (panel por item) y `ConfigPanel` (globales).

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand (+persist), Tailwind 4, shadcn/ui, Vitest 4 + happy-dom.

## Global Constraints

- Gestor de paquetes: pnpm. Tests: `pnpm test:run`.
- Override por item sigue el patrón existente de `pauseOverride`: campo plano opcional, `undefined`/vacío = hereda el global; valores negativos se ignoran (caen al global).
- Lógica pura testeada con Vitest; render JSX y UID quedan fuera del alcance unit (patrón del proyecto). Las tareas de UI se verifican con `pnpm exec tsc --noEmit` y revisión en navegador, no con Vitest.
- Sin emojis en código, copy ni commits.
- El divider hereda `config.textColor` cuando ni el override ni el global de color están definidos.

---

### Task 1: Tipos, defaults y módulo puro de resolución

**Files:**
- Modify: `src/lib/credit/types.ts`
- Create: `src/lib/credit/separators.ts`
- Test: `src/lib/credit/separators.test.ts`

**Interfaces:**
- Consumes: `CreditItem`, `CreditConfig` (de `types.ts`).
- Produces:
  - `type DividerStyle = "solid" | "dashed" | "dotted"`
  - `resolveSpacerHeight(item: CreditItem, config: CreditConfig): number`
  - `interface ResolvedDivider { thickness: number; width: number; opacity: number; style: DividerStyle; color: string }`
  - `resolveDivider(item: CreditItem, config: CreditConfig): ResolvedDivider`

- [ ] **Step 1: Añadir tipos y campos en `types.ts`**

Tras `export type AnimationType = ...` (línea ~24), añadir:

```ts
export type DividerStyle = "solid" | "dashed" | "dotted"
```

En `interface CreditItem`, tras `pauseOverride?: number`, añadir:

```ts
  // Spacer override: alto en px. undefined = hereda config.spacerHeight.
  spacerHeight?: number
  // Divider overrides. undefined = hereda el config.divider* correspondiente.
  dividerThickness?: number // px
  dividerWidth?: number // % del ancho del escenario
  dividerOpacity?: number // 0-1
  dividerStyle?: DividerStyle
  dividerColor?: string // vacío/undefined = hereda config.textColor
```

En `interface CreditConfig`, tras `paddingX: number` (sección Layout), añadir:

```ts
  // Spacer / Divider
  spacerHeight: number
  dividerThickness: number
  dividerWidth: number // percent
  dividerOpacity: number // 0-1
  dividerStyle: DividerStyle
  dividerColor: string // empty = inherit textColor
```

En `DEFAULT_CONFIG`, tras `paddingX: 80,`, añadir:

```ts
  spacerHeight: 48,
  dividerThickness: 1,
  dividerWidth: 60,
  dividerOpacity: 0.4,
  dividerStyle: "solid",
  dividerColor: "",
```

- [ ] **Step 2: Escribir el test que falla** en `src/lib/credit/separators.test.ts`

```ts
import { describe, it, expect } from "vitest"
import { resolveSpacerHeight, resolveDivider } from "./separators"
import { DEFAULT_CONFIG, CreditItem, CreditConfig } from "./types"

function cfg(patch: Partial<CreditConfig> = {}): CreditConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}
function spacer(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "s", type: "spacer", text: "", ...patch }
}
function divider(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "d", type: "divider", text: "", ...patch }
}

describe("resolveSpacerHeight", () => {
  it("uses the global height when no override", () => {
    expect(resolveSpacerHeight(spacer(), cfg({ spacerHeight: 48 }))).toBe(48)
  })
  it("uses the item override when set", () => {
    expect(resolveSpacerHeight(spacer({ spacerHeight: 120 }), cfg())).toBe(120)
  })
  it("allows an override of 0", () => {
    expect(resolveSpacerHeight(spacer({ spacerHeight: 0 }), cfg({ spacerHeight: 48 }))).toBe(0)
  })
  it("ignores a negative override and falls back to global", () => {
    expect(resolveSpacerHeight(spacer({ spacerHeight: -10 }), cfg({ spacerHeight: 48 }))).toBe(48)
  })
})

describe("resolveDivider", () => {
  it("inherits all global values when no overrides", () => {
    const r = resolveDivider(divider(), cfg({
      dividerThickness: 2, dividerWidth: 70, dividerOpacity: 0.5,
      dividerStyle: "dashed", dividerColor: "#ff0000",
    }))
    expect(r).toEqual({ thickness: 2, width: 70, opacity: 0.5, style: "dashed", color: "#ff0000" })
  })
  it("applies per-item overrides over globals", () => {
    const r = resolveDivider(
      divider({ dividerThickness: 4, dividerWidth: 100, dividerOpacity: 1, dividerStyle: "dotted", dividerColor: "#00ff00" }),
      cfg({ dividerThickness: 1, dividerColor: "#ff0000" }),
    )
    expect(r.thickness).toBe(4)
    expect(r.width).toBe(100)
    expect(r.opacity).toBe(1)
    expect(r.style).toBe("dotted")
    expect(r.color).toBe("#00ff00")
  })
  it("falls back to textColor when neither item nor global color is set", () => {
    const r = resolveDivider(divider(), cfg({ dividerColor: "", textColor: "#abcdef" }))
    expect(r.color).toBe("#abcdef")
  })
  it("uses the global divider color over textColor when set", () => {
    const r = resolveDivider(divider(), cfg({ dividerColor: "#123456", textColor: "#abcdef" }))
    expect(r.color).toBe("#123456")
  })
  it("treats a whitespace-only item color as unset", () => {
    const r = resolveDivider(divider({ dividerColor: "   " }), cfg({ dividerColor: "#123456" }))
    expect(r.color).toBe("#123456")
  })
})
```

- [ ] **Step 3: Ejecutar el test y verificar que falla**

Run: `pnpm exec vitest run src/lib/credit/separators.test.ts`
Expected: FAIL — no se puede resolver `./separators`.

- [ ] **Step 4: Implementar `src/lib/credit/separators.ts`**

```ts
// Pure resolution helpers for spacer/divider items.
// Override per item when set to a valid value, otherwise the global config value.
// Mirrors the resolveItemPause pattern in appearing.ts.

import { CreditItem, CreditConfig, DividerStyle } from "./types"

function resolveNumber(override: number | undefined, fallback: number): number {
  return typeof override === "number" && override >= 0 ? override : fallback
}

export function resolveSpacerHeight(item: CreditItem, config: CreditConfig): number {
  return resolveNumber(item.spacerHeight, config.spacerHeight)
}

export interface ResolvedDivider {
  thickness: number
  width: number
  opacity: number
  style: DividerStyle
  color: string
}

export function resolveDivider(item: CreditItem, config: CreditConfig): ResolvedDivider {
  const itemColor = item.dividerColor?.trim()
  const globalColor = config.dividerColor?.trim()
  const color = itemColor ? itemColor : globalColor ? globalColor : config.textColor
  return {
    thickness: resolveNumber(item.dividerThickness, config.dividerThickness),
    width: resolveNumber(item.dividerWidth, config.dividerWidth),
    opacity: resolveNumber(item.dividerOpacity, config.dividerOpacity),
    style: item.dividerStyle ?? config.dividerStyle,
    color,
  }
}
```

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

Run: `pnpm exec vitest run src/lib/credit/separators.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores nuevos (pueden persistir los preexistentes en `useVideoExport.ts`/`CreditPreview.tsx`/`examples`; no introducir nuevos).

- [ ] **Step 7: Commit**

```bash
git add src/lib/credit/types.ts src/lib/credit/separators.ts src/lib/credit/separators.test.ts
git commit -m "feat: add spacer/divider config fields and pure resolvers"
```

---

### Task 2: Migración de config persistido (`merge` en zustand persist)

**Files:**
- Modify: `src/lib/credit/store.ts`
- Test: `src/lib/credit/store.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_CONFIG`, `CreditConfig`, `CreditState` (de `store.ts`/`types.ts`).
- Produces: `mergePersistedConfig(persistedConfig: Partial<CreditConfig> | undefined): CreditConfig` — rellena claves de config ausentes desde `DEFAULT_CONFIG`. Usada por el `merge` del `persist`.

El cambio real es el `merge` del `persist` (rehidratación desde localStorage), que happy-dom no ejercita. Para tener un test que falle→pase de verdad, la lógica de merge se extrae a `mergePersistedConfig` y se testea directamente. Los tests de `importProject` se añaden como cobertura de integración adicional (preservación de overrides y backfill ya funcionan vía spread/merge existente).

- [ ] **Step 1: Escribir el test que falla** — añadir a `src/lib/credit/store.test.ts`. Primero, en el import de la línea 2-7 añadir `mergePersistedConfig`:

```ts
import {
  useCreditStore,
  getFontSize,
  getFontWeight,
  resolveAlignment,
  mergePersistedConfig,
} from "./store"
```

Luego añadir un nuevo bloque `describe` al final del archivo:

```ts
describe("mergePersistedConfig", () => {
  it("backfills missing keys from DEFAULT_CONFIG", () => {
    const merged = mergePersistedConfig({ scrollSpeed: 99 } as Partial<typeof DEFAULT_CONFIG>)
    expect(merged.scrollSpeed).toBe(99)
    expect(merged.spacerHeight).toBe(DEFAULT_CONFIG.spacerHeight)
    expect(merged.dividerStyle).toBe(DEFAULT_CONFIG.dividerStyle)
    expect(merged.dividerColor).toBe(DEFAULT_CONFIG.dividerColor)
  })

  it("returns full defaults when given undefined", () => {
    expect(mergePersistedConfig(undefined)).toEqual(DEFAULT_CONFIG)
  })
})
```

Y, como cobertura de integración, añadir dentro del bloque `describe("project import/export", ...)` antes de su `})` de cierre (línea 167):

```ts
  it("preserves new spacer/divider item overrides through export then import", () => {
    useCreditStore.setState({
      items: [
        { id: "s", type: "spacer", text: "", spacerHeight: 120 },
        { id: "d", type: "divider", text: "", dividerThickness: 4, dividerWidth: 100, dividerOpacity: 0.8, dividerStyle: "dashed", dividerColor: "#ff0000" },
      ],
    })
    const json = useCreditStore.getState().exportProject()
    useCreditStore.setState({ items: [], config: { ...DEFAULT_CONFIG } })
    useCreditStore.getState().importProject(json)

    const { items } = useCreditStore.getState()
    expect(items[0].spacerHeight).toBe(120)
    expect(items[1].dividerStyle).toBe("dashed")
    expect(items[1].dividerColor).toBe("#ff0000")
  })
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm exec vitest run src/lib/credit/store.test.ts`
Expected: FAIL — `mergePersistedConfig` no existe / no exportada.

- [ ] **Step 3: Implementar `mergePersistedConfig` y usarla en el `merge` del `persist`** en `src/lib/credit/store.ts`.

Añadir la función exportada al final del archivo (junto a `getFontSize`/`resolveAlignment`):

```ts
// Merge a persisted (possibly older) config over the current defaults, so
// config keys added after a user's state was first saved are backfilled.
export function mergePersistedConfig(
  persistedConfig: Partial<CreditConfig> | undefined,
): CreditConfig {
  return { ...DEFAULT_CONFIG, ...(persistedConfig ?? {}) }
}
```

En el objeto de opciones del `persist` (donde están `name` y `partialize`, líneas ~280-288), añadir tras `partialize`:

```ts
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CreditState>
        return { ...current, ...p, config: mergePersistedConfig(p.config) }
      },
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm exec vitest run src/lib/credit/store.test.ts`
Expected: PASS (todos, incluidos los 3 nuevos).

- [ ] **Step 5: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 6: Commit**

```bash
git add src/lib/credit/store.ts src/lib/credit/store.test.ts
git commit -m "fix: backfill new config keys on persist rehydration"
```

---

### Task 3: Render configurable de spacer/divider en scroll

**Files:**
- Modify: `src/components/credit/ScrollCredits.tsx` (función `CreditLine`, líneas 51-92)

**Interfaces:**
- Consumes: `resolveSpacerHeight`, `resolveDivider` (de Task 1).
- Produces: nada nuevo. Cambia solo el render de `CreditLine`.

- [ ] **Step 1: Importar los resolvers**. Tras la línea de import de `scroll` helpers cerca del top de `ScrollCredits.tsx`, añadir:

```ts
import { resolveSpacerHeight, resolveDivider } from "@/lib/credit/separators"
```

- [ ] **Step 2: Sustituir el render de spacer** (línea 53-54) por:

```tsx
  if (item.type === "spacer") {
    return <div style={{ height: `${resolveSpacerHeight(item, config)}px` }} aria-hidden />
  }
```

- [ ] **Step 3: Sustituir el render de divider** (líneas 56-78) por:

```tsx
  if (item.type === "divider") {
    const align = resolveAlignment(item, config)
    const d = resolveDivider(item, config)
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
        <div
          style={{
            width: `${d.width}%`,
            borderTopWidth: `${d.thickness}px`,
            borderTopStyle: d.style,
            borderTopColor: d.color,
            opacity: d.opacity,
          }}
        />
      </div>
    )
  }
```

- [ ] **Step 4: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 5: Verificación manual en navegador**

Arrancar `pnpm dev`, modo scroll. Comprobar: spacer responde a su alto; divider responde a grosor/ancho/opacidad/estilo/color (tras implementar la UI en Tasks 5-6, con valores por defecto debe verse igual que antes: 60% ancho, 1px, opacidad 0.4, color de texto). Sin UI todavía, verificar al menos que el divider por defecto se ve como antes.

- [ ] **Step 6: Commit**

```bash
git add src/components/credit/ScrollCredits.tsx
git commit -m "feat: render configurable spacer height and divider style in scroll"
```

---

### Task 4: Eliminar los puntitos de progreso en aparición

**Files:**
- Modify: `src/components/credit/AppearingCredits.tsx` (líneas 344-357)

**Interfaces:**
- Consumes: nada nuevo.
- Produces: nada. Retirada de markup.

- [ ] **Step 1: Eliminar el bloque "Progress indicator"** — borrar por completo las líneas 344-357:

```tsx
      {/* Progress indicator (subtle dots at bottom) */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 z-20 opacity-30">
        {visibleItems.slice(0, 30).map((item, i) => (
          <div
            key={item.id}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{
              backgroundColor: config.textColor,
              opacity: i === currentIndex ? 1 : 0.3,
              transform: i === currentIndex ? "scale(1.4)" : "scale(1)",
            }}
          />
        ))}
      </div>
```

Dejar el `</div>` de cierre del contenedor y el `)` y `}` finales de la función intactos.

- [ ] **Step 2: Verificar que `currentIndex` sigue usándose**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores. Si `currentIndex` quedara sin usar y diera warning de lint, comprobar primero: se usa en el efecto de `manualProgress` y en el avance por timing (líneas ~150-229), así que debe seguir referenciado. No eliminar `currentIndex`.

- [ ] **Step 3: Verificación manual**

Modo aparición en navegador: ya no aparecen los puntitos al pie. Exportar un clip corto y confirmar que el MP4 no los incluye.

- [ ] **Step 4: Commit**

```bash
git add src/components/credit/AppearingCredits.tsx
git commit -m "feat: remove progress dots from appearing mode"
```

---

### Task 5: Panel de edición por item (spacer/divider) + atenuado en aparición

**Files:**
- Modify: `src/components/credit/CreditEditor.tsx`

**Interfaces:**
- Consumes: `config` y `updateItem` del store (ya usados en `ItemRow`); `DividerStyle` de types.
- Produces: nada exportado nuevo.

- [ ] **Step 1: Importar `DividerStyle` y los Select** en `CreditEditor.tsx`. En el import de types (línea 26) añadir `DividerStyle`:

```ts
import { CreditItem, CreditItemType, CREDIT_TYPE_LABELS, Alignment, DividerStyle } from "@/lib/credit/types"
```

`Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` ya están importados (líneas 32-38).

- [ ] **Step 2: Atenuar la fila spacer/divider en modo aparición.** Sustituir el bloque de descripción de la fila (líneas 116-122) por:

```tsx
          {item.type === "spacer" || item.type === "divider" ? (
            <p className={cn(
              "text-xs italic",
              config.mode === "appearing" ? "text-muted-foreground/50" : "text-muted-foreground",
            )}>
              {item.type === "spacer" ? "(espacio en blanco)" : "(línea separadora)"}
              {config.mode === "appearing" && " — no se aplica en aparición"}
            </p>
          ) : (
            <p className="text-sm truncate">{item.text || <span className="text-muted-foreground italic">(vacío)</span>}</p>
          )}
```

- [ ] **Step 3: Añadir el panel de edición de spacer/divider.** Tras el bloque `isSelected && item.type !== "spacer" && item.type !== "divider" && (...)` (termina en línea 286, justo antes del `)}` que cierra `ItemRow`'s return wrapper), insertar un nuevo bloque:

```tsx
      {isSelected && item.type === "spacer" && (
        <div className="border-t px-2 py-2 space-y-2 bg-muted/30" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Alto (px)</span>
            <Input
              type="number"
              min={0}
              step={4}
              value={item.spacerHeight ?? ""}
              placeholder={String(config.spacerHeight)}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "") { updateItem(item.id, { spacerHeight: undefined }); return }
                const n = Number(raw)
                if (Number.isNaN(n)) return
                updateItem(item.id, { spacerHeight: Math.max(0, n) })
              }}
              className="h-7 w-24 text-sm"
            />
            <span className="text-[10px] text-muted-foreground">vacío = global</span>
          </div>
        </div>
      )}

      {isSelected && item.type === "divider" && (
        <div className="border-t px-2 py-2 space-y-2 bg-muted/30" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Grosor</span>
              <Input
                type="number" min={0} step={1}
                value={item.dividerThickness ?? ""}
                placeholder={String(config.dividerThickness)}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === "") { updateItem(item.id, { dividerThickness: undefined }); return }
                  const n = Number(raw); if (Number.isNaN(n)) return
                  updateItem(item.id, { dividerThickness: Math.max(0, n) })
                }}
                className="h-7 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Ancho %</span>
              <Input
                type="number" min={0} max={100} step={1}
                value={item.dividerWidth ?? ""}
                placeholder={String(config.dividerWidth)}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === "") { updateItem(item.id, { dividerWidth: undefined }); return }
                  const n = Number(raw); if (Number.isNaN(n)) return
                  updateItem(item.id, { dividerWidth: Math.max(0, Math.min(100, n)) })
                }}
                className="h-7 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Opacidad</span>
              <Input
                type="number" min={0} max={1} step={0.05}
                value={item.dividerOpacity ?? ""}
                placeholder={String(config.dividerOpacity)}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === "") { updateItem(item.id, { dividerOpacity: undefined }); return }
                  const n = Number(raw); if (Number.isNaN(n)) return
                  updateItem(item.id, { dividerOpacity: Math.max(0, Math.min(1, n)) })
                }}
                className="h-7 text-sm"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Estilo</span>
            <Select
              value={item.dividerStyle ?? "__global"}
              onValueChange={(v) =>
                updateItem(item.id, { dividerStyle: v === "__global" ? undefined : (v as DividerStyle) })
              }
            >
              <SelectTrigger className="h-7 text-sm flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__global">(global)</SelectItem>
                <SelectItem value="solid">Sólida</SelectItem>
                <SelectItem value="dashed">Discontinua</SelectItem>
                <SelectItem value="dotted">Punteada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Color</span>
            <Input
              value={item.dividerColor ?? ""}
              placeholder="vacío = global / texto"
              onChange={(e) => {
                const raw = e.target.value
                updateItem(item.id, { dividerColor: raw === "" ? undefined : raw })
              }}
              className="h-7 flex-1 font-mono text-xs"
            />
          </div>
        </div>
      )}
```

- [ ] **Step 4: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 5: Verificación manual**

Seleccionar un spacer: aparece "Alto (px)" con placeholder = global. Seleccionar un divider: aparecen grosor/ancho/opacidad/estilo/color; los cambios se reflejan en el preview de scroll. En modo aparición, las filas spacer/divider se ven atenuadas con la nota.

- [ ] **Step 6: Commit**

```bash
git add src/components/credit/CreditEditor.tsx
git commit -m "feat: per-item spacer/divider editor and dimmed rows in appearing"
```

---

### Task 6: Controles globales en ConfigPanel

**Files:**
- Modify: `src/components/credit/ConfigPanel.tsx` (sección "Diseño", tras "Padding horizontal", líneas 441-449)

**Interfaces:**
- Consumes: `config`, `updateConfig` (ya usados); componentes `Slider`, `Select`, `Switch`, `ColorInput`, `Field` ya definidos en el archivo; `DividerStyle` de types.
- Produces: nada exportado nuevo.

- [ ] **Step 1: Importar `DividerStyle`.** En la línea 19, añadir `DividerStyle`:

```ts
import { CreditConfig, AnimationType, CreditMode, Alignment, DividerStyle } from "@/lib/credit/types"
```

- [ ] **Step 2: Añadir los controles globales** dentro de `<Section title="Diseño" ...>`, tras el `<Field label="Padding horizontal" ...>` (cierra en línea 449) y antes del `</Section>`:

```tsx
            <Separator />
            <Field label="Alto del espacio" hint={`${config.spacerHeight}px`}>
              <Slider
                value={[config.spacerHeight]}
                onValueChange={(v) => updateConfig({ spacerHeight: v[0] })}
                min={0}
                max={300}
                step={2}
              />
            </Field>
            <Field label="Grosor del separador" hint={`${config.dividerThickness}px`}>
              <Slider
                value={[config.dividerThickness]}
                onValueChange={(v) => updateConfig({ dividerThickness: v[0] })}
                min={0}
                max={20}
                step={1}
              />
            </Field>
            <Field label="Ancho del separador" hint={`${config.dividerWidth}%`}>
              <Slider
                value={[config.dividerWidth]}
                onValueChange={(v) => updateConfig({ dividerWidth: v[0] })}
                min={0}
                max={100}
                step={1}
              />
            </Field>
            <Field label="Opacidad del separador" hint={`${config.dividerOpacity.toFixed(2)}`}>
              <Slider
                value={[config.dividerOpacity * 100]}
                onValueChange={(v) => updateConfig({ dividerOpacity: v[0] / 100 })}
                min={0}
                max={100}
                step={5}
              />
            </Field>
            <Field label="Estilo del separador">
              <Select
                value={config.dividerStyle}
                onValueChange={(v) => updateConfig({ dividerStyle: v as DividerStyle })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Sólida</SelectItem>
                  <SelectItem value="dashed">Discontinua</SelectItem>
                  <SelectItem value="dotted">Punteada</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Heredar color del texto</Label>
              <Switch
                checked={config.dividerColor.trim() === ""}
                onCheckedChange={(on) =>
                  updateConfig({ dividerColor: on ? "" : (config.textColor || "#ffffff") })
                }
              />
            </div>
            {config.dividerColor.trim() !== "" && (
              <Field label="Color del separador">
                <ColorInput
                  value={config.dividerColor}
                  onChange={(v) => updateConfig({ dividerColor: v })}
                  label="Separador"
                />
              </Field>
            )}
```

- [ ] **Step 3: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Verificación manual**

En la sección "Diseño" aparecen los nuevos sliders y selects. Cambiar el alto del espacio y el estilo/grosor/ancho/opacidad del separador se refleja en el preview de scroll. El switch "Heredar color del texto": apagado muestra el `ColorInput`; encendido vuelve a heredar.

- [ ] **Step 5: Ejecutar toda la suite**

Run: `pnpm test:run`
Expected: PASS — los 42 previos + 9 de separators + 3 nuevos de store (2 de `mergePersistedConfig` + 1 roundtrip de overrides) = 54.

- [ ] **Step 6: Commit**

```bash
git add src/components/credit/ConfigPanel.tsx
git commit -m "feat: global spacer/divider controls in config panel"
```

---

## Self-Review

**Spec coverage:**
- Tipos + defaults → Task 1.
- Módulo puro de resolución (`resolveSpacerHeight`, `resolveDivider`) → Task 1.
- Persistencia/migración (`merge`) → Task 2.
- Render scroll (borderTop para dashed/dotted) → Task 3.
- Retirada de puntitos → Task 4.
- Editor por item + atenuado en aparición → Task 5.
- Config global + switch de color heredado → Task 6.
- Tests separators + roundtrip/backfill store → Tasks 1 y 2.
- Fuera de alcance (carácter decorativo, spacer/divider en appearing, toggle de puntitos): no implementado, correcto.

**Nombres y tipos consistentes:** `DividerStyle`, `resolveSpacerHeight`, `resolveDivider`, `ResolvedDivider`, campos `spacerHeight`/`dividerThickness`/`dividerWidth`/`dividerOpacity`/`dividerStyle`/`dividerColor` usados igual en types, separators, store, ScrollCredits, CreditEditor y ConfigPanel.

**Notas:** El spec sugería el nombre `resolveDividerStyle`; el plan usa `resolveDivider` (devuelve el objeto completo, no solo el estilo) por claridad. Sin otros placeholders ni TODOs.
