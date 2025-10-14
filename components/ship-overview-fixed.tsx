"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Ship, Users, CheckCircle, Clock, UserX, Trash2, GraduationCap } from "lucide-react"
import { calculateCurrentStatus } from "@/utils/regime-calculator"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useSupabaseData } from "@/hooks/use-supabase-data"

// Sorteringsfunctie voor bemanningsleden op rang
const sortCrewByRank = (crew: any[]) => {
  const rankOrder = {
    'Kapitein': 1,
    'Stuurman': 2,
    'Vol Matroos': 3,
    'Matroos': 4,
    'Licht Matroos': 5,
    'Deksman': 6,
    'Aflosser': 7
  }
  
  return crew.sort((a, b) => {
    const rankA = rankOrder[a.position as keyof typeof rankOrder] || 999
    const rankB = rankOrder[b.position as keyof typeof rankOrder] || 999
    return rankA - rankB
  })
}

export function ShipOverview() {
  const { ships, crew, sickLeave, loading, error } = useSupabaseData()
  const [mounted, setMounted] = useState(false);
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
          <CardTitle>Schepen Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Laden...</div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schepen Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Data laden...</div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schepen Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">Fout: {error}</div>
        </CardContent>
      </Card>
    );
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
  const CrewCard = ({ member, onDoubleClick, sickLeave }: { member: any; onDoubleClick: (id: string, name: string) => void; sickLeave: any[] }) => {
    const getNextRotation = () => {
      if (!member.regime || member.regime === "Altijd") return null
      const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek")
      return statusCalculation.daysUntilRotation
    }

    const nextRotation = getNextRotation()

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
        className="p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        onDoubleClick={() => onDoubleClick(member.id, `${member.first_name} ${member.last_name}`)}
      >
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
            </div>

            {/* Function */}
            <div className="text-xs text-gray-600 mb-1">
              {member.position}
            </div>

            {/* Regime en Next Rotation (alleen voor niet-zieke bemanningsleden en geen aflossers) */}
            {!sickInfo && member.position !== "Aflosser" && (
              <>
                <div className="text-xs text-gray-500 mb-1">
                  Regime: {member.regime || "Geen"}
                </div>

                {nextRotation !== null && (
                  <div className="text-xs text-blue-600 mb-1">
                    Volgende rotatie: {nextRotation} dagen (                    {(() => {
                      if (!member.regime || member.regime === "Altijd") return ""
                      const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek")
                      if (!statusCalculation.nextRotationDate) return ""
                      return format(new Date(statusCalculation.nextRotationDate), 'dd-MM-yyyy')
                    })()})
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
              // Get assignment history from localStorage
              let assignmentHistory: any[] = []
              if (typeof window !== 'undefined') {
                const assignmentHistoryKey = `assignment_history_${member.id}`
                assignmentHistory = JSON.parse(localStorage.getItem(assignmentHistoryKey) || '[]')
              }

              const currentAssignment = assignmentHistory
                ?.filter((entry: any) => entry.type === "assignment")
                ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

              if (currentAssignment) {
                return (
                  <div className="mt-2 space-y-1 border-t pt-2">
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
                  </div>
                )
              }
              return null
            })()}

            {/* Diplomas (alleen voor niet-zieke bemanningsleden) */}
            {!sickInfo && member.diplomas && member.diplomas.length > 0 && (
              <div className="mt-1">
                <div className="flex flex-wrap gap-1">
                  {member.diplomas.map((diploma: string, index: number) => (
                    <span key={index} className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                      {diploma}
                    </span>
                  ))}
                </div>
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
      return <span>{new Date(date).toLocaleDateString('nl-NL')}</span>
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

  function handleSaveQuickNote() {
    if (!quickNote.trim()) return;

    // Hier zou je de Supabase update functie moeten aanroepen
    // Voor nu, we reloaden de data
    window.location.reload();

    setQuickNoteDialog({
      isOpen: false,
      crewId: "",
      crewName: ""
    });
    setQuickNote("");
  }

  function handleRemoveNote(crewId: string, noteId: string, noteContent: string) {
    setDeleteNoteDialog({
      isOpen: true,
      crewId,
      noteId,
      noteContent
    });
  }

  function handleConfirmDeleteNote() {
    // Hier zou je de Supabase delete functie moeten aanroepen
    // Voor nu, we reloaden de data
    window.location.reload();

    setDeleteNoteDialog({
      isOpen: false,
      crewId: "",
      noteId: "",
      noteContent: ""
    });
  }

  function handleDeleteShip(shipId: string, shipName: string) {
    if (confirm(`Weet je zeker dat je het schip "${shipName}" wilt verwijderen?`)) {
      // Hier zou je de Supabase delete functie moeten aanroepen
      // Voor nu, we reloaden de data
      window.location.reload();
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Ship className="w-5 h-5" />
              <span>Schepen Overzicht</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ships.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Ship className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nog geen schepen toegevoegd</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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

                return Object.entries(shipsByCompany).map(([company, companyShips]: [string, any]) => (
                  <div key={company} className="space-y-4">
                    {/* Company Header */}
                    <div className="border-b pb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{company}</h3>
                      <p className="text-sm text-gray-600">{companyShips.length} schip{companyShips.length !== 1 ? 'pen' : ''}</p>
                    </div>

                    {/* Ships for this company */}
                    <div className="space-y-4">
                      {companyShips.map((ship: any) => {
                        const shipCrew = crew.filter((member: any) => {
                          // Verberg leden die uit dienst zijn
                          if (member.status === "uit-dienst") return false
                          // Only show crew members assigned to this ship
                          if (member.ship_id !== ship.id) return false
                          
                          // For aflossers, check if they have an active assignment
                          if (member.position === "Aflosser") {
                            // Simple check: if aflosser status is "thuis", don't show in ship overview
                            if (member.status === "thuis") {
                              console.log(`Filtering out ${member.first_name} ${member.last_name} - status is thuis`)
                              return false
                            }
                            
                            // Additional check: look for completed trips
                            if (typeof window !== 'undefined') {
                              const plannedTrips = JSON.parse(localStorage.getItem('plannedTrips') || '[]')
                              const completedTrips = plannedTrips.filter((trip: any) => 
                                trip.ship_id === ship.id && 
                                trip.aflosser_id === member.id &&
                                trip.status === 'voltooid'
                              )
                              
                              if (completedTrips.length > 0) {
                                console.log(`Filtering out ${member.first_name} ${member.last_name} - has completed trips`)
                                return false
                              }
                            }
                          }
                          
                          return true
                        })
                        const crewDetails = getCrewDetails(shipCrew)

                        return (
                          <div key={ship.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <Ship className="w-6 h-6 text-blue-600" />
                                <div>
                                  <h3 className="text-lg font-semibold">{ship.name}</h3>
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
                              <div className="space-y-4">
                                <h4 className="font-medium text-gray-700">Bemanning:</h4>
                                
                                {/* Status Columns */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                  {/* Aan Boord Column */}
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 mb-3">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <h5 className="font-medium text-green-700">Aan Boord</h5>
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        {shipCrew.filter((member: any) => {
                                          if (member.status === "ziek") return false
                                          if (!member.regime) return member.status === "aan-boord"
                                          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null)
                                          return statusCalculation.currentStatus === "aan-boord"
                                        }).length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-2">
                                      {sortCrewByRank(shipCrew.filter((member: any) => {
                                        if (member.status === "ziek") return false
                                        if (!member.regime) return member.status === "aan-boord"
                                        const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek")
                                        return statusCalculation.currentStatus === "aan-boord"
                                      })).map((member: any) => (
                                        <CrewCard key={member.id} member={member} onDoubleClick={handleDoubleClick} sickLeave={sickLeave} />
                                      ))}
                                    </div>
                                  </div>

                                  {/* Thuis Column */}
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 mb-3">
                                      <Clock className="w-4 h-4 text-blue-600" />
                                      <h5 className="font-medium text-blue-700">Thuis</h5>
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                                        {shipCrew.filter((member: any) => {
                                          if (member.status === "ziek") return false
                                          if (!member.regime) return member.status === "thuis"
                                          const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null)
                                          return statusCalculation.currentStatus === "thuis"
                                        }).length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-2">
                                      {sortCrewByRank(shipCrew.filter((member: any) => {
                                        if (member.status === "ziek") return false
                                        if (!member.regime) return member.status === "thuis"
                                        const statusCalculation = calculateCurrentStatus(member.regime as "1/1" | "2/2" | "3/3" | "Altijd", member.thuis_sinds || null, member.on_board_since || null, member.status === "ziek")
                                        return statusCalculation.currentStatus === "thuis"
                                      })).map((member: any) => (
                                        <CrewCard key={member.id} member={member} onDoubleClick={handleDoubleClick} sickLeave={sickLeave} />
                                      ))}
                                    </div>
                                  </div>

                                  {/* Ziek Column */}
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 mb-3">
                                      <UserX className="w-4 h-4 text-red-600" />
                                      <h5 className="font-medium text-red-700">Ziek</h5>
                                      <Badge className="bg-red-100 text-red-800 text-xs">
                                        {shipCrew.filter((member: any) => member.status === "ziek").length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-2">
                                      {sortCrewByRank(shipCrew.filter((member: any) => member.status === "ziek")).map((member: any) => (
                                        <CrewCard key={member.id} member={member} onDoubleClick={handleDoubleClick} sickLeave={sickLeave} />
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
            <DialogTitle>Snelle notitie voor {quickNoteDialog.crewName}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder="Voeg een snelle notitie toe..."
            rows={3}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setQuickNoteDialog(prev => ({ ...prev, isOpen: false }))}>
              Annuleren
            </Button>
            <Button onClick={handleSaveQuickNote}>
              Opslaan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Note Dialog */}
      <Dialog open={deleteNoteDialog.isOpen} onOpenChange={(open) => setDeleteNoteDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notitie verwijderen</DialogTitle>
          </DialogHeader>
          <p>Weet je zeker dat je deze notitie wilt verwijderen?</p>
          <p className="text-sm text-gray-600 italic">"{deleteNoteDialog.noteContent}"</p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeleteNoteDialog(prev => ({ ...prev, isOpen: false }))}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteNote}>
              Verwijderen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

