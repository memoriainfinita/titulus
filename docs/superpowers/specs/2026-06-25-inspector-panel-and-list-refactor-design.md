# Inspector contextual + lista pura — diseño

## Objetivo
Reorganizar la UI de edición en tres movimientos:
1. Panel izquierdo (`CreditEditor`) pasa a lista pura: crear, reordenar, seleccionar.
2. Panel derecho (`ConfigPanel`) pasa a inspector contextual: config global sin selección; propiedades del item seleccionado con selección.
3. Reorganizar las categorías de la config global (resuelve el cajón de sastre "Diseño" y el ratio mal clasificado).

Más: inserción en hueco entre filas, seek de la línea de tiempo por doble clic, y resalte del item activo en la lista según avanza el pase.

Es reubicación de UI y plumbing de selección. Los resolvers y tipos de dominio no cambian.

## Modelo de interacción
- Panel izquierdo = lista pura: añadir, reordenar (drag&drop), seleccionar. Sin edición inline.
- Clic simple en fila = seleccionar.
- Doble clic en fila = seleccionar + seek de la línea de tiempo a ese item.
- Panel derecho = inspector contextual.
- Inspector sin item seleccionado = config global.
- Inspector con item seleccionado = solo propiedades aplicables a ese tipo, cada una con default "global".
- Cabecera del inspector con toggle "Ver global": ojea la global sin deseleccionar; el mismo botón vuelve al item. Oculto/inactivo cuando no hay item.
- Seleccionar otro item resetea el toggle a vista de item.
- Clic de nuevo en la fila ya seleccionada = deselecciona → inspector vuelve a global.

## Reorganización de la config global
| Antes | Después |
|---|---|
| Modo (estilo + ratio) | **Escenario** (ratio) + **Modo de crédito** (solo scroll/aparición) |
| Diseño (alineación, espaciado, padding, spacer, divider×5, ancho logo) | **Diseño** (alineación, espaciado entre items, padding horizontal) + **Separadores** (alto spacer + divider grosor/ancho/opacidad/estilo/color) + **Imágenes** (ancho logo) |
| Tipografía, Colores y fondo, Efectos, Animación (scroll/aparición) | sin cambios |

Orden de secciones global: Escenario / Modo de crédito / Tipografía / Colores y fondo / Efectos / Diseño / Separadores / Imágenes / Animación.

## Inspector por tipo de item
Cada grupo con cabecera etiquetada.

- **Texto** (title/subtitle/name/role/description):
  - Texto (campo: input para title/subtitle, textarea para el resto)
  - Formato (negrita / cursiva / mayúsculas / alineación)
  - Estilo de texto (tamaño, color, fuente, interletra, interlínea, peso, no-wrap, ancho caja)
  - Efectos (sombra tri-estado + campos; desenfoque)
  - Animación — solo aparición — (tipo / duración / tunables + pausa + velocidad de tecleo)
- **Espaciador:** alto.
- **Separador:** grosor, ancho, opacidad, estilo, color.
- **Imagen:** subir / cambiar / quitar + ancho; Animación (solo aparición).
- En modo scroll, la sección Animación se oculta (es solo de aparición).

La pausa por item, hoy huérfana en el editor, se integra en la sección Animación (ambas son solo de aparición).

## Inserción en hueco
- Zona "+" entre filas, visible al hover, que abre el menú de tipos e inserta en ese hueco.
- Los huecos cubren también antes del primero y después del último.
- Insertar auto-selecciona el item nuevo (el inspector abre para editarlo).
- El botón superior "Añadir crédito" no cambia (append al final).
- Las zonas "+" no deben interferir con los drop targets del drag&drop.

## Resalte del item activo
- La store mantiene un `activeItemId` efímero (no persistido) = item que se está mostrando en el pase.
- `CreditPreview` lo actualiza solo cuando cambia (no por frame), para no re-renderizar la lista en cada fotograma.
  - Aparición: a partir de `onIndexChange` (índice de item visible) mapeado a id.
  - Scroll: a partir del progreso, mapeado a índice con el helper de geometría (ver Tests).
- `CreditEditor` resalta la fila cuyo id === `activeItemId`, con un indicador visual distinto al de selección.
- Distinción visual: selección (borde/anillo primario, ya existe) vs activo en el pase (indicador aparte, p. ej. barra de acento lateral).

## Arquitectura
- `ConfigPanel.tsx` se divide en:
  - `InspectorPanel`: router + cabecera con el toggle "Ver global". Lee `selectedItemId` y un estado local de "ojear global"; renderiza `GlobalConfig` o `ItemInspector`.
  - `GlobalConfig`: el cuerpo actual del `ConfigPanel`, con las secciones reorganizadas.
  - `ItemInspector`: nuevo; recibe el item seleccionado y renderiza las secciones por tipo.
- `PresetBar` se mantiene exportado y renderizado en la barra superior de `page.tsx`; se actualiza su ruta de import si cambia de archivo.
- `CreditEditor` adelgaza a lista: se le quitan campo de texto, botones de formato, `ShadowOverrides`, `AnimationOverrides` y los paneles de spacer/divider/image (migran a `ItemInspector`). Gana doble clic → seek, las zonas "+", y el resalte del item activo.
- Canal selección → seek: la store gana `seekTarget` efímero (id + nonce); `CreditPreview` lo observa por efecto y ejecuta su `seekToItem` (aparición) o el seek simple (scroll).
- Seek en scroll = simple: mapear índice del item a progreso lineal mediante helper puro.
- Resolvers y tipos de dominio (`types.ts`, `appearing.ts`, `separators.ts`, `textStyle.ts`, `text-shadow.ts`, `text-blur.ts`, `scroll.ts`, `timeline.ts`) sin cambios. La lógica de override no se toca; solo se mueve dónde se edita.

## Estado de la store
Campos/acciones nuevos:
- `insertItem(type, index)`: inserta un item del tipo dado en la posición `index` y lo selecciona.
- `seekTarget`: `{ id, nonce }` efímero; acción para fijarlo en doble clic.
- `activeItemId`: efímero; acción para fijarlo desde `CreditPreview`.

Reglas:
- `seekTarget` y `activeItemId` excluidos del estado persistido (`partialize`).
- `removeItem` y `clearItems` limpian `selectedItemId` si el item activo se elimina.
- Doble clic en item sin momento (spacer/divider en aparición, no presentes en `navBounds`) = no-op para seek.

## Tests
- Helper puro de geometría scroll: índice de item → progreso lineal (y su inverso progreso → índice para el resalte activo). Unit tests, incluidos extremos.
- Store:
  - `insertItem` en índice arbitrario, incluidos antes-del-primero y después-del-último; auto-selección del nuevo.
  - `selectedItemId` limpiado al borrar el item seleccionado y al vaciar.
  - `seekTarget` y `activeItemId` roundtrip; ausencia en el estado persistido.
- Los tests existentes (151) permanecen verdes: la lógica de resolvers no cambia.

## Fuera de alcance
- Regresión de entrada de texto: aceptada (sin Enter-crea-siguiente). El texto se edita item a item en el inspector.
- TODO nuevo, no en este spec: importar CSV/TXT y parsearlo a items para entrada masiva.
