# Espacios y separadores configurables + retirada de puntitos de progreso

Fecha: 2026-06-23
Estado: aprobado por el usuario

## Objetivo

1. Hacer configurables el espacio (`spacer`) y el separador (`divider`), hoy fijos.
2. Eliminar los puntitos de progreso del modo aparición.

## Contexto verificado (lectura de código en esta sesión)

- `spacer` y `divider` se renderizan solo en modo scroll. En appearing se filtran (`getVisibleItems` en `AppearingCredits.tsx`).
- `spacer` actual: altura fija `config.itemSpacing * 2` (`ScrollCredits.tsx` `CreditLine`).
- `divider` actual: línea fija — ancho 60%, alto 1px, `background: config.textColor`, opacidad 0.4 (`ScrollCredits.tsx` `CreditLine`).
- `spacer`/`divider` no tienen panel de edición: `CreditEditor.tsx` línea 190 excluye ambos tipos del bloque expandido.
- Patrón de override por item ya existente: `pauseOverride` en `CreditItem` (campo plano opcional, `undefined` = hereda global). UI con placeholder = valor global y nota "vacío = global".
- Los puntitos: bloque "Progress indicator" en `AppearingCredits.tsx` líneas 344-357, renderizado siempre (preview y export comparten componente).

## Decisiones del usuario

- Control: global por defecto + override por item (mismo patrón que `pauseOverride`).
- Divider personalizable en: grosor, ancho, color y opacidad, estilo de línea.
- Estilo de línea: solid / dashed / dotted. Carácter decorativo (`* * *`) fuera de alcance.
- Appearing: spacer/divider siguen sin renderizarse, pero en el editor se muestran atenuados para indicar que no aplican.
- Puntitos de progreso: eliminar del todo (preview y vídeo).

## Modelo de datos

Campos planos en `CreditItem`, consistente con `align`/`bold`/`pauseOverride`. Override por item; `undefined` = hereda global.

Nuevos campos opcionales en `CreditItem` (`types.ts`):

- `spacerHeight?: number` — px
- `dividerThickness?: number` — px
- `dividerWidth?: number` — % del ancho del escenario
- `dividerOpacity?: number` — 0–1
- `dividerStyle?: "solid" | "dashed" | "dotted"`
- `dividerColor?: string` — vacío = hereda `config.textColor`

Nuevos defaults globales en `CreditConfig` (`DEFAULT_CONFIG`):

- `spacerHeight: 48` — equivale al `itemSpacing * 2` actual; no cambia el render existente
- `dividerThickness: 1`
- `dividerWidth: 60`
- `dividerOpacity: 0.4`
- `dividerStyle: "solid"`
- `dividerColor: ""` — hereda `textColor`

Nuevo tipo exportado: `DividerStyle = "solid" | "dashed" | "dotted"`.

## Resolución (módulo puro)

Funciones puras extraídas y testeables, en línea con `appearing.ts` y `scroll.ts`:

- `resolveSpacerHeight(item, config): number` → `item.spacerHeight ?? config.spacerHeight`
- `resolveDividerStyle(item, config): { thickness, width, opacity, style, color }` → cada campo `item.X ?? config.X`; `color` resuelto a `config.textColor` cuando queda vacío.

Ubicación: `src/lib/credit/separators.ts` (módulo nuevo).

## Render (`ScrollCredits.tsx`, `CreditLine`)

- spacer: `height = resolveSpacerHeight(item, config)`.
- divider: la línea pasa de `background` a `borderTop` (`{thickness}px {style} {color}`) con `opacity` y `width` en %. El cambio a `borderTop` es lo que habilita dashed/dotted.

## Editor (`CreditEditor.tsx`)

- Panel de edición nuevo para spacer y divider (hoy excluidos en línea 190):
  - spacer: un control numérico "Alto (px)".
  - divider: grosor, ancho (%), opacidad, estilo (select solid/dashed/dotted), color.
  - Todos con placeholder = valor global y nota "vacío = global", patrón de `pauseOverride`.
- En modo appearing: filas de spacer/divider atenuadas (opacidad reducida) con nota "(no se aplica en aparición)".

## Config global (`ConfigPanel.tsx`)

Controles globales para spacer (alto) y divider (grosor / ancho / opacidad / estilo / color) en la sección Layout.

## Puntitos de progreso (`AppearingCredits.tsx`)

Eliminar el bloque "Progress indicator" (líneas 344-357). Sin toggle, sin condicional: retirada total.

## Tests

- `separators.test.ts`: nuevo. Cobertura de `resolveSpacerHeight` y `resolveDividerStyle` (herencia global, override por item, color vacío → textColor).
- `store.test.ts`: caso roundtrip import/export de los nuevos campos de `CreditItem`.

## Fuera de alcance

- Carácter decorativo de separador (`* * *`).
- spacer/divider renderizados en modo appearing.
- Toggle de puntitos (se eliminan, no se hacen opcionales).
