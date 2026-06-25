# Inspector contextual + lista pura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el panel derecho en un inspector contextual (global sin selección, propiedades del item con selección), dejar el panel izquierdo como lista pura con inserción en hueco, y sincronizar selección/reproducción con la línea de tiempo (seek por doble clic + resalte del item activo derivado de la geometría real).

**Architecture:** Reubicación de UI sin tocar la lógica de resolvers. La selección y la reproducción se comunican por la store (`selectedItemId`, `seekTarget`, `activeItemId`). El seek y el resalte en scroll derivan de offsets por item medidos en `ScrollCredits` y reportados a `CreditPreview`, vía helpers puros nuevos en `scroll.ts`. En aparición, el índice activo lo da `onIndexChange` sobre `getVisibleItems`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand (persist), Tailwind 4, shadcn/ui, framer-motion, Vitest 4 + happy-dom.

## Global Constraints

- Gestor de paquetes: `pnpm`. Tests: `pnpm test:run`. Type-check: `pnpm exec tsc --noEmit`. Build: `pnpm build`.
- La lógica de override (resolvers en `appearing.ts`, `separators.ts`, `textStyle.ts`, `text-shadow.ts`, `text-blur.ts`, `image.ts`) NO se modifica.
- Los campos efímeros de UI no se persisten: `partialize` (store.ts:313-319) es whitelist; basta con NO añadirlos.
- Convención de override existente: `undefined`/vacío = hereda el global; valores numéricos `0` y negativos válidos donde el campo lo admite.
- Sin emojis en código ni en mensajes de commit. Commits en inglés.
- Suite actual: 151 tests verdes. Cada tarea de lógica añade tests; las de UI mantienen la suite verde y se verifican con tsc + build + navegador.

---

### Task 1: Store — placeholder de texto + canales seek/active

**Files:**
- Modify: `src/lib/credit/store.ts:17-63` (interface), `:163-189` (addItem), `:148-161` (estado inicial), añadir acciones
- Test: `src/lib/credit/store.test.ts`

**Interfaces:**
- Produces:
  - `addItem(type: CreditItemType, text?: string, index?: number): void` — sin texto → placeholder del tipo; con `index` inserta antes de esa posición; auto-selecciona el nuevo.
  - `seekTarget: { id: string; nonce: number } | null`
  - `requestSeek(id: string): void` — incrementa `nonce`.
  - `activeItemId: string | null`
  - `setActiveItem(id: string | null): void` — no-op si no cambia.

- [ ] **Step 1: Write the failing tests**

En `src/lib/credit/store.test.ts`, añadir:

```ts
import { useCreditStore } from "./store"

function freshStore() {
  useCreditStore.setState({ items: [], selectedItemId: null, seekTarget: null, activeItemId: null })
}

test("addItem sin texto usa el placeholder del tipo y selecciona", () => {
  freshStore()
  useCreditStore.getState().addItem("title")
  const { items, selectedItemId } = useCreditStore.getState()
  expect(items).toHaveLength(1)
  expect(items[0].text).toBe("Nuevo título")
  expect(selectedItemId).toBe(items[0].id)
})

test("addItem con index inserta antes de esa posición", () => {
  freshStore()
  const s = useCreditStore.getState()
  s.addItem("name") // idx0
  s.addItem("role") // idx1
  const firstId = useCreditStore.getState().items[0].id
  useCreditStore.getState().addItem("subtitle", undefined, 1)
  const items = useCreditStore.getState().items
  expect(items.map((i) => i.type)).toEqual(["name", "subtitle", "role"])
  expect(items[0].id).toBe(firstId)
  expect(useCreditStore.getState().selectedItemId).toBe(items[1].id)
})

test("addItem con index 0 inserta al principio y con index=length al final", () => {
  freshStore()
  const s = useCreditStore.getState()
  s.addItem("name")
  s.addItem("name", undefined, 0)
  s.addItem("role", undefined, useCreditStore.getState().items.length)
  expect(useCreditStore.getState().items.map((i) => i.type)).toEqual(["name", "name", "role"])
})

test("requestSeek fija id e incrementa nonce", () => {
  freshStore()
  useCreditStore.getState().requestSeek("abc")
  expect(useCreditStore.getState().seekTarget).toEqual({ id: "abc", nonce: 1 })
  useCreditStore.getState().requestSeek("abc")
  expect(useCreditStore.getState().seekTarget).toEqual({ id: "abc", nonce: 2 })
})

test("setActiveItem no crea objeto nuevo si no cambia", () => {
  freshStore()
  useCreditStore.getState().setActiveItem("x")
  const before = useCreditStore.getState()
  useCreditStore.getState().setActiveItem("x")
  expect(useCreditStore.getState()).toBe(before)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/lib/credit/store.test.ts`
