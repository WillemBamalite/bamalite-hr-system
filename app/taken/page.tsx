"use client"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { TasksPanel } from "@/components/tasks/tasks-panel"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function TakenPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <main className="w-full py-8 px-6">
          <div className="w-full mx-auto grid grid-cols-1 gap-6">
            <div className="flex items-center justify-center">
              <Link href="/">
                <Button variant="outline">Terug naar dashboard</Button>
              </Link>
            </div>
            <TasksPanel />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}


