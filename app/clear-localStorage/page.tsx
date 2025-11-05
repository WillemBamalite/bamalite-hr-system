"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Check } from "lucide-react"
import Link from "next/link"

export default function ClearLocalStoragePage() {
  const [cleared, setCleared] = useState(false)
  const [localStorageKeys, setLocalStorageKeys] = useState<string[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      setLocalStorageKeys(keys)
    }
  }, [])

  const handleClear = () => {
    if (typeof window !== 'undefined') {
      if (!confirm('Weet je zeker dat je alle localStorage data wilt verwijderen? Dit kan niet ongedaan worden.')) {
        return
      }
      localStorage.clear()
      setCleared(true)
      setLocalStorageKeys([])
      
      // Reload after 2 seconds
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trash2 className="w-6 h-6 text-red-600" />
            <span>LocalStorage Cleanup</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!cleared ? (
            <div className="space-y-4">
              <p className="text-gray-700">
                Deze tool verwijdert alle oude localStorage data. Dit is handig als er nog oude crew members of schepen in localStorage staan die al uit Supabase zijn verwijderd.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Huidige localStorage keys:</p>
                {localStorageKeys.length > 0 ? (
                  <ul className="text-sm text-blue-800 space-y-1">
                    {localStorageKeys.map((key) => (
                      <li key={key} className="font-mono">• {key}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-blue-600">Geen localStorage data gevonden</p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Let op: Dit verwijdert ALLE localStorage data. Na het cleanen wordt de pagina automatisch herladen en laadt alle data opnieuw vanuit Supabase.
                </p>
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <Button 
                  onClick={handleClear}
                  variant="destructive"
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>LocalStorage Leegmaken</span>
                </Button>
                <Link href="/">
                  <Button variant="outline">Annuleren</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                LocalStorage succesvol geleegd!
              </h3>
              <p className="text-gray-600">
                De pagina wordt automatisch herladen...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

