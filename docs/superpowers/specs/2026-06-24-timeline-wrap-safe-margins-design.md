# Timeline, control de wrap y respeto de márgenes seguros — diseño

Fecha: 2026-06-24

Tres features de preview/layout, independientes entre sí. Un solo spec, un solo plan.

## Contexto del código (verificado esta sesión)

- `CreditPreview.tsx`: escenario visible (animación interna por `isPlaying`) + escenario oculto de export (driven por `manualProgress`). Ambos renderizan los mismos componentes `ScrollCredits`/`AppearingCredits`. Barra de controles con Play/Reiniciar/Bucle/Márgenes/Pantalla completa. Overlay `SafeMarginsOverlay` (cajas 90%/80%) solo en el visible, gated por `config.showSafeMargins`.
- `ScrollCredits.tsx`: anima `internalProgress` (estado interno) por RAF cuando `isPlaying`; `manualProgress?: number | null` (0-1) lo sustituye por completo (guard `manualProgress !== null` desactiva el RAF). `onDurationChange`. Texto con `whiteSpace: "pre-wrap"` + `wordBreak: "break-word"`; ancho fijado por escenario y `config.paddingX`.
- `AppearingCredits.tsx`: avanza `currentIndex` por `setTimeout` por item; un effect deriva `currentIndex`/`typedText` desde `manualProgress`. `getVisibleItems` + `getAppearItemDuration` calculan items e individuales.
- `textStyle.ts`: `resolveTextStyle(item, config)` aplica override por item ?? global. Patrón replicado en `separators.ts`, `appearing.ts`.
- `types.ts`: `config.showSafeMargins` existe (overlay, default false). `mergePersistedConfig` hace backfill de claves nuevas en estados persistidos.

## Feature 1 — Respetar márgenes seguros

Decisión del usuario: el usuario decide si el contenido respeta o no los márgenes seguros. Distinto del overlay-guía actual.

- Nuevo `config.respectSafeMargins: boolean`. Default `false` (comportamiento actual intacto). Backfill por `mergePersistedConfig`.
- Caja de referencia: **título-segura (80%, inset 10% por lado)**.
- **Solo inset horizontal** (L/R) en ambos modos. Se descarta el inset vertical en aparición: un item centrado más alto que el 80% se recortaría; horizontal-only es consistente con scroll y sin riesgo de recorte.
- **Relación con `paddingX`:** el inset seguro es una caja **exterior**; `paddingX` sigue aplicando **dentro**. Ancho de texto efectivo = `stageWidth·(1 − 2·inset) − 2·paddingX`.
- **Punto de inserción:** el inset vive **dentro** de `ScrollCredits`/`AppearingCredits` (no en un wrapper de `CreditPreview`), para que el escenario visible Y el oculto de export lo reciban sin duplicar lógica. En scroll se aplica como `left`/`right` del `contentRef`; en aparición como `paddingLeft`/`paddingRight` del contenedor centrado. La vignette (full-width) no se toca.
- **Sí afecta al vídeo exportado** (es layout real).
- Helper puro `resolveSafeInset(config)` → fracción de inset (0 si off, 0.1 si on). Testeable.
- UI: botón propio en la barra de controles de `CreditPreview` para `config.respectSafeMargins`. Para evitar confusión con el nuevo botón, el botón existente del overlay-guía se renombra de "Márgenes" a **"Guía"** (icono distinto). El overlay (`showSafeMargins`) no cambia su comportamiento.

## Feature 2 — Línea de tiempo (barra scrubbeable + saltos por item)

Decisión del usuario: barra + saltos por item.

Reutiliza `manualProgress` (0-1), ya soportado por ambos componentes.

- Barra de progreso bajo el escenario, encima de los controles.
- **Reproducción:** los componentes reportan su progreso a un `ref` del padre vía `onProgressChange(p)`; **no** re-renderizan los escenarios. La barra corre su propio `requestAnimationFrame`, lee el ref y actualiza solo su slider.
  - En scroll el progreso reportado es suave (`internalProgress`).
  - En aparición el progreso es **por item** (salta en cada cambio de `currentIndex`); no se añade reloj continuo. Los botones anterior/siguiente dan la precisión.
