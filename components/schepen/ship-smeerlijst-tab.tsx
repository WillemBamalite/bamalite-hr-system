"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getShipSmeerlijstByName, type SmeerlijstRow } from "@/utils/ship-smeerlijst"

type Props = {
  shipName: string
  searchQuery?: string
}

const matchesSearch = (row: SmeerlijstRow, query: string) => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [row.apparaat, row.fabrikant, row.type, row.smeermiddel].some((value) =>
    String(value || "").toLowerCase().includes(q)
  )
}

export function ShipSmeerlijstTab({ shipName, searchQuery = "" }: Props) {
  const rows = getShipSmeerlijstByName(shipName)
  const visibleRows = rows.filter((row) => matchesSearch(row, searchQuery))

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Smeerlijst</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-1">
          <p>
            Voor <strong>{shipName}</strong> is de smeerlijst nog niet ingevuld.
          </p>
          <p>Die kan later per schip worden toegevoegd, net als bij Voluntas.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Smeerlijst — {shipName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-blue-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-white">Apparaat</th>
                <th className="px-3 py-2 text-left font-semibold text-white">Fabrikant</th>
                <th className="px-3 py-2 text-left font-semibold text-white">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-white">Smeermiddel</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-gray-600">
                    Geen regels gevonden voor “{searchQuery}”.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, index) => (
                  <tr
                    key={`${row.apparaat}-${row.smeermiddel}-${index}`}
                    className={`border-b last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-blue-50"}`}
                  >
                    <td className="px-3 py-1.5 text-gray-900 align-top font-medium">{row.apparaat}</td>
                    <td className="px-3 py-1.5 text-gray-800 align-top">{row.fabrikant}</td>
                    <td className="px-3 py-1.5 text-gray-800 align-top">{row.type}</td>
                    <td className="px-3 py-1.5 text-gray-800 align-top">{row.smeermiddel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
