# Tipo de item logo/imagen + override por item en textos

Fecha: 2026-06-23
Estado: aprobado por el usuario

## Objetivo

1. Nuevo tipo de item `image` (logo) que permite subir una imagen y mostrarla en los créditos.
2. Override por item de propiedades de texto: tamaño, color, fuente, interletraje, interlineado.

## Contexto verificado (lectura de código en esta sesión)

- Tipos de item en `CreditItemType` (`types.ts`). `CREDIT_TYPE_LABELS` y `CREDIT_TYPE_ICONS` son `Record<CreditItemType, string>`: añadir un tipo obliga (TS) a darles entrada.
- Patrón de override por item ya existente: `pauseOverride`, y los recién añadidos de spacer/divider (`spacerHeight`, `divider*`). Campo plano opcional, `undefined` = hereda global; resolver puro en módulo (`separators.ts`, `appearing.ts`).
- Subida de archivo a data URL: `FontManager.tsx` usa `FileReader.readAsDataURL` (líneas ~101-104) con `<input type="file">`.
- Render de texto duplicado en dos sitios: `getItemStyle` en `ScrollCredits.tsx` (líneas 22-49) y el estilo inline de `AppearItem` en `AppearingCredits.tsx` (líneas ~97-117). Ambos leen `config.fontFamily`, `getFontSize(type, config)`, `config.textColor`, `config.letterSpacing`, `config.lineHeight`.
- `getVisibleItems` (`AppearingCredits.tsx` líneas 22-24) filtra `spacer` y `divider`: en modo aparición no se renderizan.
- En aparición, cada item visible anima con `getVariants(config.animationType, duration)` y participa del timing (`getAppearItemDuration`, `pauseOverride`).
- `mergePersistedConfig` (`store.ts`) ya backfillea claves nuevas de `config` al rehidratar; los campos opcionales de `CreditItem` no necesitan migración.
- Export por frames con `html-to-image`: una imagen en data URL va inline, sin fetch externo.

## Decisiones del usuario

- Logo: subir archivo (data URL). No campo de URL.
- Logo: se muestra en scroll y en aparición (animado como los textos en aparición).
- Logo: tamaño con default global + override por item.
- Texto override: tamaño de fuente, color, fuente, interletraje e interlineado.

## Parte A — Tipo de item `image` (logo)

### Modelo de datos

`types.ts`:

- `CreditItemType`: añadir `"image"`.
- `CREDIT_TYPE_LABELS.image = "Logo / Imagen"`.
- `CREDIT_TYPE_ICONS.image = "Image"` — este record (`types.ts`) es código muerto (nunca se importa); se actualiza solo por exhaustividad del `Record<CreditItemType, string>`. El icono real lo da `TYPE_ICONS` (ver UI).
- `CreditItem`:
  - `imageSrc?: string` — data URL de la imagen.
  - `imageWidth?: number` — ancho override en % del ancho del escenario. undefined = hereda `config.imageWidth`.
- `CreditConfig`: `imageWidth: number` — default global, % del ancho del escenario.
- `DEFAULT_CONFIG.imageWidth = 40`.

Unidad de ancho: % del ancho del escenario (consistente con `dividerWidth`; escala con la resolución de export). Alto automático, proporción conservada (`height: auto`). Alineación con `resolveAlignment` existente.

### Resolución (módulo puro)

`src/lib/credit/image.ts` (espejo de `separators.ts`):

- `resolveImageWidth(item: CreditItem, config: CreditConfig): number` → override `>= 0` ?? global.

### Render

- `ScrollCredits.tsx` `CreditLine`: rama nueva `if (item.type === "image")`. Si no hay `imageSrc`, no renderizar nada (`return null`). Si lo hay: contenedor con `padding 0 paddingX`, `display flex`, `justifyContent` según `resolveAlignment`, `margin: itemSpacing 0`; dentro `<img src={imageSrc}>` con `width: ${resolveImageWidth}%`, `height: auto`, `maxWidth: 100%`.
- `AppearingCredits.tsx`:
  - `getVisibleItems`: dejar de filtrar `image` (sigue filtrando `spacer`/`divider`).
  - Cortocircuito de typewriter (HUECO 4): en el render del item actual (línea ~309), la condición `config.animationType === "typewriter"` debe ir DESPUÉS de comprobar `currentItem.type === "image"`. Estructura: `currentItem.type === "image" ? <imagen> : (animationType === "typewriter" ? <typewriter> : <AppearItem>)`. Si no, un logo con animación typewriter intentaría teclear su texto vacío en vez de mostrar la imagen.
  - El render de imagen (compartido por la rama de aparición) muestra `<img>` con el mismo dimensionamiento que en scroll, envuelto en el `motion.div` existente que aplica la animación de entrada/salida.
  - `getAppearItemDuration` (typewriter, `appearing.ts` línea ~19) usa `item.text.length`; para `image` el texto vacío da la duración mínima (`Math.max(2, 0)`), aceptable. La imagen no "teclea": usa la duración base de la animación.

### UI de edición (`CreditEditor.tsx`)

Registro del tipo (HUECOS 1 y 2):

- `TYPE_ICONS` (record local, `Record<CreditItemType, ComponentType>`): añadir `image: Image` (icono `Image` de lucide-react, añadir al import). TS obliga por exhaustividad.
- `ADD_MENU_TYPES` (array literal): añadir `"image"` para que el logo sea insertable desde el menú de añadir. Sin esto, el tipo existe pero no se puede crear.

