# Inspector contextual + lista pura — diseño

## Objetivo
Reorganizar la UI de edición en tres movimientos:
1. Panel izquierdo (`CreditEditor`) pasa a lista pura: crear, reordenar, seleccionar.
2. Panel derecho (`ConfigPanel`) pasa a inspector contextual: config global sin selección; propiedades del item seleccionado con selección.
3. Reorganizar las categorías de la config global (resuelve el cajón de sastre "Diseño" y el ratio mal clasificado).

Más: inserción en hueco entre filas, seek de la línea de tiempo por doble clic, y resalte del item activo en la lista según avanza el pase (o se arrastra el desplazador).

Es reubicación de UI y plumbing de selección. Los resolvers y tipos de dominio no cambian; se añaden helpers puros de geometría de scroll.

## Modelo de interacción
- Panel izquierdo = lista pura: añadir, reordenar (drag&drop), seleccionar. Sin edición inline.
- Clic simple en fila = seleccionar.
- Doble clic en fila = seleccionar + seek de la línea de tiempo a ese item.
- `onClick` (select) y `onDoubleClick` (seek) coexisten a propósito: un doble clic dispara select y luego seek. No "arreglar" esa doble emisión.
- Panel derecho = inspector contextual.
- Inspector sin item seleccionado = config global.
- Inspector con item seleccionado = solo propiedades aplicables a ese tipo, cada una con default "global".
- Cabecera del inspector con toggle "Ver global": ojea la global sin deseleccionar; el mismo botón vuelve al item. Oculto/inactivo cuando no hay item.
- Seleccionar otro item resetea el toggle a vista de item (estado local de `InspectorPanel`).
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
- **Espaciador:** alto. Nota "no se aplica en aparición" cuando el modo es aparición (conservada del editor actual).
- **Separador:** grosor, ancho, opacidad, estilo, color. Misma nota "no se aplica en aparición".
- **Imagen:** subir / cambiar / quitar + ancho; Animación (solo aparición).
- En modo scroll, la sección Animación se oculta (es solo de aparición).

La pausa por item, hoy huérfana en el editor, se integra en la sección Animación (ambas son solo de aparición).

## Inserción en hueco
- Zona "+" entre filas, visible al hover, que abre el menú de tipos e inserta en ese hueco.
- Reutiliza la acción existente `addItem(type, text?, index?)` (ya soporta índice y ya auto-selecciona). No se añade `insertItem`.
- Mapeo hueco→índice (`addItem` hace `splice(index, 0)`, inserta ANTES de `index`):
  - hueco entre fila `i` e `i+1` → `index = i + 1`
  - hueco antes del primero → `index = 0`
  - hueco tras el último → `index = items.length` (o `undefined` = append)
- Los huecos cubren antes del primero y después del último.
- El item insertado se auto-selecciona (el inspector abre para editarlo).
- El botón superior "Añadir crédito" no cambia (append al final).
- Las zonas "+" no deben interferir con los drop targets del drag&drop.
- Corrección colateral: hoy `addItem` declara `text = ""`, así que `text ?? placeholder` nunca usa el placeholder (`""` no es nullish) y los items nuevos entran vacíos. Cambiar para que un item creado sin texto reciba el placeholder de su tipo ("Nuevo título", etc.).

## Seek y resalte del item activo
Selección y reproducción se comunican por la store, no por props entre paneles.

### Canal selección → seek (doble clic)
- La store gana `seekTarget` efímero `{ id, nonce }`; el `nonce` distingue dobles clics repetidos sobre el mismo item.
- `CreditPreview` lo observa por efecto y ejecuta el seek:
  - Aparición: mapea `id` a índice vía `getVisibleItems(items)` y reutiliza `seekToItem`.
  - Scroll: mapea `id` a su posición de scroll real (ver geometría) y fija `manualSeek` en ese progreso.
- Doble clic en item sin momento (spacer/divider en aparición, ausente de `getVisibleItems`) = no-op. En scroll sí tienen posición (se renderizan).

### Canal reproducción → resalte (item activo)
- La store gana `activeItemId` efímero = item que se está mostrando.
- Se actualiza SOLO cuando cambia, nunca por frame, para no re-renderizar la lista en cada fotograma.
- `CreditEditor` resalta la fila cuyo `id === activeItemId`, con un indicador visual distinto al de selección (selección = borde/anillo primario ya existente; activo = indicador aparte, p. ej. barra de acento lateral).

