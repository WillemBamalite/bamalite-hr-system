"use client"

import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"
import Link from "next/link"

export function DashboardButton() {
  return (
    <div className="flex justify-center mb-6">
      <Link href="/">
        <Button variant="outline" className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
          <Home className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
      </Link>
    </div>
  )
} 