Gating del panel (HUECO 3): el bloque expandido de controles de texto se abre hoy con `item.type !== "spacer" && item.type !== "divider"`; añadir `&& item.type !== "image"` para que un logo no muestre textarea/negrita/alineación de texto.

Fila resumen (HUECO 6): la condición que hoy distingue spacer/divider del texto debe contemplar también `image`, mostrando "(logo / imagen)" (o miniatura) en vez de caer en la rama de texto y mostrar "(vacío)".

Panel del item para `type === "image"` (nuevo bloque, como los de spacer/divider):

- `<input type="file" accept="image/*">` oculto disparado por un botón; `FileReader.readAsDataURL` → `updateItem(item.id, { imageSrc })`.
- Miniatura de la imagen actual + botón "Quitar" (`updateItem(item.id, { imageSrc: undefined })`).
- Input numérico de ancho override ("Ancho %", placeholder = `config.imageWidth`, "vacío = global").

### Config global (`ConfigPanel.tsx`)

- Slider "Ancho del logo" (%) en la sección Diseño, junto a los controles de spacer/divider.

### Riesgo anotado

La imagen se guarda como data URL en el estado persistido en `localStorage` (límite ~5 MB). Imágenes grandes pueden desbordar la cuota. Sin reescalado automático en esta entrega. TODO registrado para valorar downscale/compresión.

## Parte B — Override por item en textos

### Modelo de datos

`CreditItem` (`types.ts`), campos opcionales nuevos:

- `fontSize?: number` — px. undefined = hereda `getFontSize(type, config)`.
- `color?: string` — vacío/undefined = hereda `config.textColor`.
- `fontFamily?: string` — vacío/undefined = hereda `config.fontFamily`.
- `letterSpacing?: number` — px. undefined = hereda `config.letterSpacing`.
- `lineHeight?: number` — undefined = hereda `config.lineHeight`.

`fontWeight` se sigue derivando de `bold`/tipo (`getFontWeight`), sin override en esta entrega.

### Resolución (módulo puro)

`src/lib/credit/textStyle.ts` (nuevo):

- `interface ResolvedTextStyle { fontFamily: string; fontSize: number; color: string; letterSpacing: number; lineHeight: number }`
- `resolveTextStyle(item: CreditItem, config: CreditConfig): ResolvedTextStyle`. Reglas por campo (el límite difiere según lo que sea un valor válido para esa propiedad):
  - `fontSize`: `item.fontSize` si es número `> 0`, si no `getFontSize(item.type, config)`. (0 o negativo = no-set.)
  - `color`: `item.color` tras `trim()` si no vacío, si no `config.textColor`.
  - `fontFamily`: `item.fontFamily` tras `trim()` si no vacío, si no `config.fontFamily`.
  - `letterSpacing`: `item.letterSpacing` si es número (admite 0 y negativos: ambos son CSS válido; el global por defecto es 0), si no `config.letterSpacing`.
  - `lineHeight`: `item.lineHeight` si es número `> 0`, si no `config.lineHeight`. (0 o negativo = no-set.)

`resolveTextStyle` importa `getFontSize` de `store.ts`. No hay ciclo: textStyle → store → types (store no importa de textStyle).

### Consumo en renderers

Hay TRES sitios que construyen estilo de texto inline (HUECO 5); los tres consumen `resolveTextStyle`:

- `ScrollCredits.tsx` `getItemStyle`: sustituir las lecturas directas de `config.fontFamily`/`fontSize`/`textColor`/`letterSpacing`/`lineHeight` por los valores de `resolveTextStyle(item, config)`. `fontWeight`, sombra, alineación, transform, padding: sin cambios.
- `AppearingCredits.tsx` `AppearItem`: mismo reemplazo en su estilo inline.
- `AppearingCredits.tsx` bloque typewriter (líneas ~310-327): mismo reemplazo, para que el override por item aplique también con animación typewriter.

### UI de edición (`CreditEditor.tsx`)

En el panel del item, solo para tipos de texto (no spacer/divider/image), añadir controles "vacío = global":

- Tamaño: input numérico px (placeholder = `getFontSize(type, config)`).
- Color: selector con swatch + hex + botón "global" (mismo patrón que el color del divider).
- Fuente: `Select` poblado desde `fonts` del store (cada opción usa `family` como value), con opción "(global)" = undefined.
- Interletraje: input numérico px (placeholder = `config.letterSpacing`).
- Interlineado: input numérico (placeholder = `config.lineHeight`, step 0.1).

No se añaden controles globales nuevos en `ConfigPanel` para texto (ya existen).

## Persistencia y migración

- `config.imageWidth`: backfill automático vía `mergePersistedConfig` ya existente.
- Campos nuevos de `CreditItem` (image y texto): opcionales, sin migración. `importProject`/`exportProject` los preservan por spread.

## Tests

- `image.test.ts`: `resolveImageWidth` (global, override, override 0, negativo → global).
- `textStyle.test.ts`: `resolveTextStyle` herencia global y override por campo; color/fuente vacíos → global; fontSize cae a `getFontSize` por tipo; negativos → global.
- `store.test.ts`: roundtrip export→import preservando `imageSrc`/`imageWidth` y los campos de texto override.

Render JSX, subida de archivo y UID quedan fuera del alcance unit (patrón del proyecto); UI verificada con `tsc --noEmit` y navegador.

## Fuera de alcance

- Campo de URL externa para la imagen (solo subida).
- Reescalado/compresión automática de la imagen.
- Override de `fontWeight` por item.
- Logo en spacer/divider (siguen sin renderizarse en aparición).
