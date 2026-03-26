"use client"

import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseData } from "@/hooks/use-supabase-data"

export default function LeningenPrintPage() {
  const { loans, crew, loading } = useSupabaseData()

  const getCrewMemberName = (crewId: string) => {
    const crewMember = crew.find((c) => c.id === crewId)
    return crewMember ? `${crewMember.first_name} ${crewMember.last_name}` : "Onbekend"
  }

  const formatLoanDate = (loan: any) => {
    if (loan?.created_at) {
      try {
        return format(new Date(loan.created_at), "dd-MM-yyyy")
      } catch {
        return "-"
      }
    }
    return "-"
  }

  const rows = [...loans].sort((a, b) => {
    const aDate = a?.created_at ? new Date(a.created_at).getTime() : 0
    const bDate = b?.created_at ? new Date(b.created_at).getTime() : 0
    return bDate - aDate
  })

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between gap-2 mb-6 print:hidden">
        <Button variant="outline" asChild>
          <Link href="/bemanning/leningen">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar leningen
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Printen
        </Button>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Leningen overzicht</h1>
        <p className="text-sm text-gray-600">
          Printlijst met naam, leningsdatum, hoofdbedrag, reden en afgelost bedrag.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Laden...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border border-gray-300 px-3 py-2">Naam</th>
                <th className="border border-gray-300 px-3 py-2">Datum lening</th>
                <th className="border border-gray-300 px-3 py-2">Hoofdbedrag</th>
                <th className="border border-gray-300 px-3 py-2">Reden</th>
                <th className="border border-gray-300 px-3 py-2">Al afgelost</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-300 px-3 py-4 text-center text-gray-500">
                    Geen leningen gevonden.
                  </td>
                </tr>
              ) : (
                rows.map((loan) => (
                  <tr key={loan.id} className="align-top">
                    <td className="border border-gray-300 px-3 py-2">{getCrewMemberName(loan.crew_id)}</td>
                    <td className="border border-gray-300 px-3 py-2">{formatLoanDate(loan)}</td>
                    <td className="border border-gray-300 px-3 py-2">€{Number(loan.amount || 0).toFixed(2)}</td>
                    <td className="border border-gray-300 px-3 py-2">{loan.reason || "-"}</td>
                    <td className="border border-gray-300 px-3 py-2">€{Number(loan.amount_paid || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
