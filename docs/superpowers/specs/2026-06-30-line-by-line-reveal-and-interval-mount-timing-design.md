# Línea a línea + timing de revelados por intervalo — diseño

## Contexto

Feature pedida por el usuario: una animación de aparición que revele un bloque de texto **línea a línea** (saltos `\n`) con control del tiempo entre líneas, combinable con otras animaciones (ej. desenfoque).

Ya implementado inline esta sesión (modelo de modificador, no de tipo):
- `staggerLines` (global en `CreditConfig`, default `false`) + override tri-estado por item (`CreditItem.staggerLines?`).
- `lineRevealInterval` (global, default `0.4`s) + override por item (`CreditItem.lineRevealInterval?`).
- `appearing.ts`: `resolveStaggerLines`, `resolveLineRevealInterval`, `countItemLines`, `isLineStaggered`, rama de `getAppearItemDuration`.
- `AppearingCredits.tsx`: `LinesItem` (cada línea entra con las `variants` del tipo elegido), estado `revealedLines`, efecto de intervalo.
- UI: toggle + slider global en `ConfigPanel`, tri-estado + input por item en `ItemInspector`.
- `getVariants` con caso `default` (cae a fade) para tipos heredados/inválidos.
- Suite 161→175 verde, `tsc` limpio.

## Bug a resolver

El revelado línea a línea **no se ejecuta de forma fiable**: a veces escalona, a veces aparece el bloque entero; no determinista. Verificado por el usuario.

Hechos verificados esta sesión:
- Logs de consola: con un item de 5 líneas que se monta limpio, el efecto corre y `revealedLines` sube 2→3→4→5 (escalona). Con item de 1 línea, `total:1` y no escalona (correcto).
- El usuario reporta el **mismo fallo con la máquina de escribir** (typewriter); el resto de animaciones van bien.
- `state.md` documenta el bug histórico del typewriter: "el efecto letra a letra solo se ve en el PRIMER item; el resto aparecen ya completos".
- Falla tanto en reproducción continua como al hacer doble clic para mostrar el item.

## Causa raíz

Typewriter y línea a línea son las dos únicas animaciones que **no** son framer-motion declarativo: avanzan con `setInterval` dentro de un efecto del padre `AppearingCredits`, disparado por el cambio de `currentIndex`.

`AppearingCredits` envuelve el item actual en `<AnimatePresence mode="wait">`, que **espera a que termine la animación de salida del item anterior antes de montar el nuevo**. El intervalo de revelado arranca al cambiar `currentIndex` (efecto del padre), no al montarse el nodo visible. Por tanto el contador corre durante el hueco de la salida del item anterior; cuando el item se hace visible ya está parcial o totalmente revelado.

- El primer item escalona/teclea bien: no hay item anterior del que esperar la salida.
- Los siguientes fallan según la relación duración-de-salida / intervalo y el jitter de los timers → no determinista.
- El resto de animaciones van bien porque están atadas al ciclo real montar/animar del nodo framer, que sí respeta `mode="wait"`.

## Principio del arreglo

El revelado y el avance deben anclarse al instante en que el item se hace **visible** (se monta), no al cambio de `currentIndex`. Con `mode="wait"`, el nodo nuevo solo se monta (commit de React) cuando termina la salida del anterior, así que **el `useEffect` de montaje de un componente hijo ES la señal fiable de "ahora es visible"** (vale también para el primer item, que no espera salida).

### Modo en vivo vs manual

- `live = manualProgress === null`: reproducción normal; el revelado lo dirige el ciclo de montaje del hijo.
- `manualProgress != null` (export frame a frame / scrubbing): el padre calcula el estado determinista; el hijo lo pinta **estático** (sin transición por línea), para que cada fotograma sea exacto.

### Clave por aparición (cierra G1)

El `motion.div` con clave se keyea por **aparición**, no por id:
`appearanceKey = ${currentIndex}-${cycle}-${restartKey}`.
- `cycle` (estado del padre) se incrementa **solo en el reset de loop** (cuando `currentIndex >= len` y `config.loop` vuelve a 0).
- Así, en loop de un solo item (`currentIndex` 0→1→0 con el mismo id) la clave cambia y el hijo se re-monta → el revelado rearranca. Igual en `Reiniciar` (cambia `restartKey`).

### `LinesItem` (hijo, dueño de su revelado)

