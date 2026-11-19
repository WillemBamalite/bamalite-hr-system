"use client"

import Link from "next/link"
import { BookOpen, Ship, Users, ClipboardList } from "lucide-react"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { PROCEDURE_CATEGORIES } from "@/lib/procedures/types"
import { getProceduresByCategory } from "@/lib/procedures/catalog"

const ICONS = {
  bemanning: Users,
  schip: Ship,
  overig: ClipboardList,
}

export function HandleidingenHome() {
  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      <DashboardButton />
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-blue-700" />
          Handleidingen & Formulieren
        </h1>
        <p className="text-sm text-gray-600 mt-2 max-w-3xl">
          Kies een categorie en daarna een procedure. Bij bemanning of schip zet het
          systeem de gegevens die al in de applicatie staan ernaast. De formulieren zelf vul je
          nog met de hand in.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROCEDURE_CATEGORIES.map((category) => {
          const Icon = ICONS[category.id]
          const procedures = getProceduresByCategory(category.id)
          return (
            <Link
              key={category.id}
              href={`/handleidingen/${category.id}`}
              className="rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300 hover:bg-blue-50 transition"
            >
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Icon className="w-5 h-5 text-blue-700" />
                {category.title}
              </div>
              <p className="text-sm text-gray-600 mt-2">{category.description}</p>
              <p className="text-xs text-gray-500 mt-3">{procedures.length} procedures</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
