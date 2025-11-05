"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Ship, Users, CheckCircle, Clock, UserX, Trash2, GraduationCap, MessageSquare, X, Plus, Search, AlertCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { calculateCurrentStatus } from "@/utils/regime-calculator"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useLanguage } from "@/contexts/LanguageContext"
import { supabase } from "@/lib/supabase"

// Helper functie om lokale datum + tijd te parsen (geen UTC conversie)
function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  const parts = dateStr.split(/[-/]/)
  let year: number, month: number, day: number
  
  if (parts[0].length === 4) {
    year = parseInt(parts[0])
    month = parseInt(parts[1]) - 1
    day = parseInt(parts[2])
  } else {
    day = parseInt(parts[0])
    month = parseInt(parts[1]) - 1
    year = parseInt(parts[2])
  }
  
  const [hours, minutes, seconds] = (timeStr || '00:00:00').split(':').map(Number)
  
  const date = new Date(year, month, day, hours || 0, minutes || 0, seconds || 0, 0)
  return date
}

// Sorteringsfunctie voor bemanningsleden op rang
const sortCrewByRank = (crew: any[]) => {
  const rankOrder = {
    'Kapitein': 1,
    '2e kapitein': 2,
    'Stuurman': 3,
    'Vol Matroos': 4,
    'Matroos': 5,
    'Lichtmatroos': 6,
    'Licht Matroos': 6,
    'Deksman': 7,
    'Aflosser': 8
  }
  
  return crew.sort((a, b) => {
    const rankA = rankOrder[a.position as keyof typeof rankOrder] || 999
    const rankB = rankOrder[b.position as keyof typeof rankOrder] || 999
    return rankA - rankB
  })
}

