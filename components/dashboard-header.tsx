"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface DashboardHeaderProps {
  search: string
  setSearch: (search: string) => void
}

export function DashboardHeader({ search, setSearch }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bamalite HR Systeem</h1>
        <p className="text-gray-600">Beheer bemanning en schepen</p>
      </div>
      
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Zoek in bemanning en schepen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  )
}
