import { crewDatabase } from "@/data/crew-database"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"

export default function NogInTeDelenBemanning() {
  const availableCrew = Object.values(crewDatabase).filter(
    (crew: any) => (!crew.shipId || crew.status === "beschikbaar") && crew.status !== "uit-dienst"
  )

  return (
    <div className="container mx-auto px-4 py-6">
      <MobileHeaderNav />
      <h1 className="text-2xl font-bold mb-6 text-purple-800">Nieuwe bemanning nog in te delen</h1>
      {availableCrew.length === 0 ? (
        <div className="text-gray-500">Alle bemanningsleden zijn ingedeeld.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableCrew.map((crew: any) => (
            <div key={crew.id} className="border rounded-lg p-4 bg-white flex items-center justify-between">
              <div>
                <div className="font-medium text-lg text-gray-900">{crew.firstName} {crew.lastName}</div>
                <div className="text-sm text-gray-600">{crew.position} • {crew.nationality}</div>
                <div className="text-xs text-gray-500 mt-1">{crew.phone}</div>
              </div>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold">Beschikbaar</span>
            </div>
          ))}
        </div>
      )}
      {/* Mobiele actieknoppen */}
      <div className="block md:hidden mt-8 space-y-4">
        <div className="text-lg font-semibold text-gray-800 mb-3">Toewijzing acties</div>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/bemanning/overzicht" className="bg-blue-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-blue-700 shadow">
            👥 Bemanning
          </Link>
          <Link href="/bemanning/aflossers" className="bg-green-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-green-700 shadow">
            🔄 Aflossers
          </Link>
          <Link href="/bemanning/nieuw" className="bg-indigo-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-indigo-700 shadow">
            ➕ Nieuw lid
          </Link>
          <button className="bg-orange-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-orange-700 shadow">
            ⚡ Auto toewijzen
          </button>
          <button className="bg-teal-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-teal-700 shadow">
            🔍 Zoeken
          </button>
          <button className="bg-gray-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-gray-700 shadow">
            📤 Export
          </button>
          <button className="bg-red-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-red-700 shadow">
            🏥 Ziekte
          </button>
        </div>
      </div>
    </div>
  )
} 