export function ShipOverview() {
  const { ships, crew, sickLeave, trips, tasks, loading, error, addNoteToCrew, removeNoteFromCrew, crewColorTags, setCrewColorTag } = useSupabaseData()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("")
  const [highlightTargetId, setHighlightTargetId] = useState<string | null>(null)
  
  // Notes functionality state
  const [notesDialog, setNotesDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [quickNoteDialog, setQuickNoteDialog] = useState<{
    isOpen: boolean;
    crewId: string;
    crewName: string;
  }>({
    isOpen: false,
    crewId: "",
    crewName: ""
  });
  const [quickNote, setQuickNote] = useState("");
  const [deleteNoteDialog, setDeleteNoteDialog] = useState<{
    isOpen: boolean;
    crewId: string;
    noteId: string;
    noteContent: string;
  }>({
    isOpen: false,
    crewId: "",
    noteId: "",
    noteContent: ""
  });

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schepen {t('overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">{t('loading')}...</div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schepen {t('overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">{t('loading')} data...</div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schepen {t('overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">Fout: {error}</div>
        </CardContent>
      </Card>
    );
  }

  const performSearch = () => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return
    // Try ship first
    const shipMatch = ships.find((s: any) => (s.name || "").toLowerCase().includes(q))
    if (shipMatch) {
      const elId = `ship-${shipMatch.id}`
      const el = typeof window !== 'undefined' ? document.getElementById(elId) : null
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setHighlightTargetId(elId)
        setTimeout(() => setHighlightTargetId(null), 2000)
      }
      return
    }
    // Then crew by full name
    const crewMatch = crew.find((m: any) => `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase().includes(q))
    if (crewMatch) {
      const elId = `crew-${crewMatch.id}`
      const el = typeof window !== 'undefined' ? document.getElementById(elId) : null
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightTargetId(elId)
        setTimeout(() => setHighlightTargetId(null), 2000)
      }
      return
    }
  }

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

  // Crew Card Component
  const CrewCard = ({ member, onDoubleClick, sickLeave, borderColor, tasks }: { member: any; onDoubleClick: (id: string, name: string) => void; sickLeave: any[]; borderColor?: string; tasks: any[] }) => {
    const [paletteOpen, setPaletteOpen] = useState(false)
    const COLOR_OPTIONS = [
      "#FEE2E2", // red-100
      "#FFEDD5", // orange-100
      "#FEF3C7", // amber-100
      "#E0E7FF", // indigo-100
      "#F3E8FF", // purple-100
    ]
    const getNextRotation = () => {
      // Als er een expected_start_date is, bereken dagen tot startdatum
      if (member.expected_start_date) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const startDate = new Date(member.expected_start_date)
        startDate.setHours(0, 0, 0, 0)
        const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilStart
      }
      
      if (!member.regime || member.regime === "Altijd") return null
      const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek", member.expected_start_date || null)
      return statusCalculation.daysUntilRotation
    }

    const nextRotation = getNextRotation()
    // isWaitingForStart = true alleen als expected_start_date in de toekomst is
    const isWaitingForStart = member.expected_start_date ? (() => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDate = new Date(member.expected_start_date)
      startDate.setHours(0, 0, 0, 0)
      return startDate > today
    })() : false

    // Haal ziekinformatie op
    const getSickInfo = () => {
      if (member.status !== "ziek") return null
      
      // Zoek naar actieve ziekmelding voor deze bemanningslid
      const sickLeaveRecord = sickLeave.find((sick: any) => 
        sick.crew_member_id === member.id && 
        (sick.status === "actief" || sick.status === "wacht-op-briefje")
      )
      
      return sickLeaveRecord
    }

    const sickInfo = getSickInfo()

    return (
      <div
        id={`crew-${member.id}`}
        className="p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative"
        style={{
          backgroundColor: crewColorTags[member.id] || undefined,
          boxShadow: crewColorTags[member.id] ? "inset 0 0 0 2px rgba(0,0,0,0.05)" : undefined,
          borderColor: highlightTargetId === `crew-${member.id}` ? "#f59e0b" : (borderColor || "#e5e7eb"),
          borderWidth: "2px",
          transition: 'border-color 0.2s ease'
        }}
        onDoubleClick={() => onDoubleClick(member.id, `${member.first_name} ${member.last_name}`)}
      >
        {/* Top-right controls: color button + optional student badge */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <button
            type="button"
            className="w-6 h-6 rounded border bg-white flex items-center justify-center shadow-sm"
            title="Kleur instellen"
            onClick={(e) => { e.stopPropagation(); setPaletteOpen((v) => !v) }}
          >
            <span
              className="inline-block w-4 h-4 rounded-sm border"
              style={{ backgroundColor: crewColorTags[member.id] || '#ffffff' }}
            />
          </button>
          {member.is_student && member.education_type && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              member.education_type === 'BOL' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {member.education_type}
            </span>
          )}
        </div>

        {paletteOpen && (
          <div className="absolute top-10 right-2 bg-white shadow-lg border rounded-md p-2 z-10">
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-5 h-5 rounded-full border"
                  style={{ backgroundColor: c }}
                  onClick={(e) => { e.stopPropagation(); setCrewColorTag(member.id, c); setPaletteOpen(false) }}
                  title="Kleur instellen"
                />
              ))}
              <button
                type="button"
                className="text-xs px-2 py-1 border rounded"
                onClick={(e) => { e.stopPropagation(); setCrewColorTag(member.id, null); setPaletteOpen(false) }}
              >
                Geen
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-start space-x-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
              {member.first_name[0]}{member.last_name[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            {/* Name and Nationality */}
            <div className="flex items-center space-x-2 mb-1">
              <Link 
                href={`/bemanning/${member.id}`}
                className="font-medium text-gray-900 hover:text-blue-600 truncate text-sm"
              >
                {member.first_name} {member.last_name}
              </Link>
              <span className="text-sm">{getNationalityFlag(member.nationality)}</span>
              {/* Afwezig badge voor aflossers */}
              {member.position === "Aflosser" && (() => {
                if (!member.notes || member.notes.length === 0) return null
                
                const absenceNotes = member.notes.filter((note: any) => {
                  const noteText = typeof note === 'string' ? note : note?.content || note?.text || ''
                  return noteText.includes('AFWEZIGHEID:')
                })
                
                if (absenceNotes.length === 0) return null
                
                try {
                  const lastNote = absenceNotes[absenceNotes.length - 1]
                  const noteText = typeof lastNote === 'string' ? lastNote : lastNote?.content || lastNote?.text || ''
                  const jsonMatch = noteText.match(/AFWEZIGHEID:\s*(.+)/)
                  if (jsonMatch) {
                    const absences = JSON.parse(jsonMatch[1])
                    if (!Array.isArray(absences) || absences.length === 0) return null
                    
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    
                    const isAbsent = absences.some((absence: any) => {
                      const fromDate = new Date(absence.fromDate)
                      fromDate.setHours(0, 0, 0, 0)
                      const toDate = new Date(absence.toDate)
                      toDate.setHours(0, 0, 0, 0)
                      return fromDate <= today && toDate >= today
                    })
                    
                    if (isAbsent) {
                      return (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          <UserX className="w-3 h-3 mr-1" />
                          Afwezig
                        </Badge>
                      )
                    }
                  }
                } catch (e) {
                  // Silent fail
                }
                
                return null
              })()}
              {(() => {
                const crewTasks = tasks.filter((t: any) => !t.completed && t.related_crew_id === member.id)
                if (crewTasks.length === 0) return null
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="focus:outline-none">
                        <AlertCircle className="w-6 h-6 text-red-600 animate-pulse cursor-pointer flex-shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="max-w-sm">
                      <div className="space-y-2">
                        <div className="font-semibold text-sm mb-2">Openstaande taken ({crewTasks.length}):</div>
                        {crewTasks.map((task: any) => (
                          <div key={task.id} className="border-l-2 border-orange-500 pl-2 text-xs mb-2">
                            <div className="font-medium">{task.title}</div>
                            {task.priority && (
                              <div className="text-gray-600">Prioriteit: {task.priority}</div>
                            )}
                            {task.assigned_to && (
                              <div className="text-gray-600">Toegewezen aan: {task.assigned_to}</div>
                            )}
                            {task.deadline && (
                              <div className="text-gray-600">Deadline: {format(new Date(task.deadline), "dd-MM-yyyy")}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )
              })()}
            </div>

            {/* Function */}
            <div className="text-xs text-gray-600 mb-1">
              {member.position}
            </div>

            {/* Diplomas (alleen voor niet-zieke bemanningsleden) */}
            {!sickInfo && member.diplomas && member.diplomas.length > 0 && (
              <div className="mb-1">
                <div className="flex flex-wrap gap-1">
                  {member.diplomas.map((diploma: string, index: number) => (
                    <span key={index} className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                      {diploma}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Regime en Next Rotation (alleen voor niet-zieke bemanningsleden en geen aflossers) */}
            {!sickInfo && member.position !== "Aflosser" && (
              <>
                <div className="text-xs text-gray-500 mb-1">
                  Regime: {member.regime || "Geen"}
                </div>

                {nextRotation !== null && (
                  <div className="text-xs text-blue-600 mb-1">
                    {isWaitingForStart ? (
                      <>
                        Aan boord op: {format(new Date(member.expected_start_date), 'dd-MM-yyyy')}
                      </>
                    ) : (
                      <>
                        {(() => {
                          if (!member.regime || member.regime === "Altijd") return ""
                          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek", member.expected_start_date || null)
                          if (!statusCalculation.nextRotationDate) return ""
                          const dateStr = format(new Date(statusCalculation.nextRotationDate), 'dd-MM-yyyy')
                          // Toon juiste tekst op basis van huidige status
                          if (statusCalculation.currentStatus === "aan-boord") {
                            return <>Naar huis op: {dateStr}</>
                          } else {
                            return <>Aan boord op: {dateStr}</>
                          }
                        })()}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Ziekinformatie voor zieke bemanningsleden */}
            {sickInfo && (
              <div className="mt-2 space-y-1 border-t pt-2">
                <div className="text-xs text-red-600 font-medium">Ziekinformatie:</div>
                <div className="text-xs text-gray-600">
                  Ziek vanaf: {format(new Date(sickInfo.start_date), 'dd-MM-yyyy')}
                </div>
                <div className="text-xs text-gray-600">
                  {sickInfo.certificate_valid_until ? (
                    <>Briefje tot: {format(new Date(sickInfo.certificate_valid_until), 'dd-MM-yyyy')}</>
                  ) : (
                    <>Geen briefje</>
                  )}
                </div>
                {sickInfo.notes && (
                  <div className="text-xs text-gray-600">
                    Reden: {sickInfo.notes}
                  </div>
                )}
                <div className="text-xs text-gray-600">
                  {sickInfo.salary_percentage}% betaald door {sickInfo.paid_by}
                </div>
              </div>
            )}

            {/* Aflosser informatie */}
            {member.position === "Aflosser" && (() => {
              // Helper function to check if aflosser is currently absent
              const isCurrentlyAbsent = () => {
                if (!member.notes || member.notes.length === 0) return null
                
                const absenceNotes = member.notes.filter((note: any) => {
                  const noteText = typeof note === 'string' ? note : note?.content || note?.text || ''
                  return noteText.includes('AFWEZIGHEID:')
                })
                
                if (absenceNotes.length === 0) return null
                
                try {
                  const lastNote = absenceNotes[absenceNotes.length - 1]
                  const noteText = typeof lastNote === 'string' ? lastNote : lastNote?.content || lastNote?.text || ''
                  const jsonMatch = noteText.match(/AFWEZIGHEID:\s*(.+)/)
                  if (jsonMatch) {
                    const absences = JSON.parse(jsonMatch[1])
                    if (!Array.isArray(absences) || absences.length === 0) return null
                    
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    
                    const currentAbsence = absences.find((absence: any) => {
                      const fromDate = new Date(absence.fromDate)
                      fromDate.setHours(0, 0, 0, 0)
                      const toDate = new Date(absence.toDate)
                      toDate.setHours(0, 0, 0, 0)
                      return fromDate <= today && toDate >= today
                    })
                    
                    return currentAbsence || null
                  }
                } catch (e) {
                  console.error('Error parsing absence notes:', e)
                }
                
                return null
              }
              
              const currentAbsence = isCurrentlyAbsent()
              
              // Get assignment history from localStorage
              let assignmentHistory: any[] = []
              if (typeof window !== 'undefined') {
                const assignmentHistoryKey = `assignment_history_${member.id}`
                assignmentHistory = JSON.parse(localStorage.getItem(assignmentHistoryKey) || '[]')
              }

              const currentAssignment = assignmentHistory
                ?.filter((entry: any) => entry.type === "assignment")
                ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

              return (
                <div className="mt-2 space-y-2 border-t pt-2">
                  {/* Afwezigheid informatie */}
                  {currentAbsence && (
                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                      <div className="text-xs text-orange-800 font-medium flex items-center gap-1 mb-1">
                        <UserX className="w-3 h-3" />
                        Momenteel afwezig
                      </div>
                      <div className="text-xs text-orange-700">
                        {format(new Date(currentAbsence.fromDate), 'dd-MM-yyyy')} - {format(new Date(currentAbsence.toDate), 'dd-MM-yyyy')}
                      </div>
                      {currentAbsence.reason && (
                        <div className="text-xs text-orange-600 mt-1">
                          Reden: {currentAbsence.reason}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Toewijzing informatie */}
                  {currentAssignment && (
                    <>
                      <div className="text-xs text-blue-600 font-medium">Aflosser Toewijzing:</div>
                      {currentAssignment.assignment_type === "trip" && currentAssignment.trip_from && currentAssignment.trip_to ? (
                        <>
                          <div className="text-xs text-gray-600">
                            Reis: {currentAssignment.trip_from} → {currentAssignment.trip_to}
                          </div>
                          <div className="text-xs text-gray-600">
                            Vanaf: {format(new Date(currentAssignment.start_date), 'dd-MM-yyyy')}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-gray-600">
                            Periode: {format(new Date(currentAssignment.start_date), 'dd-MM-yyyy')}
                            {currentAssignment.end_date && ` - ${format(new Date(currentAssignment.end_date), 'dd-MM-yyyy')}`}
                          </div>
                        </>
                      )}
                      {currentAssignment.notes && (
                        <div className="text-xs text-gray-600">
                          {currentAssignment.notes}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })()}

            {/* Active Notes */}
            {member.active_notes && member.active_notes.length > 0 && (
              <div className="mt-2 space-y-1 border-t pt-2">
                <div className="text-xs text-orange-600 font-medium flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Notities:
                </div>
                {member.active_notes.map((note: any) => (
                  <div key={note.id} className="text-xs text-gray-600 bg-orange-50 p-2 rounded border-l-2 border-orange-200 flex items-start justify-between gap-2">
                    <span className="flex-1">{note.content}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveNote(member.id, note.id, note.content);
                      }}
                      className="text-red-500 hover:text-red-700 flex-shrink-0"
                      title="Notitie verwijderen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  function getCrewDetails(crew: any) {
    const onBoard = crew.filter((member: any) => member.status === "aan-boord").length
    const atHome = crew.filter((member: any) => member.status === "thuis").length
    const sick = crew.filter((member: any) => member.status === "ziek").length
    const notAssigned = crew.filter((member: any) => member.status === "nog-in-te-delen").length

    return { onBoard, atHome, sick, notAssigned }
  }

  function SafeDate({ date }: { date: string }) {
    if (!date) return <span className="text-gray-400">Niet ingevuld</span>
    try {
      return <span>{format(new Date(date), 'dd-MM-yyyy')}</span>
    } catch {
      return <span className="text-gray-400">Ongeldige datum</span>
    }
  }

  function handleDoubleClick(crewId: string, crewName: string) {
    setQuickNoteDialog({
      isOpen: true,
      crewId,
      crewName
    });
    setQuickNote("");
  }

  async function handleSaveQuickNote() {
    if (!quickNote.trim()) return;

    try {
      await addNoteToCrew(quickNoteDialog.crewId, quickNote.trim());
      
      setQuickNoteDialog({
        isOpen: false,
        crewId: "",
        crewName: ""
      });
      setQuickNote("");
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Fout bij het opslaan van de notitie');
    }
  }

  function handleRemoveNote(crewId: string, noteId: string, noteContent: string) {
    setDeleteNoteDialog({
      isOpen: true,
      crewId,
      noteId,
      noteContent
    });
  }

  async function handleConfirmDeleteNote() {
    try {
      await removeNoteFromCrew(deleteNoteDialog.crewId, deleteNoteDialog.noteId);
      
      setDeleteNoteDialog({
        isOpen: false,
        crewId: "",
        noteId: "",
        noteContent: ""
      });
    } catch (error) {
      console.error('Error removing note:', error);
      alert('Fout bij het verwijderen van de notitie');
    }
  }

  async function handleDeleteShip(shipId: string, shipName: string) {
    if (confirm(`Weet je zeker dat je het schip "${shipName}" wilt verwijderen?`)) {
      try {
        // Delete ship from Supabase
        const { error } = await supabase
          .from('ships')
          .delete()
          .eq('id', shipId)

        if (error) {
          console.error('Error deleting ship:', error)
          alert(`Fout bij het verwijderen van het schip: ${error.message}`)
          return
        }

        // Success message
        alert(`Schip "${shipName}" is succesvol verwijderd.`)
        
        // Reload the data
        window.location.reload()
      } catch (err) {
        console.error('Error deleting ship:', err)
        alert('Er is een fout opgetreden bij het verwijderen van het schip.')
      }
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Ship className="w-5 h-5" />
              <span>Schepen Overzicht</span>
            </div>
          </CardTitle>
          <div className="flex items-center justify-center gap-2">
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') performSearch() }}
                placeholder="Zoek schip of bemanningslid..."
                className="pl-8 w-64"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
            </div>
            <Button size="sm" onClick={performSearch}>Zoek</Button>
          </div>
        </CardHeader>
        <CardContent>
          {ships.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Ship className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nog geen schepen toegevoegd</p>
            </div>
          ) : (
            <div className="space-y-8">
              {(() => {
                // Group ships by company
                const shipsByCompany = ships.reduce((acc: any, ship: any) => {
                  const company = ship.company || 'Overig'
                  if (!acc[company]) {
                    acc[company] = []
                  }
                  acc[company].push(ship)
                  return acc
                }, {})

                return Object.entries(shipsByCompany).map(([company, companyShips]: [string, any], index: number) => (
                  <div key={company} className={`space-y-4 company-section ${index > 0 ? 'print-new-page' : ''}`}>
                    {/* Company Header */}
                    <div className="border-b pb-3 text-center">
                      <h3 className="text-2xl font-bold text-gray-900">{company}</h3>
                      <p className="text-sm text-gray-600 mt-1">{companyShips.length} {companyShips.length === 1 ? 'schip' : 'schepen'}</p>
                    </div>

                    {/* Ships for this company */}
                    <div className="space-y-6">
                      {companyShips.map((ship: any) => {
                        const shipCrew = crew.filter((member: any) => {
                          // Verberg leden die uit dienst zijn
                          if (member.status === "uit-dienst") return false
                          // Verberg leden die nog niet gestart zijn
                          if (member.status === "nog-in-te-delen") return false
                          
                          // For aflossers, check if they have an active trip for this ship FIRST
                          if (member.position === "Aflosser") {
                            // Check for active trips for this aflosser and ship
                            const activeTrips = trips?.filter((trip: any) => {
                              if (trip.aflosser_id !== member.id || trip.status !== 'actief' || trip.ship_id !== ship.id) {
                                return false
                              }
                              
                              // Check if start date/time has been reached
                              if (!trip.start_datum || !trip.start_tijd) {
                                return false
                              }
                              
                              // Parse start date and time (lokaal, geen UTC)
                              const startDateTime = parseLocalDateTime(trip.start_datum, trip.start_tijd)
                              
                              const now = new Date()
                              
                              // Alleen tonen als start datum/tijd is aangebroken (vandaag of verleden)
                              return startDateTime <= now
                            }) || []
                            
                            // Als er een actieve reis is voor dit schip EN de start tijd is aangebroken, toon de aflosser
                            if (activeTrips.length > 0) {
                              return true
                            }
                            
                            // Als er geen actieve reis is, check of crew member is assigned to this ship
                            if (member.ship_id !== ship.id) {
                              return false
                            }
                            
                            // Als er geen actieve reis is, check de status
                            // Alleen tonen als status "aan-boord" is (niet "thuis")
                            if (member.status !== "aan-boord") {
                              return false
                            }
                            
                            return true
                          }
                          
                          // For non-aflossers: Only show crew members assigned to this ship
                          if (member.ship_id !== ship.id) return false
                          
                          return true
                        })
                        const crewDetails = getCrewDetails(shipCrew)

                        return (
                          <div key={ship.id} id={`ship-${ship.id}`} className="border rounded-lg p-6 bg-white shadow-sm" style={{
                            borderColor: highlightTargetId === `ship-${ship.id}` ? '#f59e0b' : '#e5e7eb',
                            borderWidth: '2px',
                            transition: 'border-color 0.2s ease'
                          }}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <Ship className="w-6 h-6 text-blue-600" />
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold">{ship.name}</h3>
                                  {(() => {
                                    const shipTasks = tasks.filter((t: any) => !t.completed && t.related_ship_id === ship.id)
                                    if (shipTasks.length === 0) return null
                                    return (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button type="button" className="focus:outline-none">
                                            <AlertCircle className="w-7 h-7 text-red-600 animate-pulse cursor-pointer" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent side="right" className="max-w-sm">
                                          <div className="space-y-2">
                                            <div className="font-semibold text-sm mb-2">Openstaande taken ({shipTasks.length}):</div>
                                            {shipTasks.map((task: any) => (
                                              <div key={task.id} className="border-l-2 border-orange-500 pl-2 text-xs mb-2">
                                                <div className="font-medium">{task.title}</div>
                                                {task.priority && (
                                                  <div className="text-gray-600">Prioriteit: {task.priority}</div>
                                                )}
                                                {task.assigned_to && (
                                                  <div className="text-gray-600">Toegewezen aan: {task.assigned_to}</div>
                                                )}
                                                {task.deadline && (
                                                  <div className="text-gray-600">Deadline: {format(new Date(task.deadline), "dd-MM-yyyy")}</div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    )
                                  })()}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteShip(ship.id, ship.name)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Crew List - Organized by Status */}
                            {shipCrew.length > 0 ? (
                              <div className="space-y-4 mt-6">
                                <h4 className="font-medium text-gray-700">Bemanning:</h4>
                                
                                {/* Status Columns - desktop is 3 cols; on mobile override via CSS to also show 3 */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 ship-status-grid">
                                  {/* Aan Boord Column */}
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <h5 className="font-medium text-green-700">Aan Boord</h5>
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        {shipCrew.filter((member: any) => {
                                          if (member.status === "ziek") return false
                                          // Als expected_start_date in de toekomst is, zijn ze nog thuis
                                          if (member.expected_start_date) {
                                            const startDate = new Date(member.expected_start_date)
                                            startDate.setHours(0, 0, 0, 0)
                                            const today = new Date()
                                            today.setHours(0, 0, 0, 0)
                                            if (startDate > today) return false // Nog niet aan boord
                                            // Anders (vandaag of verleden) gebruik berekende status
                                          }
                                          if (!member.regime) return member.status === "aan-boord"
                                          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, false, member.expected_start_date || null)
                                          return statusCalculation.currentStatus === "aan-boord"
                                        }).length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-3 min-h-[100px]">
                                      {sortCrewByRank(shipCrew.filter((member: any) => {
                                        if (member.status === "ziek") return false
                                        // Als expected_start_date in de toekomst is, zijn ze nog thuis (wachten)
                                        if (member.expected_start_date) {
                                          const startDate = new Date(member.expected_start_date)
                                          startDate.setHours(0, 0, 0, 0)
                                          const today = new Date()
                                          today.setHours(0, 0, 0, 0)
                                          // Als startdatum nog in de toekomst is, zijn ze nog thuis
                                          if (startDate > today) {
                                            return false // Nog niet aan boord
                                          }
                                          // Anders (vandaag of verleden) gebruik berekende status
                                        }
                                        if (!member.regime) return member.status === "aan-boord"
                                        const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek", member.expected_start_date || null)
                                        return statusCalculation.currentStatus === "aan-boord"
                                      })).map((member: any) => (
                                        <CrewCard
                                          key={member.id}
                                          member={member}
                                          onDoubleClick={handleDoubleClick}
                                          sickLeave={sickLeave}
                                          borderColor="#22c55e" /* Aan boord = groen */
                                          tasks={tasks}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  {/* Thuis Column */}
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                                      <Clock className="w-4 h-4 text-blue-600" />
                                      <h5 className="font-medium text-blue-700">Thuis</h5>
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                                        {shipCrew.filter((member: any) => {
                                          if (member.status === "ziek") return false
                                          // Als expected_start_date in de toekomst is, zijn ze nog thuis
                                          if (member.expected_start_date) {
                                            const startDate = new Date(member.expected_start_date)
                                            startDate.setHours(0, 0, 0, 0)
                                            const today = new Date()
                                            today.setHours(0, 0, 0, 0)
                                            if (startDate > today) return true // Nog thuis (wachten)
                                            // Anders (vandaag of verleden) gebruik berekende status
                                          }
                                          if (!member.regime) return member.status === "thuis"
                                          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, false, member.expected_start_date || null)
                                          return statusCalculation.currentStatus === "thuis"
                                        }).length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-3 min-h-[100px]">
                                      {sortCrewByRank(shipCrew.filter((member: any) => {
                                        if (member.status === "ziek") return false
                                        // Als expected_start_date in de toekomst is, zijn ze nog thuis
                                        if (member.expected_start_date) {
                                          const startDate = new Date(member.expected_start_date)
                                          startDate.setHours(0, 0, 0, 0)
                                          const today = new Date()
                                          today.setHours(0, 0, 0, 0)
                                          if (startDate > today) return true // Nog thuis (wachten)
                                          // Anders (vandaag of verleden) gebruik berekende status
                                        }
                                        if (!member.regime) return member.status === "thuis"
                                        const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek", member.expected_start_date || null)
                                        return statusCalculation.currentStatus === "thuis"
                                      })).map((member: any) => (
                                        <CrewCard
                                          key={member.id}
                                          member={member}
                                          onDoubleClick={handleDoubleClick}
                                          sickLeave={sickLeave}
                                          borderColor="#3b82f6" /* Thuis = blauw */
                                          tasks={tasks}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  {/* Ziek Column */}
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                                      <UserX className="w-4 h-4 text-red-600" />
                                      <h5 className="font-medium text-red-700">Ziek</h5>
                                      <Badge className="bg-red-100 text-red-800 text-xs">
                                        {shipCrew.filter((member: any) => member.status === "ziek").length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-3 min-h-[100px]">
                                      {sortCrewByRank(shipCrew.filter((member: any) => member.status === "ziek")).map((member: any) => (
                                        <CrewCard
                                          key={member.id}
                                          member={member}
                                          onDoubleClick={handleDoubleClick}
                                          sickLeave={sickLeave}
                                          borderColor="#ef4444" /* Ziek = rood */
                                          tasks={tasks}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p>Geen bemanning toegewezen</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Note Dialog */}
      <Dialog open={quickNoteDialog.isOpen} onOpenChange={(open) => setQuickNoteDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('quickNoteFor')} {quickNoteDialog.crewName}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder={t('quickNotePlaceholder')}
            rows={3}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setQuickNoteDialog(prev => ({ ...prev, isOpen: false }))}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveQuickNote}>
              {t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Note Dialog */}
      <Dialog open={deleteNoteDialog.isOpen} onOpenChange={(open) => setDeleteNoteDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteNote')}</DialogTitle>
          </DialogHeader>
          <p>{t('confirmDeleteNote')}</p>
          <p className="text-sm text-gray-600 italic">"{deleteNoteDialog.noteContent}"</p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeleteNoteDialog(prev => ({ ...prev, isOpen: false }))}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteNote}>
              {t('delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
