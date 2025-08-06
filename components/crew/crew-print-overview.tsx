"use client"
import { Button } from "@/components/ui/button"
import { PrinterIcon as Print, Download, ArrowLeft } from "lucide-react"
import { shipDatabase, sickLeaveHistoryDatabase } from "@/data/crew-database"
import { useCrewData } from "@/hooks/use-crew-data"
import { useRouter } from "next/navigation"

export function CrewPrintOverview() {
  const router = useRouter()
  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Hier zou je een PDF kunnen genereren

  }

  // Groepeer bemanning per schip
  const shipCrewData = Object.values(shipDatabase).map((ship: any) => {
    const shipCrew = Object.values(crewDatabase).filter((crew: any) => crew.shipId === ship.id && crew.status !== "uit-dienst")
    const onBoard = shipCrew.filter((crew: any) => crew.status === "aan-boord")
    const atHome = shipCrew.filter((crew: any) => crew.status === "thuis")
    const sick = shipCrew.filter((crew: any) => crew.status === "ziek")

    return {
      ship,
      onBoard,
      atHome,
      sick,
      total: shipCrew.length,
    }
  })

  // Beschikbare bemanning (niet toegewezen)
  const availableCrew = Object.values(crewDatabase).filter((crew: any) => !crew.shipId && crew.status !== "uit-dienst")

  // Zieke bemanning
  const sickCrew = Object.values(crewDatabase).filter((crew: any) => crew.status === "ziek" && crew.status !== "uit-dienst")

  const getNationalityFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱",
      CZ: "🇨🇿",
      SLK: "🇸🇰",
      EG: "🇪🇬",
      PO: "🇵🇱",
      SERV: "🇷🇸",
      HUN: "🇭🇺",
      BE: "🇧🇪",
      FR: "🇫🇷",
      DE: "🇩🇪",
      LUX: "🇱🇺",
    }
    return flags[nationality] || "🌍"
  }

  const getDocumentStatus = (crew: any) => {
    const docs = crew.documents || {}
    return {
      V: docs.vaarbewijs?.valid ? "✓" : "✗",
      M: docs.medisch?.valid ? "✓" : "✗",
      C: docs.certificaat?.valid ? "✓" : "✗",
    }
  }

  const getNextRotationDate = (crew: any) => {
    if (!crew.nextRotationDate) return "Niet gepland"
    return new Date(crew.nextRotationDate).toLocaleDateString("nl-NL")
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print header - alleen zichtbaar bij printen */}
      <div className="print:block hidden text-center mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold">BAMALITE HR MANAGEMENT</h1>
        <h2 className="text-xl">Bemanning Overzicht</h2>
        <p className="text-sm text-gray-600">Gegenereerd op: {new Date().toLocaleDateString("nl-NL")}</p>
      </div>

      {/* Screen header */}
      <div className="print:hidden mb-6 p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => router.back()} className="flex items-center text-sm text-gray-700 hover:text-blue-700 mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug
            </button>
            <h1 className="text-2xl font-bold">Print Overzicht - Alle Bemanning</h1>
            <p className="text-gray-600">Volledig overzicht van alle schepen en bemanning</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handlePrint}>
              <Print className="w-4 h-4 mr-2" />
              Printen
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-8">
        {/* Schepen overzicht */}
        {shipCrewData.map((shipData, index) => (
          <div key={shipData.ship.id} className="break-inside-avoid">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-blue-800 border-b-2 border-blue-200 pb-2">{shipData.ship.name}</h2>
              <div className="text-sm text-gray-600 mt-1">
                Status: {shipData.ship.status} | Bemanning: {shipData.total}/
                {shipData.ship.maxCrew}
              </div>
            </div>

            {/* Aan boord */}
            {shipData.onBoard.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-green-700 mb-2">🚢 Aan Boord ({shipData.onBoard.length})</h3>
                <div className="grid grid-cols-1 gap-2">
                  {shipData.onBoard.map((crew: any) => {
                    const docs = getDocumentStatus(crew)
                    return (
                      <div key={crew.id} className="flex items-center justify-between text-sm border-b pb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {crew.firstName} {crew.lastName}
                          </span>
                          <span>{getNationalityFlag(crew.nationality)}</span>
                          <span className="text-gray-600">({crew.position})</span>
                          <span className="text-blue-600">{crew.regime}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs">
                          <span>
                            Aan boord sinds:{" "}
                            {crew.onBoardSince ? new Date(crew.onBoardSince).toLocaleDateString("nl-NL") : "Onbekend"}
                          </span>
                          <span>Wissel: {getNextRotationDate(crew)}</span>
                          <span>
                            Docs: V:{docs.V} M:{docs.M} C:{docs.C}
                          </span>
                          <span className="text-gray-500">{crew.phone}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Thuis */}
            {shipData.atHome.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-orange-700 mb-2">🏠 Thuis ({shipData.atHome.length})</h3>
                <div className="grid grid-cols-1 gap-2">
                  {shipData.atHome.map((crew: any) => {
                    const docs = getDocumentStatus(crew)
                    return (
                      <div key={crew.id} className="flex items-center justify-between text-sm border-b pb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {crew.firstName} {crew.lastName}
                          </span>
                          <span>{getNationalityFlag(crew.nationality)}</span>
                          <span className="text-gray-600">({crew.position})</span>
                          <span className="text-blue-600">{crew.regime}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs">
                          <span>Volgende wissel: {getNextRotationDate(crew)}</span>
                          <span>
                            Docs: V:{docs.V} M:{docs.M} C:{docs.C}
                          </span>
                          <span className="text-gray-500">{crew.phone}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Ziek */}
            {shipData.sick.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-red-700 mb-2">🏥 Ziek ({shipData.sick.length})</h3>
                <div className="grid grid-cols-1 gap-2">
                  {shipData.sick.map((crew: any) => {
                    const docs = getDocumentStatus(crew)
                    return (
                      <div key={crew.id} className="flex items-center justify-between text-sm border-b pb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {crew.firstName} {crew.lastName}
                          </span>
                          <span>{getNationalityFlag(crew.nationality)}</span>
                          <span className="text-gray-600">({crew.position})</span>
                          <span className="text-blue-600">{crew.regime}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs">
                          <span className="text-red-600">Ziek sinds: {crew.onBoardSince || "Onbekend"}</span>
                          <span>
                            Docs: V:{docs.V} M:{docs.M} C:{docs.C}
                          </span>
                          <span className="text-gray-500">{crew.phone}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Page break na elk schip behalve de laatste */}
            {index < shipCrewData.length - 1 && <div className="print:break-after-page"></div>}
          </div>
        ))}

        {/* Beschikbare bemanning */}
        {availableCrew.length > 0 && (
          <div className="break-inside-avoid">
            <div className="print:break-before-page">
              <h2 className="text-xl font-bold text-purple-800 border-b-2 border-purple-200 pb-2 mb-4">
                Beschikbare Bemanning (Niet Toegewezen)
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {availableCrew.map((crew: any) => {
                  const docs = getDocumentStatus(crew)
                  return (
                    <div key={crew.id} className="flex items-center justify-between text-sm border-b pb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {crew.firstName} {crew.lastName}
                        </span>
                        <span>{getNationalityFlag(crew.nationality)}</span>
                        <span className="text-gray-600">({crew.position})</span>
                        <span className="text-blue-600">{crew.regime}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs">
                        <span>Status: Beschikbaar</span>
                        <span>
                          Docs: V:{docs.V} M:{docs.M} C:{docs.C}
                        </span>
                        <span className="text-gray-500">{crew.phone}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Zieke bemanning sectie */}
        <div className="break-inside-avoid print:break-before-page">
          <h2 className="text-xl font-bold text-red-800 border-b-2 border-red-200 pb-2 mb-4">
            Zieke Bemanning & Terug Staan Overzicht
          </h2>

          {/* Actief zieke bemanning */}
          <div className="mb-6">
            <h3 className="font-semibold text-red-700 mb-2">🏥 Actief Ziek</h3>
            {Object.values(sickLeaveDatabase).map((sick: any) => {
              const crew = crewDatabase[sick.crewMemberId]
              if (!crew) return null

              const docs = getDocumentStatus(crew)
              const daysCount = Math.floor(
                (new Date().getTime() - new Date(sick.startDate).getTime()) / (1000 * 60 * 60 * 24),
              )

              return (
                <div key={sick.id} className="flex items-center justify-between text-sm border-b pb-1 mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {crew.firstName} {crew.lastName}
                    </span>
                    <span>{getNationalityFlag(crew.nationality)}</span>
                    <span className="text-gray-600">({crew.position})</span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs">
                    <span>Ziek sinds: {new Date(sick.startDate).toLocaleDateString("nl-NL")}</span>
                    <span>Duur: {daysCount} dagen</span>
                    <span>Klacht: {sick.description}</span>
                    <span>Briefje: {sick.hasCertificate ? "✓" : "✗"}</span>
                    <span>Salaris: {sick.salaryPercentage}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Openstaande terug staan dagen */}
          <div className="mb-6">
            <h3 className="font-semibold text-orange-700 mb-2">⏰ Openstaande Terug Staan Dagen</h3>
            {Object.values(sickLeaveHistoryDatabase)
              .filter((record: any) => record.standBackDaysRemaining > 0)
              .map((record: any) => {
                const crew = crewDatabase[record.crewMemberId]
                if (!crew) return null

                return (
                  <div key={record.id} className="flex items-center justify-between text-sm border-b pb-1 mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {crew.firstName} {crew.lastName}
                      </span>
                      <span>{getNationalityFlag(crew.nationality)}</span>
                      <span className="text-gray-600">({crew.position})</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs">
                      <span>
                        Ziekte: {new Date(record.startDate).toLocaleDateString("nl-NL")} -{" "}
                        {new Date(record.endDate).toLocaleDateString("nl-NL")}
                      </span>
                      <span>Klacht: {record.description}</span>
                      <span className="text-orange-600">Resterend: {record.standBackDaysRemaining} dagen</span>
                      <span>
                        Voltooid: {record.standBackDaysCompleted}/{record.standBackDaysRequired}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Totaal overzicht */}
          <div className="bg-gray-100 p-4 rounded-lg print:bg-gray-50">
            <h3 className="font-semibold mb-2">📊 Totaal Overzicht</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Totaal Bemanning:</span>
                <span className="ml-2">{Object.keys(crewDatabase).length}</span>
              </div>
              <div>
                <span className="font-medium">Actief Ziek:</span>
                <span className="ml-2 text-red-600">{Object.keys(sickLeaveDatabase).length}</span>
              </div>
              <div>
                <span className="font-medium">Openstaande Dagen:</span>
                <span className="ml-2 text-orange-600">
                  {Object.values(sickLeaveHistoryDatabase)
                    .filter((record: any) => record.standBackDaysRemaining > 0)
                    .reduce((sum, record: any) => sum + record.standBackDaysRemaining, 0)}
                </span>
              </div>
              <div>
                <span className="font-medium">Operationele Schepen:</span>
                <span className="ml-2">
                  {Object.values(shipDatabase).filter((ship: any) => ship.status === "Operationeel").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print footer */}
      <div className="print:block hidden text-center mt-8 pt-4 border-t text-xs text-gray-500">
        <p>BAMALITE HR Management System - Confidentieel Document</p>
        <p>Gegenereerd op: {new Date().toLocaleString("nl-NL")}</p>
      </div>
    </div>
  )
}
