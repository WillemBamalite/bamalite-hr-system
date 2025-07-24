"use client";
import { useState } from "react";
import { crewDatabase, shipDatabase } from "@/data/crew-database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, UserX, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";

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

export default function AflossersToewijzenPage() {
  // Haal assignments en unavailable periods uit database
  const [assignments, setAssignments] = useState<AflosserAssignment[]>(() => {
    const allAssignments: AflosserAssignment[] = [];
    Object.values(crewDatabase).forEach((crew: any) => {
      if (crew.aflosserAssignments) {
        allAssignments.push(...crew.aflosserAssignments);
      }
    });
    return allAssignments;
  });
  
  const [unavailablePeriods, setUnavailablePeriods] = useState<AflosserUnavailable[]>(() => {
    const allUnavailable: AflosserUnavailable[] = [];
    Object.values(crewDatabase).forEach((crew: any) => {
      if (crew.aflosserUnavailablePeriods) {
        allUnavailable.push(...crew.aflosserUnavailablePeriods);
      }
    });
    return allUnavailable;
  });
  const [selectedAflosser, setSelectedAflosser] = useState<any>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
  const [showAddAflosserDialog, setShowAddAflosserDialog] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    shipId: "",
    fromDate: "",
    toDate: "",

    hasFixedEndDate: false
  });
  const [newUnavailable, setNewUnavailable] = useState({
    fromDate: "",
    toDate: "",
    reason: ""
  });
  const [newAflosser, setNewAflosser] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    birthPlace: "",
    address: "",
    phone: "",
    email: "",
    nationality: "",
    smoking: false,
    experience: "",
    notes: "",
    qualifications: [] as string[]
  });

  // Filter alle aflossers
  const aflossers = Object.values(crewDatabase).filter((c: any) => 
    c.position?.toLowerCase().includes("aflos") || c.position?.toLowerCase().includes("relief")
  );

  // Bepaal status van elke aflosser
  const aflossersWithStatus = aflossers.map((aflosser: any) => {
    const today = new Date();
    const activeAssignment = assignments.find(a => 
      a.aflosserId === aflosser.id && 
      a.status === "active" &&
      new Date(a.fromDate) <= today && 
      (a.toDate ? new Date(a.toDate) >= today : true)
    );

    const unavailablePeriod = unavailablePeriods.find(u => 
      u.aflosserId === aflosser.id &&
      new Date(u.fromDate) <= today && 
      new Date(u.toDate) >= today
    );

    const upcomingUnavailable = unavailablePeriods
      .filter(u => u.aflosserId === aflosser.id)
      .find(u => 
        new Date(u.fromDate) > today && 
        new Date(u.fromDate) <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // Binnen 7 dagen
      );

    let status = "beschikbaar";
    let statusColor = "bg-green-100 text-green-800";
    let statusIcon = <CheckCircle className="w-4 h-4" />;

    if (activeAssignment) {
      status = "actief";
      statusColor = "bg-blue-100 text-blue-800";
      statusIcon = <Clock className="w-4 h-4" />;
    } else if (unavailablePeriod) {
      status = "niet-beschikbaar";
      statusColor = "bg-red-100 text-red-800";
      statusIcon = <UserX className="w-4 h-4" />;
    } else if (upcomingUnavailable) {
      status = "binnenkort-niet-beschikbaar";
      statusColor = "bg-orange-100 text-orange-800";
      statusIcon = <AlertCircle className="w-4 h-4" />;
    }



    return {
      ...aflosser,
      status,
      statusColor,
      statusIcon,
      activeAssignment,
      unavailablePeriod,
      upcomingUnavailable
    };
  });

  const beschikbaar = aflossersWithStatus.filter((a: any) => a.status === "beschikbaar");
  const actief = aflossersWithStatus.filter((a: any) => a.status === "actief");
  const nietBeschikbaar = aflossersWithStatus.filter((a: any) => a.status === "niet-beschikbaar");
  const binnenkortNietBeschikbaar = aflossersWithStatus.filter((a: any) => a.status === "binnenkort-niet-beschikbaar");
  
  // Toewijsbare aflossers (beschikbaar + binnenkort niet beschikbaar)
  const toewijsbaar = aflossersWithStatus.filter((a: any) => 
    a.status === "beschikbaar" || a.status === "binnenkort-niet-beschikbaar"
  );



  function handleAssignToShip(aflosser: any) {
    setSelectedAflosser(aflosser);
    setShowAssignmentDialog(true);
  }

  function handleShowHistory(aflosser: any) {
    setSelectedAflosser(aflosser);
    setShowHistoryDialog(true);
  }

  function handleSetUnavailable(aflosser: any) {
    setSelectedAflosser(aflosser);
    setShowUnavailableDialog(true);
  }

  function handleCreateAssignment() {
    if (!selectedAflosser || !newAssignment.shipId || !newAssignment.fromDate || !newAssignment.route) {
      return;
    }
    
    // Voor vaste einddatum moet toDate ook ingevuld zijn
    if (newAssignment.hasFixedEndDate && !newAssignment.toDate) {
      return;
    }

    const assignment: AflosserAssignment = {
      id: Date.now().toString(),
      aflosserId: selectedAflosser.id,
      shipId: newAssignment.shipId,
      fromDate: newAssignment.fromDate,
      toDate: newAssignment.hasFixedEndDate ? newAssignment.toDate : null,
      
      status: "active",
      hasFixedEndDate: newAssignment.hasFixedEndDate,
      completedAt: null,
      createdAt: new Date().toISOString()
    };

    // Voeg toe aan assignments state
    setAssignments([...assignments, assignment]);
    
    // Update aflosser status in database
    if ((crewDatabase as any)[selectedAflosser.id]) {
      (crewDatabase as any)[selectedAflosser.id].status = "aan-boord";
      (crewDatabase as any)[selectedAflosser.id].shipId = newAssignment.shipId;
      
      // Voeg assignment toe aan aflosser in database
      if (!(crewDatabase as any)[selectedAflosser.id].aflosserAssignments) {
        (crewDatabase as any)[selectedAflosser.id].aflosserAssignments = [];
      }
      (crewDatabase as any)[selectedAflosser.id].aflosserAssignments.push(assignment);
    }
    
          setNewAssignment({ shipId: "", fromDate: "", toDate: "", hasFixedEndDate: false });
    setShowAssignmentDialog(false);
  }

  function handleCreateUnavailable() {
    if (!selectedAflosser || !newUnavailable.fromDate || !newUnavailable.toDate || !newUnavailable.reason) {
      return;
    }

    const unavailable: AflosserUnavailable = {
      id: Date.now().toString(),
      aflosserId: selectedAflosser.id,
      fromDate: newUnavailable.fromDate,
      toDate: newUnavailable.toDate,
      reason: newUnavailable.reason,
      createdAt: new Date().toISOString()
    };

    setUnavailablePeriods([...unavailablePeriods, unavailable]);
    
    // Voeg unavailable period toe aan aflosser in database
    if ((crewDatabase as any)[selectedAflosser.id]) {
      if (!(crewDatabase as any)[selectedAflosser.id].aflosserUnavailablePeriods) {
        (crewDatabase as any)[selectedAflosser.id].aflosserUnavailablePeriods = [];
      }
      (crewDatabase as any)[selectedAflosser.id].aflosserUnavailablePeriods.push(unavailable);
    }
    
    setNewUnavailable({ fromDate: "", toDate: "", reason: "" });
    setShowUnavailableDialog(false);
  }

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [completionDate, setCompletionDate] = useState("");

  function handleCompleteAssignment(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    setCompletionDate(new Date().toISOString().split('T')[0]); // Default naar vandaag
    setShowCompleteDialog(true);
  }

  function handleConfirmCompleteAssignment() {
    const assignment = assignments.find(a => a.id === selectedAssignmentId);
    if (!assignment || !completionDate) return;

    const updatedAssignments = assignments.map(a => 
      a.id === selectedAssignmentId ? { 
        ...a, 
        status: "completed" as const,
        completedAt: completionDate,
        toDate: a.toDate || completionDate // Gebruik de ingevoerde datum als einddatum
      } : a
    );
    
    setAssignments(updatedAssignments);
    
    // Update aflosser status in database
    if ((crewDatabase as any)[assignment.aflosserId]) {
      (crewDatabase as any)[assignment.aflosserId].status = "thuis";
      (crewDatabase as any)[assignment.aflosserId].shipId = "";
      
      // Update assignment in database
      if ((crewDatabase as any)[assignment.aflosserId].aflosserAssignments) {
        const assignmentIndex = (crewDatabase as any)[assignment.aflosserId].aflosserAssignments.findIndex((a: any) => a.id === selectedAssignmentId);
        if (assignmentIndex !== -1) {
          (crewDatabase as any)[assignment.aflosserId].aflosserAssignments[assignmentIndex] = updatedAssignments.find(a => a.id === selectedAssignmentId)!;
        }
      }
    }

    setShowCompleteDialog(false);
    setSelectedAssignmentId("");
    setCompletionDate("");
  }

  function getAflosserHistory(aflosserId: string) {
    return assignments.filter(a => a.aflosserId === aflosserId);
  }

  function getAflosserUnavailableHistory(aflosserId: string) {
    return unavailablePeriods.filter(u => u.aflosserId === aflosserId);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("nl-NL");
  }

  function getNationalityFlag(nationality: string) {
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

  function handleAddAflosser() {
    // Genereer een unieke ID
    const newId = `aflosser-${Date.now()}`
    
    // Maak nieuwe aflosser aan
    const newAflosserData = {
      id: newId,
      firstName: newAflosser.firstName,
      lastName: newAflosser.lastName,
      birthDate: newAflosser.birthDate,
      birthPlace: newAflosser.birthPlace,
      address: newAflosser.address,
      phone: newAflosser.phone,
      email: newAflosser.email,
      nationality: newAflosser.nationality,
      position: "Aflosser",
      smoking: newAflosser.smoking,
      experience: newAflosser.experience,
      notes: newAflosser.notes,
      qualifications: newAflosser.qualifications,
      status: "thuis",
      regime: "1/1",
      shipId: "",
      ship: "",
      company: "",
      matricule: "",
      entryDate: "",
      onBoardSince: "",
      assignmentHistory: [],
      changeHistory: [],
      vasteDienst: false,
      inDienstVanaf: "",
      diplomaFiles: {},
      documentFiles: {}
    }

    // Voeg toe aan database (in een echte app zou dit naar een API gaan)
    ;(crewDatabase as any)[newId] = newAflosserData

    // Reset form
    setNewAflosser({
      firstName: "",
      lastName: "",
      birthDate: "",
      birthPlace: "",
      address: "",
      phone: "",
      email: "",
      nationality: "",
      smoking: false,
      experience: "",
      notes: "",
      qualifications: []
    })

    // Sluit dialog
    setShowAddAflosserDialog(false)
  }

  function handleDeleteAflosser(aflosserId: string) {
    if (confirm("Weet je zeker dat je deze aflosser wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")) {
      // Verwijder uit database
      delete (crewDatabase as any)[aflosserId]
      
      // Verwijder gerelateerde assignments en unavailable periods
      setAssignments(prev => prev.filter(a => a.aflosserId !== aflosserId))
      setUnavailablePeriods(prev => prev.filter(u => u.aflosserId !== aflosserId))
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-green-800">Aflosser Management</h1>
        <Button 
          onClick={() => setShowAddAflosserDialog(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          + Aflosser toevoegen
        </Button>
      </div>
      
      {/* Toewijsbare aflossers */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Toewijsbare aflossers ({toewijsbaar.length})
        </h2>
        {toewijsbaar.length === 0 ? (
          <div className="text-gray-500">Geen toewijsbare aflossers.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {toewijsbaar.map((aflosser: any) => (
              <Card key={aflosser.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link href={`/bemanning/${aflosser.id}`} className="hover:underline">
                        <CardTitle className="text-lg cursor-pointer">
                          {aflosser.firstName} {aflosser.lastName} <span className="text-sm text-gray-500">({aflosser.nationality})</span>
                        </CardTitle>
                      </Link>
                    </div>
                    <Badge className={aflosser.statusColor}>
                      {aflosser.statusIcon}
                      <span className="ml-1">
                        {aflosser.status === "beschikbaar" ? "Beschikbaar" : "Binnenkort niet beschikbaar"}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div><strong>Functie:</strong> {aflosser.position}</div>
                    <div><strong>Telefoon:</strong> {aflosser.phone}</div>
                    <div><strong>Diploma's:</strong> {aflosser.qualifications?.join(", ") || "Geen diploma's"}</div>
                    <div><strong>Roken:</strong> {aflosser.smoking ? "Ja" : "Nee"}</div>
                    {aflosser.status === "binnenkort-niet-beschikbaar" && (
                      <div className="text-orange-600 text-xs">
                        <strong>Toekomstige afwezigheden:</strong>
                        {getAflosserUnavailableHistory(aflosser.id)
                          .filter(p => new Date(p.fromDate) > new Date())
                          .sort((a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime())
                          .map((period, index) => (
                            <div key={period.id} className="mt-1">
                              {index + 1}. {formatDate(period.fromDate)} - {formatDate(period.toDate)} ({period.reason})
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={() => handleAssignToShip(aflosser)}
                      className="flex-1"
                      size="sm"
                    >
                      Toewijzen aan schip
                    </Button>
                    <Button 
                      onClick={() => handleShowHistory(aflosser)}
                      variant="outline"
                      size="sm"
                    >
                      History
                    </Button>
                    <Button 
                      onClick={() => handleSetUnavailable(aflosser)}
                      variant="outline"
                      size="sm"
                    >
                      Afwezigheid toevoegen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Actieve aflossers */}
      {actief.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-blue-700 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Actieve aflossers ({actief.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actief.map((aflosser: any) => (
              <Card key={aflosser.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link href={`/bemanning/${aflosser.id}`} className="hover:underline">
                        <CardTitle className="text-lg cursor-pointer">
                          {aflosser.firstName} {aflosser.lastName} <span className="text-sm text-gray-500">({aflosser.nationality})</span>
                        </CardTitle>
                      </Link>
                    </div>
                    <Badge className={aflosser.statusColor}>
                      {aflosser.statusIcon}
                      <span className="ml-1">Actief</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div><strong>Schip:</strong> {shipDatabase[aflosser.activeAssignment.shipId]?.name}</div>
    
                    <div><strong>Van:</strong> {formatDate(aflosser.activeAssignment.fromDate)}</div>
                    <div><strong>Tot:</strong> {aflosser.activeAssignment.hasFixedEndDate ? formatDate(aflosser.activeAssignment.toDate || "") : "Flexibel (voltooi handmatig)"}</div>
                    <div><strong>Type:</strong> {aflosser.activeAssignment.hasFixedEndDate ? "Vaste periode" : "Flexibele periode"}</div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={() => handleCompleteAssignment(aflosser.activeAssignment.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Reis voltooien
                    </Button>
                    <Button 
                      onClick={() => handleShowHistory(aflosser)}
                      variant="outline"
                      size="sm"
                    >
                      History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}



      {/* Niet beschikbare aflossers */}
      {nietBeschikbaar.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-red-700 flex items-center gap-2">
            <UserX className="w-5 h-5" />
            Niet beschikbare aflossers ({nietBeschikbaar.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nietBeschikbaar.map((aflosser: any) => (
              <Card key={aflosser.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link href={`/bemanning/${aflosser.id}`} className="hover:underline">
                        <CardTitle className="text-lg cursor-pointer">
                          {aflosser.firstName} {aflosser.lastName} <span className="text-sm text-gray-500">({aflosser.nationality})</span>
                        </CardTitle>
                      </Link>
                    </div>
                    <Badge className={aflosser.statusColor}>
                      {aflosser.statusIcon}
                      <span className="ml-1">Niet beschikbaar</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div><strong>Van:</strong> {formatDate(aflosser.unavailablePeriod.fromDate)}</div>
                    <div><strong>Tot:</strong> {formatDate(aflosser.unavailablePeriod.toDate)}</div>
                    <div><strong>Reden:</strong> {aflosser.unavailablePeriod.reason}</div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={() => handleShowHistory(aflosser)}
                      variant="outline"
                      size="sm"
                    >
                      History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Toewijzen aan schip dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Toewijzen aan schip - {selectedAflosser?.firstName} {selectedAflosser?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ship">Schip</Label>
              <Select value={newAssignment.shipId} onValueChange={(value) => setNewAssignment({...newAssignment, shipId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een schip" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(shipDatabase).map((ship: any) => (
                    <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fromDate">Aan boord vanaf</Label>
              <Input
                id="fromDate"
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
                className="rounded"
              />
              <Label htmlFor="hasFixedEndDate">Vaste einddatum</Label>
            </div>
            {newAssignment.hasFixedEndDate && (
              <div>
                <Label htmlFor="toDate">Aan boord tot</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={newAssignment.toDate}
                  onChange={(e) => setNewAssignment({...newAssignment, toDate: e.target.value})}
                />
              </div>
            )}
            {!newAssignment.hasFixedEndDate && (
              <div className="text-xs text-gray-500 mt-1">
                Geen vaste einddatum - reis wordt handmatig voltooid
              </div>
            )}
            <div>
              <Label htmlFor="route">Route</Label>
              <Input
                id="route"
                placeholder="bijv. Amsterdam naar Speyer"
                value={newAssignment.route}

              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateAssignment} className="flex-1">Toewijzen</Button>
              <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>Annuleren</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Niet beschikbaar dialog */}
      <Dialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
        <DialogContent className="sm:max-w-md">
                  <DialogHeader>
          <DialogTitle>Afwezigheid instellen - {selectedAflosser?.firstName} {selectedAflosser?.lastName}</DialogTitle>
        </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="unavailableFromDate">Afwezig van</Label>
              <Input
                id="unavailableFromDate"
                type="date"
                value={newUnavailable.fromDate}
                onChange={(e) => setNewUnavailable({...newUnavailable, fromDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="unavailableToDate">Afwezig tot</Label>
              <Input
                id="unavailableToDate"
                type="date"
                value={newUnavailable.toDate}
                onChange={(e) => setNewUnavailable({...newUnavailable, toDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reden</Label>
              <Textarea
                id="reason"
                placeholder="Reden van niet beschikbaarheid"
                value={newUnavailable.reason}
                onChange={(e) => setNewUnavailable({...newUnavailable, reason: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateUnavailable} className="flex-1">Instellen</Button>
              <Button variant="outline" onClick={() => setShowUnavailableDialog(false)}>Annuleren</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Geschiedenis - {selectedAflosser?.firstName} {selectedAflosser?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Reis geschiedenis */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Reis geschiedenis
              </h3>
              {getAflosserHistory(selectedAflosser?.id).length === 0 ? (
                <p className="text-gray-500">Geen reis geschiedenis.</p>
              ) : (
                <div className="space-y-2">
                  {getAflosserHistory(selectedAflosser?.id).map((assignment) => (
                    <Card key={assignment.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{shipDatabase[assignment.shipId]?.name}</div>
                            <div className="text-sm text-gray-600">{assignment.route}</div>
                                              <div className="text-sm text-gray-500">
                    {formatDate(assignment.fromDate)} - {assignment.status === "completed" && assignment.completedAt
                      ? formatDate(assignment.completedAt)
                      : assignment.hasFixedEndDate
                        ? formatDate(assignment.toDate || "")
                        : assignment.status === "active"
                          ? "Actief (geen einddatum)"
                          : "Geen einddatum"}
                  </div>
                                              <div className="text-xs text-gray-400">
                    {assignment.status === "completed"
                      ? `Voltooid op ${formatDate(assignment.completedAt || "")}`
                      : assignment.status === "active"
                        ? "Actief - klik 'Reis voltooien' om te beëindigen"
                        : assignment.hasFixedEndDate
                          ? "Vaste periode"
                          : "Geen vaste einddatum"}
                  </div>
                          </div>
                          <Badge variant={assignment.status === "active" ? "default" : "secondary"}>
                            {assignment.status === "active" ? "Actief" : "Voltooid"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Niet beschikbaar geschiedenis */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <UserX className="w-4 h-4" />
                Niet beschikbaar geschiedenis ({getAflosserUnavailableHistory(selectedAflosser?.id).length} periodes)
              </h3>
              {getAflosserUnavailableHistory(selectedAflosser?.id).length === 0 ? (
                <p className="text-gray-500">Geen niet beschikbaar geschiedenis.</p>
              ) : (
                <div className="space-y-2">
                  {getAflosserUnavailableHistory(selectedAflosser?.id)
                    .sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime())
                    .map((period) => {
                      const today = new Date();
                      const isPast = new Date(period.toDate) < today;
                      const isCurrent = new Date(period.fromDate) <= today && new Date(period.toDate) >= today;
                      const isFuture = new Date(period.fromDate) > today;
                      
                      return (
                        <Card key={period.id} className={isCurrent ? "border-orange-200 bg-orange-50" : isFuture ? "border-blue-200 bg-blue-50" : ""}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-gray-500">
                                  {formatDate(period.fromDate)} - {formatDate(period.toDate)}
                                </div>
                                <div className="text-sm text-gray-600">{period.reason}</div>
                              </div>
                              <Badge variant={isPast ? "secondary" : isCurrent ? "default" : "outline"}>
                                {isPast ? "Verlopen" : isCurrent ? "Huidig" : "Toekomstig"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Aflosser toevoegen dialog */}
      <Dialog open={showAddAflosserDialog} onOpenChange={setShowAddAflosserDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuwe Aflosser Toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Persoonlijke gegevens */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="firstName">Voornaam *</Label>
                  <Input
                    id="firstName"
                    value={newAflosser.firstName}
                    onChange={(e) => setNewAflosser({...newAflosser, firstName: e.target.value})}
                    placeholder="Voornaam"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Achternaam *</Label>
                  <Input
                    id="lastName"
                    value={newAflosser.lastName}
                    onChange={(e) => setNewAflosser({...newAflosser, lastName: e.target.value})}
                    placeholder="Achternaam"
                  />
                </div>
                <div>
                  <Label htmlFor="birthDate">Geboortedatum</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={newAflosser.birthDate}
                    onChange={(e) => setNewAflosser({...newAflosser, birthDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="birthPlace">Geboorteplaats</Label>
                  <Input
                    id="birthPlace"
                    value={newAflosser.birthPlace}
                    onChange={(e) => setNewAflosser({...newAflosser, birthPlace: e.target.value})}
                    placeholder="Geboorteplaats"
                  />
                </div>
                <div>
                  <Label htmlFor="nationality">Nationaliteit *</Label>
                  <Select
                    value={newAflosser.nationality}
                    onValueChange={(value) => setNewAflosser({...newAflosser, nationality: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kies nationaliteit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NL">🇳🇱 Nederland</SelectItem>
                      <SelectItem value="DE">🇩🇪 Duitsland</SelectItem>
                      <SelectItem value="BE">🇧🇪 België</SelectItem>
                      <SelectItem value="FR">🇫🇷 Frankrijk</SelectItem>
                      <SelectItem value="CZ">🇨🇿 Tsjechië</SelectItem>
                      <SelectItem value="PO">🇵🇱 Polen</SelectItem>
                      <SelectItem value="HUN">🇭🇺 Hongarije</SelectItem>
                      <SelectItem value="SERV">🇷🇸 Servië</SelectItem>
                      <SelectItem value="SLK">🇸🇰 Slowakije</SelectItem>
                      <SelectItem value="EG">🇪🇬 Egypte</SelectItem>
                      <SelectItem value="LUX">🇱🇺 Luxemburg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phone">Telefoonnummer *</Label>
                  <Input
                    id="phone"
                    value={newAflosser.phone}
                    onChange={(e) => setNewAflosser({...newAflosser, phone: e.target.value})}
                    placeholder="+31 6 12345678"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mailadres</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAflosser.email}
                    onChange={(e) => setNewAflosser({...newAflosser, email: e.target.value})}
                    placeholder="naam@email.com"
                  />
                </div>
              </div>

              {/* Adres en overige gegevens */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Volledig adres</Label>
                  <Textarea
                    id="address"
                    value={newAflosser.address}
                    onChange={(e) => setNewAflosser({...newAflosser, address: e.target.value})}
                    placeholder="Straat, postcode, plaats, land"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="experience">Ervaring</Label>
                  <Textarea
                    id="experience"
                    value={newAflosser.experience}
                    onChange={(e) => setNewAflosser({...newAflosser, experience: e.target.value})}
                    placeholder="Beschrijf relevante ervaring..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="smoking">Roken</Label>
                  <Select
                    value={newAflosser.smoking ? "ja" : "nee"}
                    onValueChange={(value) => setNewAflosser({...newAflosser, smoking: value === "ja"})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kies optie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nee">Nee</SelectItem>
                      <SelectItem value="ja">Ja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="diplomas">Diploma's</Label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {newAflosser.qualifications.map((diploma, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {diploma}
                          <button
                            type="button"
                            onClick={() => setNewAflosser({
                              ...newAflosser,
                              qualifications: newAflosser.qualifications.filter((_, i) => i !== index)
                            })}
                            className="ml-1 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Select
                      onValueChange={(value) => {
                        if (value && !newAflosser.qualifications.includes(value)) {
                          setNewAflosser({
                            ...newAflosser,
                            qualifications: [...newAflosser.qualifications, value]
                          })
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Diploma toevoegen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vaarbewijs">Vaarbewijs</SelectItem>
                        <SelectItem value="Rijnpatent tot Wesel">Rijnpatent tot Wesel</SelectItem>
                        <SelectItem value="Rijnpatent tot Koblenz">Rijnpatent tot Koblenz</SelectItem>
                        <SelectItem value="Rijnpatent tot Mannheim">Rijnpatent tot Mannheim</SelectItem>
                        <SelectItem value="Rijnpatent tot Iffezheim">Rijnpatent tot Iffezheim</SelectItem>
                        <SelectItem value="Elbepatent">Elbepatent</SelectItem>
                        <SelectItem value="Donaupatent">Donaupatent</SelectItem>
                        <SelectItem value="ADN">ADN</SelectItem>
                        <SelectItem value="ADN C">ADN C</SelectItem>
                        <SelectItem value="Radar">Radar</SelectItem>
                        <SelectItem value="Marifoon">Marifoon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Opmerkingen</Label>
                  <Textarea
                    id="notes"
                    value={newAflosser.notes}
                    onChange={(e) => setNewAflosser({...newAflosser, notes: e.target.value})}
                    placeholder="Optionele opmerkingen..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddAflosser} className="flex-1" disabled={!newAflosser.firstName || !newAflosser.lastName || !newAflosser.nationality || !newAflosser.phone}>
                Aflosser toevoegen
              </Button>
              <Button variant="outline" onClick={() => setShowAddAflosserDialog(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog voor voltooiingsdatum */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reis voltooien</DialogTitle>
            <DialogDescription>
              Voer de datum in waarop de aflosser van boord is gegaan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="completionDate">Datum van boord gegaan</Label>
              <Input
                id="completionDate"
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleConfirmCompleteAssignment} className="flex-1" disabled={!completionDate}>
              Reis voltooien
            </Button>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Annuleren
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 