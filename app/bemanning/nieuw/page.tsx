import { NewCrewForm } from "@/components/crew/new-crew-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { BackButton } from "@/components/ui/back-button"

export default function NewCrewPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nieuw Bemanningslid</h1>
              <p className="text-sm text-gray-600">Voeg een nieuw bemanningslid toe aan het systeem</p>
            </div>
          </div>
        </div>
      </header>

      <MobileHeaderNav />

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <NewCrewForm />
      </main>

      {/* Mobiele actieknoppen */}
      <div className="block md:hidden mt-8 space-y-4">
        <div className="text-lg font-semibold text-gray-800 mb-3">Nieuw lid acties</div>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/bemanning/overzicht" className="bg-blue-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-blue-700 shadow">
            👥 Bemanning
          </Link>
          <Link href="/bemanning/aflossers" className="bg-green-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-green-700 shadow">
            🔄 Aflossers
          </Link>
          <Link href="/bemanning/nog-in-te-delen" className="bg-orange-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-orange-700 shadow">
            ⏳ In te delen
          </Link>
          <button className="bg-indigo-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-indigo-700 shadow">
            💾 Opslaan
          </button>
          <button className="bg-teal-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-teal-700 shadow">
            🔍 Zoeken
          </button>
          <button className="bg-gray-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-gray-700 shadow">
            📤 Import
          </button>
          <button className="bg-red-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-red-700 shadow">
            🏥 Ziekte
          </button>
        </div>
      </div>
    </div>
  )
}