Expected: FAIL (placeholder vacío en addItem; `requestSeek`/`setActiveItem`/`seekTarget`/`activeItemId` no existen).

- [ ] **Step 3: Implement**

En `store.ts`, añadir al interface `CreditState` (junto a `selectedItemId`):

```ts
  seekTarget: { id: string; nonce: number } | null
  activeItemId: string | null
```

y entre las Actions:

```ts
  requestSeek: (id: string) => void
  setActiveItem: (id: string | null) => void
```

En el estado inicial (junto a `selectedItemId: null`):

```ts
      seekTarget: null,
      activeItemId: null,
```

Reemplazar `addItem` (store.ts:163-189) por:

```ts
      addItem: (type, text, index) => {
        const placeholder =
          type === "title"
            ? "Nuevo título"
            : type === "subtitle"
              ? "Nuevo subtítulo"
              : type === "name"
                ? "Nombre Apellido"
                : type === "role"
                  ? "Cargo"
                  : type === "description"
                    ? "Descripción del rol o detalle"
                    : ""
        const newItem: CreditItem = { id: uuid(), type, text: text ?? placeholder }
        set((state) => {
          if (index === undefined) {
            return { items: [...state.items, newItem], selectedItemId: newItem.id }
          }
          const newItems = [...state.items]
          newItems.splice(index, 0, newItem)
          return { items: newItems, selectedItemId: newItem.id }
        })
      },
```

Añadir las acciones nuevas (junto a `selectItem`):

```ts
      requestSeek: (id) =>
        set((s) => ({ seekTarget: { id, nonce: (s.seekTarget?.nonce ?? 0) + 1 } })),

      setActiveItem: (id) =>
        set((s) => (s.activeItemId === id ? s : { activeItemId: id })),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run src/lib/credit/store.test.ts`
