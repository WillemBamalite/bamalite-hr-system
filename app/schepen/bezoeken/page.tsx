"use client"

import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useShipVisits } from "@/hooks/use-ship-visits"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useMemo } from "react"
import { format, differenceInDays, parseISO } from "date-fns"
import { nl } from "date-fns/locale"
import { Ship, Calendar, AlertTriangle, Plus, Clock, Users, FileText, Trash2 } from "lucide-react"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export default function ShipVisitsPage() {
  return (
    <ProtectedRoute>
      <ShipVisitsContent />
    </ProtectedRoute>
  )
}

function ShipVisitsContent() {
  const { ships, crew, tasks, loading: dataLoading, addTask } = useSupabaseData()
  const { visits, loading: visitsLoading, addVisit, deleteVisit, getLastVisitByShip, getVisitsByShip, getShipsNotVisitedInDays } = useShipVisits()
  const { t } = useLanguage()
  const { toast } = useToast()
  const { user } = useAuth()
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedShip, setSelectedShip] = useState<string>("")
  const [selectedShipForDetail, setSelectedShipForDetail] = useState<string | null>(null)
  const [visitDate, setVisitDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [visitTime, setVisitTime] = useState<string>(format(new Date(), 'HH:mm'))
  const [visitedBy, setVisitedBy] = useState<'Leo' | 'Jos' | 'Willem' | 'Bart' | 'Nautic'>('Willem')
  const [selectedPloeg, setSelectedPloeg] = useState<'A' | 'B' | ''>('')
  const [notes, setNotes] = useState<string>("")
  const [followUpNeeded, setFollowUpNeeded] = useState(false)
  const [followUpNotes, setFollowUpNotes] = useState<string>("")

  const loading = dataLoading || visitsLoading

  // Check of er een open follow-up taak is voor een bepaald scheepsbezoek
  const hasOpenFollowUpTask = (visitId: string) => {
    if (!tasks) return false
    return tasks.some((t: any) => 
      t.related_ship_visit_id === visitId &&
      !t.completed &&
      (t.status === undefined || t.status !== 'completed')
    )
  }

  // Get ships that haven't been visited in 50+ days
  const shipsNotVisited50Days = useMemo(() => {
    if (!ships || ships.length === 0) return []
    return getShipsNotVisitedInDays(50, ships)
  }, [ships, visits, getShipsNotVisitedInDays])


  // Helper: Get A/B designation from crew member notes
  const getCrewABDesignation = (member: any): 'A' | 'B' | null => {
    if (!member.active_notes) return null
    const abNote = member.active_notes.find((n: any) => 
      n.content?.startsWith('CREW_AB_DESIGNATION:')
    )
    if (abNote) {
      const designation = abNote.content.replace('CREW_AB_DESIGNATION:', '').trim() as 'A' | 'B'
      return (designation === 'A' || designation === 'B') ? designation : null
    }
    return null
  }

  // Bepaal welke ploeg op een schip zit (op basis van bemanningsleden aan boord)
  const getPloegForShip = (shipId: string): 'A' | 'B' | null => {
    if (!crew || !shipId) return null
    
    const shipCrew = crew.filter((c: any) => 
      c.ship_id === shipId && 
      c.status === 'aan-boord' && 
      !c.is_dummy && 
      !c.is_aflosser
    )
    
    if (shipCrew.length === 0) return null
    
    // Bepaal ploeg op basis van de meeste bemanningsleden
    const ploegACount = shipCrew.filter((c: any) => getCrewABDesignation(c) === 'A').length
    const ploegBCount = shipCrew.filter((c: any) => getCrewABDesignation(c) === 'B').length
    
    if (ploegACount > ploegBCount) return 'A'
    if (ploegBCount > ploegACount) return 'B'
    
    // Als gelijk, kijk naar de eerste bemanningslid
    const firstDesignation = getCrewABDesignation(shipCrew[0])
    return firstDesignation
  }

  // Bepaal welke ploegen nog niet bezocht zijn of >50 dagen geleden bezocht zijn
  const getUnvisitedPloegen = (shipId: string): ('A' | 'B')[] => {
    const shipVisits = visits.filter(v => v.ship_id === shipId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const unvisited: ('A' | 'B')[] = []
    
    // Check Ploeg A
    const visitsA = shipVisits.filter(v => v.ploeg === 'A').sort((a, b) => 
      new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
    )
    const lastVisitA = visitsA[0]
    if (!lastVisitA) {
      unvisited.push('A')
    } else {
      const visitDateA = new Date(lastVisitA.visit_date)
      visitDateA.setHours(0, 0, 0, 0)
      const diffDaysA = Math.floor((today.getTime() - visitDateA.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDaysA >= 50) {
        unvisited.push('A')
      }
    }
    
    // Check Ploeg B
    const visitsB = shipVisits.filter(v => v.ploeg === 'B').sort((a, b) => 
      new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
    )
    const lastVisitB = visitsB[0]
    if (!lastVisitB) {
      unvisited.push('B')
    } else {
      const visitDateB = new Date(lastVisitB.visit_date)
      visitDateB.setHours(0, 0, 0, 0)
      const diffDaysB = Math.floor((today.getTime() - visitDateB.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDaysB >= 50) {
        unvisited.push('B')
      }
    }
    
    return unvisited
  }

  // Calculate days since last visit for each ship
  const getDaysSinceLastVisit = (shipId: string) => {
    const lastVisit = getLastVisitByShip(shipId)
    if (!lastVisit) return null
    
    const visitDate = parseISO(lastVisit.visit_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    visitDate.setHours(0, 0, 0, 0)
    
    return differenceInDays(today, visitDate)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedShip) {
      toast({
        title: "Fout",
        description: "Selecteer een schip",
        variant: "destructive"
      })
      return
    }

    if (!selectedPloeg) {
      toast({
        title: "Fout",
        description: "Selecteer een ploeg (A of B)",
        variant: "destructive"
      })
      return
    }

    const result = await addVisit({
      ship_id: selectedShip,
      visit_date: visitDate,
      visit_time: visitTime,
      visited_by: visitedBy,
      ploeg: selectedPloeg as 'A' | 'B',
      notes: notes || null,
      follow_up_needed: followUpNeeded,
      follow_up_notes: followUpNeeded ? followUpNotes : null
    })

    if (result.error) {
      toast({
        title: "Fout",
        description: result.error,
        variant: "destructive"
      })
      return
    }

    // If follow-up needed, create a task (altijd bij Nautic in de takenlijst)
    if (followUpNeeded && result.data) {
      const ship = ships?.find(s => s.id === selectedShip)
      const shipName = ship?.name || 'Onbekend schip'
      const visitId = result.data.id as string

      try {
        await addTask({
          title: `Follow-up scheepsbezoek: ${shipName}`,
          task_type: 'ship',
          related_ship_id: selectedShip,
          // Alle follow-up taken altijd naar Nautic
          assigned_to: 'Nautic',
          priority: 'normaal',
          created_date: new Date().toISOString().split('T')[0],
          description: [
            `Follow-up nodig na bezoek op ${format(parseISO(visitDate), 'dd-MM-yyyy', { locale: nl })}.`,
            ``,
            `Ploeg aan boord: Ploeg ${selectedPloeg}.`,
            ``,
            followUpNotes || 'Geen extra notities.'
          ].join('\n'),
          completed: false,
          created_by: user?.email || null,
          // Koppel taak aan dit specifieke scheepsbezoek
          related_ship_visit_id: visitId
        })
        
        toast({
          title: "Taak aangemaakt",
          description: "Een taak is automatisch aangemaakt voor de follow-up"
        })
      } catch (err) {
        console.error('Error creating task:', err)
        toast({
          title: "Waarschuwing",
          description: "Bezoek toegevoegd, maar taak kon niet worden aangemaakt",
          variant: "destructive"
        })
      }
    }

    toast({
      title: "Succes",
      description: "Scheepsbezoek toegevoegd"
    })

    // Reset form
    setSelectedShip("")
    setSelectedPloeg('')
    setNotes("")
    setFollowUpNeeded(false)
    setFollowUpNotes("")
    setDialogOpen(false)
  }

  // Handle delete visit
  const handleDeleteVisit = async (visitId: string) => {
    const result = await deleteVisit(visitId)
    
    if (result.error) {
      toast({
        title: "Fout",
        description: result.error,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Succes",
        description: "Scheepsbezoek verwijderd"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto py-8">
          <div className="text-center py-8 text-gray-500">Laden...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Ship className="w-8 h-8" />
              Scheepsbezoeken
            </h1>
            <p className="text-gray-600 mt-1">Overzicht van alle scheepsbezoeken</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nieuw Bezoek
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nieuw Scheepsbezoek Toevoegen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="ship">Schip *</Label>
                  <Select value={selectedShip} onValueChange={setSelectedShip}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer een schip" />
                    </SelectTrigger>
                    <SelectContent>
                      {ships?.map(ship => (
                        <SelectItem key={ship.id} value={ship.id}>
                          {ship.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Datum *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Tijd</Label>
                    <Input
                      id="time"
                      type="time"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="visitedBy">Bezocht door *</Label>
                  <Select value={visitedBy} onValueChange={(v: any) => setVisitedBy(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Willem">Willem</SelectItem>
                      <SelectItem value="Leo">Leo</SelectItem>
                      <SelectItem value="Jos">Jos</SelectItem>
                      <SelectItem value="Bart">Bart</SelectItem>
                      <SelectItem value="Nautic">Nautic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedShip && (
                  <div>
                    <Label htmlFor="ploeg">Ploeg aan boord *</Label>
                    <Select value={selectedPloeg} onValueChange={(v: 'A' | 'B' | '') => setSelectedPloeg(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer een ploeg" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Ploeg A</SelectItem>
                        <SelectItem value="B">Ploeg B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Bijzonderheden</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notities over het bezoek..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="followUp"
                      checked={followUpNeeded}
                      onCheckedChange={(checked) => setFollowUpNeeded(checked as boolean)}
                    />
                    <label
                      htmlFor="followUp"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Follow-up nodig (wordt automatisch een taak)
                    </label>
                  </div>
                  {followUpNeeded && (
                    <div>
                      <Label htmlFor="followUpNotes">Follow-up notities</Label>
                      <Textarea
                        id="followUpNotes"
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        placeholder="Beschrijf wat er moet gebeuren..."
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit">
                    Bezoek Toevoegen
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alert for ships not visited in 50+ days */}
        {shipsNotVisited50Days.length > 0 && (
          <Alert className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-base font-medium">
              ⚠️ Let op! De volgende schepen zijn langer dan 50 dagen niet bezocht:
              <ul className="list-disc list-inside mt-2">
                {shipsNotVisited50Days.map(ship => {
                  const unvisitedPloegen = getUnvisitedPloegen(ship.id)
                  
                  if (unvisitedPloegen.length === 2) {
                    // Check of beide nog nooit bezocht zijn of beide >50 dagen
                    const shipVisits = visits.filter(v => v.ship_id === ship.id)
                    const hasAnyVisit = shipVisits.length > 0
                    
                    if (!hasAnyVisit) {
                      return (
                        <li key={ship.id}>
                          <strong>{ship.name}</strong> (Ploeg A en Ploeg B nog nooit bezocht)
                        </li>
                      )
                    } else {
                      return (
                        <li key={ship.id}>
                          <strong>{ship.name}</strong> (Ploeg A en Ploeg B langer dan 50 dagen niet bezocht)
                        </li>
                      )
                    }
                  } else if (unvisitedPloegen.length === 1) {
                    // Check of deze ploeg nog nooit bezocht is
                    const shipVisits = visits.filter(v => v.ship_id === ship.id && v.ploeg === unvisitedPloegen[0])
                    const hasVisit = shipVisits.length > 0
                    
                    if (!hasVisit) {
                      return (
                        <li key={ship.id}>
                          <strong>{ship.name}</strong> (Ploeg {unvisitedPloegen[0]} nog nooit bezocht)
                        </li>
                      )
                    } else {
                      return (
                        <li key={ship.id}>
                          <strong>{ship.name}</strong> (Ploeg {unvisitedPloegen[0]} langer dan 50 dagen niet bezocht)
                        </li>
                      )
                    }
                  }
                  
                  // Fallback (zou niet moeten voorkomen)
                  return (
                    <li key={ship.id}>
                      <strong>{ship.name}</strong>
                    </li>
                  )
                })}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Ships overview with last visit */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {ships?.map(ship => {
            const lastVisit = getLastVisitByShip(ship.id)
            const daysSince = getDaysSinceLastVisit(ship.id)
            const isOverdue = daysSince !== null && daysSince >= 50
            const allShipVisits = getVisitsByShip(ship.id)
            
            return (
              <Card 
                key={ship.id} 
                className={`${isOverdue ? "border-orange-300 bg-orange-50" : ""} cursor-pointer hover:shadow-lg transition-shadow`}
                onClick={() => {
                  setSelectedShipForDetail(ship.id)
                  setDetailDialogOpen(true)
                }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{ship.name}</span>
                    {isOverdue && (
                      <Badge variant="destructive">⚠️ {daysSince} dagen</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lastVisit ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Laatste bezoek:</div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>
                            {format(parseISO(lastVisit.visit_date), 'dd-MM-yyyy', { locale: nl })}
                            {lastVisit.visit_time && ` om ${lastVisit.visit_time.substring(0, 5)}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span>Door: {lastVisit.visited_by}</span>
                      </div>
                      {lastVisit.ploeg && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Ploeg {lastVisit.ploeg}</span>
                        </div>
                      )}
                      {lastVisit.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Opmerkingen:</div>
                          <div className="text-sm text-gray-700 line-clamp-2">{lastVisit.notes}</div>
                        </div>
                      )}
                      {lastVisit.follow_up_needed && lastVisit.follow_up_notes && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                          <div className="text-xs text-yellow-700 mb-1">Follow-up:</div>
                          <div className="text-sm text-yellow-700 line-clamp-2">{lastVisit.follow_up_notes}</div>
                        </div>
                      )}
                      {hasOpenFollowUpTask(lastVisit.id) && (
                        <Badge variant="outline" className="bg-yellow-50">
                          Follow-up nodig
                        </Badge>
                      )}
                      {allShipVisits.length > 1 && (
                        <p className="text-xs text-gray-500 mt-2 italic">
                          {allShipVisits.length} bezoeken totaal - klik voor alle details
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nog geen bezoeken geregistreerd</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Detail Dialog voor alle bezoeken van een schip */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedShipForDetail && ships?.find(s => s.id === selectedShipForDetail)?.name} - Alle Bezoeken
              </DialogTitle>
            </DialogHeader>
            {selectedShipForDetail && (
              <div className="space-y-4 mt-4">
                {getVisitsByShip(selectedShipForDetail).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Geen bezoeken geregistreerd voor dit schip</p>
                ) : (
                  getVisitsByShip(selectedShipForDetail)
                    .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
                    .map(visit => (
                      <div key={visit.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="font-semibold">
                                  {format(parseISO(visit.visit_date), 'dd-MM-yyyy', { locale: nl })}
                                  {visit.visit_time && ` om ${visit.visit_time.substring(0, 5)}`}
                                </span>
                              </div>
                              {visit.ploeg && (
                                <Badge variant="outline">Ploeg {visit.ploeg}</Badge>
                              )}
                              {hasOpenFollowUpTask(visit.id) && (
                                <Badge variant="outline" className="bg-yellow-50">
                                  Follow-up nodig
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>Bezocht door: <strong>{visit.visited_by}</strong></span>
                              </div>
                            </div>
                            {visit.notes && (
                              <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                                <div className="text-sm font-semibold text-gray-700 mb-1">Opmerkingen:</div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">{visit.notes}</div>
                              </div>
                            )}
                            {visit.follow_up_needed && visit.follow_up_notes && (
                              <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                                <div className="text-sm font-semibold text-yellow-800 mb-1">Follow-up:</div>
                                <div className="text-sm text-yellow-700 whitespace-pre-wrap">{visit.follow_up_notes}</div>
                              </div>
                            )}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Bezoek verwijderen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Weet je zeker dat je dit bezoek aan <strong>{ships?.find(s => s.id === visit.ship_id)?.name || 'dit schip'}</strong> op {format(parseISO(visit.visit_date), 'dd-MM-yyyy', { locale: nl })} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteVisit(visit.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Verwijderen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* All visits list */}
        <Card>
          <CardHeader>
            <CardTitle>Alle Bezoeken</CardTitle>
          </CardHeader>
          <CardContent>
            {visits.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Geen bezoeken gevonden</p>
            ) : (
              <div className="space-y-4">
                {visits.map(visit => {
                  const ship = ships?.find(s => s.id === visit.ship_id)
                  
                  return (
                    <div key={visit.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{ship?.name || 'Onbekend schip'}</h3>
                            {hasOpenFollowUpTask(visit.id) && (
                              <Badge variant="outline" className="bg-yellow-50">
                                Follow-up nodig
                              </Badge>
                            )}
                            <div className="ml-auto">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Bezoek verwijderen?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Weet je zeker dat je dit bezoek aan <strong>{ship?.name || 'dit schip'}</strong> op {format(parseISO(visit.visit_date), 'dd-MM-yyyy', { locale: nl })} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteVisit(visit.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Verwijderen
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {format(parseISO(visit.visit_date), 'dd-MM-yyyy', { locale: nl })}
                                {visit.visit_time && ` ${visit.visit_time.substring(0, 5)}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>{visit.visited_by}</span>
                            </div>
                            {visit.ploeg && (
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span className="font-medium">Ploeg {visit.ploeg}</span>
                              </div>
                            )}
                          </div>
                          {visit.notes && (
                            <div className="mt-2 text-sm text-gray-700">
                              <strong>Notities:</strong> {visit.notes}
                            </div>
                          )}
                          {visit.follow_up_needed && visit.follow_up_notes && (
                            <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                              <strong>Follow-up:</strong> {visit.follow_up_notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

