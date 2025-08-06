"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserPlus, Edit, Phone, Mail, MapPin, Ship, Calendar, Clock, AlertTriangle, CheckCircle, X, Plus, Trash2, AlertCircle, UserX } from "lucide-react"
import Link from "next/link"
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav"
import { useLocalStorageData } from "@/hooks/use-localStorage-data"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { crewDatabase } from "@/data/crew-database"
import { getCombinedShipDatabase } from "@/utils/ship-utils"

interface AflosserAssignment {
  id: string;
  aflosserId: string;
  shipId: string;
  fromDate: string;
  toDate: string | null;
  route: string;
  status: "active" | "completed" | "cancelled";
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

// Helper functie om te checken of aflosser momenteel afwezig is
function isCurrentlyAbsent(aflosser: any) {
  const today = new Date();
  const absences = aflosser.aflosserAbsences || [];
  return absences.some((absence: any) => 
    new Date(absence.fromDate) <= today && new Date(absence.toDate) >= today
  );
}

// Helper functie om te checken of aflosser binnenkort afwezig is (binnen week)
function isSoonAbsent(aflosser: any) {
  const today = new Date();
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const absences = aflosser.aflosserAbsences || [];
  return absences.some((absence: any) => 
    new Date(absence.fromDate) > today && new Date(absence.fromDate) <= weekFromNow
  );
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
  const { crewDatabase: allCrewData, stats, updateData, forceRefresh, resetLocalStorage } = useLocalStorageData()
  
  // Force refresh bij component mount en wanneer de pagina focus krijgt
  useEffect(() => {
    forceRefresh();
    
    // Force refresh van dashboard
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('forceRefresh'));
      }
    }, 1000)
  }, []);

  // State voor het forceren van re-renders
  const [refreshKey, setRefreshKey] = useState(0);

  // Luister naar localStorage updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };

    const handleForceRefresh = () => {
      setRefreshKey(prev => prev + 1);
    };

    // Ook luisteren naar storage events van andere tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'crewDatabase') {
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('localStorageUpdate', handleStorageUpdate);
    window.addEventListener('forceRefresh', handleForceRefresh);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('localStorageUpdate', handleStorageUpdate);
      window.removeEventListener('forceRefresh', handleForceRefresh);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [selectedAflosser, setSelectedAflosser] = useState<any>(null)
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [completionDate, setCompletionDate] = useState("")
  const [editData, setEditData] = useState({
    phone: "",
    diplomas: "",
    notes: ""
  })
  
  const [newAssignment, setNewAssignment] = useState({
    shipId: "",
    fromDate: "",
    toDate: "",
    route: "",
    hasFixedEndDate: false
  })
  const [newUnavailable, setNewUnavailable] = useState({
    fromDate: "",
    toDate: "",
    reason: ""
  })

  // Haal alleen aflossers op uit de hook data EN localStorage
  const getAflossers = () => {
    // Filter alleen echte aflossers uit de hook data (exclude deleted)
    const hookAflossers = Object.values(allCrewData).filter((crew: any) => 
      !crew.deleted && (
        crew.isAflosser === true || 
        crew.position === "Aflosser" ||
        crew.function === "Aflosser"
      )
    );
    
    // Ook check localStorage voor extra aflossers (exclude deleted)
    let localStorageAflossers: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const storedData = JSON.parse(localStorage.getItem('crewDatabase') || '{}');
        localStorageAflossers = Object.values(storedData).filter((crew: any) => 
          !crew.deleted && (
            crew.isAflosser === true || 
            crew.position === "Aflosser" ||
            crew.function === "Aflosser"
          )
        );
      } catch (e) {
        console.error('Error reading localStorage:', e);
      }
    }
    
    // Combineer beide bronnen en verwijder duplicaten
    const allAflossers = [...hookAflossers, ...localStorageAflossers];
    const uniqueAflossers = allAflossers.filter((aflosser, index, self) => 
      index === self.findIndex(a => a.id === aflosser.id)
    );
    
    return uniqueAflossers;
  };
  
  const aflossers = getAflossers();
  




  // Haal assignments en unavailable periods uit database
  const assignments: AflosserAssignment[] = []
  const unavailablePeriods: AflosserUnavailable[] = []
  
  Object.values(allCrewData).forEach((crew: any) => {
    if (crew.aflosserAssignments) {
      assignments.push(...crew.aflosserAssignments)
    }
    if (crew.aflosserAbsences) {
      unavailablePeriods.push(...crew.aflosserAbsences)
    }
  })

  // Bepaal status van elke aflosser
  const aflossersWithStatus = aflossers.map((aflosser: any) => {
    const today = new Date()
    
    // Check voor actieve toewijzingen in de aflosser zelf
    const activeAssignment = aflosser.aflosserAssignments?.find((a: any) => 
      a.status === "active" &&
      new Date(a.fromDate) <= today &&
      (!a.toDate || new Date(a.toDate) >= today)
    )
    
    // Check voor actieve afwezigheden in de aflosser zelf
    const activeUnavailable = aflosser.aflosserAbsences?.find((u: any) => 
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

  // Categoriseer aflossers
  const activeAflossers = aflossersWithStatus.filter((a: any) => 
    a.activeAssignment && a.activeAssignment.status === "active"
  )
  const unavailableAflossers = aflossersWithStatus.filter((a: any) => 
    a.status === "afwezig" || 
    a.status === "ziek" || 
    a.status === "uit-dienst" ||
    a.activeUnavailable
  )
  // Alle overige aflossers zijn beschikbaar (inclusief die met voltooide/geannuleerde toewijzingen)
  const availableAflossers = aflossersWithStatus.filter((a: any) => 
    !activeAflossers.includes(a) && !unavailableAflossers.includes(a)
  )

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

  const handleCompleteAssignment = (aflosser: any, assignment: any) => {
    // Vraag om voltooiingsdatum
    const completionDate = prompt(
      `Voer de datum in waarop ${aflosser.firstName} ${aflosser.lastName} van boord is gegaan (YYYY-MM-DD):`,
      new Date().toISOString().split('T')[0]
    )
    
    if (!completionDate) {
      alert("Voltooiing geannuleerd - geen datum ingevoerd")
      return
    }
    
    // Valideer datum formaat
    if (!/^\d{4}-\d{2}-\d{2}$/.test(completionDate)) {
      alert("Ongeldige datum formaat. Gebruik YYYY-MM-DD (bijv. 2024-01-15)")
      return
    }
    
    // Update assignment status to completed with specified date
    const updatedAssignment = { 
      ...assignment, 
      status: "completed",
      completedAt: completionDate
    }
    const updatedAssignments = aflosser.aflosserAssignments?.map((a: any) => 
      a.id === assignment.id ? updatedAssignment : a
    ) || []
    
    // Update localStorage direct
    const currentData = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
    currentData[aflosser.id] = {
      ...aflosser,
      aflosserAssignments: updatedAssignments
    }
    localStorage.setItem('crewDatabase', JSON.stringify(currentData))
    
    // Update state via hook
    updateData('crewDatabase', {
      [aflosser.id]: {
        ...aflosser,
        aflosserAssignments: updatedAssignments
      }
    })

    alert(`✅ Toewijzing voltooid voor ${aflosser.firstName} ${aflosser.lastName} op ${completionDate}`)
  }

  const handleCancelAssignment = (aflosser: any, assignment: any) => {
    // Update assignment status to cancelled
    const updatedAssignment = { ...assignment, status: "cancelled" }
    const updatedAssignments = aflosser.aflosserAssignments?.map((a: any) => 
      a.id === assignment.id ? updatedAssignment : a
    ) || []
    
    // Update localStorage direct
    const currentData = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
    currentData[aflosser.id] = {
      ...aflosser,
      aflosserAssignments: updatedAssignments
    }
    localStorage.setItem('crewDatabase', JSON.stringify(currentData))
    
    // Update state via hook
    updateData('crewDatabase', {
      [aflosser.id]: {
        ...aflosser,
        aflosserAssignments: updatedAssignments
      }
    })

    alert(`❌ Toewijzing geannuleerd voor ${aflosser.firstName} ${aflosser.lastName}`)
  }

  const handleEditAflosser = (aflosser: any) => {
    setSelectedAflosser(aflosser)
    setEditData({
      phone: aflosser.phone || "",
      diplomas: aflosser.diplomas?.join(", ") || "",
      notes: aflosser.notes || ""
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = () => {
    if (selectedAflosser) {
      updateData('crewDatabase', {
        [selectedAflosser.id]: {
          ...selectedAflosser,
          phone: editData.phone,
          diplomas: editData.diplomas.split(", ").filter(d => d.trim()),
          notes: editData.notes
        }
      })
      setShowEditDialog(false)
    }
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
      toDate: newAssignment.toDate || null,
      route: newAssignment.route,
      status: "active",
      hasFixedEndDate: !!newAssignment.toDate,
      completedAt: null,
      createdAt: new Date().toISOString()
    }

    

    const currentAssignments = selectedAflosser.aflosserAssignments || []
    const updatedAflosser = {
      ...selectedAflosser,
      aflosserAssignments: [...currentAssignments, assignment]
    }

    // Update localStorage direct
    const currentData = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
    currentData[selectedAflosser.id] = updatedAflosser
    localStorage.setItem('crewDatabase', JSON.stringify(currentData))

    // Update state via hook
    updateData('crewDatabase', {
      [selectedAflosser.id]: updatedAflosser
    })

    alert(`✅ ${selectedAflosser.firstName} ${selectedAflosser.lastName} toegewezen aan ${(shipDatabase as any)[newAssignment.shipId]?.name || newAssignment.shipId}`)

    setShowAssignmentDialog(false)
    setNewAssignment({
      shipId: "",
      fromDate: "",
      toDate: "",
      route: "",
      hasFixedEndDate: false
    })
  }

  const handleCompleteAssignmentConfirm = () => {
    if (!selectedAssignment || !completionDate) {
      alert("Vul een voltooiingsdatum in")
      return
    }

    const updatedAssignment = { 
      ...selectedAssignment, 
      status: "completed",
      completedAt: completionDate
    }

    const updatedAssignments = selectedAflosser.aflosserAssignments?.map((a: any) => 
      a.id === selectedAssignment.id ? updatedAssignment : a
    ) || []

    updateData('crewDatabase', {
      [selectedAflosser.id]: {
        ...selectedAflosser,
        aflosserAssignments: updatedAssignments
      }
    })

    setShowCompleteDialog(false)
    setCompletionDate("")
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



    const currentAbsences = selectedAflosser.aflosserAbsences || []
    const updatedAflosser = {
      ...selectedAflosser,
      aflosserAbsences: [...currentAbsences, unavailable]
    }

    // Update localStorage direct
    const currentData = JSON.parse(localStorage.getItem('crewDatabase') || '{}')
    currentData[selectedAflosser.id] = updatedAflosser
    localStorage.setItem('crewDatabase', JSON.stringify(currentData))

    updateData('crewDatabase', {
      [selectedAflosser.id]: updatedAflosser
    })

    alert(`✅ ${selectedAflosser.firstName} ${selectedAflosser.lastName} afwezig ingesteld: ${newUnavailable.reason}`)

    setShowUnavailableDialog(false)
    setNewUnavailable({
      fromDate: "",
      toDate: "",
      reason: ""
    })
  }

  const getAflosserHistory = (aflosserId: string) => {
    return allCrewData[aflosserId]?.aflosserAssignments || []
  }

  const getAflosserAbsences = (aflosserId: string) => {
    return allCrewData[aflosserId]?.aflosserAbsences || []
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
          <p className="text-gray-600 mt-1">Alle aflossers en hun beschikbaarheid</p>
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

                      <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Terug naar Dashboard
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
                <p className="text-2xl font-bold text-green-600">{aflossers.length}</p>
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
                  {availableAflossers.length}
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
                  {activeAflossers.length}
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
                  {unavailableAflossers.length}
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

      {/* Aflossers in drie kolommen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actieve Aflossers */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-900">Actieve Aflossers</h2>
            <Badge variant="secondary" className="ml-auto">{activeAflossers.length}</Badge>
          </div>
          
          {activeAflossers.length > 0 ? (
            <div className="space-y-4">
              {activeAflossers.map((aflosser: any) => (
                <Card 
                  key={aflosser.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onDoubleClick={() => {
                    if (aflosser.notes && aflosser.notes.trim() !== "") {
                      alert(`📝 Opmerkingen voor ${aflosser.firstName} ${aflosser.lastName}:\n\n"${aflosser.notes}"`);
                    } else {
                      alert(`ℹ️ Geen opmerkingen voor ${aflosser.firstName} ${aflosser.lastName}`);
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-purple-100 text-purple-700">
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
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Actieve toewijzing */}
                    {aflosser.activeAssignment && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center space-x-2 text-sm text-purple-600">
                          <Ship className="w-4 h-4" />
                          <span>{(shipDatabase as any)[aflosser.activeAssignment.shipId]?.name || aflosser.activeAssignment.shipId}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Van: {formatDate(aflosser.activeAssignment.fromDate)}
                          {aflosser.activeAssignment.toDate && ` - Tot: ${formatDate(aflosser.activeAssignment.toDate)}`}
                        </div>
                      </div>
                    )}

                    {/* Acties */}
                    <div className="flex items-center space-x-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleShowHistory(aflosser)}
                        className="text-gray-600"
                      >
                        <Clock className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCompleteAssignment(aflosser, aflosser.activeAssignment)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Voltooien
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCancelAssignment(aflosser, aflosser.activeAssignment)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Annuleren
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Ship className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Geen actieve aflossers</p>
            </div>
          )}
        </div>

        {/* Beschikbare Aflossers */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-900">Beschikbare Aflossers</h2>
            <Badge variant="secondary" className="ml-auto">{availableAflossers.length}</Badge>
          </div>
          
          {availableAflossers.length > 0 ? (
            <div className="space-y-4">
              {availableAflossers.map((aflosser: any) => (
                <Card 
                  key={aflosser.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onDoubleClick={() => {
                    if (aflosser.notes && aflosser.notes.trim() !== "") {
                      alert(`📝 Opmerkingen voor ${aflosser.firstName} ${aflosser.lastName}:\n\n"${aflosser.notes}"`);
                    } else {
                      alert(`ℹ️ Geen opmerkingen voor ${aflosser.firstName} ${aflosser.lastName}`);
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-green-100 text-green-700">
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
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Telefoonnummer */}
                    {aflosser.phone && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{aflosser.phone}</span>
                      </div>
                    )}
                    
                    {/* Diploma's */}
                    {aflosser.diplomas && aflosser.diplomas.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {aflosser.diplomas.map((diploma: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {diploma}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Opmerkingen (alleen tonen als er zijn) */}
                    {aflosser.notes && aflosser.notes.trim() !== "" && (
                      <div className="text-xs text-gray-500 italic">
                        "{aflosser.notes}"
                      </div>
                    )}

                    {/* Afwezigheid informatie */}
                    {isSoonAbsent(aflosser) && (
                      <div className="text-orange-600 text-xs mt-2 p-2 bg-orange-50 rounded">
                        <strong>⚠️ Binnenkort afwezig:</strong>
                        {getAflosserAbsences(aflosser.id)
                          .filter((a: any) => new Date(a.fromDate) > new Date())
                          .sort((a: any, b: any) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime())
                          .map((absence: any, index: number) => (
                            <div key={absence.id} className="mt-1">
                              {index + 1}. {formatDate(absence.fromDate)} - {formatDate(absence.toDate)} ({absence.reason})
                            </div>
                          ))}
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
                        className="text-gray-600"
                      >
                        <Clock className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <UserPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Geen beschikbare aflossers</p>
            </div>
          )}
        </div>

        {/* Niet Beschikbare Aflossers */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-900">Niet Beschikbaar</h2>
            <Badge variant="secondary" className="ml-auto">{unavailableAflossers.length}</Badge>
          </div>
          
          {unavailableAflossers.length > 0 ? (
            <div className="space-y-4">
              {unavailableAflossers.map((aflosser: any) => (
                <Card 
                  key={aflosser.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onDoubleClick={() => {
                    if (aflosser.notes && aflosser.notes.trim() !== "") {
                      alert(`📝 Opmerkingen voor ${aflosser.firstName} ${aflosser.lastName}:\n\n"${aflosser.notes}"`);
                    } else {
                      alert(`ℹ️ Geen opmerkingen voor ${aflosser.firstName} ${aflosser.lastName}`);
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-orange-100 text-orange-700">
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
                    {/* Actieve afwezigheid */}
                    {aflosser.activeUnavailable && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center space-x-2 text-sm text-orange-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{aflosser.activeUnavailable.reason}</span>
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
                        onClick={() => handleShowHistory(aflosser)}
                        className="flex-1"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Geschiedenis
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <UserX className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Geen afwezige aflossers</p>
            </div>
          )}
        </div>
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
                                              {Object.values(getCombinedShipDatabase()).map((ship: any) => (
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
            <div>
              <Label htmlFor="toDate">Tot datum (optioneel)</Label>
              <Input 
                type="date" 
                value={newAssignment.toDate}
                onChange={(e) => setNewAssignment({...newAssignment, toDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="route">Route</Label>
              <Input 
                value={newAssignment.route}
                onChange={(e) => setNewAssignment({...newAssignment, route: e.target.value})}
                placeholder="Bijv. Rotterdam - Antwerpen"
              />
            </div>
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

      {/* Afwezig Dialog */}
      <Dialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Afwezigheid instellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fromDate">Van datum</Label>
              <Input 
                type="date" 
                value={newUnavailable.fromDate}
                onChange={(e) => setNewUnavailable({...newUnavailable, fromDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="toDate">Tot datum</Label>
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
                placeholder="Bijv. Vakantie, Ziek, Persoonlijke redenen"
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
                  {getAflosserHistory(selectedAflosser?.id).map((assignment: any) => (
                    <div key={assignment.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{(shipDatabase as any)[assignment.shipId]?.name || assignment.shipId}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(assignment.fromDate)} - {assignment.toDate ? formatDate(assignment.toDate) : 'Open einde'}
                          </p>
                          <p className="text-sm text-gray-500">{assignment.route}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                            {assignment.status === 'active' ? 'Actief' : assignment.status === 'completed' ? 'Voltooid' : 'Geannuleerd'}
                          </Badge>
                          {assignment.status === 'active' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleCompleteAssignment(selectedAflosser, assignment)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCancelAssignment(selectedAflosser, assignment)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Geen toewijzingen gevonden</p>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Afwezigheden</h4>
              {getAflosserAbsences(selectedAflosser?.id).length > 0 ? (
                <div className="space-y-2">
                  {getAflosserAbsences(selectedAflosser?.id).map((absence: any) => (
                    <div key={absence.id} className="p-3 border rounded-lg">
                      <p className="font-medium">{absence.reason}</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(absence.fromDate)} - {formatDate(absence.toDate)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Geen afwezigheden gevonden</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voltooien Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Toewijzing voltooien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="completionDate">Voltooiingsdatum</Label>
              <Input 
                type="date" 
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleCompleteAssignmentConfirm} className="flex-1">
                Voltooien
              </Button>
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Aflosser Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bewerk aflosser</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Telefoonnummer</Label>
              <Input 
                value={editData.phone}
                onChange={(e) => setEditData({...editData, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="diplomas">Diploma's (komma-gescheiden)</Label>
              <Input 
                value={editData.diplomas}
                onChange={(e) => setEditData({...editData, diplomas: e.target.value})}
                placeholder="Vaarbewijs, ADN, Radar"
              />
            </div>
            <div>
              <Label htmlFor="notes">Opmerkingen</Label>
              <Textarea 
                value={editData.notes}
                onChange={(e) => setEditData({...editData, notes: e.target.value})}
                placeholder="Extra informatie..."
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleSaveEdit} className="flex-1">
                Opslaan
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 