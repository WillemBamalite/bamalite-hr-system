"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ClockIcon as UserClock, 
  CheckCircle, 
  Ship, 
  Plus, 
  Archive,
  FileText,
  Download,
  UserX,
  Trash2
} from "lucide-react"
import { PDFDocument, StandardFonts } from "pdf-lib"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { supabase } from "@/lib/supabase"

export function StandBackManagement() {
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [isAddDaysOpen, setIsAddDaysOpen] = useState(false)
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [daysToAdd, setDaysToAdd] = useState("")
  const [note, setNote] = useState("")
  const [returnedStartDate, setReturnedStartDate] = useState("")
  const [returnedEndDate, setReturnedEndDate] = useState("")
  const [expandedDetailByMember, setExpandedDetailByMember] = useState<Record<string, "mindagen" | "returned" | null>>({})
  
  // New record form state
  const [newRecord, setNewRecord] = useState({
    crewMemberId: "",
    reason: "ziekte",
    startDate: "",
    endDate: "",
    daysCount: "",
    description: "",
    notes: ""
  })
  
  const { standBackRecords, crew, ships, loading, error, updateStandBackRecord, addStandBackRecord, loadData } = useSupabaseData()

  const downloadMemberOverviewPdf = async (group: any) => {
    if (!group || !group.crewMember) return

    const name = `${group.crewMember.firstName || ""} ${group.crewMember.lastName || ""}`.trim() || "Onbekend"

    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontSize = 10
    const lineHeight = 14
    const margin = 40
    let y = height - margin

    const formatDateShort = (value: string | null | undefined) => {
      if (!value) return "-"
      const d = new Date(value)
      if (isNaN(d.getTime())) return value
      const day = String(d.getDate()).padStart(2, "0")
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const year = String(d.getFullYear()).slice(-2)
      return `${day}-${month}-${year}`
    }

    const ensureSpace = (needed = lineHeight) => {
      if (y - needed < margin) {
        page = pdfDoc.addPage()
        y = page.getSize().height - margin
      }
    }

    const drawText = (text: string, options?: { bold?: boolean; x?: number; size?: number }) => {
      ensureSpace(options?.size ? options.size + 4 : lineHeight)
      const usedFont = options?.bold ? fontBold : font
      page.drawText(text, { x: options?.x ?? margin, y, size: options?.size ?? fontSize, font: usedFont })
      y -= lineHeight
    }

    const drawRule = () => {
      ensureSpace(10)
      page.drawLine({
        start: { x: margin, y: y + 4 },
        end: { x: width - margin, y: y + 4 },
        thickness: 0.75,
      })
      y -= 6
    }

    const drawTableHeader = (cols: Array<{ x: number; label: string; align?: "left" | "right" }>) => {
      ensureSpace(18)
      cols.forEach((col) => {
        page.drawText(col.label, {
          x: col.x,
          y,
          size: fontSize,
          font: fontBold,
        })
      })
      y -= 12
      drawRule()
    }

    const wrapText = (text: string, maxCharsPerLine: number) => {
      const clean = String(text || "-").replace(/[\r\n]+/g, " ").trim()
      if (!clean) return ["-"]
      const words = clean.split(/\s+/)
      const lines: string[] = []
      let current = ""
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word
        if (candidate.length <= maxCharsPerLine) {
          current = candidate
        } else {
          if (current) lines.push(current)
          current = word
        }
      }
      if (current) lines.push(current)
      return lines.length ? lines : ["-"]
    }

    const drawWrappedCell = (text: string, x: number, lineOffset: number, maxCharsPerLine: number) => {
      const lines = wrapText(text, maxCharsPerLine)
      lines.forEach((line, idx) => {
        page.drawText(line, { x, y: y - lineOffset - idx * 11, size: fontSize, font })
      })
      return lines.length
    }

    drawText("Overzicht terug te staan dagen", { bold: true, size: 14 })
    drawText(`Naam: ${name}`)
    drawText(`Geprint op: ${new Date().toLocaleString("nl-NL")}`)
    drawRule()
    drawText(`Totaal mindagen: ${group.totalRequired} dagen`, { bold: true })
    drawText(`Totaal terug gestaan: ${group.totalReturned} dagen`, { bold: true })
    drawText(`Saldo: ${group.totalOutstanding} dagen`, { bold: true })

    y -= 4
    drawText("Opgebouwde mindagen", { bold: true, size: 11 })
    drawTableHeader([
      { x: margin, label: "Periode" },
      { x: margin + 170, label: "Dagen" },
      { x: margin + 230, label: "Reden" },
      { x: margin + 320, label: "Omschrijving" },
    ])

    const records = [...(group.records || [])].sort(
      (a: any, b: any) =>
        new Date(b.createdAt || b.startDate || 0).getTime() -
        new Date(a.createdAt || a.startDate || 0).getTime()
    )
    if (records.length === 0) {
      drawText("Geen registraties gevonden.")
    } else {
      for (const rec of records) {
        const linesPeriod = wrapText(`${formatDateShort(rec.startDate)} t/m ${formatDateShort(rec.endDate)}`, 22).length
        const linesDays = wrapText(String(rec.standBackDaysRequired ?? 0), 8).length
        const linesReason = wrapText(rec.reason || "-", 14).length
        const linesDesc = wrapText(rec.description || "-", 28).length
        const maxLines = Math.max(linesPeriod, linesDays, linesReason, linesDesc)
        const rowHeight = Math.max(14, maxLines * 11 + 4)
        ensureSpace(rowHeight + 4)

        drawWrappedCell(`${formatDateShort(rec.startDate)} t/m ${formatDateShort(rec.endDate)}`, margin, 0, 22)
        drawWrappedCell(String(rec.standBackDaysRequired ?? 0), margin + 170, 0, 8)
        drawWrappedCell(rec.reason || "-", margin + 230, 0, 14)
        drawWrappedCell(rec.description || "-", margin + 320, 0, 28)
        y -= rowHeight
      }
    }

    y -= 8
    drawText("Terug gestaan", { bold: true, size: 11 })
    drawTableHeader([
      { x: margin, label: "Datum" },
      { x: margin + 70, label: "Periode terug gestaan" },
      { x: margin + 245, label: "Dagen" },
      { x: margin + 300, label: "Waar / notitie" },
    ])

    const allHistory: Array<{ date: string; period: string; days: string; note: string }> = []
    records.forEach((record: any) => {
      const history = Array.isArray(record.standBackHistory) ? record.standBackHistory : []
      history.forEach((h: any) => {
        const daysNum = typeof h.daysCompleted === "number" ? h.daysCompleted : Number(h.daysCompleted || 0)
        const period =
          h?.periodStart && h?.periodEnd
            ? `${formatDateShort(h.periodStart)} t/m ${formatDateShort(h.periodEnd)}`
            : h?.periodStart
              ? formatDateShort(h.periodStart)
              : "-"
        allHistory.push({
          date: formatDateShort(h.date),
          period,
          days: Number.isFinite(daysNum) ? String(daysNum) : "-",
          note: String(h.note || "-").replace(/[\r\n]+/g, " "),
        })
      })
    })

    if (allHistory.length === 0) {
      drawText("Nog geen teruggestane dagen geregistreerd.")
    } else {
      allHistory
        .sort((a, b) => {
          const da = a.date.split("-").reverse().join("-")
          const db = b.date.split("-").reverse().join("-")
          return db.localeCompare(da)
        })
        .forEach((h) => {
          const linesDate = wrapText(h.date, 10).length
          const linesPeriod = wrapText(h.period, 26).length
          const linesDays = wrapText(h.days, 8).length
          const linesNote = wrapText(h.note, 28).length
          const maxLines = Math.max(linesDate, linesPeriod, linesDays, linesNote)
          const rowHeight = Math.max(14, maxLines * 11 + 4)
          ensureSpace(rowHeight + 4)

          drawWrappedCell(h.date, margin, 0, 10)
          drawWrappedCell(h.period, margin + 70, 0, 26)
          drawWrappedCell(h.days, margin + 245, 0, 8)
          drawWrappedCell(h.note, margin + 300, 0, 28)
          y -= rowHeight
        })
    }

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = `Terug-te-staan-overzicht-${name.replace(/\s+/g, "_")}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getRecordReturnedDays = (record: any) => {
    const history = Array.isArray(record?.standBackHistory) ? record.standBackHistory : []
    const historyTotal = history.reduce((sum: number, entry: any) => {
      const raw = entry?.daysCompleted
      const value = typeof raw === "number" ? raw : Number(raw || 0)
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)
    const completed = Number(record?.standBackDaysCompleted || 0)
    // Nieuw model: terugstaan telt vanuit history (niet per registratie afboeken).
    // Fallback op completed alleen voor oude data zonder history.
    if (history.length > 0) return historyTotal
    return Number.isFinite(completed) ? completed : 0
  }

  // Alleen openstaande registraties in openstaand-tab; gearchiveerd hoort in archief-tab
  const openStandBackRecordsRaw = standBackRecords
    .filter((record: any) => record.stand_back_status === "openstaand")
    .map((record: any) => {
      const crewMember = crew.find((c: any) => c.id === record.crew_member_id)
      const ship = crewMember?.ship_id ? ships.find((s: any) => s.id === crewMember.ship_id) : null
      return {
        id: record.id,
        crewMemberId: record.crew_member_id,
        sickLeaveId: record.sick_leave_id,
        startDate: record.start_date,
        endDate: record.end_date,
        daysCount: record.days_count || 0,
        description: record.description || '',
        reason: record.reason || 'ziekte',
        notes: record.notes || '',
        standBackDaysRemaining: record.stand_back_days_remaining || 0,
        standBackDaysRequired: record.stand_back_days_required || 0,
        standBackDaysCompleted: record.stand_back_days_completed || 0,
        standBackHistory: record.stand_back_history || [],
        standBackStatus: record.stand_back_status || 'openstaand',
        archiveStatus: 'openstaand',
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        crewMember: crewMember ? {
          id: crewMember.id,
          firstName: crewMember.first_name,
          lastName: crewMember.last_name,
          position: crewMember.position,
          nationality: crewMember.nationality,
          phone: crewMember.phone,
          shipId: crewMember.ship_id,
        } : null,
        ship: ship ? {
          id: ship.id,
          name: ship.name,
        } : null,
      }
    })
    .filter((record) => record.crewMember)

  // Group records by crew member ID
  const groupedByMember = openStandBackRecordsRaw.reduce((acc: any, record: any) => {
    const memberId = record.crewMemberId
    if (!acc[memberId]) {
      acc[memberId] = {
        crewMemberId: memberId,
        crewMember: record.crewMember,
        ship: record.ship,
        records: [],
        totalRequired: 0,
        totalReturned: 0,
        totalOutstanding: 0,
      }
    }
    acc[memberId].records.push(record)
    acc[memberId].totalRequired += record.standBackDaysRequired
    acc[memberId].totalReturned += getRecordReturnedDays(record)
    acc[memberId].totalOutstanding = Math.max(0, acc[memberId].totalRequired - acc[memberId].totalReturned)
    return acc
  }, {})

  // Convert grouped object to array and sort by total remaining days
  const openStandBackRecords = Object.values(groupedByMember)
    .map((group: any) => ({
      ...group,
      // Use the most recent record for display purposes
      id: group.records[0].id,
      startDate: group.records[0].startDate,
      endDate: group.records[group.records.length - 1].endDate,
      standBackDaysRemaining: group.totalOutstanding,
      standBackDaysRequired: group.totalRequired,
      standBackDaysCompleted: group.totalReturned,
    }))
    .sort((a: any, b: any) => b.totalOutstanding - a.totalOutstanding)

  // Archive records (completed and terminated)
  const archiveRecords = standBackRecords
    .filter((record: any) => record.stand_back_status === 'voltooid')
    .map((record: any) => {
      const crewMember = crew.find((c: any) => c.id === record.crew_member_id)
      const ship = crewMember?.ship_id ? ships.find((s: any) => s.id === crewMember.ship_id) : null
      return {
        id: record.id,
        crewMemberId: record.crew_member_id,
        startDate: record.start_date,
        endDate: record.end_date,
        daysCount: record.days_count || 0,
        description: record.description || '',
        reason: record.reason || 'ziekte',
        notes: record.notes || '',
        standBackDaysRemaining: record.stand_back_days_remaining || 0,
        standBackDaysRequired: record.stand_back_days_required || 0,
        standBackDaysCompleted: record.stand_back_days_completed || 0,
        standBackHistory: record.stand_back_history || [],
        standBackStatus: record.stand_back_status || 'openstaand',
        archiveStatus: record.description?.includes('[UIT DIENST') ? 'gearchiveerd-uitdienst' : 'voltooid',
        archivedAt: record.updated_at, // Use updated_at as proxy for archived_at
        archivedBy: 'Systeem',
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        crewMember: crewMember ? {
          id: crewMember.id,
          firstName: crewMember.first_name,
          lastName: crewMember.last_name,
          position: crewMember.position,
          nationality: crewMember.nationality,
          phone: crewMember.phone,
          shipId: crewMember.ship_id,
        } : null,
        ship: ship ? {
          id: ship.id,
          name: ship.name,
        } : null,
      }
    })
    .filter((record) => record.crewMember)
    .sort((a, b) => new Date(b.archivedAt || b.updatedAt).getTime() - new Date(a.archivedAt || a.updatedAt).getTime())

  const totalOpenDays = openStandBackRecords.reduce((sum, record) => sum + record.standBackDaysRemaining, 0)

  // Archive statistics
  const archiveStats = {
    total: archiveRecords.length,
    completed: archiveRecords.filter(r => r.archiveStatus === 'voltooid' && !r.description?.includes('[UIT DIENST')).length,
    terminated: archiveRecords.filter(r => r.archiveStatus === 'gearchiveerd-uitdienst' || r.description?.includes('[UIT DIENST')).length,
    totalRemainingDays: archiveRecords.reduce((sum, record) => sum + record.standBackDaysRemaining, 0)
  }

  // Archive filter state
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'voltooid' | 'gearchiveerd-uitdienst'>('all')
  
  // Filtered archive records
  const filteredArchiveRecords = archiveFilter === 'all' 
    ? archiveRecords 
    : archiveRecords.filter(record => {
      if (archiveFilter === 'voltooid') {
        return record.archiveStatus === 'voltooid' && !record.description?.includes('[UIT DIENST')
      } else if (archiveFilter === 'gearchiveerd-uitdienst') {
        return record.archiveStatus === 'gearchiveerd-uitdienst' || record.description?.includes('[UIT DIENST')
      }
      return true
    })

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

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'ziekte':
        return 'bg-red-100 text-red-800'
      case 'vrij genomen':
        return 'bg-blue-100 text-blue-800'
      case 'verlof':
        return 'bg-green-100 text-green-800'
      case 'training':
        return 'bg-purple-100 text-purple-800'
      case 'school':
        return 'bg-yellow-100 text-yellow-800'
      case 'overig':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getArchiveStatusColor = (status: string) => {
    switch (status) {
      case 'voltooid':
        return 'bg-green-100 text-green-800'
      case 'gearchiveerd-uitdienst':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleAddStandBackDays = async () => {
    if (!selectedRecord || !daysToAdd || Number.parseInt(daysToAdd) <= 0) {
      alert("Vul een geldig aantal dagen in")
      return
    }

    try {
      const daysReturned = Number.parseInt(daysToAdd, 10)
      const targetRecord =
        [...(selectedRecord.records || [selectedRecord])]
          .sort(
            (a: any, b: any) =>
              new Date(b.createdAt || b.startDate || 0).getTime() -
              new Date(a.createdAt || a.startDate || 0).getTime()
          )[0] || selectedRecord

      const historyEntry = {
        date: new Date().toISOString(),
        daysCompleted: daysReturned,
        note: note || "Teruggestaan dagen geregistreerd",
        periodStart: returnedStartDate || null,
        periodEnd: returnedEndDate || null,
        completedBy: "User",
      }

      await updateStandBackRecord(targetRecord.id, {
        // Niet meer per registratie afboeken; alleen registreren in history
        stand_back_history: [...(targetRecord.standBackHistory || []), historyEntry],
      })

      alert(
        `Succesvol ${daysReturned} dag(en) teruggestaan geregistreerd voor ${selectedRecord.crewMember?.firstName} ${selectedRecord.crewMember?.lastName}`
      )
      
      // Reset form
      setDaysToAdd("")
      setNote("")
      setReturnedStartDate("")
      setReturnedEndDate("")
      setIsAddDaysOpen(false)
      setSelectedRecord(null)
      
      // Reload data to refresh the list
      await loadData()
    } catch (error) {
      console.error('Error logging stand back days:', error)
      alert('Fout bij het registreren van teruggestane dagen: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleCreateNewRecord = async () => {
    if (!newRecord.crewMemberId || !newRecord.startDate || !newRecord.endDate || !newRecord.daysCount) {
      alert("Vul alle verplichte velden in")
      return
    }

    try {
      const startDate = new Date(newRecord.startDate)
      const endDate = new Date(newRecord.endDate)
      const daysCount = Number.parseInt(newRecord.daysCount)
      
      // Calculate stand-back days (usually 1:1 ratio, but can be customized)
      const standBackDaysRequired = daysCount
      
      await addStandBackRecord({
        id: crypto.randomUUID(), // Generate UUID for the record
        crew_member_id: newRecord.crewMemberId,
        start_date: newRecord.startDate,
        end_date: newRecord.endDate,
        days_count: daysCount,
        reason: newRecord.reason, // Add the reason field
        description: newRecord.description || `Terug-te-staan voor ${newRecord.reason}`,
        notes: newRecord.notes || '', // Add notes field
        stand_back_days_required: standBackDaysRequired,
        stand_back_days_completed: 0,
        stand_back_days_remaining: standBackDaysRequired,
        stand_back_status: 'openstaand',
        stand_back_history: []
      })
      
      alert("Terug-te-staan registratie succesvol toegevoegd!")
      
      // Reset form
      setNewRecord({
        crewMemberId: "",
        reason: "ziekte",
        startDate: "",
        endDate: "",
        daysCount: "",
        description: "",
        notes: ""
      })
      setIsNewRecordOpen(false)
    } catch (error) {
      console.error('Error creating stand-back record:', error)
      alert('Fout bij het aanmaken van registratie: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleArchiveRecord = async (record: any, archiveType: 'completed' | 'terminated') => {
    try {
      if (archiveType === 'completed') {
        // Mark as fully completed
        await updateStandBackRecord(record.id, {
          stand_back_status: 'voltooid',
          stand_back_days_completed: record.standBackDaysRequired,
          stand_back_days_remaining: 0
        })
      } else {
        // Archive with remaining days (terminated employee) - just mark as completed for now
        // We'll use the description field to indicate it's a terminated employee
        const originalDescription = record.description || 'Geen klacht opgegeven'
        await updateStandBackRecord(record.id, {
          stand_back_status: 'voltooid',
          description: `${originalDescription} [UIT DIENST - ${record.standBackDaysRemaining} dagen openstaand]`
          // Keep stand_back_days_remaining as is to show remaining days
        })
      }
      
      const message = archiveType === 'completed' 
        ? `Registratie gemarkeerd als voltooid voor ${record.crewMember?.firstName} ${record.crewMember?.lastName}`
        : `Registratie gearchiveerd (uit dienst) voor ${record.crewMember?.firstName} ${record.crewMember?.lastName} - ${record.standBackDaysRemaining} dagen blijven openstaand`
      
      alert(message)
      setIsArchiveOpen(false)
      setSelectedRecord(null)
    } catch (error) {
      console.error('Error archiving record:', error)
      alert('Fout bij het archiveren: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleDeleteRecord = async (record: any) => {
    const confirmMessage = `Weet je zeker dat je deze registratie DEFINITIEF wilt verwijderen?\n\nMedewerker: ${record.crewMember?.firstName} ${record.crewMember?.lastName}\nReden: ${record.reason}\nPeriode: ${new Date(record.startDate).toLocaleDateString("nl-NL")} - ${new Date(record.endDate).toLocaleDateString("nl-NL")}\n\nDeze actie kan NIET ongedaan worden gemaakt!`
    
    if (confirm(confirmMessage)) {
      try {
        console.log('Deleting stand back record:', record.id)
        const { error } = await supabase
          .from('stand_back_records')
          .delete()
          .eq('id', record.id)
        
        if (error) {
          console.error('Error deleting record:', error)
          throw error
        }
        
        alert(`Registratie definitief verwijderd voor ${record.crewMember?.firstName} ${record.crewMember?.lastName}`)
        
        // Reload data to refresh the list
        await loadData()
      } catch (error) {
        console.error('Error deleting record:', error)
        alert('Fout bij het verwijderen: ' + (error instanceof Error ? error.message : String(error)))
      }
    }
  }

  const calculateDaysBetween = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const getGroupStandBackHistory = (group: any) => {
    const allEntries = (group.records || []).flatMap((rec: any) => {
      const history = Array.isArray(rec.standBackHistory) ? rec.standBackHistory : []
      return history.map((entry: any) => ({
        recordId: rec.id,
        recordReason: rec.reason || "onbekend",
        date: entry?.date,
        daysCompleted: typeof entry?.daysCompleted === "number" ? entry.daysCompleted : Number(entry?.daysCompleted || 0),
        note: entry?.note || "",
        returnedPeriod:
          entry?.periodStart && entry?.periodEnd
            ? `${new Date(entry.periodStart).toLocaleDateString("nl-NL")} - ${new Date(entry.periodEnd).toLocaleDateString("nl-NL")}`
            : entry?.periodStart
              ? new Date(entry.periodStart).toLocaleDateString("nl-NL")
              : entry?.date
                ? new Date(entry.date).toLocaleDateString("nl-NL")
                : "-",
      }))
    })

    return allEntries
      .filter((entry: any) => Number.isFinite(entry.daysCompleted) && entry.daysCompleted > 0)
      .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
  }

  const toggleMemberDetail = (memberId: string, section: "mindagen" | "returned") => {
    setExpandedDetailByMember((prev) => ({
      ...prev,
      [memberId]: prev[memberId] === section ? null : section,
    }))
  }

  const handleExportArchive = () => {
    // Create CSV content
    const csvHeaders = [
      'Medewerker',
      'Reden',
      'Periode Van',
      'Periode Tot',
      'Aantal Dagen',
      'Voltooid',
      'Openstaand',
      'Status',
      'Gearchiveerd Op',
      'Beschrijving',
      'Opmerkingen'
    ]

    const csvRows = archiveRecords.map(record => [
      `${record.crewMember?.firstName || ''} ${record.crewMember?.lastName || ''}`,
      record.reason,
      new Date(record.startDate).toLocaleDateString("nl-NL"),
      new Date(record.endDate).toLocaleDateString("nl-NL"),
      record.daysCount,
      record.standBackDaysCompleted,
      record.standBackDaysRemaining,
      record.description?.includes('[UIT DIENST') ? 'Uit Dienst' : 'Voltooid',
      record.archivedAt ? new Date(record.archivedAt).toLocaleDateString("nl-NL") : '',
      record.description?.includes('[UIT DIENST') 
        ? record.description.split(' [UIT DIENST')[0] 
        : record.description || '',
      record.notes || ''
    ])

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `terug-te-staan-archief-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setNewRecord(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-calculate days if both dates are set
      if (updated.startDate && updated.endDate) {
        const days = calculateDaysBetween(updated.startDate, updated.endDate)
        updated.daysCount = days.toString()
      }
      
      return updated
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold">Terug-te-staan Dagen Beheer</h1>
                <p className="text-sm text-gray-600">Beheer alle terug-te-staan situaties: ziekte, verlof, training en meer</p>
              </div>
              <div className="flex items-center space-x-2">
                <UserClock className="w-5 h-5" />
                <Badge variant="destructive">
                  {totalOpenDays} dagen totaal
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Dialog open={isNewRecordOpen} onOpenChange={setIsNewRecordOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nieuwe Registratie
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nieuwe Terug-te-staan Registratie</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="crewMember">Medewerker *</Label>
                        <Select value={newRecord.crewMemberId} onValueChange={(value) => setNewRecord(prev => ({ ...prev, crewMemberId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer medewerker" />
                          </SelectTrigger>
                          <SelectContent>
                            {crew.filter(c => c.status !== 'uit-dienst').map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.first_name} {member.last_name} - {member.position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="reason">Reden *</Label>
                        <Select value={newRecord.reason} onValueChange={(value) => setNewRecord(prev => ({ ...prev, reason: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ziekte">Ziekte</SelectItem>
                            <SelectItem value="vrij genomen">Vrij genomen</SelectItem>
                            <SelectItem value="verlof">Verlof</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="school">School</SelectItem>
                            <SelectItem value="overig">Overig</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="startDate">Van datum *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={newRecord.startDate}
                          onChange={(e) => handleDateChange('startDate', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="endDate">Tot datum *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={newRecord.endDate}
                          onChange={(e) => handleDateChange('endDate', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="daysCount">Aantal dagen *</Label>
                        <Input
                          id="daysCount"
                          type="number"
                          min="1"
                          value={newRecord.daysCount}
                          onChange={(e) => setNewRecord(prev => ({ ...prev, daysCount: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Beschrijving</Label>
                      <Textarea
                        id="description"
                        value={newRecord.description}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Bijv. 'Griep', 'Persoonlijke omstandigheden', etc."
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Opmerkingen</Label>
                      <Textarea
                        id="notes"
                        value={newRecord.notes}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Extra informatie over de situatie"
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsNewRecordOpen(false)}>
                        Annuleren
                      </Button>
                      <Button onClick={handleCreateNewRecord}>Registratie Aanmaken</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="openstaand" className="space-y-4">
        <TabsList>
          <TabsTrigger value="openstaand">
            Alle registraties ({openStandBackRecords.length})
          </TabsTrigger>
          <TabsTrigger value="archief">
            Archief ({archiveRecords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="openstaand" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {openStandBackRecords.map((group: any) => (
                  <div
                    key={group.crewMemberId}
                    className="bg-white border-2 border-gray-300 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-orange-100 text-orange-700">
                            {group.crewMember?.firstName?.[0] || '?'}
                            {group.crewMember?.lastName?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {group.crewMember?.firstName || 'Onbekend'} {group.crewMember?.lastName || 'Medewerker'}
                            </h4>
                            <span className="text-lg">{getNationalityFlag(group.crewMember?.nationality || 'NL')}</span>
                            <Badge variant="outline" className="text-xs">
                              {group.crewMember?.nationality || 'NL'}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="font-medium">{group.crewMember?.position || 'Onbekend'}</span>
                            {group.ship && (
                              <div className="flex items-center space-x-1">
                                <Ship className="w-3 h-3" />
                                <span>{group.ship.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <Badge variant="outline" className="text-sm bg-orange-50 text-orange-800 border-orange-200">
                          Saldo: {group.totalOutstanding} dagen
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadMemberOverviewPdf(group)}
                          className="flex items-center"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Overzicht
                        </Button>
                        <Dialog
                          open={isAddDaysOpen && selectedRecord?.crewMemberId === group.crewMemberId}
                          onOpenChange={(open) => {
                            setIsAddDaysOpen(open)
                            if (open) setSelectedRecord(group)
                            else setSelectedRecord(null)
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Plus className="w-4 h-4 mr-2" />
                              Teruggestaan registreren
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Teruggestaan registreren - {group.crewMember?.firstName || 'Onbekend'} {group.crewMember?.lastName || 'Medewerker'}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">
                                  <strong>Totaal mindagen:</strong> {group.totalRequired} dagen
                                </p>
                                <p className="text-sm text-gray-600">
                                  <strong>Totaal terug gestaan:</strong> {group.totalReturned} dagen
                                </p>
                                <p className="text-sm text-gray-600">
                                  <strong>Huidig saldo:</strong> {group.totalOutstanding} dagen
                                </p>
                              </div>

                              <div>
                                <Label htmlFor="days">Aantal dagen terug gestaan</Label>
                                <Input
                                  id="days"
                                  type="number"
                                  min="1"
                                  value={daysToAdd}
                                  onChange={(e) => setDaysToAdd(e.target.value)}
                                  placeholder="Aantal dagen"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="returned-start">Periode terug gestaan - van</Label>
                                  <Input
                                    id="returned-start"
                                    type="date"
                                    value={returnedStartDate}
                                    onChange={(e) => setReturnedStartDate(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="returned-end">Periode terug gestaan - tot</Label>
                                  <Input
                                    id="returned-end"
                                    type="date"
                                    value={returnedEndDate}
                                    onChange={(e) => setReturnedEndDate(e.target.value)}
                                  />
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="note">Notitie (optioneel)</Label>
                                <Textarea
                                  id="note"
                                  value={note}
                                  onChange={(e) => setNote(e.target.value)}
                                  placeholder="Bijv. 'Terug gestaan op MS Bellona van 15-20 januari'"
                                  rows={3}
                                />
                              </div>

                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setIsAddDaysOpen(false)}>
                                  Annuleren
                                </Button>
                                <Button onClick={handleAddStandBackDays}>Registreren</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog
                          open={isArchiveOpen && selectedRecord?.crewMemberId === group.crewMemberId}
                          onOpenChange={(open) => {
                            setIsArchiveOpen(open)
                            if (open) setSelectedRecord(group)
                            else setSelectedRecord(null)
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Archive className="w-4 h-4 mr-2" />
                              Archiveren
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Registratie Archiveren - {group.crewMember?.firstName || 'Onbekend'} {group.crewMember?.lastName || 'Medewerker'}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">
                                  <strong>Totaal mindagen:</strong> {group.totalRequired} dagen
                                </p>
                                <p className="text-sm text-gray-600">
                                  <strong>Aantal registraties:</strong> {group.records.length}
                                </p>
                              </div>

                              {/* Show all records */}
                              {group.records.length > 0 && (
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <p className="text-sm font-medium text-blue-900 mb-2">
                                    Alle registraties die gearchiveerd worden:
                                  </p>
                                  <div className="space-y-2">
                                    {group.records.map((rec: any) => (
                                      <div key={rec.id} className="bg-white p-2 rounded text-xs">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <Badge className={`text-xs ${getReasonColor(rec.reason)}`}>
                                              {rec.reason}
                                            </Badge>
                                            <span className="ml-2 text-gray-600">
                                              {new Date(rec.startDate).toLocaleDateString("nl-NL")} - {new Date(rec.endDate).toLocaleDateString("nl-NL")}
                                            </span>
                                          </div>
                                          <Badge variant="secondary" className="text-xs">
                                            {rec.standBackDaysRequired} mindagen opgebouwd
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2">
                                <Button 
                                  className="w-full" 
                                  onClick={() => {
                                    // Archive all records as completed
                                    group.records.forEach((rec: any) => {
                                      handleArchiveRecord(rec, 'completed')
                                    })
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Markeer Alle Als Voltooid
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="w-full" 
                                  onClick={() => {
                                    // Archive all records as terminated
                                    group.records.forEach((rec: any) => {
                                      handleArchiveRecord(rec, 'terminated')
                                    })
                                  }}
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  Archiveer Alle (Uit Dienst)
                                </Button>
                              </div>

                              <div className="flex justify-end">
                                <Button variant="outline" onClick={() => setIsArchiveOpen(false)}>
                                  Annuleren
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <label className="text-sm font-semibold text-gray-800 mb-3 block">
                        Teruggestaan overzicht
                      </label>
                      <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <button
                          type="button"
                          onClick={() => toggleMemberDetail(group.crewMemberId, "mindagen")}
                          className={`text-left rounded px-3 py-2 border transition ${
                            expandedDetailByMember[group.crewMemberId] === "mindagen"
                              ? "bg-blue-100 border-blue-300"
                              : "bg-blue-50 border-blue-100 hover:bg-blue-100"
                          }`}
                        >
                          <span className="text-gray-600">Totaal mindagen</span>
                          <div className="font-semibold text-blue-800">{group.totalRequired} dagen</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMemberDetail(group.crewMemberId, "returned")}
                          className={`text-left rounded px-3 py-2 border transition ${
                            expandedDetailByMember[group.crewMemberId] === "returned"
                              ? "bg-green-100 border-green-300"
                              : "bg-green-50 border-green-100 hover:bg-green-100"
                          }`}
                        >
                          <span className="text-gray-600">Totaal terug gestaan</span>
                          <div className="font-semibold text-green-800">{group.totalReturned} dagen</div>
                        </button>
                        <div className="bg-orange-50 border border-orange-100 rounded px-3 py-2">
                          <span className="text-gray-600">Saldo</span>
                          <div className="font-semibold text-orange-800">{group.totalOutstanding} dagen</div>
                        </div>
                      </div>

                      {expandedDetailByMember[group.crewMemberId] === "mindagen" && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border px-2 py-2 text-left">Periode</th>
                                <th className="border px-2 py-2 text-right">Dagen</th>
                                <th className="border px-2 py-2 text-left">Reden</th>
                                <th className="border px-2 py-2 text-left">Omschrijving</th>
                                <th className="border px-2 py-2 text-left">Notitie</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...group.records]
                                .sort(
                                  (a: any, b: any) =>
                                    new Date(b.createdAt || b.startDate || 0).getTime() -
                                    new Date(a.createdAt || a.startDate || 0).getTime()
                                )
                                .map((rec: any, index: number) => (
                                <tr key={rec.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                  <td className="border px-2 py-1">
                                    {new Date(rec.startDate).toLocaleDateString("nl-NL")} - {new Date(rec.endDate).toLocaleDateString("nl-NL")}
                                  </td>
                                  <td className="border px-2 py-1 text-right font-medium">{rec.standBackDaysRequired}</td>
                                  <td className="border px-2 py-1">{rec.reason}</td>
                                  <td className="border px-2 py-1">{rec.description || "-"}</td>
                                  <td className="border px-2 py-1">{rec.notes || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {expandedDetailByMember[group.crewMemberId] === "returned" && (
                        getGroupStandBackHistory(group).length === 0 ? (
                          <p className="text-sm text-gray-500">Nog geen teruggestane dagen geregistreerd.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border px-2 py-2 text-left">Datum</th>
                                  <th className="border px-2 py-2 text-right">Dagen</th>
                                  <th className="border px-2 py-2 text-left">Periode terug gestaan</th>
                                  <th className="border px-2 py-2 text-left">Waar / notitie</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getGroupStandBackHistory(group).map((entry: any, index: number) => (
                                  <tr key={`${entry.recordId}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="border px-2 py-1">{new Date(entry.date).toLocaleDateString("nl-NL")}</td>
                                    <td className="border px-2 py-1 text-right font-medium">{entry.daysCompleted}</td>
                                    <td className="border px-2 py-1">{entry.returnedPeriod}</td>
                                    <td className="border px-2 py-1">{entry.note || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {openStandBackRecords.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                  <p className="text-gray-500">Geen registraties gevonden</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archief" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Archive className="w-5 h-5" />
                  <span>Archief</span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportArchive}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporteer CSV
                </Button>
              </div>
              
              {/* Archive Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{archiveStats.total}</div>
                  <div className="text-sm text-blue-600">Totaal Gearchiveerd</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{archiveStats.completed}</div>
                  <div className="text-sm text-green-600">Volledig Voltooid</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{archiveStats.terminated}</div>
                  <div className="text-sm text-orange-600">Uit Dienst</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{archiveStats.totalRemainingDays}</div>
                  <div className="text-sm text-red-600">Dagen Nog Openstaand</div>
                </div>
              </div>

              {/* Archive Filter */}
              <div className="flex items-center space-x-2 mt-4">
                <span className="text-sm font-medium text-gray-700">Filter:</span>
                <Button
                  variant={archiveFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setArchiveFilter('all')}
                >
                  Alle ({archiveRecords.length})
                </Button>
                <Button
                  variant={archiveFilter === 'voltooid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setArchiveFilter('voltooid')}
                >
                  Voltooid ({archiveStats.completed})
                </Button>
                <Button
                  variant={archiveFilter === 'gearchiveerd-uitdienst' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setArchiveFilter('gearchiveerd-uitdienst')}
                >
                  Uit Dienst ({archiveStats.terminated})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredArchiveRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gray-100 text-gray-700">
                            {record.crewMember?.firstName?.[0] || '?'}
                            {record.crewMember?.lastName?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {record.crewMember?.firstName || 'Onbekend'} {record.crewMember?.lastName || 'Medewerker'}
                            </h4>
                            <span className="text-lg">{getNationalityFlag(record.crewMember?.nationality || 'NL')}</span>
                            <Badge variant="outline" className="text-xs">
                              {record.crewMember?.nationality || 'NL'}
                            </Badge>
                            <Badge className={`text-xs ${getReasonColor(record.reason)}`}>
                              {record.reason}
                            </Badge>
                            <Badge className={`text-xs ${getArchiveStatusColor(record.description?.includes('[UIT DIENST') ? 'gearchiveerd-uitdienst' : 'voltooid')}`}>
                              {record.description?.includes('[UIT DIENST') ? 'Uit Dienst' : 'Voltooid'}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="font-medium">{record.crewMember?.position || 'Onbekend'}</span>
                            {record.ship && (
                              <div className="flex items-center space-x-1">
                                <Ship className="w-3 h-3" />
                                <span>{record.ship.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Gearchiveerd: {record.archivedAt ? new Date(record.archivedAt).toLocaleDateString("nl-NL") : 'Onbekend'}
                        </div>
                        {record.standBackDaysRemaining > 0 && (
                          <Badge variant="destructive" className="text-sm mt-1">
                            {record.standBackDaysRemaining} dagen openstaand
                          </Badge>
                        )}
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRecord(record)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Verwijder
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Archive Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Periode</label>
                        <p className="font-medium">
                          {new Date(record.startDate).toLocaleDateString("nl-NL")} -{" "}
                          {new Date(record.endDate).toLocaleDateString("nl-NL")}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Duur</label>
                        <p className="font-medium">{record.daysCount} dagen</p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Voltooid</label>
                        <p className="font-medium">{record.standBackDaysCompleted}/{record.standBackDaysRequired}</p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Status</label>
                        <p className="font-medium">
                          {record.description?.includes('[UIT DIENST') ? 'Uit Dienst' : 'Volledig ingehaald'}
                        </p>
                      </div>
                    </div>

                    {record.description && (
                      <div className="mt-4">
                        <label className="text-xs font-medium text-gray-500">Beschrijving</label>
                        <p className="text-sm text-gray-700 mt-1">
                          {record.description.includes('[UIT DIENST') 
                            ? record.description.split(' [UIT DIENST')[0] 
                            : record.description}
                        </p>
                        {record.description.includes('[UIT DIENST') && (
                          <p className="text-xs text-orange-600 mt-1 font-medium">
                            {record.description.split('[UIT DIENST')[1].replace(']', '')}
                          </p>
                        )}
                      </div>
                    )}

                    {record.notes && (
                      <div className="mt-4">
                        <label className="text-xs font-medium text-gray-500">Opmerkingen</label>
                        <p className="text-sm text-gray-700 mt-1">{record.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredArchiveRecords.length === 0 && (
                <div className="text-center py-8">
                  <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {archiveFilter === 'all' 
                      ? 'Geen gearchiveerde registraties' 
                      : `Geen ${archiveFilter === 'voltooid' ? 'voltooide' : 'uit-dienst'} registraties`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
