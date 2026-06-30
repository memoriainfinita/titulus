# Línea a línea + timing de revelados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar que las animaciones por intervalo (línea a línea y máquina de escribir) se reproduzcan de forma fiable en modo aparición, anclando revelado y avance al instante en que cada item se hace visible.

**Architecture:** En `AppearingCredits`, el revelado pasa a ser propiedad de componentes hijos (`LinesItem`, `TypewriterItem`) que se montan solo cuando el item es visible (por `mode="wait"`); el avance se programa desde una señal de montaje (`shownTick`) emitida por un `MountSignal` común; cada aparición se identifica con `appearanceKey` para que loop y reinicio re-monten. El modo manual (export/scrub) sigue gobernado por el padre con helpers puros.

## RIESGO LOAD-BEARING (verificar en Task 5, antes de seguir)

Todo el arreglo asume que **`AnimatePresence mode="wait"` retrasa el commit/montaje de React del nodo entrante** hasta que el saliente termina su exit, de modo que el `useEffect` de `MountSignal` se ejecuta cuando el item ya es visible. Si framer montara el nodo de inmediato (retrasando solo la animación), `MountSignal` dispararía demasiado pronto y el bug persistiría. **Verificación mínima en Task 5 Step 7**: con dos items y un `console.log` temporal en `MountSignal`, comprobar que el log del segundo item ocurre tras la salida del primero (no a la vez que el cambio de índice). Si la asunción es falsa, plan B documentado al final.

**Tech Stack:** Next.js 16, React 19, framer-motion, TypeScript, Vitest 4 + happy-dom.

## Global Constraints

- Sin emojis en código, tests, mensajes de commit ni docs.
- Commits en inglés (`fix:`/`refactor:`/`test:`), atómicos.
- Ejecutar tests con `pnpm test:run`; type-check con `pnpm exec tsc --noEmit`.
- No tocar la lógica pura ya existente en `appearing.ts` (`resolveStaggerLines`, `isLineStaggered`, `getAppearItemDuration`, etc.), solo añadir.
- El comportamiento en modo manual (`manualProgress != null`) debe seguir siendo determinista (export frame a frame).

---

### Task 1: Helpers puros de progreso (revelado de líneas y tecleo)

Extraer la aritmética que hoy vive inline en el efecto `manual-derive` de `AppearingCredits` a funciones puras testeables. Mismo resultado numérico que el código actual.

**Files:**
- Modify: `src/lib/credit/appearing.ts` (añadir al final)
- Test: `src/lib/credit/appearing.test.ts` (añadir bloques)

**Interfaces:**
- Produces:
  - `revealedLinesAt(timeIntoItem: number, intervalSec: number, totalLines: number): number`
  - `typedCharsAt(timeIntoItem: number, textLength: number, speedMs: number): number`

- [ ] **Step 1: Write the failing tests**

En `src/lib/credit/appearing.test.ts`, añadir el import y los bloques:

```ts
import {
  // ...imports existentes...
  revealedLinesAt,
  typedCharsAt,
} from "./appearing"

describe("revealedLinesAt", () => {
  it("muestra 1 línea en t=0 y suma una por intervalo", () => {
    expect(revealedLinesAt(0, 0.5, 3)).toBe(1)
    expect(revealedLinesAt(0.5, 0.5, 3)).toBe(2)
    expect(revealedLinesAt(1.0, 0.5, 3)).toBe(3)
  })

  it("satura en totalLines", () => {
    expect(revealedLinesAt(99, 0.5, 3)).toBe(3)
  })

  it("una sola línea siempre es 1", () => {
    expect(revealedLinesAt(0, 0.5, 1)).toBe(1)
    expect(revealedLinesAt(5, 0.5, 1)).toBe(1)
  })

  it("intervalo <= 0 revela todo de golpe", () => {
    expect(revealedLinesAt(0, 0, 4)).toBe(4)
  })
})

describe("typedCharsAt", () => {
  it("texto vacío teclea 0", () => {
    expect(typedCharsAt(5, 0, 50)).toBe(0)
  })

  it("progresa linealmente sobre la duración de tecleo", () => {
    // 100 chars * 100ms = 10s de tecleo; a la mitad -> 50 chars
    expect(typedCharsAt(5, 100, 100)).toBe(50)
    expect(typedCharsAt(10, 100, 100)).toBe(100)
  })

  it("la duración de tecleo tiene un suelo de 2s", () => {
    // 4 chars * 50ms = 0.2s -> max(2, 0.2) = 2s; a 1s -> mitad -> 2 chars
    expect(typedCharsAt(1, 4, 50)).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/lib/credit/appearing.test.ts`
