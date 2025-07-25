"use client"

import { shipDatabase } from "@/data/crew-database"
import { useCrewData } from "@/hooks/use-crew-data"
import { getCustomCrewDocuments } from "@/utils/out-of-service-storage"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { UserX, CheckCircle, Clock, AlertTriangle, Ship, Calendar, Phone, Mail, MapPin, GraduationCap, History, Plus, X, User, Users } from "lucide-react"

export default function AflossersOverzicht() {
  const { crewDatabase: allCrew, documentDatabase } = useCrewData()
  
  // Alleen echte aflossers tonen op basis van naam
  const echteAflossers = [
    "piet van driel",
    "erik dijken", 
    "piet noordzij",
  ]
  
  const aflossers = Object.values(allCrew).filter((crew: any) =>
    crew.position === "Aflosser" || echteAflossers.includes(`${crew.firstName.toLowerCase()} ${crew.lastName.toLowerCase()}`)
  ).map((aflosser: any) => ({
    ...aflosser,
    assignmentHistory: removeDuplicates(aflosser.assignmentHistory || [])
  }))

  // Helper om huidige of eerstvolgende periode te vinden
  function getCurrentOrNextPeriod(assignmentHistory: any[]) {
    const today = new Date()
    const sorted = [...(assignmentHistory || [])]
      .filter(entry => entry.from && entry.to && entry.action === "aflos-periode")
      .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime())
    for (const entry of sorted) {
      const from = new Date(entry.from)
      const to = new Date(entry.to)
      if (from <= today && to >= today) return entry // huidig
      if (from > today) return entry // eerstvolgend
    }
    return null
  }

  // Helper functies
  function getNationalityFlag(nationality: string) {
    const flags: { [key: string]: string } = {
      NL: "🇳🇱", CZ: "🇨🇿", SLK: "🇸🇰", EG: "🇪🇬", PO: "🇵🇱", 
      SERV: "🇷🇸", HUN: "🇭🇺", BE: "🇧🇪", FR: "🇫🇷", DE: "🇩🇪", LUX: "🇱🇺"
    }
    return flags[nationality] || "🌍"
  }

  // Helper om diploma's/certificaten op te halen
  function getDiplomas(crewMemberId: string) {
    if (typeof window !== 'undefined') {
      const custom = getCustomCrewDocuments(crewMemberId)
      if (custom) return custom
      
      // Haal ook documenten uit localStorage op
      try {
        const localStorageDocs = JSON.parse(localStorage.getItem('documentDatabase') || '{}')
        const localStorageDocuments = Object.values(localStorageDocs).filter((doc: any) => doc.crewMemberId === crewMemberId)
        if (localStorageDocuments.length > 0) return localStorageDocuments
      } catch (e) {
        console.error('Error parsing localStorage documents:', e)
      }
    }
    return Object.values(documentDatabase).filter((doc: any) => doc.crewMemberId === crewMemberId)
  }

  // Helper om toekomstige niet-beschikbaarheid te tonen
  function getFutureUnavailable(unavailablePeriods: any[] = []) {
    const today = new Date()
    return unavailablePeriods.filter(period => new Date(period.to) >= today)
  }

  // Helper om duplicaten te verwijderen uit assignmentHistory
  function removeDuplicates(assignmentHistory: any[] = []) {
    const seen = new Set()
    return assignmentHistory.filter(assignment => {
      const key = `${assignment.shipId}-${assignment.from}-${assignment.action}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }



  // State voor toewijzingsdialog
  const [assignmentDialog, setAssignmentDialog] = useState<{
    isOpen: boolean;
    aflosserId: string;
    aflosserName: string;
  }>({
    isOpen: false,
    aflosserId: "",
    aflosserName: ""
  })

  // State voor toewijzingsformulier
  const [assignmentForm, setAssignmentForm] = useState({
    shipId: "",
    from: "",
    to: "",
    note: "",
    reis: ""
  })

  // State voor completion dialog
  const [completionDialog, setCompletionDialog] = useState<{
    isOpen: boolean;
    aflosserId: string;
    aflosserName: string;
  }>({
    isOpen: false,
    aflosserId: "",
    aflosserName: ""
  })

  const [completionDate, setCompletionDate] = useState("")

  // State voor history dialog
  const [historyDialog, setHistoryDialog] = useState<{
    isOpen: boolean;
    aflosserId: string;
    aflosserName: string;
  }>({
    isOpen: false,
    aflosserId: "",
    aflosserName: ""
  })

  // State voor unavailable periods dialog
  const [unavailableDialog, setUnavailableDialog] = useState<{
    isOpen: boolean;
    aflosserId: string;
    aflosserName: string;
  }>({
    isOpen: false,
    aflosserId: "",
    aflosserName: ""
  })

  const [unavailableForm, setUnavailableForm] = useState({
    from: "",
    to: "",
    reason: ""
  })

  // State voor edit assignment dialog
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    aflosserId: string;
    aflosserName: string;
    assignmentId: string;
  }>({
    isOpen: false,
    aflosserId: "",
    aflosserName: "",
    assignmentId: ""
  })

  const [editForm, setEditForm] = useState({
    from: "",
    to: "",
    reis: "",
    note: ""
  })

  function handleAssign() {
    if (assignmentForm.shipId && assignmentForm.from) {
      setCrew((prev: any) => {
        const updated = { ...prev }
        const aflosser = updated[assignmentDialog.aflosserId]
        if (aflosser) {
          // Controleer of er al een actieve aflos-periode is voor dit schip
          const hasActiveAssignment = (aflosser.assignmentHistory || []).some(
            (assignment: any) => assignment.action === "aflos-periode" && assignment.shipId === assignmentForm.shipId
          )
          
          if (hasActiveAssignment) {
            alert("Deze aflosser is al toegewezen aan dit schip!")
            return prev
          }
          
          const newHistory = [
            ...(aflosser.assignmentHistory || []),
            {
              id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              from: assignmentForm.from,
              to: assignmentForm.to || null,
              shipId: assignmentForm.shipId,
              reis: assignmentForm.reis,
              action: "aflos-periode",
              note: assignmentForm.note || `Aflos-periode op ${(shipDatabase as any)[assignmentForm.shipId]?.name || assignmentForm.shipId}`
            }
          ]
          aflosser.status = "aan-boord"
          aflosser.shipId = assignmentForm.shipId
          aflosser.assignmentHistory = newHistory
        }
        return updated
      })
      setAssignmentDialog({ isOpen: false, aflosserId: "", aflosserName: "" })
      setAssignmentForm({ shipId: "", from: "", to: "", note: "", reis: "" })
    }
  }

  function handleComplete() {
    if (completionDate) {
      setCrew((prev: any) => {
        const updated = { ...prev }
        const aflosser = updated[completionDialog.aflosserId]
        if (aflosser && aflosser.assignmentHistory && aflosser.assignmentHistory.length > 0) {
          // Maak een nieuwe array aan voor assignmentHistory
          const newHistory = [...aflosser.assignmentHistory]
          for (let i = newHistory.length - 1; i >= 0; i--) {
            const assignment = newHistory[i]
            if (assignment.action === "aflos-periode" && !assignment.completedDate) {
              newHistory[i] = { ...assignment, completedDate: completionDate, action: "voltooid", id: assignment.id }
              break
            }
          }
          aflosser.assignmentHistory = newHistory
          aflosser.status = "thuis"
          aflosser.shipId = ""
        }
        return updated
      })
      setCompletionDialog({ isOpen: false, aflosserId: "", aflosserName: "" })
      setCompletionDate("")
    }
  }

  function handleAddUnavailable() {
    if (unavailableForm.from && unavailableForm.to && unavailableForm.reason) {
      setCrew((prev: any) => {
        const updated = { ...prev }
        const aflosser = updated[unavailableDialog.aflosserId]
        if (aflosser) {
          const newUnavailablePeriods = [
            ...(aflosser.unavailablePeriods || []),
            {
              id: `unavailable-${Date.now()}`,
              from: unavailableForm.from,
              to: unavailableForm.to,
              reason: unavailableForm.reason
            }
          ]
          aflosser.unavailablePeriods = newUnavailablePeriods
        }
        return updated
      })
      
      setUnavailableDialog({ isOpen: false, aflosserId: "", aflosserName: "" })
      setUnavailableForm({ from: "", to: "", reason: "" })
    }
  }

  function handleEditAssignment() {
    if (editForm.from) {
      setCrew((prev: any) => {
        const updated = { ...prev }
        const aflosser = updated[editDialog.aflosserId]
        if (aflosser && aflosser.assignmentHistory) {
          const newHistory = aflosser.assignmentHistory.map((assignment: any) => {
            if (assignment.id === editDialog.assignmentId) {
              return {
                ...assignment,
                from: editForm.from,
                to: editForm.to || null,
                reis: editForm.reis,
                note: editForm.note || assignment.note
              }
            }
            return assignment
          })
          aflosser.assignmentHistory = newHistory
        }
        return updated
      })
      
      setEditDialog({ isOpen: false, aflosserId: "", aflosserName: "", assignmentId: "" })
      setEditForm({ from: "", to: "", reis: "", note: "" })
    }
  }

  // Categoriseer aflossers
  const beschikbareAflossers = aflossers.filter((a: any) => {
    if (a.status !== "thuis") return false;
    if (a.unavailablePeriods && a.unavailablePeriods.length > 0) {
      const today = new Date();
      // Check of er een periode is die vandaag of in de toekomst eindigt
      if (a.unavailablePeriods.some((period: any) => new Date(period.to) >= today)) {
        return false;
      }
    }
    return true;
  })
  const actieveAflossers = aflossers.filter((a: any) => a.status === "aan-boord")
  const nietBeschikbareAflossers = aflossers.filter((a: any) => 
    a.status === "ziek" || 
    (a.unavailablePeriods && a.unavailablePeriods.length > 0 && 
     a.unavailablePeriods.some((period: any) => {
       const today = new Date()
       const from = new Date(period.from)
       const to = new Date(period.to)
       return from <= today && to >= today
     }))
  )

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />

      {/* Mobiele actieknoppen */}
      <div className="block md:hidden mt-4 mb-4 space-y-4">
        <div className="text-lg font-semibold text-gray-800 mb-3">Aflosser acties</div>
        <div className="grid grid-cols-1 gap-2 justify-center max-w-xs mx-auto">
          <Link href="/bemanning/aflossers/nieuw" className="bg-green-600 text-white text-xs py-2 px-1 rounded-lg text-center hover:bg-green-700 shadow flex items-center justify-center gap-1 w-full">
            <span className="text-xs">➕</span> Nieuwe aflosser
          </Link>
        </div>
      </div>



      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Aflosser Management</h1>
        <div className="flex gap-2">
          <Link href="/bemanning/aflossers/nieuw">
            <Button className="bg-green-600 hover:bg-green-700">
              <span className="mr-2">➕</span>
              Nieuwe Aflosser
            </Button>
          </Link>
        </div>
      </div>

      {/* Toewijsbare aflossers */}
      {beschikbareAflossers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Toewijsbare Aflossers ({beschikbareAflossers.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {beschikbareAflossers.map((aflosser: any) => (
              <Card key={aflosser.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {aflosser.firstName[0]}{aflosser.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/bemanning/${aflosser.id}`} className="hover:underline">
                          <h3 className="font-semibold text-gray-900 cursor-pointer">{aflosser.firstName} {aflosser.lastName}</h3>
                        </Link>
                        <p className="text-sm text-gray-600">{aflosser.position}</p>
                      </div>
                    </div>
                    <span className="text-lg">{getNationalityFlag(aflosser.nationality)}</span>
                  </div>

                  <div className="mt-2 text-sm text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 mr-1 text-gray-500" />
                    <span>{aflosser.phone || <span className="text-gray-400">Geen nummer</span>}</span>
                  </div>
                  {/* Diploma's */}
                  <div className="mt-2">
                    <span className="font-medium text-xs text-gray-500">Diploma's:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getDiplomas(aflosser.id).length === 0 ? (
                        <span className="text-xs text-gray-400">Geen</span>
                      ) : (
                        getDiplomas(aflosser.id).map((doc: any) => (
                          <span key={doc.id} className="bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-xs font-medium mr-1">{doc.name}</span>
                        ))
                      )}
                    </div>
                  </div>
                  {/* Toekomstige niet-beschikbaarheid */}
                  {getFutureUnavailable(aflosser.unavailablePeriods).length > 0 && (
                    <div className="mt-2">
                      <span className="font-medium text-xs text-gray-500">Niet beschikbaar:</span>
                      <ul className="list-disc ml-5 text-xs text-red-700">
                        {getFutureUnavailable(aflosser.unavailablePeriods).map((period: any, idx: number) => (
                          <li key={idx}>{period.from} t/m {period.to} - {period.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actieknoppen subtiel onderaan */}
                  <div className="mt-4 flex flex-row gap-2 justify-end">
                    <Button 
                      variant="default"
                      size="sm"
                      className="flex-1 h-10 text-sm bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                      onClick={() => setAssignmentDialog({
                        isOpen: true,
                        aflosserId: aflosser.id,
                        aflosserName: `${aflosser.firstName} ${aflosser.lastName}`
                      })}
                    >
                      Toewijzen aan schip
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10 text-sm flex items-center gap-1"
                      onClick={() => setHistoryDialog({
                        isOpen: true,
                        aflosserId: aflosser.id,
                        aflosserName: `${aflosser.firstName} ${aflosser.lastName}`
                      })}
                    >
                      <History className="w-4 h-4" />
                      History
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10 text-sm flex items-center gap-1"
                      onClick={() => setUnavailableDialog({
                        isOpen: true,
                        aflosserId: aflosser.id,
                        aflosserName: `${aflosser.firstName} ${aflosser.lastName}`
                      })}
                    >
                      <X className="w-4 h-4" />
                      Afwezig
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Actieve aflossers */}
      {actieveAflossers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Ship className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Actieve Aflossers ({actieveAflossers.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actieveAflossers.map((aflosser: any) => {
              const currentPeriod = getCurrentOrNextPeriod(aflosser.assignmentHistory || [])
              console.log('Aflosser:', aflosser.firstName, 'AssignmentHistory:', aflosser.assignmentHistory, 'CurrentPeriod:', currentPeriod)
              
              // Debug: toon alle aflos-periode entries
              const aflosEntries = (aflosser.assignmentHistory || []).filter((entry: any) => entry.action === "aflos-periode")
              console.log('Aflos entries for', aflosser.firstName, ':', aflosEntries)
              
              return (
                <Card key={aflosser.id} className="hover:shadow-lg transition-shadow border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {aflosser.firstName[0]}{aflosser.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/bemanning/${aflosser.id}`} className="hover:underline">
                            <h3 className="font-semibold text-gray-900 cursor-pointer">{aflosser.firstName} {aflosser.lastName}</h3>
                          </Link>
                          <p className="text-sm text-gray-600">{aflosser.position}</p>
                        </div>
                      </div>
                      <span className="text-lg">{getNationalityFlag(aflosser.nationality)}</span>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Ship className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm">Huidige schip</span>
                      </div>
                      <p className="text-sm text-blue-800">
                        {(shipDatabase as any)[aflosser.shipId]?.name || aflosser.shipId}
                      </p>
                      {(() => {
                        // Gebruik currentPeriod of de eerste aflos-periode entry
                        const periodToShow = currentPeriod || aflosEntries[0]
                        if (periodToShow) {
                          return (
                            <>
                        <div className="mt-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium">Geplande datum</span>
                          </div>
                          <p className="text-sm text-blue-800">
                                  {format(new Date(periodToShow.from), "dd-MM-yyyy")}
                                  {periodToShow.to ? ` t/m ${format(new Date(periodToShow.to), "dd-MM-yyyy")}` : ""}
                                </p>
                              </div>
                              {periodToShow.reis && (
                                <div className="mt-2">
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium">Geplande reis</span>
                                  </div>
                                  <p className="text-sm text-blue-800 font-medium">
                                    {periodToShow.reis}
                          </p>
                        </div>
                      )}
                            </>
                          )
                        }
                        return null
                      })()}
                    </div>

                    <div className="flex gap-1">
                      <Button 
                        variant="outline"
                        onClick={() => setCompletionDialog({
                          isOpen: true,
                          aflosserId: aflosser.id,
                          aflosserName: `${aflosser.firstName} ${aflosser.lastName}`
                        })}
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        Voltooien
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const currentAssignment = aflosEntries[0]
                          if (currentAssignment) {
                            setEditForm({
                              from: currentAssignment.from,
                              to: currentAssignment.to || "",
                              reis: currentAssignment.reis || "",
                              note: currentAssignment.note || ""
                            })
                            setEditDialog({
                              isOpen: true,
                              aflosserId: aflosser.id,
                              aflosserName: `${aflosser.firstName} ${aflosser.lastName}`,
                              assignmentId: currentAssignment.id
                            })
                          }
                        }}
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        Bewerken
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm("Weet je zeker dat je deze reis wilt annuleren?")) {
                            setCrew((prev: any) => {
                              const updated = { ...prev }
                              const a = updated[aflosser.id]
                              if (a && a.assignmentHistory) {
                                // Verwijder de huidige (lopende) aflos-periode (action === 'aflos-periode' zonder completedDate)
                                const idx = a.assignmentHistory.findIndex((ass: any) => ass.action === "aflos-periode" && !ass.completedDate)
                                if (idx !== -1) {
                                  a.assignmentHistory = [
                                    ...a.assignmentHistory.slice(0, idx),
                                    ...a.assignmentHistory.slice(idx + 1)
                                  ]
                                  a.status = "thuis"
                                  a.shipId = ""
                                }
                              }
                              return updated
                            })
                          }
                        }}
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        Annuleren
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setHistoryDialog({
                          isOpen: true,
                          aflosserId: aflosser.id,
                          aflosserName: `${aflosser.firstName} ${aflosser.lastName}`
                        })}
                        size="sm"
                        className="px-2"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Niet beschikbare aflossers */}
      {nietBeschikbareAflossers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <UserX className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Niet Beschikbare Aflossers ({nietBeschikbareAflossers.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nietBeschikbareAflossers.map((aflosser: any) => (
              <Card key={aflosser.id} className="hover:shadow-lg transition-shadow border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-red-100 text-red-700">
                          {aflosser.firstName[0]}{aflosser.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/bemanning/${aflosser.id}`} className="hover:underline">
                          <h3 className="font-semibold text-gray-900 cursor-pointer">{aflosser.firstName} {aflosser.lastName}</h3>
                        </Link>
                        <p className="text-sm text-gray-600">{aflosser.position}</p>
                      </div>
                    </div>
                    <span className="text-lg">{getNationalityFlag(aflosser.nationality)}</span>
                  </div>

                  <div className="bg-red-50 p-3 rounded-lg mb-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        {aflosser.status === "ziek" ? "Ziek" : "Niet beschikbaar"}
                      </span>
                    </div>
                    {aflosser.unavailablePeriods && aflosser.unavailablePeriods.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-red-700">
                          Niet beschikbaar tot: {format(new Date(aflosser.unavailablePeriods[0].to), "dd-MM-yyyy")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/bemanning/${aflosser.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Bekijk profiel
                      </Button>
                    </Link>
                    <Button 
                      variant="outline"
                      onClick={() => setHistoryDialog({
                        isOpen: true,
                        aflosserId: aflosser.id,
                        aflosserName: `${aflosser.firstName} ${aflosser.lastName}`
                      })}
                      size="sm"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialog.isOpen} onOpenChange={(open) => setAssignmentDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Toewijzen aan schip - {assignmentDialog.aflosserName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ship">Schip</Label>
              <Select value={assignmentForm.shipId} onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, shipId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een schip" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(shipDatabase).map((ship: any) => (
                    <SelectItem key={ship.id} value={ship.id}>
                      {ship.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="from">Aan boord vanaf</Label>
              <Input
                type="date"
                value={assignmentForm.from}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="to">Aan boord tot <span className="text-xs text-gray-400">(optioneel)</span></Label>
              <Input
                type="date"
                value={assignmentForm.to}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, to: e.target.value }))}
                placeholder="Optioneel"
              />
            </div>
            <div>
              <Label htmlFor="reis">Reis</Label>
              <Input
                value={assignmentForm.reis}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, reis: e.target.value }))}
                placeholder="Bijv. Amsterdam - Speyer"
              />
            </div>
            <div>
              <Label htmlFor="note">Notitie (optioneel)</Label>
              <Input
                value={assignmentForm.note}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Extra informatie..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setAssignmentDialog({ isOpen: false, aflosserId: "", aflosserName: "" })}>
                Annuleren
              </Button>
              <Button onClick={handleAssign}>
                Toewijzen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completion Dialog */}
      <Dialog open={completionDialog.isOpen} onOpenChange={(open) => setCompletionDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voltooien - {completionDialog.aflosserName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="completionDate">Off-board datum</Label>
              <Input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCompletionDialog({ isOpen: false, aflosserId: "", aflosserName: "" })}>
                Annuleren
              </Button>
              <Button onClick={handleComplete}>
                Voltooien
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog.isOpen} onOpenChange={(open) => setHistoryDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>History - {historyDialog.aflosserName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const aflosser = crew[historyDialog.aflosserId]
              if (!aflosser) return <div>Geen aflosser gevonden</div>
              
              return (
                <div className="space-y-4">
                  {/* Assignment History - Alleen voltooide reizen */}
                  {aflosser.assignmentHistory && aflosser.assignmentHistory.filter((a: any) => a.action === "voltooid").length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Toewijzingen</h3>
                      <div className="space-y-2">
                        {aflosser.assignmentHistory
                          .filter((assignment: any) => assignment.action === "voltooid")
                          .map((assignment: any) => (
                            <Card key={assignment.id}>
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{(shipDatabase as any)[assignment.shipId]?.name || assignment.shipId}</p>
                                    {assignment.reis && (
                                      <p className="text-sm text-blue-700">Reis: {assignment.reis}</p>
                                    )}
                                  <p className="text-sm text-gray-600">
                                      {format(new Date(assignment.from), "dd-MM-yyyy")}
                                      {assignment.to ? ` t/m ${format(new Date(assignment.to), "dd-MM-yyyy")}` : ""}
                                  </p>
                                  {assignment.note && <p className="text-sm text-gray-500">{assignment.note}</p>}
                                  {assignment.completedDate && (
                                    <p className="text-sm text-green-600">
                                      Voltooid op: {format(new Date(assignment.completedDate), "dd-MM-yyyy")}
                                    </p>
                                  )}
                                </div>
                                  <Badge variant="secondary">Voltooid</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unavailable Periods */}
                  {aflosser.unavailablePeriods && aflosser.unavailablePeriods.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Niet beschikbare periodes</h3>
                      <div className="space-y-2">
                        {aflosser.unavailablePeriods.map((period: any, idx: number) => (
                          <Card key={idx}>
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm text-gray-600">
                                    {format(new Date(period.from), "dd-MM-yyyy")} t/m {format(new Date(period.to), "dd-MM-yyyy")}
                                  </p>
                                  {period.reason && <p className="text-sm text-gray-500">{period.reason}</p>}
                                </div>
                                <Badge variant="outline">Niet beschikbaar</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!aflosser.assignmentHistory || aflosser.assignmentHistory.length === 0) && 
                   (!aflosser.unavailablePeriods || aflosser.unavailablePeriods.length === 0) && (
                    <div className="text-center text-gray-500 py-4">
                      Geen history beschikbaar
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => setEditDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reis bewerken - {editDialog.aflosserName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editFrom">Geplande datum vanaf</Label>
              <Input
                type="date"
                value={editForm.from}
                onChange={(e) => setEditForm(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editTo">Geplande datum tot (optioneel)</Label>
              <Input
                type="date"
                value={editForm.to}
                onChange={(e) => setEditForm(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editReis">Reis</Label>
              <Input
                value={editForm.reis}
                onChange={(e) => setEditForm(prev => ({ ...prev, reis: e.target.value }))}
                placeholder="Bijv. Amsterdam - Speyer"
              />
            </div>
            <div>
              <Label htmlFor="editNote">Opmerking (optioneel)</Label>
              <Input
                value={editForm.note}
                onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Extra informatie"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditDialog({ isOpen: false, aflosserId: "", aflosserName: "", assignmentId: "" })}>
                Annuleren
              </Button>
              <Button onClick={handleEditAssignment}>
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unavailable Period Dialog */}
      <Dialog open={unavailableDialog.isOpen} onOpenChange={(open) => setUnavailableDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Niet beschikbare periode toevoegen - {unavailableDialog.aflosserName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="unavailableFrom">Vanaf</Label>
              <Input
                type="date"
                value={unavailableForm.from}
                onChange={(e) => setUnavailableForm(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="unavailableTo">Tot</Label>
              <Input
                type="date"
                value={unavailableForm.to}
                onChange={(e) => setUnavailableForm(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="unavailableReason">Reden</Label>
              <Input
                value={unavailableForm.reason}
                onChange={(e) => setUnavailableForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Bijv. vakantie, ziekte, etc."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setUnavailableDialog({ isOpen: false, aflosserId: "", aflosserName: "" })}>
                Annuleren
              </Button>
              <Button onClick={handleAddUnavailable}>
                Toevoegen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 