"use client";

import { useState, useEffect } from "react";
import { getCombinedShipDatabase } from "@/utils/ship-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, UserX, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from 'date-fns';

// Simpele data structure
interface SimpleAssignment {
  id: string;
  aflosserId: string;
  shipId: string;
  fromDate: string;
  toDate: string | null;
  route: string;
  status: "active" | "completed";
  hasFixedEndDate: boolean;
  completedAt: string | null;
  createdAt: string;
}

interface SimpleUnavailable {
  id: string;
  aflosserId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  createdAt: string;
}

// Simpele localStorage functies
function loadCrewData() {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem('crewDatabase');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading crew data:', error);
    return {};
  }
}

function saveCrewData(data: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('crewDatabase', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving crew data:', error);
  }
}

export default function SimpleAflossersPage() {
  const { t } = useLanguage();
  const [crewData, setCrewData] = useState<any>({});
  const [assignments, setAssignments] = useState<SimpleAssignment[]>([]);
  const [unavailablePeriods, setUnavailablePeriods] = useState<SimpleUnavailable[]>([]);
  
  const [selectedAflosser, setSelectedAflosser] = useState<any>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
  
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

  // Laad data bij component mount
  useEffect(() => {
    const data = loadCrewData();
    setCrewData(data);
    
    // Haal assignments en unavailable periods uit data
    const allAssignments: SimpleAssignment[] = [];
    const allUnavailable: SimpleUnavailable[] = [];
    
    Object.values(data).forEach((crew: any) => {
      if (crew.aflosserAssignments) {
        allAssignments.push(...crew.aflosserAssignments);
      }
      if (crew.aflosserUnavailablePeriods) {
        allUnavailable.push(...crew.aflosserUnavailablePeriods);
      }
    });
    
    setAssignments(allAssignments);
    setUnavailablePeriods(allUnavailable);
  }, []);

  // Filter aflossers
  const aflossers = Object.values(crewData).filter((c: any) => 
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
        new Date(u.fromDate) <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
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
      alert("Vul alle verplichte velden in: schip, startdatum en route");
      return;
    }
    
    if (newAssignment.hasFixedEndDate && !newAssignment.toDate) {
      alert("Vul een einddatum in voor vaste periodes");
      return;
    }

    const assignment: SimpleAssignment = {
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

    // Update local state
    const newAssignments = [...assignments, assignment];
    setAssignments(newAssignments);
    
    // Update crew member in data
    const updatedCrewMember = {
      ...crewData[selectedAflosser.id],
      status: "aan-boord",
      shipId: newAssignment.shipId,
      aflosserAssignments: [
        ...(crewData[selectedAflosser.id]?.aflosserAssignments || []),
        assignment
      ]
    };
    
    const newCrewData = {
      ...crewData,
      [selectedAflosser.id]: updatedCrewMember
    };
    
    // Sla op in localStorage
    saveCrewData(newCrewData);
    setCrewData(newCrewData);
    
         // Toon melding
     const shipName = getCombinedShipDatabase()[newAssignment.shipId]?.name || "Onbekend schip";
    alert(`✅ Aflosser ${selectedAflosser.firstName} ${selectedAflosser.lastName} succesvol toegewezen aan ${shipName}`);
    
    setNewAssignment({ shipId: "", fromDate: "", toDate: "", route: "", hasFixedEndDate: false });
    setShowAssignmentDialog(false);
  }

  function handleCreateUnavailable() {
    if (!selectedAflosser || !newUnavailable.fromDate || !newUnavailable.toDate || !newUnavailable.reason) {
      alert("Vul alle velden in: startdatum, einddatum en reden");
      return;
    }

    const unavailable: SimpleUnavailable = {
      id: Date.now().toString(),
      aflosserId: selectedAflosser.id,
      fromDate: newUnavailable.fromDate,
      toDate: newUnavailable.toDate,
      reason: newUnavailable.reason,
      createdAt: new Date().toISOString()
    };

    // Update local state
    const newUnavailablePeriods = [...unavailablePeriods, unavailable];
    setUnavailablePeriods(newUnavailablePeriods);
    
    // Update crew member in data
    const updatedCrewMember = {
      ...crewData[selectedAflosser.id],
      aflosserUnavailablePeriods: [
        ...(crewData[selectedAflosser.id]?.aflosserUnavailablePeriods || []),
        unavailable
      ]
    };
    
    const newCrewData = {
      ...crewData,
      [selectedAflosser.id]: updatedCrewMember
    };
    
    // Sla op in localStorage
    saveCrewData(newCrewData);
    setCrewData(newCrewData);
    
    alert(`Afwezigheid succesvol toegevoegd voor ${selectedAflosser.firstName} ${selectedAflosser.lastName}`);
    setNewUnavailable({ fromDate: "", toDate: "", reason: "" });
    setShowUnavailableDialog(false);
  }

  function formatDate(dateString: string) {
    return format(new Date(dateString), 'dd-MM-yyyy');
  }

  function getAflosserHistory(aflosserId: string) {
    return assignments.filter(a => a.aflosserId === aflosserId);
  }

  function getAflosserUnavailableHistory(aflosserId: string) {
    return unavailablePeriods.filter(u => u.aflosserId === aflosserId);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-green-800">Aflosser Management (Simpel)</h1>
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

      {/* Toewijzen aan schip dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="sm:max-w-lg">
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
                  {Object.values(getCombinedShipDatabase()).map((ship: any) => (
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
                onChange={(e) => setNewAssignment({...newAssignment, route: e.target.value})}
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
            <DialogTitle>{t('setUnavailability')} - {selectedAflosser?.firstName} {selectedAflosser?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="unavailableFromDate">{t('unavailableFrom')}</Label>
              <Input
                id="unavailableFromDate"
                type="date"
                value={newUnavailable.fromDate}
                onChange={(e) => setNewUnavailable({...newUnavailable, fromDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="unavailableToDate">{t('unavailableTo')}</Label>
              <Input
                id="unavailableToDate"
                type="date"
                value={newUnavailable.toDate}
                onChange={(e) => setNewUnavailable({...newUnavailable, toDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="reason">{t('reason')}</Label>
              <Textarea
                id="reason"
                placeholder={t('reasonPlaceholder')}
                value={newUnavailable.reason}
                onChange={(e) => setNewUnavailable({...newUnavailable, reason: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateUnavailable} className="flex-1">{t('setUnavailable')}</Button>
              <Button variant="outline" onClick={() => setShowUnavailableDialog(false)}>{t('cancel')}</Button>
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
                                                         <div className="font-medium">{getCombinedShipDatabase()[assignment.shipId]?.name}</div>
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
    </div>
  );
} 