Expected: FAIL ("revealedLinesAt is not exported" / "typedCharsAt is not a function").

- [ ] **Step 3: Implement the helpers**

Al final de `src/lib/credit/appearing.ts`:

```ts
// Number of lines visible at a given time into a line-by-line item.
// At t=0 the first line is already entering; each interval adds one more.
export function revealedLinesAt(timeIntoItem: number, intervalSec: number, totalLines: number): number {
  if (totalLines <= 1) return totalLines
  const shown = intervalSec > 0 ? Math.floor(timeIntoItem / intervalSec) + 1 : totalLines
  return Math.max(1, Math.min(totalLines, shown))
}

// Number of typed characters at a given time into a typewriter item.
// Typing time has a 2s floor (matches getAppearItemDuration).
export function typedCharsAt(timeIntoItem: number, textLength: number, speedMs: number): number {
  if (textLength <= 0) return 0
  const typingDuration = Math.max(2, textLength * (speedMs / 1000))
  return Math.min(textLength, Math.floor((timeIntoItem / typingDuration) * textLength))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run src/lib/credit/appearing.test.ts`
Expected: PASS (todos verdes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/credit/appearing.ts src/lib/credit/appearing.test.ts
git commit -m "test: add pure reveal/typed progress helpers for appearing mode"
```

---

### Task 2: El efecto manual-derive consume los helpers

Cambio interno sin alterar comportamiento: el efecto `manual-derive` de `AppearingCredits` usa `revealedLinesAt`/`typedCharsAt` y escribe en estados renombrados `manualRevealedLines`/`manualTypedText`. La suite completa debe seguir verde.

**Files:**
- Modify: `src/components/credit/AppearingCredits.tsx` (estados y efecto `manual-derive`)
- Test: suite existente (sin nuevos tests; es refactor)

**Interfaces:**
- Consumes: `revealedLinesAt`, `typedCharsAt` (Task 1).
- Produces: estados del padre `manualRevealedLines: number`, `manualTypedText: string` (reemplazan `revealedLines`/`typedText`).

- [ ] **Step 1: Renombrar los estados**

En `AppearingCredits`, sustituir:

```tsx
const [typedText, setTypedText] = React.useState("")
// Line-by-line reveal: how many lines of the current item are visible (>=1 once it enters).
const [revealedLines, setRevealedLines] = React.useState(1)
```

por:

```tsx
// Manual-mode (export/scrub) derived state. Live playback is owned by the child items.
const [manualTypedText, setManualTypedText] = React.useState("")
const [manualRevealedLines, setManualRevealedLines] = React.useState(1)
```

- [ ] **Step 2: Reescribir el cuerpo del efecto manual-derive con los helpers**

Sustituir el bloque que calcula typewriter/lines dentro del efecto `manual-derive` (el que empieza `if (manualProgress === null) return`) por:

```tsx
const foundItem = visibleItems[foundIdx]
const foundType = foundItem ? resolveAnimationType(foundItem, config) : null
if (foundItem && foundType === "typewriter") {
  const text = foundItem.text || ""
  setManualTypedText(text.slice(0, typedCharsAt(timeIntoItem, text.length, resolveTypewriterSpeed(foundItem, config))))
} else {
  setManualTypedText("")
}
if (foundItem && isLineStaggered(foundItem, config)) {
  setManualRevealedLines(
    revealedLinesAt(timeIntoItem, resolveLineRevealInterval(foundItem, config), countItemLines(foundItem)),
  )
}
```

Añadir `revealedLinesAt, typedCharsAt` al import desde `@/lib/credit/appearing`.

- [ ] **Step 3: Borrar los efectos en vivo de revelado y typewriter (evita romper la compilación)**

Como el rename elimina `setRevealedLines`/`setTypedText`, hay que borrar ya los dos efectos que los usaban:
- el efecto "Typewriter effect (skip in manual/export mode)" en vivo,
- el efecto "Line-by-line reveal effect (skip in manual/export mode)" en vivo.

(El revelado/tecleo en vivo lo recuperan los hijos en Tasks 3-4; en este estado intermedio la animación en vivo simplemente no corre, lo cual no rompe tests.)

- [ ] **Step 4: Actualizar resets y render a los estados renombrados**

En el efecto "Reset on restart" y en el efecto de avance actual (que se reescribe en Task 5), sustituir `setTypedText("")` por `setManualTypedText("")` y `setRevealedLines(1)` por `setManualRevealedLines(1)`.
En el render, pasar `revealedLines={manualRevealedLines}` a `<LinesItem>` (la firma vieja sigue con esa prop hasta Task 3) y usar `{manualTypedText}` en el bloque inline del typewriter (hasta Task 4).

- [ ] **Step 5: Type-check y suite completa**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores (sin referencias colgantes a `setRevealedLines`/`setTypedText`/`revealedLines`/`typedText`).
Run: `pnpm test:run`
Expected: todos verdes (suite previa 175 + los nuevos `it` de Task 1).

- [ ] **Step 6: Commit**

```bash
git add src/components/credit/AppearingCredits.tsx
git commit -m "refactor: derive manual-mode reveal state via pure helpers"
```

---

### Task 3: `LinesItem` dueño de su revelado en vivo

`LinesItem` deja de recibir `revealedLines` del padre y pasa a gestionar su propio contador en vivo (efecto `[live, isPlaying]`), reseteado por re-montaje (Task 5 aporta `appearanceKey`). En modo manual pinta estático.

**Files:**
- Modify: `src/components/credit/AppearingCredits.tsx` (componente `LinesItem` y su uso en el render)

**Interfaces:**
- Produces: `LinesItem` con props `{ item, config, variants, live, isPlaying, totalLines, revealInterval, manualRevealedLines }`.

- [ ] **Step 1: Reescribir `LinesItem`**

Sustituir el componente `LinesItem` por:

```tsx
function LinesItem({
  item,
  config,
  variants,
  live,
  isPlaying,
  totalLines,
  revealInterval,
  manualRevealedLines,
}: {
  item: CreditItem
  config: CreditConfig
  variants: ReturnType<typeof getVariants>
  live: boolean
  isPlaying: boolean
  totalLines: number
  revealInterval: number
  manualRevealedLines: number
}) {
  const align = resolveAlignment(item, config)
  const ts = resolveTextStyle(item, config)
  const fontWeight = resolveFontWeight(item, config)
  const shadow = resolveTextShadow(item, config)
  const blur = resolveTextBlur(item, config)
  const lines = (item.text || " ").split("\n")

  // Live reveal: this component mounts only when the item is visible (mode="wait"),
  // so the interval starts at the right moment. Pause freezes, resume continues.
  const [revealed, setRevealed] = React.useState(1)
  React.useEffect(() => {
    if (!live || !isPlaying || totalLines <= 1) return
    const id = setInterval(() => {
      setRevealed((n) => {
        if (n + 1 >= totalLines) clearInterval(id)
        return Math.min(totalLines, n + 1)
      })
    }, revealInterval * 1000)
    return () => clearInterval(id)
  }, [live, isPlaying, totalLines, revealInterval])

  const revealedLines = live ? revealed : manualRevealedLines

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
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        textTransform: item.uppercase ? "uppercase" : undefined,
        fontStyle: item.italic ? "italic" : undefined,
        padding: `0 ${config.paddingX}px`,
        maxWidth: ts.maxWidth,
        whiteSpace: ts.whiteSpace,
        wordBreak: ts.wordBreak,
      }}
    >
      {lines.map((line, i) => {
        const shown = i < revealedLines
        // Live: animate each line with the chosen variants. Manual: jump to the
        // final state with no transition (frame-accurate for export).
        return (
          <motion.div
            key={i}
            initial={live ? variants.initial : false}
            animate={shown ? variants.animate : variants.initial}
            transition={live ? variants.transition : { duration: 0 }}
          >
            {line || " "}
          </motion.div>
        )
      })}
    </div>
  )
}
```

> El fallback de línea vacía es un espacio no separable (` `); al teclear el código mantener el carácter ` ` que ya usa el archivo.

- [ ] **Step 2: Actualizar el uso de `LinesItem` en el render**

Sustituir el bloque `) : staggered ? (` por:

```tsx
) : staggered ? (
  <LinesItem
    item={currentItem}
    config={config}
    variants={variants}
    live={manualProgress === null}
    isPlaying={isPlaying}
    totalLines={countItemLines(currentItem)}
    revealInterval={resolveLineRevealInterval(currentItem, config)}
    manualRevealedLines={manualRevealedLines}
  />
) : currentAnimType === "typewriter" ? (
```

- [ ] **Step 3: Type-check y suite**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.
Run: `pnpm test:run`
Expected: todos verdes.

- [ ] **Step 4: Commit**

```bash
git add src/components/credit/AppearingCredits.tsx
git commit -m "refactor: LinesItem owns its live line-by-line reveal"
```

---

### Task 4: `TypewriterItem` extraído y dueño de su tecleo

Sacar el render inline del typewriter a un componente con su propio estado de tecleo en vivo, simétrico a `LinesItem`.

**Files:**
- Modify: `src/components/credit/AppearingCredits.tsx` (nuevo componente + render)

**Interfaces:**
- Produces: `TypewriterItem` con props `{ item, config, live, isPlaying, speed, manualTypedText }`.

- [ ] **Step 1: Crear `TypewriterItem`**

Añadir junto a `LinesItem`:

```tsx
function TypewriterItem({
  item,
  config,
  live,
  isPlaying,
  speed,
  manualTypedText,
}: {
  item: CreditItem
  config: CreditConfig
  live: boolean
  isPlaying: boolean
  speed: number
  manualTypedText: string
}) {
  const ts = resolveTextStyle(item, config)
  const text = item.text || ""
  const [typed, setTyped] = React.useState("")
  React.useEffect(() => {
    if (!live || !isPlaying) return
    let i = typed.length
    const id = setInterval(() => {
      i += 1
      setTyped(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [live, isPlaying, text, speed])

  const shown = live ? typed : manualTypedText
  return (
    <div
      style={{
        fontFamily: ts.fontFamily,
        fontSize: `${ts.fontSize}px`,
        fontWeight: resolveFontWeight(item, config),
        color: ts.color,
        letterSpacing: `${ts.letterSpacing}px`,
        lineHeight: ts.lineHeight,
        textAlign: resolveAlignment(item, config),
        textTransform: item.uppercase ? "uppercase" : undefined,
        fontStyle: item.italic ? "italic" : undefined,
        padding: `0 ${config.paddingX}px`,
        maxWidth: ts.maxWidth,
        whiteSpace: ts.whiteSpace,
        wordBreak: ts.wordBreak,
        minHeight: "1.5em",
        filter: resolveTextBlur(item, config) > 0 ? `blur(${resolveTextBlur(item, config)}px)` : undefined,
      }}
    >
      {shown}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        style={{ display: "inline-block", marginLeft: "0.05em" }}
      >
        |
      </motion.span>
    </div>
  )
}
```

- [ ] **Step 2: Reemplazar el render inline del typewriter**

Sustituir todo el bloque `) : currentAnimType === "typewriter" ? ( <div ...>{typedText}...</div> )` por:

```tsx
) : currentAnimType === "typewriter" ? (
  <TypewriterItem
    item={currentItem}
    config={config}
    live={manualProgress === null}
    isPlaying={isPlaying}
    speed={resolveTypewriterSpeed(currentItem, config)}
    manualTypedText={manualTypedText}
  />
) : (
```

- [ ] **Step 3: Type-check y suite**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.
Run: `pnpm test:run`
Expected: todos verdes.

- [ ] **Step 4: Commit**

```bash
git add src/components/credit/AppearingCredits.tsx
git commit -m "refactor: extract TypewriterItem owning its live typing"
```

---

### Task 5: Motor de aparición anclado a la visibilidad (`appearanceKey` + `shownTick`)

Sustituir los efectos en vivo atados a `currentIndex` (revelado, typewriter, avance) por: clave por aparición, señal de montaje `MountSignal`, y un único efecto de avance disparado por `shownTick`/`isPlaying`. Cierra G1, G2, G3.

**Files:**
- Modify: `src/components/credit/AppearingCredits.tsx`

**Interfaces:**
- Consumes: `LinesItem`/`TypewriterItem` (Tasks 3-4), `getAppearItemDuration`.
- Produces: estados `cycle`, `shownTick`; `appearanceKey`; `MountSignal`.

- [ ] **Step 1: Añadir estados y refs**

Junto a `currentIndex`:

```tsx
const [cycle, setCycle] = React.useState(0)        // bumps each loop so single-item loops re-mount
const [shownTick, setShownTick] = React.useState(0) // bumps when the current item becomes visible
const currentIndexRef = React.useRef(0)
React.useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
const handleShown = React.useCallback(() => setShownTick((t) => t + 1), [])
```

- [ ] **Step 2: Añadir `MountSignal`**

Junto a los demás componentes auxiliares:

```tsx
// Fires once when mounted. Because AnimatePresence mode="wait" only mounts the
// new item after the previous one finishes exiting, this is the "item is now
// visible" signal — valid for the first item too.
function MountSignal({ onMount }: { onMount: () => void }) {
  const ref = React.useRef(onMount)
  ref.current = onMount
  React.useEffect(() => { ref.current() }, []) // fire exactly once per mount (per appearance)
  return null
}
```

> Deps `[]` deliberadas: el signal debe dispararse una sola vez por montaje. Se usa un ref para no capturar un `onMount` viejo sin re-ejecutar el efecto. `handleShown` ya es estable (`useCallback`), pero el ref lo blinda.

- [ ] **Step 3: Borrar el efecto de avance atado a `currentIndex`**

Eliminar por completo el efecto "Advance items based on timing" (el `setTimeout(getAppearItemDuration...)` con deps `[isPlaying, currentIndex, ...]`). Se reescribe abajo anclado a `shownTick`.

(Los efectos en vivo de typewriter y de líneas ya se borraron en Task 2; el revelado/tecleo en vivo ahora vive en los hijos.)

- [ ] **Step 4: Añadir el efecto de avance anclado a `shownTick`**

```tsx
// Advance is anchored to visibility: scheduled when the current item is shown
// (shownTick) and rescheduled on resume. Reading currentIndex via ref avoids a
// stale closure without re-scheduling on the (not-yet-visible) index change.
React.useEffect(() => {
  if (manualProgress !== null) return
  if (!isPlaying || visibleItems.length === 0) return
  const idx = currentIndexRef.current
  if (idx >= visibleItems.length) return
  const item = visibleItems[idx]
  const t = setTimeout(() => {
    if (idx >= visibleItems.length - 1) {
      if (config.loop) {
        setCycle((c) => c + 1)
        setCurrentIndex(0)
      } else {
        setCurrentIndex(visibleItems.length) // -> Fin
      }
    } else {
      setCurrentIndex(idx + 1)
    }
  }, getAppearItemDuration(item, config) * 1000)
  return () => clearTimeout(t)
}, [shownTick, isPlaying, manualProgress, visibleItems, config])
```

- [ ] **Step 5: Reset on restart limpia `cycle` y rearranca**

Sustituir el efecto "Reset on restart" por:

```tsx
React.useEffect(() => {
  setCurrentIndex(0)
  setCycle((c) => c + 1) // force a fresh appearance of item 0
  setManualTypedText("")
  setManualRevealedLines(1)
}, [restartKey])
```

- [ ] **Step 6: Clave por aparición + `MountSignal` en el render**

Sustituir la apertura del `motion.div` con clave por:

```tsx
<motion.div
  key={`${currentItem.id}-${currentIndex}-${cycle}-${restartKey}`}
  initial={containerVariants.initial}
  animate={containerVariants.animate}
  exit={containerVariants.exit}
  transition={containerVariants.transition}
  className="w-full flex flex-col items-center justify-center px-4"
>
  <MountSignal onMount={handleShown} />
```

(El `<MountSignal/>` va como primer hijo dentro del `motion.div`, antes del bloque condicional `currentItem.type === "image" ? ...`.)

- [ ] **Step 7: Verificar la asunción de `mode="wait"` + type-check + suite**

Verificación del riesgo load-bearing: poner temporalmente `console.log("[MOUNT]", currentIndexRef.current, performance.now())` dentro de `MountSignal` (en el `ref.current()` o junto a él). Con 2-3 items en aparición y `Reproducir`, confirmar en consola que el `[MOUNT]` del item siguiente aparece **después** de la salida del anterior (separado por ~la duración de animación), no en el mismo instante que el avance. Si se dispara demasiado pronto, PARAR y aplicar el plan B (ver final). Quitar el `console.log` tras verificar.

Run: `pnpm exec tsc --noEmit`
Expected: sin errores (verificar que no queden referencias a `revealedLines`/`typedText`/`setRevealedLines`/`setTypedText`).
Run: `pnpm test:run`
Expected: todos verdes.

- [ ] **Step 8: Commit**

```bash
git add src/components/credit/AppearingCredits.tsx
git commit -m "fix: anchor appearing reveal and advance to item visibility"
```

---

### Task 6: Verificación de integración (build + navegador)

El bug es de integración framer + timers; happy-dom no lo reproduce. Verificación real en navegador por el usuario.

**Files:** ninguno (verificación).

- [ ] **Step 1: Build con type-check**

Run: `pnpm build`
Expected: `next build` OK, sin errores de tipos.

- [ ] **Step 2: Checklist en navegador (usuario)**

Con `pnpm dev` y un item `descripción` de 3 líneas, modo aparición:
- Tipo `Desenfoque` + "Revelar línea a línea" ON: al reproducir, las 3 líneas entran escalonadas, no a la vez.
- Reproducir la lista completa varias veces: el escalonado ocurre en TODOS los items multilínea, no solo el primero, de forma repetible.
- Loop de un solo item multilínea: el escalonado se repite en cada vuelta.
- Máquina de escribir en varios items: teclea en todos, no solo el primero.
- Doble clic en un item de la lista: muestra el item (bloque completo) de forma fiable.
- Resto de animaciones (fade/slide/zoom/blur sin stagger): siguen bien.
- Export de un proyecto corto: el MP4 muestra el escalonado/tecleo correctamente.

- [ ] **Step 3: Actualizar state.md y cerrar**

Registrar en `state.md` (History) el arreglo y marcar el TODO del typewriter (`[~] Modo typewriter`) como resuelto. Commit `docs:`.

---

## Notas de diseño asumidas (del spec)

- **Pausa/reanudar**: al reanudar, el avance del item actual se reprograma a su duración completa; el revelado del hijo continúa desde donde estaba. Imperfección aceptada en reanudaciones a mitad de item.
- **Loop de un solo item**: ahora cada vuelta re-monta el item (cambia `cycle`), por lo que se reproduce su animación de entrada en cada vuelta (antes no). Cambio de comportamiento aceptado.
- **Doble clic**: sigue siendo un seek a la mitad del item (muestra el bloque completo), no un replay.

## Plan B (si `MountSignal` se dispara antes de la visibilidad)

Si la verificación de Task 5 Step 7 muestra que `MountSignal` se ejecuta a la vez que el cambio de índice (framer no retrasa el commit), anclar a la visibilidad con la señal de framer en su lugar: usar `onAnimationStart` del `motion.div` con clave (que con `mode="wait"` se dispara al iniciar la ENTRADA, ya tras la salida del anterior) para llamar a `handleShown`, en vez del `<MountSignal/>`. Mantener todo lo demás igual. Riesgo secundario: para items con `containerVariants` "steady" (staggered), confirmar que `onAnimationStart` se dispara aun siendo una transición de opacidad 1→1; si no, dar al contenedor una entrada mínima real solo como disparador.