Props: `live`, `isPlaying`, `totalLines`, `revealInterval`, `variants`, `manualRevealedLines`, `onShown`.
- Estado interno `revealed` (arranca en 1); como el hijo se re-monta por `appearanceKey`, arranca fresco en cada aparición.
- `useEffect([], onShown)`: al montar llama `onShown()` (señal de visibilidad para el padre).
- `useEffect([live, isPlaying])`: si `live && isPlaying && totalLines > 1`, `setInterval(revealInterval*1000)` que sube `revealed` hasta `totalLines`, continuando desde el valor actual; cleanup limpia el intervalo. Esto cierra **G3** (pausa congela, reanudar continúa) sin re-montar.
- `revealedLines` efectivo = `live ? revealed : manualRevealedLines`.
- Render: en `live` cada línea usa `variants` (animación por línea); en manual, opacidad final inmediata sin transición (cierra **G4**).

### `TypewriterItem` (extraído del render inline)

Mismo patrón: props `live`, `isPlaying`, `text`, `speed`, `manualTypedText`, `onShown`. Estado `typed`, efectos de montaje (`onShown`) y de tecleo (`[live, isPlaying]`). Texto efectivo = `live ? typed : manualTypedText`.

### Avance anclado a la visibilidad (cierra G2)

- El padre programa el avance desde el momento `onShown` (el item ya visible), no desde el cambio de `currentIndex`. Como todos los tipos de item deben avanzar (no solo reveal/typewriter), `onShown` lo dispara un wrapper común de montaje del contenido del item (también para fade/slide/zoom/blur), incrementando un `shownTick` del padre.
- Efecto de avance del padre con deps `[shownTick, isPlaying, manualProgress, ...]`: si `live && isPlaying`, `setTimeout(getAppearItemDuration(currentItem)) -> setCurrentIndex(i+1)` (y `cycle++` en el reset de loop); en pausa se limpia; al reanudar se reprograma.
- Resultado: ventana visible del item = `getAppearItemDuration` completo medido desde que es visible; el revelado (que termina `pause` antes) entra justo.

### `AppearingCredits` (padre)

- Eliminar los efectos de intervalo en vivo atados a `currentIndex` (typewriter y líneas) y el efecto de avance atado a `currentIndex`; sustituirlos por el efecto de avance atado a `shownTick`.
- Conservar el efecto `manual-derive` (calcula `manualRevealedLines`/`manualTypedText` desde `manualProgress`) y el reporte de progreso/índice al timeline (sin cambios).
- Mantener `getAppearItemDuration`/`totalDuration`/`onDurationChange`.

## Decisiones

- **G5 (doble clic)**: se mantiene la semántica actual. `seekToItem` cae a la mitad del item → en un item escalonado eso es el bloque completo revelado. El doble clic es un *seek* (muestra el item), no un *replay*; con el arreglo lo mostrará de forma fiable (no intermitente). No se cambia código de seek.
- **Pausa/reanudar del avance**: al reanudar, el temporizador de avance del item actual se reprograma a su duración completa (el revelado por su parte continúa desde donde estaba). Pequeña imperfección aceptada en reanudaciones a mitad de item; no afecta a reproducción continua ni a export.

## Alcance y verificación

- Lógica pura (resolvers, `isLineStaggered`, `getAppearItemDuration`) ya cubierta por tests; sin cambios de comportamiento ahí.
- El bug es de integración React + framer-motion + timers; happy-dom no reproduce con fidelidad el `mode="wait"`. La aceptación de la integración es **verificación interactiva en navegador por el usuario** (reproducción continua, loop de un solo item, varios items seguidos, y doble clic), no un test unitario frágil.
- Tests unitarios añadidos solo si se extrae algún helper puro nuevo (p. ej. la derivación de `manualRevealedLines`/`manualTypedText` desde `manualProgress`, extraíble y testeable).

## Fuera de alcance

- Errores de Google Fonts en consola (`NS_ERROR_CORRUPTED_CONTENT` / MIME mismatch): URLs mal construidas por `FontLoader` (mete el valor CSS con comillas y fallback). Bug previo y ajeno; pertenece al TODO de privacidad/fuentes.
- Limitación de `título`/`subtítulo` (campo de una línea, no admite `\n`): el usuario confirmó que su caso es `descripción` (textarea), así que no se aborda aquí.