### Geometría: una sola fuente de verdad
Para que el resalte concuerde con lo que se ve al arrastrar el desplazador, seek y resalte en scroll derivan de la MISMA geometría real medida, no de una aproximación lineal (esto sustituye la idea previa de "seek simple por índice").

- Aparición: el índice real lo da `onIndexChange` de `AppearingCredits`; se indexa sobre `getVisibleItems` (excluye spacer/divider).
- Scroll: se indexa sobre TODOS los items renderizados (spacer/divider incluidos, sí se ven).
  - `ScrollCredits` mide el `offsetTop` y la altura de cada item dentro del contenido y los reporta hacia arriba (nuevo callback). `CreditPreview` los consume.
  - Línea de referencia = centro vertical del escenario.
  - Nuevos helpers PUROS en `scroll.ts`:
    - `scrollProgressForItem(itemTop, itemHeight, contentHeight, containerHeight, direction, refFraction)` → progreso que sitúa ese item en la línea de referencia (para el seek).
    - `activeItemIndexAtProgress(offsets[], contentHeight, containerHeight, direction, progress, refFraction)` → índice del item activo en ese progreso (para el resalte).
  - Regla estable del item activo (evita parpadeo en huecos/extremos): el item de mayor `top` cuyo borde superior ya ha pasado la línea de referencia; antes del primero, el primero.
- El resalte se recalcula en el mismo RAF que ya lee `progressRef` (el de `TimelineBar`/preview) y escribe en la store solo al cambiar de índice; así arrastrar el desplazador mantiene la lista sincronizada.

## Arquitectura
- `ConfigPanel.tsx` se divide en:
  - `InspectorPanel`: router + cabecera con el toggle "Ver global". Lee `selectedItemId` y un estado local de "ojear global"; renderiza `GlobalConfig` o `ItemInspector`.
  - `GlobalConfig`: el cuerpo actual del `ConfigPanel`, con las secciones reorganizadas.
  - `ItemInspector`: nuevo; recibe el item seleccionado y renderiza las secciones por tipo.
- `PresetBar` se mantiene exportado y renderizado en la barra superior de `page.tsx`; se actualiza su ruta de import si cambia de archivo.
- `CreditEditor` adelgaza a lista: se le quitan campo de texto, botones de formato, `ShadowOverrides`, `AnimationOverrides` y los paneles de spacer/divider/image (migran a `ItemInspector`). Gana doble clic → seek, las zonas "+", y el resalte del item activo.
- `ScrollCredits` gana la medición de offsets por item y su reporte; consume `manualSeek` ya existente para el salto.
- Resolvers y tipos de dominio (`types.ts`, `appearing.ts`, `separators.ts`, `textStyle.ts`, `text-shadow.ts`, `text-blur.ts`, `timeline.ts`) sin cambios. La lógica de override no se toca; solo se mueve dónde se edita. `scroll.ts` gana helpers nuevos.

## Estado de la store
Campos/acciones nuevos:
- `seekTarget`: `{ id, nonce }` efímero; acción para fijarlo en doble clic.
- `activeItemId`: efímero; acción para fijarlo desde `CreditPreview`.

Ya existe y se reutiliza (no es trabajo nuevo, solo verificación):
- `addItem(type, text?, index?)` con índice y auto-selección.
- Limpieza de selección al borrar/vaciar/cargar: `removeItem`, `clearItems`, `loadItems` ya ponen `selectedItemId: null`.

Persistencia:
- `partialize` es whitelist: los campos efímeros nuevos (`seekTarget`, `activeItemId`) quedan fuera por defecto con solo NO añadirlos. No hay nada que "excluir".

## Tests
- Helpers puros nuevos en `scroll.ts`: `scrollProgressForItem` y `activeItemIndexAtProgress`. Unit tests con offsets sintéticos, incluidos extremos (antes del primero, después del último, en hueco) y ambas direcciones.
- Store:
  - `addItem` con índice arbitrario, incluidos antes-del-primero y después-del-último; auto-selección del nuevo; placeholder de texto por tipo cuando se crea sin texto.
  - `seekTarget` y `activeItemId` roundtrip; ausencia en el estado persistido.
  - Verificación de que `removeItem`/`clearItems` limpian `selectedItemId` (regresión).
- Los tests existentes (151) permanecen verdes: la lógica de resolvers no cambia.

## Fuera de alcance
- Regresión de entrada de texto: aceptada (sin Enter-crea-siguiente). El texto se edita item a item en el inspector.
- TODO nuevo, no en este spec: importar CSV/TXT y parsearlo a items para entrada masiva.
