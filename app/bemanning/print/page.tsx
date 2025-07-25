import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"

export default function CrewPrintPage() {
  return (
    <>
      <MobileHeaderNav />
      <div className="container mx-auto px-4 py-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            🚧 Print Functionaliteit in Onderhoud
          </h2>
          <p className="text-yellow-700">
            Deze pagina wordt momenteel bijgewerkt om compatibel te zijn met het nieuwe data systeem. 
            Probeer het later opnieuw.
          </p>
        </div>
        {/* Mobiele actieknoppen */}
        <div className="block md:hidden mt-8 space-y-4">
          <div className="text-lg font-semibold text-gray-800 mb-3">Print acties</div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/bemanning/overzicht" className="bg-blue-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-blue-700 shadow">
              👥 Bemanning
            </Link>
            <Link href="/bemanning/aflossers" className="bg-green-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-green-700 shadow">
              🔄 Aflossers
            </Link>
            <Link href="/schepen" className="bg-purple-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-purple-700 shadow">
              🚢 Schepen
            </Link>
            <Link href="/bemanning/nog-in-te-delen" className="bg-orange-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-orange-700 shadow">
              ⏳ In te delen
            </Link>
            <button className="bg-indigo-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-indigo-700 shadow">
              🖨️ Print alles
            </button>
            <button className="bg-teal-600 text-white text-sm py-3 px-4 rounded-lg text-center hover:bg-teal-700 shadow">
              �� PDF
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
    </>
  )
}