- **Scrubbing:** al arrastrar, `setPlaying(false)` + estado local `manualSeek: number | null` en `CreditPreview` que se pasa como `manualProgress` al escenario visible. Mientras se arrastra, la barra **ignora** `onProgressChange` (no pelea con el valor del usuario). **Al soltar se queda en pausa** en ese frame.
- **Reanudar tras scrub (hueco cerrado):** al pulsar Play, `manualSeek` vuelve a `null`. Para que scroll continúe desde donde se arrastró (y no salte al `internalProgress` viejo), `ScrollCredits` recuerda el último `manualProgress` en un ref y, al transición número→`null`, siembra `internalProgress` con ese valor. En aparición ya funciona: el effect de `manualProgress` dejó `currentIndex` sincronizado.
- **Saltos por item (modo aparición):** botones anterior/siguiente + indicador "item X / Y". Saltar = `manualSeek` puesto al inicio de ese item. Los límites de item los **recalcula el padre** con los helpers puros (`getVisibleItems` + `getAppearItemDuration`), no los reporta el componente. `AppearingCredits` reporta `currentIndex` vía `onIndexChange(i)` para el indicador. En modo scroll los botones e indicador se ocultan.
- Callbacks nuevos opcionales en ambos componentes: `onProgressChange(p: number)`; en aparición además `onIndexChange(i: number)`.
- Helper puro `itemProgressBounds(itemDurations: number[])` → fracciones de inicio/fin de cada item. Testeable.
- No se toca el RAF interno de scroll ni los timers de aparición (cero regresión en la animación existente).

## Feature 3 — Control de wrap (no envolver + ancho de caja)

Decisión del usuario: ambas.

Integradas en `resolveTextStyle` extendido, con override por item. Solo afectan a items de texto (no image/spacer/divider).

- `config.noWrap: boolean` (global) + `item.noWrap?: boolean` (override). On → `whiteSpace: "pre"` y se omite `wordBreak: "break-word"` (conflicto): respeta saltos manuales con Enter, sin partir automático; las líneas largas desbordan y las recorta el `overflow-hidden` del contenedor (comportamiento esperado de "no envolver"). Off → `pre-wrap` + `break-word` (actual).
- `config.textBoxWidth: number` (% del ancho del escenario, default 100 = sin límite) + `item.textBoxWidth?: number` (override). Caja **centrada** (`margin: 0 auto`) con `max-width` = ese %; `textAlign` alinea el texto **dentro** de la caja. Independiente de `paddingX`.
- Si `respectSafeMargins` (Feature 1) y `textBoxWidth` aplican a la vez, ambos son `max-width`: gana el menor, sin conflicto.
- `resolveTextStyle` devuelve además `whiteSpace` y `maxWidth` resueltos (override ?? global). Se consumen en `ScrollCredits`, `AppearingCredits` y en el bloque typewriter (que arma su estilo inline aparte y debe consumirlos igual).
- Backfill de `noWrap` y `textBoxWidth` por `mergePersistedConfig`; defaults en `DEFAULT_CONFIG`.
- UI: control global en la sección de layout de `ConfigPanel`; override por item en `CreditEditor` (junto al resto de overrides de texto).

## Testing

- `resolveSafeInset`: off → 0, on → 0.1.
- `itemProgressBounds`: límites acumulados correctos, fin del último = 1; lista vacía → vacía.
- `resolveTextStyle` extendido: `noWrap` override ?? global; `textBoxWidth` override ?? global; `whiteSpace`/`maxWidth` resultantes.
- Roundtrip import/export de las claves nuevas de config (`respectSafeMargins`, `noWrap`, `textBoxWidth`) e item (`noWrap`, `textBoxWidth`) en `store.test.ts`.

## Fuera de alcance

- Reescritura del motor de export (WebCodecs).
- Constreñir a acción-segura (90%): se elige título-segura.
- Inset vertical en aparición (riesgo de recorte).
- Override por item de `respectSafeMargins` (global por naturaleza).
- Reloj continuo para barra suave en aparición (se acepta barra por item).
