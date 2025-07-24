import { useState } from "react"
import { crewDatabase, shipDatabase } from "@/data/crew-database"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const ships = [
  "MTS Bellona",
      "MTS Bacchus",
    "MTS Pluto",
      "MTS Primera",
]

const initialAflossers = [
  {
    id: "aflosser-1",
    firstName: "Piet",
    lastName: "Jansen",
    phone: "+31 6 11111111",
    diplomas: ["Groot Vaarbewijs A", "Radar"],
    history: [
      { ship: "MTS Bellona", from: "2024-01-01", to: "2024-01-15" },
              { ship: "MTS Bacchus", from: "2023-12-01", to: "2023-12-10" },
    ],
  },
  {
    id: "aflosser-2",
    firstName: "Jan",
    lastName: "de Vries",
    phone: "+31 6 22222222",
    diplomas: ["ADN Basis", "Marifoon"],
    history: [
      { ship: "MS Pluto", from: "2023-11-01", to: "2023-11-20" },
    ],
  },
]

export default function AflossersOverzicht() {
  // Filter aflossers: bijvoorbeeld op functie "Aflosser" of een tag, hier als voorbeeld op positie "Kapitein" met regime 1/1, 2/2, 3/3
  const aflossers = Object.values(crewDatabase).filter(
    (crew: any) => crew.position?.toLowerCase().includes("aflos") || crew.position?.toLowerCase().includes("relief") || crew.position?.toLowerCase().includes("kapitein")
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aflossers Overzicht</CardTitle>
        <div className="mt-2">
          <Link href="/bemanning/aflossers/nieuw">
            <Button variant="default">Aflosser toevoegen</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aflossers.map((crew: any) => (
            <div key={crew.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:space-x-4 bg-blue-50">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-lg text-gray-900 truncate">{crew.firstName} {crew.lastName}</div>
                <div className="text-xs text-gray-600">Nationaliteit: {crew.nationality}</div>
                <div className="text-xs text-gray-600">Functie: {crew.position}</div>
                <div className="text-xs text-gray-600">Schip: {shipDatabase[crew.shipId as keyof typeof shipDatabase]?.name || "-"}</div>
                <div className="text-xs text-gray-600">Regime: {crew.regime}</div>
              </div>
              <div className="mt-2 md:mt-0">
                <Link href={`/bemanning/${crew.id}`}>
                  <Badge className="bg-blue-600 text-white cursor-pointer hover:bg-blue-700">Bekijk profiel</Badge>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 