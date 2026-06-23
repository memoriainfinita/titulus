# Credit Titles Studio — state

## Proyecto
- Generador de títulos de crédito para vídeo. Origen: app generada por z.ai, descargada como `.tar`.
- Ubicación repo/proyecto: `D:\DOCS\CODELAB\1_in-progress\credits app\app`. El `.tar` original queda en la carpeta padre.

## Stack
- Next.js 16.2.9 (Turbopack), React 19, TypeScript, Tailwind 4, shadcn/ui, Zustand, Prisma + SQLite, FFmpeg-wasm + html-to-image.
- Gestor: pnpm 11.1.1 (Node v24.9.0). Diseñado originalmente para Bun (no instalado en esta máquina).

## Arranque
- `pnpm install` (requiere builds aprobados, ver Patterns) → `pnpm exec prisma generate` → `pnpm dev`.
- Dev server: http://localhost:3000.

## Arquitectura
- Layout de 3 paneles (`src/app/page.tsx`): `CreditEditor` (izq), `CreditPreview` (centro), `ConfigPanel` (der).
- Lógica de créditos en `src/lib/credit/` y `src/components/credit/`. Modos: `scroll` y `appearing`.
- Estado real en cliente con Zustand. Prisma trae esquema por defecto (`User`/`Post`) no usado por la app.
- Exportación de vídeo (`src/lib/credit/useVideoExport.ts`): captura frames con html-to-image y codifica con FFmpeg-wasm en el navegador.

## Patterns
- [pnpm] Builds nativos (prisma, sharp, swc, parcel/watcher, etc.) se aprueban en `pnpm-workspace.yaml` con `allowBuilds: <pkg>: true`. El bloque `"pnpm"` de `package.json` no lo lee pnpm 11. Confirmed 2026-06.
- [windows] Scripts npm con `| tee` fallan al lanzarse con pnpm en Windows (cmd.exe no tiene `tee`). Confirmed 2026-06.

## History
- 2026-06-22: extraído tar de z.ai. `.env` corregido (`DATABASE_URL` a `file:./db/custom.db`). Migrado de npm a pnpm. Script `dev` arreglado (quitado `| tee dev.log`). Builds aprobados vía `pnpm-workspace.yaml`. App arrancada OK (HTTP 200). Git iniciado limpio en `app/` (historial z.ai descartado por decisión del usuario). Commit inicial `7e0db66`.
- 2026-06-22: arreglado scroll de paneles izq/der con `min-h-0` en `ScrollArea` (`ConfigPanel.tsx`, `CreditEditor.tsx`). Commit `eb2f4cf`. Añadidos al TODO los features/bugs pedidos por el usuario (timing por item, presets propios, modo oscuro, timeline, control de fade, retardo inicial de scroll, lentitud de exportación, botones de navegación visibles en el vídeo, auditoría de privacidad). Log de sesión en `state.md` commit `2e6473f`.
- 2026-06-22: eliminada dependencia muerta `z-ai-web-dev-sdk` (no se importaba); lockfile actualizado. Commit `195cf4b`. Creado `README.md` del proyecto. Commit `1a6abee`.
- 2026-06-23: arreglado bug del primer texto en scroll (eliminado padding superior duplicado en `ScrollCredits.tsx`). Implementado modo oscuro de la UI con `next-themes` (`theme-provider.tsx`, `theme-toggle.tsx`, wrap en `layout.tsx`, toggle en `page.tsx`). Verificado en navegador (HTTP 200, sin errores de compilación). Bug de controles en el vídeo confirmado no reproducible por el usuario. Triage de TODOs: `scrollSpeed` y fuentes custom ya estaban implementados. Nuevos TODO: tests con Vitest, resolución de export elegible. Errores de `tsc` preexistentes en `useVideoExport.ts`/`CreditPreview.tsx`/`examples` (no introducidos esta sesión).

- 2026-06-23: implementada pausa personalizada por item en modo appearing. Campo opcional `pauseOverride` en `CreditItem` (`types.ts`). Lógica de duración des-duplicada y extraída a módulo puro `src/lib/credit/appearing.ts` (`getAppearItemDuration` + `resolveItemPause`); `AppearingCredits.tsx` ahora la consume en vez de repetir el cálculo inline. UI: input "Pausa (s)" + badge en `CreditEditor.tsx`, visibles solo en modo appearing. Tests: nuevo `appearing.test.ts` (7) + caso roundtrip de `pauseOverride` en `store.test.ts`; 42 verdes. Eliminado el bloque `"pnpm"` inerte de `package.json`. Caché `.next` corrupta (TurbopackInternalError "Failed to write app endpoint", agravado por "Slow filesystem detected" en D:) borrada y dev server reiniciado limpio en :3000 (HTTP 200). Verificado en navegador por el usuario.

