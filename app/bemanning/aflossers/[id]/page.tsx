"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useSupabaseData, calculateWorkDaysVasteDienst } from "@/hooks/use-supabase-data"
import { supabase } from '@/lib/supabase'
import { useAflosserAvailability } from "@/hooks/use-aflosser-availability"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { BackButton } from "@/components/ui/back-button"
import { DashboardButton } from "@/components/ui/dashboard-button"
import { format } from "date-fns"
import { 
  Ship, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Clock,
  Edit3,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trash2,
  Check,
  Plus,
  Minus,
  AlertTriangle,
  Printer,
} from "lucide-react"
import Link from "next/link"

const DIPLOMA_OPTIONS = [
  "Vaarbewijs",
  "Rijnpatent tot Wesel",
  "Rijnpatent tot Koblenz",
  "Rijnpatent tot Mannheim",
  "Rijnpatent tot Iffezheim",
  "Elbepatent",
  "Donaupatent",
  "ADN",
  "ADN C",
  "Radar",
  "Marifoon"
]
// Helper function to calculate work days from trip data
// SIMPLE LOGIC: tel kalenderdagen van start tot eind (inclusief beide)
function calculateWorkDays(startDate: string, startTime: string, endDate: string, endTime: string): number {
  if (!startDate || !endDate) return 0

  // Parse both DD-MM-YYYY and ISO format dates
  const parseDate = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') {
      console.error('Invalid date string:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    // Check if it's already an ISO date (contains T or has 4-digit year at start)
    if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      // It's already an ISO date, use it directly
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        console.error('Invalid ISO date:', dateStr)
        return new Date() // Return current date as fallback
      }
      return date
    }
    
    // Otherwise, parse as DD-MM-YYYY format
    const parts = dateStr.split('-')
    if (parts.length !== 3) {
      console.error('Invalid date format:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    const [day, month, year] = parts
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const date = new Date(isoDate)
    
    if (isNaN(date.getTime())) {
      console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
      return new Date() // Return current date as fallback
    }
    
    return date
  }

  const start = parseDate(startDate)
  const end = parseDate(endDate)

  // Validatie: afstapdatum mag niet voor instapdatum liggen
  if (end < start) {
    console.error('Error: end date is before start date')
    return 0
  }

  // Simpele telling: tel kalenderdagen van start tot eind (inclusief beide)
  const timeDiff = end.getTime() - start.getTime()
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1 // +1 omdat we beide datums inclusief tellen


  return daysDiff
}

