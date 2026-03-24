"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

type DashboardSearchContextValue = {
  searchQuery: string
  setSearchQuery: (q: string) => void
  runSearch: () => void
  setSearchRunner: (fn: (() => void) | null) => void
}

const DashboardSearchContext = createContext<DashboardSearchContextValue | null>(null)

export function DashboardSearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("")
  const runnerRef = useRef<(() => void) | null>(null)

  const setSearchRunner = useCallback((fn: (() => void) | null) => {
    runnerRef.current = fn
  }, [])

  const runSearch = useCallback(() => {
    runnerRef.current?.()
  }, [])

  const value = useMemo(
    () => ({ searchQuery, setSearchQuery, runSearch, setSearchRunner }),
    [searchQuery, runSearch, setSearchRunner]
  )

  return (
    <DashboardSearchContext.Provider value={value}>{children}</DashboardSearchContext.Provider>
  )
}

export function useDashboardSearch() {
  const ctx = useContext(DashboardSearchContext)
  if (!ctx) {
    throw new Error("useDashboardSearch must be used within DashboardSearchProvider")
  }
  return ctx
}

export function useDashboardSearchOptional() {
  return useContext(DashboardSearchContext)
}