- 2026-06-23: ejecutado el plan de spacers/dividers configurables (6 tareas TDD inline). Nuevos campos opcionales por item en `CreditItem` (`spacerHeight`, `dividerThickness/Width/Opacity/Style/Color`) y defaults globales en `CreditConfig`; tipo `DividerStyle`. Módulo puro `separators.ts` (`resolveSpacerHeight`/`resolveDivider`, override >= 0 ?? global, color cae a `config.textColor`). `merge` custom en el persist de zustand vía `mergePersistedConfig` para backfill de claves nuevas en estados ya guardados. Render de divider migrado de `background` a `borderTop` (habilita dashed/dotted) en `ScrollCredits.tsx`. Eliminados los puntitos de progreso del modo aparición (`AppearingCredits.tsx`). UI: panel de edición por item de spacer/divider + filas atenuadas en aparición (`CreditEditor.tsx`); sliders/select/switch globales en la sección Diseño (`ConfigPanel.tsx`). Suite 42 -> 54 verdes (9 `separators.test.ts` + 3 `store.test.ts`). Commits `4104fd8`, `4ae1a4c`, `467dadb`, `f323dc6`, `d2c0e60`, `5958318`. Verificación interactiva en navegador pendiente del usuario.

- 2026-06-23: sesión de diseño (sin tocar código de la app). Cerrado el TODO de tiempos por item en modo scroll (descartado: en scroll el espaciado se logra con líneas en blanco, un timing por item sería redundante). Brainstorming → spec y plan para dos features: (1) spacer/divider configurables con default global + override por item (módulo puro `separators.ts` con `resolveSpacerHeight`/`resolveDivider`, `merge` en el `persist` de zustand para backfill de claves nuevas, render con `borderTop` para dashed/dotted, UI en `CreditEditor` y `ConfigPanel`); (2) retirada de los puntitos de progreso en modo aparición. Spec en `docs/superpowers/specs/2026-06-23-spacers-dividers-config-design.md`, plan en `docs/superpowers/plans/2026-06-23-spacers-dividers-config.md` (6 tareas TDD, suite objetivo 54 tests). Nuevos TODO registrados: override de fuente/tamaño/color por item, navegación fuera del frame en aparición, vignette sin control, opacidad de sombra, animaciones de aparición hardcodeadas. Commits `72b7011`, `27b8896`, `a75e2bc`, `d1dcea2`. Pendiente: ejecutar el plan inline en la próxima sesión.

## TODO
- [x] Paneles izquierdo y derecho sin barra de scroll: resuelto con `min-h-0` en las dos `ScrollArea` (`ConfigPanel.tsx`, `CreditEditor.tsx`).
- [x] Quitar el bloque `"pnpm"` inerte de `package.json` (resuelto 2026-06-23): eliminado; la aprobación de builds la cubre `pnpm-workspace.yaml`.

### Tests (2026-06-23)
- [x] Montado Vitest 4 + happy-dom. Scripts `test`/`test:run`, `vitest.config.ts` (alias `@`). Geometría del scroll extraída a `src/lib/credit/scroll.ts` (puro) y usada en `ScrollCredits.tsx`. 34 tests verdes en `scroll.test.ts`, `store.test.ts` (helpers + reducers + roundtrip import/export), `fonts.test.ts`. UI/FFmpeg/drag&drop fuera del alcance unit.

