"use client"
import React, { createContext, useContext, useState } from "react"
import { crewDatabase as initialCrewDatabase } from "@/data/crew-database"

const CrewContext = createContext<any>(null)

export function CrewProvider({ children }: { children: React.ReactNode }) {
  const [crew, setCrew] = useState<any>(initialCrewDatabase)
  return (
    <CrewContext.Provider value={{ crew, setCrew }}>
      {children}
    </CrewContext.Provider>
  )
}

export function useCrew() {
  const context = useContext(CrewContext)
  if (!context) throw new Error("useCrew must be used within a CrewProvider")
  return context
} 