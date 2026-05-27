"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { Maximize2, Minimize2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const TAB_FULLSCREEN_BODY_CLASS = "tab-fullscreen-mode"

export type TabFullscreenSearchState = {
  searchQuery: string
  isFullscreen: boolean
}

const TabFullscreenSearchContext = createContext<TabFullscreenSearchState>({
  searchQuery: "",
  isFullscreen: false,
})

export function useTabFullscreenSearch() {
  return useContext(TabFullscreenSearchContext)
}

type Props = {
  title: string
  subtitle?: string
  children: ReactNode | ((search: TabFullscreenSearchState) => ReactNode)
  className?: string
  enableSearch?: boolean
  searchPlaceholder?: string
}

export function TabFullscreenShell({
  title,
  subtitle,
  children,
  className,
  enableSearch = false,
  searchPlaceholder = "Zoeken...",
}: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!fullscreen) setSearchQuery("")
  }, [fullscreen])

  useEffect(() => {
    if (!mounted || typeof document === "undefined") return

    if (fullscreen) {
      document.body.classList.add(TAB_FULLSCREEN_BODY_CLASS)
    } else {
      document.body.classList.remove(TAB_FULLSCREEN_BODY_CLASS)
    }

    return () => {
      document.body.classList.remove(TAB_FULLSCREEN_BODY_CLASS)
    }
  }, [fullscreen, mounted])

  useEffect(() => {
    if (!fullscreen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [fullscreen])

  const searchState = useMemo<TabFullscreenSearchState>(
    () => ({
      searchQuery: fullscreen ? searchQuery : "",
      isFullscreen: fullscreen,
    }),
    [fullscreen, searchQuery]
  )

  const renderedChildren =
    typeof children === "function" ? children(searchState) : children

  const toggleButton = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => setFullscreen((value) => !value)}
      title={fullscreen ? "Volledig scherm sluiten (Esc)" : "Volledig scherm openen"}
    >
      {fullscreen ? (
        <Minimize2 className="w-4 h-4 mr-1.5" aria-hidden />
      ) : (
        <Maximize2 className="w-4 h-4 mr-1.5" aria-hidden />
      )}
      {fullscreen ? "Sluiten" : "Volledig scherm"}
    </Button>
  )

  const searchBar =
    enableSearch && fullscreen ? (
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 pl-9 text-sm"
          autoFocus
        />
      </div>
    ) : null

  const content = (
    <TabFullscreenSearchContext.Provider value={searchState}>
      {renderedChildren}
    </TabFullscreenSearchContext.Provider>
  )

  const fullscreenOverlay =
    fullscreen && mounted ? (
      <div
        className="fixed inset-0 z-[9999] flex flex-col bg-gray-50"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{title}</h2>
              {subtitle ? <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p> : null}
              {searchBar}
            </div>
            <div className="shrink-0 pt-0.5">{toggleButton}</div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{content}</div>
      </div>
    ) : null

  return (
    <>
      {mounted && fullscreenOverlay ? createPortal(fullscreenOverlay, document.body) : null}
      {!fullscreen ? (
        <div className={cn("space-y-2", className)}>
          <div className="flex justify-end">{toggleButton}</div>
          {content}
        </div>
      ) : null}
    </>
  )
}
