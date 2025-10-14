"use client"
import React, { createContext, useContext, useState, useEffect } from "react"
import { crewDatabase as initialCrewDatabase } from "@/data/crew-database"

const CrewContext = createContext<any>(null)

export function CrewProvider({ children }: { children: React.ReactNode }) {
  const [crew, setCrew] = useState<any>(initialCrewDatabase)

  useEffect(() => {
    // Verwijder GEEN data bij mount; dit brak het toevoegen en direct tonen
    // Indien ooit nodig, maak een aparte debug-pagina om opslag te legen.
  }, []);

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