### Investigar / features pendientes (pedidos 2026-06-22)
- [x] Tiempos personalizados por título. Implementado 2026-06-23 para modo appearing (campo `pauseOverride` en `CreditItem`, sobreescribe la pausa por item; duración de animación global). Modo scroll descartado por decisión del usuario 2026-06-23: en scroll el espaciado se logra añadiendo líneas en blanco entre textos, un timing por item sería redundante.
- [x] Velocidad de scroll: slider `scrollSpeed` (10-300 px/s) operativo en `ConfigPanel` y aplicado en `ScrollCredits`. Verificado 2026-06-23.
- [x] Fuentes personalizadas: `FontManager` completo (catálogo Google Fonts, subida ttf/otf/woff con `@font-face`, activar/eliminar). Verificado 2026-06-23.
- [x] Modo oscuro: implementado 2026-06-23. `next-themes` con `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`) en `layout.tsx`, toggle sol/luna (`theme-toggle.tsx`) en el header. Tematiza la UI del editor; el fondo del escenario sigue siendo configurable aparte.
- [x] Modo appearing: círculos indicadores de progreso. Eliminados 2026-06-23 del todo (preview y export), bloque "Progress indicator" retirado de `AppearingCredits.tsx`.
- [ ] Presets propios del usuario: actualmente solo presets fijos en `PresetBar`. No hay guardar/cargar propios.
- [ ] Línea de tiempo (timeline) para navegación mientras se editan los créditos. No existe.
- [ ] Control de los tiempos de fade.
- [x] Bug: en modo scroll tarda mucho hasta que aparece el primer texto. Resuelto 2026-06-23: había un offset doble (translateY inicial + padding superior de `containerHeight`); eliminado el padding superior en `ScrollCredits.tsx`. `config.startDelay` sigue sin usarse (código muerto).
- [ ] Resolución de exportación no elegible: la salida usa `config.stageWidth × stageHeight` (fijado por `stageRatio`), con `pixelRatio: 1` clavado en `useVideoExport.ts`. En 16:9 siempre 720p. Añadir selector de resolución (720p/1080p/1440p/4K) en `ExportDialog`, escalando vía `pixelRatio` y dimensiones pares (lo exige yuv420p de H.264). Subir resolución agrava la lentitud (1080p ~2,25×, 4K ~9×); valorar atacar antes el rendimiento.
- [ ] Exportación muy lenta (estimaba ~1 min, llega a >5 min). Enfoque actual en `useVideoExport.ts`: captura frame a frame con `html-to-image` (`toPng` por fotograma) + FFmpeg-wasm; lento por diseño. Referencia del usuario: en app previa "sequentia" era mucho más rápido. Investigar alternativa (hipótesis: `MediaRecorder` + `canvas.captureStream()` en tiempo real).
- [x] Bug: en el vídeo exportado se ven los botones de navegación. No reproducible 2026-06-23: el export captura `exportStageRef` (escenario oculto sin controles); el usuario confirmó MP4 limpio tras recompilar. La captura previa con controles era de un build anterior.
- [ ] Privacidad / envío de datos a terceros. Revisión inicial 2026-06-22: sin analytics ni telemetría; `z-ai-web-dev-sdk` se eliminó (dependencia muerta, no se importaba). Únicas conexiones externas (GET, no envían contenido del usuario): `unpkg.com` (FFmpeg core, al exportar) y `fonts.googleapis.com`/`fonts.gstatic.com` (Google Fonts). Pendiente: auditoría más a fondo y decidir si self-hostear FFmpeg y fuentes para no contactar terceros.
- [ ] Override por item de fuente, tamaño y color, igual que el override de pausa (`pauseOverride`): cada `CreditItem` podría sobreescribir `fontFamily`, `fontSize` y `textColor` globales. Pedido 2026-06-23.
- [ ] Modo aparición: navegación fuera del frame. Los puntitos de progreso (que se eliminan de dentro del escenario) reaparecen FUERA del área exportable, como línea de tiempo para saltar entre items y ver por dónde va el pase, sin que salgan en el vídeo. Pedido 2026-06-23. Relacionado con el TODO de timeline.
- [ ] Vignette/desvanecido sin control: los fades superior e inferior ("Top fade"/"Bottom fade" en `ScrollCredits.tsx`, mismos en `AppearingCredits.tsx`) tienen `height: "20%"` fijo y siempre activos; sin toggle ni ajuste de altura. Pedido 2026-06-23.
- [ ] Opacidad de la sombra de texto no configurable: la sombra se construye `${X}px ${Y}px ${blur}px ${textShadowColor}` con color hex sin alpha, siempre a opacidad plena. Añadir control de opacidad de sombra. Pedido 2026-06-23.
- [ ] Auditoría de valores hardcodeados de las animaciones de aparición (`getVariants` en `AppearingCredits.tsx`): distancia de slide (80px), intensidad de blur (20px) y escala de zoom (0.6/1.4) fijas. Valorar exponer. Pedido 2026-06-23.
- [ ] Mostrar opcionalmente los márgenes seguros (title-safe / action-safe) del frame como guía visual en el preview: overlay no exportable, con toggle en la UI. Pedido 2026-06-23.
