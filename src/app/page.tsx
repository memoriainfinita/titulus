"use client"

import * as React from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { CreditEditor } from "@/components/credit/CreditEditor"
import { CreditPreview } from "@/components/credit/CreditPreview"
import { ConfigPanel, PresetBar } from "@/components/credit/ConfigPanel"
import { FontLoader } from "@/components/credit/FontManager"
import { ThemeToggle } from "@/components/theme-toggle"
import { Film, Github, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCreditStore } from "@/lib/credit/store"

export default function Home() {
  // Wait for zustand/persist to rehydrate before rendering the editor/preview,
  // so the persisted project doesn't flash the DEFAULT_ITEMS first.
  const hasHydrated = useCreditStore((s) => s._hasHydrated)

  return (
    <div className="h-screen flex flex-col bg-background">
      <FontLoader />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary text-primary-foreground">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Credit Titles Studio</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              Generador profesional de títulos de crédito
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Presets:</span>
          </div>
          <PresetBar />
          <ThemeToggle />
          <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
            v1.0
          </Badge>
        </div>
      </header>

      {/* Main 3-panel layout */}
      {hasHydrated ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left: editor */}
          <ResizablePanel defaultSize={22} minSize={16} maxSize={32} className="bg-card">
            <CreditEditor />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center: preview */}
          <ResizablePanel defaultSize={48} minSize={30}>
            <CreditPreview />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: config */}
          <ResizablePanel defaultSize={30} minSize={22} maxSize={42} className="bg-card">
            <ConfigPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Film className="h-5 w-5 animate-pulse" />
        </div>
      )}
    </div>
  )
}