// Helper to parse notes (can be array, string, or null/undefined)
const parseNotes = (notes: any): any[] => {
  if (!notes) return []
  if (Array.isArray(notes)) return notes
  if (typeof notes === 'string') {
    try {
      const parsed = JSON.parse(notes)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  }
  return []
}

export default function AflosserDetailPage() {
  const params = useParams()
  const { 
    crew, 
    ships, 
    trips, 
    vasteDienstRecords, 
    vasteDienstMindagen,
    loading, 
    error, 
    updateCrew, 
    deleteAflosser, 
    updateTrip,
    addVasteDienstMindag,
    deleteVasteDienstMindag
  } = useSupabaseData()
  const { toast } = useToast()
  const { periods, loading: availabilityLoading, addPeriod, updatePeriod, deletePeriod } = useAflosserAvailability(params.id as string)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editedNotes, setEditedNotes] = useState("")
  const [isEditingTarief, setIsEditingTarief] = useState(false)
  const [editedTarief, setEditedTarief] = useState("")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingDiplomas, setIsEditingDiplomas] = useState(false)
  const [editedDiplomas, setEditedDiplomas] = useState<string[]>([])
  const [editedProfile, setEditedProfile] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    nationality: "",
    status: ""
  })
  const [mounted, setMounted] = useState(false)
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([])
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<any>(null)
  const [newPeriod, setNewPeriod] = useState({
    start_date: "",
    end_date: "",
    type: "beschikbaar" as "beschikbaar" | "afwezig",
    notes: ""
  })
  const [showAllVasteDienstMonths, setShowAllVasteDienstMonths] = useState(false)
  const [mindagenDialogOpen, setMindagenDialogOpen] = useState(false)
  const [newMindag, setNewMindag] = useState({
    start_date: "",
    end_date: "",
    days: "",
    reason: ""
  })

  // Find the aflosser
  const aflosser = crew.find((member: any) => member.id === params.id)

  // Get vaste dienst records for this aflosser
  const aflosserVasteDienstRecords = vasteDienstRecords.filter((record: any) => record.aflosser_id === aflosser?.id)

  // Extra mindagen voor deze aflosser
  const aflosserMindagen = vasteDienstMindagen.filter((entry: any) => entry.aflosser_id === aflosser?.id)

  const totalExtraMinusDays = aflosserMindagen.reduce((sum: number, entry: any) => {
    const raw = (entry as any).days
    const value = typeof raw === 'number' ? raw : parseFloat(raw || '0')
    return sum + (isNaN(value) ? 0 : value)
  }, 0)

  // Extra mindagen gegroepeerd per maand (op basis van start_date)
  const mindagenPerMonth = (() => {
    const map = new Map<string, number>()

    aflosserMindagen.forEach((entry: any) => {
      if (!entry.start_date) return
      const d = new Date(entry.start_date)
      if (isNaN(d.getTime())) return

      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const key = `${year}-${month}`

      const raw = (entry as any).days
      const value = typeof raw === 'number' ? raw : parseFloat(raw || '0')
      if (isNaN(value)) return

      map.set(key, (map.get(key) || 0) + value)
    })

    return map
  })()

  // Bereken per maand hoeveel dagen deze aflosser gewerkt heeft (op basis van alle voltooide reizen)
  const vasteDienstMonthSummaries = (() => {
    if (!aflosser) return [] as { year: number; month: number; workedDays: number; minusDays?: number }[]

    // Veilige date parser (ondersteunt YYYY-MM-DD en DD-MM-YYYY)
    const parseDate = (dateStr: string): Date => {
      if (!dateStr || typeof dateStr !== "string") return new Date(NaN)
      if (dateStr.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const d = new Date(dateStr)
        return isNaN(d.getTime()) ? new Date(NaN) : d
      }
      const parts = dateStr.split("-")
      if (parts.length !== 3) return new Date(NaN)
      const [day, month, year] = parts
      const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      const d = new Date(iso)
      return isNaN(d.getTime()) ? new Date(NaN) : d
    }

    const monthMap = new Map<string, { year: number; month: number; workedDays: number }>()
    const msPerDay = 24 * 60 * 60 * 1000

    trips
      .filter((trip: any) => {
        if (!trip.aflosser_id || trip.aflosser_id !== aflosser.id) return false
        if (trip.status !== "voltooid") return false
        if (!trip.start_datum || !trip.eind_datum) return false
        return true
      })
      .forEach((trip: any) => {
        try {
          const tripStart = parseDate(trip.start_datum)
          const tripEnd = parseDate(trip.eind_datum)
          if (isNaN(tripStart.getTime()) || isNaN(tripEnd.getTime())) return

          tripStart.setHours(0, 0, 0, 0)
          tripEnd.setHours(0, 0, 0, 0)

          let year = tripStart.getFullYear()
          let month = tripStart.getMonth() + 1

          // Loop door alle maanden waar deze reis overheen loopt
          while (true) {
            const monthStart = new Date(year, month - 1, 1)
            monthStart.setHours(0, 0, 0, 0)
            const monthEnd = new Date(year, month, 0)
            monthEnd.setHours(0, 0, 0, 0)

            // Check overlap
            if (tripEnd < monthStart || tripStart > monthEnd) {
              // Geen overlap in deze maand
            } else {
              const rangeStart = tripStart < monthStart ? monthStart : tripStart
              const rangeEnd = tripEnd > monthEnd ? monthEnd : tripEnd

              if (rangeEnd >= rangeStart) {
                const daysInMonth = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / msPerDay) + 1
                const key = `${year}-${month}`
                const existing = monthMap.get(key) || { year, month, workedDays: 0 }
                existing.workedDays += daysInMonth
                monthMap.set(key, existing)
              }
            }

            if (tripEnd <= monthEnd) break
            // Volgende maand
            if (month === 12) {
              year += 1
              month = 1
            } else {
              month += 1
            }
          }
        } catch (err) {
          console.error("Error building month summary for vaste dienst:", err, trip)
        }
      })

    // Zorg dat maanden waarin alleen mindagen zijn ook bestaan
    mindagenPerMonth.forEach((minus, key) => {
      if (!monthMap.has(key)) {
        const [yearStr, monthStr] = key.split('-')
        const year = parseInt(yearStr, 10)
        const month = parseInt(monthStr, 10)
        monthMap.set(key, { year, month, workedDays: 0 })
      }
    })

    // Voeg per maand de mindagen toe
    return Array.from(monthMap.entries()).map(([key, value]) => ({
      ...value,
      minusDays: mindagenPerMonth.get(key) || 0,
    }))
  })()

  // Startsaldo uit notities (één keer berekenen zodat we het overal kunnen tonen)
  const startsaldoFromNotes = (() => {
    if (!aflosser) return 0

    const parsedNotes = parseNotes(aflosser.notes)
    const startsaldoNote = parsedNotes.find(
      (note: any) => note.text && (note.text.includes("startsaldo") || note.text.includes("Startsaldo"))
    )

    let startsaldo = 0
    if (startsaldoNote) {
      const match = startsaldoNote.text.match(/(-?\d+(?:\.\d+)?)/)
      if (match) {
        startsaldo = parseFloat(match[1])
      }
    }

    return isNaN(startsaldo) ? 0 : startsaldo
  })()

  // Calculate current balance als volledig opgebouwd saldo over alle maanden:
  // startsaldo + Σ(gewerkte dagen per maand - 15)
  const currentBalance = (() => {
    if (!aflosser) return 0

    if (vasteDienstMonthSummaries.length === 0) return 0

    // Ruwe gewerkte dagen en minusdagen per maand
    const totalWorkedRaw = vasteDienstMonthSummaries.reduce(
      (total, m: any) => total + (m.workedDays || 0),
      0
    )
    const totalMinusFromMonths = vasteDienstMonthSummaries.reduce(
      (total, m: any) => total + ((m as any).minusDays || 0),
      0
    )
    const totalWorked = totalWorkedRaw - totalMinusFromMonths
    const monthsCount = vasteDienstMonthSummaries.length

    const startsaldo = startsaldoFromNotes
    const totaleVereisteDagen = monthsCount * 15
    const saldo = startsaldo + totalWorked - totaleVereisteDagen
    return saldo
  })()

  // Gegevens voor vaste dienst printoverzicht per maand
  const vasteDienstPrintRows = (() => {
    const sorted = [...vasteDienstMonthSummaries].sort(
      (a, b) => a.year - b.year || a.month - b.month
    )
    return sorted.map((summary: any) => {
      const label = new Date(summary.year, summary.month - 1).toLocaleString('nl-NL', { month: 'long', year: 'numeric' })
      const rawWorked = summary.workedDays || 0
      const minus = summary.minusDays || 0
      const workedDays = rawWorked - minus
      const requiredDays = 15
      const monthSaldo = workedDays - requiredDays
      return { label, workedDays, requiredDays, monthSaldo }
    })
  })()

  const totalMonthSaldo = vasteDienstPrintRows.reduce(
    (sum, row) => sum + row.monthSaldo,
    0
  )

  // Som maandsaldi zonder mindagen (alleen gewerkte dagen - 15)
  const totalMonthSaldoWithoutMinus = totalMonthSaldo + totalExtraMinusDays


  // Prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load trip history from Supabase
  useEffect(() => {
    if (aflosser && aflosser.id && trips) {
      const aflosserTrips = trips.filter((trip: any) => trip.aflosser_id === aflosser.id)
      setAssignmentHistory(aflosserTrips)
    }
  }, [aflosser?.id, trips])

  // Initialize edited profile when aflosser data is available
  useEffect(() => {
    if (aflosser) {
      setEditedProfile({
        first_name: aflosser.first_name || "",
        last_name: aflosser.last_name || "",
        phone: aflosser.phone || "",
        email: aflosser.email || "",
        nationality: aflosser.nationality || "",
        status: aflosser.status || ""
      })
    }
  }, [aflosser])

  const handleSaveProfile = async () => {
    if (!aflosser) return

    try {
      await updateCrew(aflosser.id, editedProfile)
      setIsEditingProfile(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Fout bij het bijwerken van het profiel")
    }
  }

  // Handle availability period actions
  const handleAddPeriod = async () => {
    if (!newPeriod.start_date || !newPeriod.type) {
      toast({
        title: "Fout",
        description: "Vul minimaal startdatum en type in",
        variant: "destructive"
      })
      return
    }

    const result = await addPeriod({
      crew_id: aflosser.id,
      start_date: newPeriod.start_date,
      end_date: newPeriod.end_date || null,
      type: newPeriod.type,
      notes: newPeriod.notes || null
    })

    if (result.error) {
      toast({
        title: "Fout",
        description: result.error,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Succes",
        description: "Periode toegevoegd"
      })
      setNewPeriod({ start_date: "", end_date: "", type: "beschikbaar", notes: "" })
      setAvailabilityDialogOpen(false)
    }
  }

  const handleUpdatePeriod = async () => {
    if (!editingPeriod) return

    const result = await updatePeriod(editingPeriod.id, {
      start_date: editingPeriod.start_date,
      end_date: editingPeriod.end_date || null,
      type: editingPeriod.type,
      notes: editingPeriod.notes || null
    })

    if (result.error) {
      toast({
        title: "Fout",
        description: result.error,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Succes",
        description: "Periode bijgewerkt"
      })
      setEditingPeriod(null)
    }
  }

  const handleDeletePeriod = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze periode wilt verwijderen?")) return

    const result = await deletePeriod(id)
    if (result.error) {
      toast({
        title: "Fout",
        description: result.error,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Succes",
        description: "Periode verwijderd"
      })
    }
  }

  const handleAddMindag = async () => {
    if (!aflosser) return

    if (!newMindag.start_date || !newMindag.days) {
      toast({
        title: "Fout",
        description: "Vul minimaal datum van en aantal dagen in",
        variant: "destructive"
      })
      return
    }

    const parsedDays = parseFloat(newMindag.days.replace(',', '.'))
    if (isNaN(parsedDays) || parsedDays <= 0) {
      toast({
        title: "Fout",
        description: "Aantal dagen moet een getal groter dan 0 zijn",
        variant: "destructive"
      })
      return
    }

    try {
      await addVasteDienstMindag({
        aflosser_id: aflosser.id,
        start_date: newMindag.start_date,
        end_date: newMindag.end_date || null,
        days: parsedDays,
        reason: newMindag.reason || null
      })
      toast({
        title: "Succes",
        description: "Mindagen toegevoegd"
      })
      setNewMindag({
        start_date: "",
        end_date: "",
        days: "",
        reason: ""
      })
      setMindagenDialogOpen(false)
    } catch (error) {
      console.error("Error adding mindagen:", error)
      toast({
        title: "Fout",
        description: "Mindagen konden niet worden opgeslagen",
        variant: "destructive"
      })
    }
  }

  const handleDeleteMindag = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze mindagen wilt verwijderen?")) return
    try {
      await deleteVasteDienstMindag(id)
      toast({
        title: "Succes",
        description: "Mindagen verwijderd"
      })
    } catch (error) {
      console.error("Error deleting mindagen:", error)
      toast({
        title: "Fout",
        description: "Mindagen konden niet worden verwijderd",
        variant: "destructive"
      })
    }
  }

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Laden...</div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-gray-500">Data laden...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Fout: {error}</div>
      </div>
    )
  }

  // Early return after all hooks
  if (!aflosser) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2">
        <div className="text-center py-8 text-red-500">Aflosser niet gevonden</div>
      </div>
    )
  }

  // Gecombineerde geschiedenis (reizen + extra mindagen), gesorteerd op datum (nieuwste eerst)
  const combinedHistory = [
    ...assignmentHistory.map((trip: any) => {
      const sortDateSource = trip.start_datum || trip.start_date || trip.created_at
      const sortDate = sortDateSource ? new Date(sortDateSource) : new Date(0)
      return { type: 'trip' as const, sortDate, trip }
    }),
    ...aflosserMindagen.map((entry: any) => {
      const sortDateSource = entry.start_date || entry.created_at
      const sortDate = sortDateSource ? new Date(sortDateSource) : new Date(0)
      return { type: 'mindag' as const, sortDate, entry }
    })
  ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())

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

  const getShipName = (shipId: string) => {
    const ship = ships.find((s: any) => s.id === shipId)
    return ship ? ship.name : 'Onbekend schip'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aan-boord': return 'bg-red-100 text-red-800'
      case 'thuis': return 'bg-green-100 text-green-800'
      case 'afwezig': return 'bg-orange-100 text-orange-800'
      case 'ziek': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aan-boord': return 'Aan boord'
      case 'thuis': return 'Beschikbaar'
      case 'afwezig': return 'Afwezig'
      case 'ziek': return 'Ziek'
      default: return status
    }
  }


  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      {/* Print CSS voor vaste dienst overzicht */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .vaste-dienst-print-root,
            .vaste-dienst-print-root * {
              visibility: visible;
            }
            .vaste-dienst-print-root {
              position: absolute;
              left: 0;
              top: 0;
              width: 210mm;
              min-height: 297mm;
              padding: 20mm;
              background: white;
              font-family: 'Arial', sans-serif;
              font-size: 11pt;
              line-height: 1.5;
            }
            .vd-print-history-page {
              page-break-before: always;
            }
            .no-print-vd,
            header,
            nav {
              display: none !important;
            }
          }
          @media screen {
            .vaste-dienst-print-root {
              display: none;
            }
          }
          @page {
            size: A4;
            margin: 0;
          }
        `
        }}
      />

      <MobileHeaderNav />
      <BackButton />
      <DashboardButton />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
              {aflosser.first_name[0]}{aflosser.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {aflosser.first_name} {aflosser.last_name}
            </h1>
            <p className="text-gray-600">Aflosser</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {isEditingProfile ? 'Annuleren' : 'Bewerken'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (confirm(`Weet je zeker dat je ${aflosser.first_name} ${aflosser.last_name} definitief wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt en verwijdert ook alle gerelateerde reizen en vaste dienst records.`)) {
                  try {
                    await deleteAflosser(aflosser.id)
                    alert('Aflosser succesvol verwijderd!')
                    // Redirect to aflossers overview
                    window.location.href = '/bemanning/aflossers'
                  } catch (error) {
                    console.error('Error deleting aflosser:', error)
                    alert('Fout bij verwijderen van aflosser')
                  }
                }
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Verwijderen
            </Button>
          </div>
        </div>
        
        {/* Status Badge */}
        <Badge className={getStatusColor(aflosser.status)}>
          {getStatusText(aflosser.status)}
        </Badge>
      </div>

      {/* Vaste Dienst Tracking - Prominent Position */}
      {aflosser?.vaste_dienst && (
        <div className="mb-8">
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-green-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Calendar className="w-6 h-6" />
                <span>Vaste Dienst Tracking</span>
                <div className="ml-auto flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-normal text-green-700">Automatisch</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!vasteDienstPrintRows.length) {
                        alert('Er zijn nog geen vaste dienst maanden om te printen.')
                        return
                      }
                      window.print()
                    }}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 no-print-vd"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Print overzicht
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewMindag({
                        start_date: "",
                        end_date: "",
                        days: "",
                        reason: ""
                      })
                      setMindagenDialogOpen(true)
                    }}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Minus className="w-3 h-3 mr-1" />
                    Mindagen toevoegen
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Balance - Prominent Display */}
                <div className="p-6 rounded-lg border-2 bg-white shadow-sm">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-3 mb-2">
                      {currentBalance > 0 ? (
                        <TrendingUp className="w-8 h-8 text-green-600" />
                      ) : currentBalance < 0 ? (
                        <TrendingDown className="w-8 h-8 text-red-600" />
                      ) : (
                        <Calendar className="w-8 h-8 text-gray-600" />
                      )}
                      <span className="text-4xl font-bold">
                        <span className={currentBalance > 0 ? 'text-green-600' : currentBalance < 0 ? 'text-red-600' : 'text-gray-600'}>
                          {currentBalance > 0 ? '+' : ''}{currentBalance}
                        </span>
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">Huidig Saldo</h3>
                    <p className={`text-sm font-medium ${currentBalance > 0 ? 'text-green-600' : currentBalance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {currentBalance > 0 ? 'Voorsprong' : currentBalance < 0 ? 'Achterstand' : 'Op schema'}
                    </p>
                  </div>
                </div>

                {/* Monthly Summary */}
                <div className="p-6 rounded-lg border-2 bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Maandelijkse Overzicht</h3>
                  {vasteDienstMonthSummaries.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Nog geen records</p>
                      <p className="text-xs mt-1">Automatisch aangemaakt bij voltooide reizen</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        const sorted = [...vasteDienstMonthSummaries].sort(
                          (a, b) => b.year - a.year || b.month - a.month
                        )
                        const visible = showAllVasteDienstMonths ? sorted : sorted.slice(0, 3)
                        return visible.map((summary: any) => {
                          const label = new Date(summary.year, summary.month - 1).toLocaleString('nl-NL', { month: 'short', year: 'numeric' })
                          const minusDays = summary.minusDays || 0
                          const gewerktDezeMaand = (summary.workedDays || 0) - minusDays
                          
                          return (
                            <div key={`${summary.year}-${summary.month}`} className="flex items-center justify-between p-2 border rounded">
                              <div className="text-sm">
                                <span className="font-medium">
                                  {label}
                                </span>
                                <span className="text-gray-600 ml-2">
                                  {gewerktDezeMaand}/15 dagen
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-sm font-medium text-blue-600">
                                  {gewerktDezeMaand} dagen
                                </span>
                                <Calendar className="w-3 h-3 text-blue-600" />
                              </div>
                            </div>
                          )
                        })
                      })()}
                      {vasteDienstMonthSummaries.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setShowAllVasteDienstMonths((prev) => !prev)}
                          className="block w-full text-xs text-blue-600 hover:text-blue-800 text-center mt-2 underline"
                        >
                          {showAllVasteDienstMonths
                            ? "Toon minder maanden"
                            : `+${vasteDienstMonthSummaries.length - 3} meer maanden`}
                        </button>
                      )}
                      
                      {/* Startsaldo Info onderaan */}
                      {(() => {
                        const parsedNotes = parseNotes(aflosser.notes)
                        const startsaldoNote = parsedNotes.find((note: any) => 
                          note.text && (note.text.includes('startsaldo') || note.text.includes('Startsaldo'))
                        )
                        
                        if (startsaldoNote) {
                          const match = startsaldoNote.text.match(/(-?\d+(?:\.\d+)?)/)
                          if (match) {
                            const startsaldo = parseFloat(match[1])
                            const beginsaldo = -15 + startsaldo
                            return (
                              <div className="mt-4 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                                <div>Startsaldo: <span className="font-medium">{startsaldo > 0 ? '+' : ''}{startsaldo}</span> dagen</div>
                                <div>Beginsaldo eerste maand: <span className="font-medium">{beginsaldo}</span> dagen</div>
                              </div>
                            )
                          }
                        }
                        return null
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tarief - Prominent Position voor uitzendbureau/zelfstandige aflossers */}
      {aflosser?.position === "Aflosser" && (aflosser?.is_uitzendbureau || aflosser?.is_zelfstandig || (!aflosser?.vaste_dienst && !aflosser?.is_uitzendbureau)) && (
        <div className="mb-8">
          <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-orange-800">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-6 h-6" />
                  <span>Tarief</span>
                </div>
                {!isEditingTarief && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditedTarief(aflosser?.dag_tarief?.toString() || "")
                      setIsEditingTarief(true)
                    }}
                    className="text-orange-600 hover:bg-orange-50 border-orange-300"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    {aflosser?.dag_tarief ? 'Bewerken' : 'Toevoegen'}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingTarief ? (
                <div className="p-6 rounded-lg border-2 bg-white shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dagTarief" className="text-sm font-medium text-gray-700 mb-2 block">
                        Dagtarief (€)
                      </Label>
                      <Input
                        id="dagTarief"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedTarief}
                        onChange={(e) => setEditedTarief(e.target.value)}
                        placeholder="Bijv. 150.00"
                        className="text-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Tarief per dag in euro's
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await updateCrew(aflosser.id, {
                              dag_tarief: editedTarief ? parseFloat(editedTarief) : null
                            })
                            setIsEditingTarief(false)
                            // Reload data
                            window.location.reload()
                          } catch (error) {
                            console.error("Error updating tarief:", error)
                            alert("Fout bij bijwerken tarief")
                          }
                        }}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Opslaan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditedTarief(aflosser?.dag_tarief?.toString() || "")
                          setIsEditingTarief(false)
                        }}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Annuleren
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-lg border-2 bg-white shadow-sm text-center">
                  {aflosser?.dag_tarief ? (
                    <>
                      <div className="flex items-center justify-center space-x-3 mb-2">
                        <TrendingUp className="w-8 h-8 text-orange-600" />
                        <span className="text-4xl font-bold text-orange-600">
                          €{parseFloat(aflosser.dag_tarief).toFixed(2)}/dag
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Dagtarief voor reizen
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center space-x-3 mb-2">
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                        <span className="text-lg text-gray-500">
                          Nog geen tarief ingesteld
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Klik op "Toevoegen" om een tarief in te stellen
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Persoonlijke Informatie</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">Voornaam</Label>
                      <Input
                        id="first_name"
                        value={editedProfile.first_name}
                        onChange={(e) => setEditedProfile({...editedProfile, first_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Achternaam</Label>
                      <Input
                        id="last_name"
                        value={editedProfile.last_name}
                        onChange={(e) => setEditedProfile({...editedProfile, last_name: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Telefoon</Label>
                    <Input
                      id="phone"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedProfile.email}
                      onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nationality">Nationaliteit</Label>
                    <Select value={editedProfile.nationality} onValueChange={(value) => setEditedProfile({...editedProfile, nationality: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer nationaliteit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NL">🇳🇱 Nederland</SelectItem>
                        <SelectItem value="CZ">🇨🇿 Tsjechië</SelectItem>
                        <SelectItem value="SLK">🇸🇰 Slowakije</SelectItem>
                        <SelectItem value="EG">🇪🇬 Egypte</SelectItem>
                        <SelectItem value="PO">🇵🇱 Polen</SelectItem>
                        <SelectItem value="SERV">🇷🇸 Servië</SelectItem>
                        <SelectItem value="HUN">🇭🇺 Hongarije</SelectItem>
                        <SelectItem value="BE">🇧🇪 België</SelectItem>
                        <SelectItem value="FR">🇫🇷 Frankrijk</SelectItem>
                        <SelectItem value="DE">🇩🇪 Duitsland</SelectItem>
                        <SelectItem value="LUX">🇱🇺 Luxemburg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={editedProfile.status} onValueChange={(value) => setEditedProfile({...editedProfile, status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aan-boord">Aan boord</SelectItem>
                        <SelectItem value="thuis">Beschikbaar</SelectItem>
                        <SelectItem value="afwezig">Afwezig</SelectItem>
                        <SelectItem value="ziek">Ziek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveProfile} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" />
                      Opslaan
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditedProfile({
                          first_name: aflosser.first_name || "",
                          last_name: aflosser.last_name || "",
                          phone: aflosser.phone || "",
                          email: aflosser.email || "",
                          nationality: aflosser.nationality || "",
                          status: aflosser.status || ""
                        })
                        setIsEditingProfile(false)
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : (
                <>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getNationalityFlag(aflosser.nationality)}</span>
                <span className="font-medium">{aflosser.nationality}</span>
              </div>
              
              {aflosser.phone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{aflosser.phone}</span>
                </div>
              )}
              
              {aflosser.email && (
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{aflosser.email}</span>
                </div>
                  )}
                </>
              )}

              {/* Diplomas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm text-gray-700">Diploma's</h4>
                  {!isEditingDiplomas && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const current = (aflosser.diplomas || []).filter((d: string) => DIPLOMA_OPTIONS.includes(d))
                        setEditedDiplomas(current)
                        setIsEditingDiplomas(true)
                      }}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Bewerken
                    </Button>
                  )}
                </div>

                {isEditingDiplomas ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {DIPLOMA_OPTIONS.map((d) => (
                        <Button
                          key={d}
                          size="sm"
                          variant={editedDiplomas.includes(d) ? 'default' : 'outline'}
                          onClick={() => {
                            setEditedDiplomas((prev) => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
                          }}
                        >
                          {d}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const toSave = editedDiplomas.filter((d) => DIPLOMA_OPTIONS.includes(d))
                            await updateCrew(aflosser.id, { diplomas: toSave })
                            setIsEditingDiplomas(false)
                          } catch (e) {
                            alert("Fout bij opslaan diploma's")
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Opslaan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingDiplomas(false)
                          setEditedDiplomas(aflosser.diplomas || [])
                        }}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {aflosser.diplomas && aflosser.diplomas.length > 0 ? (
                      aflosser.diplomas.map((diploma: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {diploma}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">Geen diploma's toegevoegd</span>
                    )}
                  </div>
                )}
              </div>


              {/* Notes */}
              {(() => {
                // Filter out startsaldo notes
                const parsedNotes = parseNotes(aflosser.notes)
                const filteredNotes = parsedNotes.filter((note: any) => {
                  const noteText = typeof note === 'string' ? note : note?.text || ''
                  return !noteText.toLowerCase().includes('startsaldo')
                })
                
                return filteredNotes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Notities:</h4>
                    <div className="text-sm text-gray-600">
                      {filteredNotes.map((note: any, index: number) => (
                        <div key={index} className="mb-1">
                          {typeof note === 'string' ? note : note?.text || 'Geen notitie'}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Algemene Opmerkingen */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm text-gray-700">Algemene Opmerkingen:</h4>
                  {!isEditingNotes && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedNotes(aflosser.aflosser_opmerkingen || "")
                        setIsEditingNotes(true)
                      }}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Bewerken
                    </Button>
                  )}
                </div>
                
                {isEditingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder="Voeg algemene opmerkingen toe over deze aflosser..."
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await updateCrew(aflosser.id, {
                              aflosser_opmerkingen: editedNotes
                            })
                            setIsEditingNotes(false)
                            alert("Opmerkingen succesvol bijgewerkt!")
                          } catch (error) {
                            console.error("Error updating notes:", error)
                            alert("Fout bij het bijwerken van opmerkingen")
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Opslaan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditedNotes(aflosser.aflosser_opmerkingen || "")
                          setIsEditingNotes(false)
                        }}
                        className="text-gray-600 hover:bg-gray-50"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    {aflosser.aflosser_opmerkingen ? (
                      <p className="italic">{aflosser.aflosser_opmerkingen}</p>
                    ) : (
                      <p className="text-gray-500 italic">Geen algemene opmerkingen beschikbaar</p>
                    )}
                  </div>
                )}
              </div>

              {/* Gearchiveerde Notities */}
              {aflosser.archived_notes && aflosser.archived_notes.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Gearchiveerde Notities:</h4>
                  <div className="space-y-2">
                    {aflosser.archived_notes.map((note: any) => (
                      <div key={note.id} className="bg-gray-50 p-3 rounded border-l-4 border-gray-300">
                        <div className="text-sm text-gray-600 mb-1">{note.content}</div>
                        <div className="text-xs text-gray-500">
                          Toegevoegd: {format(new Date(note.createdAt), 'dd-MM-yyyy HH:mm')}
                          {note.archivedAt && (
                            <span className="ml-2">
                              • Gearchiveerd: {format(new Date(note.archivedAt), 'dd-MM-yyyy HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Availability */}
        <div>
          {/* Beschikbaarheid & Afwezigheid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Beschikbaarheid & Afwezigheid</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setNewPeriod({ start_date: "", end_date: "", type: "beschikbaar", notes: "" })
                    setEditingPeriod(null)
                    setAvailabilityDialogOpen(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Toevoegen
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availabilityLoading ? (
                <div className="text-center py-4 text-gray-500">Laden...</div>
              ) : periods.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Geen periodes geregistreerd</p>
                  <p className="text-xs mt-1">Voeg periodes toe om beschikbaarheid bij te houden</p>
              </div>
              ) : (
                <div className="space-y-3">
                  {periods.map((period) => (
                    <div key={period.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={
                              period.type === 'beschikbaar' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }>
                              {period.type === 'beschikbaar' ? 'Beschikbaar' : 'Afwezig'}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {period.type === 'beschikbaar' ? 'van' : 'van'} {format(new Date(period.start_date), 'dd-MM-yyyy')}
                              {period.end_date ? ` tot ${format(new Date(period.end_date), 'dd-MM-yyyy')}` : ' (open einde)'}
                </span>
              </div>
                          {period.notes && (
                            <p className="text-sm text-gray-600 mt-1">{period.notes}</p>
                          )}
              </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPeriod(period)
                              setAvailabilityDialogOpen(true)
                            }}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeletePeriod(period.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
              </div>
              </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>

      {/* Ship History - Full Width */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ship className="w-5 h-5" />
              <span>Reis Geschiedenis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {combinedHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Ship className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nog geen reizen of mindagen geregistreerd</p>
              </div>
            ) : (
              <div className="space-y-4">
                {combinedHistory.map((item, index) => {
                  if (item.type === 'trip') {
                    const trip = item.trip
                    const ship = ships.find((s: any) => s.id === trip.ship_id)
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'gepland': return 'bg-orange-100 text-orange-800'
                        case 'ingedeeld': return 'bg-blue-100 text-blue-800'
                        case 'actief': return 'bg-green-100 text-green-800'
                        case 'voltooid': return 'bg-gray-100 text-gray-800'
                        default: return 'bg-gray-100 text-gray-800'
                      }
                    }
                    const getStatusText = (status: string) => {
                      switch (status) {
                        case 'gepland': return 'Gepland'
                        case 'ingedeeld': return 'Ingedeeld'
                        case 'actief': return 'Actief'
                        case 'voltooid': return 'Voltooid'
                        default: return status
                      }
                    }
                    
                    return (
                      <div key={trip.id || `trip-${index}`} className="border rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Ship className="w-5 h-5 text-blue-600" />
                              <span className="font-medium">
                                {ship ? ship.name : 'Onbekend schip'}
                              </span>
                            </div>
                            <Badge className={getStatusColor(trip.status)}>
                              {getStatusText(trip.status)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span>
                                {trip.start_datum ? (() => {
                                  const parseDate = (dateStr: string): Date => {
                                    if (!dateStr || typeof dateStr !== 'string') {
                                      console.error('Invalid date string:', dateStr)
                                      return new Date()
                                    }
                                    
                                    // Check if it's already an ISO date (contains T or has 4-digit year at start)
                                    if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                                      // It's already an ISO date, use it directly
                                      const date = new Date(dateStr)
                                      if (isNaN(date.getTime())) {
                                        console.error('Invalid ISO date:', dateStr)
                                        return new Date()
                                      }
                                      return date
                                    }
                                    
                                    // Otherwise, parse as DD-MM-YYYY format
                                    const parts = dateStr.split('-')
                                    if (parts.length !== 3) {
                                      console.error('Invalid date format:', dateStr)
                                      return new Date()
                                    }
                                    
                                    const [day, month, year] = parts
                                    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                                    const date = new Date(isoDate)
                                    
                                    if (isNaN(date.getTime())) {
                                      console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
                                      return new Date()
                                    }
                                    
                                    return date
                                  }
                                  return format(parseDate(trip.start_datum), 'dd-MM-yyyy')
                                })() : 'Geen datum'}
                                {trip.eind_datum && (
                                  <> - {(() => {
                                    const parseDate = (dateStr: string): Date => {
                                      if (!dateStr || typeof dateStr !== 'string') {
                                        console.error('Invalid date string:', dateStr)
                                        return new Date()
                                      }
                                      
                                      // Check if it's already an ISO date (contains T or has 4-digit year at start)
                                      if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                                        // It's already an ISO date, use it directly
                                        const date = new Date(dateStr)
                                        if (isNaN(date.getTime())) {
                                          console.error('Invalid ISO date:', dateStr)
                                          return new Date()
                                        }
                                        return date
                                      }
                                      
                                      // Otherwise, parse as DD-MM-YYYY format
                                      const parts = dateStr.split('-')
                                      if (parts.length !== 3) {
                                        console.error('Invalid date format:', dateStr)
                                        return new Date()
                                      }
                                      
                                      const [day, month, year] = parts
                                      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                                      const date = new Date(isoDate)
                                      
                                      if (isNaN(date.getTime())) {
                                        console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
                                        return new Date()
                                      }
                                      
                                      return date
                                    }
                                    return format(parseDate(trip.eind_datum), 'dd-MM-yyyy')
                                  })()}</>
                                )}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-sm">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span>{trip.trip_from} → {trip.trip_to}</span>
                            </div>
                          </div>

                          <div className="text-sm text-gray-600">
                            <strong>Reis:</strong> {trip.trip_name}
                          </div>

                          {/* Actual boarding/leaving times for completed trips */}
                          {trip.status === 'voltooid' && (trip.start_datum || trip.eind_datum) && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Werkelijke tijden</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {trip.start_datum && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-600">Aan boord:</span>
                                    <span className="font-medium">
                                      {(() => {
                                        const parseDate = (dateStr: string): Date => {
                                          if (!dateStr || typeof dateStr !== 'string') {
                                            console.error('Invalid date string:', dateStr)
                                            return new Date()
                                          }
                                          
                                          // Check if it's already an ISO date (contains T or has 4-digit year at start)
                                          if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                                            // It's already an ISO date, use it directly
                                            const date = new Date(dateStr)
                                            if (isNaN(date.getTime())) {
                                              console.error('Invalid ISO date:', dateStr)
                                              return new Date()
                                            }
                                            return date
                                          }
                                          
                                          // Otherwise, parse as DD-MM-YYYY format
                                          const parts = dateStr.split('-')
                                          if (parts.length !== 3) {
                                            console.error('Invalid date format:', dateStr)
                                            return new Date()
                                          }
                                          
                                          const [day, month, year] = parts
                                          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                                          const date = new Date(isoDate)
                                          
                                          if (isNaN(date.getTime())) {
                                            console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
                                            return new Date()
                                          }
                                          
                                          return date
                                        }
                                        return format(parseDate(trip.start_datum), 'dd-MM-yyyy')
                                      })()} {trip.start_tijd || ''}
                                    </span>
                                  </div>
                                )}
                                {trip.eind_datum && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-600">Afgestapt:</span>
                                    <span className="font-medium">
                                      {(() => {
                                        const parseDate = (dateStr: string): Date => {
                                          if (!dateStr || typeof dateStr !== 'string') {
                                            console.error('Invalid date string:', dateStr)
                                            return new Date()
                                          }
                                          
                                          // Check if it's already an ISO date (contains T or has 4-digit year at start)
                                          if (dateStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                                            // It's already an ISO date, use it directly
                                            const date = new Date(dateStr)
                                            if (isNaN(date.getTime())) {
                                              console.error('Invalid ISO date:', dateStr)
                                              return new Date()
                                            }
                                            return date
                                          }
                                          
                                          // Otherwise, parse as DD-MM-YYYY format
                                          const parts = dateStr.split('-')
                                          if (parts.length !== 3) {
                                            console.error('Invalid date format:', dateStr)
                                            return new Date()
                                          }
                                          
                                          const [day, month, year] = parts
                                          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                                          const date = new Date(isoDate)
                                          
                                          if (isNaN(date.getTime())) {
                                            console.error('Invalid date after parsing:', isoDate, 'from:', dateStr)
                                            return new Date()
                                          }
                                          
                                          return date
                                        }
                                        return format(parseDate(trip.eind_datum), 'dd-MM-yyyy')
                                      })()} {trip.eind_tijd || ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Werkdagen berekening */}
                          {trip.start_datum && trip.eind_datum && trip.start_tijd && trip.eind_tijd && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Werkdagen:</span>
                                <span className="font-medium text-blue-600">
                                  {(() => {
                                    // Use different calculation based on whether aflosser is in vaste dienst
                                    let workDays
                                    if (aflosser.vaste_dienst) {
                                      // For vaste dienst aflossers, use hour-based calculation
                                      workDays = calculateWorkDaysVasteDienst(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
                                    } else {
                                      // For other aflossers, use simple day calculation
                                      workDays = calculateWorkDays(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
                                    }
                                    return workDays === Math.floor(workDays) 
                                      ? `${workDays} dag${workDays !== 1 ? 'en' : ''}`
                                      : `${workDays} dag${workDays !== 1 ? 'en' : ''}`
                                  })()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Aflosser opmerkingen for completed trips */}
                        {trip.status === 'voltooid' && trip.aflosser_opmerkingen && (
                          <div className="bg-blue-50 p-3 rounded-lg mt-3">
                            <h5 className="text-sm font-medium text-blue-700 mb-1">Opmerkingen over aflosser</h5>
                            <p className="text-sm text-blue-600 italic">{trip.aflosser_opmerkingen}</p>
                          </div>
                        )}

                        {/* Betaald status voor zelfstandige aflossers */}
                        {trip.status === 'voltooid' && (aflosser.is_zelfstandig || (!aflosser.vaste_dienst && !aflosser.is_uitzendbureau)) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Betaald:</span>
                              <Button
                                size="sm"
                                variant={trip.paid ? "default" : "outline"}
                                onClick={async () => {
                                  try {
                                    await updateTrip(trip.id, { paid: !trip.paid })
                                    // Reload data to show updated status
                                    window.location.reload()
                                  } catch (error) {
                                    console.error("Error updating paid status:", error)
                                    alert("Fout bij bijwerken betaald status")
                                  }
                                }}
                                className={trip.paid ? "bg-green-600 hover:bg-green-700" : ""}
                              >
                                {trip.paid ? (
                                  <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Ja
                                  </>
                                ) : (
                                  "Nee"
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {trip.notes && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                            <strong>Notitie:</strong> {trip.notes}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Mindagen entry
                  const entry = item.entry
                  return (
                    <div key={entry.id || `mindag-${index}`} className="border rounded-lg p-4 bg-red-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="font-medium text-red-700">
                              Extra mindagen: -{(entry as any).days} dag{(entry as any).days === 1 ? '' : 'en'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-700 mt-1">
                            {format(new Date(entry.start_date), 'dd-MM-yyyy')}
                            {entry.end_date && (
                              <> t/m {format(new Date(entry.end_date), 'dd-MM-yyyy')}</>
                            )}
                          </div>
                          {entry.reason && (
                            <div className="text-xs text-gray-600 mt-1 italic">
                              {entry.reason}
                            </div>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-100"
                          onClick={() => handleDeleteMindag(entry.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics - Full Width */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Statistieken</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Totaal reizen:</span>
              <span className="font-medium">{assignmentHistory.length}</span>
      </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Voltooide reizen:</span>
              <span className="font-medium">
                {assignmentHistory.filter((trip: any) => trip.status === 'voltooid').length}
              </span>
    </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Actieve reizen:</span>
              <span className="font-medium">
                {assignmentHistory.filter((trip: any) => trip.status === 'actief').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Geplande reizen:</span>
              <span className="font-medium">
                {assignmentHistory.filter((trip: any) => trip.status === 'gepland' || trip.status === 'ingedeeld').length}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm text-gray-600">Totaal werkdagen:</span>
              <span className="font-medium text-blue-600">
                {(() => {
                  // Calculate total work days from all completed trips using the same logic as the trip cards
                  const completedTrips = assignmentHistory.filter((trip: any) => 
                    trip.status === 'voltooid' && 
                    trip.start_datum && 
                    trip.eind_datum && 
                    trip.start_tijd && 
                    trip.eind_tijd
                  )
                  
                  let totalWorkDays = 0
                  
                  completedTrips.forEach((trip: any) => {
                    // Use the same calculation logic as in the trip cards
                    let workDays
                    if (aflosser?.vaste_dienst) {
                      // For vaste dienst aflossers, use hour-based calculation
                      workDays = calculateWorkDaysVasteDienst(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
                    } else {
                      // For other aflossers, use simple day calculation
                      workDays = calculateWorkDays(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
                    }
                    totalWorkDays += workDays
                  })
                  
                  return totalWorkDays === Math.floor(totalWorkDays) 
                    ? `${totalWorkDays} dag${totalWorkDays !== 1 ? 'en' : ''}`
                    : `${totalWorkDays} dag${totalWorkDays !== 1 ? 'en' : ''}`
                })()}
              </span>
            </div>
            
          </CardContent>
        </Card>
      </div>

      {/* Availability Period Dialog */}
      <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? 'Periode Bewerken' : 'Nieuwe Periode Toevoegen'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={editingPeriod ? editingPeriod.type : newPeriod.type}
                onValueChange={(value: "beschikbaar" | "afwezig") => {
                  if (editingPeriod) {
                    setEditingPeriod({ ...editingPeriod, type: value })
                  } else {
                    setNewPeriod({ ...newPeriod, type: value })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beschikbaar">Beschikbaar</SelectItem>
                  <SelectItem value="afwezig">Afwezig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="start_date">Startdatum</Label>
              <Input
                id="start_date"
                type="date"
                value={editingPeriod ? editingPeriod.start_date : newPeriod.start_date}
                onChange={(e) => {
                  if (editingPeriod) {
                    setEditingPeriod({ ...editingPeriod, start_date: e.target.value })
                  } else {
                    setNewPeriod({ ...newPeriod, start_date: e.target.value })
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="end_date">Einddatum (optioneel, leeg voor open einde)</Label>
              <Input
                id="end_date"
                type="date"
                value={editingPeriod ? (editingPeriod.end_date || "") : newPeriod.end_date}
                onChange={(e) => {
                  if (editingPeriod) {
                    setEditingPeriod({ ...editingPeriod, end_date: e.target.value || null })
                  } else {
                    setNewPeriod({ ...newPeriod, end_date: e.target.value })
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="notes">Opmerkingen (optioneel)</Label>
              <Textarea
                id="notes"
                value={editingPeriod ? (editingPeriod.notes || "") : newPeriod.notes}
                onChange={(e) => {
                  if (editingPeriod) {
                    setEditingPeriod({ ...editingPeriod, notes: e.target.value || null })
                  } else {
                    setNewPeriod({ ...newPeriod, notes: e.target.value })
                  }
                }}
                placeholder="Voeg opmerkingen toe..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setAvailabilityDialogOpen(false)
                  setEditingPeriod(null)
                  setNewPeriod({ start_date: "", end_date: "", type: "beschikbaar", notes: "" })
                }}
              >
                Annuleren
              </Button>
              <Button
                onClick={editingPeriod ? handleUpdatePeriod : handleAddPeriod}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingPeriod ? 'Bijwerken' : 'Toevoegen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mindagen Dialog voor vaste dienst */}
      <Dialog open={mindagenDialogOpen} onOpenChange={setMindagenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extra mindagen toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mindag_start_date">Datum van</Label>
                <Input
                  id="mindag_start_date"
                  type="date"
                  value={newMindag.start_date}
                  onChange={(e) => setNewMindag({ ...newMindag, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mindag_end_date">Datum tot (optioneel)</Label>
                <Input
                  id="mindag_end_date"
                  type="date"
                  value={newMindag.end_date}
                  onChange={(e) => setNewMindag({ ...newMindag, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mindag_days">Aantal dagen</Label>
              <Input
                id="mindag_days"
                type="number"
                step="0.5"
                min="0.5"
                value={newMindag.days}
                onChange={(e) => setNewMindag({ ...newMindag, days: e.target.value })}
                placeholder="Bijv. 1 of 0.5"
              />
            </div>
            <div>
              <Label htmlFor="mindag_reason">Reden</Label>
              <Textarea
                id="mindag_reason"
                value={newMindag.reason}
                onChange={(e) => setNewMindag({ ...newMindag, reason: e.target.value })}
                placeholder="Bijv. opgenomen vrije dagen buiten vaste dienst"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setMindagenDialogOpen(false)
                  setNewMindag({
                    start_date: "",
                    end_date: "",
                    days: "",
                    reason: ""
                  })
                }}
              >
                Annuleren
              </Button>
              <Button
                onClick={handleAddMindag}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vaste dienst printoverzicht (alleen zichtbaar bij print) */}
      {aflosser.vaste_dienst && (
        <div className="vaste-dienst-print-root">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Overzicht Aflosdagen
            </h1>
            <p className="text-gray-700">
              {aflosser.first_name} {aflosser.last_name}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Geprint op {format(new Date(), 'dd-MM-yyyy HH:mm')}
            </p>
          </div>

          {/* Tabel per maand */}
          <div>
            <h2 className="text-lg font-semibold text-blue-700 mb-3">
              Overzicht gewerkte dagen per maand
            </h2>
            {vasteDienstPrintRows.length === 0 ? (
              <p className="text-sm text-gray-600">
                Nog geen voltooide reizen geregistreerd voor vaste dienst.
              </p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-3 py-2 text-left">Maand</th>
                    <th className="border px-3 py-2 text-right">Gewerkte dagen</th>
                    <th className="border px-3 py-2 text-right">Norm (15)</th>
                    <th className="border px-3 py-2 text-right">Maandsaldo</th>
                  </tr>
                </thead>
                <tbody>
                  {vasteDienstPrintRows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border px-3 py-1">{row.label}</td>
                      <td className="border px-3 py-1 text-right">{row.workedDays}</td>
                      <td className="border px-3 py-1 text-right">{row.requiredDays}</td>
                      <td className="border px-3 py-1 text-right">
                        {row.monthSaldo > 0 ? `+${row.monthSaldo}` : row.monthSaldo} dagen
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Samenvatting */}
          <div className="mt-6 text-sm text-gray-700">
            <h2 className="text-lg font-semibold text-blue-700 mb-2">
              Samenvatting dagen & saldo
            </h2>
            <div className="inline-block bg-gray-50 border border-gray-200 rounded-md px-4 py-3 space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Startsaldo:</span>
                <span className="font-semibold">
                  {startsaldoFromNotes > 0 ? `+${startsaldoFromNotes}` : startsaldoFromNotes} dagen
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Som maandsaldi (zonder extra mindagen):</span>
                <span className="font-semibold">
                  {totalMonthSaldoWithoutMinus > 0 ? `+${totalMonthSaldoWithoutMinus}` : totalMonthSaldoWithoutMinus} dagen
                </span>
              </div>
              {aflosserMindagen.length > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">Extra mindagen (per maand verwerkt):</span>
                  <span className="font-semibold">
                    -{totalExtraMinusDays} dag{totalExtraMinusDays === 1 ? '' : 'en'}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 mt-1">
                <span className="text-gray-700 font-medium">Eindsaldo (inclusief startsaldo en mindagen):</span>
                <span
                  className={`font-bold ${
                    currentBalance > 0 ? 'text-green-700' : currentBalance < 0 ? 'text-red-700' : 'text-gray-800'
                  }`}
                >
                  {currentBalance > 0 ? `+${currentBalance}` : currentBalance} dagen
                </span>
              </div>
            </div>
          </div>

          {/* Reisgeschiedenis vanaf pagina 2 */}
          <div className="vd-print-history-page mt-8">
            <h2 className="text-lg font-semibold text-blue-700 mb-3">
              Reisgeschiedenis
            </h2>
            {combinedHistory.length === 0 ? (
              <p className="text-sm text-gray-600">
                Nog geen reizen of extra mindagen geregistreerd.
              </p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-3 py-2 text-left">Datum / periode</th>
                    <th className="border px-3 py-2 text-left">Type</th>
                    <th className="border px-3 py-2 text-left">Schip / omschrijving</th>
                    <th className="border px-3 py-2 text-right">Dagen</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedHistory.map((item: any, idx: number) => {
                    if (item.type === 'trip') {
                      const trip = item.trip
                      const ship = ships.find((s: any) => s.id === trip.ship_id)

                      const formatDateSafe = (dateStr?: string | null) => {
                        if (!dateStr) return ''
                        try {
                          return format(new Date(dateStr), 'dd-MM-yyyy')
                        } catch {
                          return dateStr
                        }
                      }

                      let workDays: number | null = null
                      if (trip.start_datum && trip.eind_datum && trip.start_tijd && trip.eind_tijd) {
                        if (aflosser.vaste_dienst) {
                          workDays = calculateWorkDaysVasteDienst(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
                        } else {
                          workDays = calculateWorkDays(trip.start_datum, trip.start_tijd, trip.eind_datum, trip.eind_tijd)
                        }
                      }

                      return (
                        <tr key={trip.id || `trip-print-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border px-3 py-1">
                            {trip.start_datum ? formatDateSafe(trip.start_datum) : ''}
                            {trip.eind_datum && (
                              <> t/m {formatDateSafe(trip.eind_datum)}</>
                            )}
                          </td>
                          <td className="border px-3 py-1">Reis</td>
                          <td className="border px-3 py-1">
                            {ship ? ship.name : 'Onbekend schip'}
                            {trip.trip_name ? ` – ${trip.trip_name}` : ''}
                          </td>
                          <td className="border px-3 py-1 text-right">
                            {workDays !== null ? workDays : ''}
                          </td>
                        </tr>
                      )
                    }

                    const entry = item.entry
                    return (
                      <tr key={entry.id || `mindag-print-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border px-3 py-1">
                          {format(new Date(entry.start_date), 'dd-MM-yyyy')}
                          {entry.end_date && (
                            <> t/m {format(new Date(entry.end_date), 'dd-MM-yyyy')}</>
                          )}
                        </td>
                        <td className="border px-3 py-1">Extra mindagen</td>
                        <td className="border px-3 py-1">
                          {entry.reason || 'Correctie vaste dienst'}
                        </td>
                        <td className="border px-3 py-1 text-right">
                          -{(entry as any).days}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 