# Timeline, control de wrap y respeto de márgenes seguros — diseño

Fecha: 2026-06-24

Tres features de preview/layout, independientes entre sí. Un solo spec, un solo plan.

## Contexto del código (verificado esta sesión)

- `CreditPreview.tsx`: escenario visible (animación interna por `isPlaying`) + escenario oculto de export (driven por `manualProgress`). Barra de controles con botones Play/Reiniciar/Bucle/Márgenes/Pantalla completa. Overlay `SafeMarginsOverlay` (cajas 90%/80%) solo en el visible, gated por `config.showSafeMargins`.
- `ScrollCredits.tsx` y `AppearingCredits.tsx`: ambos aceptan `manualProgress?: number | null` (0-1) que sustituye por completo la animación interna, y `onDurationChange`. El render de texto usa `whiteSpace: "pre-wrap"` + `wordBreak: "break-word"`; el ancho lo fijan escenario y `config.paddingX`.
- `textStyle.ts`: `resolveTextStyle(item, config)` aplica override por item ?? global. Patrón replicado en `separators.ts`, `appearing.ts`, etc.
- `types.ts`: `config.showSafeMargins` existe (overlay, default false). `mergePersistedConfig` hace backfill de claves nuevas en estados persistidos.

## Feature 1 — Respetar márgenes seguros

Decisión del usuario: el usuario decide si el contenido respeta o no los márgenes seguros. Distinto del overlay-guía actual.

- Nuevo `config.respectSafeMargins: boolean`. Default `false` (comportamiento actual intacto). Backfill por `mergePersistedConfig`.
- Caja de referencia: **título-segura (80%, inset 10% por lado)**.
- Cuando on, el contenido se constriñe dentro de la caja título-segura:
  - Modo scroll: inset horizontal (L/R) 10%. Vertical no aplica (el texto recorre todo el alto).
  - Modo aparición: inset horizontal + vertical 10% (caja centrada con max-width y max-height).
- A diferencia del overlay, **sí afecta al vídeo exportado**: se aplica en el escenario visible Y en el oculto de export.
- Helper puro `resolveSafeInset(config)` → fracción de inset (0 si off, 0.1 si on). Testeable.
- UI: botón propio en la barra de controles de `CreditPreview`, separado de "Márgenes" (guía). Toggle de `config.respectSafeMargins`.
- El overlay existente (`showSafeMargins`) no se modifica.

## Feature 2 — Línea de tiempo (barra scrubbeable + saltos por item)

Decisión del usuario: barra + saltos por item.

Reutiliza `manualProgress` (0-1), ya soportado por ambos componentes.

- Barra de progreso bajo el escenario, encima de los controles.
- Reproducción: los componentes reportan su progreso a un `ref` del padre vía callback `onProgressChange(p)`; **no** re-renderizan los escenarios. La barra corre su propio `requestAnimationFrame`, lee el ref y actualiza solo su slider. Los escenarios solo se re-renderizan cuando el usuario arrastra.
- Scrubbing: al arrastrar, `setPlaying(false)` + pasar `manualProgress` al escenario visible. **Al soltar se queda en pausa** en ese frame; el usuario reanuda con Play.
- Modo aparición: botones anterior/siguiente item + indicador "item X / Y". Saltar = `manualProgress` puesto al inicio de ese item.
- Callbacks nuevos opcionales en ambos componentes: `onProgressChange(p: number)`. En aparición además `onIndexChange(i: number)` para el indicador.
- Helper puro `itemProgressBounds(itemDurations: number[])` → fracciones de inicio/fin de cada item (mapea item ↔ progreso). Testeable.
- No se toca el RAF interno de scroll ni los timers de aparición (cero regresión en la animación existente).

## Feature 3 — Control de wrap (no envolver + ancho de caja)

Decisión del usuario: ambas.

Integradas en `resolveTextStyle` extendido, con override por item (patrón actual).

- `config.noWrap: boolean` (global) + `item.noWrap?: boolean` (override). On → `whiteSpace: "pre"` (respeta saltos manuales con Enter, sin partir automático). Off → `pre-wrap` (actual).
- `config.textBoxWidth: number` (% del ancho del escenario, max-width de la caja de texto) + `item.textBoxWidth?: number` (override). Decide a qué ancho envuelve, independiente de `paddingX`. Caja centrada.
- `resolveTextStyle` devuelve además `whiteSpace` y `maxWidth` resueltos; se consumen en scroll, aparición y typewriter (los tres puntos de estilo de texto).
- Backfill de las dos claves nuevas por `mergePersistedConfig`.
- UI: control global en la sección de layout de `ConfigPanel`; override por item en `CreditEditor` (junto al resto de overrides de texto).
- Tests sobre `resolveTextStyle` extendido.

## Testing

- `resolveSafeInset`: off → 0, on → 0.1.
- `itemProgressBounds`: límites acumulados correctos, suma normalizada a 1.
- `resolveTextStyle` extendido: noWrap override ?? global; textBoxWidth override ?? global; whiteSpace resultante.
- Roundtrip import/export de las claves nuevas de config e item en `store.test.ts`.

## Fuera de alcance

- Reescritura del motor de export (WebCodecs).
- Constreñir a acción-segura (90%): se elige título-segura.
- Override por item de `respectSafeMargins` (es global por naturaleza).
