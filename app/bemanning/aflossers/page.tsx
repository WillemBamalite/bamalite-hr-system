"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserPlus, Edit, Phone, Mail, MapPin, Ship, Calendar, Clock, AlertTriangle, CheckCircle, X, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { useCrewData } from "@/hooks/use-crew-data"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { shipDatabase } from "@/data/crew-database"

interface AflosserAssignment {
  id: string;
  aflosserId: string;
  shipId: string;
  fromDate: string;
  toDate: string | null;
  status: "active" | "completed";
  hasFixedEndDate: boolean;
  completedAt: string | null;
  createdAt: string;
}

interface AflosserUnavailable {
  id: string;
  aflosserId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  createdAt: string;
}

// Helper functions
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

const getStatusColor = (status: string) => {
  switch (status) {
    case "aan-boord":
      return "bg-green-100 text-green-800"
    case "thuis":
      return "bg-blue-100 text-blue-800"
    case "ziek":
      return "bg-red-100 text-red-800"
    case "uit-dienst":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case "aan-boord":
      return "Aan boord"
    case "thuis":
      return "Thuis"
    case "ziek":
      return "Ziek"
    case "uit-dienst":
      return "Uit dienst"
    default:
      return status
  }
}

export default function AflossersOverzicht() {
  const { crewDatabase: allCrewData, stats, updateData } = useCrewData()
  const [selectedAflosser, setSelectedAflosser] = useState<any>(null)
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    shipId: "",
    fromDate: "",
    toDate: "",
    hasFixedEndDate: false
  })
  const [newUnavailable, setNewUnavailable] = useState({
    fromDate: "",
    toDate: "",
    reason: ""
  })

  // Filter aflossers (relief crew)
  const aflossers = Object.values(allCrewData).filter((member: any) => 
    member.position?.toLowerCase().includes("aflos") || 
    member.position?.toLowerCase().includes("relief")
  )

  // Haal assignments en unavailable periods uit database
  const assignments: AflosserAssignment[] = []
  const unavailablePeriods: AflosserUnavailable[] = []
  
  Object.values(allCrewData).forEach((crew: any) => {
    if (crew.aflosserAssignments) {
      assignments.push(...crew.aflosserAssignments)
    }
    if (crew.aflosserUnavailablePeriods) {
      unavailablePeriods.push(...crew.aflosserUnavailablePeriods)
    }
  })

  // Bepaal status van elke aflosser
  const aflossersWithStatus = aflossers.map((aflosser: any) => {
    const today = new Date()
    const activeAssignment = assignments.find(a => 
      a.aflosserId === aflosser.id && 
      a.status === "active" &&
      new Date(a.fromDate) <= today &&
      (!a.toDate || new Date(a.toDate) >= today)
    )
    
    const activeUnavailable = unavailablePeriods.find(u => 
      u.aflosserId === aflosser.id &&
      new Date(u.fromDate) <= today &&
      new Date(u.toDate) >= today
    )

    let status = aflosser.status
    let statusColor = getStatusColor(aflosser.status)
    let statusText = getStatusText(aflosser.status)

    if (activeAssignment) {
      status = "toegewezen"
      statusColor = "bg-purple-100 text-purple-800"
      statusText = "Toegewezen"
    } else if (activeUnavailable) {
      status = "afwezig"
      statusColor = "bg-orange-100 text-orange-800"
      statusText = "Afwezig"
    }

    return {
      ...aflosser,
      status,
      statusColor,
      statusText,
      activeAssignment,
      activeUnavailable
    }
  })

  const handleAssignToShip = (aflosser: any) => {
    setSelectedAflosser(aflosser)
    setShowAssignmentDialog(true)
  }

  const handleSetUnavailable = (aflosser: any) => {
    setSelectedAflosser(aflosser)
    setShowUnavailableDialog(true)
  }

  const handleShowHistory = (aflosser: any) => {
    setSelectedAflosser(aflosser)
    setShowHistoryDialog(true)
  }

  const handleCreateAssignment = () => {
    if (!selectedAflosser || !newAssignment.shipId || !newAssignment.fromDate) {
      alert("Vul alle verplichte velden in")
      return
    }

    const assignment: AflosserAssignment = {
      id: `assignment-${Date.now()}`,
      aflosserId: selectedAflosser.id,
      shipId: newAssignment.shipId,
      fromDate: newAssignment.fromDate,
      toDate: newAssignment.hasFixedEndDate ? newAssignment.toDate : null,
      status: "active",
      hasFixedEndDate: newAssignment.hasFixedEndDate,
      completedAt: null,
      createdAt: new Date().toISOString()
    }

    // Update aflosser met nieuwe assignment
    const updatedAflosser = {
      ...selectedAflosser,
      aflosserAssignments: [
        ...(selectedAflosser.aflosserAssignments || []),
        assignment
      ]
    }

    updateData('crewDatabase', {
      [selectedAflosser.id]: updatedAflosser
    })

    setShowAssignmentDialog(false)
    setNewAssignment({ shipId: "", fromDate: "", toDate: "", hasFixedEndDate: false })
    setSelectedAflosser(null)
  }

  const handleCreateUnavailable = () => {
    if (!selectedAflosser || !newUnavailable.fromDate || !newUnavailable.toDate || !newUnavailable.reason) {
      alert("Vul alle verplichte velden in")
      return
    }

    const unavailable: AflosserUnavailable = {
      id: `unavailable-${Date.now()}`,
      aflosserId: selectedAflosser.id,
      fromDate: newUnavailable.fromDate,
      toDate: newUnavailable.toDate,
      reason: newUnavailable.reason,
      createdAt: new Date().toISOString()
    }

    // Update aflosser met nieuwe unavailable period
    const updatedAflosser = {
      ...selectedAflosser,
      aflosserUnavailablePeriods: [
        ...(selectedAflosser.aflosserUnavailablePeriods || []),
        unavailable
      ]
    }

    updateData('crewDatabase', {
      [selectedAflosser.id]: updatedAflosser
    })

    setShowUnavailableDialog(false)
    setNewUnavailable({ fromDate: "", toDate: "", reason: "" })
    setSelectedAflosser(null)
  }

  const getAflosserHistory = (aflosserId: string) => {
    return assignments.filter(a => a.aflosserId === aflosserId)
  }

  const getAflosserUnavailableHistory = (aflosserId: string) => {
    return unavailablePeriods.filter(u => u.aflosserId === aflosserId)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-NL")
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aflossers Overzicht</h1>
          <p className="text-gray-600 mt-1">Relief crew management en overzicht</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/bemanning/aflossers/nieuw">
            <Button className="bg-green-600 hover:bg-green-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Nieuwe Aflosser
            </Button>
          </Link>
          <Link href="/bemanning/aflossers/toewijzen">
            <Button variant="outline" className="bg-purple-600 hover:bg-purple-700 text-white">
              <Ship className="w-4 h-4 mr-2" />
              Toewijzen
            </Button>
          </Link>
          <Link href="/bemanning" className="text-blue-600 hover:text-blue-800">
            ← Terug naar bemanning
          </Link>
        </div>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Totaal Aflossers</p>
                <p className="text-2xl font-bold text-green-600">{stats.aflossers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Beschikbaar</p>
                <p className="text-2xl font-bold text-green-600">
                  {aflossersWithStatus.filter((a: any) => a.status === "thuis").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Toegewezen</p>
                <p className="text-2xl font-bold text-purple-600">
                  {aflossersWithStatus.filter((a: any) => a.status === "toegewezen").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Afwezig</p>
                <p className="text-2xl font-bold text-orange-600">
                  {aflossersWithStatus.filter((a: any) => a.status === "afwezig").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Ziek</p>
                <p className="text-2xl font-bold text-red-600">
                  {aflossersWithStatus.filter((a: any) => a.status === "ziek").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aflossers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aflossersWithStatus.map((aflosser: any) => (
          <Card key={aflosser.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {aflosser.firstName[0]}{aflosser.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <Link 
                        href={`/bemanning/${aflosser.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-700"
                      >
                        {aflosser.firstName} {aflosser.lastName}
                      </Link>
                      <span className="text-lg">{getNationalityFlag(aflosser.nationality)}</span>
                    </div>
                    <p className="text-sm text-gray-500">{aflosser.position}</p>
                  </div>
                </div>
                <Badge className={aflosser.statusColor}>
                  {aflosser.statusText}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Contact informatie */}
              {aflosser.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{aflosser.phone}</span>
                </div>
              )}
              {aflosser.email && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{aflosser.email}</span>
                </div>
              )}
              {aflosser.address && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {aflosser.address.street && `${aflosser.address.street}, `}
                    {aflosser.address.city && `${aflosser.address.city} `}
                    {aflosser.address.postalCode && `${aflosser.address.postalCode}`}
                    {aflosser.address.country && `, ${aflosser.address.country}`}
                  </span>
                </div>
              )}
              
              {/* Actieve toewijzing of afwezigheid */}
              {aflosser.activeAssignment && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-2 text-sm text-purple-600">
                    <Ship className="w-4 h-4" />
                    <span>Toegewezen aan: {(shipDatabase as any)[aflosser.activeAssignment.shipId]?.name || aflosser.activeAssignment.shipId}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Van: {formatDate(aflosser.activeAssignment.fromDate)}
                    {aflosser.activeAssignment.toDate && ` - Tot: ${formatDate(aflosser.activeAssignment.toDate)}`}
                  </div>
                </div>
              )}
              
              {aflosser.activeUnavailable && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-2 text-sm text-orange-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Afwezig: {aflosser.activeUnavailable.reason}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Van: {formatDate(aflosser.activeUnavailable.fromDate)} - Tot: {formatDate(aflosser.activeUnavailable.toDate)}
                  </div>
                </div>
              )}

              {/* Acties */}
              <div className="flex items-center space-x-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleAssignToShip(aflosser)}
                  className="flex-1"
                >
                  <Ship className="w-4 h-4 mr-1" />
                  Toewijzen
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSetUnavailable(aflosser)}
                  className="flex-1"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Afwezig
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleShowHistory(aflosser)}
                >
                  <Clock className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lege staat */}
      {aflossersWithStatus.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen aflossers gevonden</h3>
          <p className="text-gray-500 mb-6">Voeg je eerste aflosser toe om te beginnen</p>
          <Link href="/bemanning/aflossers/nieuw">
            <Button className="bg-green-600 hover:bg-green-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Nieuwe Aflosser Toevoegen
            </Button>
          </Link>
        </div>
      )}

      {/* Toewijzen Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Toewijzen aan schip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ship">Schip</Label>
              <Select value={newAssignment.shipId} onValueChange={(value) => setNewAssignment({...newAssignment, shipId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer schip" />
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
              <Label htmlFor="fromDate">Van datum</Label>
              <Input 
                type="date" 
                value={newAssignment.fromDate}
                onChange={(e) => setNewAssignment({...newAssignment, fromDate: e.target.value})}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="hasFixedEndDate"
                checked={newAssignment.hasFixedEndDate}
                onChange={(e) => setNewAssignment({...newAssignment, hasFixedEndDate: e.target.checked})}
              />
              <Label htmlFor="hasFixedEndDate">Vaste einddatum</Label>
            </div>
            {newAssignment.hasFixedEndDate && (
              <div>
                <Label htmlFor="toDate">Tot datum</Label>
                <Input 
                  type="date" 
                  value={newAssignment.toDate}
                  onChange={(e) => setNewAssignment({...newAssignment, toDate: e.target.value})}
                />
              </div>
            )}
            <div className="flex space-x-2">
              <Button onClick={handleCreateAssignment} className="flex-1">
                Toewijzen
              </Button>
              <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Afwezigheid Dialog */}
      <Dialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Afwezigheid instellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="unavailableFromDate">Van datum</Label>
              <Input 
                type="date" 
                value={newUnavailable.fromDate}
                onChange={(e) => setNewUnavailable({...newUnavailable, fromDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="unavailableToDate">Tot datum</Label>
              <Input 
                type="date" 
                value={newUnavailable.toDate}
                onChange={(e) => setNewUnavailable({...newUnavailable, toDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reden</Label>
              <Textarea 
                value={newUnavailable.reason}
                onChange={(e) => setNewUnavailable({...newUnavailable, reason: e.target.value})}
                placeholder="Bijv. vakantie, ziekte, persoonlijke redenen..."
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleCreateUnavailable} className="flex-1">
                Instellen
              </Button>
              <Button variant="outline" onClick={() => setShowUnavailableDialog(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Geschiedenis Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Geschiedenis - {selectedAflosser?.firstName} {selectedAflosser?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Toewijzingen</h4>
              {getAflosserHistory(selectedAflosser?.id).length > 0 ? (
                <div className="space-y-2">
                  {getAflosserHistory(selectedAflosser?.id).map((assignment) => (
                    <div key={assignment.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{(shipDatabase as any)[assignment.shipId]?.name || assignment.shipId}</div>
                          <div className="text-sm text-gray-600">
                            {formatDate(assignment.fromDate)} - {assignment.toDate ? formatDate(assignment.toDate) : 'Ongedefinieerd'}
                          </div>
                        </div>
                        <Badge className={assignment.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {assignment.status === "active" ? "Actief" : "Voltooid"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Geen toewijzingen gevonden</p>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Afwezigheid periodes</h4>
              {getAflosserUnavailableHistory(selectedAflosser?.id).length > 0 ? (
                <div className="space-y-2">
                  {getAflosserUnavailableHistory(selectedAflosser?.id).map((unavailable) => (
                    <div key={unavailable.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{unavailable.reason}</div>
                      <div className="text-sm text-gray-600">
                        {formatDate(unavailable.fromDate)} - {formatDate(unavailable.toDate)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Geen afwezigheid periodes gevonden</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 