# Item de texto rico (formato por fragmento) — diseño

Fecha: 2026-07-03. Aprobado por el usuario en conversación, sección a sección.

## Motivación

- Hoy variar el formato dentro de un texto exige trocearlo en varios items tipados.
- El usuario quiere formatear cualquier fragmento (palabra, letra, frase) dentro de un solo item, estilo editor de bloques de WordPress: fuente, tamaño, negrita, cursiva, color.
- El item decide libremente si es una línea o varias.

## Decisiones cerradas

- Propiedades por fragmento: fuente, tamaño, negrita, cursiva, color (hueco para más).
- Los tipos `title/subtitle/name/role/description` desaparecen. Queda un único tipo de texto rico (`text`) + `spacer` + `divider` + `image`. Sin presets de formato al crear.
- Editor en el inspector (panel derecho). El escenario sigue siendo solo preview.
- Editor: TipTap (ProseMirror, MIT, headless, integración React). Confirmado contra alternativas 2026 (Lexical, Slate, Plate): TipTap es el default recomendado para este caso; Lexical es para editores performance-críticos, Slate/Plate para modelos de documento a medida.
- App en test: sin migración legacy. Ni conversor de tipos viejos, ni soporte en import, ni migración de localStorage (hard reset del usuario).

## Modelo de datos

- Item `text` con campo `rich`: JSON de líneas → runs. Cada línea es lista de `{ text, style? }`; `style` admite `fontFamily`, `fontSize`, `bold`, `italic`, `color`.
- Formato propio, no el de TipTap. Conversores puros `tiptapToRich()` / `richToTiptap()` (testables sin DOM) traducen solo en la frontera del editor.
- Run sin `style` hereda el estilo global de la config (fuente, tamaño base, color), como hoy.
- `item.text` plano se mantiene derivado (concatenación de runs): typewriter, duración y resalte de lista siguen funcionando.
- Campos por item no textuales (alineación, pausa, animación, sombra, blur, wrap...) no cambian.

## Editor (inspector)

- Sustituye al textarea del item de texto en `ItemInspector`.
- Toolbar: selector de fuente (poblado con "Mis fuentes"), input de tamaño en px, botones B / I, swatch de color (reutiliza `ColorInput`). Botón "quitar formato" (la selección vuelve al estilo global).
- Extensiones TipTap: `Document`, `Paragraph` (= línea), `Text`, `Bold`, `Italic`, `TextStyle` + `Color` + `FontFamily`; tamaño como atributo de `TextStyle` (extensión propia pequeña si la oficial no cubre px).
- Sin headings, listas ni enlaces. Enter = línea nueva. Pegado normalizado a texto plano con saltos de línea.
- Guardado: `tiptapToRich()` → `updateItem` al perder foco o con debounce corto.

## Render y animaciones

- Componente puro `RichText` (líneas → `<span>` por run, estilo del run fusionado sobre el base) sustituye a `{item.text}` en `CreditLine` (scroll), `AppearItem` y `LinesItem` (aparición).
- Línea a línea: escalona las líneas del JSON rico; cada línea pinta sus runs. Mismo motor actual.
- Typewriter: helper puro `sliceRuns(runs, nChars)` corta la secuencia aplanada preservando formato; `typedCharsAt` sigue valiendo (longitud = texto plano derivado).
- Export determinista (fix 2026-07-02) intacto: `manualAppearStyle` actúa a nivel contenedor/línea; los runs se pintan estáticos debajo.
- Reparto de estilo: al run → fuente, tamaño, negrita, cursiva, color; al item → alineación, interletraje, interlineado, mayúsculas, blur, sombra, wrap, animación; a la config → fallbacks globales y el resto.
- Overrides por item de fuente/tamaño/color/peso desaparecen (absorbidos por runs); `resolveTextStyle` se simplifica.

## Limpieza

- `CreditItemType` = `text | spacer | divider | image`.
- Fuera: `fontSizeTitle/Subtitle/Name/Role/Description` de la config (sustituidos por `fontSize` base global), `getFontSize`/`getFontWeight` del store, etiquetas/iconos de tipos viejos, campos por item absorbidos por runs.
- `DEFAULT_ITEMS` regenerado como items ricos que demuestren la feature.
- Menú "+" con 4 entradas.
- `importProject`: la validación acepta solo los 4 tipos nuevos (los viejos se rechazan como cualquier tipo desconocido).

## Tests

- Conversores TipTap↔runs, `sliceRuns`, roundtrip de `rich` en el store, validación de import actualizada.
- `tsc`, lint y `next build` limpios en cada tarea.
