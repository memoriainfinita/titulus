"use client"

import * as React from "react"
import { Plus, Trash2, Upload, Search, Type } from "lucide-react"
import { useCreditStore } from "@/lib/credit/store"
import { useShallow } from "zustand/react/shallow"
import { GOOGLE_FONTS, SYSTEM_FONTS, buildGoogleFontUrl, buildFontFaceRule, buildSystemFontFamily, fontFaceStyleId } from "@/lib/credit/fonts"
import { FontItem } from "@/lib/credit/types"
import { fontInUseByItems } from "@/lib/credit/rich"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { v4 as uuid } from "uuid"

export function FontManager() {
  const { fonts, addFont, removeFont, config, updateConfig, items } = useCreditStore(
    useShallow((s) => ({ fonts: s.fonts, addFont: s.addFont, removeFont: s.removeFont, config: s.config, updateConfig: s.updateConfig, items: s.items })),
  )
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  // Inject Google Fonts links dynamically
  React.useEffect(() => {
    if (!open) return
    const googleFonts = fonts.filter((f) => f.source === "google")
    const links: HTMLLinkElement[] = []
    const existingHrefs = new Set(
      Array.from(document.querySelectorAll("link[rel='stylesheet']")).map(
        (l) => (l as HTMLLinkElement).href,
      ),
    )
    googleFonts.forEach((f) => {
      // f.name is the plain family name; f.family is the CSS value
      // ("'Inter', sans-serif") and produces a malformed Google Fonts URL.
      const url = buildGoogleFontUrl(f.name, f.weights || ["400", "700"])
      if (!existingHrefs.has(url)) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = url
        document.head.appendChild(link)
        links.push(link)
      }
    })
    return () => {
      // Don't remove — keep them cached for the preview
    }
  }, [open, fonts])

  const filteredGoogleFonts = React.useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return GOOGLE_FONTS
    return GOOGLE_FONTS.filter(
      (f) =>
        f.family.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q),
    )
  }, [search])

  const addGoogleFont = (family: string, category: string, weights: string[]) => {
    const exists = fonts.some(
      (f) => f.source === "google" && f.family === family,
    )
    if (exists) {
      toast.info(`"${family}" ya está en tu lista`)
      return
    }
    const newFont: FontItem = {
      id: uuid(),
      name: family,
      source: "google",
      family: `'${family}', ${category}`,
      category,
      weights,
    }
    // Inject the stylesheet immediately
    const url = buildGoogleFontUrl(family, weights)
    const existsLink = document.querySelector(`link[href="${url}"]`)
    if (!existsLink) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = url
      document.head.appendChild(link)
    }
    addFont(newFont)
    toast.success(`Fuente "${family}" añadida`)
  }

  const addSystemFont = (name: string, weights: string[]) => {
    const family = buildSystemFontFamily(name)
    const exists = fonts.some((f) => f.source === "system" && f.family === family)
    if (exists) {
      toast.info(`"${name}" ya está en tu lista`)
      return
    }
    // System fonts live in the OS: no stylesheet or @font-face needed.
    addFont({
      id: uuid(),
      name,
      source: "system",
      family,
      category: "system",
      weights,
    })
    toast.success(`Fuente "${name}" añadida`)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      if (!/\.(ttf|otf|woff|woff2)$/i.test(file.name)) {
        toast.error(`Archivo no soportado: ${file.name}`)
        continue
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const familyName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, "")
      const newFont: FontItem = {
        id: uuid(),
        name: familyName,
        source: "custom",
        family: `'${familyName}'`,
        url: dataUrl,
      }
      // Inject the @font-face rule. Same helper is used by FontLoader to
      // re-inject it on every app load (the rule is not persisted, only font.url is).
      const styleId = fontFaceStyleId(familyName)
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
      if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = styleId
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = buildFontFaceRule(newFont.family, dataUrl)
      addFont(newFont)
      toast.success(`Fuente "${familyName}" subida`)
    }
    e.target.value = ""
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Type className="h-4 w-4 mr-2" />
          Gestionar fuentes
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-3xl max-h-[85vh]"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Gestión de fuentes</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="mine">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mine">Mis fuentes ({fonts.length})</TabsTrigger>
            <TabsTrigger value="google">Google Fonts</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
            <TabsTrigger value="upload">Subir fuente</TabsTrigger>
          </TabsList>

          {/* My fonts */}
          <TabsContent value="mine">
            <ScrollArea className="h-[55vh] pr-4">
              <div className="space-y-2">
                {fonts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No tienes fuentes todavía. Añade desde Google Fonts o sube la tuya.
                  </p>
                )}
                {fonts.map((font) => (
                  <div
                    key={font.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{font.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {font.source === "google"
                            ? "Google"
                            : font.source === "custom"
                              ? "Personalizada"
                              : "Sistema"}
                        </Badge>
                        {font.category && (
                          <Badge variant="outline" className="text-xs">
                            {font.category}
                          </Badge>
                        )}
                      </div>
                      <p
                        className="text-base truncate"
                        style={{ fontFamily: font.family }}
                      >
                        {font.name} — ABCDEFG abcdefg 1234567890
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant={config.fontFamily === font.family ? "default" : "outline"}
                        onClick={() => {
                          updateConfig({ fontFamily: font.family })
                          toast.success(`Fuente activa: ${font.name}`)
                        }}
                      >
                        {config.fontFamily === font.family ? "Activa" : "Usar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (config.fontFamily === font.family) {
                            toast.error("No puedes eliminar la fuente activa")
                            return
                          }
                          if (fontInUseByItems(items, font.family)) {
                            toast.error("No puedes eliminarla: la usa algún fragmento de texto")
                            return
                          }
                          removeFont(font.id)
                          toast.success(`Fuente eliminada: ${font.name}`)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Google Fonts catalog */}
          <TabsContent value="google">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar fuente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[50vh] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredGoogleFonts.map((font) => {
                    const added = fonts.some(
                      (f) => f.source === "google" && f.family === font.family,
                    )
                    return (
                      <div
                        key={font.family}
                        className="flex items-center justify-between gap-2 p-3 rounded-md border bg-card"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate text-sm">
                              {font.family}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {font.category}
                            </Badge>
                          </div>
                          <p
                            className="text-lg truncate"
                            style={{
                              fontFamily: `'${font.family}', ${font.category}`,
                            }}
                          >
                            {font.family}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={added ? "secondary" : "outline"}
                          disabled={added}
                          onClick={() =>
                            addGoogleFont(font.family, font.category, font.weights)
                          }
                        >
                          {added ? (
                            "Añadida"
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Añadir
                            </>
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* System fonts */}
          <TabsContent value="system">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Fuentes instaladas en el sistema operativo. No requieren descarga,
                pero el resultado depende de las fuentes disponibles en cada equipo.
              </p>
              <ScrollArea className="h-[50vh] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SYSTEM_FONTS.map((font) => {
                    const family = buildSystemFontFamily(font.family)
                    const added = fonts.some(
                      (f) => f.source === "system" && f.family === family,
                    )
                    return (
                      <div
                        key={font.family}
                        className="flex items-center justify-between gap-2 p-3 rounded-md border bg-card"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate text-sm">
                              {font.family}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {font.category}
                            </Badge>
                          </div>
                          <p className="text-lg truncate" style={{ fontFamily: family }}>
                            {font.family}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={added ? "secondary" : "outline"}
                          disabled={added}
                          onClick={() => addSystemFont(font.family, font.weights)}
                        >
                          {added ? (
                            "Añadida"
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Añadir
                            </>
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Upload custom font */}
          <TabsContent value="upload">
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">Sube tu propia fuente</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Formatos soportados: .ttf, .otf, .woff, .woff2
                </p>
                <label>
                  <input
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar archivo
                    </span>
                  </Button>
                </label>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Notas:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Las fuentes se cargan localmente en tu navegador.</li>
                  <li>
                    Para fines comerciales, asegúrate de tener la licencia adecuada
                    de la fuente.
                  </li>
                  <li>
                    Las fuentes grandes pueden tardar en cargarse. Se recomienda
                    usar formatos <code>.woff2</code> para mejor compresión.
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// Component to inject all the user's Google Fonts on app load
export function FontLoader() {
  const fonts = useCreditStore((s) => s.fonts)
  React.useEffect(() => {
    const googleFonts = fonts.filter((f) => f.source === "google")
    const existingHrefs = new Set(
      Array.from(document.querySelectorAll("link[rel='stylesheet']")).map(
        (l) => (l as HTMLLinkElement).href,
      ),
    )
    googleFonts.forEach((f) => {
      // f.name is the plain family name; f.family is the CSS value
      // ("'Inter', sans-serif") and produces a malformed Google Fonts URL.
      const url = buildGoogleFontUrl(f.name, f.weights || ["400", "700"])
      if (!existingHrefs.has(url)) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = url
        document.head.appendChild(link)
      }
    })
    // Re-inject @font-face for custom fonts: their rule lives only in the DOM,
    // not in localStorage (only font.url is persisted), so it must be rebuilt
    // on every load or the font won't render after a reload.
    fonts
      .filter((f) => f.source === "custom" && f.url)
      .forEach((f) => {
        const styleId = fontFaceStyleId(f.name)
        if (document.getElementById(styleId)) return
        const styleEl = document.createElement("style")
        styleEl.id = styleId
        styleEl.textContent = buildFontFaceRule(f.family, f.url as string)
        document.head.appendChild(styleEl)
      })
  }, [fonts])
  return null
}