Expected: PASS (todas, incluidas las preexistentes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/credit/store.ts src/lib/credit/store.test.ts
git commit -m "feat: store seek/active channels and addItem placeholder fix"
```

---

### Task 2: scroll.ts — geometría item↔progreso

**Files:**
- Modify: `src/lib/credit/scroll.ts` (añadir helpers al final)
- Test: `src/lib/credit/scroll.test.ts`

**Interfaces:**
- Consumes: `getScrollTotalDistance`, `getScrollTranslateY` (ya en scroll.ts).
- Produces:
  - `scrollProgressForItem(itemTop, itemHeight, contentHeight, containerHeight, direction, refFraction): number` — progreso 0-1 que sitúa el centro del item en la línea de referencia.
  - `activeItemIndexAtProgress(offsets, contentHeight, containerHeight, direction, progress, refFraction): number` — índice del item activo; `-1` si `offsets` vacío. `offsets: { top: number; height: number }[]`.

- [ ] **Step 1: Write the failing tests**

En `src/lib/credit/scroll.test.ts`, añadir:

```ts
import { scrollProgressForItem, activeItemIndexAtProgress } from "./scroll"

// Geometría: contentHeight 1000, containerHeight 200, total = 1200, ref center = 100.
test("scrollProgressForItem centra el item en la línea de referencia (up)", () => {
  // item top=400 height=100 -> center 450. up: p=(200+450-100)/1200
  const p = scrollProgressForItem(400, 100, 1000, 200, "up", 0.5)
  expect(p).toBeCloseTo((200 + 450 - 100) / 1200, 5)
})

test("scrollProgressForItem clamp a [0,1]", () => {
  expect(scrollProgressForItem(-9999, 0, 1000, 200, "up", 0.5)).toBe(0)
  expect(scrollProgressForItem(9999, 0, 1000, 200, "up", 0.5)).toBe(1)
})

test("activeItemIndexAtProgress: -1 si no hay items", () => {
  expect(activeItemIndexAtProgress([], 1000, 200, "up", 0.5, 0.5)).toBe(-1)
})

test("activeItemIndexAtProgress: item cuyo top ya pasó la referencia (up)", () => {
  const offsets = [
    { top: 0, height: 100 },
    { top: 100, height: 100 },
    { top: 200, height: 100 },
  ]
  // progreso tal que el centrado sea el item 1 (top 100): usar su progreso de seek
  const p = scrollProgressForItem(100, 100, 1000, 200, "up", 0.5)
  expect(activeItemIndexAtProgress(offsets, 1000, 200, "up", p, 0.5)).toBe(1)
})

test("activeItemIndexAtProgress: antes del primero devuelve 0", () => {
  const offsets = [{ top: 500, height: 100 }, { top: 700, height: 100 }]
  expect(activeItemIndexAtProgress(offsets, 1000, 200, "up", 0, 0.5)).toBe(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/lib/credit/scroll.test.ts`
Expected: FAIL ("scrollProgressForItem is not a function").

- [ ] **Step 3: Implement**

Añadir al final de `src/lib/credit/scroll.ts`:

```ts
// Progress (0..1) that places the item's center on the reference line.
// refFraction is the fraction of containerHeight for the line (0.5 = center).
export function scrollProgressForItem(
  itemTop: number,
  itemHeight: number,
  contentHeight: number,
  containerHeight: number,
  direction: ScrollDirection,
  refFraction: number,
): number {
  const total = getScrollTotalDistance(contentHeight, containerHeight)
  if (total <= 0) return 0
  const ref = refFraction * containerHeight
  const center = itemTop + itemHeight / 2
  // up:   translateY = containerHeight - p*total ; screenCenter = translateY + center = ref
  // down: translateY = -contentHeight + p*total  ; screenCenter = translateY + center = ref
  const p =
    direction === "up"
      ? (containerHeight + center - ref) / total
      : (ref + contentHeight - center) / total
  return Math.min(1, Math.max(0, p))
}

// Index of the item currently at/above the reference line: the last item whose
// on-screen top edge has passed the line. Monotonic in progress (no flicker).
// Returns -1 for empty input; clamps to the first item before anything crosses.
export function activeItemIndexAtProgress(
  offsets: { top: number; height: number }[],
  contentHeight: number,
  containerHeight: number,
  direction: ScrollDirection,
  progress: number,
  refFraction: number,
): number {
  if (offsets.length === 0) return -1
  const translateY = getScrollTranslateY(contentHeight, containerHeight, direction, progress)
  const ref = refFraction * containerHeight
  let active = 0
  for (let i = 0; i < offsets.length; i++) {
    const screenTop = translateY + offsets[i].top
    if (screenTop <= ref) active = i
    else break
  }
  return active
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run src/lib/credit/scroll.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/credit/scroll.ts src/lib/credit/scroll.test.ts
git commit -m "feat: pure scroll geometry helpers for item seek and active index"
```

---

### Task 3: Reorganizar la config global en secciones

**Files:**
- Modify: `src/components/credit/ConfigPanel.tsx:195-624` (cuerpo de secciones)

No hay test unitario (UI). Reubicación de bloques entre `<Section>`.

**Interfaces:** ninguna nueva.

- [ ] **Step 1: Mover el ratio a una sección "Escenario"**

En `ConfigPanel.tsx`, dentro de la `Section title="Modo de crédito"` (197-248), CORTAR el `<Field label="Formato del escenario">` (228-247). Crear una nueva `Section` ANTES de "Modo de crédito":

```tsx
          {/* STAGE */}
          <Section title="Escenario" icon={Layout}>
            <Field label="Formato del escenario">
              {/* (pegar aquí el <Select> de stageRatio cortado de "Modo de crédito") */}
            </Field>
          </Section>
```

La `Section "Modo de crédito"` queda solo con el `<Field label="Estilo de presentación">`.

- [ ] **Step 2: Extraer "Separadores" e "Imágenes" de "Diseño"**

En la `Section title="Diseño"` (509-624), CORTAR:
- El bloque de separadores: `<Separator />` + "Alto del espacio" + los 5 campos de divider + "Heredar color del texto" + "Color del separador" condicional (547-613).
- El bloque de logo: `<Separator />` + "Ancho del logo" (614-623).

"Diseño" conserva: alineación global, espaciado entre items, padding horizontal (510-545).

Crear DESPUÉS de "Diseño" dos secciones nuevas:

```tsx
          {/* SEPARATORS */}
          <Section title="Separadores" icon={Minus}>
            {/* pegar aquí: "Alto del espacio", grosor/ancho/opacidad/estilo del divider,
                "Heredar color del texto" y "Color del separador" condicional */}
          </Section>

          {/* IMAGES */}
          <Section title="Imágenes" icon={ImageIcon}>
            {/* pegar aquí: "Ancho del logo" */}
          </Section>
```

Añadir los iconos a los imports de `lucide-react` en ConfigPanel.tsx: `Minus`, `Image as ImageIcon`.

- [ ] **Step 3: Verificar**

Run:
```bash
pnpm exec tsc --noEmit && pnpm build
```
Expected: type-check y build limpios.

Navegador: en la config global aparecen, en orden, Escenario / Modo de crédito / Tipografía / Colores y fondo / Efectos / Diseño / Separadores / Imágenes / Animación. Todos los controles funcionan igual que antes.

- [ ] **Step 4: Commit**

```bash
git add src/components/credit/ConfigPanel.tsx
git commit -m "refactor: reorganize global config into Escenario/Separadores/Imagenes sections"
```

---

### Task 4: Inspector contextual — split de ConfigPanel y traslado de controles

**Files:**
- Create: `src/components/credit/ItemInspector.tsx`
- Modify: `src/components/credit/ConfigPanel.tsx` (renombrar export del cuerpo a `GlobalConfig`, añadir `InspectorPanel`)
- Modify: `src/components/credit/CreditEditor.tsx` (quitar los paneles expandibles del item)
- Modify: `src/app/page.tsx:11,73` (import + render)

**Interfaces:**
- Consumes: `useCreditStore` (`selectedItemId`, `items`, `config`, `updateItem`, `fonts`), `getFontSize`.
- Produces:
  - `InspectorPanel()` — componente que reemplaza a `ConfigPanel` en page.tsx.
  - `GlobalConfig()` — la config global (antiguo cuerpo de `ConfigPanel`).
  - `ItemInspector({ item }: { item: CreditItem })`.

- [ ] **Step 1: Crear ItemInspector con los controles del item**

Crear `src/components/credit/ItemInspector.tsx`. MOVER VERBATIM desde `CreditEditor.tsx` los componentes `AnimationOverrides` (101-227) y `ShadowOverrides` (229-356) a este archivo (sin cambios de lógica). Añadir un componente `ItemInspector` que reproduce, por tipo, los paneles que hoy viven en `ItemRow` (CreditEditor.tsx):
- Texto (title/subtitle/name/role/description): el bloque `isSelected && item.type !== spacer/divider/image` (509-766) — campo de texto, botones B/I/AA/alineación, "Pausa (s)" (solo aparición), "Desenfoque (px)", el grupo Tamaño/Color/Fuente/Interletra/Interlínea/Peso/No envolver/Ancho caja, `<ShadowOverrides>`, `<AnimationOverrides>` (solo aparición).
- spacer: el bloque `item.type === "spacer"` (768-790).
- divider: el bloque `item.type === "divider"` (792-890).
- image: el bloque `item.type === "image"` (892-945).

Estructura de `ItemInspector` (las cabeceras de grupo se mantienen; añadir cabecera "Estilo de texto" al grupo que hoy no la tiene, 624):

```tsx
export function ItemInspector({ item }: { item: CreditItem }) {
  const { updateItem, config, fonts } = useCreditStore()
  // ... handlers idénticos a los de ItemRow (toggleBold, setAlign, etc.)
  // Render por tipo, reutilizando el JSX movido desde CreditEditor.
}
```

Los handlers (`toggleBold`, `toggleItalic`, `toggleUppercase`, `setAlign`) y los `onChange` numéricos se copian tal cual desde `ItemRow`. Quitar los `onClick={(e) => e.stopPropagation()}` que existían solo porque la fila era clicable; en el inspector no hacen daño pero son innecesarios (dejarlos no es error). Importar `getFontSize` de `@/lib/credit/store` y `resolveDivider` de `@/lib/credit/separators` (usados en los placeholders de color/divider).

- [ ] **Step 2: Convertir ConfigPanel en InspectorPanel + GlobalConfig**

En `ConfigPanel.tsx`:
- Renombrar la función `ConfigPanel` a `GlobalConfig` (mismo cuerpo).
- Añadir:

```tsx
import { ItemInspector } from "./ItemInspector"

export function InspectorPanel() {
  const { selectedItemId, items } = useCreditStore()
  const item = selectedItemId ? items.find((i) => i.id === selectedItemId) : undefined
  const [showGlobal, setShowGlobal] = React.useState(false)

  // Al cambiar de item, volver a la vista de item.
  React.useEffect(() => { setShowGlobal(false) }, [selectedItemId])

  const viewingItem = item && !showGlobal
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          {viewingItem ? CREDIT_TYPE_LABELS[item.type] : "Configuración"}
        </h3>
        {item && (
          <Button size="sm" variant="ghost" className="h-7 text-xs"
            onClick={() => setShowGlobal((v) => !v)}>
            {showGlobal ? "Ver item" : "Ver global"}
          </Button>
        )}
      </div>
      {viewingItem ? (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3"><ItemInspector item={item} /></div>
        </ScrollArea>
      ) : (
        <GlobalConfig />
      )}
    </div>
  )
}
```

Importar `CREDIT_TYPE_LABELS` de `@/lib/credit/types`. `GlobalConfig` ya no necesita su propia cabecera "Configuración" con el botón Reset: mantenerla DENTRO de `GlobalConfig` (el Reset sigue siendo de la global), pero quitar su `<h3>Configuración</h3>` duplicado dejando solo el botón Reset, o conservarlo (no rompe). Recomendado: mantener el Reset en `GlobalConfig` y dejar el título de la global en su sitio; la cabecera de `InspectorPanel` muestra el contexto.

- [ ] **Step 3: Adelgazar ItemRow en CreditEditor**

En `CreditEditor.tsx`, BORRAR de `ItemRow` los cuatro bloques expandibles (509-945): el panel de texto, el de spacer, el de divider y el de image. BORRAR los componentes `AnimationOverrides` y `ShadowOverrides` (movidos en Step 1) y sus imports ahora sin uso. La fila conserva: grip draggable, icono, label de tipo, badges (B/I/AA/align/pausa), preview de texto/descriptor, y los botones de acción (mover/duplicar/borrar). `isSelected` solo cambia el estilo del borde (ya existe en 378-382). Mantener `onClick={onSelect}` y los handlers de drag.

Limpiar imports de `CreditEditor.tsx` que queden sin uso (p. ej. `Input`, `Textarea`, `Switch`, `Select*`, `Bold`, `Italic`, iconos de alineación, `getFontSize`, `resolveDivider`, `resolveAnimationType`, `CreditConfig`, `DividerStyle`, `AnimationType`). Verificar con tsc cuáles sobran.

- [ ] **Step 4: Cablear page.tsx**

En `src/app/page.tsx`:
- Línea 11: `import { ConfigPanel, PresetBar } from "@/components/credit/ConfigPanel"` → `import { InspectorPanel, PresetBar } from "@/components/credit/ConfigPanel"`.
- Línea 73: `<ConfigPanel />` → `<InspectorPanel />`.

- [ ] **Step 5: Verificar**

Run:
```bash
pnpm exec tsc --noEmit && pnpm test:run && pnpm build
```
Expected: limpio; 151 tests verdes.

Navegador:
- Sin selección → panel derecho muestra la global.
- Seleccionar un item de texto → panel derecho muestra Texto/Formato/Estilo/Efectos/(Animación en aparición). Editar tamaño/color/sombra se refleja en el preview.
- Toggle "Ver global" muestra la global sin deseleccionar; "Ver item" vuelve.
- Seleccionar otro item resetea a vista de item.
- Clic de nuevo en la fila seleccionada la deselecciona → global.
- Spacer/divider/image muestran sus paneles propios; spacer/divider muestran la nota "no se aplica en aparición" en modo aparición.
- La lista izquierda ya no expande controles.

- [ ] **Step 6: Commit**

```bash
git add src/components/credit/ItemInspector.tsx src/components/credit/ConfigPanel.tsx src/components/credit/CreditEditor.tsx src/app/page.tsx
git commit -m "feat: contextual inspector panel; move per-item controls out of the list"
```

---

### Task 5: Inserción en hueco ("+" entre filas)

**Files:**
- Modify: `src/components/credit/CreditEditor.tsx` (lista en `CreditEditor`, 1017-1037)

**Interfaces:**
- Consumes: `addItem(type, text?, index?)` (Task 1), `ADD_MENU_TYPES`, `TYPE_ICONS`, `CREDIT_TYPE_LABELS`.

- [ ] **Step 1: Crear el componente de hueco**

En `CreditEditor.tsx`, añadir un componente que renderiza una zona fina con "+" al hover, que abre el menú de tipos e inserta en `index`:

```tsx
function InsertGap({ index }: { index: number }) {
  const addItem = useCreditStore((s) => s.addItem)
  return (
    <div className="relative h-2 group/gap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Insertar aquí"
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 group-hover/gap:opacity-100 transition-opacity"
          >
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-background border rounded-full px-2 py-0.5">
              <Plus className="h-3 w-3" /> Insertar
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {ADD_MENU_TYPES.map((type) => {
            const Icon = TYPE_ICONS[type]
            return (
              <DropdownMenuItem key={type} onClick={() => addItem(type, undefined, index)}>
                <Icon className="h-4 w-4 mr-2" />
                {CREDIT_TYPE_LABELS[type]}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

- [ ] **Step 2: Intercalar huecos en la lista**

Reemplazar el `.map` de items (CreditEditor.tsx:1027-1035) por una versión con huecos antes de cada fila y uno final:

```tsx
          {items.map((item, idx) => (
            <React.Fragment key={item.id}>
              <InsertGap index={idx} />
              <ItemRow
                item={item}
                index={idx}
                isSelected={selectedItemId === item.id}
                onSelect={() => selectItem(item.id)}
              />
            </React.Fragment>
          ))}
          {items.length > 0 && <InsertGap index={items.length} />}
```

(`InsertGap index={idx}` inserta ANTES de la fila idx → cubre "antes del primero" con idx 0; el final cubre "después del último".)

- [ ] **Step 3: Verificar**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: limpio.

Navegador: con varios items, al pasar el ratón entre dos filas aparece "Insertar"; elegir un tipo crea el item en ese punto y lo selecciona (el inspector abre). El "+" no interfiere con arrastrar filas (el drag sigue funcionando). El botón superior "Añadir crédito" sigue añadiendo al final.

- [ ] **Step 4: Commit**

```bash
git add src/components/credit/CreditEditor.tsx
git commit -m "feat: insert items between rows via hover gap menu"
```

---

### Task 6: ScrollCredits — medir y reportar offsets por item

**Files:**
- Modify: `src/components/credit/ScrollCredits.tsx`

**Interfaces:**
- Produces (nuevo prop opcional):
  - `onLayoutChange?(layout: { offsets: { id: string; top: number; height: number }[]; contentHeight: number; containerHeight: number }): void`

- [ ] **Step 1: CreditLine siempre renderiza un root medible**

En `ScrollCredits.tsx`, convertir `CreditLine` (62-126) a `React.forwardRef<HTMLDivElement, ...>`. El caso `image` sin `imageSrc` (67) que hoy devuelve `null` pasa a devolver `<div ref={ref} aria-hidden />` (altura 0, sin efecto visual). Todos los demás returns reciben `ref={ref}` en su div raíz.

- [ ] **Step 2: Recoger refs por id y reportar en la medición**

En `ScrollCredits`, añadir un mapa de elementos por id y el prop:

```tsx
  const itemEls = React.useRef<Map<string, HTMLDivElement>>(new Map())
```

En el `.map` (291-293):

```tsx
        {items.map((item) => (
          <CreditLine
            key={item.id}
            item={item}
            config={config}
            ref={(el) => {
              if (el) itemEls.current.set(item.id, el)
              else itemEls.current.delete(item.id)
            }}
          />
        ))}
```

Ampliar el `measure()` del effect (149-154) para reportar el layout:

```tsx
    const measure = () => {
      if (contentRef.current && containerRef.current) {
        const ch = contentRef.current.scrollHeight
        const cont = containerRef.current.clientHeight
        setContentHeight(ch)
        setContainerHeight(cont)
        if (onLayoutChange) {
          const offsets = items.map((it) => {
            const el = itemEls.current.get(it.id)
            return { id: it.id, top: el?.offsetTop ?? 0, height: el?.offsetHeight ?? 0 }
          })
          onLayoutChange({ offsets, contentHeight: ch, containerHeight: cont })
        }
      }
    }
```

Añadir `onLayoutChange` a la firma de props y a la lista de desestructuración. Añadir `onLayoutChange` a las deps del effect de medición (160).

- [ ] **Step 3: Verificar**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: limpio. (Sin consumidor todavía; el prop es opcional, el preview visible no lo pasa aún.)

Navegador: el modo scroll sigue renderizando y animando igual que antes (sin regresión visual).

- [ ] **Step 4: Commit**

```bash
git add src/components/credit/ScrollCredits.tsx
git commit -m "feat: ScrollCredits measures and reports per-item offsets"
```

---

### Task 7: Doble clic → seek (aparición + scroll)

**Files:**
- Modify: `src/components/credit/CreditEditor.tsx` (ItemRow: `onDoubleClick`)
- Modify: `src/components/credit/CreditPreview.tsx` (observar `seekTarget`, capturar layout de scroll)

**Interfaces:**
- Consumes: `requestSeek` (Task 1), `seekTarget` (Task 1), `scrollProgressForItem` (Task 2), `onLayoutChange` (Task 6), `getVisibleItems`, `seekToItem`/`navBounds` existentes.

- [ ] **Step 1: Emitir requestSeek en doble clic**

En `ItemRow` (CreditEditor.tsx), tomar `requestSeek` del store y añadir al div raíz de la fila (377):

```tsx
      onDoubleClick={() => requestSeek(item.id)}
```

(`onClick` sigue seleccionando; el doble clic selecciona y además pide seek. No tocar esa coexistencia.)

- [ ] **Step 2: Capturar el layout de scroll en CreditPreview**

En `CreditPreview.tsx`, añadir un ref para el layout y pasarlo al `ScrollCredits` VISIBLE (250-258):

```tsx
  const scrollLayoutRef = React.useRef<{
    offsets: { id: string; top: number; height: number }[]
    contentHeight: number
    containerHeight: number
  } | null>(null)
```

En el `<ScrollCredits>` visible añadir: `onLayoutChange={(l) => { scrollLayoutRef.current = l }}`.

- [ ] **Step 3: Observar seekTarget y ejecutar el seek**

En `CreditPreview.tsx`, tomar `seekTarget` del store y añadir un effect:

```tsx
  const seekTarget = useCreditStore((s) => s.seekTarget)
  React.useEffect(() => {
    if (!seekTarget) return
    if (config.mode === "appearing") {
      const visible = getVisibleItems(items)
      const idx = visible.findIndex((i) => i.id === seekTarget.id)
      if (idx >= 0) seekToItem(idx) // no-op si el item no es visible (spacer/divider)
      return
    }
    // scroll: usar la geometría real medida
    const layout = scrollLayoutRef.current
    if (!layout) return
    const off = layout.offsets.find((o) => o.id === seekTarget.id)
    if (!off) return
    const p = scrollProgressForItem(
      off.top, off.height, layout.contentHeight, layout.containerHeight,
      config.scrollDirection, 0.5,
    )
    setPlaying(false)
    setManualSeek(p)
  }, [seekTarget]) // eslint-disable-line react-hooks/exhaustive-deps
```

Importar `scrollProgressForItem` de `@/lib/credit/scroll`. (`getVisibleItems` ya está importado.)

- [ ] **Step 4: Verificar**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: limpio.

Navegador:
- Aparición: doble clic en un item de texto lleva la línea de tiempo a ese item (frame congelado, pausado). Doble clic en spacer/divider = no mueve (no-op).
- Scroll: doble clic en cualquier item desplaza el contenido hasta centrar ese item bajo la línea media. Coincide con lo esperado para varios items (primero, medio, último).
- Clic simple sigue solo seleccionando (no mueve la línea de tiempo).

- [ ] **Step 5: Commit**

```bash
git add src/components/credit/CreditEditor.tsx src/components/credit/CreditPreview.tsx
git commit -m "feat: double-click a row to seek the timeline to that item"
```

---

### Task 8: Resalte del item activo en la lista

**Files:**
- Modify: `src/components/credit/CreditPreview.tsx` (producir `activeItemId`)
- Modify: `src/components/credit/CreditEditor.tsx` (consumir `activeItemId` en ItemRow)

**Interfaces:**
- Consumes: `setActiveItem`/`activeItemId` (Task 1), `activeItemIndexAtProgress` (Task 2), `scrollLayoutRef` (Task 7), `getVisibleItems`, `progressRef`, `currentItemIndex`/`onIndexChange` existentes.

- [ ] **Step 1: Producir activeItemId en aparición**

En `CreditPreview.tsx`, tomar `setActiveItem` del store. Añadir un effect que mapea el índice visible activo a id (solo aparición):

```tsx
  const setActiveItem = useCreditStore((s) => s.setActiveItem)
  React.useEffect(() => {
    if (config.mode !== "appearing") return
    const visible = getVisibleItems(items)
    setActiveItem(visible[currentItemIndex]?.id ?? null)
  }, [config.mode, items, currentItemIndex, setActiveItem])
```

- [ ] **Step 2: Producir activeItemId en scroll (RAF sobre geometría real)**

Añadir un effect con su propio `requestAnimationFrame` que, en modo scroll, lee `progressRef` + `scrollLayoutRef` y calcula el item activo, escribiendo en la store solo al cambiar:

```tsx
  React.useEffect(() => {
    if (config.mode !== "scroll") return
    let raf: number
    const tick = () => {
      const layout = scrollLayoutRef.current
      if (layout && layout.offsets.length > 0) {
        const idx = activeItemIndexAtProgress(
          layout.offsets, layout.contentHeight, layout.containerHeight,
          config.scrollDirection, progressRef.current, 0.5,
        )
        const id = idx >= 0 ? layout.offsets[idx].id : null
        setActiveItem(id) // no-op interno si no cambia
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [config.mode, config.scrollDirection, setActiveItem])
```

Importar `activeItemIndexAtProgress` de `@/lib/credit/scroll`. (`progressRef` ya se actualiza vía `onProgressChange` en ambos modos, 257/266.)

- [ ] **Step 3: Consumir activeItemId en la lista**

En `CreditEditor.tsx` `ItemRow`, tomar `activeItemId` del store y aplicar un indicador distinto al de selección. En el `cn(...)` del div raíz (378-382) añadir:

```tsx
        isActive && "ring-1 ring-amber-400/70",
```

con `const isActive = useCreditStore((s) => s.activeItemId) === item.id`. (Selección = `border-primary ring-1 ring-primary` ya existente; activo = anillo ámbar, visualmente distinto y combinable.)

- [ ] **Step 4: Verificar**

Run: `pnpm exec tsc --noEmit && pnpm test:run && pnpm build`
Expected: limpio; 151+ tests verdes.

Navegador:
- Aparición: al reproducir, la fila del item que se está mostrando se resalta y el resalte avanza con el pase.
- Scroll: al reproducir, la fila del item centrado se resalta; al arrastrar el desplazador de la línea de tiempo, el resalte concuerda con lo que se ve en el escenario.
- El resalte de "activo" se distingue del de "seleccionado" (pueden coexistir en el mismo item).

- [ ] **Step 5: Commit**

```bash
git add src/components/credit/CreditPreview.tsx src/components/credit/CreditEditor.tsx
git commit -m "feat: highlight the active item in the list, synced to playback and scrubbing"
```

---

## Self-Review

**Spec coverage:**
- Interacción (lista pura, clic/doble clic, inspector, toggle, deselección) → Tasks 4, 7.
- Reorg global (Escenario/Modo/Separadores/Imágenes) → Task 3.
- Inspector por tipo (texto/spacer/divider/image, nota aparición) → Task 4.
- Inserción en hueco (extremos, auto-select, no interferir drag) → Task 5 (+ addItem Task 1).
- Seek doble clic (aparición + scroll geometría) → Tasks 2, 6, 7.
- Resalte activo (aparición + scroll geometría, solo al cambiar) → Tasks 2, 6, 8.
- Store (seekTarget/activeItemId efímeros, no persistidos; addItem placeholder; selección limpiada existente) → Task 1.
- Tests (helpers puros, store) → Tasks 1, 2.

**Placeholder scan:** sin TBD/TODO. Los traslados de UI citan rangos de líneas exactos del código actual.

**Type consistency:** `addItem(type, text?, index?)`, `requestSeek(id)`, `setActiveItem(id)`, `seekTarget {id,nonce}`, `activeItemId`, `scrollProgressForItem(...)`, `activeItemIndexAtProgress(offsets,...)`, `onLayoutChange({offsets,contentHeight,containerHeight})` — usados consistentes entre tareas.

**Notas de ejecución:** los rangos de líneas son del estado actual (pre-Task). Tras cada tarea los números cambian; localizar por nombre de símbolo/sección, no por número absoluto.
