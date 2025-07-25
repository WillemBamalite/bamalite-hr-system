"use client"

import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"

export default function AflossersOverzicht() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Aflossers Overzicht</h1>
        <Link href="/bemanning" className="text-blue-600 hover:text-blue-800">
          ← Terug naar bemanning
        </Link>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-800 mb-2">
          🚧 Pagina in Onderhoud
        </h2>
        <p className="text-yellow-700">
          Deze pagina wordt momenteel bijgewerkt om compatibel te zijn met het nieuwe data systeem. 
          Probeer het later opnieuw.
        </p>
      </div>
    </div>
  )
} 