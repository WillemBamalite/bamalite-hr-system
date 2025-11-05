"use client";

import { useState, useEffect } from "react";
import { shipDatabase } from "@/data/crew-database";
import { useCrewData } from "@/hooks/use-crew-data";
import { loadFromStorage } from "@/utils/persistent-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, UserX, CheckCircle, AlertCircle, Trash2, AlertTriangle, XCircle, Plus, Edit } from "lucide-react";
import Link from "next/link";
import { MobileHeaderNav } from "@/components/ui/mobile-header-nav";
import { format } from 'date-fns';

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

export default function AflossersToewijzenPage() {

  
  const { crewDatabase, updateData } = useCrewData();
  
  // Haal assignments en unavailable periods uit database
  const [assignments, setAssignments] = useState<AflosserAssignment[]>([]);
  const [unavailablePeriods, setUnavailablePeriods] = useState<AflosserUnavailable[]>([]);
  
  // Update assignments en unavailable periods wanneer crewDatabase verandert
  useEffect(() => {
    const allAssignments: AflosserAssignment[] = [];
    const allUnavailable: AflosserUnavailable[] = [];
    
    Object.values(crewDatabase).forEach((crew: any) => {
      if (crew.aflosserAssignments) {
        allAssignments.push(...crew.aflosserAssignments);
      }
      if (crew.aflosserAbsences) {
        allUnavailable.push(...crew.aflosserAbsences);
      }
    });
    
    setAssignments(allAssignments);
    setUnavailablePeriods(allUnavailable);
  }, [crewDatabase]);
  
  const [selectedAflosser, setSelectedAflosser] = useState<any>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [completionDate, setCompletionDate] = useState("");
  const [editData, setEditData] = useState({
    phone: "",
    diplomas: "",
    notes: ""
  });
  
  const [newAssignment, setNewAssignment] = useState({
    shipId: "",
    fromDate: "",
    toDate: "",
    route: "",
    hasFixedEndDate: false
  });
  const [newUnavailable, setNewUnavailable] = useState({
    fromDate: "",
    toDate: "",
    reason: ""
  });

  // Filter aflossers - zoek naar aflossers op basis van functie, specifieke aflosser functies, of isAflosser eigenschap
  const aflossers = Object.values(crewDatabase).filter((c: any) => {
    const position = c.position?.toLowerCase() || "";
    return c.isAflosser === true ||
      position.includes("aflos") ||
      position.includes("relief");
  });

  // Filter actieve aflossers (toegewezen aan schip)
  const activeAflossers = aflossers.filter((aflosser: any) =>
    aflosser.status === "aan-boord" && aflosser.shipId
  );

  // Filter beschikbare aflossers (niet toegewezen en niet afwezig)
  const availableAflossers = aflossers.filter((aflosser: any) => {
    const isAssigned = aflosser.status === "aan-boord" && aflosser.shipId;
    const isAbsent = isCurrentlyAbsent(aflosser);
    return !isAssigned && !isAbsent;
  });

  // Filter niet beschikbare aflossers (momenteel afwezig)
  const unavailableAflossers = aflossers.filter((aflosser: any) =>
    isCurrentlyAbsent(aflosser)
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

  function handleCompleteAssignment(aflosser: any, assignment: any) {
    setSelectedAflosser(aflosser);
    setSelectedAssignment(assignment);
    setShowCompleteDialog(true);
  }

  function handleCancelAssignment(aflosser: any, assignment: any) {
    if (confirm(`Weet je zeker dat je de reis van ${aflosser.firstName} ${aflosser.lastName} wilt annuleren?`)) {
          // Update assignment status
    const updatedAssignments = (crewDatabase as any)[aflosser.id]?.aflosserAssignments?.map((a: any) =>
      a.id === assignment.id
        ? { ...a, status: "cancelled" }
        : a
    ) || [];
    // Update crew member
    const updatedCrewMember = {
      ...(crewDatabase as any)[aflosser.id],
      status: "beschikbaar",
      shipId: null,
      aflosserAssignments: updatedAssignments
    };
    updateData('crewDatabase', { [aflosser.id]: updatedCrewMember });
      alert(`❌ Reis van ${aflosser.firstName} ${aflosser.lastName} geannuleerd.`);
    }
  }

  function handleEditAflosser(aflosser: any) {
    setSelectedAflosser(aflosser);
    setEditData({
      phone: aflosser.phone || "",
      diplomas: aflosser.diplomas || "",
      notes: aflosser.notes || ""
    });
    setShowEditDialog(true);
  }

  function handleSaveEdit() {
    if (!selectedAflosser) return;
    const updatedAflosser = {
      ...(crewDatabase as any)[selectedAflosser.id],
      phone: editData.phone,
      diplomas: editData.diplomas,
      notes: editData.notes
    };
    updateData('crewDatabase', { [selectedAflosser.id]: updatedAflosser });
    setShowEditDialog(false);
  }

  function handleCreateAssignment() {

    
    if (!selectedAflosser || !newAssignment.shipId || !newAssignment.fromDate || !newAssignment.route) {
      alert("Vul alle verplichte velden in: schip, startdatum en route");
      return;
    }
    
    // Voor vaste einddatum moet toDate ook ingevuld zijn
    if (newAssignment.hasFixedEndDate && !newAssignment.toDate) {
      alert("Vul een einddatum in voor vaste periodes");
      return;
    }

    const assignment: AflosserAssignment = {
      id: Date.now().toString(),
      aflosserId: selectedAflosser.id,
      shipId: newAssignment.shipId,
      fromDate: newAssignment.fromDate,
      toDate: newAssignment.hasFixedEndDate ? newAssignment.toDate : null,
      route: newAssignment.route,
      status: "active",
      hasFixedEndDate: newAssignment.hasFixedEndDate,
      completedAt: null,
      createdAt: new Date().toISOString()
    };

    

    // Update crew member
    const updatedCrewMember = {
      ...(crewDatabase as any)[selectedAflosser.id],
      status: "aan-boord",
      shipId: newAssignment.shipId,
      aflosserAssignments: [
        ...((crewDatabase as any)[selectedAflosser.id]?.aflosserAssignments || []),
        assignment
      ]
    };
    
    
    
    // Direct localStorage update
    try {
      const storedData = loadFromStorage();
      const updatedCrewDatabase = {
        ...storedData.crewDatabase,
        [selectedAflosser.id]: updatedCrewMember
      };
      
      // Sla direct op in localStorage
      localStorage.setItem('crewDatabase', JSON.stringify(updatedCrewDatabase));
      
      console.log("🔧 Debug info:", {
        aflosserId: selectedAflosser.id,
        updatedCrewMember: updatedCrewMember,
        localStorageData: JSON.parse(localStorage.getItem('crewDatabase') || '{}')[selectedAflosser.id]
      });
      
      // Force update van de hook state
      updateData("crewDatabase", { [selectedAflosser.id]: updatedCrewMember });
      
    } catch (error) {
      console.error("🔧 Error bij localStorage update:", error);
      alert("❌ Fout bij opslaan van data: " + error);
    }
    
    // Toon een duidelijke melding
    const shipName = (shipDatabase as any)[newAssignment.shipId]?.name || "Onbekend schip";
    alert(`✅ Aflosser ${selectedAflosser.firstName} ${selectedAflosser.lastName} succesvol toegewezen aan ${shipName}`);
    
    setNewAssignment({ shipId: "", fromDate: "", toDate: "", route: "", hasFixedEndDate: false });
    setShowAssignmentDialog(false);
  }

  function handleCompleteAssignmentConfirm() {
    if (!completionDate) {
      alert("Vul een voltooiingsdatum in!");
      return;
    }
    // Update assignment status
    const updatedAssignments = (crewDatabase as any)[selectedAflosser.id]?.aflosserAssignments?.map((a: any) =>
      a.id === selectedAssignment.id
        ? { ...a, status: "completed", completedAt: completionDate }
        : a
    ) || [];
    // Update crew member
    const updatedCrewMember = {
      ...(crewDatabase as any)[selectedAflosser.id],
      status: "beschikbaar",
      shipId: null,
      aflosserAssignments: updatedAssignments
    };
    updateData('crewDatabase', { [selectedAflosser.id]: updatedCrewMember });
    alert(`✅ Reis van ${selectedAflosser.firstName} ${selectedAflosser.lastName} voltooid op ${completionDate}`);
    setShowCompleteDialog(false);
  }

  function handleCreateUnavailable() {
    if (!selectedAflosser || !newUnavailable.fromDate || !newUnavailable.toDate || !newUnavailable.reason) {
      alert("Vul alle velden in: startdatum, einddatum en reden");
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

    // Update aflosser met nieuwe unavailable period
    const updatedAflosser = {
      ...(crewDatabase as any)[selectedAflosser.id],
      aflosserAbsences: [
        ...((crewDatabase as any)[selectedAflosser.id]?.aflosserAbsences || []),
        unavailable
      ]
    };
    updateData("crewDatabase", { [selectedAflosser.id]: updatedAflosser });
    
    alert(`Afwezigheid succesvol toegevoegd voor ${selectedAflosser.firstName} ${selectedAflosser.lastName}`);
    setNewUnavailable({ fromDate: "", toDate: "", reason: "" });
    setShowUnavailableDialog(false);
  }

  function formatDate(dateString: string) {
    return format(new Date(dateString), 'dd-MM-yyyy');
  }

  function getAflosserHistory(aflosserId: string) {
    return (crewDatabase as any)[aflosserId]?.aflosserAssignments || [];
  }

  function getAflosserAbsences(aflosserId: string) {
    return (crewDatabase as any)[aflosserId]?.aflosserAbsences || [];
  }

  function createTestAflossers() {
    const testAflossers = {
      "aflosser1": {
        id: "aflosser1",
        firstName: "Jan",
        lastName: "Aflosser",
        position: "Aflosser",
        nationality: "Nederlands",
        phone: "0612345678",
        status: "beschikbaar",
        qualifications: ["Varen"],
        smoking: false
      },
      "aflosser2": {
        id: "aflosser2", 
        firstName: "Piet",
        lastName: "Relief",
        position: "Relief Crew",
        nationality: "Nederlands",
        phone: "0687654321",
        status: "beschikbaar",
        qualifications: ["Varen", "Deksman"],
        smoking: true
      }
    };

    localStorage.setItem('crewDatabase', JSON.stringify(testAflossers));
    updateData('crewDatabase', testAflossers);
    alert("✅ Test aflossers aangemaakt!");
  }

  function showLocalStorageData() {
    const data = localStorage.getItem('crewDatabase');
    if (data) {
      const parsed = JSON.parse(data);
      alert(`📊 localStorage data:\n\n${JSON.stringify(parsed, null, 2)}`);
    } else {
      alert("❌ Geen data in localStorage!");
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <MobileHeaderNav />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aflosser Toewijzing</h1>
          <p className="text-gray-600 mt-1">Beheer en toewijzen van relief crew</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => {
            const aflossersList = aflossers.map((a: any) => `${a.firstName} ${a.lastName} (${a.position}) - isAflosser: ${a.isAflosser}`).join('\n');
            alert(`🔍 Huidige Aflossers:\n\nTotaal: ${aflossers.length}\n\nLijst:\n${aflossersList}`);
          }} variant="outline">
            Toon aflossers
          </Button>
          <Button onClick={showLocalStorageData} variant="outline">
            Toon localStorage data
          </Button>
          <Button onClick={createTestAflossers} variant="outline">
            Maak test aflossers
          </Button>
          <Link href="/bemanning/aflossers/nieuw">
            <Button className="bg-green-600 hover:bg-green-700">
              ➕ Nieuwe Aflosser
            </Button>
          </Link>
                      <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Terug naar Dashboard
          </Link>
        </div>
      </div>

      {/* Actieve Aflossers */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-blue-700 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Actieve Aflossers ({activeAflossers.length})
        </h2>
        {activeAflossers.length === 0 ? (
          <div className="text-gray-500">Geen actieve aflossers.</div>
        ) : (
          <div className="grid gap-4">
            {activeAflossers.map((aflosser: any) => {
              const activeAssignment = aflosser.aflosserAssignments?.find((a: any) => a.status === "active");
              return (
                <Card key={aflosser.id} className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{aflosser.firstName} {aflosser.lastName}</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        <Clock className="w-4 h-4 mr-1" />
                        Actief
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div><strong>Schip:</strong> {aflosser.shipId}</div>
                      <div><strong>Route:</strong> {activeAssignment?.route || "Onbekend"}</div>
                      <div><strong>Aan boord vanaf:</strong> {activeAssignment?.fromDate ? formatDate(activeAssignment.fromDate) : "Onbekend"}</div>
                      {activeAssignment?.hasFixedEndDate && activeAssignment?.toDate && (
                        <div><strong>Aan boord tot:</strong> {formatDate(activeAssignment.toDate)}</div>
                      )}
                      {!activeAssignment?.hasFixedEndDate && (
                        <div><strong>Type:</strong> <span className="text-orange-600">Reis (handmatig voltooien)</span></div>
                      )}
                      {activeAssignment?.hasFixedEndDate && (
                        <div><strong>Type:</strong> <span className="text-blue-600">Vaste periode</span></div>
                      )}
                      <div><strong>Functie:</strong> {aflosser.position}</div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={() => handleCompleteAssignment(aflosser, activeAssignment)}
                        className="flex-1"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Reis voltooien
                      </Button>
                      <Button 
                        onClick={() => handleCancelAssignment(aflosser, activeAssignment)}
                        variant="outline"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Annuleren
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Beschikbare Aflossers */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Beschikbare Aflossers ({availableAflossers.length})
        </h2>
        {availableAflossers.length === 0 ? (
          <div className="text-gray-500">Geen beschikbare aflossers.</div>
        ) : (
          <div className="grid gap-4">
            {availableAflossers.map((aflosser: any) => (
              <Card 
                key={aflosser.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onDoubleClick={() => handleEditAflosser(aflosser)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{aflosser.firstName} {aflosser.lastName}</span>
                    <Badge variant="secondary" className="text-xs">
                      Aflosser
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div><strong>Telefoon:</strong> {aflosser.phone || "niet ingevuld"}</div>
                    <div><strong>Diploma's:</strong> {aflosser.diplomas || "niet ingevuld"}</div>
                    <div><strong>Status:</strong> {aflosser.status || "onbekend"}</div>
                    {aflosser.shipId && <div><strong>Schip:</strong> {aflosser.shipId}</div>}
                    <div><strong>Functie:</strong> {aflosser.position || "onbekend"}</div>
                    
                    {aflosser.notes && (
                      <div className="mt-2 p-2 bg-blue-50 rounded">
                        <strong>Opmerkingen:</strong>
                        <div className="text-xs mt-1">{aflosser.notes}</div>
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
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => handleAssignToShip(aflosser)} className="flex-1">
                      Toewijzen
                    </Button>
                    <Button 
                      onClick={() => handleSetUnavailable(aflosser)}
                      variant="outline"
                      size="sm"
                    >
                      Afwezigheid
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
        )}
      </div>

      {/* Niet Beschikbare Aflossers */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-red-700 flex items-center gap-2">
          <UserX className="w-5 h-5" />
          Niet Beschikbare Aflossers ({unavailableAflossers.length})
        </h2>
        {unavailableAflossers.length === 0 ? (
          <div className="text-gray-500">Geen niet beschikbare aflossers.</div>
        ) : (
          <div className="grid gap-4">
            {unavailableAflossers.map((aflosser: any) => (
              <Card 
                key={aflosser.id} 
                className="border-red-200 bg-red-50 cursor-pointer hover:shadow-md transition-shadow"
                onDoubleClick={() => handleEditAflosser(aflosser)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{aflosser.firstName} {aflosser.lastName}</span>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Aflosser
                      </Badge>
                      <Badge className="bg-red-100 text-red-800">
                        <UserX className="w-4 h-4 mr-1" />
                        Afwezig
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div><strong>Telefoon:</strong> {aflosser.phone || "niet ingevuld"}</div>
                    <div><strong>Diploma's:</strong> {aflosser.diplomas || "niet ingevuld"}</div>
                    <div><strong>Status:</strong> {aflosser.status || "onbekend"}</div>
                    {aflosser.shipId && <div><strong>Schip:</strong> {aflosser.shipId}</div>}
                    <div><strong>Functie:</strong> {aflosser.position || "onbekend"}</div>
                    
                    {aflosser.notes && (
                      <div className="mt-2 p-2 bg-blue-50 rounded">
                        <strong>Opmerkingen:</strong>
                        <div className="text-xs mt-1">{aflosser.notes}</div>
                      </div>
                    )}
                    
                    {/* Huidige afwezigheid */}
                    {isCurrentlyAbsent(aflosser) && (
                      <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded">
                        <strong>🚫 Momenteel afwezig:</strong>
                        {getAflosserAbsences(aflosser.id)
                          .filter((a: any) => {
                            const today = new Date();
                            return new Date(a.fromDate) <= today && new Date(a.toDate) >= today;
                          })
                          .map((absence: any) => (
                            <div key={absence.id} className="mt-1">
                              {formatDate(absence.fromDate)} - {formatDate(absence.toDate)} ({absence.reason})
                            </div>
                          ))}
                      </div>
                    )}
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
        )}
      </div>

      {/* Toewijzen Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toewijzen: {selectedAflosser?.firstName} {selectedAflosser?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Schip</Label>
              <Select value={newAssignment.shipId} onValueChange={(value) => setNewAssignment({...newAssignment, shipId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies schip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ship1">Schip 1</SelectItem>
                  <SelectItem value="ship2">Schip 2</SelectItem>
                  <SelectItem value="ship3">Schip 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Startdatum</Label>
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
                className="rounded"
              />
              <Label htmlFor="hasFixedEndDate">Vaste einddatum</Label>
            </div>
            {newAssignment.hasFixedEndDate && (
              <div>
                <Label>Einddatum</Label>
                <Input
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
              <Label>Route</Label>
              <Input
                placeholder="Amsterdam - Speyer"
                value={newAssignment.route}
                onChange={(e) => setNewAssignment({...newAssignment, route: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
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

      {/* Voltooien Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reis voltooien: {selectedAflosser?.firstName} {selectedAflosser?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Voltooiingsdatum</Label>
              <Input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-600">
              <strong>Reis details:</strong>
              <br />
              Schip: {selectedAssignment?.shipId}
              <br />
              Route: {selectedAssignment?.route}
              <br />
              Startdatum: {selectedAssignment?.fromDate ? formatDate(selectedAssignment.fromDate) : "Onbekend"}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCompleteAssignmentConfirm} className="flex-1">
                <CheckCircle className="w-4 h-4 mr-1" />
                Voltooien
              </Button>
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Afwezigheid Dialog */}
      <Dialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Afwezigheid instellen: {selectedAflosser?.firstName} {selectedAflosser?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Afwezig van</Label>
              <Input
                type="date"
                value={newUnavailable.fromDate}
                onChange={(e) => setNewUnavailable({...newUnavailable, fromDate: e.target.value})}
              />
            </div>
            <div>
              <Label>Afwezig tot</Label>
              <Input
                type="date"
                value={newUnavailable.toDate}
                onChange={(e) => setNewUnavailable({...newUnavailable, toDate: e.target.value})}
              />
            </div>
            <div>
              <Label>Reden</Label>
              <Input
                placeholder="bijv. vakantie, ziekte, privé"
                value={newUnavailable.reason}
                onChange={(e) => setNewUnavailable({...newUnavailable, reason: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
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

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Geschiedenis: {selectedAflosser?.firstName} {selectedAflosser?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Reis geschiedenis */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Reis geschiedenis ({getAflosserHistory(selectedAflosser?.id).length} reizen)
              </h3>
              {getAflosserHistory(selectedAflosser?.id).length === 0 ? (
                <p className="text-gray-500">Geen reis geschiedenis.</p>
              ) : (
                <div className="space-y-2">
                  {getAflosserHistory(selectedAflosser?.id)
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((assignment: any) => (
                      <Card key={assignment.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Schip: {assignment.shipId}</div>
                              <div className="text-sm text-gray-600">Route: {assignment.route}</div>
                              <div className="text-sm text-gray-500">
                                {formatDate(assignment.fromDate)} - {
                                  assignment.status === "completed" && assignment.completedAt
                                    ? formatDate(assignment.completedAt)
                                    : assignment.hasFixedEndDate && assignment.toDate
                                      ? formatDate(assignment.toDate)
                                      : assignment.status === "active"
                                        ? "Actief"
                                        : "Geen einddatum"
                                }
                              </div>
                              <div className="text-xs text-gray-400">
                                {assignment.hasFixedEndDate ? "Vaste periode" : "Reis (handmatig voltooien)"}
                              </div>
                            </div>
                            <Badge variant={
                              assignment.status === "active" ? "default" : 
                              assignment.status === "completed" ? "secondary" : 
                              "destructive"
                            }>
                              {assignment.status === "active" ? "Actief" : 
                               assignment.status === "completed" ? "Voltooid" : 
                               "Geannuleerd"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>

            {/* Afwezigheid geschiedenis */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <UserX className="w-4 h-4" />
                Afwezigheid geschiedenis ({getAflosserAbsences(selectedAflosser?.id).length} periodes)
              </h3>
              {getAflosserAbsences(selectedAflosser?.id).length === 0 ? (
                <p className="text-gray-500">Geen afwezigheid geschiedenis.</p>
              ) : (
                <div className="space-y-2">
                  {getAflosserAbsences(selectedAflosser?.id)
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((absence: any) => {
                      const today = new Date();
                      const isPast = new Date(absence.toDate) < today;
                      const isCurrent = new Date(absence.fromDate) <= today && new Date(absence.toDate) >= today;
                      const isFuture = new Date(absence.fromDate) > today;
                      
                      return (
                        <Card key={absence.id} className={
                          isCurrent ? "border-orange-200 bg-orange-50" : 
                          isFuture ? "border-blue-200 bg-blue-50" : ""
                        }>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-gray-500">
                                  {formatDate(absence.fromDate)} - {formatDate(absence.toDate)}
                                </div>
                                <div className="text-sm text-gray-600">{absence.reason}</div>
                              </div>
                              <Badge variant={
                                isPast ? "secondary" : 
                                isCurrent ? "default" : 
                                "outline"
                              }>
                                {isPast ? "Verlopen" : 
                                 isCurrent ? "Huidig" : 
                                 "Toekomstig"}
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

      {/* Edit Aflosser Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bewerken: {selectedAflosser?.firstName} {selectedAflosser?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Telefoonnummer</Label>
              <Input
                placeholder="+31 6 12345678"
                value={editData.phone}
                onChange={(e) => setEditData({...editData, phone: e.target.value})}
              />
            </div>
            <div>
              <Label>Diploma's</Label>
              <Input
                placeholder="bv. STCW, VHF, etc."
                value={editData.diplomas}
                onChange={(e) => setEditData({...editData, diplomas: e.target.value})}
              />
            </div>
            <div>
              <Label>Opmerkingen</Label>
              <Textarea
                placeholder="Extra informatie over de aflosser..."
                value={editData.notes}
                onChange={(e) => setEditData({...editData, notes: e.target.value})}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
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
  );
} 