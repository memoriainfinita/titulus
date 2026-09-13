# TITULUS

Generador de títulos de crédito para vídeo. Se edita en vivo con vista previa y se exporta a vídeo desde el propio navegador. Sin servidor: todo el estado vive en el cliente.

## Modos

- **scroll**: los créditos se desplazan de abajo arriba, estilo final de película.
- **appearing**: los elementos aparecen uno a uno con animación (fade, slide, zoom, blur, typewriter), con revelado línea a línea opcional.

## Funciones

- Items de texto rico (fuente, tamaño, negrita, cursiva y color por fragmento), espaciadores, separadores e imágenes/logos.
- Configuración global y override por item: alineación, mayúsculas, sombra, blur, animación, pausa, velocidad de tecleo, ancho de caja, salto de línea.
- Fuentes: Google Fonts, fuentes del sistema y archivos propios (ttf/otf/woff).
- Escenario con relaciones 16:9, 21:9, 4:3, 9:16 y 1:1; márgenes seguros como guía o como límite del contenido.
- Línea de tiempo con scrub, salto por item y resalte del item activo en la lista.
- Presets integrados y presets propios (guardados en el navegador).
- Proyecto exportable e importable como JSON.
- Exportación a MP4 o WebM con resolución por multiplicador (x1 a x3), fps a elegir, cronómetro y ETA, y destino de guardado a elegir (File System Access API en Chrome/Edge; descarga automática en el resto).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Zustand · TipTap · framer-motion · FFmpeg-wasm + html-to-image · Vitest.

## Arranque

Requiere Node.js (probado con v24) y pnpm (probado con v11).

```bash
pnpm install
pnpm dev
```

App en http://localhost:3000. En Windows, `dev.ps1` hace lo mismo desde cualquier directorio.

Los builds nativos (sharp, etc.) se autorizan en `pnpm-workspace.yaml` (`allowBuilds`).

## Scripts

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | servidor de desarrollo |
| `pnpm test` / `pnpm test:run` | tests con Vitest |
| `pnpm lint` | eslint |
| `pnpm build` | build de producción |
| `EXPORT=true pnpm build` | export estático en `out/` bajo `/titulus`, para GitHub Pages |

## Estructura

- `src/app/page.tsx`: layout de tres paneles, lista de items (izquierda), preview (centro) e inspector (derecha).
- `src/components/credit/`: lista, preview, inspector, gestor de fuentes, diálogo de exportación, escenas de scroll y aparición, editor de texto rico.
- `src/lib/credit/`: tipos, store (Zustand, persistido en localStorage), módulos puros de lógica (geometría de scroll, duraciones, resolvers de estilo, texto rico) y motor de exportación (`useVideoExport.ts`).
- `src/components/ui/`: componentes de shadcn/ui.
- `docs/superpowers/`: specs y planes de las features implementadas.

## Conexiones externas

La app no envía datos del usuario a ningún sitio. Contacta con terceros solo para descargar recursos: `unpkg.com` (core de FFmpeg-wasm, al exportar) y `fonts.googleapis.com` / `fonts.gstatic.com` (Google Fonts, si se usan).
