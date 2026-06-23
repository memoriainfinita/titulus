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

## Persistencia y migración

`store.ts` usa `persist` (zustand) con `partialize` que guarda `config` completo en localStorage (`credit-titles-store`). El merge por defecto al rehidratar es shallow a nivel raíz: el `config` persistido reemplaza `DEFAULT_CONFIG`, no se fusiona. Los nuevos campos quedarían `undefined` para usuarios con estado ya guardado → render roto.

Fix: añadir `merge` custom en las opciones de `persist` que fusione `config` sobre `DEFAULT_CONFIG`:

```ts
merge: (persisted, current) => {
  const p = (persisted ?? {}) as Partial<CreditState>
  return { ...current, ...p, config: { ...DEFAULT_CONFIG, ...(p.config ?? {}) } }
}
```

Cubre también cualquier campo de config que se añada en el futuro. `importProject` ya hace el merge equivalente; sin cambios ahí.

## Render (`ScrollCredits.tsx`, `CreditLine`)

- spacer: `height = resolveSpacerHeight(item, config)`.
- divider: la línea pasa de `background` a `borderTop` (`{thickness}px {style} {color}`) con `opacity` y `width` en %. El cambio a `borderTop` es lo que habilita dashed/dotted.

## Editor (`CreditEditor.tsx`)

- Panel de edición nuevo para spacer y divider (hoy excluidos en línea 190):
  - spacer: un control numérico "Alto (px)".
  - divider: grosor, ancho (%), opacidad, estilo, color.
  - Controles concretos (el panel del editor es estrecho, sin sliders):
    - numéricos (alto, grosor, ancho, opacidad): `Input type=number` con `placeholder` = valor global y nota "vacío = global", patrón de `pauseOverride`.
    - estilo: `Select` con opciones "(global)" / solid / dashed / dotted; "(global)" = `undefined`.
    - color: input de texto hex con `placeholder` = color global efectivo; vacío = global. Se usa input de texto, no `<input type=color>`, porque este último no admite valor vacío.
- En modo appearing: filas de spacer/divider atenuadas (opacidad reducida) con nota "(no se aplica en aparición)".

## Config global (`ConfigPanel.tsx`)

Controles globales en la sección "Diseño" (Layout), tras "Padding horizontal":

- spacer: slider "Alto del espacio" (px).
- divider: sliders grosor (px) / ancho (%) / opacidad (0–1), `Select` de estilo (solid/dashed/dotted).
- color del divider: switch "Heredar color del texto" (on por defecto → `dividerColor = ""`); al apagarlo se muestra `ColorInput` y `dividerColor` pasa a hex. Mismo patrón que `useGradient` / `useTextShadow`. Se usa porque el `ColorInput` (native `<input type=color>`) no admite vacío.

`PresetBar`: cada preset hace `...DEFAULT_CONFIG`, por lo que incluirán los nuevos defaults automáticamente; aplicar un preset resetea spacer/divider globales a sus valores por defecto. Comportamiento aceptado, sin cambios en `PresetBar`.

## Puntitos de progreso (`AppearingCredits.tsx`)

Eliminar el bloque "Progress indicator" (líneas 344-357). Sin toggle, sin condicional: retirada total.

## Tests

- `separators.test.ts`: nuevo. Cobertura de `resolveSpacerHeight` y `resolveDividerStyle` (herencia global, override por item, color vacío → textColor).
- `store.test.ts`: caso roundtrip import/export de los nuevos campos de `CreditItem` y de los nuevos campos de `config` (verifica que `importProject` los preserva y que el merge con `DEFAULT_CONFIG` rellena los ausentes).

## Fuera de alcance

- Carácter decorativo de separador (`* * *`).
- spacer/divider renderizados en modo appearing.
- Toggle de puntitos (se eliminan, no se hacen opcionales).
