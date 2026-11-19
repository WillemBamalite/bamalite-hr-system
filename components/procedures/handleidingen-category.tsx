"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { BackButton } from "@/components/ui/back-button"
import { Badge } from "@/components/ui/badge"
import { PROCEDURE_CATEGORIES } from "@/lib/procedures/types"
import { getProceduresByCategory, isProcedureCategory } from "@/lib/procedures/catalog"

const STATUS_LABEL = {
  uitgewerkt: "Uitgewerkt",
  gepland: "Volgt",
  doorverwijzing: "Bestaat al",
} as const

export function HandleidingenCategory() {
  const params = useParams<{ category: string }>()
  const categoryId = String(params.category || "")

  if (!isProcedureCategory(categoryId)) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-2">
        <BackButton href="/handleidingen" />
        <p className="mt-4 text-gray-600">Deze categorie bestaat niet.</p>
      </div>
    )
  }

  const category = PROCEDURE_CATEGORIES.find((item) => item.id === categoryId)!
  const procedures = getProceduresByCategory(categoryId)

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <BackButton href="/handleidingen" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{category.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{category.description}</p>
        </div>
      </div>
      <div className="space-y-2">
        {procedures.map((procedure) => {
          const href = `/handleidingen/${categoryId}/${procedure.id}`
          return (
            <Link
              key={procedure.id}
              href={href}
              className="block rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-blue-300 hover:bg-blue-50 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{procedure.title}</div>
                  <p className="text-sm text-gray-600 mt-1">{procedure.summary}</p>
                </div>
                {procedure.status !== "uitgewerkt" && (
                  <Badge variant="outline" className="shrink-0">
                    {STATUS_LABEL[procedure.status]}
                  </Badge>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
